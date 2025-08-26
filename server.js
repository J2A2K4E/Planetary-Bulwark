import express from 'express';
import compression from 'compression';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import { nanoid } from 'nanoid';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(compression());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// In-memory persistence for demo
const sessions = new Map(); // sessionId -> { save }
const telemetry = [];
const lobbies = new Map(); // lobbyId -> { players: Set<sessionId> }

app.post('/api/session', (req, res) => {
const sessionId = nanoid();
sessions.set(sessionId, { save: null, createdAt: Date.now() });
res.json({ sessionId });
});

app.post('/api/save', (req, res) => {
const { sessionId, save } = req.body || {};
if (!sessionId || !sessions.has(sessionId)) {
return res.status(400).json({ error: 'invalid session' });
}
sessions.get(sessionId).save = save;
res.json({ ok: true });
});

app.get('/api/load', (req, res) => {
const { sessionId } = req.query;
if (!sessionId || !sessions.has(sessionId)) {
return res.status(400).json({ error: 'invalid session' });
}
res.json({ save: sessions.get(sessionId).save });
});

app.post('/api/telemetry', (req, res) => {
telemetry.push({ t: Date.now(), ...req.body });
res.json({ ok: true });
});

app.get('/api/telemetry', (req, res) => {
res.json({ telemetry });
});

// Minimal lobby endpoints (extend later for coop)
app.post('/api/lobby/create', (req, res) => {
const lobbyId = nanoid(8);
lobbies.set(lobbyId, { players: new Set() });
res.json({ lobbyId });
});

app.post('/api/lobby/join', (req, res) => {
const { lobbyId, sessionId } = req.body || {};
if (!lobbies.has(lobbyId) || !sessions.has(sessionId)) {
return res.status(400).json({ error: 'invalid lobby or session' });
}
lobbies.get(lobbyId).players.add(sessionId);
res.json({ ok: true });
});

// WebSocket for live events (future coop / spectate)
const server = app.listen(3000, () => {
console.log('Planetary Bulwark server running on http://localhost:3000');
});
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
ws.send(JSON.stringify({ type: 'hello', ts: Date.now() }));
ws.on('message', (data) => {
try {
const msg = JSON.parse(data);
// Echo minimal real-time events; extend to handle coop sync
if (msg.type === 'ping') {
ws.send(JSON.stringify({ type: 'pong', t: msg.t, now: Date.now() }));
}
} catch {}
});
});

process.on('SIGINT', () => {
console.log('Shutting down...');
server.close(() => process.exit(0));
});


