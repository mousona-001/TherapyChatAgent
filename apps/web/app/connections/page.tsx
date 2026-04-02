"use client"
import { useEffect, useState } from "react";

import { DashboardLayout } from "@/features/dashboard/components/DashboardLayout";
import { Button, Card } from "@repo/ui";
import { Check, X, User, Clock, Users, ArrowRight } from "@phosphor-icons/react";
import { getConnections, respondToConnection } from "../onboarding/actions";
import { cn, toast } from "@repo/ui";
import Link from "next/link";

export default function ConnectionsPage() {
  const [connections, setConnections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    const res = await getConnections('therapist');
    if (res.success && res.data) {
      setConnections(res.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRespond = async (id: string, status: 'accepted' | 'rejected') => {
    setActionLoading(id);
    const res = await respondToConnection(id, status);
    if (res.success) {
      toast.success(`Request ${status === 'accepted' ? 'approved' : 'declined'} successfully`);
      fetchData();
    } else {
      toast.error(res.error || "Failed to update connection");
    }
    setActionLoading(null);
  };

  const pending = connections.filter(c => c.status === 'pending');
  const accepted = connections.filter(c => c.status === 'accepted');

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-12 p-6 animate-in fade-in duration-700">
        
        {/* Pending Requests Section */}
        <section>
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
               <div className="p-3 bg-amber-50 rounded-2xl text-amber-600 border border-amber-100 shadow-sm">
                  <Clock size={24} weight="fill" />
               </div>
               <div>
                  <h2 className="text-2xl font-bold text-[var(--on-surface)] tracking-tight">Pending Approval</h2>
                  <p className="text-sm text-[var(--on-surface-variant)] opacity-60 font-medium">New patients waiting for your care</p>
               </div>
            </div>
            {pending.length > 0 && (
              <div className="px-4 py-1.5 rounded-full bg-amber-500 text-white text-[0.75rem] font-black uppercase tracking-widest shadow-lg shadow-amber-500/20">
                {pending.length} New
              </div>
            )}
          </div>

          {loading ? (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map(i => (
                  <Card key={i} className="p-6 h-[200px] animate-pulse bg-white border-[var(--outline-variant)]" />
                ))}
             </div>
          ) : pending.length === 0 ? (
            <Card className="p-16 border-dashed border-2 bg-transparent flex flex-col items-center justify-center text-[var(--on-surface-variant)] transition-all hover:bg-white/50 group">
               <div className="w-16 h-16 rounded-full bg-[var(--surface-container-low)] flex items-center justify-center mb-4 text-[var(--on-surface-variant)] opacity-20 group-hover:scale-110 transition-transform">
                  <Users size={32} />
               </div>
               <p className="text-sm font-bold opacity-40 uppercase tracking-widest">No pending requests</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
               {pending.map((req) => (
                 <Card key={req.id} className="p-6 flex flex-col gap-5 hover:shadow-xl hover:shadow-indigo-500/5 transition-all bg-white border-[var(--outline-variant)] relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-2 opacity-5">
                       <Clock size={80} weight="fill" />
                    </div>
                    
                    <div className="flex items-center gap-4 relative z-10">
                       <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 border border-indigo-100 shadow-inner">
                          <User size={28} weight="fill" />
                       </div>
                       <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-lg truncate group-hover:text-indigo-600 transition-colors uppercase tracking-tight">{req.patientName}</h3>
                          <div className="flex items-center gap-1.5 text-[0.75rem] font-bold text-[var(--on-surface-variant)] opacity-40">
                             <Clock size={14} />
                             {new Date(req.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                          </div>
                       </div>
                    </div>

                    {req.patientReason && (
                      <div className="relative">
                        <p className="text-[0.85rem] leading-relaxed text-[var(--on-surface-variant)] line-clamp-3 italic opacity-80 pl-4 border-l-2 border-indigo-200">
                          "{req.patientReason}"
                        </p>
                      </div>
                    )}

                    <div className="flex gap-3 mt-2">
                       <Button 
                         className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl h-12 gap-2 shadow-lg shadow-indigo-500/20 active:scale-95 transition-all text-sm font-bold"
                         onClick={() => handleRespond(req.id, 'accepted')}
                         disabled={actionLoading === req.id}
                       >
                          {actionLoading === req.id ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          ) : (
                            <><Check weight="bold" size={18} /> Accept Request</>
                          )}
                       </Button>
                       <Button 
                         variant="outline"
                         className="flex-shrink-0 w-12 h-12 p-0 rounded-2xl border-[var(--outline-variant)] text-[var(--on-surface-variant)] hover:bg-red-50 hover:text-red-500 hover:border-red-100 active:scale-95 transition-all"
                         onClick={() => handleRespond(req.id, 'rejected')}
                         disabled={actionLoading === req.id}
                       >
                          <X weight="bold" size={20} />
                       </Button>
                    </div>
                 </Card>
               ))}
            </div>
          )}
        </section>

        {/* Active Network Section */}
        <section>
          <div className="flex items-center justify-between mb-8 pt-12 border-t border-[var(--outline-variant)]/50">
             <div className="flex items-center gap-4">
                <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600 border border-indigo-100 shadow-sm">
                   <Users size={24} weight="fill" />
                </div>
                <div>
                   <h2 className="text-2xl font-bold text-[var(--on-surface)] tracking-tight">Active Patients</h2>
                   <p className="text-sm text-[var(--on-surface-variant)] opacity-60 font-medium">Your current caseload and wellness network</p>
                </div>
             </div>
             <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-indigo-600">{accepted.length}</span>
                <span className="text-[0.65rem] font-bold text-[var(--on-surface-variant)] uppercase opacity-40">Total</span>
             </div>
          </div>

          {loading ? (
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[1, 2, 3, 4].map(i => (
                  <Card key={i} className="p-6 h-[160px] animate-pulse bg-white border-[var(--outline-variant)]" />
                ))}
             </div>
          ) : accepted.length === 0 ? (
            <Card className="p-12 text-center bg-[var(--surface-container-lowest)] border-none shadow-inner">
               <p className="text-sm font-medium text-[var(--on-surface-variant)] opacity-40 italic">Your active network will appear here after requests are accepted.</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
               {accepted.map((patient) => (
                 <Link href={patient.sessionId ? `/chat/${patient.sessionId}` : `/connections`} key={patient.id}>
                    <Card className="p-6 flex flex-col items-center text-center gap-4 hover:shadow-2xl hover:-translate-y-1 transition-all cursor-pointer bg-white border-[var(--outline-variant)] group relative overflow-hidden">
                       <div className="absolute inset-0 bg-indigo-600/0 group-hover:bg-indigo-600/[0.02] transition-colors" />
                       
                       <div className="w-20 h-20 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 border-4 border-white shadow-xl group-hover:shadow-indigo-100 transition-all">
                          <User size={36} weight="fill" />
                       </div>
                       
                       <div className="relative z-10">
                         <h3 className="font-bold text-base truncate max-w-[140px] uppercase tracking-tight group-hover:text-indigo-600 transition-colors">{patient.patientName}</h3>
                         <div className="flex items-center justify-center gap-1.5 mt-1">
                           <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                           <p className="text-[0.65rem] text-[var(--on-surface-variant)] uppercase tracking-widest font-black opacity-30">Active Patient</p>
                         </div>
                       </div>

                       <div className="flex items-center gap-2 text-indigo-600 text-[0.7rem] font-bold uppercase tracking-tighter opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0">
                         Go to Session <ArrowRight weight="bold" size={12} />
                       </div>
                    </Card>
                 </Link>
               ))}
            </div>
          )}
        </section>
      </div>
    </DashboardLayout>
  );
}
