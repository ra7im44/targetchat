'use strict';

const { requestJson, openStream, joinUrl, sse } = require('../http');
const { AiProviderError } = require('../errors');

function textFromContent(content) {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => (part && (part.text || part.content)) || '')
      .join('');
  }
  return '';
}

/**
 * OpenAI-compatible chat provider.
 * Used by OpenAI, DeepSeek and Groq (all expose /chat/completions).
 * Credentials are only read from the environment; a provider without a key is
 * reported as unconfigured instead of receiving a fake response.
 */
class OpenAICompatibleProvider {
  constructor({ id = 'openai', baseUrl, apiKey, timeoutMs = 120000 } = {}) {
    this.id = id;
    this.baseUrl = String(baseUrl || '').replace(/\/+$/, '');
    this.apiKey = apiKey || '';
    this.timeoutMs = timeoutMs;
  }

  headers() {
    if (!this.apiKey) {
      throw new AiProviderError(`${this.id} API key is not configured`, {
        code: 'ai_unconfigured', status: 503, provider: this.id
      });
    }
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.apiKey}`
    };
  }

  mapUsage(raw) {
    const usage = raw && raw.usage;
    if (!usage) {
      return {
        promptTokens: null, completionTokens: null, totalTokens: null,
        durationMs: null, finishReason: null, providerReported: false
      };
    }
    return {
      promptTokens: Number.isFinite(Number(usage.prompt_tokens)) ? Number(usage.prompt_tokens) : null,
      completionTokens: Number.isFinite(Number(usage.completion_tokens)) ? Number(usage.completion_tokens) : null,
      totalTokens: Number.isFinite(Number(usage.total_tokens)) ? Number(usage.total_tokens) : null,
      durationMs: null,
      finishReason: raw.choices && raw.choices[0] ? raw.choices[0].finish_reason : null,
      providerReported: true
    };
  }

  buildBody({ model, messages, options = {}, stream }) {
    const body = { model, messages, stream };
    if (Number.isFinite(Number(options.temperature))) body.temperature = Number(options.temperature);
    if (Number.isFinite(Number(options.maxTokens))) body.max_tokens = Number(options.maxTokens);
    if (stream) body.stream_options = { include_usage: true };
    return body;
  }

  async chat({ model, messages, options = {}, signal } = {}) {
    const { data } = await requestJson(joinUrl(this.baseUrl, '/chat/completions'), {
      method: 'POST',
      headers: this.headers(),
      body: this.buildBody({ model, messages, options, stream: false }),
      timeoutMs: this.timeoutMs,
      signal,
      provider: this.id,
      model
    });
    const choice = data && data.choices && data.choices[0];
    return {
      text: choice ? textFromContent(choice.message && choice.message.content) : '',
      model: (data && data.model) || model,
      usage: this.mapUsage(data || {}),
      raw: data
    };
  }

  async *streamChat({ model, messages, options = {}, signal } = {}) {
    const { response, abort } = await openStream(joinUrl(this.baseUrl, '/chat/completions'), {
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
        if (event.usage) usage = this.mapUsage(event);
        const choice = event.choices && event.choices[0];
        if (!choice) continue;
        const delta = textFromContent(choice.delta && choice.delta.content);
        if (delta) {
          full += delta;
          yield { type: 'delta', text: delta };
        }
        if (choice.finish_reason) finishReason = choice.finish_reason;
      }
    } finally {
      abort.cleanup();
    }
    yield { type: 'done', text: full, model, usage, finishReason };
  }
}

module.exports = { OpenAICompatibleProvider, textFromContent };
