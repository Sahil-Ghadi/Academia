'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot,
  ArrowRight,
  ArrowLeft,
  User,
  GraduationCap,
  Rocket,
  Check,
  Plus,
  X,
  Sparkles,
  Loader2,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { auth } from '@/lib/firebase';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useMode } from '@/contexts/ModeContext';
import { API_BASE_URL } from '@/lib/api';

/**
 * A component that scrolls text horizontally if it overflows its container.
 */
function MarqueeText({ text, className }: { text: string; className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const [shouldAnimate, setShouldAnimate] = useState(false);

  useEffect(() => {
    if (containerRef.current && textRef.current) {
      const containerWidth = containerRef.current.offsetWidth;
      const textWidth = textRef.current.offsetWidth;
      setShouldAnimate(textWidth > containerWidth);
    }
  }, [text]);

  if (!shouldAnimate) {
    return <span className={className}>{text}</span>;
  }

  return (
    <div ref={containerRef} className={cn("overflow-hidden whitespace-nowrap relative", className)}>
      <motion.div
        ref={textRef}
        className="inline-flex"
        animate={{
          x: ["-0%", "-50%"],
        }}
        transition={{
          x: {
            repeat: Infinity,
            repeatType: "loop",
            duration: Math.max(text.length * 0.15, 5),
            ease: "linear",
          },
        }}
      >
        <span className="pr-8">{text}</span>
        <span className="pr-8">{text}</span>
      </motion.div>
    </div>
  );
}

export default function OnboardingPage() {
  const router = useRouter();
  const { setUserProfile } = useMode();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingSuggestions, setIsFetchingSuggestions] = useState(false);

  const [formData, setFormData] = useState({
    role: '', // 'student' | 'teacher'
    name: '',
    college: '',
    degree: '',
    academicSubjects: [] as string[],
    sideHustleInterests: [] as string[],
  });

  const [aiSuggestions, setAiSuggestions] = useState({
    subjects: [] as string[],
    interests: [] as string[],
  });

  const [customSubject, setCustomSubject] = useState('');
  const [customInterest, setCustomInterest] = useState('');

  const totalSteps = formData.role === 'teacher' ? 2 : 4;

  // Auto-fill name and email from Google auth
  useEffect(() => {
    const user = auth.currentUser;
    if (user) {
      setFormData(prev => ({
        ...prev,
        name: user.displayName || prev.name,
        // If you want to use email as college initially, uncomment:
        // college: user.email || prev.college
      }));
    }
  }, []);

  useEffect(() => {
    if (step === 3 && formData.degree && aiSuggestions.subjects.length === 0) {
      fetchAISuggestions();
    }
  }, [step, formData.degree]);

  const fetchAISuggestions = async () => {
    setIsFetchingSuggestions(true);
    try {
      const response = await fetch(`${API_BASE_URL}/suggestions/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          degree: formData.degree,
          major: formData.degree,
        }),
      });

      if (!response.ok) throw new Error('Failed to fetch suggestions');

      const data = await response.json();
      setAiSuggestions({
        subjects: data.subjects || [],
        interests: data.side_hustle_interests || [],
      });

      toast.success('AI suggestions generated!');
    } catch (error) {
      console.error('Error fetching suggestions:', error);
      toast.error('Failed to generate suggestions');
    } finally {
      setIsFetchingSuggestions(false);
    }
  };

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) {
        toast.error("Please sign in first");
        router.push('/login');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/profile/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          uid: user.uid,
          name: formData.name,
          college: formData.college,
          course: formData.degree,
          academic_subjects: formData.academicSubjects,
          side_hustle_interests: formData.sideHustleInterests,
          onboarded: true,
          role: formData.role,
        }),
      });

      if (!response.ok) throw new Error('Failed to create profile');

      // Update the ModeContext with the new profile BEFORE redirecting
      setUserProfile({
        name: formData.name,
        college: formData.college,
        course: formData.degree,
        academicSubjects: formData.academicSubjects,
        sideHustleInterests: formData.sideHustleInterests,
        onboarded: true,
        role: formData.role,
      });

      toast.success('🚀 Profile created! Redirecting to dashboard...');

      // Small delay to show the success toast, then redirect
      await new Promise(resolve => setTimeout(resolve, 500));

      // Use Next.js router with refresh to ensure clean navigation
      router.push(formData.role === 'teacher' ? '/teacher' : '/dashboard');
      router.refresh();
    } catch (error: any) {
      console.error('Error creating profile:', error);
      toast.error(error.message || 'Failed to create profile');
      setIsLoading(false);
    }
  };

  const toggleSubject = (subject: string) => {
    setFormData(prev => ({
      ...prev,
      academicSubjects: prev.academicSubjects.includes(subject)
        ? prev.academicSubjects.filter(s => s !== subject)
        : [...prev.academicSubjects, subject]
    }));
  };

  const toggleInterest = (interest: string) => {
    setFormData(prev => ({
      ...prev,
      sideHustleInterests: prev.sideHustleInterests.includes(interest)
        ? prev.sideHustleInterests.filter(i => i !== interest)
        : [...prev.sideHustleInterests, interest]
    }));
  };

  const addCustomSubject = () => {
    if (customSubject.trim()) {
      setFormData(prev => ({
        ...prev,
        academicSubjects: [...prev.academicSubjects, customSubject.trim()]
      }));
      setCustomSubject('');
    }
  };

  const addCustomInterest = () => {
    if (customInterest.trim()) {
      setFormData(prev => ({
        ...prev,
        sideHustleInterests: [...prev.sideHustleInterests, customInterest.trim()]
      }));
      setCustomInterest('');
    }
  };

  const canProceed = () => {
    switch (step) {
      case 1: return formData.role !== '';
      case 2: return formData.name.trim() && formData.college.trim() && (formData.role === 'teacher' ? true : formData.degree.trim());
      case 3: return formData.academicSubjects.length > 0;
      case 4: return formData.sideHustleInterests.length > 0;
      default: return true;
    }
  };

  const stepVariants = {
    initial: { opacity: 0, scale: 0.98, y: 10 },
    animate: { opacity: 1, scale: 1, y: 0 },
    exit: { opacity: 0, scale: 0.98, y: -10 }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 text-zinc-900 p-6 overflow-hidden selection:bg-primary/20">
      {/* Premium Background Elements */}
      <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/20 rounded-full blur-[120px] opacity-40" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-accent/20 rounded-full blur-[120px] opacity-40" />
        <div className="absolute inset-0 bg-white/40 backdrop-blur-[2px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-[0.8fr_1.2fr] bg-white/80 backdrop-blur-2xl border border-zinc-200 rounded-[2.5rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] overflow-hidden"
      >
        {/* Left Panel: Progress & Branding */}
        <div className="relative p-10 lg:p-14 flex flex-col justify-between bg-zinc-50/50 border-r border-zinc-200">
          <div>
            <div className="flex items-center gap-4 mb-12">
              <div className="p-3 rounded-2xl bg-primary shadow-[0_0_25px_rgba(var(--primary-rgb),0.3)]">
                <Bot className="h-7 w-7 text-white" />
              </div>
              <span className="font-heading text-xl font-bold tracking-tight text-zinc-900">AdaptIQ</span>
            </div>

            <div className="space-y-10">
              <div className="relative">
                <div className="absolute left-[15px] top-[40px] bottom-[40px] w-px bg-zinc-200" />

                {(formData.role === 'teacher' ? [
                  { id: 1, title: 'Role', icon: Users, desc: 'Account Type' },
                  { id: 2, title: 'Identity', icon: User, desc: 'Your profile baseline' }
                ] : [
                  { id: 1, title: 'Role', icon: Users, desc: 'Account Type' },
                  { id: 2, title: 'Identity', icon: User, desc: 'Your profile baseline' },
                  { id: 3, title: 'Academics', icon: GraduationCap, desc: 'Current coursework' },
                  { id: 4, title: 'Growth', icon: Rocket, desc: 'Future skill-building' }
                ]).map((s) => (
                  <div key={s.id} className="relative flex items-center gap-6 mb-12 last:mb-0">
                    <div className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all duration-700 z-10",
                      step >= s.id
                        ? "border-primary bg-primary text-white shadow-[0_0_20px_rgba(var(--primary-rgb),0.5)]"
                        : "border-zinc-200 bg-white text-zinc-400"
                    )}>
                      {step > s.id ? <Check className="h-4 w-4 stroke-[3px]" /> : <span className="text-xs font-black">{s.id}</span>}
                    </div>
                    <div>
                      <h3 className={cn("text-sm font-bold tracking-wider transition-colors duration-500", step >= s.id ? "text-zinc-900 uppercase" : "text-zinc-400 uppercase")}>
                        {s.title}
                      </h3>
                      <p className="text-[11px] text-zinc-500 hidden lg:block font-medium mt-0.5">{s.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel: Active Step Content */}
        <div className="p-8 lg:p-14 flex flex-col min-h-[500px]">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div key="step1" {...stepVariants} className="flex-1">
                <div className="mb-10">
                  <h2 className="text-4xl font-bold font-heading mb-3 text-zinc-900 tracking-tight">Welcome</h2>
                  <p className="text-zinc-500 text-sm font-medium">How will you be using AdaptIQ?</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setFormData({ ...formData, role: 'student' })}
                    className={cn(
                      "flex flex-col items-center justify-center p-8 rounded-2xl border-2 transition-all duration-300",
                      formData.role === 'student' ? "border-primary bg-primary/5 shadow-[0_0_20px_rgba(var(--primary-rgb),0.2)]" : "border-zinc-200 hover:border-primary/50"
                    )}
                  >
                    <GraduationCap className={cn("h-12 w-12 mb-4", formData.role === 'student' ? "text-primary" : "text-zinc-400")} />
                    <span className={cn("font-bold text-lg", formData.role === 'student' ? "text-primary" : "text-zinc-700")}>I am a Student</span>
                  </button>

                  <button
                    onClick={() => setFormData({ ...formData, role: 'teacher' })}
                    className={cn(
                      "flex flex-col items-center justify-center p-8 rounded-2xl border-2 transition-all duration-300",
                      formData.role === 'teacher' ? "border-accent bg-accent/5 shadow-[0_0_20px_rgba(var(--accent-rgb),0.2)]" : "border-zinc-200 hover:border-accent/50"
                    )}
                  >
                    <Users className={cn("h-12 w-12 mb-4", formData.role === 'teacher' ? "text-accent" : "text-zinc-400")} />
                    <span className={cn("font-bold text-lg", formData.role === 'teacher' ? "text-accent" : "text-zinc-700")}>I am a Teacher</span>
                  </button>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div key="step2" {...stepVariants} className="flex-1">
                <div className="mb-10">
                  <h2 className="text-4xl font-bold font-heading mb-3 text-zinc-900 tracking-tight">Identity</h2>
                  <p className="text-zinc-500 text-sm font-medium">Initialize your academic profile credentials.</p>
                </div>

                <div className="space-y-8">
                  <div className="space-y-2.5">
                    <Label className="text-zinc-500 text-xs font-black uppercase tracking-[0.15em] ml-1">Full Name</Label>
                    <Input
                      placeholder="e.g. Alex Johnson"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="h-12 bg-white border-zinc-200 rounded-2xl focus:ring-primary focus:border-primary text-zinc-900 placeholder:text-zinc-400 text-base px-4 font-medium transition-all"
                    />
                  </div>
                  <div className="space-y-2.5">
                    <Label className="text-zinc-500 text-xs font-black uppercase tracking-[0.15em] ml-1">Institution</Label>
                    <Input
                      placeholder="e.g. Stanford University"
                      value={formData.college}
                      onChange={(e) => setFormData({ ...formData, college: e.target.value })}
                      className="h-12 bg-white border-zinc-200 rounded-2xl focus:ring-primary focus:border-primary text-zinc-900 placeholder:text-zinc-400 text-base px-4 font-medium transition-all"
                    />
                  </div>
                  {formData.role === 'student' && (
                    <div className="space-y-2.5">
                      <Label className="text-zinc-500 text-xs font-black uppercase tracking-[0.15em] ml-1">Major / Degree</Label>
                      <Input
                        placeholder="e.g. Computer Science"
                        value={formData.degree}
                        onChange={(e) => setFormData({ ...formData, degree: e.target.value })}
                        className="h-12 bg-white border-zinc-200 rounded-2xl focus:ring-primary focus:border-primary text-zinc-900 placeholder:text-zinc-400 text-base px-4 font-medium transition-all"
                      />
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div key="step3" {...stepVariants} className="flex-1">
                <div className="mb-8">
                  <h2 className="text-4xl font-bold font-heading mb-3 text-zinc-900 tracking-tight">Academics</h2>
                  <p className="text-zinc-500 text-sm font-medium">Select your current focus areas.</p>
                </div>

                {isFetchingSuggestions ? (
                  <div className="flex flex-col items-center justify-center py-24 gap-6">
                    <div className="relative">
                      <div className="h-20 w-20 rounded-full border-t-2 border-primary animate-spin" />
                      <Sparkles className="absolute inset-0 m-auto h-7 w-7 text-primary animate-pulse" />
                    </div>
                    <div className="text-center">
                      <p className="text-zinc-900 font-bold tracking-wide">Syncing with AI...</p>
                      <p className="text-zinc-500 text-[11px] uppercase tracking-widest mt-1">Generating coursework suggestions</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-8">
                    <div className="grid grid-cols-2 gap-4">
                      {aiSuggestions.subjects.map((sub) => {
                        const isSelected = formData.academicSubjects.includes(sub);
                        return (
                          <button
                            key={sub}
                            onClick={() => toggleSubject(sub)}
                            className={cn(
                              "group relative flex items-center justify-between p-4 rounded-2xl border transition-all duration-400 overflow-hidden",
                              isSelected
                                ? "bg-primary/10 border-primary shadow-[0_0_20px_rgba(var(--primary-rgb),0.2)]"
                                : "bg-white border-zinc-200 hover:border-primary/50"
                            )}
                          >
                            <MarqueeText
                              text={sub}
                              className={cn(
                                "text-xs font-bold tracking-wide pr-4 w-full text-left transition-colors",
                                isSelected ? "text-primary" : "text-zinc-500 group-hover:text-zinc-900"
                              )}
                            />
                            {isSelected && (
                              <div className="shrink-0 bg-primary rounded-full p-1 ml-2">
                                <Check className="h-3 w-3 text-white stroke-[3px]" />
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    <div className="relative pt-6 border-t border-zinc-200">
                      <div className="flex gap-3">
                        <Input
                          placeholder="Add custom subject..."
                          value={customSubject}
                          onChange={(e) => setCustomSubject(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && addCustomSubject()}
                          className="h-12 bg-white border-zinc-200 rounded-xl focus:border-primary text-xs font-medium"
                        />
                        <Button
                          onClick={addCustomSubject}
                          className="h-12 w-12 rounded-xl bg-primary hover:scale-105 transition-transform"
                        >
                          <Plus className="h-5 w-5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {step === 4 && (
              <motion.div key="step4" {...stepVariants} className="flex-1">
                <div className="mb-8">
                  <h2 className="text-4xl font-bold font-heading mb-3 text-zinc-900 tracking-tight">Growth</h2>
                  <p className="text-zinc-500 text-sm font-medium">Select your external skill goals.</p>
                </div>

                <div className="space-y-8">
                  <div className="grid grid-cols-2 gap-4">
                    {aiSuggestions.interests.map((int) => {
                      const isSelected = formData.sideHustleInterests.includes(int);
                      return (
                        <button
                          key={int}
                          onClick={() => toggleInterest(int)}
                          className={cn(
                            "group relative flex items-center justify-between p-4 rounded-2xl border transition-all duration-400 overflow-hidden",
                            isSelected
                              ? "bg-accent/10 border-accent shadow-[0_0_20px_rgba(var(--accent-rgb),0.2)]"
                              : "bg-white border-zinc-200 hover:border-accent/50"
                          )}
                        >
                          <MarqueeText
                            text={int}
                            className={cn(
                              "text-xs font-bold tracking-wide pr-4 w-full text-left transition-colors",
                              isSelected ? "text-accent" : "text-zinc-500 group-hover:text-zinc-900"
                            )}
                          />
                          {isSelected && (
                            <div className="shrink-0 bg-accent rounded-full p-1 ml-2">
                              <Check className="h-3 w-3 text-black stroke-[3px]" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  <div className="relative pt-6 border-t border-zinc-200">
                    <div className="flex gap-3">
                      <Input
                        placeholder="Add secondary skill..."
                        value={customInterest}
                        onChange={(e) => setCustomInterest(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && addCustomInterest()}
                        className="h-12 bg-white border-zinc-200 rounded-xl focus:border-accent text-xs font-medium"
                      />
                      <Button
                        onClick={addCustomInterest}
                        className="h-12 w-12 rounded-xl bg-accent hover:scale-105 transition-transform text-black"
                      >
                        <Plus className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Nav Footer */}
          <div className="mt-auto pt-10 flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={handleBack}
              disabled={step === 1 || isLoading}
              className="px-8 h-12 rounded-xl hover:bg-zinc-100 text-zinc-500 hover:text-zinc-900 transition-all disabled:opacity-0"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>

            <Button
              onClick={handleNext}
              disabled={!canProceed() || isLoading}
              className={cn(
                "h-14 px-12 rounded-[1.25rem] font-black uppercase tracking-widest transition-all duration-500 active:scale-95 shadow-2xl",
                step === totalSteps
                  ? "bg-accent hover:bg-accent/90 text-black shadow-accent/20"
                  : "bg-primary hover:bg-primary/90 text-white shadow-primary/20",
                !canProceed() && "opacity-50 grayscale cursor-not-allowed"
              )}
            >
              {isLoading ? (
                <div className="flex items-center gap-3">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Finalizing
                </div>
              ) : step === totalSteps ? (
                "Ignite Engine"
              ) : (
                <div className="flex items-center gap-2">
                  Next Step
                  <ArrowRight className="h-4 w-4" />
                </div>
              )}
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
