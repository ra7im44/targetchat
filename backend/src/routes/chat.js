const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { Chat, Message, Widget, Channel } = require('../models');
const { sendToN8N } = require('../utils/n8nClient');

const { validate, schemas } = require('../middleware/validation');
var usageLimit = (req, res, next) => require('../middleware/usageLimit')(req, res, next);

/**
 * SECURITY: IDOR guard. A personal chat is readable/writable only by:
 * - its owner (chat.userId),
 * - the owner of its widget/channel,
 * - the agent it is assigned to (assignedTo).
 * Guest/widget chats (userId null) are served by publicWidgets, not here.
 */
async function canAccessPersonalChat(userId, chat) {
    if (!chat) return false;
    if (chat.userId === userId) return true;
    if (chat.assignedTo === userId) return true;
    if (chat.widgetId) {
        const widget = await Widget.findByPk(chat.widgetId, { attributes: ['userId'] });
        if (widget && widget.userId === userId) return true;
    }
    if (chat.channelId) {
        const channel = await Channel.findByPk(chat.channelId, { attributes: ['userId'] });
        if (channel && channel.userId === userId) return true;
    }
    return false;
}

// Create a new chat for the authenticated user
router.post('/create', requireAuth, (req, res, next) => { req.usageResourceType = 'chats'; next(); }, usageLimit, async (req, res) => {
  try {
    const userId = req.user.id;
    const { title, persona, workflowId, workspaceId } = req.body;
    const chat = await Chat.create({
      title: title || 'New Chat',
      userId,
      persona: persona || 'default',
      workflowId: workflowId || null,
      workspace_id: workspaceId || null
    });
    return res.json(chat);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// List chats for authenticated user
router.get('/list', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const workspaceId = req.query.workspace_id;
    const { Workflow } = require('../models');

    const whereClause = { userId };
    if (workspaceId) {
      whereClause.workspace_id = workspaceId;
    } else {
      // If no workspace_id provided, return chats with null workspace_id (Personal)
      // OR return all chats? Let's stick to strict workspace separation
      whereClause.workspace_id = null;
    }

    const chats = await Chat.findAll({
      where: whereClause,
      include: [{
        model: Workflow,
        as: 'workflow',
        attributes: ['id', 'name', 'icon']
      }],
      order: [['updated_at', 'DESC']]
    });
    return res.json(chats);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Get messages for a chat (Frontend API)
router.get('/:id/messages', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const chatId = req.params.id;

    const chat = await Chat.findOne({ where: { id: chatId } });
    // SECURITY: enforce ownership/assignment — never serve other users' chats.
    if (!chat || !(await canAccessPersonalChat(userId, chat))) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    const messages = await Message.findAll({
      where: { chatId },
      order: [['created_at', 'ASC']]
    });

    const { generateSignedUrl } = require('../utils/generateSignedUrl');

    const processedMessages = messages.map(msg => {
      const m = msg.toJSON();

      // Map fields for frontend compatibility
      m.content = m.text;
      m.role = m.sender;
      m.createdAt = m.created_at || m.createdAt;

      if (m.type !== 'text' && m.text) {
        let fname = m.text;
        if (fname.startsWith('/uploads/')) fname = fname.split('/').pop();
        else if (fname.startsWith('/secure-file/')) fname = fname.split('/').pop().split('?')[0];
        else if (fname.includes('/')) fname = fname.split('/').pop();

        m.text = generateSignedUrl(fname);
        m.content = m.text; // Update content as well
      }
      return m;
    });

    return res.json({ messages: processedMessages });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Get history for a chat (Legacy / N8N mostly)
router.get('/history', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const chatId = req.query.chat_id || req.query.chatId;
    if (!chatId) return res.status(400).json({ message: 'Missing chat_id' });
    const chat = await Chat.findOne({ where: { id: chatId, userId } });
    if (!chat) return res.status(404).json({ message: 'Chat not found' });
    const messages = await Message.findAll({ where: { chatId }, order: [['created_at', 'ASC']] });

    // Sign URLs for media messages
    const { generateSignedUrl } = require('../utils/generateSignedUrl');
    const processedMessages = messages.map(msg => {
      const m = msg.toJSON();
      if (m.type !== 'text' && m.text) {
        // Extract filename from stored text (support legacy /uploads/ and raw filenames)
        let fname = m.text;
        if (fname.startsWith('/uploads/')) fname = fname.split('/').pop();
        else if (fname.startsWith('/secure-file/')) fname = fname.split('/').pop().split('?')[0];
        else if (fname.includes('/')) fname = fname.split('/').pop(); // Safety fallback

        // Generate fresh signed URL
        m.text = generateSignedUrl(fname);
      }
      return m;
    });

    return res.json({ chat, messages: processedMessages });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Delete a chat (and cascade messages)
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const id = req.params.id;
    const chat = await Chat.findOne({ where: { id, userId } });
    if (!chat) return res.status(404).json({ message: 'Chat not found' });
    await chat.destroy();
    return res.json({ message: 'Deleted' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Update chat (title)
router.patch('/:id', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const id = req.params.id;
    const { title, workflowId } = req.body;
    const chat = await Chat.findOne({ where: { id, userId } });
    if (!chat) return res.status(404).json({ message: 'Chat not found' });

    // Update fields if provided
    if (typeof title === 'string' && title.trim().length) {
      chat.title = title.trim();
    }
    if (workflowId) {
      chat.workflowId = workflowId;
    }

    await chat.save();
    return res.json(chat);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Send message to a chat (creates messages and forwards to n8n)
router.post('/send', requireAuth, (req, res, next) => { req.usageResourceType = 'messages'; next(); }, usageLimit, validate(schemas.sendMessage), async (req, res) => {
  try {
    const { chat_id, message } = req.body;
    const userId = req.user.id;
    const chat = await Chat.findByPk(chat_id);
    // SECURITY: IDOR guard — a user may only send into chats they own,
    // are assigned to, or whose widget/channel they own.
    if (!chat || !(await canAccessPersonalChat(userId, chat))) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    const { generateSignedUrl } = require('../utils/generateSignedUrl');

    const getFilename = (url) => {
      if (!url) return null;
      try {
        const match = url.match(/\/secure-file\/([^?]+)/);
        if (match) return match[1];
        const matchLegacy = url.match(/\/uploads\/([^?]+)/);
        if (matchLegacy) return matchLegacy[1];
        return null;
      } catch (e) { return null; }
    };

    let filename = null;
    if (message.type !== 'text') {
      if (message.type === 'file') filename = getFilename(message.file?.url);
      else filename = getFilename(message[message.type]);
    }

    // Map unified payload to DB columns
    let dbText = '';
    let dbMetadata = null;

    if (message.type === 'text') {
      dbText = message.text || '';
    } else {
      // For media, store the filename (or fallback to empty if extraction failed)
      dbText = filename || '';
      if (message.type === 'file') {
        dbMetadata = { name: message.file?.name };
      }
    }

    const newMsg = await Message.create({
      chatId: chat_id,
      userId,
      sender: 'user',
      text: dbText,
      type: message.type,
      metadata: dbMetadata
    });

    // Re-sign the URL to ensure it has a fresh expiry for the recipient
    const signedUrl = filename ? generateSignedUrl(filename) : null;

    const unifiedMessage = {
      type: message.type,
      text: message.type === 'text' ? dbText : null,
      url: signedUrl,
      filename: filename,
      contentType: message.type !== 'text' ? 'application/octet-stream' : 'text/plain',
      image: message.type === 'image' ? signedUrl : null,
      audio: message.type === 'audio' ? signedUrl : null,
      video: message.type === 'video' ? signedUrl : null,
      file: message.type === 'file' ? { url: signedUrl, name: dbMetadata?.name } : null
    };

    // Broadcast to Socket.io
    const io = req.io;
    io.to(`chat_${chat_id}`).emit('message', {
      chatId: chat_id,
      message: {
        id: newMsg.id,
        sender: 'user',
        ...unifiedMessage,
        createdAt: newMsg.created_at
      }
    });

    // Forward to n8n OR route to human
    try {
      const { Workflow, Widget, WidgetAssignee, User } = require('../models');

      // Find chat with workflow and widget info
      const chatWithDetails = await Chat.findByPk(chat_id, {
        include: [
          { model: Workflow, as: 'workflow' },
          { model: Widget, as: 'widget' },
          { model: User, as: 'assignedHuman' }
        ]
      });

      if (chatWithDetails) {
        const widget = chatWithDetails.widget;

        // 1. Check if Human Handoff is active (Workflow OFF)
        if (widget && widget.workflowStatus === false) {
          // Route to Human
          if (!chatWithDetails.isHumanHandled) {
            await chatWithDetails.update({
              isHumanHandled: true,
              routingType: 'human',
              // Assign to primary agent if not assigned
              assignedTo: chatWithDetails.assignedTo || (await getPrimaryAgent(widget.id))
            });
          }

          // Emit event to human inbox
          io.emit('chat:updated', chatWithDetails); // Notify dashboard

          // Send auto-response if configured and it's the first human message
          // (Logic for auto-response can be added here)

        } else {
          // 2. Route to AI (Workflow ON)
          // Only forward if workflow exists and has webhook
          if (chatWithDetails.workflow && chatWithDetails.workflow.webhookUrl) {
            await sendToN8N({
              user_id: userId,
              chat_id,
              message: unifiedMessage,
              webhookUrl: chatWithDetails.workflow.webhookUrl
            });
          }
        }
      }
    } catch (e) {
      console.error('Routing error', e);
    }

    res.json({
      success: true,
      message: {
        id: newMsg.id,
        ...unifiedMessage,
        // Frontend compatibility
        content: unifiedMessage.text,
        role: 'user', // sender is always user in this endpoint
        createdAt: newMsg.created_at
      }
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Helper to get primary agent for a widget
async function getPrimaryAgent(widgetId) {
  try {
    const { WidgetAssignee } = require('../models');
    const assignee = await WidgetAssignee.findOne({
      where: { widgetId, isPrimary: true }
    });
    return assignee ? assignee.userId : null;
  } catch (e) {
    return null;
  }
}

module.exports = router;
