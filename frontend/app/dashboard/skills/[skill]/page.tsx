'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Map,
    CheckCircle,
    Clock,
    BookOpen,
    Loader2,
    ChevronRight,
    ChevronDown,
    ArrowLeft,
    Trophy,
    Sparkles,
    Play
} from 'lucide-react';
import { useMode } from '@/contexts/ModeContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { DashboardLayout } from '@/components/DashboardLayout';
import { YouTubeModal } from '@/components/dashboard/SideHustle/YouTubeModal';
import { API_BASE_URL } from '@/lib/api';

interface RoadmapItem {
    id: string;
    title: string;
    description: string;
    estimated_time: string;
    resources: string[];
    completed: boolean;
}

interface RoadmapPhase {
    id: string;
    title: string;
    items: RoadmapItem[];
}

interface RoadmapResponse {
    skill: string;
    phases: RoadmapPhase[];
}

export default function SkillRoadmapPage() {
    const params = useParams();
    const router = useRouter();
    const { user } = useMode();
    const skillName = decodeURIComponent(params.skill as string);

    const [roadmap, setRoadmap] = useState<RoadmapResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [expandedPhase, setExpandedPhase] = useState<string | null>(null);
    const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
    const [showVideoModal, setShowVideoModal] = useState(false);

    useEffect(() => {
        if (user && skillName) {
            fetchRoadmap();
        }
    }, [user, skillName]);

    const fetchRoadmap = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/roadmap/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    uid: user?.uid,
                    skill: skillName,
                    current_level: "Beginner"
                })
            });

            if (!res.ok) throw new Error("Failed to load roadmap");

            const data = await res.json();
            setRoadmap(data);
            if (data.phases && data.phases.length > 0) {
                setExpandedPhase(data.phases[0].id);
            }
        } catch (error) {
            console.error(error);
            toast.error("Failed to generate roadmap");
        } finally {
            setLoading(false);
        }
    };

    const handleToggle = async (phaseId: string, itemId: string, currentStatus: boolean, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!roadmap || !user) return;

        // Optimistic update
        const newPhases = roadmap.phases.map(p => {
            if (p.id === phaseId) {
                return {
                    ...p,
                    items: p.items.map(i => i.id === itemId ? { ...i, completed: !currentStatus } : i)
                };
            }
            return p;
        });
        setRoadmap({ ...roadmap, phases: newPhases });

        try {
            const res = await fetch(`${API_BASE_URL}/roadmap/toggle`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    uid: user.uid,
                    skill: skillName,
                    phase_id: phaseId,
                    item_id: itemId,
                    completed: !currentStatus
                })
            });

            if (res.ok) {
                const data = await res.json();
                if (data.project_unlocked && data.new_project) {
                    toast.success("New Project Unlocked! Check your Dashboard.");
                }
            }
        } catch (error) {
            toast.error("Failed to save progress");
        }
    };

    // Calculate progress
    const totalItems = roadmap?.phases.reduce((acc, p) => acc + p.items.length, 0) || 0;
    const completedItems = roadmap?.phases.reduce((acc, p) => acc + p.items.filter(i => i.completed).length, 0) || 0;
    const progress = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

    return (
        <DashboardLayout
            title={`${skillName} Roadmap`}
            subtitle="AI-Curated Learning Path • Beginner to Pro"
        >
            <div className="bg-[#050505] text-zinc-100 rounded-3xl overflow-hidden min-h-[calc(100vh-10rem)] border border-zinc-800 p-8 shadow-2xl relative">
                {/* Ambient Background */}
                <div className="absolute top-0 right-0 p-20 bg-primary/5 blur-3xl rounded-full pointer-events-none" />
                <div className="absolute bottom-0 left-0 p-20 bg-blue-500/5 blur-3xl rounded-full pointer-events-none" />

                <div className="max-w-5xl mx-auto space-y-8 relative z-10">

                    {/* Header Section */}
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                        <div className="space-y-4">
                            <Button
                                variant="ghost"
                                onClick={() => router.back()}
                                className="pl-0 text-zinc-500 hover:text-zinc-300 hover:bg-transparent -ml-2"
                            >
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                Back to Dashboard
                            </Button>
                            <div>
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="p-2 bg-primary/10 rounded-lg">
                                        <Map className="h-6 w-6 text-primary" />
                                    </div>
                                    <span className="text-sm font-bold tracking-wider text-primary uppercase">Skill Roadmap</span>
                                </div>
                                <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight">{skillName}</h1>
                                <p className="text-zinc-400 mt-2 text-lg max-w-2xl">
                                    A curated, AI-powered learning path designed to take you from basics to mastery. Follow the phases to build expertise.
                                </p>
                            </div>
                        </div>

                        {/* Progress Card */}
                        {roadmap && (
                            <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-2xl min-w-[240px] backdrop-blur-sm">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <p className="text-sm text-zinc-500 font-medium uppercase tracking-wide">Total Progress</p>
                                        <p className="text-3xl font-bold text-white mt-1">{progress}%</p>
                                    </div>
                                    <Trophy className={cn("h-8 w-8", progress === 100 ? "text-yellow-500" : "text-zinc-700")} />
                                </div>
                                <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-primary transition-all duration-1000 ease-out"
                                        style={{ width: `${progress}%` }}
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="w-full h-px bg-zinc-900" />

                    {/* Main Content - Tree Layout */}
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-6">
                            <div className="relative">
                                <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
                                <Loader2 className="h-12 w-12 text-primary animate-spin relative z-10" />
                            </div>
                            <div className="text-center space-y-2">
                                <h3 className="text-xl font-medium text-white">Cultivating Knowledge Tree</h3>
                                <p className="text-zinc-500">AI is structuring your learning path...</p>
                            </div>
                        </div>
                    ) : roadmap ? (
                        <div className="max-w-3xl mx-auto relative pb-20">
                            {/* The Trunk */}
                            <div className="absolute left-[27px] md:left-8 top-4 bottom-0 w-0.5 bg-gradient-to-b from-primary/50 via-zinc-800 to-transparent" />

                            <div className="space-y-12">
                                {roadmap.phases.map((phase, phaseIndex) => {
                                    const isPhaseCompleted = phase.items.every(i => i.completed);
                                    const isExpanded = expandedPhase === phase.id;

                                    return (
                                        <div key={phase.id} className="relative pl-20 md:pl-24">
                                            {/* Phase Node (Trunk Connection) */}
                                            <button
                                                onClick={() => setExpandedPhase(isExpanded ? null : phase.id)}
                                                className={cn(
                                                    "absolute left-0 md:left-1 top-0 w-14 h-14 rounded-2xl border-4 flex items-center justify-center transition-all duration-300 z-10 shadow-xl",
                                                    isPhaseCompleted
                                                        ? "bg-zinc-900 border-primary text-primary shadow-primary/20"
                                                        : isExpanded
                                                            ? "bg-primary border-primary text-black shadow-primary/20"
                                                            : "bg-zinc-900 border-zinc-700 text-zinc-500 hover:border-zinc-500"
                                                )}
                                            >
                                                <span className="text-lg font-bold">{phaseIndex + 1}</span>
                                            </button>

                                            {/* Phase Content */}
                                            <div className="relative">
                                                <button
                                                    onClick={() => setExpandedPhase(isExpanded ? null : phase.id)}
                                                    className="text-left w-full group"
                                                >
                                                    <h2 className={cn(
                                                        "text-2xl font-bold transition-colors flex items-center gap-3",
                                                        isExpanded ? "text-primary" : "text-white group-hover:text-primary/80"
                                                    )}>
                                                        {phase.title}
                                                        {isPhaseCompleted && <CheckCircle className="h-6 w-6 text-primary fill-primary/10" />}
                                                    </h2>
                                                    <p className="text-zinc-500 mt-1 font-medium">{phase.items.length} Modules</p>
                                                </button>

                                                {/* Branching Items */}
                                                <AnimatePresence>
                                                    {isExpanded && (
                                                        <motion.div
                                                            initial={{ opacity: 0, height: 0 }}
                                                            animate={{ opacity: 1, height: "auto" }}
                                                            exit={{ opacity: 0, height: 0 }}
                                                            className="overflow-hidden"
                                                        >
                                                            <div className="pt-8 space-y-6 relative">
                                                                {/* Branch Line */}
                                                                <div className="absolute left-[-29px] md:left-[-25px] top-4 bottom-6 w-0.5 bg-zinc-800" />

                                                                {phase.items.map((item, itemIndex) => (
                                                                    <motion.div
                                                                        key={item.id}
                                                                        initial={{ x: -20, opacity: 0 }}
                                                                        animate={{ x: 0, opacity: 1 }}
                                                                        transition={{ delay: itemIndex * 0.1 }}
                                                                        className="relative group/item"
                                                                    >
                                                                        {/* Connector */}
                                                                        <div className="absolute left-[-29px] md:left-[-25px] top-8 w-6 md:w-8 h-px bg-zinc-800 group-hover/item:bg-zinc-600 transition-colors" />
                                                                        <div className={cn(
                                                                            "absolute left-[-33px] md:left-[-29px] top-[29px] w-2 h-2 rounded-full border transition-colors z-10",
                                                                            item.completed ? "bg-primary border-primary" : "bg-zinc-900 border-zinc-600 group-hover/item:border-primary"
                                                                        )} />

                                                                        {/* Item Card */}
                                                                        <div
                                                                            onClick={(e) => handleToggle(phase.id, item.id, item.completed, e)}
                                                                            className={cn(
                                                                                "p-5 rounded-xl border transition-all cursor-pointer relative overflow-hidden",
                                                                                item.completed
                                                                                    ? "bg-zinc-900/60 border-primary/30"
                                                                                    : "bg-zinc-900/40 border-zinc-800 hover:border-zinc-600 hover:bg-zinc-800/60"
                                                                            )}
                                                                        >
                                                                            <div className="flex items-start gap-4">
                                                                                <div className={cn(
                                                                                    "mt-1 w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-colors",
                                                                                    item.completed ? "bg-primary border-primary text-black" : "border-zinc-600 text-transparent"
                                                                                )}>
                                                                                    <CheckCircle className="h-3.5 w-3.5" strokeWidth={3} />
                                                                                </div>
                                                                                <div className="flex-1 min-w-0">
                                                                                    <div className="flex flex-wrap items-center justify-between gap-y-2 gap-x-4 mb-2">
                                                                                        <h4 className={cn(
                                                                                            "font-bold text-lg leading-tight transition-colors",
                                                                                            item.completed ? "text-primary line-through opacity-70" : "text-zinc-100"
                                                                                        )}>{item.title}</h4>

                                                                                        <div className="flex items-center gap-2">
                                                                                            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1 bg-zinc-950 px-2 py-1 rounded border border-zinc-800">
                                                                                                <Clock className="h-3 w-3" />
                                                                                                {item.estimated_time}
                                                                                            </span>
                                                                                        </div>
                                                                                    </div>

                                                                                    <p className="text-sm text-zinc-400 leading-relaxed mb-4">{item.description}</p>

                                                                                    {/* Resources & Actions */}
                                                                                    <div className="flex flex-wrap gap-2">
                                                                                        <button
                                                                                            onClick={(e) => {
                                                                                                e.stopPropagation();
                                                                                                setSelectedTopic(item.title);
                                                                                                setShowVideoModal(true);
                                                                                            }}
                                                                                            className="text-[10px] font-bold uppercase text-white bg-red-600/90 hover:bg-red-600 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
                                                                                        >
                                                                                            <Play className="h-3 w-3 fill-current" />
                                                                                            Watch
                                                                                        </button>
                                                                                        {item.resources.map((res, i) => (
                                                                                            <a
                                                                                                key={i}
                                                                                                href={`https://www.google.com/search?q=${encodeURIComponent(res)}`}
                                                                                                target="_blank"
                                                                                                rel="noopener noreferrer"
                                                                                                onClick={(e) => e.stopPropagation()}
                                                                                                className="text-[10px] font-medium text-zinc-400 bg-zinc-950 hover:bg-zinc-800 hover:text-zinc-200 px-3 py-1.5 rounded-lg border border-zinc-800 transition-colors flex items-center gap-1.5"
                                                                                            >
                                                                                                <BookOpen className="h-3 w-3" />
                                                                                                {res}
                                                                                            </a>
                                                                                        ))}
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </motion.div>
                                                                ))}
                                                            </div>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Conclusion Node */}
                            <div className="relative pl-20 md:pl-24 pt-12">
                                <div className="absolute left-[27px] md:left-8 top-12 w-14 h-14 rounded-full bg-zinc-900 border-4 border-dashed border-zinc-700 flex items-center justify-center z-10">
                                    <Trophy className="h-6 w-6 text-zinc-700" />
                                </div>
                                <div className="pt-3 opacity-50">
                                    <h3 className="text-xl font-bold text-zinc-500">Mastery</h3>
                                    <p className="text-zinc-600 text-sm">Complete all phases to unlock</p>
                                </div>
                            </div>
                        </div>
                    ) : null}

                    <YouTubeModal
                        isOpen={showVideoModal}
                        onClose={() => setShowVideoModal(false)}
                        topic={selectedTopic || ""}
                        subject={skillName}
                    />
                </div>
            </div>
        </DashboardLayout>
    );
}
