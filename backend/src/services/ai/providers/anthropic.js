'use strict';

const { requestJson, openStream, joinUrl, sse } = require('../http');
const { AiProviderError } = require('../errors');

/**
 * Anthropic Messages API adapter.
 * Integration-ready: requires ANTHROPIC_API_KEY. Never called with a fake key.
 */
class AnthropicProvider {
  constructor({ baseUrl = 'https://api.anthropic.com/v1', apiKey, timeoutMs = 120000 } = {}) {
    this.id = 'anthropic';
    this.baseUrl = String(baseUrl || 'https://api.anthropic.com/v1').replace(/\/+$/, '');
    this.apiKey = apiKey || '';
    this.timeoutMs = timeoutMs;
  }

  headers() {
    if (!this.apiKey) {
      throw new AiProviderError('anthropic API key is not configured', {
        code: 'ai_unconfigured', status: 503, provider: this.id
      });
    }
    return {
      'Content-Type': 'application/json',
      'x-api-key': this.apiKey,
      'anthropic-version': '2023-06-01'
    };
  }

  splitMessages(messages = []) {
    const system = messages
      .filter((m) => m.role === 'system')
      .map((m) => m.content)
      .join('\n\n');
    const turns = messages
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => ({ role: m.role, content: m.content }));
    return { system, turns };
  }

  mapUsage(raw = {}) {
    const u = raw.usage || {};
    return {
      promptTokens: Number.isFinite(Number(u.input_tokens)) ? Number(u.input_tokens) : null,
      completionTokens: Number.isFinite(Number(u.output_tokens)) ? Number(u.output_tokens) : null,
      totalTokens:
        Number.isFinite(Number(u.input_tokens)) && Number.isFinite(Number(u.output_tokens))
          ? Number(u.input_tokens) + Number(u.output_tokens)
          : null,
      durationMs: null,
      finishReason: raw.stop_reason || null,
      providerReported: true
    };
  }

  buildBody({ model, messages, options = {}, stream }) {
    const { system, turns } = this.splitMessages(messages);
    const body = {
      model,
      messages: turns,
      max_tokens: Number.isFinite(Number(options.maxTokens)) ? Number(options.maxTokens) : 1024,
      stream
    };
    if (system) body.system = system;
    if (Number.isFinite(Number(options.temperature))) body.temperature = Number(options.temperature);
    return body;
  }

  async chat({ model, messages, options = {}, signal } = {}) {
    const { data } = await requestJson(joinUrl(this.baseUrl, '/messages'), {
      headers: this.headers(),
      body: this.buildBody({ model, messages, options, stream: false }),
      timeoutMs: this.timeoutMs,
      signal,
      provider: this.id,
      model
    });
    const blocks = Array.isArray(data && data.content) ? data.content : [];
    return {
      text: blocks.map((b) => (b.type === 'text' ? b.text : '')).join(''),
      model: (data && data.model) || model,
      usage: this.mapUsage(data || {}),
      raw: data
    };
  }

  async *streamChat({ model, messages, options = {}, signal } = {}) {
    const { response, abort } = await openStream(joinUrl(this.baseUrl, '/messages'), {
      headers: this.headers(),
      body: this.buildBody({ model, messages, options, stream: true }),
      timeoutMs: this.timeoutMs,
      signal,
      provider: this.id,
      model
    });

    let full = '';
    let usage = this.mapUsage({});
    let finishReason = null;
    try {
      for await (const event of sse(response)) {
        if (event.type === 'content_block_delta' && event.delta && event.delta.text) {
          full += event.delta.text;
          yield { type: 'delta', text: event.delta.text };
        } else if (event.type === 'message_start' && event.message) {
          usage = this.mapUsage(event.message);
        } else if (event.type === 'message_delta') {
          if (event.usage) usage = { ...usage, ...this.mapUsage({ usage: event.usage }) };
          if (event.delta && event.delta.stop_reason) finishReason = event.delta.stop_reason;
        }
      }
    } finally {
      abort.cleanup();
    }
    yield { type: 'done', text: full, model, usage, finishReason };
  }
}

module.exports = { AnthropicProvider };
