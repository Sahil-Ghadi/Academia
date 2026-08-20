'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, onAuthStateChanged } from "firebase/auth";
import { collection, onSnapshot, query } from "firebase/firestore";
import { auth, db } from '@/lib/firebase';
import { toast } from 'sonner';
import { API_BASE_URL } from '@/lib/api';

export type LearningMode = 'academic' | 'side-hustle';

interface UserProfile {
  name: string;
  college: string;
  course: string;
  academicSubjects: string[];
  sideHustleInterests: string[];
  onboarded: boolean;
  role?: string;
  classroom_id?: string;
}

interface ModeContextType {
  mode: LearningMode;
  setMode: (mode: LearningMode) => void;
  toggleMode: () => void;
  userProfile: UserProfile | null;
  setUserProfile: (profile: UserProfile) => void;
  isOnboarded: boolean;
  isLoading: boolean;
  user: User | null;
  isAuthenticated: boolean;
  isCrunchMode: boolean;
  crucialExam: string | null;
  refreshTrigger: number;
}

const defaultProfile: UserProfile = {
  name: '',
  college: '',
  course: '',
  academicSubjects: [],
  sideHustleInterests: [],
  onboarded: false,
};

const ModeContext = createContext<ModeContextType | undefined>(undefined);

export function ModeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<LearningMode>('academic');
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCrunchMode, setIsCrunchMode] = useState(false);
  const [crucialExam, setCrucialExam] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [crunchHash, setCrunchHash] = useState("");

  // Listen to Firebase auth state changes
  useEffect(() => {
    let unsubscribeExams: (() => void) | null = null;

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);

      // Cleanup previous listener if exists (e.g. user switch)
      if (unsubscribeExams) {
        unsubscribeExams();
        unsubscribeExams = null;
      }

      if (firebaseUser) {
        // Load user profile from localStorage for authenticated user
        const saved = localStorage.getItem(`userProfile_${firebaseUser.uid}`);
        if (saved) {
          try {
            setUserProfile(JSON.parse(saved));
          } catch (e) {
            console.error('Error parsing user profile:', e);
          }
        }

        // Fetch fresh data from backend
        fetch(`${API_BASE_URL}/profile/${firebaseUser.uid}`)
          .then(res => res.json())
          .then(data => {
            const freshProfile: UserProfile = {
              name: data.name,
              college: data.college,
              course: data.course,
              academicSubjects: data.academic_subjects || [],
              sideHustleInterests: data.side_hustle_interests || [],
              onboarded: data.onboarded,
              role: data.role || "student",
              classroom_id: data.classroom_id
            };
            setUserProfile(freshProfile);
          })
          .catch(err => console.error("Failed to fetch fresh profile:", err));

        // Setup real-time listener for exams to handle Crunch Mode
        const examsRef = collection(db, 'user_profiles', firebaseUser.uid, 'exams');
        unsubscribeExams = onSnapshot(examsRef, (snapshot) => {
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          const tomorrow = new Date(today);
          tomorrow.setDate(tomorrow.getDate() + 1);
          tomorrow.setHours(23, 59, 59, 999);

          let foundCrunchMode = false;
          let foundExamName = null;
          const currentHighPriorityExams: string[] = [];

          snapshot.docs.forEach(doc => {
            const data = doc.data();
            if (data.date) {
              const examDate = new Date(data.date);
              // Check DATE only (ignore time components for safety)
              const examDateOnly = new Date(examDate);
              examDateOnly.setHours(0, 0, 0, 0);

              // Check if exam is today or tomorrow
              if (examDateOnly.getTime() <= tomorrow.getTime() && examDateOnly.getTime() >= today.getTime()) {

                // Check syllabus completion
                const total = data.total_topics || 0;
                const completed = data.completed_topics || 0;

                if (total > 0 && completed >= total) {
                  return;
                }

                foundCrunchMode = true;
                foundExamName = data.subject || 'Unknown Subject';

                // Add to signature for change detection
                // We use subject + date to track unique composition
                currentHighPriorityExams.push(`${data.subject}_${data.date}`);
              }
            }
          });

          const newHash = currentHighPriorityExams.sort().join('|');

          setIsCrunchMode(foundCrunchMode);
          setCrucialExam(foundExamName);

          if (foundCrunchMode) {
            setMode('academic');
          }

          // Check if the composition of urgent exams changed
          setCrunchHash(prev => {
            if (prev !== newHash && newHash.length > 0) {
              // Significant change in urgent exams -> Trigger Update
              console.log("Urgent exams changed, triggering refresh...");
              return newHash;
            }
            return prev;
          });

        });

      } else {
        setUserProfile(null);
        setIsCrunchMode(false);
        setCrucialExam(null);
      }

      // CRITICAL: Ensure loading state is turned off
      setIsLoading(false);
    });

    // Cleanup listener for auth state AND exams when component unmounts
    return () => {
      if (unsubscribeExams) unsubscribeExams();
      unsubscribe();
    };
  }, []);

  // Auto-Regen Schedule on Crunch Mode Activation OR Hash Change
  useEffect(() => {
    if (isCrunchMode && userProfile && user && crunchHash) {
      // Debounce slightly or just check if recent regen happened?
      // We'll trust the hash change is infrequent enough (only on exam add/edit)

      const generate = async () => {
        console.log("Auto-generating schedule for hash:", crunchHash);
        try {
          const settings = {
            uid: user.uid,
            available_hours: 4,
            start_time: "09:00",
            end_time: "21:00",
            constraints: "Crunch Mode Auto-Optimization",
            view_mode: "daily"
          };

          await fetch(`${API_BASE_URL}/planner/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(settings)
          });

          // Signal UI to refresh
          setRefreshTrigger(prev => prev + 1);
          toast.info("Schedule updated for new exam priorities!");

        } catch (e) {
          console.error("Auto-regen failed", e);
        }
      };

      generate();
    }
  }, [crunchHash, isCrunchMode, user, userProfile]);

  // Save user profile to localStorage whenever it changes
  useEffect(() => {
    if (userProfile && user) {
      localStorage.setItem(`userProfile_${user.uid}`, JSON.stringify(userProfile));
    }
  }, [userProfile, user]);

  // Apply mode class to document
  useEffect(() => {
    const root = document.documentElement;
    if (mode === 'side-hustle') {
      root.classList.add('side-hustle-mode');
    } else {
      root.classList.remove('side-hustle-mode');
    }
  }, [mode]);

  const toggleMode = () => {
    if (isCrunchMode) return;
    setMode(prev => prev === 'academic' ? 'side-hustle' : 'academic');
  };

  const isOnboarded = userProfile?.onboarded ?? false;
  const isAuthenticated = user !== null;

  return (
    <ModeContext.Provider value={{
      mode,
      setMode,
      toggleMode,
      userProfile,
      setUserProfile,
      isOnboarded,
      isLoading,
      user,
      isAuthenticated,
      isCrunchMode,
      crucialExam,
      refreshTrigger
    }}>
      {children}
    </ModeContext.Provider>
  );
}

export function useMode() {
  const context = useContext(ModeContext);
  if (context === undefined) {
    throw new Error('useMode must be used within a ModeProvider');
  }
  return context;
}
