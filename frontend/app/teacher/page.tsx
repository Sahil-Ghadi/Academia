"use client";

import { useEffect, useState } from "react";
import { useMode } from "@/contexts/ModeContext";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { TeacherDashboard } from "@/components/teacher/TeacherDashboard";
import { API_BASE_URL } from "@/lib/api";
import { auth } from "@/lib/firebase";

export default function TeacherPage() {
  const { userProfile } = useMode();
  const router = useRouter();
  const searchParams = useSearchParams();
  const cidParam = searchParams.get("cid");

  const [classroom, setClassroom] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!userProfile) return;
    if (userProfile.role !== "teacher") { router.push("/dashboard"); return; }

    const uid = auth.currentUser?.uid;
    if (!uid) return;

    if (cidParam) {
      // Load specific classroom
      fetch(`${API_BASE_URL}/teacher/classroom-by-id/${cidParam}`)
        .then((r) => r.json())
        .then((d) => setClassroom(d.classroom))
        .catch(() => {})
        .finally(() => setIsLoading(false));
    } else {
      // No cid param — redirect to classrooms hub
      router.push("/classrooms");
    }
  }, [userProfile, cidParam, router]);

  if (!userProfile || isLoading) {
    return (
      <DashboardLayout>
        <div className="flex h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!classroom) {
    return (
      <DashboardLayout>
        <div className="flex h-screen items-center justify-center text-muted-foreground">
          <p>Classroom not found.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="min-h-[calc(100vh-4rem)] p-6 lg:p-10">
        <TeacherDashboard
          classroom={classroom}
          teacherUid={auth.currentUser!.uid}
        />
      </div>
    </DashboardLayout>
  );
}
