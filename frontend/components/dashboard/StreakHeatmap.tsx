'use client';

import { motion } from 'framer-motion';
import { useMemo } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Flame } from 'lucide-react';

interface StreakHeatmapProps {
    data: { date: string; count: number }[];
}

export function StreakHeatmap({ data }: StreakHeatmapProps) {
    // Generate current month data (Calendar View)
    const calendarData = useMemo(() => {
        const today = new Date();
        const year = today.getFullYear();
        const month = today.getMonth(); // 0-indexed

        // First day of the month
        const firstDay = new Date(year, month, 1);
        // Last day of the month
        const lastDay = new Date(year, month + 1, 0);

        const daysInMonth = lastDay.getDate();
        const startDayOfWeek = firstDay.getDay(); // 0 (Sun) - 6 (Sat)

        // Create a map for faster lookup
        const dataMap = new Map(data.map(d => [d.date, d.count]));

        const days = [];

        // Add padding for previous month days (empty cells)
        for (let i = 0; i < startDayOfWeek; i++) {
            days.push(null);
        }

        // Add actual days
        for (let i = 1; i <= daysInMonth; i++) {
            const d = new Date(year, month, i);
            // Adjust for timezone offset to compare correctly with server date strings (usually YYYY-MM-DD)
            const monthStr = (month + 1).toString().padStart(2, '0');
            const dayStr = i.toString().padStart(2, '0');
            const dateStr = `${year}-${monthStr}-${dayStr}`;

            const count = dataMap.get(dateStr) || 0;

            days.push({
                date: dateStr,
                day: i,
                count: count,
                level: count === 0 ? 0 : count <= 1 ? 1 : count <= 2 ? 2 : count <= 4 ? 3 : 4
            });
        }

        return days;
    }, [data]);

    // Filter data for current month only for total count
    const currentMonthTotal = useMemo(() => {
        const now = new Date();
        const currentMonthPrefix = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
        return data
            .filter(d => d.date.startsWith(currentMonthPrefix))
            .reduce((acc, curr) => acc + curr.count, 0);
    }, [data]);

    // Color map for levels
    const colors = [
        'bg-zinc-800/50',        // Level 0 (None)
        'bg-emerald-900/40',     // Level 1
        'bg-emerald-700/60',     // Level 2
        'bg-emerald-500/80',     // Level 3
        'bg-emerald-400'         // Level 4 (Max)
    ];

    const monthName = new Date().toLocaleString('default', { month: 'long' });

    return (
        <div className="rounded-xl border border-border bg-mode-surface-elevated p-6 h-full flex flex-col">
            <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Flame className="h-5 w-5 text-orange-500" />
                    <div className="flex flex-col">
                        <h2 className="font-heading text-xl font-bold">Daily Streak</h2>
                        <span className="text-xs text-muted-foreground">{monthName} Activity</span>
                    </div>
                </div>
                <div className="text-right">
                    <span className="block text-2xl font-bold text-primary">{currentMonthTotal}</span>
                    <span className="text-xs text-muted-foreground">This Month</span>
                </div>
            </div>

            <div className="grid grid-cols-7 gap-2 flex-1">
                {/* Day Headers */}
                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                    <div key={day} className="text-center text-[10px] text-zinc-500 font-medium pb-2">
                        {day}
                    </div>
                ))}

                {/* Calendar Grid */}
                {calendarData.map((dayData, index) => {
                    if (!dayData) {
                        return <div key={`empty-${index}`} className="aspect-square" />;
                    }

                    return (
                        <TooltipProvider key={dayData.date}>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        transition={{ delay: index * 0.01 }}
                                        className={`aspect-square rounded-md ${colors[dayData.level]} hover:ring-2 hover:ring-white/20 transition-all cursor-default flex items-center justify-center`}
                                    >
                                        {dayData.count > 0 && (
                                            <span className="text-[10px] text-emerald-100 font-bold">{dayData.count}</span>
                                        )}
                                    </motion.div>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p className="text-xs font-medium">
                                        {dayData.count} activities on {dayData.date}
                                    </p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    );
                })}
            </div>

        </div>
    );
}
