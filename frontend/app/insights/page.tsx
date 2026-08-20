'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MarkdownRenderer } from '@/components/ui/MarkdownRenderer';
import {
    Clock,
    BookOpen,
    Target,
    Brain,
    TrendingUp,
    AlertTriangle,
    TrendingDown,
    Minus,
    Sparkles,
    RefreshCw,
    Youtube,
    Trophy,
    CheckCircle,
} from 'lucide-react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { GlowCard, StatCard, ProgressBar } from '@/components/ui/GlowCard';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useMode } from '@/contexts/ModeContext';
import { AssignmentUpload } from '@/components/dashboard/AssignmentUpload';
import { useRouter } from 'next/navigation';
import { SideHustleInsights } from '@/components/dashboard/SideHustleInsights';
import { API_BASE_URL } from '@/lib/api';
import { cn } from '@/lib/utils';

const TABS = ['Overview', 'Detail', 'How to Improve'] as const;
type Tab = typeof TABS[number];

function TrendBadge({ trend }: { trend: string }) {
    if (trend === 'worsening') return (
        <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-600">
            <TrendingDown className="h-3 w-3" /> Worsening
        </span>
    );
    if (trend === 'improving') return (
        <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-600">
            <TrendingUp className="h-3 w-3" /> Improving
        </span>
    );
    return (
        <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-500">
            <Minus className="h-3 w-3" /> Stable
        </span>
    );
}

export default function InsightsPage() {
    const { user, mode, isLoading, isOnboarded } = useMode();
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<Tab>('Overview');
    const [aiSummary, setAiSummary] = useState<string | null>(null);
    const [isLoadingSummary, setIsLoadingSummary] = useState(false);

    const [stats, setStats] = useState<any>({
        weak_areas: [],
        performance_graph: [],
        accuracy_rate: 0,
        exam_readiness: 0,
        agent_decisions: [],
        study_hours: "0h",
        syllabus_completion: 0,
        video_watch_time: "0m"
    });

    useEffect(() => {
        if (!isLoading && !isOnboarded) {
            router.push('/onboarding');
        }
    }, [isOnboarded, isLoading, router]);

    const fetchDashboardData = async () => {
        if (!user?.uid) return;
        try {
            const statsRes = await fetch(`${API_BASE_URL}/stats/academic/${user.uid}`);
            if (statsRes.ok) {
                const data = await statsRes.json();
                setStats(data);
            }
        } catch (error) {
            console.error('Failed to fetch data:', error);
        }
    };

    const fetchAISummary = async () => {
        if (!user?.uid) return;
        setIsLoadingSummary(true);
        try {
            const res = await fetch(`${API_BASE_URL}/stats/weak-area-summary/${user.uid}`);
            if (res.ok) {
                const data = await res.json();
                setAiSummary(data.summary);
            }
        } catch (e) {
            console.error('Failed to fetch AI summary:', e);
        } finally {
            setIsLoadingSummary(false);
        }
    };

    useEffect(() => {
        fetchDashboardData();
    }, [user?.uid]);

    useEffect(() => {
        if (activeTab === 'How to Improve' && !aiSummary && !isLoadingSummary) {
            fetchAISummary();
        }
    }, [activeTab]);

    if (isLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background">
                <div className="animate-pulse text-lg text-muted-foreground">Loading...</div>
            </div>
        );
    }

    return (
        <DashboardLayout
            title={mode === 'side-hustle' ? "Side Hustle Metrics" : "Deep Insights"}
            subtitle={mode === 'side-hustle' ? "Track your practical skill building progress" : "Detailed performance metrics and AI analysis."}
        >
            {mode === 'side-hustle' ? (
                <SideHustleInsights />
            ) : (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-8"
                >
                    {/* Stats Row */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
                        <StatCard label="Study Hours Today" value={stats.study_hours} icon={<Clock className="h-5 w-5 text-primary" />} delay={0} />
                        <StatCard label="Video Learn Time" value={stats.video_watch_time} icon={<Youtube className="h-5 w-5 text-primary" />} delay={0.05} />
                        <StatCard label="Syllabus Complete" value={`${stats.syllabus_completion}%`} icon={<BookOpen className="h-5 w-5 text-primary" />} delay={0.1} />
                        <StatCard label="Exam Readiness" value={`${stats.exam_readiness}%`} icon={<Target className="h-5 w-5 text-primary" />} delay={0.2} />
                        <StatCard label="Accuracy Rate" value={`${stats.accuracy_rate}%`} icon={<Brain className="h-5 w-5 text-primary" />} delay={0.3} />
                    </div>

                    {/* Performance & AI Decisions */}
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                        <GlowCard delay={0.4}>
                            <div className="mb-4 flex items-center gap-2">
                                <TrendingUp className="h-5 w-5 text-primary" />
                                <h2 className="font-heading text-xl font-bold">Academic Performance</h2>
                            </div>
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={stats.performance_graph}>
                                        <defs>
                                            <linearGradient id="colorMarks" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                                        <XAxis dataKey="name" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                                        <YAxis className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                                        <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 'var(--radius)' }} />
                                        <Area type="monotone" dataKey="marks" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorMarks)" strokeWidth={2} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="mt-4 flex items-center justify-center gap-6">
                                <div className="flex items-center gap-2">
                                    <div className="h-3 w-3 rounded-full bg-primary" />
                                    <span className="text-sm text-muted-foreground">Marks Trend</span>
                                </div>
                            </div>
                        </GlowCard>

                        <GlowCard delay={0.5}>
                            <div className="mb-4 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="relative">
                                        <Brain className="h-5 w-5 text-primary" />
                                        <span className="absolute -right-1 -top-1 flex h-2 w-2">
                                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                                            <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
                                        </span>
                                    </div>
                                    <h2 className="font-heading text-xl font-bold">AI Agent Decisions</h2>
                                </div>
                                <span className="text-xs text-muted-foreground">Live updates</span>
                            </div>
                            <div className="space-y-4">
                                {stats.agent_decisions.map((decision: any, index: number) => (
                                    <motion.div
                                        key={decision.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.5 + index * 0.1 }}
                                        className="rounded-lg border border-border bg-mode-accent-soft p-4"
                                    >
                                        <p className="text-sm">{decision.message}</p>
                                        <p className="mt-2 text-xs text-muted-foreground">{decision.time}</p>
                                    </motion.div>
                                ))}
                            </div>
                        </GlowCard>
                    </div>

                    {/* Reminders & Weak Areas Row */}
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                        <GlowCard className="h-[400px]">
                            <AssignmentUpload />
                        </GlowCard>

                        {/* Tabbed Weak Areas Card */}
                        <GlowCard delay={0.3} className="flex flex-col min-h-[430px]">
                            {/* Card Header */}
                            <div className="mb-5 flex items-center justify-between shrink-0">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-destructive/10 border border-destructive/20">
                                        <AlertTriangle className="h-4.5 w-4.5 text-destructive" />
                                    </div>
                                    <div>
                                        <h2 className="font-heading text-base font-bold">Weak Areas</h2>
                                        <p className="text-[11px] text-muted-foreground">
                                            {stats.weak_areas.length > 0
                                                ? `${stats.weak_areas.length} topic${stats.weak_areas.length > 1 ? 's' : ''} need attention`
                                                : 'All clear'}
                                        </p>
                                    </div>
                                </div>
                                {stats.weak_areas.length > 0 && (
                                    <span className="h-6 min-w-[24px] px-2 flex items-center justify-center rounded-full bg-destructive text-white text-[10px] font-black">
                                        {stats.weak_areas.length}
                                    </span>
                                )}
                            </div>

                            {/* Tabs */}
                            <div className="relative flex gap-0 mb-5 shrink-0 rounded-xl bg-muted/40 border border-border/50 p-1">
                                {TABS.map((tab) => (
                                    <button
                                        key={tab}
                                        onClick={() => setActiveTab(tab)}
                                        className={cn(
                                            'relative flex-1 py-2 text-[11px] font-bold rounded-lg transition-colors duration-200 z-10',
                                            activeTab === tab ? 'text-foreground' : 'text-muted-foreground hover:text-foreground/70'
                                        )}
                                    >
                                        {activeTab === tab && (
                                            <motion.div
                                                layoutId="weak-tab-pill"
                                                className="absolute inset-0 bg-card border border-border rounded-lg shadow-sm"
                                                transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                                            />
                                        )}
                                        <span className="relative z-10">{tab}</span>
                                    </button>
                                ))}
                            </div>

                            {/* Tab Content */}
                            <div className="flex-1 overflow-y-auto pr-0.5">
                                <AnimatePresence mode="wait">

                                    {/* ── OVERVIEW TAB ── */}
                                    {activeTab === 'Overview' && (
                                        <motion.div key="overview" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="space-y-2.5">
                                            {stats.weak_areas.length === 0 ? (
                                                <div className="flex flex-col items-center justify-center py-12 text-center">
                                                    <div className="h-14 w-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-4">
                                                        <Trophy className="h-6 w-6 text-emerald-500" />
                                                    </div>
                                                    <h3 className="text-base font-bold text-foreground mb-1">You're All Caught Up!</h3>
                                                    <p className="text-sm text-muted-foreground max-w-[220px]">No weak areas identified. Keep acing your assessments!</p>
                                                </div>
                                            ) : stats.weak_areas.slice(0, 7).map((area: any, index: number) => {
                                                const conf = area.confidence ?? 0;
                                                const confColor = conf >= 70 ? 'text-emerald-500' : conf >= 40 ? 'text-amber-500' : 'text-destructive';
                                                const barColor = conf >= 70 ? 'bg-emerald-500' : conf >= 40 ? 'bg-amber-500' : 'bg-destructive';
                                                return (
                                                    <motion.div
                                                        key={index}
                                                        initial={{ opacity: 0, x: -8 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        transition={{ delay: index * 0.05 }}
                                                        className="group flex items-center gap-3 rounded-xl border border-border/60 bg-card/60 px-3.5 py-3 hover:border-border hover:bg-card transition-all"
                                                    >
                                                        {/* Rank */}
                                                        <span className="text-[10px] font-black text-muted-foreground/50 w-4 shrink-0">#{index + 1}</span>
                                                        {/* Topic + bar */}
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-semibold text-foreground truncate mb-1.5">{area.topic}</p>
                                                            <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                                                                <motion.div
                                                                    initial={{ width: 0 }}
                                                                    animate={{ width: `${conf}%` }}
                                                                    transition={{ duration: 0.8, delay: index * 0.05, ease: 'easeOut' }}
                                                                    className={`h-full rounded-full ${barColor}`}
                                                                />
                                                            </div>
                                                        </div>
                                                        {/* Right side */}
                                                        <div className="flex items-center gap-2 shrink-0">
                                                            <TrendBadge trend={area.trend} />
                                                            <span className={`text-xs font-black tabular-nums ${confColor}`}>{conf}%</span>
                                                        </div>
                                                    </motion.div>
                                                );
                                            })}
                                        </motion.div>
                                    )}

                                    {/* ── DETAIL TAB ── */}
                                    {activeTab === 'Detail' && (
                                        <motion.div key="detail" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="space-y-3">
                                            {stats.weak_areas.length === 0 ? (
                                                <div className="flex flex-col items-center justify-center py-12 text-center">
                                                    <div className="h-14 w-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4">
                                                        <CheckCircle className="h-6 w-6 text-primary" />
                                                    </div>
                                                    <h3 className="text-base font-bold text-foreground mb-1">Nothing to Drill Down</h3>
                                                    <p className="text-sm text-muted-foreground max-w-[220px]">Take some assessments to surface specific question data.</p>
                                                </div>
                                            ) : stats.weak_areas.map((area: any, index: number) => (
                                                <motion.div
                                                    key={index}
                                                    initial={{ opacity: 0, y: 8 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ delay: index * 0.04 }}
                                                    className="rounded-2xl border border-border bg-card overflow-hidden"
                                                >
                                                    {/* Topic header strip */}
                                                    <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border bg-muted/20">
                                                        <div className="flex items-center gap-2.5">
                                                            <div className="h-2 w-2 rounded-full bg-destructive shrink-0" />
                                                            <p className="font-bold text-sm text-foreground">{area.topic}</p>
                                                        </div>
                                                        <div className="flex items-center gap-2 shrink-0">
                                                            <TrendBadge trend={area.trend} />
                                                            <span className="text-[10px] font-black bg-muted text-muted-foreground px-2 py-0.5 rounded-full">{area.count}× wrong</span>
                                                        </div>
                                                    </div>
                                                    {/* Questions Carousel */}
                                                    <div className="p-4 bg-muted/10">
                                                        {area.wrong_questions && area.wrong_questions.length > 0 ? (
                                                            <div className="flex overflow-x-auto gap-3 pb-2 custom-scrollbar snap-x">
                                                                {area.wrong_questions.map((wq: any, qi: number) => (
                                                                    <div key={qi} className="shrink-0 w-[260px] snap-start rounded-xl bg-card border border-border/60 p-3.5 flex flex-col shadow-sm">
                                                                        <div className="flex items-start gap-2 mb-3">
                                                                            <span className="h-5 w-5 rounded-md bg-destructive/10 text-destructive flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">Q</span>
                                                                            <p className="text-xs font-semibold text-foreground leading-snug line-clamp-3" title={wq.question}>{wq.question}</p>
                                                                        </div>
                                                                        <div className="mt-auto pt-3 border-t border-border/50">
                                                                            <div className="flex items-center gap-1.5 mb-1.5">
                                                                                <CheckCircle className="w-3 h-3 text-emerald-500" />
                                                                                <span className="text-[9px] font-black uppercase tracking-widest text-emerald-500">Correct Answer</span>
                                                                            </div>
                                                                            <p className="text-[11px] text-muted-foreground leading-snug line-clamp-2 font-medium" title={wq.correct}>{wq.correct}</p>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-center justify-center py-4 border border-dashed border-border/60 rounded-xl bg-card/50">
                                                                <p className="text-[11px] text-muted-foreground font-semibold">Complete a new assessment to log specific questions.</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </motion.div>
                                            ))}
                                        </motion.div>
                                    )}

                                    {/* ── HOW TO IMPROVE TAB ── */}
                                    {activeTab === 'How to Improve' && (
                                        <motion.div key="improve" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="space-y-4">
                                            <div className="flex items-center justify-between">
                                                <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">AI Study Plan</p>
                                                <button
                                                    onClick={fetchAISummary}
                                                    disabled={isLoadingSummary}
                                                    className="flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary/80 disabled:opacity-40 transition-opacity"
                                                >
                                                    <RefreshCw className={cn('h-3.5 w-3.5', isLoadingSummary && 'animate-spin')} />
                                                    Regenerate
                                                </button>
                                            </div>

                                            {isLoadingSummary ? (
                                                <div className="flex flex-col items-center justify-center py-12 gap-4">
                                                    <div className="relative">
                                                        <div className="h-12 w-12 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
                                                        <Sparkles className="absolute inset-0 m-auto h-5 w-5 text-primary animate-pulse" />
                                                    </div>
                                                    <p className="text-sm text-muted-foreground font-medium">Generating your personalised plan...</p>
                                                </div>
                                            ) : aiSummary ? (
                                                <div className="rounded-xl border border-border bg-card/50 p-4">
                                                    <MarkdownRenderer content={aiSummary} />
                                                </div>
                                            ) : (
                                                <div className="flex flex-col items-center justify-center py-10 gap-3">
                                                    <Sparkles className="h-8 w-8 text-muted-foreground/30" />
                                                    <p className="text-sm text-muted-foreground text-center max-w-[200px]">Click Regenerate to get a personalised AI study plan.</p>
                                                </div>
                                            )}
                                        </motion.div>
                                    )}

                                </AnimatePresence>
                            </div>
                        </GlowCard>
                    </div>
                </motion.div>
            )}
        </DashboardLayout>
    );
}
