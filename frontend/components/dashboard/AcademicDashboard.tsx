'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Calendar,
  Settings,
} from 'lucide-react';
import { GlowCard } from '@/components/ui/GlowCard';
import { UpcomingDeadlines } from '@/components/UpcomingDeadlines';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useMode } from '@/contexts/ModeContext';
import { useGamification } from '@/contexts/GamificationContext';
import { MasteryRadarChart } from './MasteryRadarChart';
import { MultilingualAITutor } from './MultilingualAITutor';
import { API_BASE_URL } from '@/lib/api';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Target, Zap, Loader2, ArrowRight } from 'lucide-react';
import { AssessmentModal } from './Exams/AssessmentModal';

export function AcademicDashboard() {
  const { user, refreshTrigger } = useMode();
  const { awardXP } = useGamification();

  // Mastery Data
  const [masteryData, setMasteryData] = useState<{ subject: string; elo: number; fullMark: number }[]>([]);

  // Up Next Feature
  const [weakestTopic, setWeakestTopic] = useState<string | null>(null);
  const [isStartingDrill, setIsStartingDrill] = useState(false);
  const [showAssessment, setShowAssessment] = useState(false);
  const [activeDrillExam, setActiveDrillExam] = useState<any>(null);

  // Fetch data function
  const fetchDashboardData = async () => {
    if (!user?.uid) return;

    try {
      // Removed Planner Fetch

      // Fetch Mastery Data from Firestore
      const userDocRef = doc(db, 'user_profiles', user.uid);
      const docSnap = await getDoc(userDocRef);
      if (docSnap.exists()) {
        const profile = docSnap.data();
        if (profile.mastery_profile) {
          const mData = Object.keys(profile.mastery_profile).map(topic => ({
            subject: topic,
            elo: profile.mastery_profile[topic].elo_rating,
            fullMark: 2000
          }));
          setMasteryData(mData);
        }
      }

      // Fetch Stats to find Weakest Area
      const statsRes = await fetch(`${API_BASE_URL}/stats/academic/${user.uid}`);
      if (statsRes.ok) {
        const data = await statsRes.json();
        if (data.weak_areas && data.weak_areas.length > 0) {
          // The first one is typically the lowest confidence or most urgent
          setWeakestTopic(data.weak_areas[0].topic);
        } else {
          setWeakestTopic(null);
        }
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    }
  };

  // Fetch data on mount and when refresh triggered
  useEffect(() => {
    fetchDashboardData();
  }, [user?.uid, refreshTrigger]);

  // Planner functions removed

  const handleStartDrill = () => {
    if (!weakestTopic || !user?.uid) return;
    setIsStartingDrill(true);
    
    // Pass a temporary exam object directly to the Assessment Modal
    // This avoids creating a permanent "exam" entry in the database for quick drills.
    const tempExam = {
      id: "temp_drill",
      subject: "Targeted Review",
      title: `Adaptive Drill: ${weakestTopic}`,
      date: new Date().toISOString(),
      syllabus: [{ name: weakestTopic, completed: false }]
    };
    
    setActiveDrillExam(tempExam);
    setShowAssessment(true);
    setIsStartingDrill(false);
  };

  return (
    <motion.div
      key="academic"
      initial={{ opacity: 0, scale: 0.95, filter: 'blur(10px)' }}
      animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
      exit={{ opacity: 0, scale: 1.05, filter: 'blur(10px)', transition: { duration: 0.4, ease: "easeIn" } }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-6"
    >
      {/* Up Next For You - Personalized Path */}
      {weakestTopic && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-violet-500/10 via-primary/5 to-transparent border border-primary/20 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm"
        >
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0 mt-1 md:mt-0">
              <Target className="h-6 w-6 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-primary bg-primary/10 px-2 py-0.5 rounded-full">Up Next For You</span>
              </div>
              <h3 className="text-lg font-bold text-foreground">Targeted Adaptive Drill: {weakestTopic}</h3>
              <p className="text-sm text-muted-foreground mt-0.5 max-w-xl">
                Our learner model detected that you struggled with <strong>{weakestTopic}</strong> recently. Take a quick 5-minute adaptive drill to improve your mastery.
              </p>
            </div>
          </div>
          <Button
            onClick={handleStartDrill}
            disabled={isStartingDrill}
            className="shrink-0 h-11 px-6 rounded-xl font-bold bg-primary text-primary-foreground hover:scale-105 transition-all shadow-md gap-2"
          >
            {isStartingDrill ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
            {isStartingDrill ? "Generating..." : "Start Adaptive Drill"}
            {!isStartingDrill && <ArrowRight className="h-4 w-4 opacity-70" />}
          </Button>
        </motion.div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[55fr_45fr]">
        {/* Multilingual AI Tutor */}
        <div className="">
          <GlowCard className="h-[560px] relative overflow-hidden flex flex-col p-0">
            <MultilingualAITutor subjects={masteryData.map(m => m.subject)} />
          </GlowCard>
        </div>

        {/* Upcoming Deadlines Panel */}
        <div className="flex flex-col h-[560px] gap-6">
          <div className="flex-1 min-h-0">
            <UpcomingDeadlines onRefreshStats={fetchDashboardData} />
          </div>
          <div className="h-[240px] shrink-0">
            <MasteryRadarChart data={masteryData} />
          </div>
        </div>
      </div>

      {/* Removed Planner Settings Modal */}

      {/* Adaptive Drill Modal */}
      <AssessmentModal
        isOpen={showAssessment}
        onClose={() => {
          setShowAssessment(false);
          setActiveDrillExam(null);
        }}
        exam={activeDrillExam}
        onUpdate={fetchDashboardData}
      />
    </motion.div>
  );
}
