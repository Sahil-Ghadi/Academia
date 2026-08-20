'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Code,
  Rocket,
  Youtube,
  BookMarked,
  Zap,
  FolderKanban,
  AlertCircle,
  Check,
  RefreshCw,
  Loader2
} from 'lucide-react';
import { GlowCard, StatCard, ProgressBar, AgentBadge } from '@/components/ui/GlowCard';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { StreakHeatmap } from '@/components/dashboard/StreakHeatmap';

import { useMode } from '@/contexts/ModeContext';
import { useRouter } from 'next/navigation';
import { useGamification } from '@/contexts/GamificationContext';

const iconMap: Record<string, any> = {
  Code,
  FolderKanban,
  Zap,
  Rocket
};

const difficultyColors = {
  Beginner: 'bg-accent/20 text-accent',
  Intermediate: 'bg-primary/20 text-primary',
  Advanced: 'bg-destructive/20 text-destructive',
};

const statusColors = {
  'In Progress': 'bg-primary/20 text-primary',
  'Completed': 'bg-accent/20 text-accent',
  'Queued': 'bg-muted text-muted-foreground',
};

import { API_BASE_URL } from '@/lib/api';
import { ProjectSubmissionModal } from '@/components/dashboard/SideHustle/ProjectSubmissionModal';

export function SideHustleDashboard() {
  const { user } = useMode();
  const { refresh: refreshXP } = useGamification();
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<any | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user) return;

      try {
        setLoading(true);
        const response = await fetch(`${API_BASE_URL}/dashboard/sidehustle/${user.uid}`);

        if (response.ok) {
          const data = await response.json();
          setDashboardData(data);
        }
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const handleSubmissionSuccess = (result: any) => {
    if (!selectedProject) return;

    // Update local dashboard stats
    setDashboardData((prev: any) => ({
      ...prev,
      assigned_projects: prev.assigned_projects.filter((p: any) => p.id !== selectedProject.id),
      stats: {
        ...prev.stats,
        projects_completed: (prev.stats?.projects_completed || 0) + 1,
        xp: (prev.stats?.xp || 0) + result.xp_awarded,
      },
    }));

    // Sync gamification context so sidebar XP widget updates
    refreshXP();
    setSelectedProject(null);
  };

  const handleGenerateProject = async () => {
    if (!user) return;
    const toastId = toast.loading("Analyzing your skills and generating a project...");
    try {
      const res = await fetch(`${API_BASE_URL}/projects/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: user.uid })
      });

      if (!res.ok) throw new Error("Failed to generate project");

      const data = await res.json();

      setDashboardData((prev: any) => ({
        ...prev,
        assigned_projects: [data.project, ...(prev.assigned_projects || [])]
      }));

      toast.success("New project assigned!", { id: toastId });
    } catch (error) {
      console.error(error);
      toast.error("Failed to generate project", { id: toastId });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-pulse text-muted-foreground">Loading dashboard...</div>
      </div>
    );
  }

  const stats = dashboardData?.stats || {};
  const skillProgress = dashboardData?.skill_progress || [];
  const learningSources = dashboardData?.learning_sources || [];
  const assignedProjects = dashboardData?.assigned_projects || [];
  const activityAlerts = dashboardData?.activity_alerts || [];

  return (
    <motion.div
      key="side-hustle"
      initial={{ opacity: 0, scale: 1.05, filter: 'blur(10px)' }}
      animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
      exit={{ opacity: 0, scale: 0.95, filter: 'blur(10px)', transition: { duration: 0.4, ease: "easeIn" } }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-8"
    >


      {/* Main Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Skill Progress Tracker */}
        <GlowCard className="lg:col-span-2" delay={0.2}>
          <div className="mb-6 flex items-center justify-between">
            <h2 className="font-heading text-xl font-bold">Skill Progress Tracker</h2>
            <AgentBadge>AI Monitored</AgentBadge>
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {skillProgress.map((skill: any, index: number) => {
              const Icon = iconMap[skill.icon] || Code;
              return (
                <motion.div
                  key={skill.name}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + index * 0.1 }}
                  onClick={() => router.push(`/dashboard/skills/${encodeURIComponent(skill.name)}`)}
                  className="rounded-xl border border-border bg-mode-surface-elevated p-4 cursor-pointer hover:border-primary/50 hover:shadow-lg transition-all"
                >
                  <div className="mb-4 flex items-center gap-3">
                    <div className="icon-container">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <span className="font-medium">{skill.name}</span>
                  </div>
                  <ProgressBar value={skill.progress} label="" />
                </motion.div>
              );
            })}
          </div>
        </GlowCard>


        <StreakHeatmap data={dashboardData?.daily_activity || []} />
      </div>

      {/* Projects & Activity */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Auto-Assigned Projects */}
        <GlowCard delay={0.4}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-heading text-xl font-bold">Auto-Assigned Projects</h2>
            <div className="flex items-center gap-2">
              <AgentBadge>Assigned by AI Agent</AgentBadge>
            </div>

          </div>
          <div className="space-y-4">
            {assignedProjects.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-6 text-center border border-dashed border-zinc-800 rounded-lg">
                <p className="text-zinc-500 text-sm mb-3">No active projects.</p>
                <p className="text-xs text-zinc-600">Complete roadmap phases to unlock new projects.</p>
              </div>
            ) : (
              assignedProjects.map((project: any, index: number) => (
                <motion.div
                  key={project.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + index * 0.1 }}
                  onClick={() => user && setSelectedProject({ ...project, uid: user.uid })}
                  className="rounded-xl border border-border bg-mode-surface-elevated p-4 group relative overflow-hidden cursor-pointer hover:border-primary/50 hover:shadow-lg transition-all"
                >
                  <div className="mb-3 flex items-start justify-between">
                    <h3 className="font-medium pr-8">{project.title}</h3>
                    <span className={`rounded-full px-2 py-0.5 text-xs ${difficultyColors[project.difficulty as keyof typeof difficultyColors] || 'bg-muted text-muted-foreground'}`}>
                      {project.difficulty}
                    </span>
                  </div>
                  <p className="mb-3 text-sm text-muted-foreground">{project.description}</p>

                  <div className="flex items-center justify-between mt-4">
                    <p className="text-xs text-zinc-500">Est. {project.estimatedTime}</p>
                    <div className="flex items-center text-primary text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                      View Details <Rocket className="ml-1 h-3 w-3" />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1 mt-3 pt-3 border-t border-zinc-800/50">
                    {project.skills?.map((skill: string) => (
                      <span key={skill} className="rounded-md bg-zinc-800/50 px-2 py-0.5 text-[10px] text-zinc-400">
                        {skill}
                      </span>
                    ))}
                  </div>
                </motion.div>
              )))}
          </div>
        </GlowCard>

        {/* Skill Activity Monitor */}
        <GlowCard delay={0.5}>
          <div className="mb-4 flex items-center gap-2">
            <div className="relative">
              <AlertCircle className="h-5 w-5 text-primary" />
              <span className="absolute -right-1 -top-1 flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
              </span>
            </div>
            <h2 className="font-heading text-xl font-bold">Skill Activity Monitor</h2>
          </div>
          <div className="space-y-4">
            {activityAlerts.map((alert: any, index: number) => (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 + index * 0.1 }}
                className={`rounded-lg border p-4 ${alert.type === 'warning'
                  ? 'border-destructive/30 bg-destructive/10'
                  : alert.type === 'success'
                    ? 'border-accent/30 bg-accent/10'
                    : 'border-border bg-mode-accent-soft'
                  }`}
              >
                <p className="text-sm">{alert.message}</p>
                <p className="mt-2 text-xs text-muted-foreground">{alert.time}</p>
              </motion.div>
            ))}
          </div>
        </GlowCard>
      </div >



      <ProjectSubmissionModal
        isOpen={!!selectedProject}
        onClose={() => setSelectedProject(null)}
        project={selectedProject}
        onSuccess={handleSubmissionSuccess}
      />
    </motion.div >
  );
}
