'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, CheckCircle2, Circle, BookOpen, PlayCircle, Brain, TrendingUp, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useMode } from '@/contexts/ModeContext';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { API_BASE_URL } from '@/lib/api';
import { AssessmentModal } from './AssessmentModal';

interface ExamDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    exam: any;
    onUpdate: () => void;
}

export function ExamDetailsModal({ isOpen, onClose, exam, onUpdate }: ExamDetailsModalProps) {
    const { user } = useMode();
    const [showAssessment, setShowAssessment] = useState(false);
    const [localSyllabus, setLocalSyllabus] = useState<any[]>([]);

    useEffect(() => {
        if (exam?.syllabus) setLocalSyllabus(exam.syllabus);
    }, [exam]);

    const handleToggleTopic = async (index: number, currentStatus: boolean) => {
        const newStatus = !currentStatus;
        setLocalSyllabus(prev => prev.map((item, i) => i === index ? { ...item, completed: newStatus } : item));
        try {
            const response = await fetch(`${API_BASE_URL}/exams/${user?.uid}/${exam.id}/toggle`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ topic_index: index, completed: newStatus })
            });
            if (!response.ok) throw new Error('Failed to update topic');
            onUpdate();
        } catch {
            toast.error("Failed to update progress");
            setLocalSyllabus(prev => prev.map((item, i) => i === index ? { ...item, completed: currentStatus } : item));
        }
    };

    const totalTopics = localSyllabus.length;
    const completedTopics = localSyllabus.filter(t => t.completed).length;
    const progress = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;
    const readiness = exam?.readiness_score ? Math.round(exam.readiness_score) : 0;
    const attemptCount = exam?.attempt_count ?? 0;
    const scoreHistory: number[] = exam?.score_history ?? [];
    const lastScore = scoreHistory.length > 0 ? scoreHistory[scoreHistory.length - 1] : null;
    const scoreTrend = scoreHistory.length >= 2 ? scoreHistory[scoreHistory.length - 1] - scoreHistory[scoreHistory.length - 2] : null;

    const daysUntil = exam?.date
        ? Math.ceil((new Date(exam.date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        : null;

    return (
        <>
            <AnimatePresence>
                {isOpen && exam && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={onClose}
                            className="absolute inset-0 bg-background/70 backdrop-blur-md"
                        />

                        <motion.div
                            initial={{ opacity: 0, scale: 0.96, y: 8 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.96, y: 8 }}
                            transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
                            className="relative w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl flex flex-col max-h-[88vh] overflow-hidden"
                        >
                            {/* Top accent bar */}
                            <div className="h-1 w-full bg-gradient-to-r from-primary via-violet-500 to-blue-500 shrink-0" />

                            {/* Header */}
                            <div className="px-5 pt-4 pb-4 border-b border-border shrink-0">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                                            <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary text-[10px] font-black uppercase tracking-wider">
                                                {exam.subject}
                                            </span>
                                            {readiness > 0 && (
                                                <span className={cn(
                                                    "px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider",
                                                    readiness >= 70 ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"
                                                )}>
                                                    {readiness}% Ready
                                                </span>
                                            )}
                                            {daysUntil !== null && (
                                                <span className={cn(
                                                    "px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider",
                                                    daysUntil <= 2 ? "bg-red-500/10 text-red-500" :
                                                    daysUntil <= 7 ? "bg-amber-500/10 text-amber-500" :
                                                    "bg-muted text-muted-foreground"
                                                )}>
                                                    {daysUntil <= 0 ? "Today" : `${daysUntil}d left`}
                                                </span>
                                            )}
                                        </div>
                                        <h2 className="font-bold text-lg text-foreground leading-tight truncate">{exam.title}</h2>
                                        <div className="flex items-center gap-1.5 text-muted-foreground text-xs mt-0.5">
                                            <Calendar className="h-3 w-3" />
                                            <span>{new Date(exam.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                        </div>
                                    </div>
                                    <button onClick={onClose} className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0">
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>

                            {/* Scrollable Content */}
                            <div className="flex-1 overflow-y-auto custom-scrollbar px-5 py-4 space-y-5">

                                {/* Stats row */}
                                <div className="grid grid-cols-3 gap-2">
                                    <div className="bg-muted/40 rounded-xl p-3 flex flex-col items-center border border-border/50">
                                        <span className="text-xl font-black text-foreground">{progress}%</span>
                                        <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide mt-0.5">Syllabus</span>
                                    </div>
                                    <div className="bg-muted/40 rounded-xl p-3 flex flex-col items-center border border-border/50">
                                        <span className="text-xl font-black text-foreground">{completedTopics}</span>
                                        <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide mt-0.5">Done</span>
                                    </div>
                                    <div className="bg-muted/40 rounded-xl p-3 flex flex-col items-center border border-border/50">
                                        <span className="text-xl font-black text-foreground">{attemptCount}</span>
                                        <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide mt-0.5">Attempts</span>
                                    </div>
                                </div>

                                {/* Last score trend */}
                                {lastScore !== null && (
                                    <div className="flex items-center justify-between bg-muted/30 border border-border/50 rounded-xl px-4 py-2.5">
                                        <div className="flex items-center gap-2">
                                            <TrendingUp className="h-4 w-4 text-muted-foreground" />
                                            <span className="text-xs font-semibold text-muted-foreground">Last Test Score</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className={cn(
                                                "text-sm font-black",
                                                lastScore >= 70 ? "text-emerald-500" : lastScore >= 50 ? "text-amber-500" : "text-red-500"
                                            )}>
                                                {Math.round(lastScore)}%
                                            </span>
                                            {scoreTrend !== null && (
                                                <span className={cn(
                                                    "text-[10px] font-bold px-1.5 py-0.5 rounded-md",
                                                    scoreTrend > 0 ? "bg-emerald-500/10 text-emerald-500" :
                                                    scoreTrend < 0 ? "bg-red-500/10 text-red-500" :
                                                    "bg-muted text-muted-foreground"
                                                )}>
                                                    {scoreTrend > 0 ? `+${Math.round(scoreTrend)}%` : `${Math.round(scoreTrend)}%`}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Progress bar */}
                                <div>
                                    <div className="flex justify-between text-xs mb-1.5">
                                        <span className="text-muted-foreground font-medium">Completion Progress</span>
                                        <span className="font-bold text-foreground">{progress}%</span>
                                    </div>
                                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${progress}%` }}
                                            transition={{ duration: 0.8, ease: "easeOut" }}
                                            className={cn(
                                                "h-full rounded-full",
                                                progress >= 100 ? "bg-emerald-500" :
                                                progress >= 60 ? "bg-primary" : "bg-primary/70"
                                            )}
                                        />
                                    </div>
                                </div>

                                {/* AI Assessment Button */}
                                <div className="relative">
                                    <Button
                                        className="w-full h-11 gap-2 font-bold text-sm rounded-xl relative overflow-hidden group"
                                        onClick={() => setShowAssessment(true)}
                                        disabled={progress < 10}
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                                        <Brain className="h-4 w-4" />
                                        Take Adaptive Assessment
                                        <Zap className="h-3.5 w-3.5 opacity-70" />
                                    </Button>
                                    {progress < 10 && (
                                        <p className="text-[10px] text-center text-muted-foreground mt-1.5">
                                            Cover 10% of syllabus to unlock assessment
                                        </p>
                                    )}
                                </div>

                                {/* Topics Checklist */}
                                <div className="space-y-2">
                                    <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                                        <BookOpen className="h-3.5 w-3.5" />
                                        Topics Checklist
                                    </h3>

                                    {(!localSyllabus || localSyllabus.length === 0) ? (
                                        <div className="flex flex-col items-center py-8 text-center text-muted-foreground">
                                            <BookOpen className="h-8 w-8 mb-2 opacity-30" />
                                            <p className="text-sm">No topics listed for this exam</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-1.5">
                                            {localSyllabus.map((topic: any, idx: number) => (
                                                <motion.div
                                                    key={idx}
                                                    layout
                                                    initial={{ opacity: 0, y: 4 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ delay: idx * 0.04 }}
                                                    className={cn(
                                                        "flex items-center justify-between p-3 rounded-xl border transition-all group",
                                                        topic.completed
                                                            ? "bg-emerald-500/5 border-emerald-500/20"
                                                            : "bg-muted/30 border-border hover:border-border/80 hover:bg-muted/50"
                                                    )}
                                                >
                                                    <div
                                                        className="flex items-center gap-2.5 cursor-pointer flex-1 min-w-0"
                                                        onClick={() => handleToggleTopic(idx, topic.completed)}
                                                    >
                                                        <div className={cn(
                                                            "shrink-0 h-5 w-5 rounded-full transition-colors",
                                                            topic.completed ? "text-emerald-500" : "text-muted-foreground/40 group-hover:text-muted-foreground"
                                                        )}>
                                                            {topic.completed
                                                                ? <CheckCircle2 className="h-5 w-5" />
                                                                : <Circle className="h-5 w-5" />
                                                            }
                                                        </div>
                                                        <span className={cn(
                                                            "text-sm font-medium truncate select-none",
                                                            topic.completed ? "text-muted-foreground line-through" : "text-foreground"
                                                        )}>
                                                            {topic.name}
                                                        </span>
                                                    </div>


                                                </motion.div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <AssessmentModal
                isOpen={showAssessment}
                onClose={() => setShowAssessment(false)}
                exam={exam}
                onUpdate={onUpdate}
            />


        </>
    );
}
