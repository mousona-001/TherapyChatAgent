"use client";
import { getChatToken } from "@/app/onboarding/actions";
import { env } from "@/config/env";
import { useCallback, useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

export type PresenceStatus = "online" | "busy" | "unavailable" | "offline";

/**
 * Lightweight presence-only socket hook.
 * Connects to the /chat namespace on mount so the server marks the current
 * user as "online" in the DB, and listens to `presence:update` broadcasts
 * so the caller can maintain a live userId → status map.
 *
 * Returns { presenceMap, setStatus } where setStatus emits status:set to the
 * server (therapist-only — server will reject patients).
 */
export function usePresenceSocket() {
	const [presenceMap, setPresenceMap] = useState<
		Record<string, PresenceStatus>
	>({});
	const socketRef = useRef<Socket | null>(null);

	const connect = useCallback(async () => {
		if (socketRef.current?.connected) return;

		const result = await getChatToken();
		if (!result.success || !result.data?.token) return;

		const socket = io(`${env.NEXT_PUBLIC_API_URL}/chat`, {
			auth: { token: result.data.token },
			transports: ["websocket"],
			reconnectionAttempts: 5,
		});

		socket.on(
			"presence:update",
			({ userId, status }: { userId: string; status: PresenceStatus }) => {
				setPresenceMap((prev) => ({ ...prev, [userId]: status }));
			},
		);

		socketRef.current = socket;
	}, []);

	useEffect(() => {
		connect();
		return () => {
			socketRef.current?.disconnect();
			socketRef.current = null;
		};
	}, [connect]);

	const setStatus = useCallback((status: PresenceStatus) => {
		if (!socketRef.current?.connected) return;
		socketRef.current.emit("status:set", { status });
	}, []);

	return { presenceMap, setStatus };
}
