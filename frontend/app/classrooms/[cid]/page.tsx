"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useMode } from "@/contexts/ModeContext";
import { Loader2, ArrowLeft } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { StudentClassroomView } from "@/components/dashboard/StudentClassroomView";
import { TeacherDashboard } from "@/components/teacher/TeacherDashboard";
import { API_BASE_URL } from "@/lib/api";
import { auth } from "@/lib/firebase";
import Link from "next/link";

export default function ClassroomDetailPage() {
  const { cid } = useParams<{ cid: string }>();
  const { userProfile } = useMode();
  const [classroom, setClassroom] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const isTeacher = userProfile?.role === "teacher";
  const uid = auth.currentUser?.uid ?? "";

  useEffect(() => {
    if (!cid) return;
    fetch(`${API_BASE_URL}/teacher/classroom-by-id/${cid}`)
      .then((r) => r.json())
      .then((d) => setClassroom(d.classroom))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [cid]);

  if (loading) return (
    <DashboardLayout>
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    </DashboardLayout>
  );

  if (!classroom) return (
    <DashboardLayout>
      <div className="p-10 text-center text-muted-foreground">
        <p className="font-bold text-lg">Classroom not found.</p>
        <Link href="/classrooms" className="text-primary text-sm hover:underline mt-2 inline-block">← Back to classrooms</Link>
      </div>
    </DashboardLayout>
  );

  return (
    <DashboardLayout>
      <div className="min-h-screen p-6 lg:p-10">
        <Link href="/classrooms" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Classrooms
        </Link>

        {isTeacher ? (
          <TeacherDashboard classroom={classroom} teacherUid={uid} />
        ) : (
          <StudentClassroomView cid={cid} uid={uid} classroom={classroom} />
        )}
      </div>
    </DashboardLayout>
  );
}
