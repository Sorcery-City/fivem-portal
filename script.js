// =========================
// 星の背景アニメーション（軽量）
// =========================
const canvas = document.getElementById('starfield');
const ctx = canvas.getContext('2d');

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
resizeCanvas();

let stars = [];
function initStars() {
  const count = Math.min(160, Math.floor((canvas.width * canvas.height) / 17000));
  stars = Array.from({ length: count }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    r: Math.random() * 1.8 + 0.4,
    o: Math.random() * 0.8 + 0.2,
    tw: Math.random() * 0.6 + 0.2
  }));
}
initStars();

function animateStars() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (const s of stars) {
    s.o += (Math.random() - 0.5) * 0.02 * s.tw;
    if (s.o < 0.1) s.o = 0.1;
    if (s.o > 1) s.o = 1;

    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,255,255,${s.o})`;
    ctx.fill();
  }
  requestAnimationFrame(animateStars);
}
animateStars();

window.addEventListener('resize', () => {
  resizeCanvas();
  initStars();
});

// =========================
// ナビゲーション（ページ切り替え）
// =========================
function navigateTo(pageId) {
  const target = document.getElementById(pageId);
  if (!target) return;

  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  target.classList.add('active');

  history.replaceState(null, '', `#${pageId}`);
  window.scrollTo({ top: 0, behavior: 'smooth' });

  requestAnimationFrame(() => runReveal(true));
}

function bootFromHash() {
  const hash = (location.hash || '#home').replace('#', '');
  if (document.getElementById(hash)) navigateTo(hash);
  else navigateTo('home');
}
window.addEventListener('hashchange', bootFromHash);
bootFromHash();

// =========================
// スクロール・リビール
// =========================
function runReveal(forceAll = false) {
  const activePage = document.querySelector('.page.active');
  if (!activePage) return;

  const reveals = activePage.querySelectorAll('.reveal');
  const vh = window.innerHeight;

  reveals.forEach(el => {
    if (forceAll) { el.classList.add('visible'); return; }
    const rect = el.getBoundingClientRect();
    if (rect.top < vh - 80) el.classList.add('visible');
  });
}
window.addEventListener('scroll', () => runReveal(false));
runReveal(true);

// =========================
// コピーボタン
// =========================
function copyText(id) {
  const el = document.getElementById(id);
  if (!el) return;
  const text = el.textContent || el.innerText || '';
  navigator.clipboard.writeText(text).then(() => showToast('コピーしました！'))
    .catch(() => showToast('コピー失敗…'));
}

// =========================
// フォーム送信（デモ）
// =========================
function handleSubmit(e) {
  e.preventDefault();
  const name = document.getElementById('name').value.trim();
  const email = document.getElementById('email').value.trim();
  const message = document.getElementById('message').value.trim();
  if (!name || !email || !message) return;

  showToast('送信しました！（デモ）');
  e.target.reset();
}

// =========================
// トースト
// =========================
function showToast(text) {
  const toast = document.getElementById('toast');
  toast.textContent = text;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 1600);
}

// =========================
// 外部リンクのクリック計測（デモ）
// =========================
function trackOutbound(type) {
  // console.log('Outbound:', type);
}

// =========================
// FiveM サーバーステータス（リアタイ風）
// =========================
const SERVER_CODE = "zxxxmd";
const REFRESH_MS = 7000;
let timer = null;

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function nowTime() {
  const d = new Date();
  return d.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

async function fetchServerStatus() {
  if (fetchServerStatus._busy) return;
  fetchServerStatus._busy = true;

  try {
    const url = `https://servers-frontend.fivem.net/api/servers/single/${encodeURIComponent(SERVER_CODE)}`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const json = await res.json();
    const data = json.Data || json.data || json;

    const clients = data.clients ?? data.Clients;
    const max = data.sv_maxclients ?? data.svMaxclients ?? data.maxClients;

    setText('statOnline', 'ONLINE');
    setText('statPlayers', (clients != null && max != null) ? `${clients} / ${max}` : (clients != null ? `${clients}` : '—'));
    setText('statUpdated', nowTime());
    setText('statNote', '正常に取得中');

  } catch (err) {
    setText('statOnline', '—');
    setText('statPlayers', '—');
    setText('statUpdated', nowTime());
    setText('statNote', `取得失敗（${String(err.message || err)}）`);
  } finally {
    fetchServerStatus._busy = false;
  }
}

fetchServerStatus();
timer = setInterval(fetchServerStatus, REFRESH_MS);

document.addEventListener('visibilitychange', () => {
  if (timer) clearInterval(timer);
  if (document.hidden) {
    timer = setInterval(fetchServerStatus, 20000);
  } else {
    fetchServerStatus();
    timer = setInterval(fetchServerStatus, REFRESH_MS);
  }
});

// =========================
// 魔法使い（箒）＋星の軌道エフェクト（定期出現）
// =========================
const wizardCanvas = document.getElementById('wizardfx');
const wctx = wizardCanvas.getContext('2d');

function resizeWizardCanvas() {
  wizardCanvas.width = window.innerWidth;
  wizardCanvas.height = window.innerHeight;
}
resizeWizardCanvas();
window.addEventListener('resize', resizeWizardCanvas);

const WIZ = {
  spawnEveryMs: 14000,
  durationMs: 5200,
  trailLifeMs: 1800,
  maxTrail: 90,
  sparkleRate: 0.65
};

let flights = [];
let sparkles = [];

const rand = (a, b) => Math.random() * (b - a) + a;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

function quadBezier(p0, p1, p2, t) {
  const u = 1 - t;
  return {
    x: u * u * p0.x + 2 * u * t * p1.x + t * t * p2.x,
    y: u * u * p0.y + 2 * u * t * p1.y + t * t * p2.y
  };
}

function spawnWizard() {
  console.log("wizard spawned");
  const W = wizardCanvas.width;
  const H = wizardCanvas.height;

  const fromRight = Math.random() < 0.55;

  const start = { x: fromRight ? W + 140 : -140, y: rand(H * 0.10, H * 0.45) };
  const end   = { x: fromRight ? -160 : W + 160, y: rand(H * 0.25, H * 0.78) };

  const ctrl  = { x: rand(W * 0.35, W * 0.65), y: rand(H * 0.05, H * 0.33) };

  flights.push({
    born: performance.now(),
    start, end, ctrl,
    hue: rand(235, 275),
    trail: []
  });
}

function addSparkle(x, y, hue) {
  sparkles.push({
    x, y,
    vx: rand(-0.18, 0.18),
    vy: rand(-0.22, 0.22),
    r: rand(0.9, 2.3),
    a: 1,
    born: performance.now(),
    life: rand(900, 1400),
    hue
  });
}

function drawTrail(trail, hue) {
  if (trail.length < 2) return;

  wctx.save();
  wctx.lineCap = 'round';
  wctx.lineJoin = 'round';

  // 軌道ライン
  for (let i = 1; i < trail.length; i++) {
    const p0 = trail[i - 1];
    const p1 = trail[i];
    const t = i / (trail.length - 1);

    const alpha = (1 - t) * 0.55;
    const width = 5 * (1 - t) + 1.2;

    wctx.strokeStyle = `hsla(${hue}, 90%, 75%, ${alpha})`;
    wctx.lineWidth = width;

    wctx.beginPath();
    wctx.moveTo(p0.x, p0.y);
    wctx.lineTo(p1.x, p1.y);
    wctx.stroke();
  }

  // 星粒
  wctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < trail.length; i += 6) {
    const p = trail[i];
    wctx.fillStyle = `hsla(${hue}, 90%, 85%, 0.6)`;
    wctx.beginPath();
    wctx.arc(p.x, p.y, 1.6, 0, Math.PI * 2);
    wctx.fill();
  }

  wctx.restore();
}

function drawWizardShape(x, y, angle, scale) {
  wctx.save();
  wctx.translate(x, y);
  wctx.rotate(angle);
  wctx.scale(scale, scale);

  // 箒（棒）
  wctx.lineWidth = 2;
  wctx.strokeStyle = 'rgba(240,230,255,0.85)';
  wctx.beginPath();
  wctx.moveTo(-18, 4);
  wctx.lineTo(18, -4);
  wctx.stroke();

  // 箒の穂
  wctx.fillStyle = 'rgba(220,210,255,0.8)';
  wctx.beginPath();
  wctx.moveTo(18, -4);
  wctx.lineTo(26, -10);
  wctx.lineTo(28, -3);
  wctx.lineTo(26, 4);
  wctx.closePath();
  wctx.fill();

  // 帽子
  wctx.fillStyle = 'rgba(190,175,255,0.85)';
  wctx.beginPath();
  wctx.moveTo(-2, -14);
  wctx.lineTo(-10, -2);
  wctx.lineTo(4, -4);
  wctx.closePath();
  wctx.fill();

  // 頭
  wctx.fillStyle = 'rgba(245,240,255,0.9)';
  wctx.beginPath();
  wctx.arc(-6, -3, 4, 0, Math.PI * 2);
  wctx.fill();

  // マント
  wctx.fillStyle = 'rgba(140,120,255,0.35)';
  wctx.beginPath();
  wctx.moveTo(-10, -2);
  wctx.quadraticCurveTo(-22, 10, -6, 14);
  wctx.quadraticCurveTo(-2, 10, 0, 4);
  wctx.closePath();
  wctx.fill();

  wctx.restore();
}

function wizardLoop() {
  const now = performance.now();
  const W = wizardCanvas.width;
  const H = wizardCanvas.height;

  // クリア
  wctx.clearRect(0, 0, W, H);

  // 寿命で消す
  flights = flights.filter(f => (now - f.born) < (WIZ.durationMs + WIZ.trailLifeMs));

  // 飛行体
  for (const f of flights) {
    const age = now - f.born;
    const tRaw = clamp(age / WIZ.durationMs, 0, 1);
    const t = easeInOut(tRaw);

    const pos = quadBezier(f.start, f.ctrl, f.end, t);
    const pos2 = quadBezier(f.start, f.ctrl, f.end, clamp(t + 0.01, 0, 1));
    const angle = Math.atan2(pos2.y - pos.y, pos2.x - pos.x);

    // 少し揺らす（軌道が生きる）
    const wobble = Math.sin((age / 180) * Math.PI) * (H * 0.02);
    const px = pos.x;
    const py = pos.y + wobble;

    // 軌跡に点追加
    f.trail.unshift({ x: px, y: py, at: now });
    if (f.trail.length > WIZ.maxTrail) f.trail.pop();

    // キラキラ
    if (Math.random() < WIZ.sparkleRate) {
      addSparkle(px + rand(-6, 6), py + rand(-6, 6), f.hue);
    }

    // 軌跡描画
    drawTrail(f.trail, f.hue);

    // 本体描画（飛んでる間だけ）
    if (age <= WIZ.durationMs) {
      const scale = 1.0 + Math.sin(age / 220) * 0.03;
      drawWizardShape(px, py, angle, 1.0 * scale);
    }
  }

  // スパークル描画
  sparkles = sparkles.filter(s => (now - s.born) < s.life);
  wctx.save();
  wctx.globalCompositeOperation = 'lighter';
  for (const s of sparkles) {
    const tt = (now - s.born) / s.life;
    const a = 1 - tt;
    s.x += s.vx;
    s.y += s.vy;

    wctx.fillStyle = `hsla(${s.hue}, 95%, 85%, ${a * 0.9})`;
    wctx.beginPath();
    wctx.arc(s.x, s.y, s.r * (1 - tt * 0.35), 0, Math.PI * 2);
    wctx.fill();
  }
  wctx.restore();

  requestAnimationFrame(wizardLoop);
}
wizardLoop();

// 定期出現
setTimeout(spawnWizard, 2500);
setInterval(spawnWizard, WIZ.spawnEveryMs);
