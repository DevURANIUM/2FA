// Authenticator: a TOTP page. Codes are computed locally with
// Web Crypto (RFC 6238, HMAC-SHA1, 6 digits, 30s), so secrets never leave
// the browser.

const PERIOD = 30;
const DIGITS = 6;
const MAX_ITEMS = 10;
const WARN_SECONDS = 5;
const STORAGE_KEY = "totp-vault-v2";
const LEGACY_KEY = "totp-history-v1";
const BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const MINI_LENGTH = 2 * Math.PI * 9;

const $ = (selector) => document.querySelector(selector);
const stage = $("#stage");
const tiles = $("#tiles");
const tileEls = [...tiles.querySelectorAll(".tile")];
const bar = $("#bar");
const curLabel = $("#curLabel");
const curSecret = $("#curSecret");
const curSecs = $("#curSecs");
const cmd = $("#cmd");
const input = $("#secret");
const cards = $("#cards");
const count = $("#count");
const clearAll = $("#clearAll");
const toast = $("#toast");

const keyCache = new Map();
const codes = new Map();
let items = load();
let activeId = items[0]?.id || null;
let lastCounter = -1;
let toastTimer = null;
let copiedTimer = null;

/* ---------- Storage ---------- */

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (Array.isArray(saved)) return saved.filter((item) => item && item.secret).slice(0, MAX_ITEMS);
    const legacy = JSON.parse(localStorage.getItem(LEGACY_KEY) || "[]");
    if (Array.isArray(legacy)) {
      return legacy
        .map((item) => normalize(item?.secret || ""))
        .filter(isValidSecret)
        .map((secret) => ({ id: uid(), secret, label: "" }));
    }
  } catch { /* Corrupt or blocked storage: start fresh. */ }
  return [];
}

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch { /* Storage may be disabled; keep items for this page load. */ }
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

/* ---------- TOTP ---------- */

function normalize(value) {
  const upper = value.toUpperCase().replace(/=/g, "");
  const match = upper.match(/[A-Z2-7]{8,}/);
  if (match) return match[0];
  return upper.replace(/\s+/g, "");
}

function isValidSecret(secret) {
  return secret.length >= 8 && [...secret].every((char) => BASE32.includes(char));
}

function base32ToBytes(secret) {
  let bits = "";
  for (const char of secret) bits += BASE32.indexOf(char).toString(2).padStart(5, "0");
  const bytes = new Uint8Array(Math.floor(bits.length / 8));
  for (let i = 0; i < bytes.length; i += 1) bytes[i] = parseInt(bits.slice(i * 8, i * 8 + 8), 2);
  return bytes;
}

async function getKey(secret) {
  if (!keyCache.has(secret)) {
    keyCache.set(secret, crypto.subtle.importKey(
      "raw", base32ToBytes(secret), { name: "HMAC", hash: "SHA-1" }, false, ["sign"],
    ));
  }
  return keyCache.get(secret);
}

async function totp(secret, counter) {
  const message = new ArrayBuffer(8);
  const view = new DataView(message);
  view.setUint32(0, Math.floor(counter / 0x100000000));
  view.setUint32(4, counter >>> 0);

  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", await getKey(secret), message));
  const offset = sig[sig.length - 1] & 0x0f;
  const binary =
    ((sig[offset] & 0x7f) << 24) |
    ((sig[offset + 1] & 0xff) << 16) |
    ((sig[offset + 2] & 0xff) << 8) |
    (sig[offset + 3] & 0xff);
  return String(binary % 10 ** DIGITS).padStart(DIGITS, "0");
}


/* ---------- UI helpers ---------- */

function mask(secret) {
  return secret.length <= 12 ? secret : `${secret.slice(0, 4)} •••• ${secret.slice(-4)}`;
}

function format(code) {
  return code ? `${code.slice(0, 3)} ${code.slice(3)}` : "––– –––";
}

function showToast(text, ok = true) {
  clearTimeout(toastTimer);
  toast.textContent = text;
  toast.classList.toggle("ok", ok);
  toast.classList.add("show");
  toastTimer = setTimeout(() => toast.classList.remove("show"), ok ? 1600 : 2800);
}

async function copy(text, label) {
  try {
    await navigator.clipboard.writeText(text);
    showToast(label);
    return true;
  } catch {
    showToast("Clipboard access was blocked", false);
    return false;
  }
}

function activeItem() {
  return items.find((item) => item.id === activeId) || null;
}

function setTiles(code) {
  tiles.classList.toggle("is-empty", !code);
  tileEls.forEach((tile, index) => {
    const next = code ? code[index] : "–";
    if (tile.dataset.d === next) return;
    tile.dataset.d = next;
    tile.querySelectorAll(".d.leave").forEach((el) => el.remove());
    const old = tile.querySelector(".d");
    const digit = document.createElement("span");
    digit.className = "d enter";
    digit.style.animationDelay = `${index * 45}ms`;
    digit.textContent = next;
    tile.appendChild(digit);
    if (old) {
      old.className = "d leave";
      old.style.animationDelay = `${index * 45}ms`;
      old.addEventListener("animationend", () => old.remove(), { once: true });
    }
  });
}

/* ---------- Rendering ---------- */

const icons = {
  copy: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2.5"/><path d="M5 15V6.5A2.5 2.5 0 0 1 7.5 4H15"/></svg>',
  del: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
};

function renderStage() {
  const item = activeItem();
  if (!item) {
    curLabel.textContent = "No account selected";
    curSecret.textContent = "Paste a secret below to begin";
    setTiles("");
    return;
  }
  curLabel.textContent = item.label || "Your 2FA code";
  curSecret.textContent = mask(item.secret);
  setTiles(codes.get(item.id) || "");
}

function renderCards() {
  cards.replaceChildren();
  count.textContent = String(items.length);
  clearAll.hidden = !items.length;

  if (!items.length) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.innerHTML = "No keys yet.<br>Drop your <b>2FA secret key</b> in the box above — or just press <b>Ctrl+V</b> anywhere.";
    cards.appendChild(empty);
    return;
  }

  items.forEach((item) => {
    const card = document.createElement("article");
    card.className = "card";
    card.dataset.id = item.id;
    card.classList.toggle("is-active", item.id === activeId);

    const top = document.createElement("div");
    top.className = "card-top";

    const name = document.createElement("input");
    name.className = "card-name";
    name.value = item.label;
    name.placeholder = "Add a name…";
    name.setAttribute("aria-label", "Account name");
    name.addEventListener("click", (event) => event.stopPropagation());
    name.addEventListener("input", () => {
      item.label = name.value;
      save();
      if (item.id === activeId) curLabel.textContent = item.label || "Your 2FA code";
    });
    name.addEventListener("keydown", (event) => { if (event.key === "Enter") name.blur(); });

    const copyBtn = document.createElement("button");
    copyBtn.type = "button";
    copyBtn.className = "icon-btn";
    copyBtn.title = "Copy code";
    copyBtn.innerHTML = icons.copy;
    copyBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      copyItem(item, card);
    });

    const delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.className = "icon-btn del";
    delBtn.title = "Remove";
    delBtn.innerHTML = icons.del;
    delBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      removeItem(item.id);
    });

    top.append(name, copyBtn, delBtn);

    const body = document.createElement("div");
    body.className = "card-body";
    const code = document.createElement("span");
    code.className = "card-code";
    code.textContent = format(codes.get(item.id) || "");
    const mini = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    mini.setAttribute("viewBox", "0 0 24 24");
    mini.setAttribute("class", "mini");
    mini.innerHTML = '<circle class="t" cx="12" cy="12" r="9"/><circle class="f" cx="12" cy="12" r="9"/>';
    body.append(code, mini);

    const secret = document.createElement("div");
    secret.className = "card-secret";
    secret.textContent = mask(item.secret);

    card.append(top, body, secret);
    card.addEventListener("click", () => select(item.id));
    cards.appendChild(card);
  });
}

function renderCardCodes() {
  cards.querySelectorAll(".card").forEach((card) => {
    card.querySelector(".card-code").textContent = format(codes.get(card.dataset.id) || "");
  });
}

/* ---------- Actions ---------- */

function select(id) {
  activeId = id;
  cards.querySelectorAll(".card").forEach((card) => card.classList.toggle("is-active", card.dataset.id === id));
  renderStage();
}

async function addFromText(text) {
  const secret = normalize(text.trim());
  if (text.includes("://") || !isValidSecret(secret)) {
    cmd.classList.remove("shake");
    void cmd.offsetWidth;
    cmd.classList.add("shake");
    showToast("That doesn't look like a valid 2FA secret", false);
    return;
  }

  const existing = items.find((item) => item.secret === secret);
  if (existing) {
    items = [existing, ...items.filter((item) => item !== existing)];
    showToast("Already added — selected");
  } else {
    items = [{ id: uid(), secret, label: "" }, ...items].slice(0, MAX_ITEMS);
    showToast("Key added");
  }

  const target = items[0];
  codes.set(target.id, await totp(target.secret, currentCounter()));
  activeId = target.id;
  input.value = "";
  save();
  renderCards();
  renderStage();
}

function removeItem(id) {
  items = items.filter((item) => item.id !== id);
  codes.delete(id);
  if (activeId === id) activeId = items[0]?.id || null;
  save();
  renderCards();
  renderStage();
}

async function copyItem(item, card) {
  const code = codes.get(item.id);
  if (!code) return;
  if (await copy(code, `Copied ${item.label || "code"}`) && card) {
    const el = card.querySelector(".card-code");
    el.classList.add("flash");
    setTimeout(() => el.classList.remove("flash"), 700);
  }
}

async function copyActive() {
  const item = activeItem();
  const code = item && codes.get(item.id);
  if (!code) {
    showToast("Add a secret first", false);
    return;
  }
  if (await copy(code, "Code copied")) {
    clearTimeout(copiedTimer);
    tiles.classList.add("copied");
    copiedTimer = setTimeout(() => tiles.classList.remove("copied"), 800);
  }
}

/* ---------- Clock ---------- */

function currentCounter() {
  return Math.floor(Date.now() / 1000 / PERIOD);
}

async function refreshCodes(counter) {
  const results = await Promise.all(items.map((item) => totp(item.secret, counter)));
  items.forEach((item, index) => codes.set(item.id, results[index]));
  renderCardCodes();
  renderStage();
}

function frame() {
  const now = Date.now();
  const counter = Math.floor(now / 1000 / PERIOD);
  const msLeft = PERIOD * 1000 - (now % (PERIOD * 1000));
  const secsLeft = Math.ceil(msLeft / 1000);
  const fraction = msLeft / (PERIOD * 1000);
  const warn = secsLeft <= WARN_SECONDS;

  if (counter !== lastCounter) {
    lastCounter = counter;
    refreshCodes(counter);
  }

  const hasActive = Boolean(activeItem());
  bar.style.width = hasActive ? `${fraction * 100}%` : "0%";
  curSecs.textContent = hasActive ? String(secsLeft).padStart(2, "0") : "--";
  stage.classList.toggle("is-warn", hasActive && warn);
  document.body.classList.toggle("is-warn", hasActive && warn);

  cards.querySelectorAll(".card").forEach((card) => {
    card.querySelector(".mini .f").style.strokeDashoffset = String(MINI_LENGTH * (1 - fraction));
    card.querySelector(".mini").classList.toggle("warn", warn);
    card.querySelector(".card-code").classList.toggle("warn", warn);
  });

  requestAnimationFrame(frame);
}

/* ---------- Events ---------- */

cmd.addEventListener("submit", (event) => {
  event.preventDefault();
  if (input.value.trim()) addFromText(input.value);
  else input.focus();
});

$("#paste").addEventListener("click", async () => {
  try {
    const text = await navigator.clipboard.readText();
    if (text.trim()) addFromText(text);
    else showToast("Clipboard is empty", false);
  } catch {
    input.focus();
    showToast("Press Ctrl+V to paste", false);
  }
});

tiles.addEventListener("click", copyActive);

$("#copyFull").addEventListener("click", () => {
  const item = activeItem();
  const code = item && codes.get(item.id);
  if (!code) {
    showToast("Add a secret first", false);
    return;
  }
  copy(`${item.secret} | ${code}`, "Full result copied");
});

clearAll.addEventListener("click", () => {
  items = [];
  codes.clear();
  activeId = null;
  save();
  renderCards();
  renderStage();
  showToast("All keys cleared");
});

function isTyping(target) {
  return target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement;
}

document.addEventListener("keydown", (event) => {
  if (isTyping(event.target) || event.ctrlKey || event.metaKey || event.altKey) return;
  if (event.key === "c" || event.key === "C") copyActive();
  if (event.key === "/") {
    event.preventDefault();
    input.focus();
  }
});

document.addEventListener("paste", (event) => {
  if (isTyping(event.target)) return;
  const text = event.clipboardData?.getData("text") || "";
  if (text.trim()) {
    event.preventDefault();
    addFromText(text);
  }
});

/* ---------- PWA ---------- */

const installBtn = $("#install");
let installPrompt = null;

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  installPrompt = event;
  installBtn.hidden = false;
});

installBtn.addEventListener("click", async () => {
  if (!installPrompt) return;
  installPrompt.prompt();
  await installPrompt.userChoice;
  installPrompt = null;
  installBtn.hidden = true;
});

window.addEventListener("appinstalled", () => {
  installBtn.hidden = true;
  showToast("App installed");
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => { /* Offline support is optional. */ });
  });
}

/* ---------- Boot ---------- */

if (!window.crypto?.subtle) {
  showToast("This page needs HTTPS to generate codes", false);
} else {
  renderCards();
  renderStage();
  requestAnimationFrame(frame);
}
