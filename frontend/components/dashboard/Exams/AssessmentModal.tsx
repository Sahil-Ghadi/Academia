"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  X, CheckCircle, ArrowRight, Brain, Trophy, TrendingUp,
  ChevronLeft, XCircle, Target, Check, Zap, BarChart2, MessageSquare, RotateCcw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useMode } from "@/contexts/ModeContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { API_BASE_URL } from "@/lib/api";

interface Question {
  id: string;
  question: string;
  options: string[];
  correct_answer: number;
  topic_tag: string;
  difficulty?: string;
  explanation?: string;
}

interface AssessmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  exam: any;
  onUpdate: () => void;
}

export function AssessmentModal({ isOpen, onClose, exam, onUpdate }: AssessmentModalProps) {
  const { user } = useMode();
  const [step, setStep] = useState<"intro" | "quiz" | "result" | "analysis">("intro");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [questions, setQuestions] = useState<Question[]>([]);
  const questionsRef = useRef<Question[]>([]);
  const answersRef = useRef<{ [key: string]: number }>({});
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<{ [key: string]: number }>({});

  const [result, setResult] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState(600);

  useEffect(() => {
    if (isOpen) {
      setStep("intro");
      setAnswers({});
      answersRef.current = {};
      setResult(null);
      setTimeLeft(600);
      setCurrentIdx(0);
      setQuestions([]);
      questionsRef.current = [];
      setIsSubmitting(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (step === "quiz" && !isGenerating && timeLeft > 0) {
      const timer = setInterval(() => setTimeLeft(p => p - 1), 1000);
      return () => clearInterval(timer);
    } else if (timeLeft === 0 && step === "quiz") {
      handleSubmit();
      toast.info("Time's up! Submitting...");
    }
  }, [timeLeft, step, isGenerating]);

  const formatTime = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  const generateTest = async () => {
    setIsGenerating(true);
    try {
      const topics = exam.syllabus?.map((s: any) => s.name) || ["General"];
      const res = await fetch(`${API_BASE_URL}/assessment/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid: user?.uid, subject: exam.subject, topics, set_number: 1 }),
      });
      if (!res.ok) throw new Error("Failed to generate test");
      const data: Question[] = await res.json();
      questionsRef.current = data;
      setQuestions(data);
      setCurrentIdx(0);
      setStep("quiz");
    } catch {
      toast.error("Failed to generate test");
      setStep("intro");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleStart = async () => {
    setStep("quiz");
    setAnswers({});
    answersRef.current = {};
    await generateTest();
  };

  const handleOptionSelect = (optionIdx: number) => {
    const q = questionsRef.current[currentIdx];
    if (q) {
      answersRef.current = { ...answersRef.current, [q.id]: optionIdx };
      setAnswers(prev => ({ ...prev, [q.id]: optionIdx }));
    }
  };

  const handleNext = () => {
    if (currentIdx + 1 >= questionsRef.current.length) handleSubmit();
    else setCurrentIdx(p => p + 1);
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const formattedAnswers = Object.entries(answersRef.current).map(([qid, selected]) => ({ question_id: qid, selected }));
      const res = await fetch(`${API_BASE_URL}/assessment/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid: user?.uid, exam_id: exam.id, set_number: 1, answers: formattedAnswers, questions: questionsRef.current }),
      });
      if (!res.ok) { const t = await res.text(); console.error(t); throw new Error("Submission failed"); }
      const resultData = await res.json();
      setResult(resultData);
      setStep("result");
      onUpdate();
    } catch {
      toast.error("Failed to submit results");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFinish = () => { setStep("intro"); onClose(); };

  if (!isOpen || !exam) return null;

  const currentItem = questionsRef.current[currentIdx];
  const totalQ = questionsRef.current.length || 10;

  const modalContent = (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-background/80 backdrop-blur-md p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
        className="w-full max-w-[600px] h-[640px] max-h-[90vh] bg-card border border-border/80 rounded-2xl shadow-xl flex flex-col overflow-hidden relative"
      >

        {/* Quiz progress bar */}
        {step === "quiz" && questionsRef.current.length > 0 && (
          <div className="absolute top-1 left-0 right-0 h-0.5 bg-muted z-20 pointer-events-none">
            <motion.div
              className="h-full bg-gradient-to-r from-primary to-violet-500"
              initial={{ width: 0 }}
              animate={{ width: `${(currentIdx / totalQ) * 100}%` }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            />
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/80 bg-card shrink-0 z-10">
          <div className="flex items-center gap-3">
            {step === "analysis" ? (
              <button onClick={() => setStep("result")} className="h-8 w-8 flex items-center justify-center rounded-lg bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors border border-border/50">
                <ChevronLeft className="h-4 w-4" />
              </button>
            ) : (
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20">
                <Brain className="h-4 w-4 text-primary" />
              </div>
            )}
            <div>
              <h2 className="font-bold text-sm text-foreground leading-none">
                {step === "analysis" ? "Question Review" : "Adaptive Assessment"}
              </h2>
              {step === "quiz" && questionsRef.current.length > 0 && (
                <p className="text-[10px] font-semibold text-muted-foreground mt-1">
                  {exam.subject} · Question {currentIdx + 1} of {totalQ}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {step === "quiz" && (
              <div className={cn(
                "px-2.5 py-1 rounded-lg font-mono text-xs font-bold border transition-all",
                timeLeft < 60 ? "bg-red-500/10 text-red-500 border-red-500/20 animate-pulse" : "bg-muted/50 text-muted-foreground border-border/50"
              )}>
                {formatTime(timeLeft)}
              </div>
            )}
            {step !== "quiz" && (
              <button onClick={onClose} className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors border border-border/50 bg-muted/30">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-h-0 overflow-hidden relative">
          <AnimatePresence mode="wait">

            {/* ─── INTRO ─── */}
            {step === "intro" && (
              <motion.div
                key="intro"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="flex flex-col items-center justify-center h-full overflow-y-auto p-6 md:p-8 text-center custom-scrollbar"
              >
                <div className="relative mb-6">
                  <div className="h-20 w-20 bg-card border border-border/80 shadow-sm rounded-2xl flex items-center justify-center mx-auto bg-gradient-to-br from-card to-muted/20">
                    <Trophy className="h-8 w-8 text-primary" />
                  </div>
                </div>

                <h3 className="text-xl font-extrabold text-foreground mb-2">Adaptive Mastery Test</h3>
                <p className="text-muted-foreground text-sm max-w-sm mx-auto mb-8 leading-relaxed font-medium">
                  Your test is tailored to your current skill level. Questions auto-scale based on your Elo rating.
                  <span className="font-bold text-foreground block mt-1.5 bg-muted/50 inline-block px-2.5 py-0.5 rounded border border-border/50">{exam.subject}</span>
                </p>

                <div className="grid grid-cols-3 gap-3 w-full max-w-[360px] mb-8">
                  {[
                    { icon: Target, label: "10 Questions", sub: "Test Size", color: "text-foreground", bg: "bg-muted/30" },
                    { icon: TrendingUp, label: "Adaptive", sub: "Difficulty", color: "text-emerald-500", bg: "bg-emerald-500/5" },
                    { icon: Brain, label: "Elo Model", sub: "Scoring", color: "text-blue-500", bg: "bg-blue-500/5" },
                  ].map(({ icon: Icon, label, sub, color, bg }) => (
                    <div key={sub} className={cn("border border-border/80 rounded-xl p-3 flex flex-col items-center gap-1 shadow-sm", bg)}>
                      <Icon className={cn("h-4 w-4 mb-0.5", color)} />
                      <span className="text-[11px] font-bold text-foreground leading-none">{label}</span>
                      <span className="text-[9px] text-muted-foreground uppercase font-bold tracking-widest">{sub}</span>
                    </div>
                  ))}
                </div>

                <Button onClick={handleStart} size="lg" className="w-full max-w-[280px] h-12 rounded-xl font-bold text-sm gap-2 shadow-sm hover:scale-[1.02] transition-all">
                  <Zap className="h-4 w-4" />
                  Start Adaptive Test
                </Button>
              </motion.div>
            )}

            {/* ─── LOADING ─── */}
            {step === "quiz" && isGenerating && (
              <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center h-full overflow-y-auto gap-3">
                <div className="relative h-12 w-12">
                  <div className="h-12 w-12 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
                  <Brain className="absolute inset-0 m-auto h-5 w-5 text-primary" />
                </div>
                <p className="text-sm text-muted-foreground font-medium">Generating your personalized test...</p>
              </motion.div>
            )}

            {/* ─── QUIZ ─── */}
            {step === "quiz" && !isGenerating && currentItem && (
              <motion.div
                key={currentItem.id}
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                className="flex flex-col h-full"
              >
                <div className="px-5 pt-5 shrink-0">
                  {/* Topic and Difficulty Tags */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-black text-primary bg-primary/10 px-2.5 py-1 rounded-lg uppercase tracking-widest border border-primary/20">
                        {currentItem.topic_tag}
                      </span>
                      {currentItem.difficulty && (
                        <span className={cn(
                          "text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-widest border flex items-center gap-1.5 shadow-sm transition-colors",
                          currentItem.difficulty.toLowerCase() === 'hard' ? "text-rose-500 bg-rose-500/10 border-rose-500/20" :
                          currentItem.difficulty.toLowerCase() === 'easy' ? "text-emerald-500 bg-emerald-500/10 border-emerald-500/20" :
                          "text-amber-500 bg-amber-500/10 border-amber-500/20"
                        )}>
                          🔥 Calibrated: {currentItem.difficulty}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] font-bold text-muted-foreground bg-muted/50 px-2.5 py-1 rounded-lg border border-border/50 shrink-0">
                      {currentIdx + 1} of {totalQ}
                    </span>
                  </div>

                  {/* Question */}
                  <h3 className="text-lg font-bold text-foreground leading-snug">
                    {currentItem.question}
                  </h3>
                </div>

                {/* Options */}
                <div className="flex-1 overflow-y-auto px-5 py-5 custom-scrollbar">
                  <div className="space-y-2.5">
                    {currentItem.options?.map((option, idx) => {
                      const isSelected = answers[currentItem.id] === idx;
                      return (
                        <button
                          key={idx}
                          onClick={() => handleOptionSelect(idx)}
                          className={cn(
                            "w-full p-3.5 rounded-xl border-2 text-left flex items-center gap-3 transition-all duration-200 group hover:-translate-y-px",
                            isSelected
                              ? "bg-primary/5 border-primary shadow-sm"
                              : "bg-card border-border/80 hover:border-muted-foreground/30 hover:bg-muted/30"
                          )}
                        >
                          <div className={cn(
                            "h-7 w-7 rounded-lg border-2 flex items-center justify-center text-[11px] font-black shrink-0 transition-all",
                            isSelected ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground group-hover:border-muted-foreground"
                          )}>
                            {String.fromCharCode(65 + idx)}
                          </div>
                          <span className={cn("text-sm", isSelected ? "font-bold text-foreground" : "font-medium text-foreground/80")}>
                            {option}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Next button */}
                <div className="px-5 pb-5 pt-4 border-t border-border/50 shrink-0 bg-card z-10">
                  <Button
                    onClick={handleNext}
                    disabled={answers[currentItem.id] === undefined || isSubmitting}
                    className="w-full h-11 rounded-xl font-bold text-sm gap-2 shadow-sm"
                  >
                    {currentIdx === totalQ - 1 ? (isSubmitting ? "Submitting..." : "Submit Test") : "Next Question"}
                    {currentIdx !== totalQ - 1 && <ArrowRight className="h-4 w-4" />}
                  </Button>
                </div>
              </motion.div>
            )}

            {/* ─── RESULT ─── */}
            {step === "result" && result && (
              <motion.div
                key="result"
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col h-full p-6 overflow-y-auto custom-scrollbar"
              >
                <div className="flex flex-col flex-1 items-center justify-center max-w-[480px] mx-auto w-full gap-8 py-4">
                  
                  {/* Top Section: Score Ring & Title */}
                  <div className="flex flex-col items-center gap-4 text-center">
                    <div className="relative">
                      <div className={cn(
                        "absolute inset-0 rounded-full blur-2xl opacity-20",
                        result.accuracy >= 70 ? "bg-emerald-500" : result.accuracy >= 40 ? "bg-amber-500" : "bg-red-500"
                      )} />
                      <div className="relative h-32 w-32 bg-card border-[4px] border-card rounded-full shadow-xl flex items-center justify-center overflow-hidden">
                        <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 100 100">
                          <circle cx="50" cy="50" r="44" strokeWidth="8" fill="none" className="stroke-muted/30" />
                          <motion.circle
                            cx="50" cy="50" r="44" strokeWidth="8" fill="none"
                            strokeLinecap="round"
                            strokeDasharray={276}
                            initial={{ strokeDashoffset: 276 }}
                            animate={{ strokeDashoffset: 276 - (276 * result.accuracy) / 100 }}
                            transition={{ duration: 1.5, ease: "easeOut", delay: 0.3 }}
                            className={cn(
                              "stroke-current",
                              result.accuracy >= 70 ? "text-emerald-500" : result.accuracy >= 40 ? "text-amber-500" : "text-red-500"
                            )}
                          />
                        </svg>
                        <div className="relative z-10 flex flex-col items-center justify-center">
                          <motion.span
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.8, type: "spring" }}
                            className="text-3xl font-black text-foreground tracking-tighter"
                          >
                            {Math.round(result.accuracy)}%
                          </motion.span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-2xl font-black text-foreground mb-1.5">
                        {result.accuracy >= 90 ? "Mastery Achieved!" :
                          result.accuracy >= 70 ? "Great Performance!" :
                            result.accuracy >= 50 ? "Solid Effort!" : "Keep Practicing!"}
                      </h3>
                      <p className="text-sm text-muted-foreground font-medium flex items-center justify-center gap-2">
                        <span className="flex items-center gap-1"><BarChart2 className="w-4 h-4"/> Attempt <span className="font-bold text-foreground">#{result.attempt_count ?? 1}</span></span>
                        <span>·</span>
                        <span className="font-bold text-foreground">{result.score} / {result.total} Correct</span>
                      </p>
                    </div>
                  </div>

                  {/* AI Coach Card */}
                  {result.recommendation && (
                    <div className="w-full bg-gradient-to-br from-indigo-500/5 via-transparent to-violet-500/10 border border-indigo-500/20 rounded-2xl p-5 shadow-sm relative overflow-hidden group">
                      <div className="absolute -top-4 -right-4 p-4 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity group-hover:scale-110 duration-500">
                        <Brain className="w-32 h-32 text-indigo-500" />
                      </div>
                      <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="h-7 w-7 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-500 border border-indigo-500/20">
                            <Zap className="h-4 w-4" />
                          </div>
                          <span className="text-xs font-black uppercase tracking-widest text-indigo-500">AI Coach Feedback</span>
                        </div>
                        <p className="text-sm text-foreground/80 leading-relaxed font-medium">
                          {result.recommendation}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Stats & History Row */}
                  <div className="w-full flex gap-3">
                    <div className="flex-1 bg-card border border-border/80 rounded-2xl p-4 shadow-sm flex flex-col items-center justify-center relative overflow-hidden">
                      <div className="flex items-center gap-1.5 text-blue-500 mb-2">
                        <TrendingUp className="h-4 w-4" />
                        <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Readiness</span>
                      </div>
                      <span className="text-3xl font-black text-foreground">{Math.round(result.readiness)}%</span>
                    </div>

                    {result.score_history && result.score_history.length > 1 && (
                      <div className="flex-1 bg-card border border-border/80 rounded-2xl p-4 shadow-sm flex flex-col justify-between items-center relative overflow-hidden">
                        <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5"><Target className="w-3.5 h-3.5"/>Score Trend</span>
                        <div className="flex items-end justify-center gap-2 h-8 w-full">
                          {result.score_history.slice(-6).map((s: number, i: number, arr: any[]) => (
                            <div key={i} className="flex flex-col items-center w-full max-w-[12px]">
                              <div
                                className={cn(
                                  "w-full rounded-sm transition-all",
                                  i === arr.length - 1 ? "bg-primary" : "bg-muted-foreground/30"
                                )}
                                style={{ height: `${Math.max(4, (s / 100) * 32)}px` }}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-3 w-full pt-5 border-t border-border/50 shrink-0">
                  <Button variant="outline" onClick={() => setStep("analysis")} className="flex-[0.8] h-12 rounded-xl font-bold border-border/80 hover:bg-muted/50">
                    Review Answers
                  </Button>
                  <Button onClick={handleFinish} className="flex-1 h-12 rounded-xl font-bold gap-2 shadow-sm">
                    <Check className="h-4 w-4" />
                    Finish Assessment
                  </Button>
                </div>
              </motion.div>
            )}

            {/* ─── ANALYSIS ─── */}
            {step === "analysis" && (
              <motion.div
                key="analysis"
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                className="p-5 space-y-4 h-full overflow-y-auto custom-scrollbar"
              >
                {questionsRef.current.map((q, idx) => {
                  const userSelected = answersRef.current[q.id];
                  const isCorrect = userSelected === q.correct_answer;
                  return (
                    <div key={q.id} className={cn(
                      "rounded-2xl border overflow-hidden",
                      isCorrect ? "border-border" : "border-red-500/20"
                    )}>
                      {/* Question header */}
                      <div className={cn("px-4 py-3 flex items-start justify-between gap-3", isCorrect ? "bg-muted/30" : "bg-red-500/5")}>
                        <p className="text-sm font-semibold text-foreground leading-snug">
                          <span className="text-muted-foreground mr-1">{idx + 1}.</span>{q.question}
                        </p>
                        {isCorrect
                          ? <span className="shrink-0 flex items-center gap-1 bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide"><Check className="w-3 h-3" />Correct</span>
                          : <span className="shrink-0 flex items-center gap-1 bg-red-500/10 text-red-500 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide"><XCircle className="w-3 h-3" />Wrong</span>
                        }
                      </div>

                      {/* Options */}
                      <div className="px-4 py-3 space-y-1.5 bg-card">
                        {q.options?.map((opt, optIdx) => {
                          const isUserPick = userSelected === optIdx;
                          const isActualCorrect = q.correct_answer === optIdx;
                          return (
                            <div key={optIdx} className={cn(
                              "flex items-center gap-2.5 p-2.5 rounded-lg border text-sm transition-all",
                              isActualCorrect ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400 font-semibold" :
                                isUserPick ? "bg-red-500/10 border-red-500/20 text-red-700 dark:text-red-400 font-semibold" :
                                  "bg-transparent border-transparent text-muted-foreground"
                            )}>
                              <div className="h-5 w-5 rounded-full border border-current opacity-50 flex items-center justify-center text-[10px] font-black shrink-0">
                                {String.fromCharCode(65 + optIdx)}
                              </div>
                              <span className="flex-1">{opt}</span>
                              {isActualCorrect && <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />}
                              {isUserPick && !isActualCorrect && <XCircle className="h-4 w-4 text-red-500 shrink-0" />}
                            </div>
                          );
                        })}
                      </div>

                      {/* Explanation for wrong answers */}
                      {!isCorrect && (
                        <div className="px-4 pb-4 pt-0 bg-card">
                          <div className="bg-gradient-to-br from-indigo-500/5 to-purple-500/5 border border-indigo-500/20 rounded-xl p-4 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-2 opacity-5">
                              <Brain className="w-16 h-16 text-indigo-500" />
                            </div>
                            <div className="flex items-center gap-2 text-indigo-500 mb-2 relative z-10">
                              <div className="h-6 w-6 rounded-md bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                                <Zap className="h-3.5 w-3.5" />
                              </div>
                              <span className="text-[10px] font-black uppercase tracking-wider">Concept Breakdown</span>
                            </div>
                            <p className="text-sm text-foreground/80 leading-relaxed relative z-10 font-medium">
                              {q.explanation || "Review the correct answer above and revisit this topic in your next study session."}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                <div className="pb-4">
                  <Button onClick={handleFinish} className="w-full h-10 rounded-xl font-bold gap-2">
                    <Check className="h-4 w-4" />
                    Finish Review
                  </Button>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(modalContent, document.body);
}
