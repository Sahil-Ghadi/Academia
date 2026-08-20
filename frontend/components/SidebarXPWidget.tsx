'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useGamification } from '@/contexts/GamificationContext';
import { Flame, Zap, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { DynamicIcon } from './GamificationOverlay';

export function SidebarXPWidget() {
  const { state, isLoading } = useGamification();

  if (isLoading || !state) {
    return (
      <div className="m-3 rounded-xl border border-border bg-card/50 p-3 animate-pulse">
        <div className="h-3 w-24 rounded bg-muted mb-2" />
        <div className="h-2 w-full rounded-full bg-muted" />
      </div>
    );
  }

  const { level_info, current_streak, total_xp } = state;

  return (
    <Link href="/dashboard/skills" className="block">
      <motion.div
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="m-3 cursor-pointer overflow-hidden rounded-xl border border-border bg-gradient-to-br from-card to-muted/30 p-3 transition-all hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10"
      >
        {/* Header row */}
        <div className="mb-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="text-primary">
              <DynamicIcon name={level_info.icon} className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Level {level_info.level}
              </p>
              <p className="text-xs font-bold text-foreground leading-none">{level_info.title}</p>
            </div>
          </div>

          {/* Streak badge */}
          <motion.div
            animate={current_streak > 0 ? { scale: [1, 1.05, 1] } : {}}
            transition={{ duration: 2, repeat: Infinity }}
            className="flex items-center gap-1 rounded-full bg-orange-500/15 px-2 py-0.5 border border-orange-500/20"
          >
            <Flame className="h-3 w-3 text-orange-500" />
            <span className="text-xs font-bold text-orange-500">{current_streak}</span>
          </motion.div>
        </div>

        {/* XP Progress bar */}
        <div className="mb-1.5">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${level_info.progress_pct}%` }}
              transition={{ duration: 1, ease: 'easeOut', delay: 0.2 }}
              className="h-full rounded-full bg-gradient-to-r from-primary to-violet-500"
            />
          </div>
        </div>

        {/* XP numbers */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <Zap className="h-3 w-3 text-yellow-500" />
            <span className="text-[11px] font-bold text-yellow-500">{total_xp.toLocaleString()} XP</span>
          </div>
          <span className="text-[10px] text-muted-foreground">
            {level_info.xp_to_next > 0 ? `${level_info.xp_to_next} to ${level_info.next_title}` : 'Max Level!'}
          </span>
        </div>
      </motion.div>
    </Link>
  );
}
