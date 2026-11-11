'use strict';

const { Readable } = require('stream');
const { fromFetchError, timeoutError } = require('./errors');

function joinUrl(baseUrl, path) {
  return `${String(baseUrl || '').replace(/\/+$/, '')}${path}`;
}

/**
 * Abort controller that combines a hard timeout with an optional caller signal.
 * The returned flags let callers distinguish "timed out" from "user cancelled".
 */
function makeAbort(timeoutMs, externalSignal) {
  const controller = new AbortController();
  let timedOut = false;
  let cancelled = false;

  const timer = Number.isFinite(timeoutMs) && timeoutMs > 0
    ? setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, timeoutMs)
    : null;

  const onAbort = () => {
    cancelled = true;
    controller.abort();
  };

  if (externalSignal) {
    if (externalSignal.aborted) onAbort();
    else if (typeof externalSignal.addEventListener === 'function') {
      externalSignal.addEventListener('abort', onAbort, { once: true });
    }
  }

  return {
    signal: controller.signal,
    timedOut: () => timedOut,
    cancelled: () => cancelled,
    cleanup() {
      if (timer) clearTimeout(timer);
      if (externalSignal && typeof externalSignal.removeEventListener === 'function') {
        externalSignal.removeEventListener('abort', onAbort);
      }
    }
  };
}

async function readErrorBody(response) {
  try {
    const text = await response.text();
    return text ? text.slice(0, 400) : '';
  } catch (e) {
    return '';
  }
}

/**
 * JSON request with timeout + normalised errors.
 * @returns {Promise<{data: any, status: number, headers: Headers}>}
 */
async function requestJson(url, {
  method = 'POST',
  headers = {},
  body,
  timeoutMs = 120000,
  signal: externalSignal,
  provider,
  model
} = {}) {
  const abort = makeAbort(timeoutMs, externalSignal);
  let response;
  try {
    response = await fetch(url, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: abort.signal
    });
  } catch (err) {
    if (abort.timedOut()) throw timeoutError({ provider, model, timeoutMs });
    throw fromFetchError(err, { provider, model });
  }

  if (!response.ok) {
    const text = await readErrorBody(response);
    throw fromFetchError(new Error(`HTTP ${response.status}`), {
      provider, model, status: response.status, body: text
    });
  }

  let data;
  try {
    data = await response.json();
  } catch (err) {
    throw fromFetchError(err, { provider, model });
  } finally {
    abort.cleanup();
  }
  return { data, status: response.status, headers: response.headers };
}

/**
 * Open a streaming POST request and return line iterators.
 */
async function openStream(url, {
  method = 'POST',
  headers = {},
  body,
  timeoutMs = 120000,
  signal: externalSignal,
  provider,
  model
} = {}) {
  const abort = makeAbort(timeoutMs, externalSignal);
  let response;
  try {
    response = await fetch(url, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: abort.signal
    });
  } catch (err) {
    abort.cleanup();
    if (abort.timedOut()) throw timeoutError({ provider, model, timeoutMs });
    throw fromFetchError(err, { provider, model });
  }

  if (!response.ok) {
    const text = await readErrorBody(response);
    abort.cleanup();
    throw fromFetchError(new Error(`HTTP ${response.status}`), {
      provider, model, status: response.status, body: text
    });
  }

  if (!response.body) {
    abort.cleanup();
    throw fromFetchError(new Error('Empty streaming body'), { provider, model });
  }

  return { response, abort };
}

/**
 * Yield complete lines from a fetch response body (web stream or node stream).
 */
async function* lines(response) {
  const source = typeof response.body.getReader === 'function'
    ? Readable.fromWeb(response.body)
    : response.body;

  let buffer = '';
  for await (const chunk of source) {
    buffer += Buffer.isBuffer(chunk) ? chunk.toString('utf8') : String(chunk);
    let idx;
    while ((idx = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, idx).replace(/\r$/, '');
      buffer = buffer.slice(idx + 1);
      yield line;
    }
  }
  if (buffer.trim().length) yield buffer.replace(/\r$/, '');
}

/**
 * Yield parsed NDJSON objects (Ollama native API).
 */
async function* ndjson(response) {
  for await (const line of lines(response)) {
    if (!line.trim()) continue;
    try {
      yield JSON.parse(line);
    } catch (e) {
      // A malformed chunk must not abort the whole generation.
    }
  }
}

/**
 * Yield parsed SSE `data:` payloads. `[DONE]` sentinels are skipped.
 */
async function* sse(response) {
  for await (const line of lines(response)) {
    if (!line.startsWith('data:')) continue;
    const payload = line.slice(5).trim();
    if (!payload || payload === '[DONE]') continue;
    try {
      yield JSON.parse(payload);
    } catch (e) {
      // ignore keep-alives / non-JSON data frames
    }
  }
}

module.exports = { joinUrl, makeAbort, requestJson, openStream, lines, ndjson, sse, readErrorBody };
