# TargetChat — AI-Powered Multi-Workflow Communication Platform

**TargetChat** is an enterprise-ready, real-time AI customer engagement and chat platform. It combines customizable AI workflows, unified omni-channel inboxes (Facebook, Instagram, WhatsApp), embeddable web chat widgets, PayPal subscription management, and automation pipelines orchestrated through **n8n**.

---

## 🏛️ System Architecture

- **Frontend:** Next.js 13 (Pages Router), React 18, Tailwind CSS, Lucide Icons, Socket.io-client.
- **Backend:** Node.js, Express.js, Socket.io, Sequelize ORM.
- **Database:** SQLite (local development default via `sqlite3`) / MySQL or MariaDB (production).
- **AI Engine:** Self-hosted **n8n** automation instance running LangChain agent workflows (`https://n8n.u-axis.com/webhook/targetchatv1123123234fe`).
- **Real-Time:** Socket.io with scoped session rooms, live typing indicators, and AI thinking states.

---

## 🚀 Quick Start (Local Development)

### Prerequisites:
- Node.js 18+ or 20+
- npm 9+

### 1. Backend Setup (Port 3001)
```bash
cd backend
cp .env.example .env
# Default .env uses DB_DIALECT=sqlite and DB_STORAGE=./data/targetchat.sqlite
node src/index.js
```
The backend API starts on `http://localhost:3001`.

### 2. Frontend Setup (Port 3000)
```bash
cd frontend
npm run dev
```
The web application starts on `http://localhost:3000`.

### 3. Default Credentials
- **Admin Email:** `admin@targetchat.com`
- **Admin Password:** `admin123456`

---

## 🛡️ Key Security Hardening & Architecture

- **Centralized Secrets (`src/config/secrets.js`):** Validates required secrets on startup. In production, missing secrets trigger immediate fail-closed shutdown.
- **IDOR Protection:** All personal chats (`/api/chat/*`) and unified inboxes (`/api/inbox/*`) strictly verify ownership between users, assignees, channels, and admin roles.
- **HMAC Signed URLs & Upload Ownership:** Media attachments require cryptographically signed URLs with user ID binding. Uploaded media creates immutable ownership records in the `Setting` table.
- **Guest Session Security:** Website visitors obtain server-signed `sessionToken` credentials. Guest sockets are strictly confined to `widget_${widget.id}_session_${sessionId}` rooms with domain origin matching.
- **Cluster-Safe OAuth & Anti-Replay:** Meta OAuth flow utilizes stateless 5-minute JWT tokens with unique `jti` transaction nonces recorded in the database to prevent replay attacks.
- **Rate Limiting:** Protects `/api/upload` (30 uploads / 15 min) and `/api/chat/send` (60 messages / min).

---

## 📋 API Route Summary

### Authentication & Profiles
- `POST /api/auth/register` — Register a new account.
- `POST /api/auth/login` — Authenticate and receive JWT token.
- `GET /api/auth/me` — Get current authenticated user profile.
- `POST /api/auth/meta/prepare` — Prepare cluster-safe Meta OAuth state.

### Chats, Inbox & AI
- `GET /api/chat` — List user's conversations.
- `POST /api/chat/send` — Send message and dispatch to n8n AI webhook with context history.
- `GET /api/chat/:id/messages` — Fetch message history with signed URLs.
- `GET /api/inbox/search?q=` — Full-text search across conversations and messages.
- `PUT /api/inbox/chats/:id/tags` — Update conversation tags.
- `GET /api/inbox/chats/:id/export` — Export conversation transcript (JSON / CSV).
- `GET /api/canned-responses` — Retrieve team quick response templates and shortcuts.

### Widgets & Channels
- `GET /api/widgets` — List user-owned widgets.
- `POST /api/widgets` — Create new embeddable widget.
- `DELETE /api/widgets/:id` — Delete widget and related configurations.
- `GET /widget/public/:slug/loader.js` — Standalone one-line embed loader script.
- `GET /api/channels` — List connected social media channels (Facebook, Instagram, WhatsApp).

### Billing & Payments
- `GET /api/billing/plans` — List subscription plans and quotas.
- `POST /api/billing/mock-activate` — Instant tier upgrade for testing (Free, Pro, Enterprise).
- `POST /api/billing/paypal/*` — PayPal subscription management.
- `POST /api/webhooks/paypal` — Secure PayPal webhook signature validation.

### System Administration & Health
- `GET /health` & `GET /api/health` — System status, uptime, memory, database health.
- `GET /api/admin/settings` — Grouped system settings (auto-seeds 35 default settings if empty).
- `PATCH /api/admin/settings` — Bulk update system configuration with cache invalidation.
- `POST /api/admin/settings/seed-defaults` — Re-seed or reset standard platform settings.

---

## 📄 Documentation Links

- Detailed Architecture & Agent Guide: [`AGENTS.md`](./AGENTS.md)
- Production Deployment Guide: [`.u-axis-docs/DEPLOYMENT.md`](../.u-axis-docs/DEPLOYMENT.md)
- Daily Implementation Log: [`../daily_changes.md`](../daily_changes.md)

---

## Local development (verified on this machine)

### 1. AI backend — Ollama

TargetChat talks to a **real local model**; no paid API key is needed.

```bash
ollama serve            # http://127.0.0.1:11434
ollama list             # see installed models
```

`backend/.env`:

```env
AI_PROVIDER=ollama
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=qwen2.5:3b
AI_STREAMING_ENABLED=true
AI_REQUEST_TIMEOUT_MS=120000
AI_ALLOW_FALLBACK=false
```

The configured model is a *preference*. If it is not installed, the closest
installed Qwen build is selected and the mismatch is reported by
`GET /api/ai/status` (`model` vs `requestedModel`). Canned replies are disabled
unless `AI_ALLOW_FALLBACK=true`, and any such reply is tagged `fallback: true`.

### 2. Backend (Express, port 3001)

```bash
cd backend
npm install
npm run db:migrate      # additive only: creates missing tables/indexes
npm run dev             # or: node src/index.js
```

Health: `curl http://localhost:3001/health`

### 3. Frontend (Next.js, port 3000)

```bash
cd frontend
cp .env.example .env.local     # NEXT_PUBLIC_API_URL=http://localhost:3001
npm install
npm run dev
```

### 4. Tests

```bash
cd backend
npm test        # 14 tests: auth, isolation, billing gate, KB, live Ollama
npm run db:drift
```

The live tests skip (not pass) when Ollama is unreachable.

### 5. Docker (optional)

```bash
cp .env.example .env           # replace every placeholder
docker compose up --build
```

Ollama stays on the host; the backend reaches it through
`host.docker.internal` (`extra_hosts: host-gateway`). By default Ollama binds
127.0.0.1 only, which a container cannot reach — start it on an address the
docker bridge can reach:

```bash
# docker0 gateway (reachable from containers, not from the LAN)
OLLAMA_HOST=172.17.0.1:11434 ollama serve
# or, accepting LAN exposure:
OLLAMA_HOST=0.0.0.0:11434 ollama serve
```

> **Verified limitation on this host:** the backend container could not reach
> Ollama on the default bridge gateway (`172.17.0.1`) or the Compose gateway
> (`172.20.0.1`) — the host firewall drops bridge → host traffic. Two supported
> fixes, neither applied here:
> 1. Allow TCP `11434` from the docker bridge in the host firewall, or
> 2. run the backend with `network_mode: host` (Linux) and use
>    `OLLAMA_BASE_URL=http://127.0.0.1:11434`.
>
> Host-based local development (`npm run dev` + Ollama on 127.0.0.1) is
> unaffected and fully verified.

For local mail capture:

```bash
docker compose --profile email up mailpit   # UI on :8025
```

### 6. Knowledge base (RAG)

`POST /api/knowledge/documents` (multipart) indexes text-like files per
workspace. Set `AI_EMBED_MODEL=nomic-embed-text` **after** pulling that model to
use vector retrieval; without it, retrieval uses deterministic lexical ranking.
Chat models such as `qwen2.5:3b` are never used as embedding models.
