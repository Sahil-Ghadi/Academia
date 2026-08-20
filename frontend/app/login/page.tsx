'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Bot, ArrowRight, Target, Flame, CheckCircle2, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { toast } from 'sonner';
import { API_BASE_URL } from '@/lib/api';

export default function LoginPage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);

    const handleGoogleSignIn = async () => {
        setIsLoading(true);
        try {
            const provider = new GoogleAuthProvider();
            const result = await signInWithPopup(auth, provider);
            const idToken = await result.user.getIdToken();

            const response = await fetch(`${API_BASE_URL}/auth/google/verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id_token: idToken }),
            });

            if (!response.ok) throw new Error('Authentication failed');
            const userData = await response.json();
            const profileResponse = await fetch(`${API_BASE_URL}/profile/${userData.uid}`);

            if (profileResponse.ok) {
                router.push('/dashboard');
            } else {
                router.push('/onboarding');
            }

            toast.success('Signed in successfully!');
        } catch (error: any) {
            console.error('Sign in error:', error);
            toast.error(error.message || 'Failed to sign in');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full lg:grid lg:grid-cols-2">
            {/* Left Side - Visual Showcase */}
            <div className="hidden lg:flex relative flex-col justify-between bg-zinc-950 p-12 text-white overflow-hidden">
                {/* Background Decor */}
                <div className="absolute inset-0 bg-[radial-gradient(#333_1px,transparent_1px)] [background-size:16px_16px] opacity-20" />
                <div className="absolute top-0 right-0 h-[500px] w-[500px] bg-primary/20 blur-[100px] rounded-full translate-x-1/2 -translate-y-1/2" />
                <div className="absolute bottom-0 left-0 h-[500px] w-[500px] bg-[#a855f7]/20 blur-[100px] rounded-full -translate-x-1/2 translate-y-1/2" />

                {/* Branding */}
                <div className="relative z-10 flex items-center gap-2 font-bold text-xl">
                    <Bot className="w-8 h-8 text-primary" />
                    <span>AdaptIQ</span>
                </div>

                {/* Central Visual */}
                <div className="relative z-10 flex flex-col items-center justify-center flex-1 gap-12">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="relative"
                    >
                        {/* Abstract Productivity Mockup */}
                        <div className="absolute inset-0 pointer-events-none">
                            {/* Top Left: Tasks */}
                            <motion.div
                                animate={{ y: [0, -15, 0], opacity: [0.6, 0.9, 0.6] }}
                                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                                className="absolute -top-16 -left-8 bg-zinc-900/60 backdrop-blur-xl border border-white/5 rounded-2xl p-4 shadow-[0_8px_32px_rgba(0,0,0,0.5)] flex items-center gap-4 w-60 rotate-[-4deg]"
                            >
                                <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                                </div>
                                <div className="flex flex-col gap-2 flex-1">
                                    <div className="h-2.5 w-3/4 bg-white/20 rounded-full" />
                                    <div className="h-2 w-1/2 bg-white/10 rounded-full" />
                                </div>
                            </motion.div>

                            {/* Center Right: Focus / Progress */}
                            <motion.div
                                animate={{ y: [0, 20, 0], opacity: [0.8, 1, 0.8] }}
                                transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                                className="absolute top-12 -right-20 bg-zinc-900/80 backdrop-blur-2xl border border-white/10 rounded-2xl p-5 shadow-[0_16px_48px_rgba(0,0,0,0.6)] flex flex-col gap-4 w-64 rotate-[2deg] z-10"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
                                            <Target className="w-5 h-5 text-primary" />
                                        </div>
                                        <div className="h-3 w-16 bg-white/20 rounded-full" />
                                    </div>
                                    <div className="px-2 py-1 rounded-md text-[10px] font-bold tracking-wider bg-primary/20 text-primary uppercase">85% done</div>
                                </div>
                                <div className="h-1.5 w-full bg-black/50 rounded-full overflow-hidden">
                                    <div className="h-full bg-gradient-to-r from-primary to-[#a855f7] w-[85%] rounded-full shadow-[0_0_10px_rgba(168,85,247,0.5)]" />
                                </div>
                            </motion.div>

                            {/* Bottom Left: Streaks / Habits */}
                            <motion.div
                                animate={{ y: [0, -10, 0], opacity: [0.5, 0.8, 0.5] }}
                                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 2.5 }}
                                className="absolute -bottom-20 left-4 bg-zinc-900/50 backdrop-blur-md border border-white/5 rounded-2xl p-4 shadow-[0_8px_24px_rgba(0,0,0,0.4)] flex items-center gap-3 w-52 rotate-[-1deg] z-0"
                            >
                                <div className="w-9 h-9 rounded-lg bg-[#a855f7]/10 flex items-center justify-center border border-[#a855f7]/20 shadow-[0_0_15px_rgba(168,85,247,0.2)]">
                                    <Flame className="w-4 h-4 text-[#a855f7]" />
                                </div>
                                <div className="flex flex-col gap-2 flex-1">
                                    <div className="h-2 w-full bg-white/15 rounded-full" />
                                    <div className="flex gap-1.5">
                                        <div className="h-1.5 w-1/4 bg-[#a855f7]/40 rounded-full" />
                                        <div className="h-1.5 w-1/4 bg-[#a855f7]/40 rounded-full" />
                                        <div className="h-1.5 w-1/4 bg-[#a855f7]/40 rounded-full" />
                                        <div className="h-1.5 w-1/4 bg-white/5 rounded-full" />
                                    </div>
                                </div>
                            </motion.div>
                        </div>

                        <div className="text-center space-y-4 max-w-md relative z-10 mt-16">
                            <h2 className="text-4xl font-extrabold tracking-tight tight-heading">
                                Master Your <br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-[#a855f7]">
                                    Workflow.
                                </span>
                            </h2>
                            <p className="text-zinc-400 leading-relaxed">
                                Your all-in-one productivity hub. Track assignments, build daily habits, and advance your career effortlessly.
                            </p>
                        </div>
                    </motion.div>
                </div>

                {/* Footer */}
                <div className="relative z-10 text-sm text-zinc-500">
                    © 2025 AdaptIQ
                </div>
            </div>

            {/* Right Side - Login Form */}
            <div className="flex items-center justify-center bg-background p-8 lg:p-16">
                <div className="w-full max-w-md space-y-10">
                    <div className="text-center space-y-4 lg:text-left">
                        <h1 className="text-4xl font-extrabold tracking-tight tight-heading">Welcome back</h1>
                        <p className="text-lg text-muted-foreground">
                            Sign in to access your dashboard, track deadlines, and crush your goals.
                        </p>
                    </div>

                    <div className="grid gap-4 mt-8">
                        <Button
                            variant="outline"
                            size="lg"
                            className="w-full relative h-14 rounded-xl border-border bg-card hover:bg-zinc-50 dark:hover:bg-zinc-900 hover:border-primary/50 text-foreground font-semibold shadow-sm transition-all duration-300"
                            onClick={handleGoogleSignIn}
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <span className="absolute left-5 top-1/2 -translate-y-1/2 flex h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                            ) : (
                                <svg className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5" viewBox="0 0 24 24">
                                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                </svg>
                            )}
                            Continue with Google
                        </Button>
                    </div>

                    <p className="px-8 text-center text-base text-muted-foreground">
                        <Button
                            variant="link"
                            className="hover:text-primary p-0 h-auto font-normal text-base"
                            onClick={() => router.push('/')}
                        >
                            <ArrowRight className="w-4 h-4 mr-1 rotate-180" /> Back to Home
                        </Button>
                    </p>
                </div>
            </div>
        </div>
    );
}
