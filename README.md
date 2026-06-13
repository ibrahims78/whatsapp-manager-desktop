# WhatsApp Manager Desktop

A full-featured WhatsApp session manager as an Electron desktop app for Windows 10/11.

## Features

- **Multiple WhatsApp sessions** — manage many accounts simultaneously
- **QR code scanning** — connect accounts directly from the UI
- **Send all message types** — text, image, video, audio, file
- **Real-time updates** — Socket.IO pushes session status and incoming messages instantly
- **Webhook delivery** — forward incoming messages to any external URL with HMAC signature
- **User management** — admin/employee roles with JWT authentication
- **API keys** — programmatic access for external integrations (n8n, etc.)
- **Audit logs** — full history of all system operations
- **Dashboard** — stats overview and 7-day message chart
- **Dark/Light mode** — persists across restarts
- **Arabic/English UI** — toggle language at runtime

## Default Login

```
Username: admin
Password: 123456
```
**Change this immediately after first launch.**

---

## Building the .exe (Windows)

### Prerequisites

- Windows 10/11 x64
- Node.js 20 or newer: https://nodejs.org
- Git: https://git-scm.com

### Steps

```bash
# 1. Clone or copy this folder to your Windows machine
cd whatsapp-manager-desktop

# 2. Run the build script (handles everything automatically)
node build.js

# Result:
#   releases/WhatsApp Manager-win32-x64/WhatsApp Manager.exe
#   releases/WhatsApp-Manager-v1.0.0-win32-x64.zip
```

The build script will:
1. Install all npm dependencies
2. Build the React renderer (Vite)
3. Compile the Express server (TypeScript → CommonJS)
4. Compile the Electron main process
5. Download/copy Chromium for WhatsApp sessions
6. Package everything with `@electron/packager`
7. Create a ZIP for distribution

### First Launch

Double-click `WhatsApp Manager.exe`. A loading screen appears while the embedded server starts (3–10 seconds), then the login page opens.

The database (`wa-manager.db`) and WhatsApp tokens (`wa-tokens/`) are created **next to the .exe** — keep them backed up.

---

## Development Mode

Run the server and Vite dev server side-by-side:

```bash
npm install
# Terminal 1: start the Express server
npm run dev:server

# Terminal 2: start Vite + Electron
npm run dev
```

The UI is served by Vite on `http://127.0.0.1:5173` and proxied to the Express server on `:43210`.

---

## Project Structure

```
whatsapp-manager-desktop/
├── electron/
│   ├── main.ts          ← Electron main process (launches server, opens window)
│   └── preload.ts       ← IPC bridge (exposes safe APIs to renderer)
├── server/
│   ├── app.ts           ← Express app (Helmet, CORS, rate limit, middleware)
│   ├── index.ts         ← HTTP server + Socket.IO startup
│   ├── db/
│   │   ├── schema.ts    ← Drizzle ORM schema (SQLite)
│   │   ├── index.ts     ← SQLite connection (better-sqlite3)
│   │   └── migrate.ts   ← Auto-migrations + default admin seed
│   ├── lib/
│   │   ├── whatsapp-manager.ts  ← wppconnect sessions + Socket.IO events
│   │   ├── auth.ts      ← JWT sign/verify, API key hashing, middleware
│   │   ├── audit.ts     ← Audit log writer
│   │   ├── logger.ts    ← pino logger (file in production, pretty in dev)
│   │   └── rate-limit.ts ← express-rate-limit config
│   └── routes/
│       ├── auth.ts      ← POST /login, GET /me, POST /logout
│       ├── sessions.ts  ← CRUD + connect/disconnect/qr/messages/webhook
│       ├── send.ts      ← send/text|image|video|audio|file
│       ├── users.ts     ← Admin user management
│       ├── api-keys.ts  ← API key CRUD
│       ├── dashboard.ts ← Stats + 7-day chart
│       ├── audit-logs.ts ← Audit log reader (admin only)
│       ├── n8n-workflow.ts ← n8n integration proxy
│       └── health.ts    ← GET /healthz
├── renderer/
│   ├── index.html
│   └── src/
│       ├── App.tsx      ← wouter router + QueryClient
│       ├── pages/       ← Login, Dashboard, Sessions, Send, Users, ApiKeys, AuditLogs
│       ├── components/layout/  ← Sidebar + main layout
│       ├── store/       ← Zustand: auth (token+user) + ui (theme, lang)
│       ├── hooks/       ← useSocket (Socket.IO), useApi (React Query)
│       └── lib/         ← api.ts (fetch wrapper), i18n.ts (en/ar)
├── build/
│   └── icon.ico         ← Place your 256×256 icon here
├── resources/chromium/  ← Auto-populated by build.js
├── build.js             ← Main build script
├── vite.config.ts       ← Renderer build config
├── tailwind.config.js
├── tsconfig.server.json
├── tsconfig.electron.json
└── .env.example         ← Copy to .env and configure
```

---

## API Reference

All endpoints are under `http://127.0.0.1:43210/api/`.

**Authentication:** `Authorization: Bearer <token>` header or `session_token` cookie.  
**API Key auth:** `X-API-Key: wm_...` header.

| Method | Path | Description |
|--------|------|-------------|
| POST | /auth/login | Get JWT token |
| GET | /auth/me | Current user info |
| POST | /auth/logout | Clear session |
| GET | /sessions | List all sessions |
| POST | /sessions | Create session |
| GET | /sessions/:id | Session detail |
| DELETE | /sessions/:id | Delete session |
| POST | /sessions/:id/connect | Start QR flow |
| POST | /sessions/:id/disconnect | Disconnect |
| GET | /sessions/:id/qr | Current QR code |
| GET | /sessions/:id/messages | Message history |
| PATCH | /sessions/:id/webhook | Update webhook URL |
| POST | /sessions/:id/send/text | Send text |
| POST | /sessions/:id/send/image | Send image |
| POST | /sessions/:id/send/video | Send video |
| POST | /sessions/:id/send/audio | Send audio |
| POST | /sessions/:id/send/file | Send file |
| GET | /dashboard/stats | Stats + chart |
| GET | /users | List users (admin) |
| POST | /users | Create user (admin) |
| GET | /api-keys | My API keys |
| POST | /api-keys | Generate API key |
| DELETE | /api-keys/:id | Revoke API key |
| GET | /audit-logs | Audit log (admin) |
| GET | /healthz | Health check |

---

## WebSocket Events

Connect to `http://127.0.0.1:43210` with Socket.IO, passing `auth: { token }`.

| Event | Direction | Payload |
|-------|-----------|---------|
| `qr` | Server → Client | `{ sessionId, qr: "data:image/png;base64,..." }` |
| `session_status` | Server → Client | `{ sessionId, status, phoneNumber? }` |
| `message` | Server → Client | `{ sessionId, from, to, type, body, timestamp }` |

---

## Security Notes

1. **Change JWT_SECRET** — copy `.env.example` to `.env` and set a random 64-char hex string:
   ```
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
2. **Change admin password** immediately after first launch
3. **Backup `wa-manager.db`** regularly — it contains all session data and hashed passwords
4. **Backup `wa-tokens/`** — losing this folder means re-scanning all QR codes

---

*v1.0.0 — Built with Electron 28, Express 5, wppconnect, React 19, Tailwind CSS, Drizzle ORM (SQLite)*
