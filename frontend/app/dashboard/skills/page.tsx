'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useGamification, Badge, XPHistoryItem } from '@/contexts/GamificationContext';
import { DashboardLayout } from '@/components/DashboardLayout';
import { GlowCard } from '@/components/ui/GlowCard';
import {
  Flame, Zap, Trophy, Star, TrendingUp, Shield, Lock, ChevronRight,
  FileText, Rocket, PlaySquare, Award
} from 'lucide-react';
import { DynamicIcon } from '@/components/GamificationOverlay';

// ─── Level Card ─────────────────────────────────────────────────────────────

function LevelCard() {
  const { state } = useGamification();
  if (!state) return null;
  const { level_info, total_xp, current_streak, longest_streak } = state;

  return (
    <div className="relative overflow-hidden rounded-[24px] bg-card border border-border/80 p-8 shadow-sm flex flex-col justify-between h-full">
      <div className="absolute top-0 right-0 p-32 bg-primary/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 p-32 bg-violet-500/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative z-10 space-y-8">
        {/* Level header */}
        <div className="flex items-center gap-6">
          <div className="relative flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-primary/20 to-violet-500/10 border border-primary/20 shadow-inner shrink-0">
            <DynamicIcon name={level_info.icon} className="h-10 w-10 text-primary drop-shadow-md" />
            <div className="absolute -bottom-2 -right-2 h-8 w-8 bg-background rounded-full border border-border/80 flex items-center justify-center shadow-sm">
              <Star className="h-4 w-4 text-yellow-500" fill="currentColor" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] bg-muted text-muted-foreground px-2.5 py-0.5 rounded-full border border-border/50">
                Rank Info
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-sm font-bold text-muted-foreground">LVL</span>
              <p className="text-6xl font-black text-foreground tracking-tighter drop-shadow-sm">{level_info.level}</p>
            </div>
            <p className="text-lg font-bold text-primary mt-1">{level_info.title}</p>
          </div>
        </div>

        {/* XP Bar */}
        <div className="bg-muted/30 rounded-2xl p-5 border border-border/50">
          <div className="mb-3 flex justify-between text-xs font-bold text-muted-foreground">
            <span className="text-foreground">{level_info.xp_in_level.toLocaleString()} XP</span>
            <span className="flex items-center gap-1">Next: {level_info.next_title} <ChevronRight className="h-3 w-3" /></span>
          </div>
          <div className="h-4 w-full overflow-hidden rounded-full bg-muted shadow-inner">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${level_info.progress_pct}%` }}
              transition={{ duration: 1.5, ease: 'easeOut' }}
              className="relative h-full rounded-full bg-gradient-to-r from-primary to-violet-500 shadow-sm"
            >
              {/* Shimmer */}
              <motion.div
                animate={{ x: ['-100%', '200%'] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear', repeatDelay: 1 }}
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
              />
            </motion.div>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <span className="text-[11px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-md border border-primary/20">{level_info.progress_pct}% Complete</span>
            <span className="text-[11px] font-medium text-muted-foreground">{level_info.xp_to_next > 0 ? `${level_info.xp_to_next} XP to level up` : '🎉 Max Level!'}</span>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { icon: Zap, label: 'Total XP', value: total_xp.toLocaleString(), color: 'text-yellow-500', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20' },
            { icon: Flame, label: 'Streak', value: `${current_streak} days`, color: 'text-orange-500', bg: 'bg-orange-500/10', border: 'border-orange-500/20' },
            { icon: Trophy, label: 'Best', value: `${longest_streak} days`, color: 'text-purple-500', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
          ].map((stat) => (
            <div
              key={stat.label}
              className={`flex flex-col items-center justify-center gap-1.5 rounded-2xl ${stat.bg} border ${stat.border} p-4 transition-all hover:scale-[1.02] cursor-default`}
            >
              <stat.icon className={`h-5 w-5 ${stat.color} mb-1 drop-shadow-sm`} />
              <p className={`text-xl font-black leading-none ${stat.color}`}>{stat.value}</p>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Streak Calendar (last 14 days) ─────────────────────────────────────────

function StreakCalendar() {
  const { state } = useGamification();
  if (!state) return null;

  const today = new Date();
  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (13 - i));
    return d.toISOString().split('T')[0];
  });

  const activeDays = new Set(state.xp_history.map((h) => h.date));

  return (
    <GlowCard>
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500/10">
          <Flame className="h-5 w-5 text-orange-500" />
        </div>
        <div>
          <h3 className="font-bold">Study Streak</h3>
          <p className="text-xs text-muted-foreground">Last 14 days of activity</p>
        </div>
      </div>

      <div className="flex gap-1.5 flex-wrap">
        {days.map((day, i) => {
          const isActive = activeDays.has(day);
          const isToday = day === today.toISOString().split('T')[0];
          const dayLabel = new Date(day).toLocaleDateString('en-US', { weekday: 'short' })[0];

          return (
            <div key={day} className="flex flex-col items-center gap-1.5 w-[28px]">
              <p className="text-[9px] font-mono text-muted-foreground">{dayLabel}</p>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: i * 0.03, type: 'spring', stiffness: 300 }}
                className={`relative h-7 w-7 rounded-[4px] transition-colors ${
                  isActive
                    ? 'bg-emerald-500/80 shadow-sm shadow-emerald-500/20'
                    : 'bg-muted/40 border border-border/50'
                } ${isToday ? 'ring-2 ring-emerald-400 ring-offset-2 ring-offset-background' : ''}`}
              />
            </div>
          );
        })}
      </div>
    </GlowCard>
  );
}

// ─── Badges Grid ─────────────────────────────────────────────────────────────

function BadgesGrid() {
  const { state } = useGamification();
  if (!state) return null;

  return (
    <GlowCard>
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-yellow-500/10">
          <Shield className="h-5 w-5 text-yellow-500" />
        </div>
        <div>
          <h3 className="font-bold">Badges</h3>
          <p className="text-xs text-muted-foreground">
            {state.badges.filter((b) => b.unlocked).length} / {state.badges.length} unlocked
          </p>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-3">
        {state.badges.map((badge, i) => (
          <motion.div
            key={badge.id}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: i * 0.06, type: 'spring', stiffness: 200 }}
            whileHover={{ scale: 1.1, y: -2 }}
            className={`group relative flex flex-col items-center gap-1.5 rounded-xl p-3 border transition-all cursor-default ${
              badge.unlocked
                ? 'border-yellow-500/30 bg-gradient-to-b from-yellow-500/10 to-amber-500/5 shadow-sm shadow-yellow-500/10'
                : 'border-border/50 bg-muted/20 opacity-50'
            }`}
          >
            {/* Hover Tooltip */}
            <div className="pointer-events-none absolute -top-12 left-1/2 z-50 -translate-x-1/2 opacity-0 transition-all group-hover:-top-14 group-hover:opacity-100">
              <div className="whitespace-nowrap rounded-lg bg-popover px-3 py-1.5 text-xs font-semibold text-popover-foreground shadow-xl border border-border">
                {badge.desc}
              </div>
              <div className="absolute -bottom-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 border-b border-r border-border bg-popover" />
            </div>

            <div className={`text-3xl ${!badge.unlocked ? 'opacity-40' : 'text-yellow-400'}`}>
              <DynamicIcon name={badge.icon} className="h-8 w-8" />
            </div>
            <p className="text-center text-[11px] font-semibold leading-tight text-foreground">
              {badge.name}
            </p>
            {badge.unlocked && (
              <motion.div
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-yellow-400 border-2 border-background"
              />
            )}
          </motion.div>
        ))}
      </div>
    </GlowCard>
  );
}

// ─── XP History ──────────────────────────────────────────────────────────────

function XPHistory() {
  const { state } = useGamification();
  if (!state || state.xp_history.length === 0) return null;

  return (
    <GlowCard>
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
          <Zap className="h-5 w-5 text-primary" />
        </div>
        <h3 className="font-bold">Recent XP</h3>
      </div>
      <div className="space-y-2">
        {[...state.xp_history].reverse().slice(0, 5).map((item, i) => (
          <motion.div
            key={`${item.ts}-${i}`}
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: i * 0.05 }}
            className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2"
          >
            <span className="text-sm text-foreground">{item.event}</span>
            <span className="text-sm font-bold text-yellow-500">+{item.xp}</span>
          </motion.div>
        ))}
      </div>
    </GlowCard>
  );
}

// ─── Stats Cards ─────────────────────────────────────────────────────────────

function StatsRow() {
  const { state } = useGamification();
  if (!state) return null;

  const stats = [
    { icon: FileText, label: 'Assessments', value: state.assessments_taken, color: 'from-blue-500/20 to-blue-600/10 border-blue-500/20', iconColor: 'text-blue-500' },
    { icon: Rocket, label: 'Projects Done', value: state.projects_completed, color: 'from-purple-500/20 to-purple-600/10 border-purple-500/20', iconColor: 'text-purple-500' },
    { icon: PlaySquare, label: 'Videos Watched', value: state.videos_watched, color: 'from-emerald-500/20 to-emerald-600/10 border-emerald-500/20', iconColor: 'text-emerald-500' },
  ];

  return (
    <div className="grid grid-cols-3 gap-4">
      {stats.map((s, i) => (
        <motion.div
          key={s.label}
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: i * 0.1 }}
          className={`relative overflow-hidden rounded-xl border bg-gradient-to-br ${s.color} p-5 flex items-center gap-4`}
        >
          <div className={`flex items-center justify-center h-12 w-12 rounded-xl bg-background/50 border ${s.color}`}>
            <s.icon className={`h-6 w-6 ${s.iconColor}`} />
          </div>
          <div>
            <p className="text-3xl font-black text-foreground">{s.value}</p>
            <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{s.label}</p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SkillsPage() {
  const { state, isLoading } = useGamification();

  return (
    <DashboardLayout
      title="🏆 Your Progress"
      subtitle="XP, streaks, badges and achievements"
    >
      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="h-10 w-10 rounded-full border-4 border-primary border-t-transparent"
          />
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-5"
        >
          <StatsRow />

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_1fr]">
            <LevelCard />
            <div className="space-y-5">
              <StreakCalendar />
              <XPHistory />
            </div>
          </div>

          <BadgesGrid />
        </motion.div>
      )}
    </DashboardLayout>
  );
}
