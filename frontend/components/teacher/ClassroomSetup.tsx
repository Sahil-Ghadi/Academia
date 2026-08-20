"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { School, Loader2, Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { API_BASE_URL } from "@/lib/api";
import { useMode } from "@/contexts/ModeContext";
import { auth } from "@/lib/firebase";
import { toast } from "sonner";

export function ClassroomSetup({ onCreated }: { onCreated: () => void }) {
  const { userProfile, setUserProfile } = useMode();
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleCreate = async () => {
    if (!name.trim() || !subject.trim()) {
      toast.error("Please fill in all fields");
      return;
    }

    const user = auth.currentUser;
    if (!user) return;

    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/teacher/classroom/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teacher_uid: user.uid,
          name: name.trim(),
          subject: subject.trim(),
        }),
      });

      if (!response.ok) throw new Error("Failed to create classroom");

      const data = await response.json();
      
      // Update local profile context to include classroom_id
      if (userProfile) {
        setUserProfile({ ...userProfile, classroom_id: data.id });
      }
      
      toast.success("Classroom created successfully!");
      onCreated();
    } catch (error: any) {
      toast.error(error.message || "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-card border border-border rounded-3xl shadow-2xl p-8 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
          <School className="w-48 h-48" />
        </div>

        <div className="relative z-10">
          <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mb-6">
            <Sparkles className="h-7 w-7 text-primary" />
          </div>

          <h2 className="text-3xl font-black text-foreground mb-2 tracking-tight">Create your Classroom</h2>
          <p className="text-muted-foreground text-sm font-medium mb-8">
            Setup your adaptive learning space. Invite students and track their personalized progress.
          </p>

          <div className="space-y-5">
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase tracking-wider text-muted-foreground">Classroom Name</Label>
              <Input
                placeholder="e.g. 12th Grade Advanced Math"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-12 bg-muted/50 rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-black uppercase tracking-wider text-muted-foreground">Primary Subject</Label>
              <Input
                placeholder="e.g. Mathematics"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="h-12 bg-muted/50 rounded-xl"
              />
            </div>

            <Button 
              onClick={handleCreate} 
              disabled={isLoading || !name.trim() || !subject.trim()}
              className="w-full h-12 rounded-xl font-bold mt-4"
            >
              {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : (
                <>Create Classroom <ArrowRight className="ml-2 h-4 w-4" /></>
              )}
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
