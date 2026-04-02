"use client"
import { Suspense, useEffect, useState } from "react";


import { DashboardLayout } from "@/features/dashboard/components/DashboardLayout";
import { getChatSessions, createChatSession } from "../onboarding/actions";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@repo/ui";

function ChatPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
     async function load() {
        const connectionId = searchParams.get('connectionId');
        
        try {
           // If we have a connectionId, prioritize creating/getting that session
           if (connectionId) {
              const res = await createChatSession(connectionId);
              if (res.success && res.data) {
                 router.push(`/chat/${res.data.sessionId || res.data.id}`);
                 return;
              }
           }

           // Fallback: Redirect to the first existing session if no specific connection requested
           const result = await getChatSessions();
           if (!connectionId && result.success && result.data && result.data.length > 0) {
              router.push(`/chat/${result.data[0].id}`);
           } else {
              setLoading(false);
           }
        } catch (e) {
           console.error("Chat loading error:", e);
           setLoading(false);
        }
     }
     load();
  }, [router, searchParams]);

  const handleStartAiChat = async () => {
     setLoading(true);
     try {
        const result = await createChatSession(); // AI-only session
        if (result.success && result.data) {
           router.push(`/chat/${result.data.sessionId || result.data.id}`);
        }
     } catch (e) {
        console.error("Failed to start AI chat:", e);
        setLoading(false);
     }
  };

   return (
    <DashboardLayout>
       <div className="h-full flex flex-col items-center justify-center text-center p-8 bg-[var(--surface-container-lowest)] rounded-[32px] border border-[var(--outline-variant)] border-dashed">
          <div className="w-16 h-16 rounded-3xl bg-indigo-50 flex items-center justify-center text-indigo-500 mb-6">
             <div className="animate-pulse text-2xl">✨</div>
          </div>
          <h2 className="text-xl font-bold text-[var(--on-surface)] mb-2">Select a conversation</h2>
          <p className="text-[0.85rem] text-[var(--on-surface-variant)] max-w-[300px] mb-8 leading-relaxed opacity-60">
             Choose a therapist from the sidebar or start a new AI consultation to begin.
          </p>
          
          <button 
             onClick={handleStartAiChat}
             disabled={loading}
             className="px-8 py-3 bg-[var(--primary)] text-white rounded-full font-bold shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all text-sm disabled:opacity-50"
          >
             {loading ? "Preparing..." : "Start New AI Consultation"}
          </button>
       </div>
    </DashboardLayout>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={
       <DashboardLayout>
          <div className="h-full flex items-center justify-center p-20">
             <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-500" />
          </div>
       </DashboardLayout>
    }>
      <ChatPageContent />
    </Suspense>
  );
}
