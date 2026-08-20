"use client";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
import { GlowCard } from '@/components/ui/GlowCard';
import { Target } from 'lucide-react';
import { useMode } from '@/contexts/ModeContext';
import { useEffect, useState } from 'react';

interface MasteryRadarChartProps {
  data: { subject: string; elo: number; fullMark: number }[];
}

export function MasteryRadarChart({ data }: MasteryRadarChartProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Pad data if less than 3 topics to prevent Recharts from breaking the polygon rendering
  const displayData = data && data.length > 0
    ? (data.length < 3 ? [...data, { subject: 'Potential', elo: 1000, fullMark: 2000 }, { subject: 'Readiness', elo: 1000, fullMark: 2000 }] : data)
    : [];

  if (!mounted) return null;

  if (!displayData || displayData.length === 0) {
    return (
      <GlowCard className="w-full h-full min-h-[250px] flex flex-col items-center justify-center border-border bg-card">
        <div className="text-muted-foreground text-sm p-4 text-center">
          Not enough mastery data yet.<br/>Complete an assessment!
        </div>
      </GlowCard>
    );
  }

  return (
    <GlowCard className="w-full h-full flex flex-col overflow-hidden border-border bg-card">
      <div className="mb-2 flex items-center gap-2 px-1">
        <Target className="h-4 w-4 text-primary" />
        <h3 className="font-heading text-base font-bold text-foreground">Topic Mastery Radar</h3>
      </div>
      <div className="flex-1 w-full min-h-0 relative -mt-4">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="70%" data={displayData}>
            <PolarGrid stroke="hsl(var(--border))" />
            <PolarAngleAxis 
              dataKey="subject" 
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10, fontWeight: 600 }} 
            />
            <PolarRadiusAxis angle={30} domain={[800, 2000]} tick={false} axisLine={false} />
            <Radar
              name="Elo Rating"
              dataKey="elo"
              stroke="hsl(var(--primary))"
              fill="hsl(var(--primary))"
              fillOpacity={0.3}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </GlowCard>
  );
}
