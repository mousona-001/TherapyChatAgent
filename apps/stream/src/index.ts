import 'dotenv/config';
import * as http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { URL } from 'url';
import { StreamHandler } from './stream-handler';

const PORT = parseInt(process.env.STREAM_PORT ?? '3002', 10);

// Surface unhandled promise rejections instead of silently dying
process.on('unhandledRejection', (reason) => {
  console.error('[Process] ❌ Unhandled rejection:', reason);
});

const server = http.createServer((req, res) => {
  console.log(`[HTTP] ${req.method} ${req.url}`);
  res.writeHead(200);
  res.end('Crisis Stream Service — OK');
});

const wss = new WebSocketServer({ server });

wss.on('connection', (ws: WebSocket, req) => {
  const rawUrl = req.url ?? '/';
  const url = new URL(rawUrl, `http://localhost:${PORT}`);
  const path = url.pathname;

  console.log(`[WS] Incoming connection: path=${path} headers=${JSON.stringify({
    upgrade: req.headers['upgrade'],
    host: req.headers['host'],
    origin: req.headers['origin'],
  })}`);

  if (path !== '/crisis/stream') {
    console.warn(`[WS] Rejected unknown path: ${path}`);
    ws.close(1008, 'Unknown path');
    return;
  }

  console.log('[WS] ✅ Accepted Twilio Media Stream connection');
  new StreamHandler(ws);
});

wss.on('error', (err) => {
  console.error('[WSServer] ❌ Server error:', err);
});

server.listen(PORT, () => {
  console.log(`🎙️  Crisis Stream Microservice listening on ws://localhost:${PORT}/crisis/stream`);
  console.log(`   ENV check: DEEPGRAM=${!!process.env.DEEPGRAM_API_KEY} ELEVENLABS=${!!process.env.ELEVENLABS_API_KEY} GROQ=${!!process.env.GROQ_API_KEY} REDIS=${process.env.REDIS_URL}`);
});
