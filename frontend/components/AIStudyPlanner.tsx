'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Brain,
    Calendar,
    Clock,
    Target,
    Sparkles,
    Loader2,
    AlertCircle,
    CheckCircle2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { studyPlannerAPI, StudyPlanResponse } from '@/lib/api';
import { useMode } from '@/contexts/ModeContext';

export function AIStudyPlanner() {
    const { user } = useMode();
    const [examInput, setExamInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [studyPlan, setStudyPlan] = useState<StudyPlanResponse | null>(null);

    const handleGeneratePlan = async () => {
        if (!examInput.trim() || !user) return;

        setIsLoading(true);
        setError(null);

        try {
            const response = await studyPlannerAPI.createPlan({
                user_id: user.uid,
                input_text: examInput,
            });

            setStudyPlan(response);
        } catch (err: any) {
            setError(err.message || 'Failed to generate study plan');
            console.error('Error generating study plan:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const getUrgencyColor = (urgency: string | null) => {
        switch (urgency) {
            case 'critical':
                return 'text-destructive border-destructive bg-destructive/10';
            case 'high':
                return 'text-orange-500 border-orange-500 bg-orange-500/10';
            case 'medium':
                return 'text-accent border-accent bg-accent/10';
            case 'low':
                return 'text-primary border-primary bg-primary/10';
            default:
                return 'text-muted-foreground border-muted-foreground bg-muted/10';
        }
    };

    return (
        <div className="rounded-xl border border-border bg-card p-6 shadow-soft">
            {/* Header */}
            <div className="mb-6 flex items-center gap-3">
                <div className="icon-container">
                    <Brain className="h-6 w-6 text-primary" />
                </div>
                <div>
                    <h2 className="font-heading text-2xl font-bold">AI Study Planner</h2>
                    <p className="text-sm text-muted-foreground">
                        Get a personalized study plan powered by AI agents
                    </p>
                </div>
            </div>

            {/* Input Form */}
            <div className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="exam-input">Describe your exam or study goal</Label>
                    <Input
                        id="exam-input"
                        placeholder="e.g., I have a DBMS exam on 2024-02-15 covering SQL, Normalization, and Transactions"
                        value={examInput}
                        onChange={(e) => setExamInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleGeneratePlan()}
                        disabled={isLoading}
                        className="min-h-[60px]"
                    />
                </div>

                <Button
                    onClick={handleGeneratePlan}
                    disabled={!examInput.trim() || isLoading}
                    className="w-full gap-2"
                >
                    {isLoading ? (
                        <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Generating Plan...
                        </>
                    ) : (
                        <>
                            <Sparkles className="h-4 w-4" />
                            Generate Study Plan
                        </>
                    )}
                </Button>
            </div>

            {/* Error Message */}
            <AnimatePresence>
                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="mt-4 flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-3"
                    >
                        <AlertCircle className="h-4 w-4 text-destructive" />
                        <p className="text-sm text-destructive">{error}</p>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Study Plan Results */}
            <AnimatePresence>
                {studyPlan && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        className="mt-6 space-y-4"
                    >
                        {/* Exam Info */}
                        {studyPlan.exam && (
                            <div className="rounded-lg border border-border bg-muted/30 p-4">
                                <div className="mb-3 flex items-center justify-between">
                                    <h3 className="font-heading text-lg font-bold">
                                        {studyPlan.exam.subject}
                                    </h3>
                                    {studyPlan.urgency && (
                                        <span
                                            className={cn(
                                                'rounded-full border px-3 py-1 text-xs font-medium uppercase',
                                                getUrgencyColor(studyPlan.urgency)
                                            )}
                                        >
                                            {studyPlan.urgency}
                                        </span>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div className="flex items-center gap-2">
                                        <Calendar className="h-4 w-4 text-muted-foreground" />
                                        <span className="text-muted-foreground">Exam Date:</span>
                                        <span className="font-medium">{studyPlan.exam.exam_date}</span>
                                    </div>
                                    {studyPlan.days_left !== null && (
                                        <div className="flex items-center gap-2">
                                            <Clock className="h-4 w-4 text-muted-foreground" />
                                            <span className="text-muted-foreground">Days Left:</span>
                                            <span className="font-medium">{studyPlan.days_left} days</span>
                                        </div>
                                    )}
                                </div>

                                {studyPlan.exam.topics && studyPlan.exam.topics.length > 0 && (
                                    <div className="mt-3">
                                        <p className="mb-2 text-sm text-muted-foreground">Topics to cover:</p>
                                        <div className="flex flex-wrap gap-2">
                                            {studyPlan.exam.topics.map((topic, index) => (
                                                <span
                                                    key={index}
                                                    className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
                                                >
                                                    {topic}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Study Plan */}
                        {studyPlan.plan && (
                            <div className="rounded-lg border border-border bg-card p-4">
                                <div className="mb-4 flex items-center justify-between">
                                    <h3 className="font-heading text-lg font-bold">Daily Study Plan</h3>
                                    {studyPlan.plan.total_hours && (
                                        <div className="flex items-center gap-2 text-sm">
                                            <Target className="h-4 w-4 text-accent" />
                                            <span className="text-muted-foreground">Total:</span>
                                            <span className="font-medium">{studyPlan.plan.total_hours}h</span>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-3">
                                    {studyPlan.plan.daily_plan.map((day, index) => (
                                        <motion.div
                                            key={day.day}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: index * 0.1 }}
                                            className="rounded-lg border border-border bg-muted/30 p-3"
                                        >
                                            <div className="mb-2 flex items-center gap-2">
                                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                                                    {day.day}
                                                </div>
                                                <span className="font-medium">Day {day.day}</span>
                                            </div>
                                            <ul className="ml-10 space-y-1">
                                                {day.tasks.map((task, taskIndex) => (
                                                    <li
                                                        key={taskIndex}
                                                        className="flex items-start gap-2 text-sm text-muted-foreground"
                                                    >
                                                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                                                        <span>{task}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </motion.div>
                                    ))}
                                </div>

                                {/* Priority Topics */}
                                {studyPlan.plan.priority_topics && studyPlan.plan.priority_topics.length > 0 && (
                                    <div className="mt-4 rounded-lg border border-accent/30 bg-accent/10 p-3">
                                        <p className="mb-2 text-sm font-medium text-accent">Priority Topics:</p>
                                        <div className="flex flex-wrap gap-2">
                                            {studyPlan.plan.priority_topics.map((topic, index) => (
                                                <span
                                                    key={index}
                                                    className="rounded-full bg-accent/20 px-3 py-1 text-xs font-medium text-accent"
                                                >
                                                    {topic}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Strategy */}
                        {studyPlan.strategy && (
                            <div className="rounded-lg border border-border bg-muted/30 p-3">
                                <p className="text-sm">
                                    <span className="font-medium">Recommended Strategy:</span>{' '}
                                    <span className="capitalize text-muted-foreground">{studyPlan.strategy}</span>
                                </p>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
