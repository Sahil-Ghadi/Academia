'use client';

import { AnimatePresence } from 'framer-motion';
import { DashboardLayout } from '@/components/DashboardLayout';
import { AcademicDashboard } from '@/components/dashboard/AcademicDashboard';
import { useMode } from '@/contexts/ModeContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function Dashboard() {
  const { mode, userProfile, isOnboarded, isLoading } = useMode();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isOnboarded) {
      router.push('/onboarding');
    }
    // Teachers don't belong on the student dashboard
    if (!isLoading && isOnboarded && userProfile?.role === 'teacher') {
      router.push('/teacher');
    }
  }, [isOnboarded, isLoading, userProfile, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-pulse text-lg text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!isOnboarded) {
    return null;
  }

  return (
    <DashboardLayout
      title="🎓 Academic Dashboard"
      subtitle={`Welcome back, ${userProfile?.name || 'Student'}! Here's your AI-optimized learning plan.`}
    >
      <AnimatePresence mode="wait">
        <AcademicDashboard />
      </AnimatePresence>
    </DashboardLayout>
  );
}