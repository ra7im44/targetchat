'use strict';

const { Setting } = require('../models');
const registry = require('./ai/registry');
const { buildSystemPrompt, toChatMessages } = require('./ai/prompt');
const { AiProviderError, cancelledError } = require('./ai/errors');
// Legacy canned-response engine. It is NEVER used unless the operator opts in
// with AI_ALLOW_FALLBACK=true, and results are tagged with fallback:true so a
// canned answer can never masquerade as a model generation.
const legacyFallback = require('./ai/legacyFallback');

const SETTINGS_TTL_MS = 15000;
const DEFAULTS = {
  temperature: 0.7,
  maxTokens: 700
};

function envNumber(name, fallback) {
  const n = Number(process.env[name]);
  return Number.isFinite(n) ? n : fallback;
}

function fallbackAllowed(explicit, configured) {
  if (typeof explicit === 'boolean') return explicit;
  if (typeof configured === 'boolean') return configured;
  return String(process.env.AI_ALLOW_FALLBACK || '').toLowerCase() === 'true';
}

function settingValue(row) {
  if (!row || row.value === null || row.value === undefined) return undefined;
  const raw = String(row.value);
  if (row.type === 'boolean') return ['true', '1'].includes(raw.toLowerCase());
  if (row.type === 'number') {
    const num = Number(raw);
    return Number.isFinite(num) ? num : undefined;
  }
  return raw.trim() ? raw.trim() : undefined;
}

function n8nFallbackEnabled() {
  return String(process.env.AI_N8N_FALLBACK || 'true').toLowerCase() !== 'false';
}

function sleep(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal && signal.aborted) return reject(cancelledError({}));
    const timer = setTimeout(resolve, ms);
    if (signal && typeof signal.addEventListener === 'function') {
      signal.addEventListener('abort', () => {
        clearTimeout(timer);
        reject(cancelledError({}));
      }, { once: true });
    }
  });
}

function messageText(userMessage) {
  if (typeof userMessage === 'string') return userMessage;
  if (!userMessage || typeof userMessage !== 'object') return '';
  return typeof userMessage.text === 'string' ? userMessage.text : '';
}

class AiService {
  constructor() {
    this.settingsCache = { at: 0, data: {} };
  }

  /**
   * Optional database overrides managed from Admin > Settings.
   * Missing table / DB error must never break chat.
   */
  async settingsOverrides({ force = false } = {}) {
    const now = Date.now();
    if (!force && now - this.settingsCache.at < SETTINGS_TTL_MS) {
      return this.settingsCache.data;
    }
    const data = {};
    try {
      const rows = await Setting.findAll({
        where: {
          key: [
            'ai_enabled', 'ai_provider', 'ai_model', 'ollama_base_url',
            'ai_system_prompt', 'ai_temperature', 'ai_max_tokens',
            'ai_request_timeout_ms', 'ai_streaming_enabled',
            'ai_allow_fallback', 'ai_fallback_order', 'n8n_webhook_url',
            'ai_auto_handoff'
          ]
        }
      });
      for (const row of rows) {
        const value = settingValue(row);
        if (value !== undefined) data[row.key] = value;
      }
    } catch (err) {
      // Settings table absent on a very fresh DB — env config still works.
    }
    this.settingsCache = { at: now, data };
    return data;
  }

  /** Drop the cached settings snapshot (called after an admin save). */
  invalidateSettings() {
    this.settingsCache = { at: 0, data: {} };
  }

  async resolve({ workflow = null, force = false } = {}) {
    const overrides = await this.settingsOverrides({ force });
    const provider = overrides.ai_provider || undefined;
    const isOllama = !provider || String(provider).toLowerCase() === 'ollama';
    const config = await registry.resolveConfig({
      provider,
      model: overrides.ai_model,
      baseUrl: isOllama ? overrides.ollama_base_url : undefined,
      timeoutMs: overrides.ai_request_timeout_ms,
      streaming: overrides.ai_streaming_enabled,
      force
    });
    const extraInstructions =
      overrides.ai_system_prompt ||
      (workflow && typeof workflow.systemPrompt === 'string' ? workflow.systemPrompt : '');
    return {
      config,
      extraInstructions,
      overrides,
      enabled: overrides.ai_enabled !== false
    };
  }

  /** Runtime options used by the route layer (streaming gate, enable gate). */
  async runtimeOptions() {
    const { enabled, config, overrides } = await this.resolve({});
    return { enabled, streaming: config.streamingEnabled, config, overrides };
  }

  buildMessages({ config, history, text, persona, workflow, systemPrompt, extraInstructions, knowledge }) {
    const system = (systemPrompt && String(systemPrompt).trim())
      || buildSystemPrompt({ persona, workflow, extraInstructions, knowledge });
    return toChatMessages({ history, userMessage: text, system });
  }

  providerOptions(overrides = {}) {
    const temperature = Number(overrides.temperature);
    const maxTokens = Number(overrides.maxTokens);
    return {
      temperature: Number.isFinite(temperature) ? temperature : DEFAULTS.temperature,
      maxTokens: Number.isFinite(maxTokens)
        ? maxTokens
        : envNumber('AI_MAX_TOKENS', DEFAULTS.maxTokens)
    };
  }

  /**
   * Generate a complete response.
   * @returns {Promise<{text:string, provider:string, model:string|null, usage:object, fallback:boolean, latencyMs:number}>}
   */
  async generate({
    chatId,
    userId,
    userMessage,
    persona = 'default',
    workflow = null,
    history = [],
    systemPrompt = '',
    knowledge = [],
    allowFallback,
    abortSignal = null
  } = {}) {
    const text = messageText(userMessage).trim();
    const startedAt = Date.now();
    const attempts = [];

    if (!text) {
      throw new AiProviderError('A non-empty message is required', {
        code: 'ai_bad_request', status: 400
      });
    }

    const { config, extraInstructions, overrides, enabled } = await this.resolve({ workflow });
    if (!enabled) {
      throw new AiProviderError('AI is disabled in System Settings', {
        code: 'ai_disabled', status: 503, provider: config.provider
      });
    }
    if (!config.configured) {
      throw new AiProviderError(`${config.label} is not configured`, {
        code: 'ai_unconfigured', status: 503, provider: config.provider
      });
    }
    if (!config.model) {
      throw new AiProviderError('No AI model is available', {
        code: 'ai_model_missing', status: 503, provider: config.provider
      });
    }

    const messages = this.buildMessages({
      config, history, text, persona, workflow, systemPrompt, extraInstructions, knowledge
    });
    const options = this.providerOptions({
      temperature: overrides.ai_temperature,
      maxTokens: overrides.ai_max_tokens
    });

    const fallbacks = await registry.fallbackConfigs({
      exclude: [config.provider],
      order: overrides.ai_fallback_order
    });
    const candidates = [config, ...fallbacks];
    const maxRetries = Math.max(0, Math.min(3, envNumber('AI_MAX_RETRIES', 1)));
    let lastError = null;

    for (const candidate of candidates) {
      if (abortSignal && abortSignal.aborted) throw cancelledError({});
      const provider = registry.createProvider(candidate);
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        const attemptStart = Date.now();
        try {
          const result = await provider.chat({ model: candidate.model, messages, options, signal: abortSignal });
          if (!result || !result.text || !result.text.trim()) {
            throw new AiProviderError('AI provider returned an empty response', {
              code: 'ai_empty_response', status: 502, retryable: true,
              provider: candidate.provider, model: candidate.model
            });
          }
          attempts.push({
            provider: candidate.provider, model: candidate.model, ok: true,
            latencyMs: Date.now() - attemptStart
          });
          return {
            text: result.text.trim(),
            provider: candidate.provider,
            model: result.model || candidate.model,
            requestedModel: candidate.requestedModel,
            modelMismatch: candidate.modelMismatch,
            usage: result.usage || {},
            fallback: false,
            latencyMs: Date.now() - startedAt,
            attempts
          };
        } catch (err) {
          lastError = err instanceof AiProviderError ? err : new AiProviderError(err.message, {
            code: 'ai_error', provider: candidate.provider, model: candidate.model, cause: err
          });
          attempts.push({
            provider: candidate.provider, model: candidate.model, ok: false,
            code: lastError.code, latencyMs: Date.now() - attemptStart
          });
          if (lastError.code === 'ai_cancelled') throw lastError;
          if (!lastError.retryable || attempt === maxRetries) break;
          // Retry only transient failures; back off briefly.
          await sleep(350 * (attempt + 1), abortSignal);
        }
      }
    }

    // Optional n8n pipeline (existing integration). Still a real remote model
    // response, not a canned template, so it is not tagged as a fallback.
    if (n8nFallbackEnabled()) {
      try {
        const n8nReply = await this.tryN8nWebhook({
          chatId,
          userId,
          userMessage: typeof userMessage === 'object' ? userMessage : { type: 'text', text },
          workflow
        });
        if (n8nReply && n8nReply.trim()) {
          attempts.push({ provider: 'n8n', model: null, ok: true });
          return {
            text: n8nReply.trim(),
            provider: 'n8n',
            model: null,
            usage: {},
            fallback: false,
            latencyMs: Date.now() - startedAt,
            attempts
          };
        }
      } catch (n8nErr) {
        attempts.push({ provider: 'n8n', model: null, ok: false, code: 'n8n_failed' });
      }
    }

    if (fallbackAllowed(allowFallback, overrides.ai_allow_fallback)) {
      const canned = legacyFallback.generateSmartFallbackReply({
        messageText: text,
        messageType: (userMessage && userMessage.type) || 'text',
        persona,
        workflow,
        history
      });
      attempts.push({ provider: 'canned', model: null, ok: true });
      return {
        text: canned,
        provider: 'canned',
        model: null,
        usage: {},
        fallback: true,
        fallbackReason: lastError ? lastError.code : 'ai_unavailable',
        latencyMs: Date.now() - startedAt,
        attempts
      };
    }

    throw lastError || new AiProviderError('AI generation failed', {
      code: 'ai_unavailable', status: 503, provider: config.provider, model: config.model
    });
  }

  /**
   * Backwards-compatible string API used by legacy callers.
   * Returns null when generation fails and canned fallback is disabled.
   */
  async generateResponse(args = {}) {
    try {
      const result = await this.generate(args);
      return result.text;
    } catch (err) {
      console.error('[aiService] generation failed:', err.code || err.message);
      return null;
    }
  }

  /**
   * Stream a response as provider-neutral chunks:
   *   { type: 'start' } → { type: 'delta', text }* → { type: 'done', ... }
   */
  async *stream({
    chatId,
    userId,
    userMessage,
    persona = 'default',
    workflow = null,
    history = [],
    systemPrompt = '',
    knowledge = [],
    allowFallback,
    abortSignal = null
  } = {}) {
    const text = messageText(userMessage).trim();
    const startedAt = Date.now();
    if (!text) {
      throw new AiProviderError('A non-empty message is required', {
        code: 'ai_bad_request', status: 400
      });
    }

    const { config, extraInstructions, overrides, enabled } = await this.resolve({ workflow });
    if (!enabled) {
      throw new AiProviderError('AI is disabled in System Settings', {
        code: 'ai_disabled', status: 503, provider: config.provider
      });
    }
    if (!config.configured) {
      throw new AiProviderError(`${config.label} is not configured`, {
        code: 'ai_unconfigured', status: 503, provider: config.provider
      });
    }
    if (!config.model) {
      throw new AiProviderError('No AI model is available', {
        code: 'ai_model_missing', status: 503, provider: config.provider
      });
    }

    const messages = this.buildMessages({
      config, history, text, persona, workflow, systemPrompt, extraInstructions, knowledge
    });
    const options = this.providerOptions({
      temperature: overrides.ai_temperature,
      maxTokens: overrides.ai_max_tokens
    });
    const fallbacks = await registry.fallbackConfigs({
      exclude: [config.provider],
      order: overrides.ai_fallback_order
    });
    const candidates = [config, ...fallbacks];
    let lastError = null;

    for (const candidate of candidates) {
      if (abortSignal && abortSignal.aborted) throw cancelledError({});
      const provider = registry.createProvider(candidate);
      let emitted = false;
      try {
        for await (const chunk of provider.streamChat({
          model: candidate.model, messages, options, signal: abortSignal
        })) {
          if (chunk.type === 'delta') {
            emitted = true;
            yield { type: 'delta', text: chunk.text };
          } else if (chunk.type === 'done') {
            if (!chunk.text || !chunk.text.trim()) {
              throw new AiProviderError('AI provider returned an empty response', {
                code: 'ai_empty_response', status: 502, retryable: true,
                provider: candidate.provider, model: candidate.model
              });
            }
            yield {
              type: 'done',
              text: chunk.text.trim(),
              provider: candidate.provider,
              model: chunk.model || candidate.model,
              requestedModel: candidate.requestedModel,
              modelMismatch: candidate.modelMismatch,
              usage: chunk.usage || {},
              fallback: false,
              latencyMs: Date.now() - startedAt,
              finishReason: chunk.finishReason || null
            };
            return;
          }
        }
        if (!emitted) {
          throw new AiProviderError('AI provider closed the stream without output', {
            code: 'ai_empty_response', status: 502, retryable: true,
            provider: candidate.provider, model: candidate.model
          });
        }
      } catch (err) {
        lastError = err instanceof AiProviderError ? err : new AiProviderError(err.message, {
          code: 'ai_error', provider: candidate.provider, model: candidate.model, cause: err
        });
        if (lastError.code === 'ai_cancelled') throw lastError;
        // Never retry once bytes reached the client: that would duplicate text.
        if (emitted) throw lastError;
      }
    }

    if (fallbackAllowed(allowFallback, overrides.ai_allow_fallback)) {
      const canned = legacyFallback.generateSmartFallbackReply({
        messageText: text,
        messageType: (userMessage && userMessage.type) || 'text',
        persona,
        workflow,
        history
      });
      yield { type: 'delta', text: canned };
      yield {
        type: 'done',
        text: canned,
        provider: 'canned',
        model: null,
        usage: {},
        fallback: true,
        fallbackReason: lastError ? lastError.code : 'ai_unavailable',
        latencyMs: Date.now() - startedAt
      };
      return;
    }

    const err = lastError || new AiProviderError('AI generation failed', {
      code: 'ai_unavailable', status: 503, provider: config.provider, model: config.model
    });
    yield { type: 'error', error: err.toJSON() };
    if (!(err instanceof AiProviderError)) throw err;
  }

  /**
   * Existing n8n webhook integration (secondary, optional).
   */
  async tryN8nWebhook({ chatId, userId, userMessage, workflow }) {
    const axios = require('axios');
    let webhookUrl = workflow && workflow.webhookUrl;
    if (!webhookUrl) {
      const setting = await Setting.findOne({ where: { key: 'n8n_webhook_url' } });
      webhookUrl = (setting && setting.value) || process.env.N8N_WEBHOOK_URL;
    }
    if (!webhookUrl) return null;

    const response = await axios.post(webhookUrl, {
      chat_id: chatId,
      user_id: userId,
      message: userMessage
    }, { headers: { 'Content-Type': 'application/json' }, timeout: 2500 });

    const data = response.data;
    if (typeof data === 'string' && data.trim()) return data.trim();
    if (data && data.reply) {
      if (typeof data.reply === 'string') return data.reply;
      if (data.reply.text) return data.reply.text;
    }
    if (data && typeof data.output === 'string') return data.output;
    return null;
  }

  /** Provider/model/health summary for the UI and health endpoint. */
  async status(options = {}) {
    const overrides = await this.settingsOverrides({ force: Boolean(options.force) });
    const provider = overrides.ai_provider || undefined;
    const isOllama = !provider || String(provider).toLowerCase() === 'ollama';
    const status = await registry.status({
      ...options,
      overrides: {
        provider,
        model: overrides.ai_model,
        baseUrl: isOllama ? overrides.ollama_base_url : undefined,
        timeoutMs: overrides.ai_request_timeout_ms,
        streaming: overrides.ai_streaming_enabled
      }
    });
    return {
      ...status,
      enabled: overrides.ai_enabled !== false,
      temperature: overrides.ai_temperature,
      maxTokens: overrides.ai_max_tokens,
      fallbackEnabled: overrides.ai_allow_fallback === true,
      n8nFallback: n8nFallbackEnabled(),
      fallbackOrder: String(overrides.ai_fallback_order || '')
        .split(',').map((s) => s.trim()).filter(Boolean),
      providers: registry.catalog()
    };
  }

  buildSystemPrompt(persona, workflow) {
    return buildSystemPrompt({ persona, workflow });
  }
}

module.exports = new AiService();
