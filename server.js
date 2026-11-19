// Campfire game server: serves the game page and relays player presence
// between friends in the same campfire room over WebSockets.
// Run locally with `npm install` then `npm start`, then open http://localhost:3000

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { WebSocketServer } = require('ws');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');
const MAX_PLAYERS_PER_ROOM = 12;
const MAX_ROOMS = 500;
const MAX_PRESENCE_BYTES = 6 * 1024;
const MSGS_PER_SECOND = 60; // per player, with a burst of 2x
const MAX_SIGNAL_BYTES = 16 * 1024;

// Ember, the campfire spirit. With AI keys set on the host (free Groq and Gemini, or paid
// Claude), Ember really talks, switching to the next AI when one hits its limit (ember-brains.js).
// Without any, it uses its storybook in the browser.
const Brain = require('./public/spirit-brain.js');
const Brains = require('./ember-brains.js');
// Most answers per day from the paid brain, Claude (keeps the bill small). Free brains have their own limits.
const SPIRIT_DAILY_LIMIT = Math.max(0, parseInt(process.env.SPIRIT_DAILY_LIMIT || '400', 10) || 0);

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

// ---------- static files ----------
const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname === '/healthz') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    return res.end('ok');
  }
  if (url.pathname === '/spirit-status') {
    res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' });
    return res.end(JSON.stringify({ ai: Brains.chain.length > 0, brains: Brains.status() }));
  }
  if (url.pathname === '/spirit') {
    if (req.method !== 'POST') { res.writeHead(405); return res.end(); }
    return spiritHandler(req, res);
  }
  const rel = url.pathname === '/' ? '/index.html' : decodeURIComponent(url.pathname);
  const file = path.normalize(path.join(PUBLIC_DIR, rel));
  if (!file.startsWith(PUBLIC_DIR + path.sep)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }
  fs.readFile(file, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      return res.end('Not found');
    }
    res.writeHead(200, {
      'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream',
      'Cache-Control': 'no-cache'
    });
    res.end(data);
  });
});

// ---------- rooms ----------
// rooms: code -> Map(playerId -> client)
const rooms = new Map();
const ROOM_RE = /^[a-z0-9-]{3,32}$/;
const ID_RE = /^[a-z0-9]{6,24}$/;

function broadcast(room, msg, exceptId) {
  const data = JSON.stringify(msg);
  for (const [id, c] of room) {
    if (id !== exceptId && c.ws.readyState === 1) c.ws.send(data);
  }
}

function applyPatch(target, patch) {
  for (const [k, v] of Object.entries(patch)) {
    if (k === '__proto__' || k === 'constructor' || k === 'prototype') continue;
    if (v === null) delete target[k];
    else target[k] = v;
  }
}

function leave(client) {
  if (!client.roomCode) return;
  const room = rooms.get(client.roomCode);
  if (room && room.get(client.id) === client) {
    room.delete(client.id);
    broadcast(room, { t: 'left', id: client.id });
    if (room.size === 0) rooms.delete(client.roomCode);
  }
  client.roomCode = null;
}

const wss = new WebSocketServer({ server, path: '/ws', maxPayload: 32 * 1024 });

wss.on('connection', ws => {
  const client = { ws, id: null, roomCode: null, presence: {}, tokens: MSGS_PER_SECOND * 2, last: Date.now() };
  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });

  ws.on('message', raw => {
    // token bucket rate limit
    const now = Date.now();
    client.tokens = Math.min(MSGS_PER_SECOND * 2, client.tokens + (now - client.last) / 1000 * MSGS_PER_SECOND);
    client.last = now;
    if (client.tokens < 1) return;
    client.tokens -= 1;

    let msg;
    try { msg = JSON.parse(raw); } catch { return; }
    if (!msg || typeof msg !== 'object') return;

    if (msg.t === 'join') {
      if (client.roomCode) return;
      const code = String(msg.room || '').toLowerCase();
      if (!ROOM_RE.test(code)) return ws.send(JSON.stringify({ t: 'error', code: 'bad_room' }));
      let room = rooms.get(code);
      if (!room) {
        if (rooms.size >= MAX_ROOMS) return ws.send(JSON.stringify({ t: 'error', code: 'server_full' }));
        room = new Map();
        rooms.set(code, room);
      }
      let id = String(msg.id || '');
      if (!ID_RE.test(id)) id = crypto.randomBytes(6).toString('hex');
      const existing = room.get(id);
      if (existing) {
        // Same player reconnecting: drop the stale socket quietly.
        existing.roomCode = null;
        try { existing.ws.terminate(); } catch { }
      } else if (room.size >= MAX_PLAYERS_PER_ROOM) {
        return ws.send(JSON.stringify({ t: 'error', code: 'room_full' }));
      }
      client.id = id;
      client.roomCode = code;
      if (msg.p && typeof msg.p === 'object' && JSON.stringify(msg.p).length <= MAX_PRESENCE_BYTES) applyPatch(client.presence, msg.p);
      room.set(id, client);
      const peers = [...room.values()].filter(c => c !== client).map(c => ({ id: c.id, p: c.presence }));
      ws.send(JSON.stringify({ t: 'welcome', id, peers }));
      broadcast(room, { t: 'upd', id, p: client.presence, full: true }, id);
      return;
    }

    if (msg.t === 'pres' && client.roomCode && msg.p && typeof msg.p === 'object') {
      const next = Object.assign({}, client.presence);
      applyPatch(next, msg.p);
      if (JSON.stringify(next).length > MAX_PRESENCE_BYTES) return;
      client.presence = next;
      const room = rooms.get(client.roomCode);
      if (room) broadcast(room, { t: 'upd', id: client.id, p: msg.p }, client.id);
      return;
    }
    // Voice chat setup: pass WebRTC offers, answers and network candidates
    // from one player to another in the same room. The voice itself flows
    // directly between players' browsers, not through this server.
    if (msg.t === 'sig' && client.roomCode && typeof msg.to === 'string') {
      const room = rooms.get(client.roomCode);
      const target = room && room.get(msg.to);
      if (!target || target.ws.readyState !== 1) return;
      const out = JSON.stringify({ t: 'sig', from: client.id, d: msg.d });
      if (out.length <= MAX_SIGNAL_BYTES) target.ws.send(out);
      return;
    }
    // 'ka' (keepalive) needs no reply; it just keeps the host awake.
  });

  ws.on('close', () => leave(client));
  ws.on('error', () => leave(client));
});

// ---------- Ember, the campfire spirit ----------
// A player at the fire asks Ember something. The page sends who is at the fire and
// what was said tonight; this server writes the actual prompt (so the link can't be
// used as a free chatbot), asks the first AI brain that isn't resting, and streams the
// words straight back as plain text. That player's browser then shares the answer with
// everyone at the fire. If every brain is resting, the browser uses Ember's storybook.
const spiritDay = { day: '', count: 0 }; // paid (Claude) answers today
const spiritRooms = new Map(); // room code -> { times: [], inflight }
const spiritIps = new Map();   // ip -> { times: [], last }
const TEN_MIN = 10 * 60 * 1000;
function recent(list) { const cut = Date.now() - TEN_MIN; while (list.length && list[0] < cut) list.shift(); return list; }
setInterval(() => {
  for (const [k, v] of spiritRooms) if (!v.inflight && !recent(v.times).length) spiritRooms.delete(k);
  for (const [k, v] of spiritIps) if (!recent(v.times).length) spiritIps.delete(k);
}, TEN_MIN);
function paidAllowed() {
  const day = new Date().toISOString().slice(0, 10);
  if (spiritDay.day !== day) { spiritDay.day = day; spiritDay.count = 0; }
  return !SPIRIT_DAILY_LIMIT || spiritDay.count < SPIRIT_DAILY_LIMIT;
}
const canUse = b => !b.paid || paidAllowed();

function spiritHandler(req, res) {
  const reply = (code, obj) => { if (!res.headersSent) { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(obj)); } };
  if (!Brains.chain.length) return reply(503, { error: 'no_ai' });
  let body = '', tooBig = false;
  req.setEncoding('utf8');
  req.on('data', c => { body += c; if (body.length > 16 * 1024 && !tooBig) { tooBig = true; reply(413, { error: 'too_big' }); req.destroy(); } });
  req.on('end', async () => {
    if (tooBig) return;
    let input;
    try { input = JSON.parse(body); } catch { return reply(400, { error: 'bad_json' }); }
    if (!input || typeof input !== 'object') return reply(400, { error: 'bad_json' });
    // only for lobbies that really have someone in them right now
    const code = String(input.room || '').toLowerCase();
    if (!ROOM_RE.test(code) || !rooms.has(code)) return reply(403, { error: 'no_room' });
    const ip = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '?').split(',')[0].trim();
    const now = Date.now();
    const ru = spiritRooms.get(code) || { times: [], inflight: 0 };
    const iu = spiritIps.get(ip) || { times: [], last: 0 };
    spiritRooms.set(code, ru); spiritIps.set(ip, iu);
    if (ru.inflight >= 2 || now - iu.last < 1500) return reply(429, { error: 'busy' });
    if (recent(ru.times).length >= 60 || recent(iu.times).length >= 40) return reply(429, { error: 'limit' });

    const p = Brain.build(input);
    ru.inflight++; ru.times.push(now); iu.times.push(now); iu.last = now;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 45000);
    res.on('close', () => { if (!res.writableFinished) ctrl.abort(); });
    try {
      const got = await Brains.ask(p, ctrl.signal, canUse);
      if (!got) return reply(429, { error: 'resting', retry: Brains.retryIn(canUse) });
      if (got.brain.paid) spiritDay.count++;
      res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-cache', 'X-Accel-Buffering': 'no', 'X-Ember-Brain': got.brain.id });
      res.write(got.first);
      for await (const piece of got.rest) res.write(piece);
      res.end();
    } catch (e) {
      if (!res.headersSent) reply(502, { error: 'upstream' });
      else res.end();
      if (e && e.name !== 'AbortError') console.warn('Ember request failed:', e.message);
    } finally {
      clearTimeout(timer);
      ru.inflight--;
    }
  });
}

// Drop connections that stopped answering pings.
setInterval(() => {
  for (const ws of wss.clients) {
    if (!ws.isAlive) { ws.terminate(); continue; }
    ws.isAlive = false;
    try { ws.ping(); } catch { }
  }
}, 30000);

server.listen(PORT, () => {
  console.log(`Campfire is running on http://localhost:${PORT}`);
  console.log(Brains.describe());
});
