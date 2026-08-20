'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, Rocket, ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import confetti from 'canvas-confetti';
import { useEffect } from 'react';

interface ProjectUnlockedModalProps {
    isOpen: boolean;
    onClose: () => void;
    project: any;
}

export function ProjectUnlockedModal({ isOpen, onClose, project }: ProjectUnlockedModalProps) {
    const router = useRouter();

    useEffect(() => {
        if (isOpen) {
            confetti({
                particleCount: 100,
                spread: 70,
                origin: { y: 0.6 }
            });
        }
    }, [isOpen]);

    if (!project) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.8, y: 50 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.8, y: 50 }}
                        className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl relative z-10 overflow-hidden"
                    >
                        {/* Decor */}
                        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-primary/20 to-transparent pointer-events-none" />

                        <div className="p-8 text-center relative">
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: "spring", delay: 0.2 }}
                                className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-6 border-2 border-primary/50"
                            >
                                <Rocket className="h-10 w-10 text-primary" />
                            </motion.div>

                            <h2 className="text-2xl font-bold text-white mb-2 flex items-center justify-center gap-2">
                                <Sparkles className="h-5 w-5 text-yellow-500" />
                                Project Unlocked!
                            </h2>
                            <p className="text-zinc-400 mb-6">
                                You've mastered this phase! A new project has been tailored to your skills.
                            </p>

                            <div className="bg-zinc-800/50 rounded-xl p-4 mb-6 border border-zinc-700 text-left">
                                <h3 className="font-bold text-white mb-1">{project.title}</h3>
                                <div className="flex items-center gap-2 text-xs text-primary mb-2">
                                    <span className="bg-primary/10 px-2 py-0.5 rounded uppercase font-bold tracking-wider">{project.difficulty}</span>
                                    <span>• {project.estimated_time}</span>
                                    <span>• {project.xp_reward} XP</span>
                                </div>
                                <p className="text-sm text-zinc-400 line-clamp-2">{project.description}</p>
                            </div>

                            <div className="flex gap-3">
                                <Button variant="outline" onClick={onClose} className="flex-1">
                                    Later
                                </Button>
                                <Button
                                    onClick={() => {
                                        onClose();
                                        router.push('/dashboard?tab=side-hustle'); // Assume tab param or just dashboard
                                    }}
                                    className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
                                >
                                    View Dashboard
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
