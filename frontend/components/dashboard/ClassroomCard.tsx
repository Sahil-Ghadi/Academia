"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users, ArrowRight, Loader2, X
} from "lucide-react";
import { GlowCard } from "@/components/ui/GlowCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMode } from "@/contexts/ModeContext";
import { API_BASE_URL } from "@/lib/api";
import { toast } from "sonner";
import { StudentClassroomView } from "./StudentClassroomView";

interface Classroom {
  id: string;
  name: string;
  subject: string;
  invite_code: string;
  student_count: number;
}

export function ClassroomCard() {
  const { user, userProfile, setUserProfile } = useMode();
  const [classroom, setClassroom] = useState<Classroom | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [isJoining, setIsJoining] = useState(false);

  // Fetch by a specific classroom ID (avoids stale closure issues)
  const fetchClassroomById = async (cid: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/teacher/classroom-by-id/${cid}`);
      if (res.ok) {
        const data = await res.json();
        setClassroom(data.classroom);
      }
    } catch (e) {
      console.error("Failed to fetch classroom", e);
    }
  };

  // On mount / profile change: if student already has a classroom_id, load it
  useEffect(() => {
    if (!user?.uid) return;

    if (userProfile?.classroom_id) {
      setIsLoading(true);
      fetchClassroomById(userProfile.classroom_id).finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
      setClassroom(null);
    }
  }, [user?.uid, userProfile?.classroom_id]);

  const handleJoin = async () => {
    if (!inviteCode.trim() || !user) return;
    setIsJoining(true);
    try {
      const res = await fetch(`${API_BASE_URL}/teacher/classroom/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uid: user.uid,
          invite_code: inviteCode.trim().toUpperCase(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Invalid invite code");

      toast.success(`✅ Joined "${data.classroom_name}"!`);

      // Update context with classroom_id
      if (userProfile) {
        setUserProfile({ ...userProfile, classroom_id: data.classroom_id });
      }

      // Fetch classroom directly using the returned ID — don't wait for context
      await fetchClassroomById(data.classroom_id);

      setShowJoinModal(false);
      setInviteCode("");
    } catch (err: any) {
      toast.error(err.message || "Failed to join classroom");
    } finally {
      setIsJoining(false);
    }
  };

  if (isLoading) {
    return (
      <GlowCard className="flex items-center justify-center h-24">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </GlowCard>
    );
  }

  // ── Not enrolled ────────────────────────────────────────────────────────────
  if (!classroom) {
    return (
      <>
        <GlowCard className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
          <div className="relative z-10 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-bold text-base text-foreground">No Classroom Yet</h3>
                <p className="text-sm text-muted-foreground">
                  Join your teacher's class to track shared progress
                </p>
              </div>
            </div>
            <Button
              onClick={() => setShowJoinModal(true)}
              className="shrink-0 gap-2 rounded-xl font-bold"
            >
              Join Class <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </GlowCard>

        {/* Join Modal */}
        <AnimatePresence>
          {showJoinModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                className="w-full max-w-md bg-card border border-border rounded-3xl shadow-2xl p-8 relative"
              >
                <button
                  onClick={() => setShowJoinModal(false)}
                  className="absolute top-5 right-5 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>

                <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mb-5">
                  <Users className="h-7 w-7 text-primary" />
                </div>

                <h2 className="text-2xl font-black text-foreground mb-1">Join a Classroom</h2>
                <p className="text-sm text-muted-foreground mb-6">
                  Enter the 6-character invite code your teacher shared with you.
                </p>

                <div className="space-y-4">
                  <Input
                    placeholder="e.g. XK92AB"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                    onKeyDown={(e) => e.key === "Enter" && handleJoin()}
                    maxLength={6}
                    className="h-14 text-2xl font-mono font-bold tracking-[0.3em] text-center bg-muted/50 rounded-xl border-2 focus:border-primary"
                  />

                  <Button
                    onClick={handleJoin}
                    disabled={isJoining || inviteCode.trim().length < 4}
                    className="w-full h-12 rounded-xl font-bold text-base"
                  >
                    {isJoining ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <>Join Classroom <ArrowRight className="ml-2 h-4 w-4" /></>
                    )}
                  </Button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </>
    );
  }

  // ── Enrolled: show full classroom feed ──────────────────────────────────────
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <GlowCard className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent pointer-events-none" />
        <div className="relative z-10">
          <StudentClassroomView
            cid={classroom.id}
            uid={user!.uid}
            classroom={classroom}
          />
        </div>
      </GlowCard>
    </motion.div>
  );
}
