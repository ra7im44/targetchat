const axios = require('axios');
const { Setting } = require('../models');

async function sendToN8N(payload) {
  try {
    const { webhookUrl, ...data } = payload;

    // Priority order:
    // 1. Explicit webhookUrl passed (from Workflow model)
    // 2. n8n_webhook_url from Settings table (DB)
    // 3. N8N_WEBHOOK_URL from .env

    let url = webhookUrl;

    if (!url) {
      // Fetch system default from DB
      try {
        const setting = await Setting.findOne({ where: { key: 'n8n_webhook_url' } });
        if (setting && setting.value) {
          url = setting.value;
        }
      } catch (e) {
        console.warn('Failed to fetch n8n_webhook_url setting:', e.message);
      }
    }

    // Fallback to Env
    if (!url) {
      url = process.env.N8N_WEBHOOK_URL;
    }

    if (!url) {
      throw new Error('N8N Webhook URL is not configured (check Workflows, Settings DB, or .env)');
    }

    console.log(`📤 Sending to n8n [${url}]...`);

    const response = await axios.post(url, data, {
      headers: {
        'Content-Type': 'application/json',
        'X-Source': 'TargetChat-Backend'
      },
      timeout: 30000 // 30s timeout
    });

    return response.data;
  } catch (error) {
    console.error('❌ n8n Error:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    }
    throw error; // Re-throw to be handled by the caller
  }
}

module.exports = { sendToN8N };
