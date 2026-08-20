'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import { useMode } from './ModeContext';
import { API_BASE_URL } from '@/lib/api';

// ─── Types ────────────────────────────────────────────────────────────────

export interface LevelInfo {
  level: number;
  title: string;
  icon: string;
  progress_pct: number;
  xp_in_level: number;
  xp_to_next: number;
  next_title: string;
}

export interface Badge {
  id: string;
  name: string;
  desc: string;
  icon: string;
  unlocked: boolean;
}

export interface XPHistoryItem {
  event: string;
  xp: number;
  ts: string;
  date: string;
}

export interface GamificationState {
  total_xp: number;
  current_streak: number;
  longest_streak: number;
  last_activity_date: string | null;
  level_info: LevelInfo;
  badges: Badge[];
  xp_history: XPHistoryItem[];
  assessments_taken: number;
  projects_completed: number;
  videos_watched: number;
}

export interface XPAwardResult {
  xp_awarded: number;
  bonus_xp: number;
  total_xp: number;
  current_streak: number;
  level_info: LevelInfo;
  leveled_up: boolean;
  new_level: LevelInfo | null;
  new_badges: Badge[];
  event_label: string;
}

export type XPEventType =
  | 'assessment_complete'
  | 'assessment_ace'
  | 'tutor_session'
  | 'video_watched'
  | 'project_complete'
  | 'exam_created'
  | 'daily_login'
  | 'streak_milestone'
  | 'note_uploaded'
  | 'skill_gap_analyzed'
  | 'resume_generated'
  | 'planner_generated';

interface GamificationContextType {
  state: GamificationState | null;
  isLoading: boolean;
  awardXP: (event: XPEventType, special?: string) => Promise<XPAwardResult | null>;
  refresh: () => void;
  // Latest award result for toast/animation triggers
  lastAward: XPAwardResult | null;
  clearLastAward: () => void;
}

// ─── Defaults ─────────────────────────────────────────────────────────────

const DEFAULT_STATE: GamificationState = {
  total_xp: 0,
  current_streak: 0,
  longest_streak: 0,
  last_activity_date: null,
  level_info: {
    level: 1,
    title: 'Novice',
    icon: 'Sprout',
    progress_pct: 0,
    xp_in_level: 0,
    xp_to_next: 200,
    next_title: 'Apprentice',
  },
  badges: [],
  xp_history: [],
  assessments_taken: 0,
  projects_completed: 0,
  videos_watched: 0,
};

const GamificationContext = createContext<GamificationContextType | undefined>(undefined);

// ─── Provider ─────────────────────────────────────────────────────────────

export function GamificationProvider({ children }: { children: ReactNode }) {
  const { user } = useMode();
  const [state, setState] = useState<GamificationState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastAward, setLastAward] = useState<XPAwardResult | null>(null);

  const fetchState = useCallback(async () => {
    if (!user?.uid) return;
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/gamification/state/${user.uid}`);
      if (res.ok) {
        const data: GamificationState = await res.json();
        setState(data);
      }
    } catch (e) {
      console.error('Failed to fetch gamification state:', e);
    } finally {
      setIsLoading(false);
    }
  }, [user?.uid]);

  // Daily login bonus — once on mount when user is available
  useEffect(() => {
    if (!user?.uid) return;
    fetchState();
    // Claim daily login bonus
    fetch(`${API_BASE_URL}/gamification/daily-login?uid=${user.uid}`, { method: 'POST' })
      .then((res) => res.json())
      .then((data) => {
        if (!data.already_awarded && data.xp_awarded) {
          setLastAward(data as XPAwardResult);
          fetchState();
        }
      })
      .catch(() => {});
  }, [user?.uid, fetchState]);

  const awardXP = useCallback(
    async (event: XPEventType, special?: string): Promise<XPAwardResult | null> => {
      if (!user?.uid) return null;
      try {
        const res = await fetch(`${API_BASE_URL}/gamification/award`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ uid: user.uid, event_type: event, special }),
        });
        if (!res.ok) return null;
        const result: XPAwardResult = await res.json();
        setLastAward(result);
        // Optimistically update total_xp + streak in state, then refresh for history
        setState((prev) => {
          if (!prev) return prev;
          const newHistory = [
            ...prev.xp_history,
            {
              event: result.event_label,
              xp: result.xp_awarded,
              ts: new Date().toISOString(),
              date: new Date().toISOString().split('T')[0],
            },
          ];
          if (result.bonus_xp > 0) {
            newHistory.push({
              event: 'Streak Bonus',
              xp: result.bonus_xp,
              ts: new Date().toISOString(),
              date: new Date().toISOString().split('T')[0],
            });
          }
          return {
            ...prev,
            total_xp: result.total_xp,
            current_streak: result.current_streak,
            level_info: result.level_info,
            xp_history: newHistory.slice(-10),
          };
        });
        fetchState();
        return result;
      } catch (e) {
        console.error('Failed to award XP:', e);
        return null;
      }
    },
    [user?.uid]
  );

  const clearLastAward = useCallback(() => setLastAward(null), []);

  return (
    <GamificationContext.Provider
      value={{ state, isLoading, awardXP, refresh: fetchState, lastAward, clearLastAward }}
    >
      {children}
    </GamificationContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────

export function useGamification() {
  const ctx = useContext(GamificationContext);
  if (!ctx) throw new Error('useGamification must be used within GamificationProvider');
  return ctx;
}
