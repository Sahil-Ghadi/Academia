'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    Code,
    Rocket,
    Zap,
    FolderKanban,
    BarChart3,
    FileText,
    Loader2,
    RefreshCw,
    Youtube
} from 'lucide-react';
import { GlowCard, StatCard } from '@/components/ui/GlowCard';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useMode } from '@/contexts/ModeContext';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { exportResumeToPDF } from '@/lib/exportResume';
import { JobMarketGap } from './JobMarketGap';
import { API_BASE_URL } from '@/lib/api';

export function SideHustleInsights() {
    const { user } = useMode();
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [resumeData, setResumeData] = useState<any>(null);
    const [generatingResume, setGeneratingResume] = useState(false);
    const [exportingPDF, setExportingPDF] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            if (!user) return;
            try {
                setLoading(true);
                // We reuse the dashboard endpoint for now as it has the stats we need
                // Ideally we'd have a dedicated insights endpoint
                const response = await fetch(`${API_BASE_URL}/dashboard/sidehustle/${user.uid}`);
                if (response.ok) {
                    const result = await response.json();
                    setData(result);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [user]);

    const handleGenerateResume = async () => {
        if (!user) return;

        setGeneratingResume(true);
        const toastId = toast.loading("Generating your resume...");

        try {
            const response = await fetch(`${API_BASE_URL}/resume/generate/${user.uid}`, {
                method: 'POST'
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Failed to generate resume');
            }

            const result = await response.json();
            setResumeData(result.resume);
            toast.success("Resume generated successfully!", { id: toastId });
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || "Failed to generate resume", { id: toastId });
        } finally {
            setGeneratingResume(false);
        }
    };

    const handleExportPDF = async () => {
        if (!resumeData) return;

        setExportingPDF(true);
        const toastId = toast.loading("Opening print dialog...");

        try {
            exportResumeToPDF(resumeData);
            toast.success("Use 'Save as PDF' in print dialog", { id: toastId });
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || "Failed to export", { id: toastId });
        } finally {
            setExportingPDF(false);
        }
    };

    if (loading) {
        return <div className="animate-pulse p-8">Loading insights...</div>;
    }

    const stats = data?.stats || {};

    const chartData = data?.monthly_project_stats || [
        { name: 'Aug', value: 0 },
        { name: 'Sep', value: 0 },
        { name: 'Oct', value: 0 },
        { name: 'Nov', value: 0 },
        { name: 'Dec', value: 0 },
        { name: 'Jan', value: 0 }
    ];

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
        >

            {/* Moved Stats Row */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
                <StatCard
                    label="Skills in Progress"
                    value={stats.skills_in_progress?.toString() || "0"}
                    icon={<Zap className="h-5 w-5 text-primary" />}
                    delay={0}
                />
                <StatCard
                    label="Video Learn Time"
                    value={stats.video_watch_time || "0m"}
                    icon={<Youtube className="h-5 w-5 text-primary" />}
                    delay={0.05}
                />
                <StatCard
                    label="Projects Completed"
                    value={stats.projects_completed?.toString() || "0"}
                    icon={<FolderKanban className="h-5 w-5 text-primary" />}
                    delay={0.1}
                />
                <StatCard
                    label="Weekly Practice"
                    value={stats.weekly_practice || "0h"}
                    icon={<Code className="h-5 w-5 text-primary" />}
                    delay={0.2}
                />
                <StatCard
                    label="Portfolio Ready"
                    value={stats.portfolio_ready || "0%"}
                    icon={<Rocket className="h-5 w-5 text-primary" />}
                    delay={0.3}
                />
            </div>

            {/* Charts & Jobs Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Projects Chart */}
                <GlowCard delay={0.4}>
                    <div className="mb-6">
                        <h2 className="font-heading text-xl font-bold">Project Submissions</h2>
                        <p className="text-sm text-muted-foreground">Monthly completion trend</p>
                    </div>

                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" className="stroke-zinc-800" vertical={false} />
                                <XAxis
                                    dataKey="name"
                                    stroke="#888888"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <YAxis
                                    stroke="#888888"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                    allowDecimals={false}
                                    tickFormatter={(value) => `${value}`}
                                />
                                <Tooltip
                                    cursor={{ fill: 'rgba(255,255,255,0.1)' }}
                                    contentStyle={{ borderRadius: '8px', border: '1px solid #333', backgroundColor: '#000' }}
                                />
                                <Bar
                                    dataKey="value"
                                    fill="currentColor"
                                    radius={[4, 4, 0, 0]}
                                    className="fill-primary"
                                    barSize={40}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </GlowCard>


                {/* Resume Generator */}
                <GlowCard delay={0.5}>
                    <div className="mb-4 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <FileText className="h-5 w-5 text-primary" />
                            <h2 className="font-heading text-xl font-bold">Resume Generator</h2>
                        </div>
                        {resumeData && (
                            <span className="text-xs text-green-500">✓ Generated</span>
                        )}
                    </div>

                    {!resumeData ? (
                        <div className="flex flex-col items-center justify-center h-[300px] text-center border border-dashed border-zinc-800 rounded-lg bg-zinc-900/50 p-6">
                            <div className="bg-primary/10 p-4 rounded-full mb-4">
                                <FileText className="h-8 w-8 text-primary" />
                            </div>
                            <h3 className="font-medium text-lg mb-2">AI Resume Builder</h3>
                            <p className="text-muted-foreground text-sm max-w-xs mb-4">
                                Generate a tailored resume based on your completed projects and skills.
                            </p>
                            <Button
                                onClick={handleGenerateResume}
                                disabled={generatingResume}
                                className="gap-2"
                            >
                                {generatingResume ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Generating...
                                    </>
                                ) : (
                                    <>
                                        <Zap className="h-4 w-4" />
                                        Generate Resume
                                    </>
                                )}
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex gap-2">
                                <Button
                                    onClick={handleExportPDF}
                                    disabled={exportingPDF}
                                    className="flex-1 gap-2"
                                >
                                    {exportingPDF ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            Exporting...
                                        </>
                                    ) : (
                                        <>
                                            <FileText className="h-4 w-4" />
                                            Export as PDF
                                        </>
                                    )}
                                </Button>
                                <Button
                                    onClick={handleGenerateResume}
                                    variant="outline"
                                    disabled={generatingResume}
                                    className="gap-2"
                                >
                                    <RefreshCw className="h-4 w-4" />
                                    Regenerate
                                </Button>
                            </div>
                            <div className="max-h-[400px] overflow-y-auto border border-zinc-800 rounded-lg p-4 bg-zinc-900/30">
                                <div className="text-sm space-y-2">
                                    <div>
                                        <span className="font-semibold text-primary">Summary:</span>
                                        <p className="text-muted-foreground mt-1">{resumeData.summary}</p>
                                    </div>
                                    <div>
                                        <span className="font-semibold text-primary">Projects:</span>
                                        <p className="text-muted-foreground">{resumeData.projects?.length || 0} projects included</p>
                                    </div>
                                    <div>
                                        <span className="font-semibold text-primary">Skills:</span>
                                        <p className="text-muted-foreground">
                                            {(resumeData.skills?.technical?.length || 0) +
                                                (resumeData.skills?.tools?.length || 0) +
                                                (resumeData.skills?.soft?.length || 0)} skills listed
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </GlowCard>
            </div>

            <div className="mt-8">
                <JobMarketGap />
            </div>
        </motion.div >
    );
}
