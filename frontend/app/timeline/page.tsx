'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Bot,
  Calendar,
  Target,
  Brain,
  AlertTriangle,
  TrendingUp,
  Clock,
  Zap,
  Code,
  Book,
  Rocket
} from 'lucide-react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { GlowCard, AgentBadge } from '@/components/ui/GlowCard';
import { useMode } from '@/contexts/ModeContext';
import { API_BASE_URL } from '@/lib/api';

interface TimelineEvent {
  id: number;
  type: string;
  icon: string;
  title: string;
  description: string;
  time: string;
  date: string;
  details: string[];
}

const iconMap: Record<string, any> = {
  Calendar,
  Target,
  Brain,
  AlertTriangle,
  TrendingUp,
  Clock,
  Zap,
  Code,
  Bot,
  Book,
  Rocket
};

const typeColors = {
  schedule: 'from-blue-500 to-cyan-500',
  detection: 'from-orange-500 to-red-500',
  adjustment: 'from-purple-500 to-pink-500',
  priority: 'from-green-500 to-emerald-500',
  insight: 'from-indigo-500 to-purple-500',
  roadmap: 'from-amber-500 to-orange-500',
  project: 'from-violet-500 to-purple-500',
};

export default function Timeline() {
  const { mode, isOnboarded, isLoading, user } = useMode();
  const router = useRouter();
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !isOnboarded) {
      router.push('/onboarding');
    }
  }, [isOnboarded, isLoading, router]);

  useEffect(() => {
    const fetchTimelineEvents = async () => {
      if (!user) return;

      try {
        setDataLoading(true);
        const response = await fetch(`${API_BASE_URL}/timeline/events/${user.uid}?mode=${mode}`);

        if (!response.ok) {
          throw new Error('Failed to fetch timeline events');
        }

        const data = await response.json();
        setEvents(data.events || []);
        setError(null);
      } catch (err) {
        console.error('Error fetching timeline:', err);
        setError('Failed to load timeline events');
        // Set default event on error
        setEvents([{
          id: 1,
          type: 'schedule',
          icon: 'Bot',
          title: 'AI Agent Initialized',
          description: 'Your personalized learning assistant is now active.',
          time: 'Just now',
          date: 'Today',
          details: ['Ready to create study plans', 'Tracking your progress']
        }]);
      } finally {
        setDataLoading(false);
      }
    };

    if (user && !isLoading && isOnboarded) {
      fetchTimelineEvents();
    }
  }, [user, mode, isLoading, isOnboarded]);

  if (isLoading || !isOnboarded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-pulse text-lg text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <DashboardLayout
      title="Agent Activity Timeline"
      subtitle="Real-time log of autonomous AI decisions and actions"
    >
      <div className="mx-auto max-w-4xl">
        {/* Header Card */}
        <GlowCard className="mb-8" delay={0}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/20">
                  <Bot className="h-7 w-7 text-primary" />
                </div>
                <span className="absolute -right-1 -top-1 flex h-4 w-4">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
                  <span className="relative inline-flex h-4 w-4 rounded-full bg-accent" />
                </span>
              </div>
              <div>
                <h2 className="font-heading text-xl font-bold">AI Orchestrator Active</h2>
                <p className="text-sm text-muted-foreground">
                  Continuously monitoring and optimizing your {mode === 'academic' ? 'academic' : 'skill-building'} journey
                </p>
              </div>
            </div>
            <AgentBadge>Autonomous Mode</AgentBadge>
          </div>
        </GlowCard>

        {/* Loading State */}
        {dataLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-pulse text-muted-foreground">Loading timeline events...</div>
          </div>
        )}

        {/* Error State */}
        {error && !dataLoading && (
          <GlowCard delay={0.1}>
            <div className="text-center py-8">
              <AlertTriangle className="h-12 w-12 text-orange-500 mx-auto mb-4" />
              <p className="text-muted-foreground">{error}</p>
            </div>
          </GlowCard>
        )}

        {/* Timeline */}
        {!dataLoading && !error && (
          <div className="space-y-0">
            {events.map((event, index) => {
              const Icon = iconMap[event.icon] || Bot;
              return (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="timeline-item"
                >
                  <div className={`timeline-dot bg-gradient-to-br ${typeColors[event.type as keyof typeof typeColors] || 'from-gray-500 to-gray-600'}`}>
                    <Icon className="h-3 w-3 text-white" />
                  </div>
                  <div className="rounded-xl border border-border bg-card p-5 shadow-soft">
                    <div className="mb-2 flex items-start justify-between">
                      <div>
                        <h3 className="font-heading font-bold">{event.title}</h3>
                        <p className="mt-1 text-sm text-muted-foreground">{event.description}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-medium">{event.time}</span>
                        <p className="text-xs text-muted-foreground">{event.date}</p>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {event.details.map((detail, i) => (
                        <span
                          key={i}
                          className="rounded-full bg-muted px-3 py-1 text-xs"
                        >
                          {detail}
                        </span>
                      ))}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
