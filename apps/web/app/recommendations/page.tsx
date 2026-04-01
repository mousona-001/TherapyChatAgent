"use client"
import { useEffect, useState } from "react";


import { DashboardLayout } from "@/features/dashboard/components/DashboardLayout";
import { Button } from "@repo/ui";
import { useRouter } from "next/navigation";
import { Star, ChatTeardropText, Sparkle, ChatCircleText } from "@phosphor-icons/react";
import { getTherapistRecommendations, createConnection, createChatSession, getConnections } from "../onboarding/actions";

interface Therapist {
  therapistId: string;
  name: string;
  specializations: string;
  rating: string | number;
  score: number;
}

export default function RecommendationsPage() {
  const router = useRouter();
  const [therapists, setTherapists] = useState<Therapist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const { data, error: apiError } = await getTherapistRecommendations();
        if (apiError) throw new Error(apiError);
        setTherapists(data || []);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load matches");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleChatStart = async (therapistId: string) => {
    setLoading(true);
    try {
      // 1. Request connection (backend handles duplicates)
      const { data: conn, error: connError } = await createConnection(therapistId);
      
      let targetConnectionId = conn?.id;

      // If connection already exists, find the ID to link the session correctly
      if (connError && connError.includes("Connection already exists")) {
        const { data: list } = await getConnections("patient");
        const existing = list?.find((c: any) => c.therapistId === therapistId);
        if (existing) targetConnectionId = existing.id;
      } else if (connError) {
        throw new Error(connError);
      }

      if (!targetConnectionId) throw new Error("Could not find or create connection");

      // 2. Create/Get chat session for this connection
      const { data: session, error: sessionError } = await createChatSession(targetConnectionId);
      if (sessionError) throw new Error(sessionError);
      
      router.push(`/chat/${session.sessionId || session.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to start chat");
      setLoading(false);
    }
  };

  return (
    <DashboardLayout 
      title="Personalized Recommendations" 
      subtitle="Your AI-ranked clinician matches based on your care focus."
    >
       <div className="w-full max-w-[800px] mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          {loading && therapists.length === 0 ? (
            [1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-[var(--surface-container-lowest)] rounded-[var(--r-lg)] p-6 shadow-[var(--shadow)] border border-[rgba(0,0,0,0.03)] animate-pulse h-[200px]" />
            ))
          ) : error ? (
            <div className="col-span-full text-center py-10 bg-red-50 rounded-[var(--r-lg)] border border-red-100">
               <p className="text-red-600 font-medium mb-4">{error}</p>
               <Button variant="outline" onClick={() => window.location.reload()}>Try Again</Button>
            </div>
          ) : (
            therapists.map((therapist) => (
              <div
                key={therapist.therapistId}
                className="bg-[var(--surface-container-lowest)] rounded-[var(--r-lg)] p-6 flex flex-col gap-4 shadow-[var(--shadow)] border border-[rgba(0,0,0,0.03)] hover:border-[var(--primary)] transition-all group relative overflow-hidden"
              >
                {/* Match Score Badge */}
                <div className="absolute top-0 right-0 px-4 py-1.5 bg-[var(--primary-container)] text-[var(--on-primary-container)] text-[0.65rem] font-bold rounded-bl-2xl flex items-center gap-1.5 shadow-sm">
                   <Sparkle weight="fill" size={12} />
                   {Math.round(therapist.score * 100)}% Match
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-2xl overflow-hidden bg-[var(--surface-container-low)] border border-[var(--outline-variant)]">
                    <img 
                      src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${therapist.name}`} 
                      alt={therapist.name} 
                      className="w-full h-full object-cover" 
                    />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-[1.05rem] font-bold text-[var(--on-surface)] leading-tight mb-1">
                      {therapist.name}
                    </h3>
                    <p className="text-[0.75rem] text-[var(--on-surface-variant)] line-clamp-2 min-h-[2.25rem]">
                      {therapist.specializations}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-auto pt-4 border-t border-[rgba(0,0,0,0.05)]">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 text-[0.8rem] font-bold text-amber-500">
                      <Star weight="fill" size={14} />
                      {therapist.rating || "5.0"}
                    </div>
                  </div>
                  
                  <Button 
                    size="sm"
                    className="rounded-full gap-2 px-4 shadow-md group-hover:shadow-lg transition-all"
                    onClick={() => handleChatStart(therapist.therapistId)}
                    disabled={loading}
                  >
                    <ChatCircleText size={18} weight="bold" />
                    <span>Chat Now</span>
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        {therapists.length > 0 && (
          <div className="flex flex-col items-center gap-4 bg-[var(--secondary-container)] p-8 rounded-[var(--r-xl)] text-[var(--on-secondary-container)]">
             <h2 className="text-xl font-bold">Still looking?</h2>
             <p className="text-[0.85rem] opacity-80 text-center max-w-[400px]">
               Our AI can help you refine your search or connect you with emergency support if you're in crisis.
             </p>
             <Button 
               variant="outline" 
               className="border-[var(--on-secondary-container)] text-[var(--on-secondary-container)] hover:bg-[var(--on-secondary-container)] hover:text-white px-8 rounded-full font-bold"
               onClick={() => router.push("/chat")}
             >
               Start AI Consultation
             </Button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
