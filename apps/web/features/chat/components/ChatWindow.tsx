"use client"
import { useEffect, useRef, useState } from "react";

import { Button } from "@repo/ui";
import { PaperPlaneRight, User, Sparkle, CaretLeft } from "@phosphor-icons/react";
import { cn } from "@repo/ui";
import Link from "next/link";
import { getMessages } from "@/app/onboarding/actions";
import { useChatSocket } from "../hooks/useChatSocket";

interface ChatMessage {
  role: 'user' | 'assistant' | 'patient' | 'therapist';
  content: string;
  senderId?: string;
}

interface ChatWindowProps {
  sessionId: string;
  currentUserRole: 'patient' | 'therapist';
  currentUserId?: string | null;
  title?: string;
  otherPartyId?: string | null;
  initialStatus?: 'online' | 'offline' | null;
}

export function ChatWindow({ 
  sessionId, 
  currentUserRole,
  currentUserId,
  title = "Conversation", 
  otherPartyId, 
  initialStatus 
}: ChatWindowProps) {
   const { 
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
  } = useChatSocket(sessionId, currentUserRole, currentUserId, otherPartyId);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Sync initial status
  useEffect(() => {
    if (initialStatus) setPresenceStatus(initialStatus);
  }, [initialStatus, setPresenceStatus]);

  // Load history on mount
  useEffect(() => {
    async function load() {
      if (!sessionId) return;
      try {
        const result = await getMessages(sessionId);
        if (result.success && result.data) {
          setMessages(result.data);
        }
      } catch (e) {
        console.error("Failed to load history:", e);
      }
    }
    load();
  }, [sessionId, setMessages]);

  // Scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streamingMessage, isTyping, handoffMessage, presenceStatus]);

  const handleSend = () => {
    if (!input.trim() || !isConnected) return;
    sendMessage(input.trim());
    setInput("");
  };

  return (
    <div className="flex flex-col h-full bg-[var(--surface)] overflow-hidden">
       {/* Header */}
       <header className="px-6 py-4 border-b border-[var(--outline-variant)] flex items-center justify-between bg-[rgba(255,255,255,0.8)] backdrop-blur-sm sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <Link href="/chat" className="md:hidden p-2 hover:bg-[var(--surface-container-low)] rounded-full text-[var(--on-surface-variant)]">
               <CaretLeft size={20} weight="bold" />
            </Link>
            <div className="flex items-center gap-3">
               <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 border border-indigo-200">
                  <User size={20} weight="fill" />
               </div>
               <div>
                  <h2 className="text-sm font-bold text-[var(--on-surface)] leading-tight">{title}</h2>
                  {otherPartyId && (
                    <div className="flex items-center gap-1.5 mt-0.5">
                       <div className={cn(
                          "w-1.5 h-1.5 rounded-full transition-colors", 
                          presenceStatus === 'online' ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-slate-300"
                        )} />
                       <span className="text-[0.65rem] text-[var(--on-surface-variant)] font-medium">
                          {presenceStatus === 'online' ? "Online" : "Offline"}
                       </span>
                    </div>
                  )}
                  {!otherPartyId && (
                    <div className="flex items-center gap-1.5 mt-0.5">
                       <div className={cn("w-1.5 h-1.5 rounded-full transition-colors", isConnected ? "bg-green-500 animate-pulse" : "bg-red-400")} />
                       <span className="text-[0.65rem] text-[var(--on-surface-variant)] font-medium">
                          {isConnected ? "Secure Connection" : "Connecting..."}
                       </span>
                    </div>
                  )}
               </div>
            </div>
          </div>

          <div className={cn(
            "hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all duration-500",
            isAiActive 
              ? "bg-[var(--surface-container-low)] border-[var(--outline-variant)]"
              : "bg-emerald-50 border-emerald-100 text-emerald-700"
          )}>
                {isAiActive ? (
                  <>
                    <Sparkle weight="fill" size={14} className="text-[var(--primary)]" />
                    <span className="text-[0.65rem] font-bold text-[var(--on-surface-variant)] uppercase tracking-wider">AI Support Active</span>
                  </>
                ) : (
                  <>
                    <User weight="fill" size={14} />
                    <span className="text-[0.65rem] font-bold uppercase tracking-wider">Clinician Active</span>
                  </>
                )}
          </div>
       </header>

       {/* Messages */}
       <div 
        ref={scrollRef} 
        className="flex-1 overflow-y-auto p-6 space-y-6 bg-[var(--surface-container-lowest)] scroll-smooth customize-scrollbar"
       >
          {messages.length === 0 && !streamingMessage && (
            <div className="h-full flex flex-col items-center justify-center text-[var(--on-surface-variant)] opacity-40 gap-4 text-center">
               <div className="w-16 h-16 rounded-3xl bg-[var(--surface-container-low)] flex items-center justify-center text-[var(--primary)] text-indigo-400">
                  <Sparkle size={32} weight="fill" />
               </div>
               <p className="text-sm font-medium">Begin your journey here.<br/>Your conversation is private.</p>
            </div>
          )}
          
          {messages.map((msg: any, i: number) => {
             if (msg.role === 'system') {
               return (
                 <div key={i} className="mx-auto w-fit px-4 py-1.5 bg-indigo-50/50 border border-indigo-100/50 rounded-full text-[0.65rem] text-indigo-500 font-bold uppercase tracking-wider animate-in fade-in zoom-in duration-300 flex items-center gap-2">
                    <div className="w-1 h-1 rounded-full bg-indigo-300" />
                    {msg.content}
                 </div>
               );
             }

             const isMe = currentUserId && (
               msg.senderId === currentUserId || 
               (msg.senderId === 'assistant' && currentUserRole === 'therapist')
             );

             return (
               <div key={i} className={cn("flex flex-col animate-in fade-in slide-in-from-bottom-2 duration-500", isMe ? "items-end" : "items-start")}>
                  <div className={cn(
                     "max-w-[85%] sm:max-w-[70%] p-4 rounded-2xl text-[0.9rem] leading-relaxed shadow-sm transition-all",
                     isMe 
                      ? "bg-[var(--primary)] text-white rounded-tr-none" 
                      : "bg-white text-[var(--on-surface)] border border-[var(--outline-variant)] rounded-tl-none shadow-indigo-100/20"
                  )}>
                     {msg.content}
                  </div>
                  <span className="mt-2 text-[0.6rem] text-[var(--on-surface-variant)] opacity-50 px-1 font-bold uppercase tracking-tighter">
                     {msg.senderId === 'assistant' 
                         ? "Therapist Assistant" 
                         : (isMe ? "You" : (currentUserRole === 'patient' ? "Therapist" : "Patient"))}
                  </span>
               </div>
             );
          })}

          {/* AI Streaming Message */}
          {streamingMessage && (
             <div className="flex flex-col items-start animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="bg-white p-4 rounded-2xl rounded-tl-none border border-[var(--outline-variant)] text-[0.9rem] shadow-sm max-w-[85%] sm:max-w-[70%] text-[var(--on-surface)]">
                   {streamingMessage}
                   <span className="w-1.5 h-4 bg-[var(--primary)] inline-block ml-1 animate-pulse align-middle" />
                </div>
                <span className="mt-2 text-[0.6rem] text-[var(--on-surface-variant)] opacity-50 px-1 font-bold uppercase tracking-tighter">
                   Therapist Assistant
                </span>
             </div>
          )}
          
          {isTyping && !streamingMessage && (
             <div className="flex flex-col items-start animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="bg-white p-4 rounded-2xl rounded-tl-none border border-[var(--outline-variant)] flex items-center gap-3 shadow-sm scale-90 origin-left opacity-70">
                   <div className="flex gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-[var(--primary)] animate-bounce [animation-delay:-0.3s]" />
                      <div className="w-1.5 h-1.5 rounded-full bg-[var(--primary)] animate-bounce [animation-delay:-0.15s]" />
                      <div className="w-1.5 h-1.5 rounded-full bg-[var(--primary)] animate-bounce" />
                   </div>
                   <span className="text-[0.7rem] text-[var(--on-surface-variant)] font-medium italic">Reflecting...</span>
                </div>
             </div>
          )}

          {/* Handoff Notification Banner (Transient) */}
          {handoffMessage && (
             <div className="mx-auto w-fit px-4 py-1.5 bg-indigo-50/80 border border-indigo-100 rounded-full text-[0.65rem] text-indigo-500 font-bold uppercase tracking-wider animate-in fade-in zoom-in slide-in-from-bottom-2 duration-500 flex items-center gap-2 my-2 shadow-sm sticky bottom-2 z-10">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                {handoffMessage}
             </div>
          )}
       </div>

       {/* Input Area */}
       <div className="p-4 bg-white/80 backdrop-blur-xl border-t border-[var(--outline-variant)]">
          <div className="max-w-[900px] mx-auto relative">
            <div className="flex items-center gap-3 bg-[var(--surface-container-low)] p-2 rounded-[24px] border border-[var(--outline-variant)] focus-within:ring-4 focus-within:ring-primary/5 focus-within:border-[var(--primary-container)] focus-within:bg-white transition-all group shadow-sm">
               <input 
                 type="text" 
                 value={input}
                 onChange={e => {
                    setInput(e.target.value);
                    if (e.target.value.length % 5 === 0) sendTyping();
                 }}
                 onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                 }}
                 placeholder="Share how you're feeling today..."
                 className="flex-1 bg-transparent border-none outline-none py-3 px-4 text-[0.95rem] text-[var(--on-surface)] placeholder:text-[var(--on-surface-variant)]/30"
               />
               <Button 
                 size="icon" 
                 className={cn(
                   "rounded-2xl w-12 h-12 shadow-lg transition-all active:scale-95",
                   input.trim() && isConnected ? "bg-[var(--primary)] shadow-primary/20" : "bg-[var(--surface-container-high)] text-[var(--on-surface-variant)] grayscale opacity-50 cursor-not-allowed"
                 )}
                 onClick={handleSend}
                 disabled={!input.trim() || !isConnected}
               >
                  <PaperPlaneRight weight="bold" size={20} />
               </Button>
            </div>
          </div>
          <p className="text-center text-[0.6rem] text-[var(--on-surface-variant)] mt-4 font-bold opacity-30 uppercase tracking-[0.2em]">
             Confidential Messaging Session
          </p>
       </div>
    </div>
  );
}

// Helper to avoid build error if ChatCircleText is missing in some contexts
function ChatCircleText(props: any) {
  return <Sparkle {...props} /> 
}
