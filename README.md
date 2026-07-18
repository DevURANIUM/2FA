# 🔐 2FA TOTP Generator for Cloudflare Workers

A lightweight and fast **Time-based One-Time Password (TOTP)** generator running entirely on **Cloudflare Workers**.

Generate standard 6-digit authentication codes (RFC 6238 compatible) directly from your browser without any backend server.

---

## ✨ Features

- ⚡ Runs entirely on Cloudflare Workers
- 🔒 No database required
- 🌍 Accessible from anywhere
- 📱 Responsive web interface
- 🔑 Supports Base32 secrets
- ⏱️ 30-second rotating TOTP codes
- 🛡️ Compatible with Google Authenticator, Authy, Microsoft Authenticator, Aegis, and other RFC 6238 apps

---

## 📂 Project Structure

```
cf-worker/
├── public/
│   ├── index.html
│   └── static/
│       ├── app.js
│       └── style.css
├── src/
│   └── index.js
├── package.json
├── wrangler.jsonc
└── README.md
```

---

## 🚀 Deployment

### 1. Clone the repository

```bash
git clone https://github.com/USERNAME/REPOSITORY.git
cd REPOSITORY/cf-worker
```

### 2. Install dependencies

```bash
npm install
```

### 3. Login to Cloudflare

```bash
npx wrangler login
```

### 4. Start locally

```bash
npm run dev
```

### 5. Deploy

```bash
npm run deploy
```

---

## 📖 Usage

1. Open the deployed Worker URL.
2. Enter your Base32 Secret.
3. The current 6-digit TOTP code will be generated.
4. A new code is automatically generated every 30 seconds.

---

## 🔒 Security

- Secrets are processed locally inside the Worker.
- No database storage.
- No analytics.
- No external API calls.
- Fully serverless.

> **Important:** Only deploy this project on Cloudflare Workers that you control.

---

## 🛠️ Technologies

- JavaScript (ES Modules)
- Cloudflare Workers
- Wrangler

---

## 📜 TOTP Standard

This implementation follows:

- RFC 6238 (Time-based One-Time Password)
- HMAC-SHA1
- 30-second time period
- 6-digit authentication codes

---

## 📄 License

MIT License

Feel free to fork, modify, and contribute.

---

## ⭐ Support

If you found this project useful, please consider giving it a ⭐ on GitHub!
