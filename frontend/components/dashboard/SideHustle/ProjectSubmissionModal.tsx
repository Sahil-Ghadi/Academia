'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, Upload, CheckCircle, AlertCircle, Loader2,
    Trophy, Star, Zap, RotateCcw, ChevronRight,
    Image as ImageIcon, ShieldCheck, Target, Layers
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useDropzone } from 'react-dropzone';
import confetti from 'canvas-confetti';
import { API_BASE_URL } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useGamification } from '@/contexts/GamificationContext';

interface ProjectSubmissionModalProps {
    isOpen: boolean;
    onClose: () => void;
    project: any;
    onSuccess: (result: any) => void;
}

const CRITERIA = [
    { icon: Layers,     label: 'Visual Completeness',       desc: 'UI covers all required sections' },
    { icon: Target,     label: 'Feature Implementation',    desc: 'Core functionality is visible' },
    { icon: ShieldCheck,label: 'Project Adherence',         desc: 'Matches project requirements' },
];

export function ProjectSubmissionModal({ isOpen, onClose, project, onSuccess }: ProjectSubmissionModalProps) {
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any | null>(null);
    const { awardXP } = useGamification();

    const onDrop = (acceptedFiles: File[]) => {
        const f = acceptedFiles[0];
        if (f) {
            setFile(f);
            const reader = new FileReader();
            reader.onloadend = () => setPreview(reader.result as string);
            reader.readAsDataURL(f);
        }
    };

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'image/*': [] },
        maxFiles: 1,
    });

    const handleSubmit = async () => {
        if (!file || !preview || !project) return;
        setLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/projects/submit`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ uid: project.uid, project_id: project.id, image: preview }),
            });
            if (!response.ok) throw new Error('Submission failed');
            const data = await response.json();
            setResult(data);
            if (data.passed) {
                // Award project_complete XP
                awardXP('project_complete');
                confetti({ particleCount: 180, spread: 70, origin: { y: 0.65 } });
                setTimeout(() => onSuccess(data), 2200);
            }
        } catch {
            toast.error('Failed to submit project. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setFile(null);
        setPreview(null);
        setResult(null);
        setLoading(false);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                {/* Backdrop */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={handleClose}
                    className="absolute inset-0 bg-black/70 backdrop-blur-md"
                />

                {/* Modal */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.96, y: 16 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96, y: 16 }}
                    transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
                    className="relative z-10 w-full max-w-lg flex flex-col max-h-[92vh] rounded-2xl overflow-hidden bg-[#0f0f13] border border-white/10 shadow-2xl"
                >
                    {/* Top accent bar */}
                    <div className="h-[3px] w-full shrink-0 bg-gradient-to-r from-violet-500 via-primary to-blue-500" />

                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-white/8 shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-xl bg-primary/15 border border-primary/20 flex items-center justify-center">
                                <Upload className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                                <h2 className="text-sm font-bold text-white">Submit Project</h2>
                                <p className="text-[11px] text-white/40 truncate max-w-[240px]">{project?.title}</p>
                            </div>
                        </div>
                        <button
                            onClick={handleClose}
                            className="h-8 w-8 flex items-center justify-center rounded-lg text-white/40 hover:text-white hover:bg-white/8 transition-colors"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>

                    {/* Scrollable content */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-5">
                        <AnimatePresence mode="wait">

                            {/* ── Upload state ── */}
                            {!result && (
                                <motion.div
                                    key="upload"
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -8 }}
                                    className="space-y-5"
                                >
                                    {/* Drop zone */}
                                    <div
                                        {...getRootProps()}
                                        className={cn(
                                            'group relative rounded-xl border-2 border-dashed cursor-pointer transition-all duration-200 overflow-hidden',
                                            isDragActive
                                                ? 'border-primary bg-primary/8 scale-[1.01]'
                                                : preview
                                                    ? 'border-white/10 bg-transparent'
                                                    : 'border-white/10 hover:border-primary/40 hover:bg-white/3'
                                        )}
                                    >
                                        <input {...getInputProps()} />

                                        {preview ? (
                                            <div className="relative aspect-video w-full">
                                                <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                                                {/* Hover overlay */}
                                                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <ImageIcon className="h-6 w-6 text-white" />
                                                    <p className="text-white text-xs font-semibold">Click to change image</p>
                                                </div>
                                                {/* File name badge */}
                                                <div className="absolute bottom-2 left-2 flex items-center gap-1.5 bg-black/70 backdrop-blur-sm px-2.5 py-1 rounded-lg border border-white/10">
                                                    <CheckCircle className="h-3 w-3 text-emerald-400" />
                                                    <span className="text-[11px] text-white/80 font-medium truncate max-w-[200px]">{file?.name}</span>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center gap-3 py-10">
                                                <div className={cn(
                                                    'h-14 w-14 rounded-2xl flex items-center justify-center border transition-colors',
                                                    isDragActive
                                                        ? 'bg-primary/20 border-primary/40'
                                                        : 'bg-white/5 border-white/10 group-hover:bg-primary/10 group-hover:border-primary/30'
                                                )}>
                                                    <Upload className={cn('h-6 w-6 transition-colors', isDragActive ? 'text-primary' : 'text-white/40 group-hover:text-primary')} />
                                                </div>
                                                <div className="text-center">
                                                    <p className="text-sm font-semibold text-white/80">
                                                        {isDragActive ? 'Drop it here...' : 'Upload a screenshot'}
                                                    </p>
                                                    <p className="text-xs text-white/30 mt-0.5">PNG, JPG, WEBP — max 10MB</p>
                                                </div>
                                                <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold">
                                                    <ChevronRight className="h-3 w-3" />
                                                    Browse files
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Grading criteria */}
                                    <div className="rounded-xl border border-white/8 bg-white/3 overflow-hidden">
                                        <div className="flex items-center gap-2 px-4 py-3 border-b border-white/8">
                                            <AlertCircle className="h-4 w-4 text-blue-400" />
                                            <p className="text-xs font-bold text-white/70 uppercase tracking-widest">AI Grading Criteria</p>
                                        </div>
                                        <div className="divide-y divide-white/6">
                                            {CRITERIA.map(({ icon: Icon, label, desc }) => (
                                                <div key={label} className="flex items-center gap-3 px-4 py-3">
                                                    <div className="h-8 w-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                                                        <Icon className="h-4 w-4 text-primary" />
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-bold text-white/80">{label}</p>
                                                        <p className="text-[11px] text-white/35">{desc}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {/* ── Result: Passed ── */}
                            {result?.passed && (
                                <motion.div
                                    key="passed"
                                    initial={{ opacity: 0, scale: 0.96 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="flex flex-col items-center gap-5 py-4"
                                >
                                    <div className="relative">
                                        <div className="absolute inset-0 bg-emerald-500/20 blur-2xl rounded-full scale-150" />
                                        <motion.div
                                            animate={{ scale: [1, 1.05, 1] }}
                                            transition={{ duration: 2, repeat: Infinity }}
                                            className="relative h-24 w-24 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center"
                                        >
                                            <Trophy className="h-12 w-12 text-emerald-400" />
                                        </motion.div>
                                    </div>

                                    <div className="text-center">
                                        <h3 className="text-2xl font-black text-white mb-1">Excellent Work!</h3>
                                        <p className="text-sm text-white/40">Project passed AI verification</p>
                                    </div>

                                    {/* Grade + XP chips */}
                                    <div className="flex gap-3 w-full max-w-xs">
                                        <div className="flex-1 rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-4 text-center">
                                            <div className="flex items-center justify-center gap-1 mb-1">
                                                <Star className="h-3.5 w-3.5 text-emerald-400" />
                                                <p className="text-[10px] font-black text-emerald-400/70 uppercase tracking-widest">Grade</p>
                                            </div>
                                            <p className="text-3xl font-black text-emerald-400">{result.grade}<span className="text-sm text-emerald-400/50">/100</span></p>
                                        </div>
                                        <div className="flex-1 rounded-xl bg-yellow-500/10 border border-yellow-500/20 p-4 text-center">
                                            <div className="flex items-center justify-center gap-1 mb-1">
                                                <Zap className="h-3.5 w-3.5 text-yellow-400" />
                                                <p className="text-[10px] font-black text-yellow-400/70 uppercase tracking-widest">XP Earned</p>
                                            </div>
                                            <p className="text-3xl font-black text-yellow-400">+{result.xp_awarded}</p>
                                        </div>
                                    </div>

                                    {/* Feedback */}
                                    {result.feedback && (
                                        <div className="w-full rounded-xl bg-white/4 border border-white/8 p-4">
                                            <p className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-2">AI Feedback</p>
                                            <p className="text-sm text-white/65 leading-relaxed italic">"{result.feedback}"</p>
                                        </div>
                                    )}
                                </motion.div>
                            )}

                            {/* ── Result: Failed ── */}
                            {result && !result.passed && (
                                <motion.div
                                    key="failed"
                                    initial={{ opacity: 0, scale: 0.96 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="flex flex-col items-center gap-5 py-4"
                                >
                                    <div className="relative">
                                        <div className="absolute inset-0 bg-red-500/20 blur-2xl rounded-full scale-150" />
                                        <div className="relative h-24 w-24 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                                            <X className="h-12 w-12 text-red-400" />
                                        </div>
                                    </div>

                                    <div className="text-center">
                                        <h3 className="text-xl font-black text-white mb-1">Needs Improvement</h3>
                                        <p className="text-sm text-white/40">The AI grader found some issues</p>
                                    </div>

                                    {result.feedback && (
                                        <div className="w-full rounded-xl bg-red-500/8 border border-red-500/20 p-4">
                                            <p className="text-[10px] font-black text-red-400/70 uppercase tracking-widest mb-2">Feedback</p>
                                            <p className="text-sm text-red-200/70 leading-relaxed italic">"{result.feedback}"</p>
                                        </div>
                                    )}
                                </motion.div>
                            )}

                        </AnimatePresence>
                    </div>

                    {/* Footer */}
                    <div className="px-6 py-4 border-t border-white/8 bg-white/2 shrink-0">
                        {!result ? (
                            <div className="flex gap-3">
                                <Button
                                    variant="ghost"
                                    onClick={handleClose}
                                    className="flex-1 h-10 rounded-xl text-white/50 hover:text-white hover:bg-white/8 border border-white/8"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleSubmit}
                                    disabled={!file || loading}
                                    className="flex-[2] h-10 rounded-xl font-bold gap-2 bg-primary hover:bg-primary/90 disabled:opacity-40"
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            Analysing with AI...
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle className="h-4 w-4" />
                                            Submit for Review
                                        </>
                                    )}
                                </Button>
                            </div>
                        ) : (
                            <Button
                                onClick={result.passed ? handleClose : () => { setResult(null); setFile(null); setPreview(null); }}
                                className={cn(
                                    'w-full h-10 rounded-xl font-bold gap-2',
                                    result.passed
                                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                                        : 'bg-white/8 hover:bg-white/12 text-white border border-white/10'
                                )}
                            >
                                {result.passed ? (
                                    <><CheckCircle className="h-4 w-4" /> Continue</>
                                ) : (
                                    <><RotateCcw className="h-4 w-4" /> Try Again</>
                                )}
                            </Button>
                        )}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
