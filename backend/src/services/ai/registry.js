'use strict';

const { AiProviderError } = require('./errors');
const { OllamaProvider } = require('./providers/ollama');
const { OpenAICompatibleProvider } = require('./providers/openaiCompatible');
const { AnthropicProvider } = require('./providers/anthropic');
const { GeminiProvider } = require('./providers/gemini');

/**
 * Provider registry: one place that knows which AI backends exist, how they are
 * configured, and which model to use. Local Ollama is the default. Cloud
 * providers are only ever used when their key is present in the environment.
 */
const DEFINITIONS = {
  ollama: {
    id: 'ollama',
    label: 'Ollama (local)',
    kind: 'ollama',
    local: true,
    keyEnv: null,
    baseUrlEnv: 'OLLAMA_BASE_URL',
    defaultBaseUrl: 'http://127.0.0.1:11434',
    modelEnv: 'OLLAMA_MODEL',
    defaultModel: 'qwen2.5:3b'
  },
  openai: {
    id: 'openai',
    label: 'OpenAI',
    kind: 'openai-compatible',
    local: false,
    keyEnv: 'OPENAI_API_KEY',
    baseUrlEnv: 'OPENAI_BASE_URL',
    defaultBaseUrl: 'https://api.openai.com/v1',
    modelEnv: 'OPENAI_MODEL',
    defaultModel: 'gpt-4o-mini'
  },
  deepseek: {
    id: 'deepseek',
    label: 'DeepSeek',
    kind: 'openai-compatible',
    local: false,
    keyEnv: 'DEEPSEEK_API_KEY',
    baseUrlEnv: 'DEEPSEEK_BASE_URL',
    defaultBaseUrl: 'https://api.deepseek.com/v1',
    modelEnv: 'DEEPSEEK_MODEL',
    defaultModel: 'deepseek-chat'
  },
  groq: {
    id: 'groq',
    label: 'Groq',
    kind: 'openai-compatible',
    local: false,
    keyEnv: 'GROQ_API_KEY',
    baseUrlEnv: 'GROQ_BASE_URL',
    defaultBaseUrl: 'https://api.groq.com/openai/v1',
    modelEnv: 'GROQ_MODEL',
    defaultModel: 'llama-3.3-70b-versatile'
  },
  anthropic: {
    id: 'anthropic',
    label: 'Anthropic Claude',
    kind: 'anthropic',
    local: false,
    keyEnv: 'ANTHROPIC_API_KEY',
    baseUrlEnv: 'ANTHROPIC_BASE_URL',
    defaultBaseUrl: 'https://api.anthropic.com/v1',
    modelEnv: 'ANTHROPIC_MODEL',
    defaultModel: 'claude-sonnet-4-5'
  },
  gemini: {
    id: 'gemini',
    label: 'Google Gemini',
    kind: 'gemini',
    local: false,
    keyEnv: 'GEMINI_API_KEY',
    baseUrlEnv: 'GEMINI_BASE_URL',
    defaultBaseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    modelEnv: 'GEMINI_MODEL',
    defaultModel: 'gemini-2.0-flash'
  }
};

// Preference order used only when the configured Ollama model is not installed.
// qwen2.5-coder is a real Qwen 2.5 3B build and is what ships on the local box;
// llama3.2:1b is the small general-purpose fallback.
const OLLAMA_MODEL_PREFERENCE = [
  'qwen2.5:3b',
  'qwen2.5:3b-instruct',
  'qwen2.5-coder:3b',
  'qwen2.5:7b',
  'llama3.2:3b',
  'llama3.2:1b',
  'llama3.1:8b'
];

const EMBEDDING_MODEL_RE = /(embed|bge|e5-|minilm|nomic)/i;
const MODEL_CACHE_TTL_MS = 30000;

let modelCache = { at: 0, models: [], error: null };

function envValue(name) {
  const raw = process.env[name];
  return typeof raw === 'string' && raw.trim() ? raw.trim() : undefined;
}

function numberEnv(name, fallback) {
  const n = Number(envValue(name));
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function normalizeBaseUrl(raw, fallback) {
  const base = String(raw || fallback || '').trim().replace(/\/+$/, '');
  return base || fallback;
}

function normalizeTag(name) {
  return String(name || '').toLowerCase().replace(/:latest$/, '');
}

function stripV1(baseUrl) {
  return String(baseUrl || '').replace(/\/+$/, '').replace(/\/v1$/i, '');
}

function definition(providerId) {
  const def = DEFINITIONS[String(providerId || '').toLowerCase()];
  if (!def) {
    throw new AiProviderError(`Unknown AI provider: ${providerId}`, {
      code: 'ai_bad_request', status: 400, provider: providerId
    });
  }
  return def;
}

async function listOllamaModels({ baseUrl, timeoutMs, force = false } = {}) {
  const now = Date.now();
  if (!force && modelCache.models.length && now - modelCache.at < MODEL_CACHE_TTL_MS) {
    return modelCache.models;
  }
  const provider = new OllamaProvider({
    baseUrl: baseUrl || envValue('OLLAMA_BASE_URL') || DEFINITIONS.ollama.defaultBaseUrl,
    timeoutMs: timeoutMs || numberEnv('AI_REQUEST_TIMEOUT_MS', 120000)
  });
  try {
    const models = await provider.listModels();
    modelCache = { at: now, models, error: null };
    return models;
  } catch (err) {
    modelCache = { at: now, models: [], error: err };
    throw err;
  }
}

/**
 * Pick the model to actually use.
 * An explicit OLLAMA_MODEL/AI_MODEL is treated as a preference: if it is not
 * installed we fall back to the closest installed Qwen build and report the
 * mismatch so the UI/API can show the truth instead of failing silently.
 */
function pickOllamaModel(models, requested) {
  const available = models.map((m) => m.name);
  const requestedTag = requested ? normalizeTag(requested) : null;
  const exact = requestedTag
    ? available.find((name) => normalizeTag(name) === requestedTag)
    : null;
  if (exact) return { model: exact, modelMismatch: false };

  for (const candidate of OLLAMA_MODEL_PREFERENCE) {
    const match = available.find((name) => normalizeTag(name) === normalizeTag(candidate));
    if (match) {
      return { model: match, modelMismatch: Boolean(requested) };
    }
  }

  const firstChat = models.find((m) => !EMBEDDING_MODEL_RE.test(m.name));
  if (firstChat) return { model: firstChat.name, modelMismatch: Boolean(requested) };

  return { model: null, modelMismatch: Boolean(requested) };
}

/**
 * Resolve the effective provider configuration (async because local model
 * discovery talks to Ollama).
 */
async function resolveConfig(overrides = {}) {
  const providerId = String(overrides.provider || envValue('AI_PROVIDER') || 'ollama').toLowerCase();
  const def = definition(providerId);
  // Explicit (admin setting) timeout wins over env, which wins over default.
  const timeoutMs = Number(overrides.timeoutMs) > 0
    ? Number(overrides.timeoutMs)
    : numberEnv('AI_REQUEST_TIMEOUT_MS', 120000);

  const baseUrl = normalizeBaseUrl(
    overrides.baseUrl || envValue(def.baseUrlEnv),
    def.defaultBaseUrl
  );
  const apiKey = def.keyEnv ? (overrides.apiKey || envValue(def.keyEnv) || '') : '';

  let model = overrides.model || envValue(def.modelEnv) || envValue('AI_MODEL') || def.defaultModel;
  let requestedModel = model;
  let modelMismatch = false;
  let models = [];

  if (def.kind === 'ollama') {
    let discovered = [];
    try {
      discovered = await listOllamaModels({ baseUrl, timeoutMs, force: Boolean(overrides.force) });
    } catch (err) {
      // Provider reachability is reported by status(); generation will surface
      // the same error with a clear code.
      discovered = [];
    }
    models = discovered;
    if (discovered.length) {
      const picked = pickOllamaModel(discovered, model);
      model = picked.model;
      modelMismatch = picked.modelMismatch;
    }
  }

  const configured = def.keyEnv ? Boolean(apiKey) : true;

  return {
    provider: providerId,
    label: def.label,
    local: Boolean(def.local),
    kind: def.kind,
    baseUrl: def.kind === 'ollama' ? stripV1(baseUrl) : baseUrl,
    apiKey,
    model,
    requestedModel,
    modelMismatch,
    models,
    configured,
    timeoutMs,
    streamingEnabled: typeof overrides.streaming === 'boolean'
      ? overrides.streaming
      : envValue('AI_STREAMING_ENABLED') !== 'false'
  };
}

function createProvider(config) {
  const timeoutMs = config.timeoutMs || 120000;
  switch (config.kind) {
    case 'ollama':
      return new OllamaProvider({ baseUrl: config.baseUrl, timeoutMs });
    case 'openai-compatible':
      return new OpenAICompatibleProvider({
        id: config.provider,
        baseUrl: config.baseUrl,
        apiKey: config.apiKey,
        timeoutMs
      });
    case 'anthropic':
      return new AnthropicProvider({ baseUrl: config.baseUrl, apiKey: config.apiKey, timeoutMs });
    case 'gemini':
      return new GeminiProvider({ baseUrl: config.baseUrl, apiKey: config.apiKey, timeoutMs });
    default:
      throw new AiProviderError(`Unsupported AI provider kind: ${config.kind}`, {
        code: 'ai_bad_request', status: 500, provider: config.provider
      });
  }
}

/**
 * Ordered fallback providers from AI_FALLBACK_ORDER (comma separated). Only
 * providers with usable credentials are kept.
 */
async function fallbackConfigs({ exclude = [], order = null } = {}) {
  const raw = typeof order === 'string' && order.trim() ? order.trim() : envValue('AI_FALLBACK_ORDER');
  if (!raw) return [];
  const ids = raw.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
  const result = [];
  for (const id of ids) {
    if (!DEFINITIONS[id] || exclude.includes(id)) continue;
    try {
      const cfg = await resolveConfig({ provider: id });
      if (cfg.configured) result.push(cfg);
    } catch (e) {
      // Unknown/unconfigured fallback is skipped, never an app-level failure.
    }
  }
  return result;
}

/**
 * Safe status payload for the UI / health endpoints. Never includes API keys.
 */
async function status({ force = false, overrides = {} } = {}) {
  let config;
  try {
    config = await resolveConfig({ ...overrides, force });
  } catch (err) {
    return {
      ok: false,
      provider: envValue('AI_PROVIDER') || 'ollama',
      configured: false,
      reachable: false,
      streaming: false,
      error: { error: err.code || 'ai_error', message: err.message }
    };
  }

  const base = {
    ok: false,
    provider: config.provider,
    label: config.label,
    local: config.local,
    model: config.model,
    requestedModel: config.requestedModel,
    modelMismatch: config.modelMismatch,
    models: config.models.map((m) => m.name),
    configured: config.configured,
    reachable: false,
    streaming: config.streamingEnabled,
    timeoutMs: config.timeoutMs,
    error: null
  };

  if (!config.configured) {
    return {
      ...base,
      error: { error: 'ai_unconfigured', message: `${config.label} API key is not configured` }
    };
  }

  if (!config.model) {
    return {
      ...base,
      error: {
        error: 'ai_model_missing',
        message: 'No Ollama model is installed. Run: ollama pull qwen2.5:3b'
      }
    };
  }

  if (config.kind === 'ollama') {
    try {
      const models = await listOllamaModels({ baseUrl: config.baseUrl, timeoutMs: config.timeoutMs, force });
      return {
        ...base,
        ok: true,
        reachable: true,
        models: models.map((m) => m.name)
      };
    } catch (err) {
      return {
        ...base,
        error: { error: err.code || 'ai_unavailable', message: err.message }
      };
    }
  }

  // Cloud providers are "configured" but cannot be probed without spending a
  // paid request. Report that honestly instead of pretending to verify.
  return { ...base, ok: true, reachable: null, verified: false };
}

function catalog() {
  return Object.values(DEFINITIONS).map((def) => ({
    id: def.id,
    label: def.label,
    local: Boolean(def.local),
    defaultModel: def.defaultModel,
    requiresKey: Boolean(def.keyEnv),
    configured: def.keyEnv ? Boolean(envValue(def.keyEnv)) : true,
    selected: (envValue('AI_PROVIDER') || 'ollama') === def.id
  }));
}

function resetCache() {
  modelCache = { at: 0, models: [], error: null };
}

module.exports = {
  DEFINITIONS,
  definition,
  resolveConfig,
  createProvider,
  fallbackConfigs,
  status,
  catalog,
  listOllamaModels,
  pickOllamaModel,
  resetCache,
  OLLAMA_MODEL_PREFERENCE
};
