# TargetChat — Full Stack Chat Application

This repository contains a minimal, modular TargetChat implementation:
- Backend: Node.js + Express + Sequelize (MySQL/SQLite compatible)
- Frontend: Next.js + Tailwind CSS
- n8n workflow: `n8n/targetchat-workflow.json` (importable)
- DB schema: `db/schema.mysql.sql`

Goal: every user message is saved, forwarded to an n8n webhook, processed, and the reply returned to the frontend in real-time.

---

## Quick start (local)

Prereqs: Node.js 18+, npm, (optional) MySQL or use SQLite fallback.

1) Backend

Open a PowerShell terminal in `TargetChat/backend`:

```powershell
cd c:\laragon\www\TargetChat\backend
npm install
copy .env.example .env
# edit .env to set DB_DIALECT=mysql and your credentials, or leave sqlite defaults
npm run dev
```

By default the backend listens on `http://localhost:3001`.

2) Frontend

Open a new PowerShell terminal in `TargetChat/frontend`:

```powershell
cd c:\laragon\www\TargetChat\frontend
npm install
npm run dev
```

Visit `http://localhost:3000` — you'll be redirected to the login page.

3) n8n

Import `n8n/targetchat-workflow.json` into your n8n instance. Set the webhook path to `targetchat` or configure `N8N_WEBHOOK_URL` in the backend `.env` to point at your n8n webhook URL (e.g. `https://my-n8n.example.com/webhook/targetchat`).

---

## Endpoints

- POST `/api/auth/register` — body: `{ name, email, password }` — returns `{ token }`
- POST `/api/auth/login` — body: `{ email, password }` — returns `{ token }`
- GET `/api/auth/me` — header `Authorization: Bearer <token>` — returns `{ user }`
- POST `/api/chat/send` — header `Authorization: Bearer <token>` — body: `{ user_id, session_id, message }` — returns `{ reply }`

Notes: Backend uses JWT tokens. See `.env.example` for JWT secret and DB config.

---

## DB Schema

See `db/schema.mysql.sql` for MySQL schema. Backend uses Sequelize and will create tables automatically on first run if configured.

---

## n8n Integration

The backend forwards a POST to `N8N_WEBHOOK_URL` with JSON `{ user_id, message, session_id }`. n8n should reply with JSON `{ reply: '...' }` which the backend stores and returns to the frontend. Example workflow provided in `n8n/targetchat-workflow.json`.

---

## Multilingual

Frontend includes simple locale files at `frontend/public/locales/en.json` and `ar.json`. Language toggle available on the login page.

---

## Security best practices (recommended)

- Change the `JWT_SECRET` to a strong secret and do not commit it.
- Use HTTPS for both frontend and backend in production.
- Run n8n on a secure host and restrict its webhook access (use secret tokens or IP allowlist).
- Use rate-limiting and request validation (consider `express-rate-limit` and `celebrate`/`Joi`).
- Hash passwords with bcrypt (already implemented) and never log them.
- Use environment variables for credentials; avoid committing `.env`.
- Keep dependencies updated and monitor for vulnerabilities.

---

## Deployment notes

Shared hosting / VPS:
- Backend: run Node process using PM2 or systemd, ensure environment variables are set. Use a reverse proxy (nginx) for TLS termination.
- Frontend: build Next.js (`npm run build`) and run `next start`, or export static build using `next export` if no server-side rendering needed.
- Database: MySQL on the VPS or managed MySQL service. Configure `DB_HOST/DB_USER/DB_PASS` in `.env`.
- n8n: run as a separate service (docker-compose or process) and configure webhook URL.

Example nginx snippet for reverse proxy (simplified):

```nginx
server {
  listen 80;
  server_name targetchat.example.com;
  location /api/ {
    proxy_pass http://127.0.0.1:3001/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
  }
  location / {
    proxy_pass http://127.0.0.1:3000/;
  }
}
```

---

## Next steps I can take for you

- Add input validation, rate-limiting and CORS policies
- Add WebSocket/Socket.io for real-time push updates
- Add a production-ready Docker Compose with MySQL + backend + frontend + n8n

If you'd like, I can now:
- Finish polish (validation + small tests), or
- Add Docker files and a `docker-compose.yml` for local full-stack run.

Which would you prefer next?