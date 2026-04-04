"use client";
import { useCallback, useEffect, useRef, useState } from "react";

import { getChatToken } from "@/app/onboarding/actions";
import { env } from "@/config/env";
import { io, Socket } from "socket.io-client";

interface ChatMessage {
	id?: string;
	role: "user" | "assistant" | "patient" | "therapist";
	content: string;
	senderId?: string;
	createdAt?: string;
}

export function useChatSocket(
	sessionId: string,
	currentUserRole: "patient" | "therapist" = "patient",
	currentUserId?: string | null,
	otherPartyId?: string | null,
) {
	const [messages, setMessages] = useState<ChatMessage[]>([]);
	const [isConnected, setIsConnected] = useState(false);
	const [isTyping, setIsTyping] = useState(false);
	const [streamingMessage, setStreamingMessage] = useState<string | null>(null);
	const [isAiActive, setIsAiActive] = useState(true);
	const [handoffMessage, setHandoffMessage] = useState<string | null>(null);
	const [presenceStatus, setPresenceStatus] = useState<
		"online" | "offline" | null
	>(null);
	const socketRef = useRef<Socket | null>(null);
	const currentUserIdRef = useRef<string | null | undefined>(currentUserId);
	const otherPartyIdRef = useRef<string | null | undefined>(otherPartyId);
	const sessionIdRef = useRef(sessionId);
	const currentUserRoleRef = useRef(currentUserRole);
	useEffect(() => {
		currentUserIdRef.current = currentUserId;
	}, [currentUserId]);
	useEffect(() => {
		otherPartyIdRef.current = otherPartyId;
	}, [otherPartyId]);
	useEffect(() => {
		sessionIdRef.current = sessionId;
	}, [sessionId]);
	useEffect(() => {
		currentUserRoleRef.current = currentUserRole;
	}, [currentUserRole]);

	useEffect(() => {
		if (!sessionId) return;
		if (socketRef.current?.connected) return;

		// Use a closure-local flag so each effect invocation can be independently
		// cancelled by its own cleanup. This prevents the Strict-Mode double-connect
		// where two async invocations race after the `await getChatToken()`.
		let cancelled = false;

		(async () => {
			const result = await getChatToken();
			if (cancelled) return; // cleanup fired while we were awaiting — bail out

			if (!result.success || !result.data?.token) {
				console.error("[WS] Auth Failed:", result.error);
				return;
			}

			const socket = io(`${env.NEXT_PUBLIC_API_URL}/chat`, {
				auth: { token: result.data.token },
				transports: ["websocket"],
				reconnectionAttempts: 5,
			});

			if (cancelled) {
				socket.disconnect();
				return;
			}

			socketRef.current = socket;

			socket.on("connect", () => {
				if (cancelled) {
					socket.disconnect();
					return;
				}
				setIsConnected(true);
				console.log(`[WS] Connected to session: ${sessionId}`);
				socket.emit("chat:join", { sessionId });
			});

			socket.on("disconnect", () => {
				setIsConnected(false);
				console.log("[WS] Disconnected from chat");
			});

			socket.on("chat:message", (msg: ChatMessage) => {
				console.log("[WS] Received message:", msg);
				setMessages((prev) => {
					if (msg.id && prev.some((m) => m.id === msg.id)) return prev;
					// Replace matching optimistic message (same sender + content, no timestamp yet)
					for (let i = prev.length - 1; i >= 0; i--) {
						if (
							!prev[i].createdAt &&
							prev[i].content === msg.content &&
							prev[i].senderId === msg.senderId
						) {
							const next = [...prev];
							next[i] = msg;
							return next;
						}
					}
					return [...prev, msg];
				});
			});

			socket.on("chat:token", ({ token }: { token: string }) => {
				setStreamingMessage((prev) => (prev || "") + token);
			});

			socket.on("chat:message_complete", (msg: ChatMessage) => {
				setMessages((prev) => {
					if (msg.id && prev.some((m) => m.id === msg.id)) return prev;
					return [...prev, msg];
				});
				setStreamingMessage(null);
			});

			socket.on(
				"chat:ai_mode",
				({ active, reason }: { active: boolean; reason?: string }) => {
					setIsAiActive(active);
					if (reason) setHandoffMessage(reason);
					setTimeout(() => setHandoffMessage(null), 5000);
				},
			);

			socket.on("chat:therapist_joined", ({ message }: { message: string }) => {
				setIsAiActive(false);
				setHandoffMessage(message);
				setTimeout(() => setHandoffMessage(null), 5000);
			});

			socket.on(
				"presence:update",
				({
					userId,
					status,
				}: {
					userId: string;
					status: "online" | "offline";
				}) => {
					if (userId === otherPartyIdRef.current) {
						setPresenceStatus(status);
					}
				},
			);

			socket.on("chat:typing", ({ senderId }: { senderId: string }) => {
				if (senderId === currentUserIdRef.current) return;
				setIsTyping(true);
				setTimeout(() => setIsTyping(false), 3000);
			});

			socket.on("error", (err: any) => {
				console.error("[WS] Socket Error:", err.message);
			});
		})();

		return () => {
			cancelled = true;
			if (socketRef.current) {
				console.log(`[WS] Leaving session: ${sessionId}`);
				socketRef.current.emit("chat:leave", { sessionId });
				socketRef.current.disconnect();
				socketRef.current = null;
			}
		};
	}, [sessionId]);

	const sendMessage = useCallback((content: string) => {
		const sid = sessionIdRef.current;
		const uid = currentUserIdRef.current;
		const role = currentUserRoleRef.current;
		if (socketRef.current?.connected) {
			socketRef.current.emit("chat:message", { sessionId: sid, content });
			const optimisticRole = role === "patient" ? "user" : "therapist";
			setMessages((prev) => [
				...prev,
				{
					role: optimisticRole,
					content,
					senderId: uid || undefined,
				},
			]);
		} else {
			console.warn("[WS] Cannot send message: not connected");
		}
	}, []);

	const lastTypingEmitRef = useRef<number>(0);

	const sendTyping = useCallback(() => {
		const now = Date.now();
		// Throttle: emit at most once per 1 500 ms
		if (now - lastTypingEmitRef.current < 1500) return;
		lastTypingEmitRef.current = now;
		if (socketRef.current?.connected) {
			socketRef.current.emit("chat:typing", {
				sessionId: sessionIdRef.current,
			});
		}
	}, []);

	return {
		messages,
		setMessages,
		isConnected,
		isTyping,
		streamingMessage,
		isAiActive,
		handoffMessage,
		presenceStatus,
		setPresenceStatus,
		sendMessage,
		sendTyping,
	};
}
