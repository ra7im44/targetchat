import { api, getToken } from './apiConfig';

/**
 * Consume POST /api/chat/stream (Server-Sent Events).
 *
 * Returns the final `done` payload. Throws an Error carrying `.status` and
 * `.code` when the request cannot start or the server emits an error event, so
 * callers can fall back to the non-streaming endpoint.
 */
export async function streamChat({
  body,
  token,
  signal,
  onStart,
  onDelta,
  onDone
} = {}) {
  const authToken = token || getToken();
  const response = await fetch(api('/chat/stream'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {})
    },
    body: JSON.stringify(body || {}),
    signal
  });

  if (!response.ok) {
    let data = null;
    try {
      data = await response.json();
    } catch (e) {
      data = null;
    }
    const err = new Error((data && data.message) || `Request failed (${response.status})`);
    err.status = response.status;
    err.code = data && data.error;
    throw err;
  }

  if (!response.body) {
    const err = new Error('Streaming is not supported by this browser');
    err.code = 'stream_unsupported';
    throw err;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let final = null;
  let streamError = null;

  const handleFrame = (frame) => {
    let event = 'message';
    const dataLines = [];
    for (const line of frame.split('\n')) {
      if (line.startsWith('event:')) event = line.slice(6).trim();
      else if (line.startsWith('data:')) dataLines.push(line.slice(5).trim());
    }
    if (!dataLines.length) return;
    let payload = null;
    try {
      payload = JSON.parse(dataLines.join('\n'));
    } catch (e) {
      return;
    }
    if (event === 'start' && onStart) onStart(payload);
    else if (event === 'delta' && onDelta && payload.text) onDelta(payload.text);
    else if (event === 'done') {
      final = payload;
      if (onDone) onDone(payload);
    } else if (event === 'error') {
      const err = new Error(payload.message || 'AI generation failed');
      err.code = payload.error || 'ai_error';
      streamError = err;
    }
  };

  try {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let index;
      while ((index = buffer.indexOf('\n\n')) >= 0) {
        const frame = buffer.slice(0, index);
        buffer = buffer.slice(index + 2);
        handleFrame(frame);
      }
    }
    if (buffer.trim()) handleFrame(buffer);
  } finally {
    try {
      reader.releaseLock();
    } catch (e) {
      /* ignore */
    }
  }

  if (streamError) throw streamError;
  if (!final) {
    const err = new Error('The AI stream ended unexpectedly');
    err.code = 'stream_incomplete';
    throw err;
  }
  return final;
}
