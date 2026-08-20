'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Briefcase, TrendingUp, AlertCircle, Plus, CheckCircle2, Loader2, IndianRupee, Target, Search, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useMode } from '@/contexts/ModeContext';
import { API_BASE_URL } from '@/lib/api';

interface JobRole {
    title: string;
    description: string;
    match_score: number;
    demand: string;
    avg_salary: string;
    url?: string;
    company?: string;
}

interface SkillGap {
    missing_skill: string;
    reason: string;
    recommended_resource: string;
}

interface GapAnalysis {
    role: string;
    missing_skills: SkillGap[];
}

export function JobMarketGap() {
    const { user, userProfile, setUserProfile } = useMode();
    const [jobs, setJobs] = useState<JobRole[]>([]);
    const [selectedJob, setSelectedJob] = useState<JobRole | null>(null);
    const [gapAnalysis, setGapAnalysis] = useState<GapAnalysis | null>(null);
    const [loadingJobs, setLoadingJobs] = useState(false);
    const [analyzingGap, setAnalyzingGap] = useState(false);
    const [addingSkill, setAddingSkill] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState<'recommended' | 'search'>('recommended');

    useEffect(() => {
        if (user?.uid) {
            loadStoredJobs();
        }
    }, [user?.uid]);

    const loadStoredJobs = async () => {
        setLoadingJobs(true);
        setSelectedJob(null);
        setGapAnalysis(null);
        setViewMode('recommended');
        try {
            const res = await fetch(`${API_BASE_URL}/jobs/${user?.uid}`);
            if (res.ok) {
                const data = await res.json();
                setJobs(data);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoadingJobs(false);
        }
    };

    const generateJobs = async () => {
        setLoadingJobs(true);
        setSelectedJob(null);
        setGapAnalysis(null);
        try {
            const res = await fetch(`${API_BASE_URL}/jobs/analyze`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ uid: user?.uid })
            });
            if (res.ok) {
                const data = await res.json();
                setJobs(data);
                if (data.length > 0) handleSelectJob(data[0]);
            }
        } catch (error) {
            console.error(error);
            toast.error("Failed to generate job recommendations");
        } finally {
            setLoadingJobs(false);
        }
    };

    const handleSearch = async () => {
        if (!searchQuery.trim()) return;
        setLoadingJobs(true);
        setSelectedJob(null);
        setGapAnalysis(null);
        setViewMode('search');
        try {
            const res = await fetch(`${API_BASE_URL}/jobs/search/?query=${encodeURIComponent(searchQuery)}&uid=${user?.uid}`);
            if (res.ok) {
                const data = await res.json();
                setJobs(data);
            }
        } catch (error) {
            console.error(error);
            toast.error("Failed to search jobs");
        } finally {
            setLoadingJobs(false);
        }
    };

    const handleBackToRecommended = () => {
        setSearchQuery('');
        loadStoredJobs();
    };

    const handleSelectJob = async (job: JobRole) => {
        if (selectedJob?.title === job.title) return;
        setSelectedJob(job);
        setAnalyzingGap(true);
        setGapAnalysis(null);

        try {
            const res = await fetch(`${API_BASE_URL}/jobs/gap`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ uid: user?.uid, role: job.title })
            });

            if (res.ok) {
                const data = await res.json();
                setGapAnalysis(data);
            }
        } catch (error) {
            console.error(error);
            toast.error("Failed to analyze skill gaps");
        } finally {
            setAnalyzingGap(false);
        }
    };

    const handleAddSkill = async (skillName: string) => {
        setAddingSkill(skillName);
        try {
            const res = await fetch(`${API_BASE_URL}/jobs/add-skill`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ uid: user?.uid, skill_name: skillName })
            });

            if (res.ok) {
                toast.success(`Added "${skillName}" to your goals`);

                // Manually update context to show in Settings immediately
                if (userProfile && setUserProfile) {
                    const updatedInterests = [...(userProfile.sideHustleInterests || [])];
                    if (!updatedInterests.includes(skillName)) {
                        updatedInterests.push(skillName);
                        setUserProfile({
                            ...userProfile,
                            sideHustleInterests: updatedInterests
                        });
                    }
                }
            } else {
                const err = await res.json();
                if (err.message === "Skill already exists") {
                    toast.info(`"${skillName}" is already in your skills`);
                } else {
                    throw new Error("Failed to add skill");
                }
            }
        } catch (error) {
            console.error(error);
            toast.error("Failed to add skill");
        } finally {
            setAddingSkill(null);
        }
    };

    return (
        <div className="w-full bg-card rounded-2xl border border-border/50 overflow-hidden shadow-sm">
            <div className="p-6 md:p-8 border-b border-border/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/10">
                        <Target className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold tracking-tight text-foreground">Job Market Gap Analysis</h2>
                        <p className="text-sm text-muted-foreground mt-1">
                            Identify and bridge skills gaps for your target roles
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            placeholder="Find real jobs in India..."
                            className="h-10 w-[200px] md:w-[260px] pl-9 pr-4 rounded-md border border-input bg-background text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        />
                    </div>
                    {viewMode === 'search' ? (
                        <Button onClick={handleBackToRecommended} disabled={loadingJobs} variant="outline" className="h-10">
                            Back
                        </Button>
                    ) : (
                        <Button onClick={generateJobs} disabled={loadingJobs} variant="outline" className="gap-2 h-10 hidden md:flex">
                            {loadingJobs ? <Loader2 className="h-4 w-4 animate-spin" /> : <Briefcase className="h-4 w-4" />}
                            Refresh Roles
                        </Button>
                    )}
                </div>
            </div>

            <div className="p-6 md:p-8 bg-zinc-50/50 dark:bg-zinc-900/20">
                {loadingJobs ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                        <div className="bg-background p-4 rounded-full shadow-sm mb-4 border animate-pulse">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                        <p className="text-sm font-medium">Analyzing market trends & your profile...</p>
                        <p className="text-xs text-muted-foreground mt-1">This uses AI to match you with top opportunities</p>
                    </div>
                ) : jobs.length === 0 ? (
                    <div className="text-center py-16">
                        <p className="text-muted-foreground mb-4">No recommendations generated yet.</p>
                        <Button onClick={generateJobs}>Generate Analysis</Button>
                    </div>
                ) : (
                    <div className="space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {jobs.map((job, idx) => (
                                <motion.div
                                    key={`${job.title}-${idx}`}
                                    whileHover={{ y: -2 }}
                                    onClick={() => handleSelectJob(job)}
                                    className={`
                                        cursor-pointer group relative overflow-hidden rounded-xl border p-5 transition-all duration-300
                                        ${selectedJob?.title === job.title
                                            ? 'bg-background border-primary shadow-lg shadow-primary/5 ring-1 ring-primary/20'
                                            : 'bg-background border-border hover:border-primary/50 hover:shadow-md'
                                        }
                                    `}
                                >
                                    <div className="flex flex-col h-full justify-between gap-4">
                                        <div className="space-y-3">
                                            <div className="flex justify-between items-start gap-2">
                                                <h3 className={`font-semibold text-lg leading-tight transition-colors ${selectedJob?.title === job.title ? 'text-primary' : 'text-foreground'}`}>
                                                    {job.title}
                                                </h3>
                                                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${job.demand === 'High' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' :
                                                    'bg-amber-500/10 text-amber-600 border-amber-500/20'
                                                    }`}>
                                                    {job.demand}
                                                </span>
                                            </div>
                                            <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">
                                                {job.description}
                                            </p>
                                        </div>

                                        <div className="flex items-center justify-between pt-4 border-t border-border/50 text-sm">
                                            <div className="flex items-center gap-1 font-medium text-foreground bg-secondary/50 px-2.5 py-1 rounded-md">
                                                {job.avg_salary !== "N/A" && <IndianRupee className="h-3.5 w-3.5" />}
                                                <span>{job.avg_salary.replace('₹', '')}</span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                {job.url && (
                                                    <a
                                                        href={job.url}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="flex items-center gap-1.5 text-[11px] font-semibold text-primary hover:underline bg-primary/10 px-2.5 py-1 rounded"
                                                    >
                                                        Apply <ExternalLink className="h-3 w-3" />
                                                    </a>
                                                )}
                                                {job.match_score > 0 && (
                                                    <div className="flex flex-col items-end">
                                                        <span className={`text-xs font-bold leading-none ${job.match_score > 70 ? 'text-emerald-600' : 'text-amber-600'}`}>
                                                            {job.match_score}%
                                                        </span>
                                                        <div className="w-16 h-1 bg-secondary rounded-full overflow-hidden mt-1">
                                                            <div
                                                                className={`h-full rounded-full ${job.match_score > 70 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                                                                style={{ width: `${job.match_score}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>

                        <AnimatePresence mode="wait">
                            {selectedJob && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 10 }}
                                    className="bg-card rounded-xl border border-border/50 p-6 md:p-8 shadow-sm"
                                >
                                    <div className="flex items-center gap-4 mb-8 pb-5 border-b border-border/50">
                                        <div className="bg-primary/10 p-2.5 rounded-xl border border-primary/20">
                                            <Briefcase className="h-6 w-6 text-primary" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-xl text-foreground">
                                                Skill Gap Analysis
                                            </h3>
                                            <p className="text-sm text-muted-foreground mt-0.5">
                                                Required skills for <span className="text-primary font-medium">{selectedJob.title}</span>
                                            </p>
                                        </div>
                                    </div>

                                    {analyzingGap ? (
                                        <div className="py-16 flex flex-col items-center justify-center gap-4 text-muted-foreground">
                                            <div className="bg-primary/5 p-4 rounded-full animate-pulse border border-primary/10">
                                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                            </div>
                                            <span className="text-sm font-medium">Identifying missing skills & exact resources...</span>
                                        </div>
                                    ) : (gapAnalysis && (
                                        <div className="grid grid-cols-1 gap-5">
                                            {gapAnalysis.missing_skills.length > 0 ? (
                                                gapAnalysis.missing_skills.map((gap, idx) => (
                                                    <motion.div
                                                        key={idx}
                                                        initial={{ opacity: 0, x: -10 }}
                                                        animate={{ opacity: 1, x: 0, transition: { delay: idx * 0.05 } }}
                                                        className="flex flex-col md:flex-row md:items-start justify-between gap-5 p-5 rounded-xl border border-border/60 bg-background/50 hover:bg-background hover:border-primary/40 transition-all shadow-sm group"
                                                    >
                                                        <div className="space-y-2.5 flex-1">
                                                            <div className="flex items-center gap-3">
                                                                <div className="bg-amber-500/10 p-1.5 rounded-md border border-amber-500/20">
                                                                    <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
                                                                </div>
                                                                <span className="font-bold text-base text-foreground group-hover:text-primary transition-colors">
                                                                    {gap.missing_skill}
                                                                </span>
                                                            </div>
                                                            <p className="text-sm text-muted-foreground pl-[38px] leading-relaxed">
                                                                {gap.reason}
                                                            </p>
                                                            <div className="pl-[38px] pt-1">
                                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-primary/10 text-primary border border-primary/10">
                                                                    <TrendingUp className="h-3.5 w-3.5" />
                                                                    {gap.recommended_resource}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <div className="pl-[38px] md:pl-0 pt-2 md:pt-0">
                                                            <Button
                                                                size="sm"
                                                                variant={addingSkill === gap.missing_skill ? "secondary" : "default"}
                                                                onClick={() => handleAddSkill(gap.missing_skill)}
                                                                disabled={addingSkill === gap.missing_skill}
                                                                className="shrink-0 font-medium shadow-sm w-full md:w-auto"
                                                            >
                                                                {addingSkill === gap.missing_skill ? (
                                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                                ) : (
                                                                    <>
                                                                        <Plus className="h-4 w-4 mr-1.5" />
                                                                        Add to Roadmap
                                                                    </>
                                                                )}
                                                            </Button>
                                                        </div>
                                                    </motion.div>
                                                ))
                                            ) : (
                                                <div className="text-center py-12 bg-emerald-50/50 dark:bg-emerald-950/10 rounded-xl border border-emerald-200 dark:border-emerald-900 border-dashed">
                                                    <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto mb-3" />
                                                    <h4 className="font-bold text-lg text-emerald-700 dark:text-emerald-400">Target Role Achieved!</h4>
                                                    <p className="text-sm text-emerald-600/80 dark:text-emerald-500/80 max-w-sm mx-auto">
                                                        You have all the core skills required for this role. Time to start building your portfolio!
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                )}
            </div>
        </div>
    );
}
