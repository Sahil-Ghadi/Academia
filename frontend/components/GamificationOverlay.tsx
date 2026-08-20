'use client';

import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGamification } from '@/contexts/GamificationContext';
import confetti from 'canvas-confetti';
import * as LucideIcons from 'lucide-react';

// Helper to render dynamic lucide icons
export const DynamicIcon = ({ name, className }: { name: string, className?: string }) => {
  const Icon = (LucideIcons as any)[name];
  if (!Icon) return <LucideIcons.HelpCircle className={className} />;
  return <Icon className={className} />;
};

// ─── XP Float Particle (the +XP that floats up) ───────────────────────────

function XPBurst({ xp, label }: { xp: number; label: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 0, scale: 0.5 }}
      animate={{ opacity: [0, 1, 1, 0], y: -80, scale: [0.5, 1.2, 1, 0.8] }}
      transition={{ duration: 2.2, ease: 'easeOut' }}
      className="pointer-events-none fixed bottom-24 right-6 z-[9999] flex flex-col items-end gap-1"
    >
      <div className="flex items-center gap-2 rounded-2xl border border-yellow-400/40 bg-gradient-to-r from-yellow-500/90 to-amber-400/90 px-4 py-2 shadow-2xl shadow-yellow-500/30 backdrop-blur-sm">
        <span className="text-lg font-black text-white drop-shadow">+{xp} XP</span>
        <LucideIcons.Zap className="h-5 w-5 text-white" />
      </div>
      <span className="rounded-full bg-black/60 px-3 py-0.5 text-xs font-medium text-white/90 backdrop-blur-sm">
        {label}
      </span>
    </motion.div>
  );
}

// ─── Streak Banner ─────────────────────────────────────────────────────────

function StreakBanner({ streak }: { streak: number }) {
  return (
    <motion.div
      initial={{ x: 120, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 120, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      className="pointer-events-none fixed right-6 top-20 z-[9999] overflow-hidden rounded-2xl border border-orange-500/30 bg-gradient-to-br from-orange-600 to-red-600 px-5 py-3 shadow-2xl shadow-orange-500/40"
    >
      <div className="flex items-center gap-3">
        <motion.span
          animate={{ rotate: [0, -15, 15, -10, 10, 0], scale: [1, 1.3, 1] }}
          transition={{ duration: 0.8, ease: 'easeInOut' }}
          className="text-white"
        >
          <LucideIcons.Flame className="h-8 w-8" />
        </motion.span>
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-orange-200">
            Streak Extended!
          </p>
          <p className="text-2xl font-black text-white">{streak} Days</p>
        </div>
      </div>
      {/* Shimmer effect */}
      <motion.div
        animate={{ x: ['−100%', '200%'] }}
        transition={{ duration: 1.5, delay: 0.3 }}
        className="absolute inset-0 -skew-x-12 bg-gradient-to-r from-transparent via-white/20 to-transparent"
      />
    </motion.div>
  );
}

// ─── Level Up Overlay ──────────────────────────────────────────────────────

function LevelUpOverlay({ newLevel }: { newLevel: { level: number; title: string; icon: string } }) {
  const fired = useRef(false);
  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    // Multi-burst confetti
    const end = Date.now() + 2500;
    const colors = ['#a855f7', '#6366f1', '#ec4899', '#f59e0b', '#10b981'];
    const frame = () => {
      confetti({ particleCount: 5, angle: 60, spread: 55, origin: { x: 0 }, colors });
      confetti({ particleCount: 5, angle: 120, spread: 55, origin: { x: 1 }, colors });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="pointer-events-none fixed inset-0 z-[9998] flex items-center justify-center"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Card */}
      <motion.div
        initial={{ scale: 0.3, opacity: 0, rotateY: -90 }}
        animate={{ scale: 1, opacity: 1, rotateY: 0 }}
        exit={{ scale: 0.8, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20, delay: 0.1 }}
        className="relative z-10 flex flex-col items-center gap-4 rounded-3xl border border-purple-500/40 bg-gradient-to-b from-purple-900 to-indigo-950 px-12 py-10 shadow-[0_0_80px_rgba(168,85,247,0.4)] text-center"
      >
        {/* Glow ring */}
        <motion.div
          animate={{ scale: [1, 1.15, 1], opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute inset-0 rounded-3xl bg-gradient-to-b from-purple-500/20 to-transparent"
        />

        <motion.p
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-xs font-bold uppercase tracking-[0.3em] text-purple-300"
        >
          ✨ Level Up!
        </motion.p>

        <motion.div
          animate={{ rotateY: [0, 360] }}
          transition={{ duration: 1.5, delay: 0.4, ease: 'easeInOut' }}
          className="text-purple-300"
        >
          <DynamicIcon name={newLevel.icon} className="h-20 w-20" />
        </motion.div>

        <div>
          <motion.p
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="text-5xl font-black text-white"
          >
            Level {newLevel.level}
          </motion.p>
          <motion.p
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="mt-1 text-xl font-semibold text-purple-300"
          >
            {newLevel.title}
          </motion.p>
        </div>

        {/* Star burst decoration */}
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: [0, 1.5, 0], opacity: [0, 1, 0] }}
            transition={{ delay: 0.5 + i * 0.1, duration: 1.2 }}
            className="absolute text-yellow-400"
            style={{
              top: `${20 + Math.sin((i / 8) * Math.PI * 2) * 40}%`,
              left: `${50 + Math.cos((i / 8) * Math.PI * 2) * 45}%`,
              fontSize: '1.2rem',
            }}
          >
            <LucideIcons.Star className="h-6 w-6" />
          </motion.div>
        ))}
      </motion.div>
    </motion.div>
  );
}

// ─── Badge Unlocked Toast ──────────────────────────────────────────────────

function BadgeToast({ badge }: { badge: { icon: string; name: string; desc: string } }) {
  return (
    <motion.div
      initial={{ x: 120, opacity: 0, scale: 0.8 }}
      animate={{ x: 0, opacity: 1, scale: 1 }}
      exit={{ x: 120, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      className="pointer-events-none fixed bottom-36 right-6 z-[9999] overflow-hidden rounded-2xl border border-yellow-500/30 bg-gradient-to-r from-yellow-900/90 to-amber-900/90 px-5 py-3 shadow-2xl backdrop-blur-sm"
    >
      <div className="flex items-center gap-3">
        <motion.span
          animate={{ rotate: [0, 20, -20, 10, -10, 0] }}
          transition={{ duration: 0.8 }}
          className="text-yellow-400"
        >
          <DynamicIcon name={badge.icon} className="h-8 w-8" />
        </motion.span>
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-yellow-400">
            Badge Unlocked!
          </p>
          <p className="font-bold text-white">{badge.name}</p>
          <p className="text-xs text-yellow-200/70">{badge.desc}</p>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Master Orchestrator ───────────────────────────────────────────────────

export function GamificationOverlay() {
  const { lastAward, clearLastAward } = useGamification();

  useEffect(() => {
    if (!lastAward) return;
    const timer = setTimeout(() => clearLastAward(), 3500);
    return () => clearTimeout(timer);
  }, [lastAward, clearLastAward]);

  if (!lastAward) return null;

  return (
    <AnimatePresence>
      {/* Always show XP burst */}
      {lastAward.xp_awarded > 0 && (
        <XPBurst
          key={`xp-${lastAward.event_label}-${Date.now()}`}
          xp={lastAward.xp_awarded + lastAward.bonus_xp}
          label={lastAward.event_label}
        />
      )}

      {/* Streak banner only when streak > 1 */}
      {lastAward.current_streak > 1 && !lastAward.leveled_up && (
        <StreakBanner
          key={`streak-${lastAward.current_streak}`}
          streak={lastAward.current_streak}
        />
      )}

      {/* Level up takes precedence over streak banner */}
      {lastAward.leveled_up && lastAward.new_level && (
        <LevelUpOverlay
          key={`levelup-${lastAward.new_level.level}`}
          newLevel={lastAward.new_level}
        />
      )}

      {/* Badge unlocked */}
      {lastAward.new_badges?.length > 0 && (
        <BadgeToast
          key={`badge-${lastAward.new_badges[0].id}`}
          badge={lastAward.new_badges[0]}
        />
      )}
    </AnimatePresence>
  );
}
