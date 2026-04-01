"use client"
import { useCallback, useEffect, useRef, useState } from "react";

import { io, Socket } from "socket.io-client";
import { getChatToken } from "@/app/onboarding/actions";
import { env } from "@/config/env";

interface ChatMessage {
  role: 'user' | 'assistant' | 'patient' | 'therapist';
  content: string;
  senderId?: string;
}

export function useChatSocket(
  sessionId: string, 
  currentUserRole: 'patient' | 'therapist' = 'patient', 
  currentUserId?: string | null,
  otherPartyId?: string | null
) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState<string | null>(null);
  const [isAiActive, setIsAiActive] = useState(true);
  const [handoffMessage, setHandoffMessage] = useState<string | null>(null);
  const [presenceStatus, setPresenceStatus] = useState<'online' | 'offline' | null>(null);
  const socketRef = useRef<Socket | null>(null);

  const connect = useCallback(async () => {
    if (socketRef.current?.connected) return;

    // 1. Get auth token from server action
    const result = await getChatToken();
    if (!result.success || !result.data?.token) {
      console.error("[WS] Auth Failed:", result.error);
      return;
    }

    // 2. Connect to /chat namespace
    const socket = io(`${env.NEXT_PUBLIC_API_URL}/chat`, {
      auth: { token: result.data.token },
      transports: ["websocket"],
      reconnectionAttempts: 5,
    });

    socket.on("connect", () => {
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
      setMessages(prev => [...prev, msg]);
    });

    socket.on("chat:token", ({ token }: { token: string }) => {
      setStreamingMessage(prev => (prev || "") + token);
    });

    socket.on("chat:message_complete", (msg: ChatMessage) => {
      setMessages(prev => [...prev, msg]);
      setStreamingMessage(null);
    });

    socket.on("chat:ai_mode", ({ active, reason }: { active: boolean; reason?: string }) => {
      setIsAiActive(active);
      if (reason) setHandoffMessage(reason);
      // Clear handoff message after 5 seconds
      setTimeout(() => setHandoffMessage(null), 5000);
    });

    socket.on("chat:therapist_joined", ({ message }: { message: string }) => {
      setIsAiActive(false);
      setHandoffMessage(message);
      setTimeout(() => setHandoffMessage(null), 5000);
    });

    socket.on("presence:update", ({ userId, status }: { userId: string, status: 'online' | 'offline' }) => {
      if (userId === otherPartyId) {
        setPresenceStatus(status);
      }
    });

    socket.on("chat:typing", () => {
      setIsTyping(true);
      // Auto-clear typing after 3 seconds
      setTimeout(() => setIsTyping(false), 3000);
    });

    socket.on("error", (err: any) => {
      console.error("[WS] Socket Error:", err.message);
    });

    socketRef.current = socket;
  }, [sessionId, otherPartyId]);

  useEffect(() => {
    if (!sessionId) return;
    connect();
    
    return () => {
      if (socketRef.current) {
        console.log(`[WS] Leaving session: ${sessionId}`);
        socketRef.current.emit("chat:leave", { sessionId });
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [connect, sessionId]);

  const sendMessage = useCallback((content: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit("chat:message", { sessionId, content });
      // Optimistic update for the sender (patient/therapist)
      const optimisticRole = currentUserRole === 'patient' ? 'user' : 'therapist';
      setMessages(prev => [...prev, { 
        role: optimisticRole, 
        content, 
        senderId: currentUserId || undefined 
      }]);
    } else {
      console.warn("[WS] Cannot send message: not connected");
    }
  }, [sessionId, currentUserId, currentUserRole]);

  const sendTyping = useCallback(() => {
    if (socketRef.current?.connected) {
      socketRef.current.emit("chat:typing", { sessionId });
    }
  }, [sessionId]);

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
    sendTyping
  };
}
