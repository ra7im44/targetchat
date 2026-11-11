'use strict';

/**
 * Stable, client-safe error codes for the AI layer.
 *
 * The route layer must never forward a raw provider message (it can contain
 * upstream URLs, model names, or partial keys), so every failure is normalised
 * into an AiProviderError with a small code and a human-readable message.
 */
class AiProviderError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = 'AiProviderError';
    this.code = options.code || 'ai_error';
    this.status = options.status || 502;
    this.provider = options.provider || null;
    this.model = options.model || null;
    this.retryable = Boolean(options.retryable);
    this.details = options.details || null;
    if (options.cause) this.cause = options.cause;
  }

  toJSON() {
    return {
      error: this.code,
      message: this.message,
      provider: this.provider,
      model: this.model,
      retryable: this.retryable
    };
  }
}

function cancelledError({ provider, model } = {}) {
  return new AiProviderError('AI generation was cancelled', {
    code: 'ai_cancelled',
    status: 499,
    provider,
    model
  });
}

function timeoutError({ provider, model, timeoutMs } = {}) {
  return new AiProviderError(
    timeoutMs
      ? `AI request timed out after ${timeoutMs}ms`
      : 'AI request timed out',
    { code: 'ai_timeout', status: 504, retryable: true, provider, model }
  );
}

function unavailableError({ provider, model, cause } = {}) {
  return new AiProviderError('AI provider is unreachable', {
    code: 'ai_unavailable',
    status: 503,
    retryable: true,
    provider,
    model,
    cause
  });
}

/**
 * Map a low-level fetch/HTTP failure onto an AiProviderError.
 */
function fromFetchError(err, { provider, model, timedOut = false, status, body } = {}) {
  if (err instanceof AiProviderError) return err;
  const name = err && err.name;
  if (name === 'AbortError') {
    return timedOut ? timeoutError({ provider, model }) : cancelledError({ provider, model });
  }
  if (status) {
    const detail = typeof body === 'string' ? body.slice(0, 400) : undefined;
    if (status === 401 || status === 403) {
      return new AiProviderError('AI provider rejected the credentials', {
        code: 'ai_unauthenticated', status: 502, provider, model
      });
    }
    if (status === 404) {
      return new AiProviderError('AI model or endpoint was not found', {
        code: 'ai_model_missing', status: 502, provider, model, details: detail
      });
    }
    if (status === 429) {
      return new AiProviderError('AI provider rate limit reached', {
        code: 'ai_rate_limited', status: 429, retryable: true, provider, model
      });
    }
    if (status >= 500) {
      return unavailableError({ provider, model, cause: err });
    }
    return new AiProviderError('AI provider rejected the request', {
      code: 'ai_bad_request', status: 502, provider, model, details: detail
    });
  }
  return unavailableError({ provider, model, cause: err });
}

module.exports = {
  AiProviderError,
  cancelledError,
  timeoutError,
  unavailableError,
  fromFetchError
};
