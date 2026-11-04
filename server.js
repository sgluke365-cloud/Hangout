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
const MSGS_PER_SECOND = 40; // per player, with a burst of 2x

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

const wss = new WebSocketServer({ server, path: '/ws', maxPayload: 8 * 1024 });

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
    // 'ka' (keepalive) needs no reply; it just keeps the host awake.
  });

  ws.on('close', () => leave(client));
  ws.on('error', () => leave(client));
});

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
});
