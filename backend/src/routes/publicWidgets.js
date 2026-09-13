const express = require('express');
const router = express.Router();
const { Widget, Chat, Message, Workflow } = require('../models');
const { sendToN8N } = require('../utils/n8nClient');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { getJwtSecret } = require('../config/secrets');

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

        const clientSessionId = (typeof req.query.sessionId === 'string' && /^[A-Za-z0-9_-]{6,64}$/.test(req.query.sessionId))
            ? req.query.sessionId
            : null;

        // Issue server-signed guest session capability bound strictly to this widget and session
        let sessionToken = null;
        if (clientSessionId) {
            sessionToken = jwt.sign(
                {
                    widgetId: widget.id,
                    widgetSlug: widget.slug,
                    sessionId: clientSessionId,
                    type: 'widget_guest'
                },
                getJwtSecret(),
                { expiresIn: '24h', issuer: 'targetchat', audience: 'targetchat:widget' }
            );
        }

        // Return only safe public data with server-issued session capability
        res.json({
            id: widget.id,
            slug: widget.slug,
            publicKey: widget.publicKey,
            theme: widget.theme,
            triggers: widget.triggers,
            settings: widget.settings,
            workflowId: widget.workflowId,
            sessionToken
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
            // SECURITY: emit strictly to the widget-bound private session room and the admin
            // `message:new` channel. Never broadcast visitor content to shared or unbound rooms.
            const io = req.io;
            if (io) {
                io.to(`widget_${widget.id}_session_${sessionId}`).emit('message', {
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

                const guestRoom = `widget_${widget.id}_session_${sessionId}`;
                if (io) {
                    io.to(guestRoom).emit('ai:thinking', { chatId: chat.id, isThinking: true });
                }

                // Run in background to not block response
                (async () => {
                    try {
                        const response = await sendToN8N({
                            webhookUrl: widget.workflow?.webhookUrl,
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

                        if (io) {
                            io.to(guestRoom).emit('ai:thinking', { chatId: chat.id, isThinking: false });
                        }

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
                                // Emit to Widget-bound Session Room (Private & Reliable)
                                io.to(guestRoom).emit('message', {
                                    text: response.output,
                                    sender: 'ai',
                                    timestamp: new Date()
                                });

                                // Notify Human Inbox about AI response
                                emitToAuthorizedUsers(io, chat, widget, 'message:new', { chatId: chat.id, message: aiMsg });
                                const chatDetails = await Chat.findByPk(chat.id, {
                                    include: [{ model: Widget, as: 'widget' }]
                                });
                                emitToAuthorizedUsers(io, chat, widget, 'chat:updated', chatDetails);
                            }
                        }
                    } catch (err) {
                        console.error('[Public Widget] Workflow trigger failed:', err.message);
                        if (io) {
                            io.to(guestRoom).emit('ai:thinking', { chatId: chat.id, isThinking: false });
                            io.to(guestRoom).emit('ai:error', {
                                chatId: chat.id,
                                message: 'Our AI assistant is temporarily unavailable. We have connected you with human support.'
                            });
                        }

                        // Auto-escalate to human handoff
                        try {
                            await chat.update({
                                isHumanHandled: true,
                                routingType: 'human'
                            });

                            const alertMsg = await Message.create({
                                chatId: chat.id,
                                userId: null,
                                sender: 'system',
                                text: '⚠️ AI assistant was temporarily unavailable. Conversation escalated to human agent.',
                                type: 'text'
                            });

                            if (io) {
                                io.to(guestRoom).emit('message', {
                                    text: alertMsg.text,
                                    sender: 'system',
                                    timestamp: new Date()
                                });

                                emitToAuthorizedUsers(io, chat, widget, 'chat:updated', chat);
                                emitToAuthorizedUsers(io, chat, widget, 'message:new', { chatId: chat.id, message: alertMsg });
                            }
                        } catch (escErr) {
                            console.error('[Public Widget] Auto-escalation error:', escErr.message);
                        }
                    }
                })();
            }
        }

        res.json({ status: 'received' });
    } catch (error) {
        console.error('Widget event error:', error);
        res.status(500).json({ message: 'Failed to process event' });
    }
});

// GET /widget/public/:slug/loader.js - Standalone Embed Script
router.get('/:slug/loader.js', async (req, res) => {
    try {
        const { slug } = req.params;
        const widget = await Widget.findOne({
            where: { slug },
            attributes: ['id', 'slug', 'name', 'status', 'theme', 'settings', 'allowedDomains']
        });

        if (!widget || widget.status === 'inactive') {
            return res.status(404).send('/* TargetChat: Widget not found or inactive */');
        }

        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        const primaryColor = widget.theme?.primaryColor || '#2563eb';

        const scriptContent = `
(function() {
    if (window.TargetChatWidgetLoaded) return;
    window.TargetChatWidgetLoaded = true;

    var slug = "${slug}";
    var iframeUrl = "${frontendUrl}/embed/" + slug;
    var isOpen = false;

    // Create Styles
    var style = document.createElement('style');
    style.innerHTML = \`
        #tc-bubble-container {
            position: fixed;
            bottom: 24px;
            right: 24px;
            z-index: 999999;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        }
        #tc-bubble-btn {
            width: 60px;
            height: 60px;
            border-radius: 50%;
            background: ${primaryColor};
            box-shadow: 0 4px 14px rgba(0,0,0,0.25);
            border: none;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #fff;
            transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        #tc-bubble-btn:hover {
            transform: scale(1.06);
            box-shadow: 0 6px 20px rgba(0,0,0,0.3);
        }
        #tc-bubble-btn svg {
            width: 28px;
            height: 28px;
            fill: currentColor;
            transition: transform 0.2s ease;
        }
        #tc-chat-frame-container {
            position: fixed;
            bottom: 96px;
            right: 24px;
            width: 380px;
            height: 600px;
            max-width: calc(100vw - 32px);
            max-height: calc(100vh - 120px);
            border-radius: 18px;
            overflow: hidden;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            z-index: 999998;
            display: none;
            opacity: 0;
            transform: translateY(16px);
            transition: opacity 0.25s ease, transform 0.25s ease;
            background: #fff;
        }
        #tc-chat-frame-container.tc-open {
            display: block;
            opacity: 1;
            transform: translateY(0);
        }
        #tc-chat-frame {
            width: 100%;
            height: 100%;
            border: none;
        }
        @media (max-width: 480px) {
            #tc-chat-frame-container {
                right: 0;
                bottom: 0;
                width: 100vw;
                height: 100vh;
                max-width: 100vw;
                max-height: 100vh;
                border-radius: 0;
            }
        }
    \`;
    document.head.appendChild(style);

    // Create Container
    var container = document.createElement('div');
    container.id = 'tc-bubble-container';

    // Create Toggle Button
    var btn = document.createElement('button');
    btn.id = 'tc-bubble-btn';
    btn.setAttribute('aria-label', 'Open Chat');
    btn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>';

    // Create Iframe Container
    var frameContainer = document.createElement('div');
    frameContainer.id = 'tc-chat-frame-container';
    
    var iframe = document.createElement('iframe');
    iframe.id = 'tc-chat-frame';
    iframe.src = iframeUrl;
    iframe.allow = 'camera; microphone; autoplay';
    frameContainer.appendChild(iframe);

    container.appendChild(btn);
    document.body.appendChild(container);
    document.body.appendChild(frameContainer);

    btn.addEventListener('click', function() {
        isOpen = !isOpen;
        if (isOpen) {
            frameContainer.classList.add('tc-open');
            btn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>';
        } else {
            frameContainer.classList.remove('tc-open');
            btn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>';
        }
    });
})();
`;

        res.setHeader('Content-Type', 'application/javascript');
        res.setHeader('Cache-Control', 'public, max-age=300');
        res.send(scriptContent);
    } catch (e) {
        console.error('Widget loader script error:', e);
        res.status(500).send('/* TargetChat: Internal error */');
    }
});

module.exports = router;
