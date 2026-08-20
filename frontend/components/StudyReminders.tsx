'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Bell,
    Clock,
    CheckCircle2,
    Trash2,
    Plus,
    X,
    AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface Reminder {
    id: string;
    subject: string;
    topic: string;
    dueTime: Date;
    priority: 'high' | 'medium' | 'low';
    completed: boolean;
}

// Sample reminders for demo
const sampleReminders: Reminder[] = [
];

const priorityColors = {
    high: 'border-l-destructive bg-destructive/5',
    medium: 'border-l-accent bg-accent/5',
    low: 'border-l-muted-foreground bg-muted/30',
};

const priorityBadgeColors = {
    high: 'bg-destructive/20 text-destructive',
    medium: 'bg-accent/20 text-accent',
    low: 'bg-muted text-muted-foreground',
};

export function StudyReminders() {
    const [reminders, setReminders] = useState<Reminder[]>(sampleReminders);
    const [showAddForm, setShowAddForm] = useState(false);
    const [newReminder, setNewReminder] = useState({
        subject: '',
        topic: '',
        priority: 'medium' as 'high' | 'medium' | 'low',
    });

    const formatTimeUntil = (date: Date) => {
        const now = new Date();
        const diff = date.getTime() - now.getTime();
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        }
        return `${minutes}m`;
    };

    const completeReminder = (id: string) => {
        setReminders(prev =>
            prev.map(r => (r.id === id ? { ...r, completed: true } : r))
        );
        // Remove after animation
        setTimeout(() => {
            setReminders(prev => prev.filter(r => r.id !== id));
        }, 500);
    };

    const deleteReminder = (id: string) => {
        setReminders(prev => prev.filter(r => r.id !== id));
    };

    const addReminder = () => {
        if (!newReminder.subject || !newReminder.topic) return;

        const reminder: Reminder = {
            id: Date.now().toString(),
            subject: newReminder.subject,
            topic: newReminder.topic,
            dueTime: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
            priority: newReminder.priority,
            completed: false,
        };

        setReminders(prev => [reminder, ...prev]);
        setNewReminder({ subject: '', topic: '', priority: 'medium' });
        setShowAddForm(false);
    };

    const activeReminders = reminders.filter(r => !r.completed);

    return (
        <div className="rounded-xl border border-border bg-card p-6 shadow-soft">
            {/* Header */}
            <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="icon-container">
                        <Bell className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <h3 className="font-heading font-bold">Study Reminders</h3>
                        <p className="text-xs text-muted-foreground">{activeReminders.length} pending</p>
                    </div>
                </div>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowAddForm(!showAddForm)}
                    className={cn(showAddForm && 'bg-muted')}
                >
                    {showAddForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                </Button>
            </div>

            {/* Add Form */}
            <AnimatePresence>
                {showAddForm && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="mb-4 space-y-3 rounded-lg border border-border bg-muted/30 p-4">
                            <div className="space-y-2">
                                <Label htmlFor="subject" className="text-xs">Subject</Label>
                                <Input
                                    id="subject"
                                    placeholder="e.g., Physics"
                                    value={newReminder.subject}
                                    onChange={(e) => setNewReminder(prev => ({ ...prev, subject: e.target.value }))}
                                    className="h-8 text-sm"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="topic" className="text-xs">Task</Label>
                                <Input
                                    id="topic"
                                    placeholder="e.g., Complete practice problems"
                                    value={newReminder.topic}
                                    onChange={(e) => setNewReminder(prev => ({ ...prev, topic: e.target.value }))}
                                    className="h-8 text-sm"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs">Priority</Label>
                                <div className="flex gap-2">
                                    {(['high', 'medium', 'low'] as const).map((p) => (
                                        <button
                                            key={p}
                                            onClick={() => setNewReminder(prev => ({ ...prev, priority: p }))}
                                            className={cn(
                                                'flex-1 rounded-md py-1.5 text-xs font-medium capitalize transition-colors',
                                                newReminder.priority === p
                                                    ? priorityBadgeColors[p]
                                                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                                            )}
                                        >
                                            {p}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <Button onClick={addReminder} size="sm" className="w-full">
                                Add Reminder
                            </Button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Reminders List */}
            <div className="space-y-2">
                <AnimatePresence mode="popLayout">
                    {activeReminders.length === 0 ? (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="py-8 text-center"
                        >
                            <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-accent" />
                            <p className="text-sm text-muted-foreground">All caught up! 🎉</p>
                        </motion.div>
                    ) : (
                        activeReminders.map((reminder, index) => (
                            <motion.div
                                key={reminder.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20, scale: 0.95 }}
                                transition={{ delay: index * 0.05 }}
                                className={cn(
                                    'group flex items-start gap-3 rounded-lg border-l-4 p-3 transition-all',
                                    priorityColors[reminder.priority]
                                )}
                            >
                                <button
                                    onClick={() => completeReminder(reminder.id)}
                                    className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-muted-foreground/30 hover:border-accent hover:bg-accent/20 transition-colors"
                                >
                                    <CheckCircle2 className="h-3 w-3 text-transparent group-hover:text-accent transition-colors" />
                                </button>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-medium">{reminder.subject}</span>
                                        <span className={cn(
                                            'rounded-full px-1.5 py-0.5 text-[10px] font-medium capitalize',
                                            priorityBadgeColors[reminder.priority]
                                        )}>
                                            {reminder.priority}
                                        </span>
                                    </div>
                                    <p className="text-xs text-muted-foreground truncate">{reminder.topic}</p>
                                    <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                                        <Clock className="h-3 w-3" />
                                        <span>Due in {formatTimeUntil(reminder.dueTime)}</span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => deleteReminder(reminder.id)}
                                    className="shrink-0 rounded p-1 text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-all"
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                </button>
                            </motion.div>
                        ))
                    )}
                </AnimatePresence>
            </div>

            {/* Urgent Alert */}
            {activeReminders.some(r => r.priority === 'high') && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3"
                >
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                    <span className="text-xs text-destructive">
                        You have {activeReminders.filter(r => r.priority === 'high').length} high-priority task(s)
                    </span>
                </motion.div>
            )}
        </div>
    );
}
