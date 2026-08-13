const form = document.querySelector("#totpForm");
const secretInput = document.querySelector("#secret");
const display = document.querySelector("#display");
const timer = document.querySelector("#timer");
const message = document.querySelector("#message");
const copyCode = document.querySelector("#copyCode");
const copyAll = document.querySelector("#copyAll");
const codeValue = document.querySelector("#codeValue");
const tokenSeconds = document.querySelector("#tokenSeconds");
const tokenBars = document.querySelector("#tokenBars");
const tokenMeter = document.querySelector(".token-meter");
const historyList = document.querySelector("#historyList");
const clearHistory = document.querySelector("#clearHistory");

let activeSecret = "";
let activeCode = "";
let remaining = 0;
let period = 30;
let expiresAtMs = 0;
let inputTimer = null;
let isGenerating = false;
let queuedRefresh = false;
let requestSerial = 0;
const tokenSegmentCount = 30;
const maxSavedSecrets = 5;
const historyStorageKey = "totp-history-v1";
const secretStorageKey = "totp-secret-v1";
let history = loadHistory();

function loadHistory() {
  try {
    const value = JSON.parse(localStorage.getItem(historyStorageKey) || "[]");
    return Array.isArray(value) ? value.slice(0, maxSavedSecrets) : [];
  } catch { return []; }
}

function renderHistory() {
  historyList.replaceChildren();
  if (!history.length) {
    const empty = document.createElement("p");
    empty.className = "history-empty";
    empty.textContent = "Saved 2FA secrets will appear here.";
    historyList.appendChild(empty);
    return;
  }
  history.forEach((item) => {
    const row = document.createElement("button");
    row.type = "button";
    row.className = "history-item";
    const secretText = document.createElement("span");
    secretText.textContent = item.secret;
    row.appendChild(secretText);
    row.addEventListener("click", () => { secretInput.value = item.secret; activeSecret = item.secret; refresh(); });
    historyList.appendChild(row);
  });
}

function saveHistory(secret) {
  history = [{ secret }, ...history.filter((item) => item.secret !== secret)].slice(0, maxSavedSecrets);
  try {
    localStorage.setItem(historyStorageKey, JSON.stringify(history));
  } catch { /* Storage may be disabled; keep history for this page load. */ }
  renderHistory();
}

for (let index = 0; index < tokenSegmentCount; index += 1) {
  tokenBars.appendChild(document.createElement("span"));
}

function setMessage(text, ok = false) {
  message.textContent = text;
  message.classList.toggle("ok", ok);
}

function normalizePreview(value) {
  const upper = value.toUpperCase().replace(/=/g, "");
  const match = upper.match(/[A-Z2-7]{8,}/);
  if (match) return match[0];
  return upper.replace(/\s+/g, "");
}

function hasLikelySecret(value) {
  return normalizePreview(value).length >= 8;
}

function renderTimer(text = "") {
  if (!activeSecret.trim() || !activeCode || !expiresAtMs) {
    timer.textContent = text || "Waiting for secret";
    tokenMeter.classList.remove("active");
    tokenSeconds.textContent = "s";
    tokenBars.querySelectorAll("span").forEach((bar) => bar.classList.remove("active"));
    return;
  }

  tokenMeter.classList.add("active");
  remaining = Math.max(0, Math.ceil((expiresAtMs - Date.now()) / 1000));

  if (remaining <= 0) {
    timer.textContent = "Refreshing code";
    tokenSeconds.textContent = "0s";
    tokenBars.querySelectorAll("span").forEach((bar) => bar.classList.remove("active"));
    return;
  }

  const seconds = `${remaining}s`;
  const activeBars = Math.ceil((remaining / period) * tokenSegmentCount);
  timer.textContent = `Next code in ${seconds}`;
  tokenSeconds.textContent = seconds;
  tokenBars.querySelectorAll("span").forEach((bar, index) => {
    bar.classList.toggle("active", index < activeBars);
  });
}

function clearResult(text = "") {
  activeCode = "";
  remaining = 0;
  expiresAtMs = 0;
  display.value = "";
  codeValue.textContent = "------";
  renderTimer(text);
}

async function fetchCode(showSuccess = false) {
  const secret = activeSecret.trim();

  if (!secret) {
    clearResult();
    setMessage("Paste a 2FA secret first.");
    return;
  }

  if (!hasLikelySecret(secret)) {
    clearResult("Waiting for valid secret");
    setMessage("Paste a valid Base32 2FA secret.");
    return;
  }

  const currentRequest = ++requestSerial;
  const response = await fetch("/api/totp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ secret }),
  });

  const data = await response.json();
  if (currentRequest !== requestSerial) {
    return;
  }

  if (!response.ok || data.ok === false) {
    throw new Error(data.detail || "Could not generate code.");
  }

  activeCode = data.code;
  remaining = data.remaining;
  period = data.period || 30;
  expiresAtMs = (data.expires_at || 0) * 1000;
  display.value = data.display;
  codeValue.textContent = data.code;
  try {
    localStorage.setItem(secretStorageKey, secret);
  } catch { /* Storage may be disabled; generation still works. */ }
  saveHistory(secret);
  renderTimer();

  setMessage("");
}

async function refresh(showSuccess = false) {
  if (isGenerating) {
    queuedRefresh = queuedRefresh || showSuccess;
    return;
  }

  isGenerating = true;

  try {
    await fetchCode(showSuccess);
  } catch (error) {
    clearResult("--");
    setMessage(error.message);
  } finally {
    isGenerating = false;

    if (queuedRefresh) {
      const shouldShowSuccess = queuedRefresh;
      queuedRefresh = false;
      refresh(shouldShowSuccess);
    }
  }
}

async function copyCurrentCode() {
  if (!activeCode) {
    setMessage("Generate a code first.");
    return;
  }

  await navigator.clipboard.writeText(activeCode);
  setMessage("Code copied.", true);
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  activeSecret = secretInput.value;
  refresh(true);
});

secretInput.addEventListener("input", () => {
  activeSecret = secretInput.value;
  requestSerial += 1;
  clearTimeout(inputTimer);

  if (!activeSecret.trim()) {
    clearResult();
    setMessage("");
    return;
  }

  if (!hasLikelySecret(activeSecret)) {
    clearResult("Waiting for valid secret");
    setMessage("Paste a valid Base32 2FA secret.");
    return;
  }

  inputTimer = setTimeout(() => refresh(true), 350);
});

copyCode.addEventListener("click", async () => {
  await copyCurrentCode();
});

codeValue.addEventListener("click", async () => {
  await copyCurrentCode();
});

copyAll.addEventListener("click", async () => {
  if (!display.value) {
    setMessage("Nothing to copy yet.");
    return;
  }

  await navigator.clipboard.writeText(display.value);
  setMessage("Full result copied.", true);
});

setInterval(() => {
  if (!activeSecret.trim()) {
    return;
  }

  renderTimer();

  if (activeCode && remaining <= 0) {
    refresh();
  }
}, 1000);

clearHistory.addEventListener("click", () => {
  history = [];
  try {
    localStorage.removeItem(historyStorageKey);
  } catch { /* Storage may be disabled. */ }
  renderHistory();
});

try {
  const savedSecret = localStorage.getItem(secretStorageKey);
  if (savedSecret) {
    secretInput.value = savedSecret;
    activeSecret = savedSecret;
    refresh();
  }
} catch { /* Storage may be disabled; generation still works. */ }
renderHistory();
