const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { Chat, Message, Widget, Channel, Setting } = require('../models');
const { sendToN8N } = require('../utils/n8nClient');
const aiService = require('../services/aiService');

const { validate, schemas } = require('../middleware/validation');
var usageLimit = (req, res, next) => require('../middleware/usageLimit')(req, res, next);

/**
 * SECURITY: IDOR guard. A personal chat is readable/writable only by:
 * - its owner (chat.userId),
 * - the owner of its widget/channel,
 * - the agent it is assigned to (assignedTo).
 * Guest/widget chats (userId null) are served by publicWidgets, not here.
 */
async function canAccessPersonalChat(userId, chat, userRole) {
    if (!chat) return false;
    if (userRole === 'admin' || userRole === 'superadmin') return true;
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
    const isValidWs = workspaceId && workspaceId !== 'undefined' && workspaceId !== 'null' && String(workspaceId).trim() !== '';
    const chat = await Chat.create({
      title: title || 'New Chat',
      userId,
      persona: persona || 'default',
      workflowId: workflowId || null,
      workspace_id: isValidWs ? workspaceId : null
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
    const rawWorkspaceId = req.query.workspace_id;
    const { Workflow } = require('../models');

    const isValidWorkspace = rawWorkspaceId && rawWorkspaceId !== 'undefined' && rawWorkspaceId !== 'null' && rawWorkspaceId !== 'all' && String(rawWorkspaceId).trim() !== '';
    const whereClause = { userId };
    if (isValidWorkspace) {
      whereClause.workspace_id = rawWorkspaceId;
    } else if (rawWorkspaceId !== 'all') {
      whereClause.workspace_id = null;
    }

    const chats = await Chat.findAll({
      where: whereClause,
      include: [{
        model: Workflow,
        as: 'workflow',
        attributes: ['id', 'name', 'icon']
      }],
      order: [
        ['pinned', 'DESC'],
        ['updated_at', 'DESC']
      ]
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
    if (!chat || !(await canAccessPersonalChat(userId, chat, req.user.role))) {
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

        m.text = generateSignedUrl(fname, userId);
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
        m.text = generateSignedUrl(fname, userId);
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
    if (typeof req.body.pinned === 'boolean') {
      chat.pinned = req.body.pinned;
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
    if (!chat || !(await canAccessPersonalChat(userId, chat, req.user.role))) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    const { generateSignedUrl, verifySignedUrl } = require('../utils/generateSignedUrl');

    const getFilename = (url) => {
      if (!url || typeof url !== 'string') return null;
      try {
        const urlObj = new URL(url, 'http://localhost');
        const match = urlObj.pathname.match(/^\/secure-file\/([^/]+)$/);
        if (!match) return null; // SECURITY: Reject all unsigned paths, including legacy /uploads/

        const fname = match[1];
        const expires = urlObj.searchParams.get('expires');
        const signature = urlObj.searchParams.get('signature');
        const uid = urlObj.searchParams.get('uid');

        // SECURITY: Verify cryptographic HMAC signature and user ownership
        if (!expires || !signature || !uid) return null;

        const isSenderOrAdmin = String(uid) === String(userId) || req.user.role === 'admin' || req.user.role === 'superadmin';
        if (!isSenderOrAdmin) return null;

        if (verifySignedUrl(fname, expires, signature, uid)) {
          return fname;
        }
        return null;
      } catch (e) { return null; }
    };

    let filename = null;
    if (message.type !== 'text') {
      const targetUrl = message.type === 'file' ? message.file?.url : message[message.type];
      filename = getFilename(targetUrl);
      if (!filename) {
        return res.status(400).json({ error: 'A valid, authorized signed media attachment is required for media messages' });
      }

      // SECURITY: Authorize against server-persisted immutable upload ownership record if present
      if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
        const uploadRecord = await Setting.findOne({
          where: {
            section: 'upload_ownership',
            key: `upload_${filename}`
          }
        });
        if (uploadRecord) {
          try {
            const parsed = JSON.parse(uploadRecord.value);
            if (String(parsed.userId) !== String(userId)) {
              return res.status(403).json({ error: 'Unauthorized media attachment: upload belongs to another user' });
            }
          } catch (e) {
            return res.status(403).json({ error: 'Failed to verify upload ownership' });
          }
        }
      }
    }

    // Map unified payload to DB columns
    let dbText = '';
    let dbMetadata = null;

    if (message.type === 'text') {
      dbText = message.text || '';
    } else {
      // For media, store the verified filename
      dbText = filename;
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
    const signedUrl = filename ? generateSignedUrl(filename, userId) : null;

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
    let aiFailure = null;
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

          // Emit event to human inbox (scoped strictly to authorized user rooms)
          const targetRooms = new Set();
          if (widget && widget.userId) targetRooms.add(`user_${widget.userId}`);
          if (chatWithDetails.assignedTo) targetRooms.add(`user_${chatWithDetails.assignedTo}`);
          if (chatWithDetails.userId) targetRooms.add(`user_${chatWithDetails.userId}`);
          for (const room of targetRooms) {
            io.to(room).emit('chat:updated', chatWithDetails);
          }

          // Send auto-response if configured and it's the first human message
          // (Logic for auto-response can be added here)

        } else {
          // 2. Route to AI (Workflow ON)
          if (io) {
            io.to(`chat_${chat_id}`).emit('ai:thinking', { chatId: chat_id, isThinking: true });
          }

          try {
            // NOTE: newest-first then reverse — ordering ASC with LIMIT returns
            // the OLDEST messages and silently breaks conversation memory.
            const recentHistory = await getRecentHistory(chat_id, 12);

            const aiResult = await aiService.generate({
              chatId: chat_id,
              userId,
              userMessage: unifiedMessage,
              persona: chatWithDetails.persona || 'default',
              workflow: chatWithDetails.workflow,
              history: recentHistory,
              knowledge: await getKnowledgeContext(chatWithDetails, unifiedMessage.text)
            });

            const replyText = aiResult.text;
            if (replyText) {
              const aiMsg = await Message.create({
                chatId: chat_id,
                userId: null,
                sender: 'ai',
                text: replyText,
                type: 'text',
                metadata: buildAiMetadata(aiResult)
              });

              if (io) {
                io.to(`chat_${chat_id}`).emit('ai:thinking', { chatId: chat_id, isThinking: false });
                io.to(`chat_${chat_id}`).emit('message', {
                  chatId: chat_id,
                  message: {
                    id: aiMsg.id,
                    sender: 'ai',
                    type: 'text',
                    text: replyText,
                    url: null,
                    filename: null,
                    contentType: 'text/plain',
                    createdAt: aiMsg.created_at
                  }
                });
              }

              return res.json({
                success: true,
                message: {
                  id: newMsg.id,
                  ...unifiedMessage,
                  content: unifiedMessage.text,
                  role: 'user',
                  createdAt: newMsg.created_at
                },
                reply: {
                  id: aiMsg.id,
                  sender: 'ai',
                  type: 'text',
                  text: replyText,
                  provider: aiResult.provider,
                  model: aiResult.model,
                  fallback: Boolean(aiResult.fallback),
                  usage: aiResult.usage || {},
                  createdAt: aiMsg.created_at
                }
              });
            }
          } catch (aiErr) {
            // Do not pretend the message was answered: surface the failure to
            // the client (and any listeners) with a safe, typed code.
            console.error('[Chat Routing] AI response generation failed:', aiErr.code || aiErr.message);
            if (io) {
              io.to(`chat_${chat_id}`).emit('ai:error', {
                chatId: chat_id,
                error: aiErr.code || 'ai_error',
                message: aiErr.code ? aiErr.message : 'AI generation failed'
              });
            }
            aiFailure = { error: aiErr.code || 'ai_error', message: aiErr.code ? aiErr.message : 'AI generation failed' };
          } finally {
            if (io) {
              io.to(`chat_${chat_id}`).emit('ai:thinking', { chatId: chat_id, isThinking: false });
            }
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
      },
      ...(aiFailure ? { aiError: aiFailure } : {})
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * Newest N messages in chronological order.
 */
async function getRecentHistory(chatId, limit = 12) {
  const rows = await Message.findAll({
    where: { chatId },
    order: [['created_at', 'DESC'], ['id', 'DESC']],
    limit
  });
  return rows.reverse();
}

/**
 * Persist real provider metadata alongside the AI message so usage/billing and
 * audit views never rely on invented numbers.
 */
function buildAiMetadata(result) {
  const usage = result.usage || {};
  return {
    ai: {
      provider: result.provider || null,
      model: result.model || null,
      requestedModel: result.requestedModel || null,
      modelMismatch: Boolean(result.modelMismatch),
      promptTokens: usage.promptTokens == null ? null : usage.promptTokens,
      completionTokens: usage.completionTokens == null ? null : usage.completionTokens,
      totalTokens: usage.totalTokens == null ? null : usage.totalTokens,
      providerReported: Boolean(usage.providerReported),
      generationMs: usage.generationMs == null ? null : usage.generationMs,
      loadMs: usage.loadDurationMs == null ? null : usage.loadDurationMs,
      latencyMs: result.latencyMs == null ? null : result.latencyMs,
      finishReason: result.finishReason || usage.finishReason || null,
      fallback: Boolean(result.fallback),
      fallbackReason: result.fallbackReason || null,
      status: 'ok'
    }
  };
}

/**
 * Workspace-scoped retrieval. Any failure degrades to "no context" rather than
 * breaking the chat.
 */
async function getKnowledgeContext(chat, query) {
  try {
    if (!chat || !chat.workspace_id || !query) return [];
    const knowledgeService = require('../services/knowledgeService');
    return await knowledgeService.search({
      workspaceId: chat.workspace_id,
      query,
      limit: Number(process.env.AI_KNOWLEDGE_TOP_K) || 4
    });
  } catch (err) {
    console.warn('[chat] knowledge retrieval unavailable:', err.message);
    return [];
  }
}

function safeAiError(err) {
  if (err && err.code && typeof err.message === 'string') {
    return { error: err.code, message: err.message };
  }
  return { error: 'ai_error', message: 'AI generation failed' };
}

/**
 * POST /api/chat/stream
 * Server-Sent Events streaming for text messages.
 *
 * events: start → delta* → done | error → end
 * The final assistant message is persisted once, with provider usage metadata.
 * Media messages keep using POST /api/chat/send (non-streaming).
 */
router.post('/stream', requireAuth, (req, res, next) => { req.usageResourceType = 'messages'; next(); }, usageLimit, async (req, res) => {
  const userId = req.user.id;
  const chatId = Number(req.body && req.body.chat_id);
  const messageText = typeof (req.body && req.body.text) === 'string' ? req.body.text.trim() : '';

  if (!Number.isInteger(chatId) || chatId <= 0 || !messageText) {
    return res.status(400).json({ error: 'invalid_request', message: 'chat_id and a non-empty text are required' });
  }
  if (messageText.length > 8000) {
    return res.status(400).json({ error: 'message_too_long', message: 'Message exceeds 8000 characters' });
  }

  try {
    const { Workflow, Widget: WidgetModel } = require('../models');
    const chat = await Chat.findByPk(chatId, {
      include: [
        { model: Workflow, as: 'workflow' },
        { model: WidgetModel, as: 'widget' }
      ]
    });
    if (!chat || !(await canAccessPersonalChat(userId, chat, req.user.role))) {
      return res.status(404).json({ error: 'chat_not_found' });
    }
    if (chat.widget && chat.widget.workflowStatus === false) {
      return res.status(409).json({ error: 'ai_disabled', message: 'AI is disabled for this conversation (human handoff active)' });
    }

    // System Settings master switch: refuse before writing a user message so a
    // disabled AI leaves no half-finished turn behind.
    const runtime = await aiService.runtimeOptions();
    if (!runtime.enabled) {
      return res.status(503).json({ error: 'ai_disabled', message: 'AI is disabled in System Settings' });
    }

    const userMsg = await Message.create({
      chatId,
      userId,
      sender: 'user',
      text: messageText,
      type: 'text'
    });

    const io = req.io;
    if (io) {
      io.to(`chat_${chatId}`).emit('message', {
        chatId,
        message: {
          id: userMsg.id, sender: 'user', type: 'text', text: messageText,
          createdAt: userMsg.created_at
        }
      });
      io.to(`chat_${chatId}`).emit('ai:thinking', { chatId, isThinking: true });
    }

    res.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no'
    });

    const emit = (event, data) => {
      if (!res.writableEnded) res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    const controller = new AbortController();
    let clientGone = false;
    res.on('close', () => {
      if (!res.writableEnded) {
        clientGone = true;
        controller.abort();
      }
    });

    emit('start', { chatId, userMessageId: userMsg.id, text: messageText });

    try {
      const history = await getRecentHistory(chatId, 12);
      const knowledge = req.body.include_knowledge === false
        ? []
        : await getKnowledgeContext(chat, messageText);

      let final = null;
      const streamArgs = {
        chatId,
        userId,
        userMessage: { type: 'text', text: messageText },
        persona: chat.persona || 'default',
        workflow: chat.workflow,
        history,
        knowledge,
        abortSignal: controller.signal
      };

      if (!runtime.streaming) {
        // Streaming disabled in settings: generate once, then emit a single
        // delta so clients still receive a normal SSE transcript.
        const result = await aiService.generate(streamArgs);
        emit('delta', { text: result.text });
        final = { type: 'done', ...result };
      } else {
        for await (const chunk of aiService.stream(streamArgs)) {
          if (chunk.type === 'delta') {
            emit('delta', { text: chunk.text });
          } else if (chunk.type === 'done') {
            final = chunk;
          } else if (chunk.type === 'error') {
            throw Object.assign(new Error(chunk.error.message), chunk.error);
          }
        }
      }

      if (!final || !final.text) {
        throw Object.assign(new Error('AI generation produced no output'), {
          error: 'ai_empty_response', message: 'AI generation produced no output'
        });
      }

      const aiMsg = await Message.create({
        chatId,
        userId: null,
        sender: 'ai',
        text: final.text,
        type: 'text',
        metadata: buildAiMetadata(final)
      });

      if (io) {
        io.to(`chat_${chatId}`).emit('message', {
          chatId,
          message: {
            id: aiMsg.id, sender: 'ai', type: 'text', text: final.text,
            provider: final.provider, model: final.model,
            createdAt: aiMsg.created_at
          }
        });
      }

      emit('done', {
        id: aiMsg.id,
        text: final.text,
        provider: final.provider,
        model: final.model,
        usage: final.usage || {},
        fallback: Boolean(final.fallback),
        latencyMs: final.latencyMs,
        createdAt: aiMsg.created_at
      });
      emit('end', { ok: true });
    } catch (err) {
      const safe = err && err.code
        ? { error: err.code, message: err.message }
        : { error: err.error || 'ai_error', message: err.message || 'AI generation failed' };
      if (!clientGone) emit('error', safe);
      if (!clientGone) emit('end', { ok: false });
    } finally {
      if (io) io.to(`chat_${chatId}`).emit('ai:thinking', { chatId, isThinking: false });
      if (!res.writableEnded) res.end();
    }
  } catch (err) {
    console.error('[chat/stream] setup failed:', err.message);
    if (!res.headersSent) {
      return res.status(500).json({ error: 'server_error', message: 'Failed to start streaming' });
    }
    if (!res.writableEnded) res.end();
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
