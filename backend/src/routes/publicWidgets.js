const express = require('express');
const router = express.Router();
const { Widget, Chat, Message, Workflow } = require('../models');
const { sendToN8N } = require('../utils/n8nClient');
const cors = require('cors');

// Enable CORS for all public widget routes
router.use(cors());

/**
 * SECURITY: Emits Socket events only to authorized user rooms (owner, assignee, creator)
 * preventing leakage of private chats or message data to unauthenticated guest sockets.
 */
function emitToAuthorizedUsers(io, chat, widget, event, data) {
    if (!io) return;
    const rooms = new Set();
    if (widget && widget.userId) rooms.add(`user_${widget.userId}`);
    if (chat) {
        if (chat.assignedTo) rooms.add(`user_${chat.assignedTo}`);
        if (chat.userId) rooms.add(`user_${chat.userId}`);
    }
    for (const room of rooms) {
        io.to(room).emit(event, data);
    }
}

// --- Security Helper ---
function extractHostname(value) {
    if (!value || typeof value !== 'string') return null;
    try {
        // `value` may be a full Origin/Referer URL or a bare hostname.
        const candidate = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(value) ? value : `https://${value}`;
        return new URL(candidate).hostname.toLowerCase();
    } catch {
        return null;
    }
}

/**
 * SECURITY: exact hostname matching. The previous implementation used
 * `requestOrigin.includes(domain)`, which `evil-google.com` or
 * `google.com.evil.com` would pass for an allowed `google.com`.
 */
function isDomainAllowed(widget, req) {
    // 1. If no restrictions (or empty), allow all (Default behavior)
    if (!widget.allowedDomains || widget.allowedDomains.length === 0) return true;

    // 2. If wildcard '*' is present, allow all
    if (widget.allowedDomains.includes('*')) return true;

    // 3. Check Origin/Referer
    // Origin is preferred, Referer is fallback
    const requestOrigin = req.get('Origin') || req.get('Referer');

    if (!requestOrigin) return false; // Strict: Block requests without origin if restrictions are set

    const requestHost = extractHostname(requestOrigin);
    if (!requestHost) return false;

    // 4. Match against Allowed Domains: exact host or a true subdomain of it.
    return widget.allowedDomains.some(entry => {
        if (typeof entry !== 'string') return false;
        const allowedHost = extractHostname(entry.trim());
        if (!allowedHost || allowedHost === '*') return allowedHost === '*';
        return requestHost === allowedHost || requestHost.endsWith(`.${allowedHost}`);
    });
}
// -----------------------

// GET /widget/public/:slug/config - Get public widget config
router.get('/:slug/config', async (req, res) => {
    try {
        const { slug } = req.params;
        const widget = await Widget.findOne({
            where: { slug },
            attributes: ['id', 'name', 'slug', 'status', 'publicKey', 'theme', 'triggers', 'settings', 'workflowId', 'allowedDomains']
        });

        if (!widget) {
            return res.status(404).json({ message: 'Widget not found' });
        }

        // Kill Switch Check
        if (widget.status === 'inactive') {
            console.warn(`[Security] Blocked access to INACTIVE widget ${slug}`);
            return res.status(403).json({ message: 'This widget has been disabled by the administrator.' });
        }

        // Security Check
        if (!isDomainAllowed(widget, req)) {
            console.warn(`[Security] Blocked widget access from ${req.get('Origin') || 'unknown'} for widget ${slug}`);
            return res.status(403).json({ message: 'Access denied: Domain not allowed' });
        }

        // Return only safe public data
        res.json({
            id: widget.id,
            slug: widget.slug,
            publicKey: widget.publicKey,
            theme: widget.theme,
            triggers: widget.triggers,
            settings: widget.settings,
            workflowId: widget.workflowId
        });
    } catch (error) {
        console.error('Get public config error:', error);
        res.status(500).json({ message: 'Failed to load widget config' });
    }
});

// POST /widget/public/:slug/event - Handle widget events
router.post('/:slug/event', async (req, res) => {
    try {
        const { slug } = req.params;
        const { type, payload, sessionId } = req.body;

        const widget = await Widget.findOne({
            where: { slug },
            include: [{ model: Workflow, as: 'workflow' }]
        });

        if (!widget) {
            return res.status(404).json({ message: 'Widget not found' });
        }

        // Kill Switch Check
        if (widget.status === 'inactive') {
            console.warn(`[Security] Blocked event for INACTIVE widget ${slug}`);
            return res.status(403).json({ message: 'This widget has been disabled by the administrator.' });
        }

        // Security Check
        if (!isDomainAllowed(widget, req)) {
            return res.status(403).json({ message: 'Access denied: Domain not allowed' });
        }

        if (type === 'message') {
            if (typeof sessionId !== 'string' || !/^[A-Za-z0-9_-]{6,64}$/.test(sessionId)) {
                return res.status(400).json({ message: 'Valid sessionId is required' });
            }
            if (typeof payload !== 'object' || payload === null || typeof payload.text !== 'string' || payload.text.trim().length === 0) {
                return res.status(400).json({ message: 'Message text is required' });
            }

            // SECURITY: scope the guest session to this widget so a sessionId
            // from another site cannot hijack or inject into this widget's chats.
            let chat = await Chat.findOne({
                where: {
                    title: `Guest Session ${sessionId}`,
                    widgetId: widget.id
                }
            });

            // SECURITY: only accept a leadId that belongs to this widget.
            let leadId = null;
            if (payload.leadId) {
                const { Lead } = require('../models');
                const lead = await Lead.findOne({
                    where: { id: payload.leadId, widgetId: widget.id },
                    attributes: ['id']
                });
                if (lead) leadId = lead.id;
            }

            if (!chat) {
                chat = await Chat.create({
                    title: `Guest Session ${sessionId}`,
                    persona: 'default',
                    workflowId: widget.workflowId,
                    userId: null, // Guest user
                    leadId, // Associate lead if provided
                    widgetId: widget.id
                });
            } else {
                // Update leadId if provided and missing
                const updates = {};
                if (leadId && !chat.leadId) {
                    updates.leadId = leadId;
                }
                // Backfill widgetId if missing (for legacy chats)
                if (!chat.widgetId) {
                    updates.widgetId = widget.id;
                }

                if (Object.keys(updates).length > 0) {
                    await chat.update(updates);
                }
            }

            // 2. Save User Message
            const userMsg = await Message.create({
                chatId: chat.id,
                userId: null,
                sender: 'user',
                text: payload.text,
                type: 'text'
            });

            // 3. Emit to Socket (so other tabs/admins see it)
            // SECURITY: emit only to the private session room and the admin
            // `message:new` channel. Never broadcast visitor content to the
            // shared `widget_<slug>` room — any anonymous socket can join it.
            const io = req.io;
            if (io) {
                io.to(`session_${sessionId}`).emit('message', {
                    text: payload.text,
                    sender: 'user',
                    timestamp: new Date()
                });
            }

            // 4. Routing Logic: Human vs AI
            // Route to human if:
            // 1. Workflow is OFF (Global setting)
            // 2. Chat is explicitly paused (Per-chat setting)
            if (widget.workflowStatus === false || chat.aiPaused) {
                // Human Mode
                if (!chat.isHumanHandled) {
                    await chat.update({
                        isHumanHandled: true,
                        routingType: 'human',
                        // Assign to primary agent if needed (logic similar to chat.js)
                    });
                }

                // Notify Human Inbox
                if (io) {
                    // Fetch full chat details for the dashboard
                    const chatDetails = await Chat.findByPk(chat.id, {
                        include: [{ model: Widget, as: 'widget' }]
                    });
                    emitToAuthorizedUsers(io, chat, widget, 'chat:updated', chatDetails);
                    emitToAuthorizedUsers(io, chat, widget, 'message:new', { chatId: chat.id, message: userMsg });
                }

            } else {
                // AI Mode (n8n)
                // Notify Human Inbox about User message (scoped to authorized users)
                if (io) {
                    emitToAuthorizedUsers(io, chat, widget, 'message:new', { chatId: chat.id, message: userMsg });
                    const chatDetails = await Chat.findByPk(chat.id, {
                        include: [{ model: Widget, as: 'widget' }]
                    });
                    emitToAuthorizedUsers(io, chat, widget, 'chat:updated', chatDetails);
                }

                if (widget.workflow && widget.workflow.webhookUrl) {
                    // Run in background to not block response
                    (async () => {
                        try {
                            const response = await sendToN8N({
                                webhookUrl: widget.workflow.webhookUrl,
                                message: {
                                    text: payload.text,
                                    type: 'text',
                                    role: 'user'
                                },
                                chat_id: chat.id,
                                user_id: 0,
                                session_id: sessionId,
                                is_guest: true
                            });

                            // If workflow returns a synchronous response, save it as AI message
                            if (response && response.output) {
                                const aiMsg = await Message.create({
                                    chatId: chat.id,
                                    userId: null,
                                    sender: 'ai',
                                    text: response.output,
                                    type: 'text'
                                });

                                if (io) {
                                    // Emit to Session Room (Private & Reliable)
                                    // SECURITY: do not broadcast to the shared widget room.
                                    io.to(`session_${sessionId}`).emit('message', {
                                        text: response.output,
                                        sender: 'ai',
                                        timestamp: new Date()
                                    });

                                    // Notify Human Inbox about AI response (scoped strictly)
                                    emitToAuthorizedUsers(io, chat, widget, 'message:new', { chatId: chat.id, message: aiMsg });
                                    const chatDetails = await Chat.findByPk(chat.id, {
                                        include: [{ model: Widget, as: 'widget' }]
                                    });
                                    emitToAuthorizedUsers(io, chat, widget, 'chat:updated', chatDetails);
                                }
                            }
                        } catch (err) {
                            console.error('Workflow trigger failed:', err.message);
                        }
                    })();
                }
            }
        }

        res.json({ status: 'received' });
    } catch (error) {
        console.error('Widget event error:', error);
        res.status(500).json({ message: 'Failed to process event' });
    }
});

module.exports = router;
