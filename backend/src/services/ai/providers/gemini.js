'use strict';

const { requestJson, openStream, joinUrl, sse } = require('../http');
const { AiProviderError } = require('../errors');

/**
 * Google Gemini generateContent adapter.
 * Integration-ready: requires GEMINI_API_KEY. Never called with a fake key.
 */
class GeminiProvider {
  constructor({ baseUrl = 'https://generativelanguage.googleapis.com/v1beta', apiKey, timeoutMs = 120000 } = {}) {
    this.id = 'gemini';
    this.baseUrl = String(baseUrl || 'https://generativelanguage.googleapis.com/v1beta').replace(/\/+$/, '');
    this.apiKey = apiKey || '';
    this.timeoutMs = timeoutMs;
  }

  assertKey() {
    if (!this.apiKey) {
      throw new AiProviderError('gemini API key is not configured', {
        code: 'ai_unconfigured', status: 503, provider: this.id
      });
    }
  }

  endpoint(model, action) {
    return joinUrl(this.baseUrl, `/models/${encodeURIComponent(model)}:${action}?key=${encodeURIComponent(this.apiKey)}`);
  }

  buildBody({ messages, options = {} }) {
    const system = messages.filter((m) => m.role === 'system').map((m) => m.content).join('\n\n');
    const contents = messages
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      }));
    const body = { contents };
    if (system) body.systemInstruction = { parts: [{ text: system }] };
    const generationConfig = {};
    if (Number.isFinite(Number(options.temperature))) generationConfig.temperature = Number(options.temperature);
    if (Number.isFinite(Number(options.maxTokens))) generationConfig.maxOutputTokens = Number(options.maxTokens);
    if (Object.keys(generationConfig).length) body.generationConfig = generationConfig;
    return body;
  }

  mapUsage(raw = {}) {
    const meta = raw.usageMetadata || {};
    return {
      promptTokens: Number.isFinite(Number(meta.promptTokenCount)) ? Number(meta.promptTokenCount) : null,
      completionTokens: Number.isFinite(Number(meta.candidatesTokenCount)) ? Number(meta.candidatesTokenCount) : null,
      totalTokens: Number.isFinite(Number(meta.totalTokenCount)) ? Number(meta.totalTokenCount) : null,
      durationMs: null,
      finishReason:
        raw.candidates && raw.candidates[0] && raw.candidates[0].finishReason
          ? raw.candidates[0].finishReason
          : null,
      providerReported: true
    };
  }

  extractText(raw = {}) {
    const candidate = raw.candidates && raw.candidates[0];
    const parts = (candidate && candidate.content && candidate.content.parts) || [];
    return parts.map((p) => p.text || '').join('');
  }

  headers() {
    return { 'Content-Type': 'application/json' };
  }

  async chat({ model, messages, options = {}, signal } = {}) {
    this.assertKey();
    const { data } = await requestJson(this.endpoint(model, 'generateContent'), {
      headers: this.headers(),
      body: this.buildBody({ messages, options }),
      timeoutMs: this.timeoutMs,
      signal,
      provider: this.id,
      model
    });
    return {
      text: this.extractText(data),
      model,
      usage: this.mapUsage(data),
      raw: data
    };
  }

  async *streamChat({ model, messages, options = {}, signal } = {}) {
    this.assertKey();
    const { response, abort } = await openStream(this.endpoint(model, 'streamGenerateContent') + '&alt=sse', {
      headers: this.headers(),
      body: this.buildBody({ messages, options }),
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
        const delta = this.extractText(event);
        if (delta) {
          full += delta;
          yield { type: 'delta', text: delta };
        }
        if (event.usageMetadata) usage = this.mapUsage(event);
        if (event.candidates && event.candidates[0] && event.candidates[0].finishReason) {
          finishReason = event.candidates[0].finishReason;
        }
      }
    } finally {
      abort.cleanup();
    }
    yield { type: 'done', text: full, model, usage, finishReason };
  }
}

module.exports = { GeminiProvider };
