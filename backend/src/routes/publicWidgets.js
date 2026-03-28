const express = require('express');
const router = express.Router();
const { Widget, Chat, Message, Workflow } = require('../models');
const { sendToN8N } = require('../utils/n8nClient');
const cors = require('cors');

// Enable CORS for all public widget routes
router.use(cors());

// --- Security Helper ---
function isDomainAllowed(widget, req) {
    // 1. If no restrictions (or empty), allow all (Default behavior)
    if (!widget.allowedDomains || widget.allowedDomains.length === 0) return true;

    // 2. If wildcard '*' is present, allow all
    if (widget.allowedDomains.includes('*')) return true;

    // 3. Check Origin/Referer
    // Origin is preferred, Referer is fallback
    const requestOrigin = req.get('Origin') || req.get('Referer');

    if (!requestOrigin) return false; // Strict: Block requests without origin if restrictions are set

    // 4. Match against Allowed Domains
    // We check if the request origin INCLUDES the allowed domain (e.g. 'google.com' allows 'https://google.com/foo')
    return widget.allowedDomains.some(domain => requestOrigin.includes(domain));
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

        // Security Check
        if (!isDomainAllowed(widget, req)) {
            return res.status(403).json({ message: 'Access denied: Domain not allowed' });
        }

        if (type === 'message') {
            // 1. Find or Create Chat Session
            let chat = await Chat.findOne({
                where: {
                    title: `Guest Session ${sessionId}`,
                }
            });

            if (!chat) {
                chat = await Chat.create({
                    title: `Guest Session ${sessionId}`,
                    persona: 'default',
                    workflowId: widget.workflowId,
                    userId: null, // Guest user
                    leadId: payload.leadId || null, // Associate lead if provided
                    widgetId: widget.id
                });
            } else {
                // Update leadId if provided and missing
                const updates = {};
                if (payload.leadId && !chat.leadId) {
                    updates.leadId = payload.leadId;
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
            const io = req.io;
            if (io) {
                io.to(`widget_${slug}`).emit('message', {
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
                    io.emit('chat:updated', chatDetails);
                    io.emit('message:new', { chatId: chat.id, message: userMsg });
                }

            } else {
                // AI Mode (n8n)
                // Notify Human Inbox about User message (so they see it coming in)
                if (io) {
                    io.emit('message:new', { chatId: chat.id, message: userMsg });
                    // We don't need to fetch chatDetails here if we assume the chat exists, 
                    // but to be safe and ensure "Active" status updates:
                    const chatDetails = await Chat.findByPk(chat.id, {
                        include: [{ model: Widget, as: 'widget' }]
                    });
                    io.emit('chat:updated', chatDetails);
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
                                    io.to(`session_${sessionId}`).emit('message', {
                                        text: response.output,
                                        sender: 'ai',
                                        timestamp: new Date()
                                    });

                                    io.to(`widget_${slug}`).emit('message', {
                                        text: response.output,
                                        sender: 'ai',
                                        timestamp: new Date()
                                    });

                                    // Notify Human Inbox about AI response
                                    io.emit('message:new', { chatId: chat.id, message: aiMsg });
                                    const chatDetails = await Chat.findByPk(chat.id, {
                                        include: [{ model: Widget, as: 'widget' }]
                                    });
                                    io.emit('chat:updated', chatDetails);
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
