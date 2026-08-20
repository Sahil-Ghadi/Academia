'use client';

import { motion } from 'framer-motion';
import { GraduationCap, Rocket } from 'lucide-react';
import { useMode } from '@/contexts/ModeContext';

export function ModeToggle() {
  const { mode, toggleMode } = useMode();
  const isAcademic = mode === 'academic';

  return (
    <div className="flex items-center gap-3">
      <motion.button
        onClick={toggleMode}
        className="relative flex h-12 w-64 items-center rounded-full border border-border bg-card p-1 shadow-soft"
        whileTap={{ scale: 0.98 }}
      >
        {/* Sliding indicator */}
        <motion.div
          className="absolute h-10 w-[calc(50%-4px)] rounded-full shadow-md"
          style={{
            background: 'linear-gradient(135deg, hsl(var(--mode-gradient-start)), hsl(var(--mode-gradient-end)))',
          }}
          animate={{
            x: isAcademic ? 2 : 'calc(100% + 4px)',
          }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        />

        {/* Academic option */}
        <div className="relative z-10 flex h-10 w-1/2 items-center justify-center gap-2">
          <GraduationCap
            className={`h-4 w-4 transition-colors duration-300 ${isAcademic ? 'text-primary-foreground' : 'text-muted-foreground'
              }`}
          />
          <span
            className={`text-sm font-medium transition-colors duration-300 ${isAcademic ? 'text-primary-foreground' : 'text-muted-foreground'
              }`}
          >
            Academic
          </span>
        </div>

        {/* Side Hustle option */}
        <div className="relative z-10 flex h-10 w-1/2 items-center justify-center gap-2">
          <Rocket
            className={`h-4 w-4 transition-colors duration-300 ${!isAcademic ? 'text-primary-foreground' : 'text-muted-foreground'
              }`}
          />
          <span
            className={`text-sm font-medium transition-colors duration-300 ${!isAcademic ? 'text-primary-foreground' : 'text-muted-foreground'
              }`}
          >
            Side Hustle
          </span>
        </div>
      </motion.button>
    </div>
  );
}
