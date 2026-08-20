"use client";
import { Brain, TrendingUp, TrendingDown } from "lucide-react";
import { GlowCard } from "@/components/ui/GlowCard";

interface DifficultyMeterProps {
  level: number; // 1 to 5
  previousLevel?: number;
  feedback?: string;
}

export function DifficultyMeter({ level, previousLevel, feedback }: DifficultyMeterProps) {
  const isLevelingUp = previousLevel && level > previousLevel;
  const isLevelingDown = previousLevel && level < previousLevel;

  return (
    <GlowCard className="p-4 mb-4 flex flex-col gap-3">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-primary" />
          <h4 className="text-foreground font-bold">Adaptive Challenge Level</h4>
        </div>
        <div className="flex items-center gap-2">
          {isLevelingUp && <TrendingUp className="w-5 h-5 text-emerald-500 animate-bounce" />}
          {isLevelingDown && <TrendingDown className="w-5 h-5 text-rose-500" />}
          <span className="text-2xl font-black text-foreground">Lvl {level}</span>
        </div>
      </div>
      
      {/* Progress Bar blocks */}
      <div className="flex gap-1 h-3 w-full mt-2">
        {[1, 2, 3, 4, 5].map((step) => {
          let bgColor = "bg-muted";
          if (step <= level) {
            // Gradient effect depending on level
            if (step === 1) bgColor = "bg-emerald-500";
            if (step === 2) bgColor = "bg-emerald-400";
            if (step === 3) bgColor = "bg-yellow-400";
            if (step === 4) bgColor = "bg-orange-500";
            if (step === 5) bgColor = "bg-rose-500";
          }
          return (
            <div 
              key={step} 
              className={`flex-1 rounded-sm ${bgColor} transition-colors duration-500 shadow-inner`} 
            />
          );
        })}
      </div>
      
      {feedback && (
        <div className="mt-3 text-sm text-muted-foreground border-l-2 border-primary pl-3 bg-muted/50 p-2 rounded-r-lg italic">
          "{feedback}"
        </div>
      )}
    </GlowCard>
  );
}
