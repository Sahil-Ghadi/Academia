'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Activity,
  BarChart3,
  Settings,
  Bot,
  GraduationCap,
  Rocket,
  Brain,
  User,
  Lock,
  School,
  Trophy
} from 'lucide-react';
import { useMode } from '@/contexts/ModeContext';
import { cn } from '@/lib/utils';

const navItems = [
  // Student-only routes (academic order)
  { path: '/dashboard',        label: 'Dashboard',       icon: LayoutDashboard, role: 'student' },
  { path: '/tutor',            label: 'AI Tutor',        icon: Bot,             role: 'student' },
  { path: '/classrooms',       label: 'Classrooms',      icon: School,          role: null },
  { path: '/insights',         label: 'Insights',        icon: Brain,           role: 'student' },
  // Teacher-only
  { path: '/teacher',          label: 'Teacher Dashboard', icon: GraduationCap, role: 'teacher' },
  // Shared — always last
  { path: '/settings',         label: 'Profile',         icon: User,            role: null },
];

export function Sidebar() {
  const pathname = usePathname();
  const { mode, userProfile, isCrunchMode, crucialExam } = useMode();

  const isTeacher = userProfile?.role === 'teacher';

  return (
    <motion.aside
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r border-border bg-sidebar"
    >
      {/* Logo */}
      <div className="flex items-center gap-3 border-b border-border p-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
          <Bot className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="font-heading font-bold text-foreground">AdaptIQ</h1>
          <p className="text-xs text-muted-foreground">{isTeacher ? 'Teacher Portal' : 'Orchestrator'}</p>
        </div>
      </div>

      {/* Mode indicator — students only */}
      {!isTeacher && (
        <div className="border-b border-border p-4">
          <div className={cn(
            "flex items-center gap-3 rounded-lg p-3 transition-colors",
            isCrunchMode ? "bg-red-500/10 border border-red-500/20" : "bg-mode-accent-soft"
          )}>
            {isCrunchMode ? (
              <Lock className="h-5 w-5 text-red-500" />
            ) : (
              <GraduationCap className="h-5 w-5 text-primary" />
            )}
            <div>
              <p className={cn("text-xs", isCrunchMode ? "text-red-500 font-bold" : "text-muted-foreground")}>
                {isCrunchMode ? "CRITICAL" : "Current Mode"}
              </p>
              <p className="font-medium capitalize truncate max-w-[140px]">
                {isCrunchMode ? "Crunch Mode" : "Academic"}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Teacher badge */}
      {isTeacher && (
        <div className="border-b border-border p-4">
          <div className="flex items-center gap-3 rounded-lg p-3 bg-accent/10 border border-accent/20">
            <GraduationCap className="h-5 w-5 text-accent" />
            <div>
              <p className="text-xs text-muted-foreground">Role</p>
              <p className="font-bold text-accent text-sm">Educator</p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-4">
        {navItems
          .filter(item => item.role === null || item.role === userProfile?.role)
          .map((item) => {
            const isActive = pathname === item.path;
            const Icon = item.icon;

            return (
              <Link key={item.path} href={item.path}>
                <div className={cn('nav-link', isActive && 'active')}>
                  <Icon className="h-5 w-5" />
                  <span>{item.label}</span>
                  {isActive && (
                    <motion.div
                      layoutId="sidebar-active"
                      className="absolute inset-0 -z-10 rounded-lg bg-primary/10"
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    />
                  )}
                </div>
              </Link>
            );
          })}
      </nav>



      {/* User Profile */}
      {userProfile && (
        <div className="border-t border-border p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20">
              <span className="text-sm font-bold text-primary">
                {userProfile.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="truncate text-sm font-medium">{userProfile.name}</p>
              <p className="truncate text-xs text-muted-foreground">{userProfile.college}</p>
            </div>
          </div>
        </div>
      )}
    </motion.aside>
  );
}
