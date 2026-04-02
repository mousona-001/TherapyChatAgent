"use client";
import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { getChatToken } from "@/app/onboarding/actions";
import { env } from "@/config/env";

/**
 * Connects to the /chat Socket.IO namespace and tracks real-time
 * presence:update events, returning a map of userId → "online" | "offline".
 */
export function usePresence(watchIds: string[]) {
	const [statusMap, setStatusMap] = useState<
		Record<string, "online" | "offline">
	>({});
	const socketRef = useRef<Socket | null>(null);
	const watchIdsRef = useRef(watchIds);

	useEffect(() => {
		watchIdsRef.current = watchIds;
	});

	useEffect(() => {
		let cancelled = false;

		async function connect() {
			const result = await getChatToken();
			if (cancelled || !result.success || !result.data?.token) return;

			const socket = io(`${env.NEXT_PUBLIC_API_URL}/chat`, {
				auth: { token: result.data.token },
				transports: ["websocket"],
				reconnectionAttempts: 5,
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
					if (watchIdsRef.current.includes(userId)) {
						setStatusMap((prev) => ({ ...prev, [userId]: status }));
					}
				},
			);

			socketRef.current = socket;
		}

		connect();

		return () => {
			cancelled = true;
			socketRef.current?.disconnect();
			socketRef.current = null;
		};
	}, []); // connect once on mount

	return statusMap;
}
