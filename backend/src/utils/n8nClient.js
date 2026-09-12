const axios = require('axios');
const { Setting, Message, ActivityLog } = require('../models');

/**
 * Send payload to n8n with retry mechanism, context history enrichment,
 * and dead-letter error logging.
 */
async function sendToN8N(payload, maxRetries = 2) {
  const { webhookUrl, chat_id, ...data } = payload;

  // Priority order:
  // 1. Explicit webhookUrl passed (from Workflow model)
  // 2. n8n_webhook_url from Settings table (DB)
  // 3. N8N_WEBHOOK_URL from .env
  let url = webhookUrl;

  if (!url) {
    try {
      const setting = await Setting.findOne({ where: { key: 'n8n_webhook_url' } });
      if (setting && setting.value) {
        url = setting.value;
      }
    } catch (e) {
      console.warn('Failed to fetch n8n_webhook_url setting:', e.message);
    }
  }

  if (!url) {
    url = process.env.N8N_WEBHOOK_URL;
  }

  if (!url) {
    throw new Error('N8N Webhook URL is not configured (check Workflows, Settings DB, or .env)');
  }

  // Enrich with recent conversation history context if available
  if (chat_id && !data.history) {
    try {
      const recentMessages = await Message.findAll({
        where: { chatId: chat_id },
        order: [['created_at', 'DESC']],
        limit: 8
      });
      data.history = recentMessages.reverse().map(m => ({
        role: m.sender === 'ai' ? 'assistant' : 'user',
        content: m.text,
        type: m.type,
        createdAt: m.created_at
      }));
    } catch (histErr) {
      console.warn('[n8nClient] Could not fetch chat history:', histErr.message);
    }
  }

  const outboundPayload = {
    chat_id,
    ...data
  };

  let lastError = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        const delayMs = attempt * 1000;
        console.log(`🔄 Retrying n8n call (attempt ${attempt}/${maxRetries}) after ${delayMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }

      console.log(`📤 Sending to n8n [${url}] (attempt ${attempt + 1}/${maxRetries + 1})...`);

      const response = await axios.post(url, outboundPayload, {
        headers: {
          'Content-Type': 'application/json',
          'X-Source': 'TargetChat-Backend'
        },
        timeout: 30000 // 30s timeout
      });

      return response.data;
    } catch (error) {
      lastError = error;
      console.error(`❌ n8n Error (attempt ${attempt + 1}):`, error.message);
      if (error.response) {
        console.error('   Status:', error.response.status);
        console.error('   Data:', error.response.data);
      }

      // Do not retry client errors (4xx) like 400, 401, 404
      if (error.response && error.response.status >= 400 && error.response.status < 500) {
        break;
      }
    }
  }

  // Record dead-letter event in ActivityLog if all attempts failed
  try {
    await ActivityLog.create({
      action: 'n8n_delivery_failure',
      details: JSON.stringify({
        url,
        chat_id,
        error: lastError?.message,
        statusCode: lastError?.response?.status,
        timestamp: new Date().toISOString()
      }),
      user_id: payload.user_id && payload.user_id !== 0 ? payload.user_id : null
    });
  } catch (logErr) {
    console.warn('[n8nClient] Failed to log dead letter:', logErr.message);
  }

  throw lastError;
}

module.exports = { sendToN8N };
