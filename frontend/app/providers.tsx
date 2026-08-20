'use client';

import { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ModeProvider } from '@/contexts/ModeContext';
import { GamificationProvider } from '@/contexts/GamificationContext';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { ChatBot } from '@/components/ChatBot';
import { GamificationOverlay } from '@/components/GamificationOverlay';

const queryClient = new QueryClient();

export function Providers({ children }: { children: ReactNode }) {
    return (
        <QueryClientProvider client={queryClient}>
            <TooltipProvider>
                <ModeProvider>
                    <GamificationProvider>
                        <Toaster />
                        <Sonner />
                        {children}
                        <ChatBot />
                        <GamificationOverlay />
                    </GamificationProvider>
                </ModeProvider>
            </TooltipProvider>
        </QueryClientProvider>
    );
}
