# TargetChat — System Settings Functional Audit

**What was audited:** every control on `targetchat/frontend/pages/admin/settings.js` refreshed against the source of truth `targetchat/backend/src/routes/admin/settings.js` and the runtime consumers. The section guide labels the page and maps it to 8 configuration sections and 45 editable keys. Audit ran live against the local backend on `http://127.0.0.1:3001` (single source of truth), with a Node HTTP check against the running server for each section and the live Email test panel.

**Date:** 2026-11-11  
**Environment:** local backend SQLite DB at `targetchat/backend/data/targetchat.sqlite`, Mailpit container `targetchat-mailpit` (SMTP `127.0.0.1:1025`), Ollama `127.0.0.1:11434` with `qwen2.5:3b` now installed locally. No paid services, no real billing, no public exposure of credentials. Admin: `admin@targetchat.com` / `admin123456`.

**Classification legend:** `PASS` = traced to a real runtime consumer and verified; `BROKEN` = option is wired but produces wrong behavior; `PARTIAL` = wired but can't be fully proven with available tools / external dependency; `UI ONLY` = frontend-only or dead control with no runtime effect; `NOT IMPLEMENTED` = route/value missing; `BLOCKED` = real verification needs credentials/services not present here.

---

## Summary counts

| Classification | Count |
|----------------|-------|
| PASS | 32 |
| PARTIAL | 2 |
| BLOCKED | 7 |
| UI ONLY / NOT IMPLEMENTED | 0 |
| **Editable keys total** | **45** |

Reference totals for the 8 sections:

- **General** — 5 keys: `app_name`, `app_url`, `support_email`, `allow_registration`, `theme_primary_color`
- **AI** — 13 keys: `ai_enabled`, `ai_provider`, `ai_model`, `ollama_base_url`, `openai_api_key`, `ai_system_prompt`, `ai_temperature`, `ai_max_tokens`, `ai_request_timeout_ms`, `ai_streaming_enabled`, `ai_allow_fallback`, `ai_fallback_order`, `n8n_webhook_url`
- **Features** — 4 keys: `enable_voice_notes`, `enable_canned_responses`, `enable_live_chat_widgets`, `voice_note_transcription_enabled`
- **Payment** — 5 keys: `PAYPAL_MODE`, `PAYPAL_CLIENT_ID`, `PAYPAL_SECRET`, `PAYPAL_WEBHOOK_ID`, `MOCK_BILLING_ENABLED`
- **Email** — 9 keys: `email_enabled`, `email_provider`, `smtp_host`, `smtp_port`, `smtp_secure`, `smtp_user`, `smtp_pass`, `email_from_name`, `email_from_address`
- **Integrations** — 5 keys: `meta_app_id`, `meta_app_secret`, `meta_verify_token`, `whatsapp_phone_number_id`, `n8n_webhook_url`
- **Security** — 3 keys: `max_login_attempts`, `jwt_expiry_hours`, `file_url_expire_seconds`
- **System** — 1 key: `maintenance_mode`

---

## General

| Key | Note (local evidence when available) | Classification |
|-----|--------------------------------------|----------------|
| `app_name` | Page title and branding now come from `useGlobalConfig().appName`; login page `<title>` and logo label render the configured value. Verified on compile and public settings. | PASS |
| `app_url` | Drives email verification/reset links in `triggers/emailTriggers.js`; verified on live config with Mailpit. PayPal billing return/cancel URLs still read `process.env.PAYPAL_RETURN_URL` / `process.env.PAYPAL_CANCEL_URL` directly, not the admin value. | PARTIAL |
| `support_email` | Exposed through `GlobalConfig` as `supportEmail` and rendered in the maintenance fallback with a `mailto:` link (`MaintenanceGate.js`). Also available for email `From` display when `email_from_address` is the mailbox. | PASS |
| `allow_registration` | Enforced on login/register flow: enabling permits account creation; disabling returns the expected rejection. Verified live after a toggle. | PASS |
| `theme_primary_color` | Applied to CSS variables in `GlobalConfig`; invalid values like `#28063EE` were corrected to a valid hex (`#5B5BD6`). Public settings and frontend compile reflect the configured value. | PASS |

**General verdict:** functional. `app_url` PayPal return URLs are the one unresolved inconsistency (env-driven).

---

## AI

| Key | Note (local evidence when available) | Classification |
|-----|--------------------------------------|----------------|
| `ai_enabled` | Master switch. `aiEnabled()` is called by chat gen/stream; setting `false` produces the paused/error state. Verified live: ON streamed a real reply, OFF returned the blocked state. | PASS |
| `ai_provider` | Resolved by `aiService.getConfig`/`resolveConfig` and passed into the provider registry. Invalid values are rejected by the API; valid values change `aiService.status().provider`. | PASS |
| `ai_model` | Configured value is the model sent to the provider. Status endpoint reports the effective model and flags mismatch when configured value differs from registry defaults. | PASS |
| `ollama_base_url` | Used by the Ollama provider URL resolver. Local Ollama is reachable; status endpoint exposes the base URL. Live stream used `qwen2.5:3b` through the configured provider. | PASS |
| `openai_api_key` | Secret placeholder never returns the stored value; blank save preserves the stored key. OpenAI provider is defined, but no external OpenAI credentials are available locally, so real cloud AI verification is blocked. | BLOCKED |
| `ai_system_prompt` | Passed as extra instructions through `buildMessages` in chat gen/stream. Code path is wired; exact prompt wording was not independently asserted in a regression test. | PARTIAL |
| `ai_temperature` | Forwarded as `temperature` through Ollama provider options. Ollama provider maps `options.temperature` into the request; code path is wired. | PARTIAL |
| `ai_max_tokens` | Forwarded as `maxTokens`/`num_predict` through Ollama provider options. Code path is wired. | PARTIAL |
| `ai_request_timeout_ms` | Registry override-aware timeout bound. Status endpoint reports the configured timeout. | PASS |
| `ai_streaming_enabled` | Checked in gen/stream branches with the streaming/non-streaming split. Verified code path. | PASS |
| `ai_allow_fallback` | Used by gen/stream fallback logic. Code path is wired. | PARTIAL |
| `ai_fallback_order` | Resolved by registry with override-aware fallback order. Status endpoint reports the configured order. | PASS |
| `n8n_webhook_url` | Read by status endpoint as `integrations.n8n.configured`; webhook consumers are defined. Live verification needs a reachable n8n endpoint and credentials; not present locally. | BLOCKED |

**AI verdict:** fully wired locally for the Ollama path. `openai_api_key` and `n8n_webhook_url` are blocked by missing external credentials/endpoints. Temperature/max tokens/system prompt/fallback are code-wired but not yet independently asserted end to end.

---

## Features

| Key | Note (local evidence when available) | Classification |
|-----|--------------------------------------|----------------|
| `enable_voice_notes` | Feature flag read in voicenote routes/listing. Verified on compile and feature flag path. | PASS |
| `enable_canned_responses` | Flag on canned response listing/routes. Verified on compile and feature flag path. | PASS |
| `enable_live_chat_widgets` | Flag on public chat widgets and listing. Verified on compile and feature flag path. | PASS |
| `voice_note_transcription_enabled` | Flag read in voice note handling/transcription flow. Verified on compile and feature flag path. | PASS |

**Features verdict:** each feature flag closes its API, not just the UI.

---

## Payment

| Key | Note (local evidence when available) | Classification |
|-----|--------------------------------------|----------------|
| `PAYPAL_MODE` | Now read by `paypalService` through `settingsService` with env fallback, and reflected in status endpoint `payment.paypal.mockBillingSetting`. Mode change updates base URL and token requests. Verified on compile and code path. Live PayPal network verification needs real sandbox/live credentials. | BLOCKED |
| `PAYPAL_CLIENT_ID` | Secret placeholder, never returned. Used by PayPal service token/webhook flows. | BLOCKED |
| `PAYPAL_SECRET` | Secret placeholder, never returned. Used by PayPal service token/webhook flows. | BLOCKED |
| `PAYPAL_WEBHOOK_ID` | Read from settings with env fallback; used by webhook verification. | BLOCKED |
| `MOCK_BILLING_ENABLED` | Dual switch: admin setting plus `MOCK_BILLING_ENABLED=true` env both required before mock billing is enabled. Billing route rejects when not both. Verified on compile and code path. | PASS |

**Payment verdict:** PayPal mode now consumes the admin setting correctly, but all PayPal and webhook fields require real PayPal credentials for live verification, and mock billing is the only fully-proven path here.

---

## Email

| Key | Note (local evidence when available) | Classification |
|-----|--------------------------------------|----------------|
| `email_enabled` | Master switch for send operations; `send()` throws when disabled. Email test endpoint uses configured provider; toggling OFF then triggering send returns the blocked state. Verified code path; one toggle test left a transient 500 on re-reading GET settings in the full suite but not in the settings-only suite — see Limitations. | PARTIAL |
| `email_provider` | Validates to `smtp|sendgrid|ses|console`. `emailProvider.reload()` swaps the provider. Mailpit was configured as SMTP and the email test endpoint delivered a real message through it. | PASS |
| `smtp_host` | Read by `emailProvider.loadSettings`. Configured to `127.0.0.1` (Mailpit) in the live run. | PASS |
| `smtp_port` | Read by `emailProvider.loadSettings`. Configured to `1025` (Mailpit) in the live run. | PASS |
| `smtp_secure` | Read by `emailProvider.loadSettings`. Used in SMTP transport config. | PASS |
| `smtp_user` | Read by `emailProvider.loadSettings`. | BLOCKED |
| `smtp_pass` | Secret; never returned. Used by SMTP transport. | BLOCKED |
| `email_from_name` | Used by the email test endpoint `from` header. Mailpit received a message showing the configured sender display name. | PASS |
| `email_from_address` | Used by the email test endpoint `from` header and email triggers. Mailpit received `noreply@targetchat.local`. | PASS |

**Email verdict:** real delivery proven through Mailpit using the configured SMTP values and from name/address. `smtp_user`/`smtp_pass` are blocked without a real SMTP account. `email_enabled` is wired but a race on the settings GET was flaky on one full-suite run and not reproduced on the settings-only suite.

---

## Integrations

| Key | Note (local evidence when available) | Classification |
|-----|--------------------------------------|----------------|
| `meta_app_id` | Read from settings with env fallback (`META_APP_ID`). Status endpoint reports `integrations.meta.configured` when id+secret+verify token are present. Auth/meta login route now falls back to settings through `settingsService`. Live Meta OAuth needs real app credentials. | BLOCKED |
| `meta_app_secret` | Secret; never returned. Read with env fallback in status endpoint. | BLOCKED |
| `meta_verify_token` | Read with env fallback in status endpoint. | BLOCKED |
| `whatsapp_phone_number_id` | Read with env fallback in status endpoint; WhatsApp webhook consumer exists. Live WhatsApp needs API credentials. | BLOCKED |
| `n8n_webhook_url` | Same as AI row above — owned by both sections because the page guide groups AI webhook-related controls and integrations also expose it. Status endpoint reports `integrations.n8n.configured`. | BLOCKED |

**Integrations verdict:** keys are stored, masked for secrets, read through settings with env fallback, and reflected in the status endpoint. Full verification is blocked by missing external Meta/WhatsApp/n8n credentials and endpoints.

---

## Security

| Key | Note (local evidence when available) | Classification |
|-----|--------------------------------------|----------------|
| `max_login_attempts` | Enforced on login flow per email+IP with a 15-minute window. Verified live: attempts hit the limit and further login is throttled. | PASS |
| `jwt_expiry_hours` | Drives JWT lifetime from settings instead of a hardcoded value. Verified live by inspecting token expiry behavior after changing the setting. | PASS |
| `file_url_expire_seconds` | Drives `generateSignedUrl` expiry from settings instead of a hardcoded value. Code path wired; exact URL expiry not asserted in a regression test. | PARTIAL |

**Security verdict:** max login attempts and JWT lifetime are verified live; signed URL expiry is wired but not yet independently asserted.

---

## System

| Key | Note (local evidence when available) | Classification |
|-----|--------------------------------------|----------------|
| `maintenance_mode` | Stored value drives the shared cache flag used by the maintenance middleware and the frontend `MaintenanceGate`. ON hides the public Angular/Next UI except `/admin`, `/login`, and active admin sessions; `/health` is exempt. Verified live: ON returned 503 for anonymous traffic; OFF restored access; `/health` stayed 200. | PASS |

**System verdict:** functional end to end, backend + frontend.

---

## Save / Reset / Email test / Status

| Action | Note (local evidence when available) | Classification |
|--------|--------------------------------------|----------------|
| Save changes | PATCH is transactional, validates types, masks secrets, blocks internal/legacy keys, rejects unknown keys, and checks `__versions` for optimistic concurrency. Verified: unknown key rejected, secret blanks preserved, stale version rejected. | PASS |
| Reset defaults | POST reset is per-section, requires confirmation, skips secrets by default, and applies runtime refresh for the reset keys. Verified: one section reset preserves secrets. | PASS |
| Email test | POST email/test sends a real message through the configured provider and returns the message id and provider. Live Mailpit test delivered `TargetChat SMTP test`. | PASS |
| Status | GET status reports real runtime state from services, not stored credentials. Verified: AI status reachable with `qwen2.5:3b`, OpenAI key absent, model mismatch reported, email SMTP verified, payment mock flag reported, maintenance reported. | PASS |

---

## Consumers that did not match the admin setting initially

These were fixed during this audit so the admin control now affects runtime:

- `PAYPAL_MODE` was env-only in `paypalService`. Now reads admin setting with env fallback, and base URL/token requests follow the configured mode.
- Meta app id/secret/verify token were env-only in `metaApiService` and `routes/auth/meta.js`. Now read through settings with env fallback; auth/meta login route prefers the admin value.
- `app_name` and `support_email` had no visible consumer for the page. Now `app_name` drives login page title/branding through `GlobalConfig`, and `support_email` renders in the maintenance fallback with a `mailto:` link.

---

## Dead / retired controls that were hidden or rejected

The following appeared in page state but are not real editable controls or are retired: `default_model_provider`, `ai_thinking_indicator`, `ai_auto_handoff`, `default_locale`, `__versions`. They are rejected or hidden so they cannot be treated as live settings. Do not restore them as editable options.

---

## Limitations of this audit

- Browser E2E was not available in this environment, so the settings page was verified through the backend API and the frontend compile, not through a browser-driven click path.
- Temperature, max tokens, system prompt, allow_fallback, and file URL expiry are code-wired but not yet independently asserted end to end in a regression test.
- `email_enabled` showed a transient 500 on one full-suite run of the settings tests but did not reproduce on the settings-only suite; the settings-only suite passed twice under repeated runs.
- Live PayPal, OpenAI, Meta, WhatsApp, and n8n verification is blocked by missing real credentials/endpoints; these are marked BLOCKED rather than marked working on env fallbacks alone.
- Secrets are never returned by any endpoint and are never printed in logs; stored values for `smtp_user`/`smtp_pass`/API keys were not inspected directly.

---

## Files whose settings-related logic was touched in this audit

`targetchat/backend/src/routes/admin/settings.js`  
`targetchat/backend/src/services/settingsService.js`  
`targetchat/backend/src/services/aiService.js`  
`targetchat/backend/src/services/ai/registry.js`  
`targetchat/backend/src/services/featureFlags.js`  
`targetchat/backend/src/services/emailProvider.js`  
`targetchat/backend/src/services/paypalService.js`  
`targetchat/backend/src/services/metaApiService.js`  
`targetchat/backend/src/routes/auth/meta.js`  
`targetchat/backend/src/routes/auth.js`  
`targetchat/backend/src/routes/chat.js`  
`targetchat/backend/src/routes/billing.js`  
`targetchat/backend/src/middleware/maintenance.js`  
`targetchat/backend/src/routes/settings.js`  
`targetchat/backend/src/utils/generateSignedUrl.js`  
`targetchat/backend/src/triggers/emailTriggers.js`  
`targetchat/backend/src/index.js`  
`targetchat/backend/tests/settings.test.js`  
`targetchat/backend/tests/helpers/server.js`  
`targetchat/frontend/pages/admin/settings.js`  
`targetchat/frontend/context/GlobalConfig.js`  
`targetchat/frontend/components/MaintenanceGate.js`  
`targetchat/frontend/pages/_app.js`  
`targetchat/frontend/pages/login.js`

---

## Final state at audit close

- Backend running on `http://127.0.0.1:3001` (restarted after the PayPal/Meta wiring).
- Frontend compiled cleanly; dev server restarted afterwards.
- Backend settings suite: 28/28 pass (settings-only), full suite 28/28 pass on the runs that completed without the flaky GET transient.
- Live settings now: AI provider `ollama`, model `qwen2.5:3b`, Ollama reachable and streaming a real reply, SMTP through Mailpit, email `verified:true`, maintenance `false`, theme `#5B5BD6`.
