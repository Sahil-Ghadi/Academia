'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, GraduationCap, BookOpen, ChevronRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMode } from '@/contexts/ModeContext';
import { useGamification } from '@/contexts/GamificationContext';
import { toast } from 'sonner';
import { API_BASE_URL } from '@/lib/api';
import { cn } from '@/lib/utils';

interface AddExamModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export function AddExamModal({ isOpen, onClose, onSuccess }: AddExamModalProps) {
    const { user, userProfile } = useMode();
    const { awardXP } = useGamification();
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({ subject: '', title: '', date: '', syllabus: '' });

    const subjects = userProfile?.academicSubjects || [];

    const handleSubmit = async () => {
        if (!formData.subject || !formData.date || !formData.title) {
            toast.error("Please fill in all required fields");
            return;
        }
        setIsLoading(true);
        try {
            const syllabusList = formData.syllabus
                .split(/[\n,]/)
                .map(s => s.trim())
                .filter(s => s.length > 0)
                .map(s => ({ name: s, completed: false }));

            const response = await fetch(`${API_BASE_URL}/exams/create`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ uid: user?.uid, subject: formData.subject, title: formData.title, date: formData.date, syllabus: syllabusList })
            });

            if (!response.ok) throw new Error('Failed to create exam');
            toast.success('Exam added!');
            awardXP('exam_created');
            onSuccess();
            onClose();
            setFormData({ subject: '', title: '', date: '', syllabus: '' });
        } catch (error) {
            toast.error('Failed to add exam');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-background/70 backdrop-blur-md"
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.96, y: 8 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.96, y: 8 }}
                        transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
                        className="relative w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
                    >
                        {/* Top accent */}
                        <div className="h-1 w-full bg-gradient-to-r from-primary via-violet-500 to-blue-500" />

                        {/* Header */}
                        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-border">
                            <div className="flex items-center gap-3">
                                <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                                    <GraduationCap className="h-4.5 w-4.5 text-primary" />
                                </div>
                                <div>
                                    <h2 className="font-bold text-base text-foreground leading-none">Add New Exam</h2>
                                    <p className="text-[11px] text-muted-foreground mt-0.5">Track your prep &amp; deadlines</p>
                                </div>
                            </div>
                            <button onClick={onClose} className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        {/* Form */}
                        <div className="px-6 py-5 space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Subject</Label>
                                    <Select value={formData.subject} onValueChange={(val) => setFormData({ ...formData, subject: val })}>
                                        <SelectTrigger className="h-10 bg-muted/50 border-border text-sm">
                                            <SelectValue placeholder="Pick subject" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {subjects.length === 0 && <SelectItem value="General">General</SelectItem>}
                                            {subjects.map(sub => (
                                                <SelectItem key={sub} value={sub}>{sub}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Exam Date</Label>
                                    <div className="relative">
                                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                                        <Input
                                            type="date"
                                            value={formData.date}
                                            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                            className="h-10 bg-muted/50 border-border pl-8 text-sm"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Exam Title</Label>
                                <Input
                                    placeholder="e.g. Mid-Term, Finals, Unit Test 1"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    className="h-10 bg-muted/50 border-border text-sm"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Syllabus Topics</Label>
                                    <span className="text-[10px] text-muted-foreground">Comma or newline separated</span>
                                </div>
                                <Textarea
                                    placeholder="Algebra, Calculus, Trigonometry..."
                                    value={formData.syllabus}
                                    onChange={(e) => setFormData({ ...formData, syllabus: e.target.value })}
                                    className="resize-none bg-muted/50 border-border text-sm h-24"
                                />
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="px-6 pb-5 flex gap-2">
                            <Button variant="outline" onClick={onClose} className="flex-1 h-10 rounded-xl font-semibold text-sm border-border">
                                Cancel
                            </Button>
                            <Button onClick={handleSubmit} disabled={isLoading} className="flex-[2] h-10 rounded-xl font-bold text-sm gap-2">
                                {isLoading ? (
                                    <><Loader2 className="h-4 w-4 animate-spin" /> Adding...</>
                                ) : (
                                    <><ChevronRight className="h-4 w-4" /> Add to Schedule</>
                                )}
                            </Button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
