'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, BookOpen, Rocket, Zap, GraduationCap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

export function SplitHero() {
    const [hoveredSide, setHoveredSide] = useState<'left' | 'right' | null>(null);
    const router = useRouter();

    return (
        <div className="relative h-[100vh] min-h-[600px] w-full overflow-hidden flex flex-col md:flex-row">
            {/* Left Side - Academic */}
            <motion.div
                className="relative flex-1 bg-white text-black flex items-center justify-center p-8 overflow-hidden group"
                initial={{ flex: 1 }}
                animate={{
                    flex: hoveredSide === 'left' ? 2 : hoveredSide === 'right' ? 1 : 1,
                }}
                transition={{ duration: 0.5, ease: "easeInOut" }}
                onMouseEnter={() => setHoveredSide('left')}
                onMouseLeave={() => setHoveredSide(null)}
            >
                <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] opacity-20" />

                <div className="relative z-10 max-w-md space-y-6">
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 }}
                        className="flex items-center gap-3 mb-4"
                    >
                        <div className="p-3 bg-primary/10 rounded-2xl">
                            <GraduationCap className="w-8 h-8 text-primary" />
                        </div>
                        <span className="text-sm font-bold tracking-wider uppercase opacity-60 text-primary">Academic Mode</span>
                    </motion.div>

                    <h2 className="text-5xl font-extrabold tracking-tight tight-heading">
                        Master Your <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-600">
                            Curriculum.
                        </span>
                    </h2>

                    <p className="text-lg text-zinc-600 leading-relaxed font-medium">
                        AI-generated study plans, weak area detection, and smart scheduling to ace your exams without the burnout.
                    </p>

                    <Button
                        onClick={() => router.push('/login')}
                        size="lg"
                        className="rounded-full bg-primary text-white hover:bg-blue-700 transition-all duration-300 shadow-xl shadow-primary/20 gap-2 pl-6 pr-6"
                    >
                        Start Learning <ArrowRight className="w-4 h-4" />
                    </Button>
                </div>

                {/* Floating Elements (Decorative) */}
                <motion.div
                    animate={{ y: [0, -10, 0] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute top-1/4 right-10 opacity-10 md:opacity-20 pointer-events-none"
                >
                    <BookOpen className="w-32 h-32" />
                </motion.div>
            </motion.div>


            {/* Right Side - Side Hustle */}
            <motion.div
                className="relative flex-1 bg-black text-white flex items-center justify-center p-8 overflow-hidden group"
                initial={{ flex: 1 }}
                animate={{
                    flex: hoveredSide === 'right' ? 2 : hoveredSide === 'left' ? 1 : 1,
                }}
                transition={{ duration: 0.5, ease: "easeInOut" }}
                onMouseEnter={() => setHoveredSide('right')}
                onMouseLeave={() => setHoveredSide(null)}
            >
                <div className="absolute inset-0 bg-[radial-gradient(#333_1px,transparent_1px)] [background-size:16px_16px] opacity-20" />

                <div className="relative z-10 max-w-md space-y-6">
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 }}
                        className="flex items-center gap-3 mb-4"
                    >
                        <div className="p-3 bg-[#a855f7]/10 rounded-2xl">
                            <Rocket className="w-8 h-8 text-[#a855f7]" />
                        </div>
                        <span className="text-sm font-bold tracking-wider uppercase opacity-60 text-[#a855f7]">Side Hustle Mode</span>
                    </motion.div>

                    <h2 className="text-5xl font-extrabold tracking-tight tight-heading">
                        Build Your <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#a855f7] to-pink-500">
                            Empire.
                        </span>
                    </h2>

                    <p className="text-lg text-zinc-400 leading-relaxed font-medium">
                        Turn skills into income. Generative roadmaps, project ideas, and gig-ready portfolio building.
                    </p>

                    <Button
                        onClick={() => router.push('/login')}
                        size="lg"
                        className="rounded-full bg-[#a855f7] text-white hover:bg-[#9333ea] transition-all duration-300 shadow-xl shadow-[#a855f7]/20 gap-2 pl-6 pr-6"
                    >
                        Start Building <Zap className="w-4 h-4" />
                    </Button>
                </div>

                {/* Floating Elements (Decorative) */}
                <motion.div
                    animate={{ y: [0, 10, 0] }}
                    transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute bottom-1/4 left-10 opacity-10 md:opacity-20 pointer-events-none"
                >
                    <Zap className="w-32 h-32" />
                </motion.div>
            </motion.div>



        </div>
    );
}
