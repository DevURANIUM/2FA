# 🔐 2FA TOTP Generator for Cloudflare Workers

A modern, lightweight, and serverless **Time-based One-Time Password (TOTP)** generator built for **Cloudflare Workers**.

This project allows you to generate secure 6-digit authentication codes directly from your browser using a Base32 secret. Everything runs on Cloudflare's global edge network, providing extremely fast response times without requiring any backend server, VPS, or database.

🌐 **Live Demo:** [2Live.ir](https://2Live.ir)

---

## ✨ Features

- ⚡ Deploys in seconds on Cloudflare Workers
- 🌍 Runs on Cloudflare's global edge network
- 🔒 No database required
- 🚀 Fully serverless architecture
- 📱 Responsive and mobile-friendly interface
- 🔑 Supports Base32 encoded secrets
- ⏱️ Automatically refreshes every 30 seconds
- 🔐 RFC 6238 compliant TOTP generation
- 💻 Simple and clean source code
- 📦 Easy to modify and extend

---

# 📸 Preview

Visit the live demo below:

[2Live.ir](https://2Live.ir)

---

# 📖 About

This project was created for developers who need a simple and fast web-based TOTP generator without relying on external APIs or backend services.

Instead of installing desktop software or mobile applications, users can simply deploy this Worker to Cloudflare and instantly have a secure authentication code generator available from anywhere.

The generated codes are compatible with almost every authentication provider implementing the **RFC 6238** standard.

Supported services include:

- Google Authenticator
- Microsoft Authenticator
- Authy
- Aegis
- Bitwarden
- 2FAS
- And many more...

---

# 🚀 Getting Started

## Clone the repository

```bash
git clone https://github.com/DevURANIUM/2FA.git
```
---

## Install dependencies

```bash
npm install
```

---

## Login to Cloudflare

```bash
npx wrangler login
```

---

## Run locally

```bash
npm run dev
```

The Worker will start locally for development and testing.

---

## Deploy to Cloudflare

```bash
npm run deploy
```

After deployment, Wrangler will output your Worker URL.

---

# 📂 Project Structure

```
2FA/
│
├── public/
│   ├── index.html
│   └── static/
│       ├── app.js
│       └── style.css
│
├── src/
│   └── index.js
│
├── package.json
├── wrangler.jsonc
└── README.md
```

---

# 🔐 Security

This project is designed with simplicity and privacy in mind.

✔ No external API requests

✔ No user tracking

✔ No analytics

✔ No database

✔ No account required

✔ No authentication server

Your secret is processed directly by the Worker, keeping the architecture minimal and easy to audit.

> **Important:** Always deploy this project to a Cloudflare account that you control.

---

# ⚙️ Compatibility

Generated authentication codes are compatible with services implementing:

- RFC 6238
- HMAC-SHA1
- 30-second time window
- 6-digit OTP

---

# 🛠 Built With

- JavaScript (ES Modules)
- HTML5
- CSS3
- Cloudflare Workers
- Wrangler CLI

---

# 💡 Why Cloudflare Workers?

Using Cloudflare Workers provides several advantages:

- Extremely low latency
- Global edge deployment
- No server management
- Free tier available
- Automatic scaling
- High availability
- Excellent performance

---

# 🤝 Contributing

Pull requests are welcome.

If you have ideas for improvements, bug fixes, or new features, feel free to open an issue or submit a pull request.

---

# 📄 License

This project is licensed under the **MIT License**.

You are free to use, modify, distribute, and contribute to this project.

---
---

# 💛 Support the Project

If you find this project useful and would like to support its continued development, you can donate using any of the following cryptocurrencies.

Every contribution—no matter how small—helps cover development time, infrastructure costs, and future improvements.

| Network | Address |
|---------|---------|
| **Bitcoin (BTC)** | `bc1qcclcp574hnznm0nmdzzf0ta7366svjskttqks3` |
| **Litecoin (LTC)** | `ltc1qcrkelw38gjrmg0ptjy2nshqej622kp76het7q0` |
| **XRP** | `rPoK5SBChFPqEiQv1W97LW6FKoJZLipDVQ` |
| **Stellar (XLM)** | `GDMUQREEZNBSTQOT5BV7MYEMXJFV3CYRZXUVOYCTIUZTHUWPHLVASFVD` |
| **TON** | `UQAJH2N0pqpvC9YN841w5NH1dCN9Lakwkpjvoy7vXf-vfqgv` |
| **TRON (TRX)** | `TXJqhhwvkrTdnf5HReZf55hEzZuxjto3R4` |
| **USDT (BEP20)** | `0x1591036c4bD05b046532B65Df939fcd7824E18c7` |

> ☕️ Every contribution, no matter how small, helps keep this project alive and enables future updates, new features, and ongoing maintenance.

---

Made with ❤️ for the Cloudflare Workers community.
