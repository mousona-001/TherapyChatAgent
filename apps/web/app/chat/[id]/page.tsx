"use client"
import { useEffect, useState } from "react";


import { DashboardLayout } from "@/features/dashboard/components/DashboardLayout";
import { ChatWindow } from "@/features/chat/components/ChatWindow";
import { useParams } from "next/navigation";
import { getConnections, getChatSessions, checkOnboardingStatus } from "../../onboarding/actions";

export default function ChatSessionPage() {
  const params = useParams();
  const sessionId = Array.isArray(params.id) ? params.id[0] : params.id;
  const [chatTitle, setChatTitle] = useState("Your Session");
  const [otherPartyId, setOtherPartyId] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<'patient' | 'therapist'>('patient');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [initialStatus, setInitialStatus] = useState<'online' | 'offline' | null>(null);

  useEffect(() => {
     async function findSessionInfo() {
        if (!sessionId) return;
        
        try {
          // 1. Get user identity first for alignment
          const status = await checkOnboardingStatus();
          const role = (status.role as 'patient' | 'therapist') || 'patient';
          const userId = (status as any).userId || null;
          
          setCurrentUserRole(role);
          setCurrentUserId(userId);

          // 2. Get all sessions for the user
          const sessionResult = await getChatSessions();
          if (!sessionResult.success || !sessionResult.data) return;
          
          const currentSession = sessionResult.data.find((s: any) => s.id === sessionId);
          
          if (currentSession?.connectionId) {
             // 3. If it's a connected session, find the name and userId from connections
             const connResult = await getConnections(role);
             if (connResult.success && connResult.data) {
                const conn = connResult.data.find((c: any) => c.id === currentSession.connectionId);
                if (conn) {
                   const isPatient = role === 'patient';
                   setChatTitle(isPatient ? (conn.therapistName || "Therapist") : (conn.patientName || "Patient"));
                   setOtherPartyId(isPatient ? conn.therapistUserId : conn.patientUserId);
                   setInitialStatus(isPatient ? conn.therapistStatus : (conn as any).patientStatus || 'online');
                }
             }
          } else {
             setChatTitle("AI Therapeutic Assistant");
             setOtherPartyId(null);
             setInitialStatus(null);
          }
        } catch (e) {
          console.error("Failed to find session info:", e);
        }
     }
     findSessionInfo();
  }, [sessionId]);

  if (!sessionId) return null;

  return (
    <DashboardLayout title="Support Room" subtitle="Secure, end-to-end encrypted messaging.">
       <div className="h-full max-w-[1000px] mx-auto bg-white rounded-[32px] shadow-2xl shadow-indigo-100/30 border border-[var(--outline-variant)] overflow-hidden">
          <ChatWindow 
            sessionId={sessionId} 
            title={chatTitle} 
            currentUserRole={currentUserRole}
            currentUserId={currentUserId}
            otherPartyId={otherPartyId}
            initialStatus={initialStatus}
          />
       </div>
    </DashboardLayout>
  );
}
