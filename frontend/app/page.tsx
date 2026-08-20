'use client';

import { SplitHero } from '@/components/landing/SplitHero';
import { FeatureBento } from '@/components/landing/FeatureBento';
import { Bot } from 'lucide-react';

export default function Home() {
  return (
    <main className="min-h-screen bg-black selection:bg-white selection:text-black">

      {/* Navbar Placeholder - Minimal */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 mix-blend-difference text-white pointer-events-none">
        <div className="flex items-center gap-2 font-bold text-xl pointer-events-auto">
          <Bot className="w-6 h-6" />
          <span>AdaptIQ</span>
        </div>
        {/* Actions could go here */}
      </nav>

      <SplitHero />
      <FeatureBento />

    </main>
  );
}
