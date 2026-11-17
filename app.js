/* =========================================================================
   PILGRIM TRADING — Simulation Engine
   Paper-trading only. No real funds, no live MetaQuotes connection.
   ========================================================================= */
'use strict';

/* ---------------------------- Instruments ---------------------------- */
const SYMBOLS = [
  { sym:'EURUSD', name:'Euro / US Dollar',      cls:'FOREX',   base:1.08642, digits:5, vol:0.00018, pv:100000, spread:0.9 },
  { sym:'GBPUSD', name:'British Pound / USD',   cls:'FOREX',   base:1.27118, digits:5, vol:0.00022, pv:100000, spread:1.2 },
  { sym:'USDJPY', name:'US Dollar / Yen',       cls:'FOREX',   base:151.482, digits:3, vol:0.028,   pv:1000,   spread:1.1 },
  { sym:'AUDUSD', name:'Aussie / US Dollar',    cls:'FOREX',   base:0.65812, digits:5, vol:0.00016, pv:100000, spread:1.4 },
  { sym:'USDCAD', name:'USD / Canadian Dollar', cls:'FOREX',   base:1.36421, digits:5, vol:0.00017, pv:100000, spread:1.6 },
  { sym:'XAUUSD', name:'Gold Spot',             cls:'METALS',  base:2338.40, digits:2, vol:0.42,    pv:100,    spread:2.4 },
  { sym:'XAGUSD', name:'Silver Spot',           cls:'METALS',  base:27.412,  digits:3, vol:0.007,   pv:5000,   spread:1.8 },
  { sym:'BTCUSD', name:'Bitcoin',               cls:'CRYPTO',  base:67420.0, digits:1, vol:26.0,    pv:1,      spread:12.0 },
  { sym:'ETHUSD', name:'Ethereum',              cls:'CRYPTO',  base:3482.60, digits:2, vol:1.30,    pv:10,     spread:1.8 },
  { sym:'SOLUSD', name:'Solana',                cls:'CRYPTO',  base:172.44,  digits:2, vol:0.065,    pv:100,    spread:0.9 },
  { sym:'US30',   name:'Dow Jones 30',          cls:'INDEX',   base:38942.0, digits:1, vol:14.0,    pv:1,      spread:2.0 },
  { sym:'NAS100', name:'Nasdaq 100',            cls:'INDEX',   base:18124.5, digits:1, vol:7.0,    pv:1,      spread:1.5 },
  { sym:'SPX500', name:'S&P 500',               cls:'INDEX',   base:5214.30, digits:2, vol:2.0,    pv:10,     spread:0.6 },
  { sym:'AAPL',   name:'Apple Inc.',            cls:'EQUITY',  base:189.42,  digits:2, vol:0.075,    pv:100,    spread:0.04 },
  { sym:'TSLA',   name:'Tesla Inc.',            cls:'EQUITY',  base:174.86,  digits:2, vol:0.085,    pv:100,    spread:0.09 },
  { sym:'NVDA',   name:'NVIDIA Corp.',          cls:'EQUITY',  base:884.20,  digits:2, vol:0.34,    pv:100,    spread:0.35 }
];
const SYM_MAP = Object.fromEntries(SYMBOLS.map(s => [s.sym, s]));

/* ---------------------------- Helpers ---------------------------- */
const $  = (id) => document.getElementById(id);
const money = (v) => (v < 0 ? '-' : '') + '$' + Math.abs(v).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
const px = (sym, v) => v.toFixed(SYM_MAP[sym] ? SYM_MAP[sym].digits : 2);
const now = () => new Date();
const hhmmss = (d) => d.toTimeString().slice(0,8);
const uid = () => Math.random().toString(36).slice(2,10);
const clamp = (v,a,b) => Math.max(a, Math.min(b, v));

/* ---------------------------- State ---------------------------- */
const STORE = 'pilgrim_trading_v1';
let S = null;

function seed() {
  return {
    users: [
      { id:'u1', name:'Olawale Abdul-Ganiyu Adeshina', email:'olawale@pilgrim.trade', pass:'admin123', role:'ADMIN',
        main:250000, interest:18450.32, macro:4210.75, initials:'OA' },
      { id:'u2', name:'Adaeze Nwosu', email:'client@pilgrim.trade', pass:'client123', role:'CLIENT',
        main:12500, interest:842.16, macro:168.43, initials:'AN' },
      { id:'u3', name:'Ibrahim Sule', email:'manager@pilgrim.trade', pass:'manager123', role:'MANAGER',
        main:48000, interest:3120.90, macro:624.18, initials:'IS' },
      { id:'u4', name:'Chidi Okafor', email:'chidi@pilgrim.trade', pass:'client123', role:'CLIENT',
        main:3400, interest:96.55, macro:19.31, initials:'CO' }
    ],
    session: null,
    positions: [],
    history: [],
    audit: [],
    robot: { on:true, cycle:7, lots:0.10, tp:0.05, scope:'all', trades:0, wins:0, profit:0, nextIn:7 },
    prices: {}
  };
}

function initPrices() {
  SYMBOLS.forEach(s => {
    const candles = [];
    let p = s.base;
    const t0 = Date.now() - 120*5000;
    for (let i=0;i<120;i++){
      const o = p;
      p += (s.base - p)*0.01 + (Math.random()-0.5)*s.vol*1.6;
      const c = p;
      const h = Math.max(o,c) + Math.random()*s.vol*0.5;
      const l = Math.min(o,c) - Math.random()*s.vol*0.5;
      candles.push({ t: t0 + i*5000, o, h, l, c });
    }
    S.prices[s.sym] = { price:p, base:s.base, phase:Math.random()*6.28, candles, hi:p, lo:p, open:p };
  });
}

function load() {
  try {
    const raw = localStorage.getItem(STORE);
    if (raw) {
      S = JSON.parse(raw);
      if (!S.prices || Object.keys(S.prices).length !== SYMBOLS.length) initPrices();
      return;
    }
  } catch(e) { console.warn('state reset', e); }
  S = seed(); initPrices();
}
function save() {
  try { localStorage.setItem(STORE, JSON.stringify(S)); } catch(e){}
}

/* ---------------------------- Toasts / Modal ---------------------------- */
function toast(msg, kind='info') {
  const el = document.createElement('div');
  el.className = 'toast ' + kind;
  el.innerHTML = `<span>${kind==='ok'?'✓':kind==='err'?'✕':'ℹ'}</span><span>${msg}</span>`;
  $('toasts').appendChild(el);
  setTimeout(() => { el.style.opacity='0'; el.style.transition='.3s'; setTimeout(()=>el.remove(),300); }, 3600);
}

let modalResolve = null;
function confirmDialog(title, body) {
  $('modalTitle').textContent = title;
  $('modalBody').innerHTML = body;
  $('modalBg').classList.add('show');
  return new Promise(res => { modalResolve = res; });
}
function closeModal(v) {
  $('modalBg').classList.remove('show');
  if (modalResolve) { modalResolve(v); modalResolve = null; }
}
$('modalX').onclick = () => closeModal(false);
$('modalCancel').onclick = () => closeModal(false);
$('modalOk').onclick = () => closeModal(true);
$('modalBg').onclick = (e) => { if (e.target === $('modalBg')) closeModal(false); };

/* ---------------------------- Auth ---------------------------- */
function currentUser() { return S.users.find(u => u.id === S.session) || null; }

function login() {
  const email = $('loginEmail').value.trim().toLowerCase();
  const pass  = $('loginPass').value;
  const u = S.users.find(x => x.email.toLowerCase() === email && x.pass === pass);
  if (!u) { $('loginErr').textContent = 'Invalid credentials. Use one of the demo accounts below.'; return; }
  $('loginErr').textContent = '';
  S.session = u.id; save();
  $('login').classList.add('hidden');
  $('app').classList.remove('hidden');
  boot();
}
function logout() {
  S.session = null; save();
  $('app').classList.add('hidden');
  $('login').classList.remove('hidden');
}

$('loginBtn').onclick = login;
$('loginPass').addEventListener('keydown', e => { if (e.key === 'Enter') login(); });
$('logoutBtn').onclick = logout;

/* ---------------------------- Navigation ---------------------------- */
const VIEW_META = {
  terminal: ['Trading Terminal', 'Live simulated market feed'],
  markets:  ['Markets', 'All instruments & spreads'],
  robot:    ['Auto Robot', '7-second profit engine'],
  wallet:   ['Wallet', 'Segregated balances & payouts'],
  history:  ['Account Ledger', 'Every movement on your account'],
  admin:    ['Admin Console', 'Client management & credit controls'],
  broker:   ['Broker Listing', 'Pilgrim Trading · Davandy Finance Nigeria']
};

function showView(v) {
  const u = currentUser();
  if (v === 'admin' && (!u || u.role !== 'ADMIN')) { toast('Access denied — ADMIN role required.', 'err'); return; }
  document.querySelectorAll('.view').forEach(el => el.classList.remove('active'));
  const target = $('view-' + v);
  if (target) target.classList.add('active');
  document.querySelectorAll('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.view === v));
  const m = VIEW_META[v] || ['', ''];
  $('pageTitle').textContent = m[0];
  $('pageSub').textContent = m[1];
  if (v === 'admin') renderAdmin();
  if (v === 'history') renderHistory();
  if (v === 'wallet') renderWallet();
  if (v === 'markets') renderMarkets();
  if (v === 'robot') renderRobot();
}
document.querySelectorAll('.nav-item').forEach(n => n.onclick = () => showView(n.dataset.view));

/* ---------------------------- Boot ---------------------------- */
function boot() {
  const u = currentUser();
  if (!u) return;
  $('sideName').textContent = u.name.split(' ')[0] + ' ' + (u.name.split(' ')[1] || '');
  $('sideRole').textContent = u.role;
  $('sideAvatar').textContent = u.initials || u.name.slice(0,2).toUpperCase();

  // RBAC: hide admin nav for non-admins
  const adminNav = document.querySelector('.nav-item[data-view="admin"]');
  if (adminNav) adminNav.style.display = (u.role === 'ADMIN') ? '' : 'none';

  // order symbol select
  const sel = $('orderSym');
  if (!sel.options.length) {
    SYMBOLS.forEach(s => {
      const o = document.createElement('option');
      o.value = s.sym; o.textContent = `${s.sym} — ${s.name}`;
      sel.appendChild(o);
    });
    sel.value = 'EURUSD';
  }
  // admin user select
  const cu = $('credUser');
  if (cu && !cu.options.length) {
    S.users.filter(x => x.role !== 'ADMIN').forEach(x => {
      const o = document.createElement('option'); o.value = x.id; o.textContent = x.name + ' · ' + x.email;
      cu.appendChild(o);
    });
  }
  // robot config inputs
  $('cfgCycle').value = S.robot.cycle;
  $('cfgLots').value = S.robot.lots;
  $('cfgTp').value = S.robot.tp;
  $('cfgScope').value = S.robot.scope;

  showView('terminal');
  renderAll();
  startLoops();
}

/* ---------------------------- Market engine ---------------------------- */
let tickCount = 0;

function marketTick() {
  tickCount++;
  SYMBOLS.forEach(s => {
    const p = S.prices[s.sym];
    p.phase += 0.035;
    const pull = (s.base - p.price) * 0.006;
    const wave = Math.sin(p.phase) * s.vol * 0.55;
    const noise = (Math.random() - 0.5) * s.vol * 1.25;
    p.price = Math.max(s.base * 0.7, p.price + pull + wave + noise);

    const last = p.candles[p.candles.length - 1];
    last.c = p.price;
    last.h = Math.max(last.h, p.price);
    last.l = Math.min(last.l, p.price);
    p.hi = Math.max(p.hi, p.price);
    p.lo = Math.min(p.lo, p.price);

    if (tickCount % 5 === 0) {
      p.candles.push({ t: Date.now(), o: p.price, h: p.price, l: p.price, c: p.price });
      if (p.candles.length > 140) p.candles.shift();
    }
  });
  if (tickCount % 5 === 0) save();
}

function startLoops() {
  if (window.__loops) return;
  window.__loops = true;

  setInterval(() => { marketTick(); renderLive(); }, 1000);

  setInterval(() => {
    $('clock').textContent = hhmmss(now());
    if (!S.robot.on) return;
    S.robot.nextIn--;
    if (S.robot.nextIn <= 0) {
      S.robot.nextIn = S.robot.cycle;
      robotCycle();
    }
    renderRobotTimer();
  }, 1000);
}

/* ---------------------------- Chart ---------------------------- */
let activeSym = 'EURUSD';
let activeTf = 5;

function aggregate(candles, tf) {
  const n = tf === 5 ? 1 : tf === 15 ? 3 : 12;
  if (n === 1) return candles.slice(-90);
  const out = [];
  for (let i = 0; i < candles.length; i += n) {
    const g = candles.slice(i, i + n);
    if (!g.length) continue;
    out.push({ t:g[0].t, o:g[0].o, c:g[g.length-1].c, h:Math.max(...g.map(x=>x.h)), l:Math.min(...g.map(x=>x.l)) });
  }
  return out.slice(-90);
}

function drawChart() {
  const cv = $('chart');
  if (!cv) return;
  const dpr = window.devicePixelRatio || 1;
  const w = cv.clientWidth, h = cv.clientHeight;
  if (!w || !h) return;
  cv.width = w * dpr; cv.height = h * dpr;
  const ctx = cv.getContext('2d');
  ctx.setTransform(dpr,0,0,dpr,0,0);
  ctx.clearRect(0,0,w,h);

  const data = aggregate(S.prices[activeSym].candles, activeTf);
  if (!data.length) return;

  const padL = 10, padR = 66, padT = 14, padB = 22;
  const cw = w - padL - padR, ch = h - padT - padB;
  let hi = Math.max(...data.map(d=>d.h)), lo = Math.min(...data.map(d=>d.l));
  const range = (hi - lo) || 1;
  hi += range * 0.08; lo -= range * 0.08;
  const y = v => padT + (hi - v) / (hi - lo) * ch;
  const step = cw / data.length;
  const bodyW = Math.max(2, Math.min(11, step * 0.62));

  // grid
  ctx.strokeStyle = 'rgba(30,45,71,.55)'; ctx.lineWidth = 1;
  ctx.font = '10px ui-monospace, monospace'; ctx.fillStyle = '#5f7391';
  for (let i = 0; i <= 5; i++) {
    const yy = padT + (ch / 5) * i;
    ctx.beginPath(); ctx.moveTo(padL, yy); ctx.lineTo(w - padR, yy); ctx.stroke();
    const val = hi - ((hi - lo) / 5) * i;
    ctx.fillText(val.toFixed(SYM_MAP[activeSym].digits), w - padR + 7, yy + 3.5);
  }

  // candles
  data.forEach((d, i) => {
    const x = padL + i * step + step / 2;
    const up = d.c >= d.o;
    const col = up ? '#00d68f' : '#ff4d6a';
    ctx.strokeStyle = col; ctx.fillStyle = col;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x, y(d.h)); ctx.lineTo(x, y(d.l)); ctx.stroke();
    const top = y(Math.max(d.o, d.c)), bot = y(Math.min(d.o, d.c));
    const bh = Math.max(1.5, bot - top);
    ctx.fillRect(x - bodyW/2, top, bodyW, bh);
  });

  // last price line
  const last = data[data.length - 1];
  const lp = S.prices[activeSym].price;
  const ly = y(lp);
  const up = lp >= last.o;
  ctx.setLineDash([4,4]);
  ctx.strokeStyle = up ? 'rgba(0,214,143,.7)' : 'rgba(255,77,106,.7)';
  ctx.beginPath(); ctx.moveTo(padL, ly); ctx.lineTo(w - padR, ly); ctx.stroke();
  ctx.setLineDash([]);

  // price tag
  const label = px(activeSym, lp);
  ctx.font = 'bold 10.5px ui-monospace, monospace';
  const tw = ctx.measureText(label).width + 12;
  ctx.fillStyle = up ? '#00d68f' : '#ff4d6a';
  ctx.fillRect(w - padR + 2, ly - 9, tw, 18);
  ctx.fillStyle = '#04150f';
  ctx.fillText(label, w - padR + 8, ly + 4);

  // time labels
  ctx.fillStyle = '#41536e'; ctx.font = '9.5px ui-monospace, monospace';
  for (let i = 0; i < data.length; i += Math.ceil(data.length / 6)) {
    const x = padL + i * step + step/2;
    const d = new Date(data[i].t);
    ctx.fillText(d.toTimeString().slice(0,5), Math.min(x, w - padR - 30), h - 6);
  }
}

/* ---------------------------- Positions ---------------------------- */
function pnlOf(pos) {
  const p = S.prices[pos.sym];
  if (!p) return 0;
  const cur = p.price;
  const dir = pos.side === 'BUY' ? 1 : -1;
  return (cur - pos.entry) * dir * pos.lots * SYM_MAP[pos.sym].pv;
}

function openPosition(sym, side, lots, source) {
  const u = currentUser();
  const p = S.prices[sym];
  const sp = SYM_MAP[sym].spread * Math.pow(10, -SYM_MAP[sym].digits);
  const entry = side === 'BUY' ? p.price + sp/2 : p.price - sp/2;
  const pos = {
    id: uid(), userId: u.id, sym, side, lots,
    entry, openedAt: Date.now(), source,
    tp: side === 'BUY' ? entry * (1 + S.robot.tp/100) : entry * (1 - S.robot.tp/100)
  };
  S.positions.push(pos);
  return pos;
}

function closePosition(id, reason) {
  const idx = S.positions.findIndex(p => p.id === id);
  if (idx < 0) return;
  const pos = S.positions[idx];
  const pnl = pnlOf(pos);
  S.positions.splice(idx, 1);

  const u = S.users.find(x => x.id === pos.userId);
  if (u) {
    if (pos.source === 'ROBOT') {
      // Robot profit -> interest (80%) + macro (20%)
      const profit = Math.max(pnl, 0);
      const toInterest = profit * 0.8;
      const toMacro = profit * 0.2;
      u.interest += toInterest;
      u.macro += toMacro;
      S.robot.profit += profit;
      S.robot.trades++;
      if (pnl > 0) S.robot.wins++;
      addHistory(u.id, 'ROBOT PROFIT', `${pos.side} ${pos.sym} ${pos.lots} lots closed`, profit, 'interest', 'Settled');
      if (toMacro > 0) addHistory(u.id, 'MACRO ALLOCATION', `20% yield sweep · ${pos.sym}`, toMacro, 'macro', 'Settled');
    } else {
      u.main += pnl;
      addHistory(u.id, pnl >= 0 ? 'TRADE PROFIT' : 'TRADE LOSS', `${pos.side} ${pos.sym} ${pos.lots} lots closed`, pnl, 'main', 'Settled');
    }
  }
  if (pos.userId === S.session) {
    toast(`${pos.side} ${pos.sym} closed · ${pnl >= 0 ? '+' : ''}${money(pnl)}`, pnl >= 0 ? 'ok' : 'err');
  }
  save();
  renderAll();
}

/* ---------------------------- Robot ---------------------------- */
function robotLog(msg, kind='') {
  const el = $('robotLog');
  if (!el) return;
  const line = document.createElement('div');
  line.className = 'log-line';
  const col = kind === 'win' ? 'var(--green)' : kind === 'open' ? 'var(--teal)' : 'var(--text-2)';
  line.innerHTML = `<span class="log-time">${hhmmss(now())}</span><span class="log-msg" style="color:${col}">${msg}</span>`;
  el.prepend(line);
  while (el.children.length > 120) el.lastChild.remove();
  $('logCount').textContent = el.children.length + ' events';
}

function robotCycle() {
  const u = currentUser();
  if (!u || !S.robot.on) return;

  // 1) manage open robot positions
  const mine = S.positions.filter(p => p.userId === u.id && p.source === 'ROBOT');
  mine.forEach(pos => {
    const pnl = pnlOf(pos);
    const p = S.prices[pos.sym];
    const age = (Date.now() - pos.openedAt) / 1000;
    const hitTp = pos.side === 'BUY' ? p.price >= pos.tp : p.price <= pos.tp;

    if (hitTp) {
      const before = u.interest;
      closePosition(pos.id, 'TP');
      robotLog(`TP HIT · ${pos.side} ${pos.sym} ${pos.lots} lots → +${money(u.interest - before)} banked to Interest Wallet`, 'win');
    } else if (age > 60 && pnl > 0) {
      const before = u.interest;
      closePosition(pos.id, 'TIME');
      robotLog(`TIME EXIT · ${pos.sym} closed in profit → +${money(u.interest - before)}`, 'win');
    } else if (age > 240) {
      closePosition(pos.id, 'MAX_AGE');
      robotLog(`RISK GUARD · ${pos.sym} held >4min, closed at ${pnl>=0?'+':''}${money(pnl)}`, pnl>=0?'win':'');
    }
  });

  // 2) open a new momentum position (works in both directions)
  const pool = SYMBOLS.filter(s => {
    if (S.robot.scope === 'all') return true;
    if (S.robot.scope === 'fx') return s.cls === 'FOREX';
    if (S.robot.scope === 'crypto') return s.cls === 'CRYPTO';
    if (S.robot.scope === 'metals') return s.cls === 'METALS';
    return true;
  });
  const sym = pool[Math.floor(Math.random() * pool.length)];
  const c = S.prices[sym.sym].candles;
  const a = c[c.length - 3].c, b = c[c.length - 1].c;
  const side = b >= a ? 'BUY' : 'SELL';
  openPosition(sym.sym, side, S.robot.lots, 'ROBOT');
  robotLog(`SIGNAL · ${side} ${sym.sym} ${S.robot.lots} lots @ ${px(sym.sym, S.prices[sym.sym].price)} · trend ${b>=a?'up':'down'}`, 'open');

  save();
  renderAll();
}

function renderRobotTimer() {
  const r = S.robot;
  $('robotCountdown').textContent = r.nextIn;
  $('ringNum').textContent = r.nextIn;
  const arc = $('ringArc');
  if (arc) {
    const frac = r.nextIn / r.cycle;
    arc.setAttribute('stroke-dashoffset', String(195 * (1 - frac)));
    arc.setAttribute('stroke', r.on ? '#00d68f' : '#ff4d6a');
  }
  $('robotState').textContent = r.on ? 'RUNNING' : 'PAUSED';
  $('robotState').style.color = r.on ? 'var(--green)' : 'var(--red)';
  $('robotToggle').textContent = r.on ? 'Pause Robot' : 'Resume Robot';
  $('robotToggle').className = 'btn btn-sm ' + (r.on ? 'btn-danger' : 'btn-primary');
  const nb = $('robotNavBadge');
  if (nb) { nb.textContent = r.on ? 'ON' : 'OFF'; nb.style.background = r.on ? 'var(--green-dim)' : 'var(--red-dim)'; nb.style.color = r.on ? 'var(--green)' : 'var(--red)'; }
}

$('robotToggle').onclick = () => {
  S.robot.on = !S.robot.on;
  robotLog(S.robot.on ? 'Engine resumed — 7s cycle active.' : 'Engine paused by operator.');
  save(); renderRobotTimer();
};

$('cfgSave').onclick = () => {
  S.robot.cycle = clamp(parseInt($('cfgCycle').value) || 7, 7, 60);
  S.robot.lots  = clamp(parseFloat($('cfgLots').value) || 0.10, 0.01, 50);
  S.robot.tp    = clamp(parseFloat($('cfgTp').value) || 0.05, 0.01, 5);
  S.robot.scope = $('cfgScope').value;
  S.robot.nextIn = S.robot.cycle;
  robotLog(`Config applied · cycle ${S.robot.cycle}s · ${S.robot.lots} lots · TP ${S.robot.tp}% · ${S.robot.scope}`);
  toast('Robot configuration applied.', 'ok');
  save(); renderRobot();
};

/* ---------------------------- History ---------------------------- */
function addHistory(userId, type, detail, amount, wallet, status) {
  S.history.unshift({ id:uid(), userId, time:Date.now(), type, detail, amount, wallet, status });
  if (S.history.length > 400) S.history.pop();
}
function addAudit(msg) {
  S.audit.unshift({ time:Date.now(), actor: currentUser()?.name || 'system', msg });
  if (S.audit.length > 200) S.audit.pop();
}

/* ---------------------------- Renderers ---------------------------- */
function renderAll() {
  renderLive();
  renderWallet();
  renderHistory();
  renderAdmin();
  renderRobot();
  renderMarkets();
}

function renderLive() {
  const u = currentUser();
  if (!u) return;

  // chart header
  const p = S.prices[activeSym];
  const s = SYM_MAP[activeSym];
  const chg = (p.price - p.open) / p.open * 100;
  $('chartSym').textContent = activeSym;
  $('chartClass').textContent = s.cls;
  $('chartPx').textContent = px(activeSym, p.price);
  $('chartPx').className = 'px mono ' + (chg >= 0 ? 'up' : 'down');
  $('chartChg').textContent = (chg>=0?'+':'') + chg.toFixed(2) + '%';
  $('chartChg').className = chg >= 0 ? 'up' : 'down';
  $('chartHi').textContent = 'H ' + px(activeSym, p.hi);
  $('chartLo').textContent = 'L ' + px(activeSym, p.lo);
  $('chartSpread').textContent = 'Spr ' + s.spread.toFixed(1);
  drawChart();

  // ticket
  const sp = s.spread * Math.pow(10, -s.digits);
  $('ticketBid').textContent = px(activeSym, p.price - sp/2);
  $('ticketAsk').textContent = px(activeSym, p.price + sp/2);
  const lots = parseFloat($('orderLots').value) || 0;
  const lev = parseInt(($('orderLev').value || '1:200').split(':')[1]) || 200;
  $('orderMargin').textContent = money(p.price * lots * s.pv / lev);

  // stats
  const mine = S.positions.filter(x => x.userId === u.id);
  const openPnl = mine.reduce((a, x) => a + pnlOf(x), 0);
  $('statMain').textContent = money(u.main);
  $('statInterest').textContent = money(u.interest);
  $('statPnl').textContent = (openPnl>=0?'+':'') + money(openPnl);
  $('statPnl').className = 'stat-value ' + (openPnl >= 0 ? 'up' : 'down');
  $('statPosCount').textContent = mine.length + ' open position' + (mine.length===1?'':'s');
  const eq = u.main + u.interest + (u.macro||0) + openPnl;
  $('statEquity').textContent = money(eq);
  $('equityPill').innerHTML = `Equity <b class="mono" style="color:#fff">${money(eq)}</b>`;

  // positions table
  const tb = $('posBody');
  $('posBadge').textContent = mine.length;
  if (!mine.length) {
    tb.innerHTML = '<tr><td colspan="8" class="dim" style="padding:22px;text-align:center">No open positions — place a trade or enable the robot.</td></tr>';
  } else {
    tb.innerHTML = mine.map(x => {
      const pnl = pnlOf(x);
      const cur = S.prices[x.sym].price;
      return `<tr>
        <td><b>${x.sym}</b></td>
        <td><span class="badge ${x.side==='BUY'?'badge-green':'badge-red'}">${x.side}</span></td>
        <td class="mono">${x.lots.toFixed(2)}</td>
        <td class="mono">${px(x.sym, x.entry)}</td>
        <td class="mono">${px(x.sym, cur)}</td>
        <td class="mono ${pnl>=0?'up':'down'}"><b>${pnl>=0?'+':''}${money(pnl)}</b></td>
        <td><span class="badge ${x.source==='ROBOT'?'badge-violet':'badge-blue'}">${x.source}</span></td>
        <td><button class="btn btn-sm" data-close="${x.id}">Close</button></td>
      </tr>`;
    }).join('');
    tb.querySelectorAll('[data-close]').forEach(b => b.onclick = () => closePosition(b.dataset.close));
  }

  // market watch
  const mw = $('marketWatch');
  mw.innerHTML = SYMBOLS.map(sy => {
    const pp = S.prices[sy.sym];
    const c = (pp.price - pp.open) / pp.open * 100;
    return `<div class="sym-row ${sy.sym===activeSym?'active':''}" data-sym="${sy.sym}">
      <div><div class="sym-name">${sy.sym}</div><div class="sym-desc">${sy.cls}</div></div>
      <div class="sym-price">${px(sy.sym, pp.price)}</div>
      <div class="sym-chg ${c>=0?'up':'down'}">${c>=0?'+':''}${c.toFixed(2)}%</div>
    </div>`;
  }).join('');
  mw.querySelectorAll('[data-sym]').forEach(el => el.onclick = () => {
    activeSym = el.dataset.sym;
    $('orderSym').value = activeSym;
    renderLive();
  });
}

function renderMarkets() {
  const tb = $('marketsBody');
  if (!tb) return;
  $('mkCount').textContent = SYMBOLS.length + ' instruments';
  tb.innerHTML = SYMBOLS.map(s => {
    const p = S.prices[s.sym];
    const c = (p.price - p.open) / p.open * 100;
    const sp = s.spread * Math.pow(10, -s.digits);
    return `<tr>
      <td><b>${s.sym}</b><div class="dim" style="font-size:10px">${s.name}</div></td>
      <td><span class="badge badge-blue">${s.cls}</span></td>
      <td class="mono down">${px(s.sym, p.price - sp/2)}</td>
      <td class="mono up">${px(s.sym, p.price + sp/2)}</td>
      <td class="mono dim">${s.spread.toFixed(1)}</td>
      <td class="mono ${c>=0?'up':'down'}"><b>${c>=0?'+':''}${c.toFixed(2)}%</b></td>
      <td class="mono">${px(s.sym, p.hi)}</td>
      <td class="mono">${px(s.sym, p.lo)}</td>
      <td><button class="btn btn-sm" data-trade="${s.sym}">Trade</button></td>
    </tr>`;
  }).join('');
  tb.querySelectorAll('[data-trade]').forEach(b => b.onclick = () => {
    activeSym = b.dataset.trade;
    $('orderSym').value = activeSym;
    showView('terminal'); renderLive();
  });
}

function renderWallet() {
  const u = currentUser();
  if (!u) return;
  $('wMain').textContent = money(u.main);
  $('wInt').textContent = money(u.interest);
  const mEl = $('wMacro');
  if (mEl) mEl.textContent = money(u.macro || 0);
}

function renderHistory() {
  const u = currentUser();
  if (!u) return;
  const rows = S.history.filter(h => h.userId === u.id);
  $('histCount').textContent = rows.length + ' entries';
  const tb = $('histBody');
  if (!rows.length) {
    tb.innerHTML = '<tr><td colspan="6" class="dim" style="padding:24px;text-align:center">No transactions yet.</td></tr>';
    return;
  }
  tb.innerHTML = rows.slice(0, 120).map(h => {
    const d = new Date(h.time);
    const wl = h.wallet === 'main' ? 'Main' : h.wallet === 'interest' ? 'Interest' : 'Macro';
    return `<tr>
      <td class="mono dim">${d.toLocaleDateString('en-GB',{day:'2-digit',month:'short'})} ${hhmmss(d)}</td>
      <td><span class="badge ${h.type.includes('PROFIT')?'badge-green':h.type.includes('LOSS')?'badge-red':'badge-blue'}">${h.type}</span></td>
      <td class="dim">${h.detail}</td>
      <td class="mono ${h.amount>=0?'up':'down'}"><b>${h.amount>=0?'+':''}${money(h.amount)}</b></td>
      <td class="dim">${wl}</td>
      <td><span class="badge ${h.status==='Settled'?'badge-green':'badge-gold'}">${h.status}</span></td>
    </tr>`;
  }).join('');
}

function renderAdmin() {
  const u = currentUser();
  if (!u || u.role !== 'ADMIN') return;
  const clients = S.users.filter(x => x.role !== 'ADMIN');
  $('admUsers').textContent = S.users.length;
  $('admCapital').textContent = money(S.users.reduce((a,x)=>a+x.main,0));
  $('admInterest').textContent = money(S.users.reduce((a,x)=>a+x.interest,0));
  $('admPos').textContent = S.positions.length;

  $('adminUsersBody').innerHTML = S.users.map(x => {
    const n = S.positions.filter(p => p.userId === x.id).length;
    return `<tr>
      <td><b>${x.name}</b><div class="dim" style="font-size:10px">${x.email}</div></td>
      <td><span class="badge ${x.role==='ADMIN'?'badge-gold':x.role==='MANAGER'?'badge-violet':'badge-blue'}">${x.role}</span></td>
      <td class="mono">${money(x.main)}</td>
      <td class="mono" style="color:var(--gold)">${money(x.interest)}</td>
      <td class="mono">${n}</td>
      <td><button class="btn btn-sm" data-edit="${x.id}">Manage</button></td>
    </tr>`;
  }).join('');
  $('adminUsersBody').querySelectorAll('[data-edit]').forEach(b => b.onclick = () => {
    $('credUser').value = b.dataset.edit;
    $('credAmt').focus();
  });

  const al = $('auditLog');
  if (al) {
    al.innerHTML = S.audit.length
      ? S.audit.map(a => `<div class="log-line"><span class="log-time">${hhmmss(new Date(a.time))}</span><span class="log-msg">${a.msg}</span></div>`).join('')
      : '<div class="log-line"><span class="log-msg dim">No admin actions recorded.</span></div>';
    $('auditCount').textContent = S.audit.length + ' events';
  }
}

function renderRobot() {
  const r = S.robot;
  $('rTrades').textContent = r.trades;
  $('rWin').textContent = r.trades ? Math.round(r.wins / r.trades * 100) + '%' : '—';
  $('rProfit').textContent = money(r.profit);
  renderRobotTimer();
}

/* ---------------------------- Order actions ---------------------------- */
function placeOrder(side) {
  const u = currentUser();
  const sym = $('orderSym').value;
  const lots = parseFloat($('orderLots').value) || 0;
  if (lots < 0.01) { toast('Minimum volume is 0.01 lots.', 'err'); return; }
  const s = SYM_MAP[sym];
  const lev = parseInt(($('orderLev').value || '1:200').split(':')[1]) || 200;
  const margin = S.prices[sym].price * lots * s.pv / lev;
  if (margin > u.main) { toast('Insufficient main balance for margin. Ask admin to credit your account.', 'err'); return; }
  const pos = openPosition(sym, side, lots, 'MANUAL');
  addHistory(u.id, 'ORDER OPEN', `${side} ${sym} ${lots.toFixed(2)} lots @ ${px(sym, pos.entry)}`, 0, 'main', 'Settled');
  toast(`${side} ${lots.toFixed(2)} ${sym} opened at ${px(sym, pos.entry)}`, 'ok');
  save(); renderAll();
}
$('btnBuy').onclick = () => placeOrder('BUY');
$('btnSell').onclick = () => placeOrder('SELL');
$('orderSym').onchange = () => { activeSym = $('orderSym').value; renderLive(); };
$('orderLots').oninput = () => renderLive();
$('orderLev').onchange = () => renderLive();

document.querySelectorAll('#tfGroup .tf').forEach(el => el.onclick = () => {
  document.querySelectorAll('#tfGroup .tf').forEach(x => x.classList.remove('active'));
  el.classList.add('active');
  activeTf = parseInt(el.dataset.tf);
  drawChart();
});

/* ---------------------------- Wallet actions ---------------------------- */
$('trBtn').onclick = () => {
  const u = currentUser();
  const amt = parseFloat($('trAmt').value) || 0;
  const dir = $('trDir').value;
  if (amt <= 0) { toast('Enter a valid amount.', 'err'); return; }
  if (dir === 'int2main') {
    if (amt > u.interest) { toast('Insufficient interest balance.', 'err'); return; }
    u.interest -= amt; u.main += amt;
    addHistory(u.id, 'TRANSFER', 'Interest → Main balance', amt, 'main', 'Settled');
  } else {
    if (amt > u.main) { toast('Insufficient main balance.', 'err'); return; }
    u.main -= amt; u.interest += amt;
    addHistory(u.id, 'TRANSFER', 'Main → Interest balance', amt, 'interest', 'Settled');
  }
  $('trAmt').value = '';
  toast('Transfer completed.', 'ok');
  save(); renderAll();
};

$('bkBtn').onclick = async () => {
  const u = currentUser();
  const amt = parseFloat($('bkAmt').value) || 0;
  const src = $('bkSrc').value;
  const bank = $('bkBank').value;
  if (amt <= 0) { toast('Enter a valid amount.', 'err'); return; }
  if (amt > (src === 'main' ? u.main : u.interest)) { toast('Insufficient balance in selected wallet.', 'err'); return; }
  const ok = await confirmDialog('Confirm bank payout', `
    <div class="kv"><span>Amount</span><span class="mono">${money(amt)}</span></div>
    <div class="kv"><span>Source</span><span>${src === 'main' ? 'Main Balance' : 'Interest Wallet'}</span></div>
    <div class="kv"><span>Destination</span><span>${bank}</span></div>
    <div class="dim" style="font-size:11.5px;margin-top:12px">Simulated payout. In production this would route through a licensed PSP with KYC/AML checks.</div>`);
  if (!ok) return;
  if (src === 'main') u.main -= amt; else u.interest -= amt;
  addHistory(u.id, 'BANK PAYOUT', bank, -amt, src, 'Processing');
  $('bkAmt').value = '';
  toast('Bank payout requested — processing.', 'ok');
  save(); renderAll();
};

$('crBtn').onclick = async () => {
  const u = currentUser();
  const amt = parseFloat($('crAmt').value) || 0;
  const src = $('crSrc').value;
  const net = $('crNet').value;
  const addr = $('crAddr').value.trim();
  if (amt <= 0) { toast('Enter a valid amount.', 'err'); return; }
  if (addr.length < 10) { toast('Enter a valid destination wallet address.', 'err'); return; }
  if (amt > (src === 'main' ? u.main : u.interest)) { toast('Insufficient balance in selected wallet.', 'err'); return; }
  const ok = await confirmDialog('Confirm crypto payout', `
    <div class="kv"><span>Amount</span><span class="mono">${money(amt)}</span></div>
    <div class="kv"><span>Network</span><span>${net}</span></div>
    <div class="kv"><span>Address</span><span class="mono" style="font-size:11px">${addr.slice(0,10)}…${addr.slice(-6)}</span></div>
    <div class="dim" style="font-size:11.5px;margin-top:12px">Simulated on-chain payout. Production requires custody controls and travel-rule compliance.</div>`);
  if (!ok) return;
  if (src === 'main') u.main -= amt; else u.interest -= amt;
  addHistory(u.id, 'CRYPTO PAYOUT', `${net} → ${addr.slice(0,8)}…`, -amt, src, 'Processing');
  $('crAmt').value = ''; $('crAddr').value = '';
  toast('Crypto payout broadcast (simulated).', 'ok');
  save(); renderAll();
};

/* ---------------------------- Admin actions ---------------------------- */
$('credBtn').onclick = async () => {
  const u = currentUser();
  if (!u || u.role !== 'ADMIN') { toast('Access denied — ADMIN role required.', 'err'); return; }
  const targetId = $('credUser').value;
  const target = S.users.find(x => x.id === targetId);
  if (!target) { toast('Select a client.', 'err'); return; }
  const amt = parseFloat($('credAmt').value) || 0;
  const action = $('credAction').value;
  const wallet = $('credWallet').value;
  const note = $('credNote').value.trim() || 'Manual adjustment';
  if (amt <= 0) { toast('Enter a valid amount.', 'err'); return; }

  const delta = action === 'credit' ? amt : -amt;
  if (wallet === 'main') target.main = Math.max(0, target.main + delta);
  else target[wallet] = Math.max(0, (target[wallet] || 0) + delta);

  addHistory(target.id, action === 'credit' ? 'ADMIN CREDIT' : 'ADMIN DEBIT', note, delta, wallet, 'Settled');
  addAudit(`${action.toUpperCase()} ${money(amt)} → ${target.name} (${wallet}) · "${note}" by ${u.name}`);
  $('credAmt').value = ''; $('credNote').value = '';
  toast(`${action === 'credit' ? 'Credited' : 'Debited'} ${money(amt)} ${action==='credit'?'to':'from'} ${target.name}.`, 'ok');
  save(); renderAll();
};

/* ---------------------------- Resize ---------------------------- */
let rz;
window.addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(drawChart, 120); });

/* ---------------------------- Init ---------------------------- */
load();
if (S.session && currentUser()) {
  $('login').classList.add('hidden');
  $('app').classList.remove('hidden');
  boot();
}
