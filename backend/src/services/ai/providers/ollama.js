'use strict';

const { requestJson, openStream, joinUrl, ndjson } = require('../http');
const { AiProviderError } = require('../errors');

/**
 * Native Ollama provider (http://localhost:11434).
 *
 * Uses /api/chat rather than the OpenAI compatibility shim so that Ollama's
 * real usage metadata (prompt_eval_count / eval_count / durations) is captured.
 */
class OllamaProvider {
  constructor({ baseUrl, timeoutMs = 120000 } = {}) {
    // Native API lives at the origin root; tolerate a /v1 suffix in config.
    this.baseUrl = String(baseUrl || 'http://127.0.0.1:11434')
      .replace(/\/+$/, '')
      .replace(/\/v1$/i, '');
    this.timeoutMs = timeoutMs;
    this.id = 'ollama';
  }

  async listModels({ signal } = {}) {
    const { data } = await requestJson(joinUrl(this.baseUrl, '/api/tags'), {
      method: 'GET',
      timeoutMs: Math.min(this.timeoutMs, 8000),
      signal,
      provider: this.id
    });
    const models = Array.isArray(data && data.models) ? data.models : [];
    return models.map((m) => ({
      name: m.name,
      model: m.model || m.name,
      size: m.size,
      family: m.details && m.details.family,
      parameterSize: m.details && m.details.parameter_size,
      contextLength: m.details && m.details.context_length,
      capabilities: Array.isArray(m.capabilities) ? m.capabilities : []
    }));
  }

  buildOptions(options = {}) {
    const opts = {};
    const numPredict = options.maxTokens || options.num_predict;
    if (Number.isFinite(Number(numPredict))) opts.num_predict = Number(numPredict);
    if (Number.isFinite(Number(options.temperature))) opts.temperature = Number(options.temperature);
    if (Number.isFinite(Number(options.numCtx))) opts.num_ctx = Number(options.numCtx);
    if (Number.isFinite(Number(options.topP))) opts.top_p = Number(options.topP);
    return opts;
  }

  mapUsage(data = {}) {
    const ns = (v) => (Number.isFinite(Number(v)) ? Math.round(Number(v) / 1e6) : null);
    return {
      promptTokens: Number.isFinite(Number(data.prompt_eval_count)) ? Number(data.prompt_eval_count) : null,
      completionTokens: Number.isFinite(Number(data.eval_count)) ? Number(data.eval_count) : null,
      totalTokens:
        Number.isFinite(Number(data.prompt_eval_count)) && Number.isFinite(Number(data.eval_count))
          ? Number(data.prompt_eval_count) + Number(data.eval_count)
          : null,
      durationMs: ns(data.total_duration),
      loadDurationMs: ns(data.load_duration),
      generationMs: ns(data.eval_duration),
      promptEvalMs: ns(data.prompt_eval_duration),
      finishReason: data.done_reason || null,
      providerReported: true
    };
  }

  async chat({ model, messages, options = {}, signal } = {}) {
    if (!model) throw new AiProviderError('No Ollama model configured', { code: 'ai_model_missing', provider: this.id });
    const { data } = await requestJson(joinUrl(this.baseUrl, '/api/chat'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: { model, messages, stream: false, options: this.buildOptions(options) },
      timeoutMs: this.timeoutMs,
      signal,
      provider: this.id,
      model
    });

    const text = (data && data.message && data.message.content) || '';
    return {
      text,
      model: (data && data.model) || model,
      usage: this.mapUsage(data || {}),
      raw: data
    };
  }

  async *streamChat({ model, messages, options = {}, signal } = {}) {
    if (!model) throw new AiProviderError('No Ollama model configured', { code: 'ai_model_missing', provider: this.id });
    const { response, abort } = await openStream(joinUrl(this.baseUrl, '/api/chat'), {
      headers: { 'Content-Type': 'application/json' },
      body: { model, messages, stream: true, options: this.buildOptions(options) },
      timeoutMs: this.timeoutMs,
      signal,
      provider: this.id,
      model
    });

    let full = '';
    let last = null;
    try {
      for await (const chunk of ndjson(response)) {
        last = chunk;
        if (chunk.error) {
          throw new AiProviderError('Ollama reported a generation error', {
            code: 'ai_unavailable', status: 502, retryable: true, provider: this.id, model
          });
        }
        const delta = (chunk.message && chunk.message.content) || '';
        if (delta) {
          full += delta;
          yield { type: 'delta', text: delta };
        }
        if (chunk.done) {
          yield {
            type: 'done',
            text: full,
            model: chunk.model || model,
            usage: this.mapUsage(chunk),
            finishReason: chunk.done_reason || null
          };
        }
      }
    } finally {
      abort.cleanup();
    }

    // Some builds close the socket without a final `done` frame.
    if (last && !last.done) {
      yield { type: 'done', text: full, model, usage: this.mapUsage({}), finishReason: 'closed' };
    }
  }

  async embed({ model, input, signal } = {}) {
    const inputs = Array.isArray(input) ? input : [input];
    const { data } = await requestJson(joinUrl(this.baseUrl, '/api/embed'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: { model, input: inputs },
      timeoutMs: this.timeoutMs,
      signal,
      provider: this.id,
      model
    });
    return (data && data.embeddings) || [];
  }
}

module.exports = { OllamaProvider };
