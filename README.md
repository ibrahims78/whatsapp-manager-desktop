<div align="center">

  <img src="https://img.shields.io/badge/WhatsApp-Manager-25d366?style=for-the-badge&logo=whatsapp&logoColor=white" alt="WhatsApp Manager" />

  # 📱 WhatsApp Manager Desktop

  **A powerful multi-session WhatsApp automation desktop application for Windows**

  [![Release](https://img.shields.io/github/v/release/ibrahims78/whatsapp-manager-desktop?style=flat-square&logo=github&color=25d366)](https://github.com/ibrahims78/whatsapp-manager-desktop/releases/latest)
  [![Downloads](https://img.shields.io/github/downloads/ibrahims78/whatsapp-manager-desktop/total?style=flat-square&logo=github&color=blue)](https://github.com/ibrahims78/whatsapp-manager-desktop/releases)
  [![Platform](https://img.shields.io/badge/platform-Windows%2010%2F11-0078D4?style=flat-square&logo=windows)](https://github.com/ibrahims78/whatsapp-manager-desktop/releases/latest)
  [![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)](LICENSE)
  [![Node](https://img.shields.io/badge/Node.js-20+-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org)
  [![Electron](https://img.shields.io/badge/Electron-28-47848F?style=flat-square&logo=electron&logoColor=white)](https://www.electronjs.org)

  ---

  ### 🔽 [Download Latest Release →](https://github.com/ibrahims78/whatsapp-manager-desktop/releases/latest)

  </div>

  ---

  ## ✨ Features

  | Feature | Description |
  |--------|-------------|
  | 📱 **Multi-Session** | Connect and manage multiple WhatsApp numbers simultaneously |
  | 📤 **Rich Messaging** | Send text, images, videos, audio, and documents |
  | 📊 **Analytics Dashboard** | Real-time message statistics and charts |
  | 🔑 **API Key Management** | Full REST API for integration with n8n, Zapier, Make, etc. |
  | 👥 **User Management** | Multi-user with role-based access control |
  | 📋 **Audit Logs** | Complete activity history for accountability |
  | 🌐 **REST API** | Automate message sending from any external system |
  | 🗄️ **Local Database** | SQLite — no cloud, no subscriptions, data stays on your machine |
  | 🔒 **Secure** | JWT authentication, rate limiting, bcrypt passwords |

  ---

  ## 📦 Installation

  ### Option 1: Download Pre-built (Recommended)

  1. Go to [**Releases**](https://github.com/ibrahims78/whatsapp-manager-desktop/releases/latest)
  2. Download `WhatsApp-Manager-v1.0.0-win32-x64.zip`
  3. Extract the ZIP anywhere on your PC
  4. Double-click **`WhatsApp Manager.exe`**
  5. No installation required — **fully portable!**

  ### Option 2: Build from Source

  ```bash
  # Clone the repository
  git clone https://github.com/ibrahims78/whatsapp-manager-desktop.git
  cd whatsapp-manager-desktop

  # Install dependencies
  npm install

  # Build all (server + renderer + electron)
  npm run build

  # Run in development
  npm run dev
  ```

  ---

  ## 🔐 Default Login

  | Field    | Value    |
  |----------|----------|
  | Username | `admin`  |
  | Password | `123456` |

  > ⚠️ **Change your password immediately after first login!**

  ---

  ## 🌐 REST API

  Once running, the API is available at `http://localhost:43210/api`

  ### Authentication
  ```bash
  # Login and get token
  curl -X POST http://localhost:43210/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"username":"admin","password":"123456"}'
  ```

  ### Send a Message
  ```bash
  curl -X POST http://localhost:43210/api/send/text \
    -H "Authorization: Bearer YOUR_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
      "sessionId": "my-session",
      "to": "966501234567",
      "message": "Hello from WhatsApp Manager! 👋"
    }'
  ```

  ### Using API Key (for integrations)
  ```bash
  curl -X POST http://localhost:43210/api/send/text \
    -H "X-API-Key: YOUR_API_KEY" \
    -H "Content-Type: application/json" \
    -d '{"sessionId":"my-session","to":"966501234567","message":"Hello!"}'
  ```

  ---

  ## 🏗️ Architecture

  ```
  whatsapp-manager-desktop/
  ├── electron/          # Electron main process & preload
  ├── renderer/          # React 19 + Vite 6 frontend
  │   └── src/
  │       ├── pages/     # Dashboard, Sessions, Send, Users...
  │       ├── store/     # Zustand state management
  │       └── lib/       # API client, i18n
  ├── server/            # Express 5 backend
  │   ├── db/            # Drizzle ORM + SQLite schema
  │   ├── lib/           # WhatsApp manager, auth, audit
  │   └── routes/        # REST API endpoints
  └── releases/          # Built distributable packages
  ```

  ---

  ## 🛠️ Tech Stack

  | Layer | Technology |
  |-------|-----------|
  | Desktop | Electron 28 |
  | Frontend | React 19, Vite 6, Tailwind CSS 3 |
  | State | Zustand, React Query |
  | Backend | Express 5, Node.js 20+ |
  | WhatsApp | @whiskeysockets/baileys |
  | Database | SQLite (sql.js), Drizzle ORM |
  | Auth | JWT, bcrypt |
  | Realtime | Socket.IO 4 |

  ---

  ## 🤝 Contributing

  Contributions are welcome! Please read our [contributing guidelines](.github/ISSUE_TEMPLATE/bug_report.md).

  1. Fork the repository
  2. Create your feature branch: `git checkout -b feature/amazing-feature`
  3. Commit your changes: `git commit -m 'Add amazing feature'`
  4. Push to the branch: `git push origin feature/amazing-feature`
  5. Open a Pull Request

  ---

  ## 📄 License

  This project is licensed under the MIT License.

  ---

  <div align="center">

  Made with ❤️ using Electron + React + Baileys

  ⭐ **If you find this useful, please star the repository!** ⭐

  </div>
  