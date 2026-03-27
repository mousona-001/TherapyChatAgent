import 'dotenv/config';
import * as http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { URL } from 'url';
import { StreamHandler } from './stream-handler';

const PORT = parseInt(process.env.STREAM_PORT ?? '3002', 10);

const server = http.createServer((_req, res) => {
  res.writeHead(200);
  res.end('Crisis Stream Service — OK');
});

const wss = new WebSocketServer({ server });

wss.on('connection', (ws: WebSocket, req) => {
  const url = new URL(req.url ?? '/', `http://localhost:${PORT}`);
  const path = url.pathname;

  if (path !== '/crisis/stream') {
    ws.close(1008, 'Unknown path');
    return;
  }

  console.log(`[Stream] New Twilio connection on ${path}`);
  new StreamHandler(ws);
});

server.listen(PORT, () => {
  console.log(`🎙️  Crisis Stream Microservice running on ws://localhost:${PORT}/crisis/stream`);
});
