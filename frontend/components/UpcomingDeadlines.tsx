'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
    Calendar,
    BookOpen,
    FileText,
    FolderKanban,
    Clock,
    Plus
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMode } from '@/contexts/ModeContext';
import { API_BASE_URL } from '@/lib/api';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AddExamModal } from '@/components/dashboard/Exams/AddExamModal';
import { ExamDetailsModal } from '@/components/dashboard/Exams/ExamDetailsModal';

interface Deadline {
    id: string;
    title: string;
    dueDate: Date;
    category: 'exam' | 'assignment' | 'project';
    subject?: string;
    progress?: number;
}

const academicDeadlines: Deadline[] = [
    {
        id: '1',
        title: 'Physics Assignment',
        dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        category: 'assignment',
        subject: 'Physics',
        progress: 65,
    },
    {
        id: '2',
        title: 'Mathematics Problem Set',
        dueDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
        category: 'assignment',
        subject: 'Mathematics',
        progress: 30,
    },
    {
        id: '3',
        title: 'Chemistry Lab Report',
        dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        category: 'assignment',
        subject: 'Chemistry',
        progress: 0,
    },
    {
        id: '4',
        title: 'Mid-term Examinations',
        dueDate: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000),
        category: 'exam',
        progress: 72,
    },
];

const sideHustleDeadlines: Deadline[] = [
    {
        id: '1',
        title: 'Portfolio Website',
        dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        category: 'project',
        subject: 'Web Development',
        progress: 70,
    },
    {
        id: '2',
        title: 'CRUD Application',
        dueDate: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000),
        category: 'project',
        subject: 'Full Stack',
        progress: 35,
    },
    {
        id: '3',
        title: 'React Hooks Module',
        dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        category: 'assignment',
        subject: 'React',
        progress: 85,
    },
];

const categoryIcons = {
    exam: BookOpen,
    assignment: FileText,
    project: FolderKanban,
};

const categoryColors = {
    exam: 'bg-destructive/10 text-destructive border-destructive/30',
    assignment: 'bg-primary/10 text-primary border-primary/30',
    project: 'bg-accent/10 text-accent border-accent/30',
};

export function UpcomingDeadlines({ onRefreshStats }: { onRefreshStats?: () => void }) {
    const { user, mode } = useMode();
    const [deadlines, setDeadlines] = useState<Deadline[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Initial mock data for side-hustle only (since we only implemented exam backend)
    const sideHustleDeadlines: Deadline[] = [
        {
            id: '1',
            title: 'Portfolio Website',
            dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
            category: 'project',
            subject: 'Web Development',
            progress: 70,
        },
        // ... (can keep other mock data or fetch properly later)
    ];

    const fetchExams = async () => {
        if (!user?.uid) return;
        try {
            const response = await fetch(`${API_BASE_URL}/exams/list/${user.uid}?t=${Date.now()}`);
            if (response.ok) {
                const data = await response.json();
                const fetchedExams: Deadline[] = data.map((exam: any) => {
                    let parsedDate = new Date(exam.date);
                    if (isNaN(parsedDate.getTime())) parsedDate = new Date(); // Fallback

                    return {
                        id: exam.id,
                        title: exam.title,
                        dueDate: parsedDate,
                        date: exam.date, // keep original string for modal
                        category: exam.category || 'exam',
                        subject: exam.subject,
                        progress: exam.total_topics > 0 ? Math.round((exam.completed_topics / exam.total_topics) * 100) : (exam.progress || 0),
                        syllabus: exam.syllabus,
                        total_topics: exam.total_topics,
                        completed_topics: exam.completed_topics
                    };
                });
                setDeadlines(fetchedExams);
            }
        } catch (error) {
            console.error("Failed to fetch exams", error);
        }
    };

    // Real-time listener using Firestore
    useEffect(() => {
        if (mode !== 'academic' || !user?.uid) {
            if (mode === 'side-hustle') setDeadlines(sideHustleDeadlines);
            return;
        }

        const examsRef = collection(db, "user_profiles", user.uid, "exams");
        const deadlinesRef = collection(db, "user_profiles", user.uid, "deadlines");
        // Backend filtered: where("completed", "==", False)
        const activeDeadlinesQuery = query(deadlinesRef, where("completed", "==", false));

        let currentExams: any[] = [];
        let currentDeadlines: any[] = [];

        // Helper to merge and set state
        const updateState = () => {
            const normalizedExams: Deadline[] = currentExams.map((exam: any) => {
                let parsedDate = new Date(exam.date);
                if (isNaN(parsedDate.getTime())) parsedDate = new Date();

                return {
                    id: exam.id,
                    title: exam.title,
                    dueDate: parsedDate,
                    date: exam.date,
                    category: exam.category || 'exam',
                    subject: exam.subject,
                    progress: exam.total_topics > 0 ? Math.round((exam.completed_topics / exam.total_topics) * 100) : (exam.progress || 0),
                    syllabus: exam.syllabus,
                    total_topics: exam.total_topics,
                    completed_topics: exam.completed_topics
                };
            });

            const normalizedDeadlines: Deadline[] = currentDeadlines.map((doc: any) => ({
                id: doc.id,
                title: doc.title || "Untitled",
                subject: doc.subject || "General",
                dueDate: new Date(doc.due_date || Date.now()),
                date: doc.due_date || "",
                category: "assignment",
                progress: 0,
            }));

            const allItems = [...normalizedExams, ...normalizedDeadlines].sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
            setDeadlines(allItems);
        };

        const unsubscribeExams = onSnapshot(examsRef, (snapshot) => {
            currentExams = snapshot.docs
                .map((doc) => ({ ...doc.data(), id: doc.id }))
                .filter((exam: any) => !exam.title?.startsWith("Adaptive Drill:"));
            updateState();
        }, (error) => console.error("Exams listener error:", error));

        const unsubscribeDeadlines = onSnapshot(activeDeadlinesQuery, (snapshot) => {
            currentDeadlines = snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id }));
            updateState();
        }, (error) => console.error("Deadlines listener error:", error));

        return () => {
            unsubscribeExams();
            unsubscribeDeadlines();
        };
    }, [user?.uid, mode]);

    const activeDeadlines = deadlines;

    const [selectedExam, setSelectedExam] = useState<Deadline | null>(null);

    const parseDate = (dateString: string) => {
        const d = new Date(dateString);
        if (isNaN(d.getTime())) {
            // Try to handle YYYY-MM-DD manually if needed, or fallback
            return new Date(); // Fallback to now to avoid crash
        }
        return d;
    };

    const formatDaysUntil = (date: Date) => {
        const now = new Date();
        // Reset time components to compare just the dates
        now.setHours(0, 0, 0, 0);
        const target = new Date(date);
        target.setHours(0, 0, 0, 0);

        const diff = target.getTime() - now.getTime();
        const days = Math.round(diff / (1000 * 60 * 60 * 24));

        if (days === 0) return 'Today';
        if (days === 1) return 'Tomorrow';
        if (days < 0) return 'Overdue';
        if (days < 7) return `${days} days`;
        return `${Math.ceil(days / 7)} week${days >= 14 ? 's' : ''}`;
    };

    const getUrgencyColor = (date: Date) => {
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const target = new Date(date);
        target.setHours(0, 0, 0, 0);

        const days = Math.round((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        if (days < 0) return 'text-destructive'; // Overdue
        if (days <= 2) return 'text-destructive'; // Urgent
        if (days <= 5) return 'text-accent';
        return 'text-muted-foreground';
    };

    const sortedDeadlines = [...activeDeadlines].sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());

    return (
        <div className="rounded-xl border border-border bg-card p-6 shadow-soft h-full flex flex-col">
            {/* Header */}
            <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="icon-container">
                        <Calendar className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <h3 className="font-heading font-bold">{mode === 'academic' ? 'My Exams' : 'Project Deadlines'}</h3>
                        <p className="text-xs text-muted-foreground">
                            {activeDeadlines.length} {mode === 'academic' ? 'exam' : 'project'}{activeDeadlines.length !== 1 ? 's' : ''} tracked
                        </p>
                    </div>
                </div>
                {mode === 'academic' && (
                    <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 text-xs font-bold h-8 px-3 rounded-lg border-primary/30 text-primary hover:bg-primary/10 hover:border-primary hover:text-primary transition-all"
                        onClick={() => setIsModalOpen(true)}
                    >
                        <Plus className="h-3.5 w-3.5" />
                        Add Exam
                    </Button>
                )}
            </div>

            {/* Deadlines List */}
            <div className="space-y-3 flex-1 overflow-y-auto pr-1">
                {sortedDeadlines.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-40 text-center opacity-60">
                        <Calendar className="h-10 w-10 mb-2 text-zinc-600" />
                        <p className="text-sm font-medium">No upcoming exams</p>
                        <p className="text-xs">Click + to add one</p>
                    </div>
                ) : sortedDeadlines.map((deadline, index) => {
                    const Icon = categoryIcons[deadline.category];
                    const daysUntil = formatDaysUntil(deadline.dueDate);
                    const urgencyColor = getUrgencyColor(deadline.dueDate);
                    const isUrgent = Math.ceil((deadline.dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) <= 2;

                    return (
                        <motion.div
                            key={deadline.id}
                            layoutId={deadline.id}
                            onClick={() => {
                                // Only open details for exams that are academic
                                if (deadline.category === 'exam') {
                                    // Fetch full details (including syllabus which might be needed if we only fetched summary)
                                    // But here we rely on the list having mostly what we need, or the modal fetches fresher data?
                                    // Actually, we need the full syllabus list which we might have stored in 'deadline' object or need to fetch.
                                    // The list API returned syllabus arrays, so we should map that to the deadline object if we want to pass it.
                                    // Let's assume fetchExams included it. We need to update the fetchExams logic to include 'syllabus' in the mapped object.
                                    setSelectedExam(deadline);
                                }
                            }}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className={cn(
                                'group rounded-lg border p-4 transition-all hover:shadow-md cursor-pointer',
                                isUrgent ? 'border-destructive/50 bg-destructive/5' : 'border-border'
                            )}
                        >
                            <div className="flex items-start gap-3">
                                <div className={cn(
                                    'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border',
                                    categoryColors[deadline.category]
                                )}>
                                    <Icon className="h-5 w-5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-2">
                                        <div>
                                            <h4 className="font-medium text-sm">{deadline.title}</h4>
                                            {deadline.subject && (
                                                <p className="text-xs text-muted-foreground">{deadline.subject}</p>
                                            )}
                                        </div>
                                        <div className={cn('flex items-center gap-1 text-sm font-medium', urgencyColor)}>
                                            <Clock className="h-3.5 w-3.5" />
                                            <span>{daysUntil}</span>
                                        </div>
                                    </div>

                                    {/* Progress Bar */}
                                    {deadline.progress !== undefined && (
                                        <div className="mt-3">
                                            <div className="mb-1 flex items-center justify-between text-xs">
                                                <span className="text-muted-foreground">Syllabus Covered</span>
                                                <span className="font-medium">{deadline.progress}%</span>
                                            </div>
                                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${deadline.progress}%` }}
                                                    transition={{ duration: 0.8, delay: 0.2 + index * 0.1 }}
                                                    className={cn(
                                                        'h-full rounded-full',
                                                        deadline.progress >= 70 ? 'bg-green-500' : deadline.progress >= 40 ? 'bg-primary' : 'bg-destructive'
                                                    )}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            <AddExamModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={fetchExams}
            />

            <ExamDetailsModal
                isOpen={!!selectedExam}
                onClose={() => setSelectedExam(null)}
                exam={selectedExam} // Note: This needs to have the 'syllabus' property.
                onUpdate={() => {
                    fetchExams();
                    onRefreshStats?.();
                    // Do NOT close the modal so user can see results
                    // Ideally we update the selectedExam with new data, but for now keeping it open allows the AssessmentModal to show results.
                    // If we want to refresh the background data in the details modal, we'd need to re-find the exam in the new 'deadlines' list.
                    // But since 'fetchExams' is async, 'deadlines' won't be updated yet.
                    // For the hackathon, just triggering the refreshes is enough to show "stats updated" on the dashboard when they eventually close it.
                }}
            />
        </div>
    );
}
