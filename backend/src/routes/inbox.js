const express = require('express');
const router = express.Router();
const { Chat, Message, User, Lead, Widget, Channel } = require('../models');
const metaApiService = require('../services/metaApiService');
const { requireAuth } = require('../middleware/auth');
const { Op } = require('sequelize');
const { parsePagination } = require('../utils/pagination');

/**
 * SECURITY (IDOR guard): a chat is manageable only when it belongs to one of
 * the caller's widgets/channels, or is assigned to the caller.
 * Returns null when the chat does not exist or access is denied.
 */
async function verifyInboxChatAccess(chatId, userId, userRole, options = {}) {
    const include = [
        { model: Widget, as: 'widget', attributes: ['id', 'userId', 'slug'] }
    ];
    if (options.includeChannel) {
        include.push({ model: Channel, as: 'channel' });
    }
    if (options.includeLead) {
        include.push({ model: Lead, as: 'lead' });
    }

    const chat = await Chat.findByPk(chatId, { include });
    if (!chat) return null;

    if (userRole === 'admin' || userRole === 'superadmin') return chat;

    if (chat.assignedTo === userId) return chat;

    if (chat.widgetId) {
        // `widget` include is present above; fall back to a direct lookup.
        const widgetUserId = chat.widget ? chat.widget.userId : (await Widget.findByPk(chat.widgetId, { attributes: ['userId'] }))?.userId;
        if (widgetUserId === userId) return chat;
    }

    if (chat.channelId) {
        const channelUserId = chat.channel ? chat.channel.userId : (await Channel.findByPk(chat.channelId, { attributes: ['userId'] }))?.userId;
        if (channelUserId === userId) return chat;
    }

    return null;
}

// GET /api/inbox/chats - Get human-handled chats assigned to user
router.get('/chats', requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const { status = 'active' } = req.query;
        const { page, limit, offset } = parsePagination(req.query);



        // Find all widgets owned by this user
        const userWidgets = await Widget.findAll({
            where: { userId },
            attributes: ['id']
        });
        const widgetIds = userWidgets.map(w => w.id);

        // Find all channels owned by this user
        const userChannels = await Channel.findAll({
            where: { userId },
            attributes: ['id']
        });
        const channelIds = userChannels.map(c => c.id);

        const where = {
            [Op.or]: [
                { widgetId: { [Op.in]: widgetIds } },
                { channelId: { [Op.in]: channelIds } }
            ]
        };

        if (status === 'active') {
            where.status = 'active';
        }

        const { count, rows: chats } = await Chat.findAndCountAll({
            where,
            limit,
            offset,
            order: [['updated_at', 'DESC']],
            include: [
                {
                    model: Lead,
                    as: 'lead',
                    attributes: ['id', 'name', 'email', 'phone', 'company', 'meta_id', 'whatsapp_id']
                },
                {
                    model: Widget,
                    as: 'widget',
                    attributes: ['id', 'name']
                },
                {
                    model: Channel,
                    as: 'channel',
                    attributes: ['id', 'name', 'type', 'external_id', 'is_active', 'mode', 'last_active_at']
                },
                {
                    model: Message,
                    as: 'messages',
                    limit: 1,
                    order: [['created_at', 'DESC']],
                    attributes: ['id', ['text', 'content'], ['created_at', 'createdAt'], ['sender', 'role']]
                }
            ]
        });

        res.json({
            chats,
            pagination: {
                total: count,
                page,
                limit,
                pages: Math.ceil(count / limit)
            }
        });
    } catch (err) {
        console.error('Error fetching inbox chats:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// POST /api/inbox/chats/:id/messages - Send message as human
router.post('/chats/:id/messages', requireAuth, async (req, res) => {
    try {
        const { id: chatId } = req.params;
        const userId = req.user.id;
        const { content } = req.body;
        console.log(`[Inbox] POST /chats/${chatId}/messages hit`, { content, userId });

        if (!content) {
            return res.status(400).json({ message: 'Message content is required' });
        }

        // Verify chat existence and permissions
        // SECURITY: user must be assignee, owner of the widget, or owner of the channel.
        const chat = await verifyInboxChatAccess(chatId, userId, req.user.role, {
            includeChannel: true,
            includeLead: true
        });

        if (!chat) {
            const exists = await Chat.findByPk(chatId, { attributes: ['id'] });
            if (exists) {
                return res.status(403).json({ message: 'Not authorized to reply to this chat' });
            }
            return res.status(404).json({ message: 'Chat not found' });
        }

        console.log(`[Inbox] Chat verified: ${chat.id}`, { title: chat.title, widget: chat.widget?.slug });

        // Optional: Auto-assign if unassigned? 
        // For now, let's just allow the reply. 
        // If it was AI handled, we don't necessarily disable AI unless they used "Take Over".
        // But we DO mark it as human handled if it wasn't? 
        // Let's keep it simple: Just send the message. The "Take Over" toggle controls the state.

        const message = await Message.create({
            chatId,
            userId,
            text: content, // Map content -> text
            sender: 'ai',  // Map role -> sender (Inbox users act as 'ai'/system)
            type: 'text'   // Explicitly set type
        });

        // Update chat's last message time
        await chat.update({ updatedAt: new Date() });

        // Emit Socket.io event
        const io = req.io || req.app.get('io');
        if (io) {
            // Frontend expects specific format, map it here
            // Use global emit (temporary fix) to ensure Admins/Inbox UI sees it
            // because they are authenticated as 'user_ID' not joined to 'chat_ID'
            io.emit('message:new', {
                chatId,
                message: {
                    ...message.toJSON(),
                    content: message.text, // Frontend alias
                    role: 'assistant',     // Frontend alias
                    createdAt: message.created_at
                }
            });

            // 2. Notify External Channels (FB/IG/WA)
            if (chat.channel) {
                try {
                    console.log(`[Inbox] Delivering to ${chat.channel.type} channel...`);
                    if (chat.channel.type === 'facebook') {
                        await metaApiService.sendFacebookMessage(chat.channel.accessToken, chat.lead.metaId, content);
                    } else if (chat.channel.type === 'instagram') {
                        await metaApiService.sendInstagramMessage(chat.channel.accessToken, chat.lead.metaId, content);
                    } else if (chat.channel.type === 'whatsapp') {
                        // For WA, accessToken stores systemic token or we use env if missing
                        const token = chat.channel.accessToken || process.env.META_SYSTEM_USER_TOKEN;
                        await metaApiService.sendWhatsAppMessage(chat.channel.externalId, token, chat.lead.whatsappId, content);
                    }
                    console.log(`✅ [Inbox] Delivered to ${chat.channel.type}`);
                } catch (err) {
                    console.error(`❌ [Inbox] Failed to deliver to ${chat.channel.type}:`, err.message);
                    // We don't fail the whole request, but we log the error
                }
            }

            // 3. Notify Guest Widget (External)
            // SECURITY: Emit strictly to the authenticated visitor's private session room.
            // Insecure fallback to the shared widget room is removed to prevent cross-visitor leaks.
            const sessionMatch = chat.title && chat.title.match(/Guest Session (.+)/);
            if (sessionMatch && sessionMatch[1]) {
                const sessionId = sessionMatch[1].trim(); // Trim to avoid whitespace issues
                console.log(`Emitting message to session_${sessionId} (Source: ${chat.title})`);
                io.to(`session_${sessionId}`).emit('message', {
                    text: message.text,
                    sender: 'agent',
                    timestamp: message.created_at
                });
            }
        }

        // Return mapped response
        res.status(201).json({
            ...message.toJSON(),
            content: message.text,
            role: 'assistant',
            createdAt: message.created_at
        });
    } catch (err) {
        console.error('Error sending message:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// PATCH /api/inbox/chats/:id/assign - Reassign chat to another user
router.patch('/chats/:id/assign', requireAuth, async (req, res) => {
    try {
        const { id: chatId } = req.params;
        const { user_id } = req.body;

        // SECURITY: only the current handler (assignee / widget or channel owner / admin) may reassign
        const chat = await verifyInboxChatAccess(chatId, req.user.id, req.user.role);
        if (!chat) {
            return res.status(404).json({ message: 'Chat not found' });
        }

        await chat.update({
            assignedTo: user_id,
            assignedAt: new Date()
        });

        // Emit Socket.io event
        const io = req.app.get('io');
        if (io) {
            io.to(`chat_${chatId}`).emit('chat:reassigned', { assignedTo: user_id });
        }

        res.json(chat);
    } catch (err) {
        console.error('Error reassigning chat:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// PATCH /api/inbox/chats/:id/ai-status - Toggle AI status (Take Over / Resume)
router.patch('/chats/:id/ai-status', requireAuth, async (req, res) => {
    try {
        const { id: chatId } = req.params;
        const { paused } = req.body; // true = Take Over, false = Resume AI

        // SECURITY: only the current handler may pause/resume AI
        const chat = await verifyInboxChatAccess(chatId, req.user.id, req.user.role);
        if (!chat) {
            return res.status(404).json({ message: 'Chat not found' });
        }

        await chat.update({
            aiPaused: paused,
            // If taking over, ensure it's marked as human handled
            isHumanHandled: paused ? true : chat.isHumanHandled
        });

        // Emit Socket.io event
        const io = req.app.get('io');
        if (io) {
            io.to(`chat_${chatId}`).emit('chat:updated', chat);
        }

        res.json(chat);
    } catch (err) {
        console.error('Error updating AI status:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// GET /api/inbox/stats - Get inbox statistics
router.get('/stats', requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;

        // Find all widgets owned by this user
        const userWidgets = await Widget.findAll({
            where: { userId },
            attributes: ['id']
        });
        const widgetIds = userWidgets.map(w => w.id);

        const userChannels = await Channel.findAll({
            where: { userId },
            attributes: ['id']
        });
        const channelIds = userChannels.map(c => c.id);

        const whereCondition = {
            [Op.or]: [
                { widgetId: { [Op.in]: widgetIds } },
                { channelId: { [Op.in]: channelIds } }
            ]
        };

        const activeChats = await Chat.count({
            where: {
                ...whereCondition,
                status: 'active'
            }
        });

        const totalChats = await Chat.count({
            where: whereCondition
        });

        const todayChats = await Chat.count({
            where: {
                ...whereCondition,
                created_at: {
                    [Op.gte]: new Date(new Date().setHours(0, 0, 0, 0))
                }
            }
        });

        res.json({
            activeChats,
            totalChats,
            todayChats
        });
    } catch (err) {
        console.error('Error fetching inbox stats:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// GET /api/inbox/chats/:id/notes - Get chat notes
router.get('/chats/:id/notes', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { ChatNote, User } = require('../models');

        // SECURITY: notes are private to the chat's handler
        const chat = await verifyInboxChatAccess(id, req.user.id, req.user.role);
        if (!chat) {
            return res.status(404).json({ message: 'Chat not found' });
        }

        const notes = await ChatNote.findAll({
            where: { chatId: id },
            include: [
                {
                    model: User,
                    as: 'author',
                    attributes: ['id', 'name', 'email']
                }
            ],
            order: [['created_at', 'DESC']]
        });

        res.json({ notes });
    } catch (err) {
        console.error('Error fetching chat notes:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// POST /api/inbox/chats/:id/notes - Create chat note
router.post('/chats/:id/notes', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const { content } = req.body;
        const { ChatNote, User } = require('../models');

        if (!content) {
            return res.status(400).json({ message: 'Note content is required' });
        }

        // SECURITY: notes are writable only by the chat's handler
        const chat = await verifyInboxChatAccess(id, userId, req.user.role);
        if (!chat) {
            return res.status(404).json({ message: 'Chat not found' });
        }

        const note = await ChatNote.create({
            chatId: id,
            userId,
            content
        });

        const noteWithAuthor = await ChatNote.findByPk(note.id, {
            include: [
                {
                    model: User,
                    as: 'author',
                    attributes: ['id', 'name', 'email']
                }
            ]
        });

        res.status(201).json({ note: noteWithAuthor });
    } catch (err) {
        console.error('Error creating chat note:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
