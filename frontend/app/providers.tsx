'use client';

import { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ModeProvider } from '@/contexts/ModeContext';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { ChatBot } from '@/components/ChatBot';

const queryClient = new QueryClient();

export function Providers({ children }: { children: ReactNode }) {
    return (
        <QueryClientProvider client={queryClient}>
            <TooltipProvider>
                <ModeProvider>
                    <Toaster />
                    <Sonner />
                    {children}
                    <ChatBot />
                </ModeProvider>
            </TooltipProvider>
        </QueryClientProvider>
    );
}
