'use client';

import { motion } from 'framer-motion';
import { Calendar as CalendarIcon, Clock, ChevronLeft, ChevronRight, BookOpen, Coffee, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';

// Types matching the Backend response
export interface Task {
    time: string;
    task: string;
    type: 'study' | 'break' | 'other';
    subject?: string;
    duration: number;
}

export interface DaySchedule {
    day: string;
    date: string;
    slots: Task[];
}

interface PlannerCalendarProps {
    scheduleData: DaySchedule[] | null;
    viewMode: 'daily' | 'weekly';
}

export function PlannerCalendar({ scheduleData, viewMode }: PlannerCalendarProps) {
    const [selectedDateIndex, setSelectedDateIndex] = useState(0);

    if (!scheduleData || scheduleData.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 bg-card rounded-[2rem] border border-border h-[440px]">
                <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center mb-4">
                    <CalendarIcon className="h-10 w-10 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2">No Schedule Generated</h3>
                <p className="text-muted-foreground text-sm max-w-md text-center">
                    Configure your preferences in settings to generate your first AI-optimized study plan.
                </p>
            </div>
        );
    }

    // Reusable Day Card Component
    const DayCard = ({ dayData, showNavigation = true }: { dayData: DaySchedule, showNavigation?: boolean }) => (
        <div className="bg-card rounded-[2rem] border border-border overflow-hidden h-full flex flex-col min-w-[350px]">
            {/* Header */}
            <div className="p-6 border-b border-border flex items-center justify-between shrink-0">
                <div>
                    <h3 className="text-2xl font-bold text-foreground font-heading">{dayData.day}</h3>
                    <p className="text-muted-foreground text-sm">{dayData.date}</p>
                </div>
                {showNavigation && (
                    <div className="flex gap-2">
                        <button
                            disabled={selectedDateIndex === 0}
                            onClick={() => setSelectedDateIndex(prev => prev - 1)}
                            className="p-2 rounded-xl bg-muted hover:bg-muted/80 disabled:opacity-30 disabled:hover:bg-muted text-foreground transition-all"
                        >
                            <ChevronLeft className="h-5 w-5" />
                        </button>
                        <button
                            disabled={selectedDateIndex === (scheduleData?.length || 0) - 1}
                            onClick={() => setSelectedDateIndex(prev => prev + 1)}
                            className="p-2 rounded-xl bg-muted hover:bg-muted/80 disabled:opacity-30 disabled:hover:bg-muted text-foreground transition-all"
                        >
                            <ChevronRight className="h-5 w-5" />
                        </button>
                    </div>
                )}
            </div>

            {/* Timeline */}
            <div className="p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1">
                {dayData.slots.map((slot, idx) => {
                    const isCurrent = (() => {
                        const now = new Date();
                        const [start, end] = slot.time.split('-');
                        const [startH, startM] = start.split(':').map(Number);
                        const [endH, endM] = end.split(':').map(Number);

                        // Check if today matches the scheduled date
                        const schedDate = new Date(dayData.date);
                        const isSameDay = now.toDateString() === schedDate.toDateString();

                        // For logic, we assume the schedule is for "today" relative to the view, 
                        // but if we want to validly highlight, better ensure it matches calendar date.
                        if (!isSameDay) return false;

                        const startTime = new Date(now);
                        startTime.setHours(startH, startM, 0);
                        const endTime = new Date(now);
                        endTime.setHours(endH, endM, 0);

                        return now >= startTime && now <= endTime;
                    })();

                    return (
                        <motion.div
                            key={idx}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            className="flex gap-4 group"
                        >
                            {/* Time Column */}
                            <div className="w-16 flex-shrink-0 pt-2">
                                <span className={cn(
                                    "text-xs font-bold",
                                    isCurrent ? "text-primary" : "text-muted-foreground"
                                )}>{slot.time.split('-')[0]}</span>
                            </div>

                            {/* Card */}
                            <div className={cn(
                                "flex-1 rounded-2xl p-4 border transition-all hover:scale-[1.01]",
                                isCurrent ? "ring-2 ring-primary shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)] bg-primary/10 border-primary" : "",
                                !isCurrent && slot.type === 'study' ? "bg-primary/5 border-primary/20 hover:border-primary/40" : "",
                                !isCurrent && slot.type === 'break' ? "bg-accent/5 border-accent/20 hover:border-accent/40" : "",
                                !isCurrent && slot.type === 'other' ? "bg-muted/50 border-border hover:border-border/80" : ""
                            )}>
                                <div className="flex items-start justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        {slot.type === 'study' && <BookOpen className="h-4 w-4 text-primary" />}
                                        {slot.type === 'break' && <Coffee className="h-4 w-4 text-accent" />}
                                        {slot.type === 'other' && <Clock className="h-4 w-4 text-muted-foreground" />}
                                        <span className={cn(
                                            "text-xs font-bold uppercase tracking-wider",
                                            slot.type === 'study' ? "text-primary" :
                                                slot.type === 'break' ? "text-accent" : "text-muted-foreground"
                                        )}>
                                            {slot.type}
                                            {isCurrent && <span className="ml-2 animate-pulse text-[10px] bg-primary text-white px-1.5 py-0.5 rounded-full">NOW</span>}
                                        </span>
                                    </div>
                                    <span className="text-xs font-medium text-muted-foreground">{slot.duration} mins</span>
                                </div>
                                <h4 className="text-base font-bold text-foreground mb-1">{slot.task}</h4>
                                {slot.subject && (
                                    <p className="text-sm text-muted-foreground">{slot.subject}</p>
                                )}
                            </div>
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );

    // Daily View Component
    const DailyView = () => {
        const dayData = scheduleData[selectedDateIndex];
        if (!dayData) return null;

        return <DayCard dayData={dayData} showNavigation={true} />;
    }

    // Scrollable Weekly View
    const WeeklyView = () => {
        return (
            <div className="flex gap-6 overflow-x-auto pb-6 -mx-1 px-1 custom-scrollbar snap-x">
                {scheduleData.map((day, idx) => (
                    <div key={idx} className="snap-center shrink-0 h-[600px]">
                        <DayCard dayData={day} showNavigation={false} />
                    </div>
                ))}
            </div>
        )
    }

    return (
        <div className="animate-in fade-in duration-500 h-full">
            {viewMode === 'daily' ? <DailyView /> : <WeeklyView />}
        </div>
    );
}
