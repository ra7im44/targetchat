/**
 * WebhookTracker — in-memory operational log for omnichannel webhooks.
 *
 * Stores sanitized, bounded event records for the Admin > Channels dashboard.
 * NEVER stores access tokens, app secrets, verify tokens, authorization
 * headers, or other credentials. All bodies pass through a redaction layer.
 */

const SENSITIVE_KEY_PATTERN = /(token|secret|password|authorization|verify|access_token|app_secret|client_secret|webhook_secret|api_key|apikey|session|jwt|bearer)/i;
const MAX_BODY_CHARS = 4000;

function redactValue(key, value) {
    if (value === null || value === undefined) return value;
    if (SENSITIVE_KEY_PATTERN.test(String(key))) return '[REDACTED]';
    if (typeof value === 'string') {
        // Redact Authorization-style headers even when the key is generic.
        if (/^bearer\s+/i.test(value) || /^basic\s+/i.test(value)) return '[REDACTED]';
        // Redact very long opaque credential-looking strings.
        if (value.length > 120 && !value.includes(' ') && !value.includes('@')) return '[REDACTED]';
        if (value.length > MAX_BODY_CHARS) return value.slice(0, MAX_BODY_CHARS) + '…[TRUNCATED]';
    }
    return value;
}

function sanitizeDeep(input, depth = 0) {
    if (depth > 6) return '[TRUNCATED]';
    if (Array.isArray(input)) {
        return input.slice(0, 50).map((v) => sanitizeDeep(v, depth + 1));
    }
    if (input && typeof input === 'object') {
        const out = {};
        for (const [k, v] of Object.entries(input).slice(0, 100)) {
            if (SENSITIVE_KEY_PATTERN.test(k)) {
                out[k] = '[REDACTED]';
            } else {
                out[k] = sanitizeDeep(redactValue(k, v), depth + 1);
            }
        }
        return out;
    }
    return input;
}

function extractMessageId(provider, body) {
    try {
        if (!body || typeof body !== 'object') return null;
        const entry = body.entry && body.entry[0];
        if (provider === 'whatsapp') {
            const msg = entry?.changes?.[0]?.value?.messages?.[0];
            if (msg?.id) return String(msg.id);
            const status = entry?.changes?.[0]?.value?.statuses?.[0];
            if (status?.id) return String(status.id);
        } else {
            const messaging = entry?.messaging?.[0];
            if (messaging?.message?.mid) return String(messaging.message.mid);
        }
    } catch (e) {
        return null;
    }
    return null;
}

function detectEventType(provider, body, fallback = 'message.received') {
    try {
        if (!body || typeof body !== 'object') return fallback;
        if (body.object === 'whatsapp_business_account') {
            const value = body.entry?.[0]?.changes?.[0]?.value;
            if (value?.messages) return 'message.received';
            if (value?.statuses) return 'message.status';
            return 'webhook.received';
        }
        if (body.object === 'page' || body.object === 'instagram') {
            const messaging = body.entry?.[0]?.messaging?.[0];
            if (messaging?.message) return 'message.received';
            if (messaging?.read) return 'message.read';
            if (messaging?.delivery) return 'message.delivered';
            return 'webhook.received';
        }
    } catch (e) {
        return fallback;
    }
    return fallback;
}

class WebhookTracker {
    constructor() {
        this.logs = [];
        this.maxLogs = 100;
        this.endpointStats = {
            meta: this._freshEndpointStat(),
            whatsapp: this._freshEndpointStat(),
            n8n: this._freshEndpointStat()
        };
    }

    _freshEndpointStat() {
        return {
            total: 0,
            failures: 0,
            lastRequestAt: null,
            lastSuccessAt: null,
            lastErrorAt: null,
            lastError: null,
            lastLatencyMs: null,
            lastHttpStatus: null,
            lastCheckAt: null,
            lastCheckOk: null,
            lastCheckLatencyMs: null,
            lastCheckHttpStatus: null,
            lastCheckError: null
        };
    }

    _normalizeProvider(provider) {
        const p = String(provider || '').toLowerCase();
        if (p === 'meta' || p === 'facebook' || p === 'instagram') return 'meta';
        if (p === 'whatsapp' || p === 'wa') return 'whatsapp';
        if (p === 'n8n' || p === 'system' || p === 'webhook') return 'n8n';
        return p || 'system';
    }

    _push(entry) {
        this.logs.unshift(entry);
        if (this.logs.length > this.maxLogs) {
            this.logs.length = this.maxLogs;
        }
    }

    _recordEndpoint(provider, { success, latencyMs, error, httpStatus }) {
        const key = this._normalizeProvider(provider);
        if (!this.endpointStats[key]) this.endpointStats[key] = this._freshEndpointStat();
        const stat = this.endpointStats[key];
        const now = new Date().toISOString();
        stat.total += 1;
        stat.lastRequestAt = now;
        stat.lastLatencyMs = typeof latencyMs === 'number' ? Math.round(latencyMs) : null;
        stat.lastHttpStatus = typeof httpStatus === 'number' ? httpStatus : null;
        if (success) {
            stat.lastSuccessAt = now;
        } else {
            stat.failures += 1;
            stat.lastErrorAt = now;
            stat.lastError = error ? String(error).slice(0, 300) : 'Webhook processing failed';
        }
    }

    /**
     * Record a structured event.
     * body is sanitized before storage; latency/error/httpStatus are operational only.
     * `platform` is kept as a backward-compatible alias of the raw provider
     * string (legacy consumers such as Admin > Developer Tools read it).
     */
    record({ provider = 'system', direction = 'inbound', eventType = 'webhook.received', status = 'success', httpStatus = null, latencyMs = null, messageId = null, error = null, body = null }) {
        const rawProvider = String(provider || 'system');
        const normalizedProvider = this._normalizeProvider(rawProvider);
        const entry = {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            timestamp: new Date().toISOString(),
            provider: normalizedProvider,
            platform: rawProvider,
            direction,
            eventType: String(eventType || 'webhook.received').slice(0, 80),
            status: status === 'failed' ? 'failed' : 'success',
            httpStatus: typeof httpStatus === 'number' ? httpStatus : null,
            latencyMs: typeof latencyMs === 'number' ? Math.round(latencyMs) : null,
            messageId: messageId ? String(messageId).slice(0, 120) : null,
            error: error ? String(error).slice(0, 300) : null,
            body: body ? sanitizeDeep(body) : null
        };
        this._push(entry);
        return entry;
    }

    /**
     * Backwards-compatible helper used by existing webhook routes:
     * tracker.log('meta', req.body)
     */
    log(platform, body) {
        const raw = String(platform || 'system');
        const normalized = this._normalizeProvider(raw);
        const messageId = extractMessageId(normalized, body);
        const eventType = detectEventType(normalized, body);
        return this.record({
            provider: raw,
            direction: 'inbound',
            eventType,
            status: 'success',
            httpStatus: 200,
            messageId,
            body
        });
    }

    logVerification(provider, ok, latencyMs = null) {
        return this.record({
            provider,
            direction: 'system',
            eventType: ok ? 'webhook.verified' : 'webhook.failed',
            status: ok ? 'success' : 'failed',
            httpStatus: ok ? 200 : 403,
            latencyMs,
            error: ok ? null : 'Verify token mismatch'
        });
    }

    logOutbound(provider, { eventType = 'message.sent', ok = true, latencyMs = null, error = null, messageId = null } = {}) {
        return this.record({
            provider,
            direction: 'outbound',
            eventType,
            status: ok ? 'success' : 'failed',
            latencyMs,
            messageId,
            error
        });
    }

    logFailure(provider, { eventType = 'webhook.failed', error = null, httpStatus = 500, latencyMs = null, body = null, direction = 'inbound' } = {}) {
        const entry = this.record({
            provider,
            direction,
            eventType,
            status: 'failed',
            httpStatus,
            latencyMs,
            error,
            body
        });
        return entry;
    }

    trackEndpoint(provider, info) {
        this._recordEndpoint(provider, info);
    }

    /**
     * Record a manual or loopback self-check ping without altering genuine
     * inbound traffic statistics (total, failures, lastRequestAt, lastSuccessAt, lastErrorAt).
     */
    trackSelfCheck(provider, { ok = true, latencyMs = null, httpStatus = null, error = null } = {}) {
        const key = this._normalizeProvider(provider);
        if (!this.endpointStats[key]) this.endpointStats[key] = this._freshEndpointStat();
        const stat = this.endpointStats[key];
        stat.lastCheckAt = new Date().toISOString();
        stat.lastCheckOk = Boolean(ok);
        stat.lastCheckLatencyMs = typeof latencyMs === 'number' ? Math.round(latencyMs) : null;
        stat.lastCheckHttpStatus = typeof httpStatus === 'number' ? httpStatus : null;
        stat.lastCheckError = error ? String(error).slice(0, 300) : null;
    }

    getEndpointStats() {
        // Return a deep copy so callers cannot mutate internal state.
        return JSON.parse(JSON.stringify(this.endpointStats));
    }

    getFailures24h() {
        const cutoff = Date.now() - 24 * 60 * 60 * 1000;
        return this.logs.filter((l) => l.status === 'failed' && new Date(l.timestamp).getTime() >= cutoff).length;
    }

    getLogs({ provider, status, direction, search, limit = 50 } = {}) {
        let out = this.logs;
        if (provider) out = out.filter((l) => l.provider === this._normalizeProvider(provider));
        if (status === 'success' || status === 'failed') out = out.filter((l) => l.status === status);
        if (direction === 'inbound' || direction === 'outbound' || direction === 'system') {
            out = out.filter((l) => l.direction === direction);
        }
        if (search && typeof search === 'string' && search.trim()) {
            const q = search.trim().toLowerCase();
            out = out.filter((l) => (
                (l.eventType || '').toLowerCase().includes(q) ||
                (l.messageId || '').toLowerCase().includes(q) ||
                (l.error || '').toLowerCase().includes(q) ||
                (l.provider || '').toLowerCase().includes(q)
            ));
        }
        const n = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 100);
        return out.slice(0, n);
    }

    clear() {
        this.logs = [];
    }
}

module.exports = new WebhookTracker();
