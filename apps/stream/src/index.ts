import "dotenv/config";
import * as http from "http";
import { URL } from "url";
import { WebSocket, WebSocketServer } from "ws";
import { StreamHandler } from "./stream-handler";

const PORT = parseInt(process.env.STREAM_PORT ?? "3002", 10);

function ts(): string {
	return new Date().toISOString();
}

function log(message: string): void {
	console.log(`[${ts()}] ${message}`);
}

function error(message: string, ...args: unknown[]): void {
	console.error(`[${ts()}] ${message}`, ...args);
}

// Surface unhandled promise rejections instead of silently dying
process.on("unhandledRejection", (reason) => {
	error("[Process] ❌ Unhandled rejection:", reason);
});

const server = http.createServer((req, res) => {
	log(`[HTTP] ${req.method} ${req.url}`);
	res.writeHead(200);
	res.end("Crisis Stream Service — OK");
});

const wss = new WebSocketServer({ server });

wss.on("connection", (ws: WebSocket, req) => {
	const rawUrl = req.url ?? "/";
	const url = new URL(rawUrl, `http://localhost:${PORT}`);
	const path = url.pathname;

	log(
		`[WS] Incoming connection: path=${path} headers=${JSON.stringify({
			upgrade: req.headers["upgrade"],
			host: req.headers["host"],
			origin: req.headers["origin"],
		})}`,
	);

	if (path !== "/crisis/stream") {
		log(`[WS] Rejected unknown path: ${path}`);
		ws.close(1008, "Unknown path");
		return;
	}

	log("[WS] ✅ Accepted Twilio Media Stream connection");
	new StreamHandler(ws);
});

wss.on("error", (err) => {
	error("[WSServer] ❌ Server error:", err);
});

server.listen(PORT, () => {
	log(
		`🎙️  Crisis Stream Microservice listening on ws://localhost:${PORT}/crisis/stream`,
	);
	log(
		`   ENV check: DEEPGRAM=${!!process.env.DEEPGRAM_API_KEY} ELEVENLABS=${!!process.env.ELEVENLABS_API_KEY} GROQ=${!!process.env.GROQ_API_KEY} REDIS=${process.env.REDIS_URL}`,
	);

	// Validate Deepgram API key immediately at startup — a bad key causes an opaque
	// "non-101 status code" error on every call. Surface it here with the actual HTTP status.
	const key = process.env.DEEPGRAM_API_KEY;
	if (key) {
		fetch("https://api.deepgram.com/v1/projects", {
			headers: { Authorization: `Token ${key}` },
		})
			.then((r) => {
				if (r.ok) {
					log("[Deepgram] ✅ API key is valid");
				} else {
					error(
						`[Deepgram] ❌ API key check failed — HTTP ${r.status}. The key in .env is invalid or expired. Update DEEPGRAM_API_KEY.`,
					);
				}
			})
			.catch((e) => {
				log(
					`[Deepgram] ⚠️  Could not validate key (network): ${e.message}`,
				);
			});
	}
});
