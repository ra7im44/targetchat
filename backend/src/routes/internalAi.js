const express = require('express');
const crypto = require('crypto');
const router = express.Router();

/**
 * Server-to-server completion for the U-Axis AI Hub.
 * U-Axis keeps its own users, chats, and message credits.
 * This route only runs the local model and returns the assistant text.
 */
router.post('/ai/reply', async (req, res) => {
  const expected = process.env.INTERNAL_AI_TOKEN;
  const provided = req.get('X-Internal-Token') || '';
  if (!expected || expected.length < 16 || !safeEqual(provided, expected)) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  const body = req.body || {};
  const message = body.message && typeof body.message === 'object' ? body.message : {};
  const messageText = typeof message.text === 'string' ? message.text : (typeof body.text === 'string' ? body.text : '');
  if (!messageText.trim()) {
    return res.status(400).json({ error: 'empty_message' });
  }

  const history = Array.isArray(body.history) ? body.history : [];
  const aiService = require('../services/aiService');

  try {
    const reply = await aiService.generateResponse({
      chatId: body.chat_id,
      userId: body.user_id,
      userMessage: {
        type: message.type || 'text',
        text: messageText
      },
      persona: body.persona || 'default',
      workflow: { name: body.agent_name || 'U-Axis Assistant' },
      history,
      systemPrompt: typeof body.system_prompt === 'string' ? body.system_prompt : '',
      allowFallback: false
    });

    if (!reply || !reply.trim()) {
      return res.status(503).json({ error: 'ai_unavailable' });
    }

    return res.json({
      reply: reply.trim(),
      chat_id: body.chat_id ?? null,
      user_id: body.user_id ?? null,
      source: 'targetchat-local'
    });
  } catch (err) {
    console.error('[internal-ai] generation failed:', err.message);
    return res.status(503).json({ error: 'ai_unavailable' });
  }
});

function safeEqual(provided, expected) {
  const a = Buffer.from(String(provided));
  const b = Buffer.from(String(expected));
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

module.exports = router;
