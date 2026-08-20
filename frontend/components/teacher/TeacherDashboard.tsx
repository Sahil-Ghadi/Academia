"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users, TrendingUp, AlertTriangle, Copy, CheckCircle2,
  Loader2, BookOpen, Sparkles, LayoutDashboard, FileText, RefreshCw,
  GraduationCap, Activity, ChevronRight, Star, Zap
} from "lucide-react";
import { API_BASE_URL } from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ContentPanel } from "./ContentPanel";
import { collection, onSnapshot, query } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface StudentProgress {
  uid: string;
  name: string;
  email: string;
  avg_accuracy: number | null;
  has_progress: boolean;
  weak_areas: string[];
  last_active: string | null;
}

type Tab = "overview" | "roster" | "content";

export function TeacherDashboard({ classroom, teacherUid }: {
  classroom: any; teacherUid: string; onClassroomUpdate?: () => void;
}) {
  const [students, setStudents] = useState<StudentProgress[]>([]);
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [insightLoading, setInsightLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchStudents = async (silent = false) => {
    try {
      if (!silent) setIsLoading(true);
      const res = await fetch(`${API_BASE_URL}/teacher/classroom/${classroom.id}/students`);
      if (res.ok) {
        const data = await res.json();
        setStudents(data.students || []);
        setLastUpdated(new Date());
        if (!silent) toast.success("Roster refreshed");
      }
    } catch { if (!silent) toast.error("Failed to refresh"); }
    finally { setIsLoading(false); }
  };

  useEffect(() => {
    fetchStudents(true);
    const poll = setInterval(() => fetchStudents(true), 20_000);
    const progressRef = collection(db, "classrooms", classroom.id, "student_progress");
    const unsubscribe = onSnapshot(query(progressRef), (snapshot) => {
      const map: Record<string, any> = {};
      snapshot.docs.forEach((doc) => {
        const d = doc.data();
        map[doc.id] = {
          avg_accuracy: typeof d.avg_accuracy === "number" ? d.avg_accuracy : null,
          weak_areas: Array.isArray(d.weak_areas) ? d.weak_areas : [],
          last_active: d.last_active ?? null,
        };
      });
      setStudents((prev) => prev.map((s) => map[s.uid] ? { ...s, ...map[s.uid], has_progress: true } : s));
      setLastUpdated(new Date());
    }, (err) => console.warn("onSnapshot:", err.message));
    return () => { unsubscribe(); clearInterval(poll); };
  }, [classroom.id]);

  const fetchInsight = async () => {
    if (insightLoading) return;
    setInsightLoading(true); setAiInsight(null);
    try {
      const res = await fetch(`${API_BASE_URL}/teacher/classroom/${classroom.id}/ai-insight`, { method: "POST" });
      if (res.ok) setAiInsight((await res.json()).insight);
    } catch { toast.error("AI insight failed"); }
    finally { setInsightLoading(false); }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(classroom.invite_code);
    setCopied(true); toast.success("Invite code copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const testedStudents = students.filter((s) => s.has_progress && s.avg_accuracy !== null);
  const avgClassScore = testedStudents.length > 0
    ? testedStudents.reduce((a, s) => a + (s.avg_accuracy as number), 0) / testedStudents.length
    : null;
  const atRiskStudents = students.filter((s) => s.has_progress && (s.avg_accuracy ?? 100) < 50);

  const tabs = [
    { id: "overview" as Tab, label: "Overview", icon: LayoutDashboard },
    { id: "roster" as Tab, label: "Roster", icon: Users },
    { id: "content" as Tab, label: "Content & Tests", icon: FileText },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 pb-20">
      {/* ── Minimal Hero Header ── */}
      <div className="bg-card rounded-2xl mb-8 p-6 md:p-8 border border-border/80 shadow-sm relative overflow-hidden">
        <div className="relative flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="bg-muted text-foreground text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest border border-border/80">
                {classroom.subject}
              </span>
              {lastUpdated && (
                <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1 border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live
                </span>
              )}
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-foreground tracking-tight">{classroom.name}</h1>
            <p className="text-muted-foreground text-sm mt-2">{students.length} enrolled · taught by you</p>
          </div>

          {/* Invite code */}
          <div className="flex items-center gap-3 bg-muted/50 border border-border/80 rounded-2xl p-4 shrink-0">
            <div>
              <p className="text-muted-foreground text-[10px] font-black uppercase tracking-widest mb-0.5">Invite Code</p>
              <p className="text-foreground text-2xl font-mono font-black tracking-widest">{classroom.invite_code}</p>
            </div>
            <button
              onClick={handleCopyCode}
              className="h-10 w-10 bg-background hover:bg-muted text-foreground border border-border/80 rounded-xl flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-sm"
            >
              {copied ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> : <Copy className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 bg-muted/50 backdrop-blur-sm p-1.5 rounded-2xl w-fit border border-border mb-8 shadow-sm">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200",
                activeTab === tab.id
                  ? "bg-background shadow-md text-foreground scale-[1.02]"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── Tab Content ── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
        >
          {/* ── OVERVIEW ── */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              {/* KPI Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* Total Students */}
                <div className="bg-card border border-border/80 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Total Students</p>
                      <p className="text-4xl font-black text-foreground">{students.length}</p>
                      <p className="text-xs text-muted-foreground mt-2">{testedStudents.length} have taken a test</p>
                    </div>
                    <div className="h-10 w-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                      <GraduationCap className="h-5 w-5 text-violet-500" />
                    </div>
                  </div>
                </div>

                {/* Class Average */}
                <div className="bg-card border border-border/80 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 pr-4">
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Class Average</p>
                      {avgClassScore !== null ? (
                        <>
                          <p className="text-4xl font-black">{Math.round(avgClassScore)}%</p>
                          <div className="mt-3 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500 rounded-full transition-all duration-1000" style={{ width: `${Math.round(avgClassScore)}%` }} />
                          </div>
                          <p className="text-xs text-muted-foreground mt-1.5">{testedStudents.length} of {students.length} tested</p>
                        </>
                      ) : (
                        <p className="text-sm text-muted-foreground mt-3 italic">No submissions yet</p>
                      )}
                    </div>
                    <div className="h-10 w-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
                      <TrendingUp className="h-5 w-5 text-blue-500" />
                    </div>
                  </div>
                </div>

                {/* Needs Attention */}
                <div className="bg-card border border-border/80 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className={cn("text-xs font-bold uppercase tracking-wider mb-1", atRiskStudents.length > 0 ? "text-red-500" : "text-emerald-500")}>
                        Needs Attention
                      </p>
                      <p className="text-4xl font-black">{atRiskStudents.length}</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {atRiskStudents.length === 0 ? "All performing well 🎉" : "Scored below 50%"}
                      </p>
                    </div>
                    <div className={cn("h-10 w-10 rounded-xl border flex items-center justify-center", atRiskStudents.length > 0 ? "bg-red-500/10 border-red-500/20" : "bg-emerald-500/10 border-emerald-500/20")}>
                      <AlertTriangle className={cn("h-5 w-5", atRiskStudents.length > 0 ? "text-red-500" : "text-emerald-500")} />
                    </div>
                  </div>
                </div>
              </div>

              {/* AI Insight Card */}
              <div className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-card to-card border border-primary/20 rounded-2xl p-6 shadow-sm">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                <div className="relative">
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                        <Sparkles className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h2 className="font-black text-base">AI Academic Coach</h2>
                        <p className="text-xs text-muted-foreground">Powered by local LLM</p>
                      </div>
                    </div>
                    <button
                      onClick={fetchInsight}
                      disabled={insightLoading}
                      className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-xs font-bold hover:opacity-90 transition-all disabled:opacity-50 active:scale-95"
                    >
                      {insightLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
                      {aiInsight ? "Refresh" : "Generate Insight"}
                    </button>
                  </div>

                  {insightLoading && (
                    <div className="flex items-center gap-3 py-6 text-muted-foreground">
                      <div className="flex gap-1">
                        {[0, 1, 2].map((i) => (
                          <div key={i} className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                        ))}
                      </div>
                      <span className="text-sm">Analyzing class performance...</span>
                    </div>
                  )}
                  {aiInsight && !insightLoading && (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-muted/40 rounded-xl p-4 border border-border">
                      <p className="text-foreground/90 leading-relaxed text-sm font-medium">{aiInsight}</p>
                    </motion.div>
                  )}
                  {!aiInsight && !insightLoading && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Sparkles className="h-10 w-10 mx-auto mb-3 opacity-20" />
                      <p className="text-sm font-medium">Click "Generate Insight" for AI-powered coaching recommendations</p>
                    </div>
                  )}
                </div>
              </div>

              {/* At-Risk List */}
              {atRiskStudents.length > 0 && (
                <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                    <h3 className="font-black text-sm text-red-500 uppercase tracking-wider">Students Needing Support</h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {atRiskStudents.map((s) => (
                      <div key={s.uid} className="flex items-center justify-between bg-background/80 border border-red-500/10 rounded-xl px-4 py-3 hover:border-red-500/30 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-red-500/20 to-orange-500/10 flex items-center justify-center border border-red-500/20">
                            <span className="text-sm font-black text-red-500">{s.name.charAt(0)}</span>
                          </div>
                          <div>
                            <p className="font-semibold text-sm">{s.name}</p>
                            <p className="text-xs text-muted-foreground">{s.email}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-red-500 font-black text-lg">{Math.round(s.avg_accuracy!)}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── ROSTER ── */}
          {activeTab === "roster" && (
            <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
              <div className="p-5 border-b border-border bg-muted/20 flex items-center justify-between">
                <div>
                  <h2 className="font-black text-lg flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" /> Student Roster
                  </h2>
                  {lastUpdated && (
                    <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Live · {lastUpdated.toLocaleTimeString()}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => fetchStudents(false)}
                  disabled={isLoading}
                  className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-primary bg-primary/10 hover:bg-primary/20 rounded-xl transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} /> Refresh
                </button>
              </div>

              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm">Loading roster...</p>
                </div>
              ) : students.length === 0 ? (
                <div className="p-16 text-center text-muted-foreground">
                  <div className="h-20 w-20 rounded-3xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
                    <Users className="h-10 w-10 opacity-20" />
                  </div>
                  <p className="font-bold text-base">No students yet</p>
                  <p className="text-sm mt-1">Share code <span className="font-mono font-black text-foreground">{classroom.invite_code}</span> to get started</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/20 text-xs text-muted-foreground uppercase tracking-wider">
                        <th className="px-6 py-4 text-left font-bold">#</th>
                        <th className="px-6 py-4 text-left font-bold">Student</th>
                        <th className="px-6 py-4 text-left font-bold">Score</th>
                        <th className="px-6 py-4 text-left font-bold">Weak Areas</th>
                        <th className="px-6 py-4 text-left font-bold">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.map((student, idx) => {
                        const score = student.avg_accuracy;
                        const hasTaken = student.has_progress && score !== null;
                        return (
                          <tr key={student.uid} className="border-b border-border/50 hover:bg-muted/10 transition-colors group">
                            <td className="px-6 py-4 text-muted-foreground font-mono text-xs">{String(idx + 1).padStart(2, "0")}</td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center shrink-0">
                                  <span className="text-xs font-black text-primary">{student.name.charAt(0)}</span>
                                </div>
                                <div>
                                  <p className="font-semibold">{student.name || "Unknown"}</p>
                                  <p className="text-xs text-muted-foreground">{student.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              {hasTaken ? (
                                <div className="flex items-center gap-3">
                                  <span className={cn("text-xl font-black tabular-nums",
                                    score! >= 70 ? "text-emerald-500" : score! >= 50 ? "text-amber-500" : "text-red-500"
                                  )}>{Math.round(score!)}%</span>
                                  <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                                    <div
                                      className={cn("h-full rounded-full transition-all duration-700",
                                        score! >= 70 ? "bg-emerald-500" : score! >= 50 ? "bg-amber-500" : "bg-red-500"
                                      )}
                                      style={{ width: `${score}%` }}
                                    />
                                  </div>
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground italic">—</span>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex flex-wrap gap-1">
                                {student.weak_areas?.slice(0, 2).map((area, i) => (
                                  <span key={i} className="bg-red-500/10 text-red-600 text-[10px] font-bold px-2 py-0.5 rounded-full border border-red-500/15">
                                    {area}
                                  </span>
                                ))}
                                {(!student.weak_areas || student.weak_areas.length === 0) && (
                                  <span className="text-muted-foreground text-xs">—</span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              {!hasTaken ? (
                                <span className="text-[10px] font-bold bg-muted text-muted-foreground px-2 py-1 rounded-full">Test not given</span>
                              ) : score! >= 70 ? (
                                <span className="text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 px-2 py-1 rounded-full flex items-center gap-1 w-fit">
                                  <Star className="h-2.5 w-2.5" /> Proficient
                                </span>
                              ) : score! >= 50 ? (
                                <span className="text-[10px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20 px-2 py-1 rounded-full flex items-center gap-1 w-fit">
                                  <Activity className="h-2.5 w-2.5" /> Developing
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold bg-red-500/10 text-red-600 border border-red-500/20 px-2 py-1 rounded-full flex items-center gap-1 w-fit">
                                  <AlertTriangle className="h-2.5 w-2.5" /> At Risk
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ── CONTENT & TESTS ── */}
          {activeTab === "content" && <ContentPanel cid={classroom.id} teacherUid={teacherUid} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
