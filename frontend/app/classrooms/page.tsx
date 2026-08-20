"use client";

import { useEffect, useState } from "react";
import { useMode } from "@/contexts/ModeContext";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  GraduationCap, Plus, Users, BookOpen, Copy, CheckCircle2,
  Loader2, FlaskConical, Hash, ArrowRight, X, Sparkles, LogIn
} from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { API_BASE_URL } from "@/lib/api";
import { auth } from "@/lib/firebase";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Classroom {
  id: string;
  name: string;
  subject: string;
  invite_code: string;
  student_count: number;
  created_at: string;
  teacher_uid?: string;
}

export default function ClassroomsPage() {
  const { userProfile, isLoading: authLoading } = useMode();
  const router = useRouter();
  const isTeacher = userProfile?.role === "teacher";

  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);

  // Create form
  const [newName, setNewName] = useState("");
  const [newSubject, setNewSubject] = useState("");
  const [creating, setCreating] = useState(false);

  // Join form
  const [inviteCode, setInviteCode] = useState("");
  const [joining, setJoining] = useState(false);

  // Copy state
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const uid = auth.currentUser?.uid;

  useEffect(() => {
    if (!authLoading && uid) fetchClassrooms();
  }, [authLoading, uid]);

  const fetchClassrooms = async () => {
    if (!uid) return;
    setLoading(true);
    try {
      const endpoint = isTeacher
        ? `${API_BASE_URL}/teacher/my-classrooms/teacher/${uid}`
        : `${API_BASE_URL}/teacher/my-classrooms/student/${uid}`;
      const res = await fetch(endpoint);
      if (res.ok) setClassrooms((await res.json()).classrooms || []);
    } catch { toast.error("Failed to load classrooms"); }
    finally { setLoading(false); }
  };

  const handleCreate = async () => {
    if (!newName.trim()) { toast.error("Enter a classroom name"); return; }
    if (!uid) return;
    setCreating(true);
    try {
      const res = await fetch(`${API_BASE_URL}/teacher/classroom/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teacher_uid: uid, name: newName.trim(), subject: newSubject.trim() || "General" }),
      });
      if (!res.ok) throw new Error();
      toast.success("Classroom created!");
      setNewName(""); setNewSubject(""); setShowCreate(false);
      fetchClassrooms();
    } catch { toast.error("Failed to create classroom"); }
    finally { setCreating(false); }
  };

  const handleJoin = async () => {
    if (!inviteCode.trim()) { toast.error("Enter an invite code"); return; }
    if (!uid) return;
    setJoining(true);
    try {
      const res = await fetch(`${API_BASE_URL}/teacher/classroom/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid, invite_code: inviteCode.trim().toUpperCase() }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.detail); }
      const data = await res.json();
      toast.success(data.already_joined ? "Already enrolled!" : `Joined "${data.classroom_name}"!`);
      setInviteCode(""); setShowJoin(false);
      fetchClassrooms();
    } catch (e: any) { toast.error(e.message || "Invalid invite code"); }
    finally { setJoining(false); }
  };

  const handleCopy = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    toast.success("Invite code copied!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const openClassroom = (c: Classroom) => {
    if (isTeacher) router.push(`/teacher?cid=${c.id}`);
    else router.push(`/classrooms/${c.id}`);
  };

  if (authLoading) return (
    <DashboardLayout>
      <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
    </DashboardLayout>
  );

  return (
    <DashboardLayout>
      <div className="min-h-screen p-6 lg:p-10 max-w-6xl mx-auto">
        {/* Hero header */}
        <div className="relative overflow-hidden rounded-3xl mb-8 bg-gradient-to-r from-primary via-primary/90 to-violet-600 p-8 shadow-2xl">
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "32px 32px" }} />
          <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="h-8 w-8 rounded-xl bg-white/20 flex items-center justify-center">
                  <GraduationCap className="h-4 w-4 text-white" />
                </div>
                <span className="text-white/70 text-xs font-bold uppercase tracking-widest">
                  {isTeacher ? "Teacher Portal" : "Student Portal"}
                </span>
              </div>
              <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">My Classrooms</h1>
              <p className="text-white/60 text-sm mt-1">
                {isTeacher
                  ? `${classrooms.length} classroom${classrooms.length !== 1 ? "s" : ""} · create as many as you need`
                  : `${classrooms.length} enrolled · join more with an invite code`}
              </p>
            </div>
            <div className="flex gap-3">
              {isTeacher ? (
                <button
                  onClick={() => { setShowCreate(true); setShowJoin(false); }}
                  className="flex items-center gap-2 px-5 py-3 bg-white text-primary rounded-2xl font-black text-sm hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg"
                >
                  <Plus className="h-4 w-4" /> New Classroom
                </button>
              ) : (
                <button
                  onClick={() => { setShowJoin(true); setShowCreate(false); }}
                  className="flex items-center gap-2 px-5 py-3 bg-white text-primary rounded-2xl font-black text-sm hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg"
                >
                  <LogIn className="h-4 w-4" /> Join Classroom
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Create / Join panels */}
        <AnimatePresence>
          {(showCreate || showJoin) && (
            <motion.div
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="mb-6"
            >
              <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="font-black text-lg flex items-center gap-2">
                    {showCreate ? <><Plus className="h-5 w-5 text-primary" /> Create New Classroom</> : <><LogIn className="h-5 w-5 text-primary" /> Join a Classroom</>}
                  </h2>
                  <button onClick={() => { setShowCreate(false); setShowJoin(false); }} className="h-8 w-8 rounded-lg hover:bg-muted flex items-center justify-center transition-colors">
                    <X className="h-4 w-4 text-muted-foreground" />
                  </button>
                </div>

                {showCreate && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-black uppercase tracking-wider text-muted-foreground">Classroom Name *</label>
                        <input
                          value={newName} onChange={(e) => setNewName(e.target.value)}
                          placeholder="e.g. Advanced Physics — Batch A"
                          className="w-full h-11 rounded-xl border border-input bg-background px-4 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-black uppercase tracking-wider text-muted-foreground">Subject</label>
                        <input
                          value={newSubject} onChange={(e) => setNewSubject(e.target.value)}
                          placeholder="e.g. Physics"
                          className="w-full h-11 rounded-xl border border-input bg-background px-4 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                      </div>
                    </div>
                    <button
                      onClick={handleCreate} disabled={creating || !newName.trim()}
                      className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-bold text-sm hover:opacity-90 transition-all disabled:opacity-50 active:scale-[0.98]"
                    >
                      {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                      {creating ? "Creating..." : "Create Classroom"}
                    </button>
                  </div>
                )}

                {showJoin && (
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-black uppercase tracking-wider text-muted-foreground">Invite Code</label>
                      <div className="flex gap-3">
                        <input
                          value={inviteCode} onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                          onKeyDown={(e) => e.key === "Enter" && handleJoin()}
                          placeholder="e.g. AB12CD"
                          maxLength={6}
                          className="flex-1 h-12 rounded-xl border border-input bg-background px-4 text-xl font-mono font-black tracking-widest uppercase focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                        <button
                          onClick={handleJoin} disabled={joining || inviteCode.length < 4}
                          className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-bold text-sm hover:opacity-90 transition-all disabled:opacity-50 active:scale-[0.98]"
                        >
                          {joining ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
                          {joining ? "Joining..." : "Join"}
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">Ask your teacher for their 6-character invite code.</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Classrooms grid */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-muted-foreground gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-sm">Loading classrooms...</p>
          </div>
        ) : classrooms.length === 0 ? (
          <div className="text-center py-24 text-muted-foreground border-2 border-dashed border-border rounded-3xl">
            <div className="h-24 w-24 rounded-3xl bg-muted/50 flex items-center justify-center mx-auto mb-5">
              <GraduationCap className="h-12 w-12 opacity-20" />
            </div>
            <p className="font-black text-xl">No classrooms yet</p>
            <p className="text-sm mt-2">
              {isTeacher ? 'Click "New Classroom" to get started.' : 'Ask your teacher for an invite code and click "Join Classroom".'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {classrooms.map((c, i) => (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07 }}
                className="group bg-card border border-border rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer"
                onClick={() => openClassroom(c)}
              >
                <div className={cn(
                  "h-2 w-full",
                  ["bg-primary", "bg-violet-500", "bg-blue-500", "bg-amber-500", "bg-rose-500", "bg-cyan-500"][i % 6]
                )} />

                <div className="p-5 space-y-4">
                  {/* Title row */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{c.subject}</span>
                      <h3 className="font-black text-lg leading-snug truncate mt-0.5">{c.name}</h3>
                    </div>
                    <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                      <BookOpen className="h-5 w-5 text-primary" />
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <Users className="h-4 w-4" />
                      {c.student_count} student{c.student_count !== 1 ? "s" : ""}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <FlaskConical className="h-4 w-4" />
                      {new Date(c.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  {/* Invite code row — teachers only */}
                  {isTeacher && (
                    <div
                      className="flex items-center justify-between bg-muted/50 rounded-xl px-4 py-2.5 border border-border"
                      onClick={(e) => { e.stopPropagation(); handleCopy(c.invite_code, c.id); }}
                    >
                      <div className="flex items-center gap-2">
                        <Hash className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="font-mono font-black tracking-widest text-sm">{c.invite_code}</span>
                      </div>
                      <button className="text-muted-foreground hover:text-foreground transition-colors">
                        {copiedId === c.id ? <CheckCircle2 className="h-4 w-4 text-blue-500" /> : <Copy className="h-4 w-4" />}
                      </button>
                    </div>
                  )}

                  {/* Open button */}
                  <button className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary/5 hover:bg-primary text-primary hover:text-primary-foreground border border-primary/20 hover:border-primary font-bold text-sm transition-all group-hover:border-primary/40">
                    Open Classroom <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </motion.div>
            ))}

            {/* Add another card */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: classrooms.length * 0.07 }}
              onClick={() => isTeacher ? setShowCreate(true) : setShowJoin(true)}
              className="border-2 border-dashed border-border rounded-2xl p-5 flex flex-col items-center justify-center gap-3 min-h-[220px] text-muted-foreground hover:border-primary/40 hover:text-primary hover:bg-primary/5 transition-all cursor-pointer group"
            >
              <div className="h-14 w-14 rounded-2xl bg-muted/50 group-hover:bg-primary/10 flex items-center justify-center transition-colors">
                {isTeacher ? <Plus className="h-7 w-7" /> : <LogIn className="h-7 w-7" />}
              </div>
              <p className="font-bold text-sm">{isTeacher ? "Create another classroom" : "Join another classroom"}</p>
            </motion.div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
