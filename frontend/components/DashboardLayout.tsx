'use client';

import { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { ModeToggle } from './ModeToggle';
import { motion } from 'framer-motion';
import { useMode } from '@/contexts/ModeContext';
import { usePathname } from 'next/navigation';

interface DashboardLayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
}

export function DashboardLayout({ children, title, subtitle }: DashboardLayoutProps) {
  const { userProfile } = useMode();
  const pathname = usePathname();
  const isTeacher = userProfile?.role === 'teacher';
  
  // Hide mode toggle on certain pages where it doesn't make sense or breaks context
  const hideModeToggle = pathname?.startsWith('/tutor') || pathname?.startsWith('/classrooms');

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />

      {/* Main content */}
      <main className="ml-64">
        {/* Header */}
        <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-md">
          <div className="flex items-center justify-between px-8 py-4">
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {title && <h1 className="font-heading text-2xl font-bold">{title}</h1>}
              {subtitle && (
                <p className="text-sm text-muted-foreground">{subtitle}</p>
              )}
            </motion.div>
            {/* Only show mode toggle for students on allowed pages */}
            {!isTeacher && !hideModeToggle && <ModeToggle />}
          </div>
        </header>

        {/* Page content */}
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
