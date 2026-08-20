'use client';

import { useState, useRef, useEffect } from 'react';
import { MarkdownRenderer } from '@/components/ui/MarkdownRenderer';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import {
    MessageCircle,
    X,
    Send,
    Bot,
    User,
    Sparkles,
    Calendar,
    BookOpen,
    Target,
    Clock,
    Zap,
    Mic,
    MicOff,
    Volume2,
    VolumeX
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useMode } from '@/contexts/ModeContext';
import { API_BASE_URL } from '@/lib/api';
import { toast } from 'sonner';
import { usePathname } from 'next/navigation';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

// Suggested prompts for quick actions
const quickPrompts = [
    { icon: Calendar, text: "What's my schedule today?", category: 'schedule' },
    { icon: BookOpen, text: "Show my syllabus progress", category: 'syllabus' },
    { icon: Target, text: "What are my upcoming deadlines?", category: 'deadlines' },
    { icon: Clock, text: "How much study time today?", category: 'time' },
];

export function ChatBot() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const recognitionRef = useRef<any>(null);
    const historyFetched = useRef(false);
    const [isTTSEnabled, setIsTTSEnabled] = useState(false);
    const { mode, userProfile, user } = useMode();
    const pathname = usePathname();

    // Only show in academic mode on dashboard and insights pages
    const ALLOWED_PATHS = ['/dashboard', '/insights'];
    const isAllowed = mode === 'academic' && ALLOWED_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'));

    const speak = (text: string) => {
        if (!isTTSEnabled || typeof window === 'undefined' || !window.speechSynthesis) return;
        // Strip markdown so it sounds natural
        const clean = text
            .replace(/[*_`#>~]/g, '')
            .replace(/\[(.*?)\]\(.*?\)/g, '$1')
            .trim();
        window.speechSynthesis.cancel(); // stop any current speech
        const utterance = new SpeechSynthesisUtterance(clean);
        utterance.rate = 1.05;
        utterance.pitch = 1;
        // Prefer feminine voices across platforms
        const voices = window.speechSynthesis.getVoices();
        const feminineVoice = voices.find(v =>
            // Chrome / Brave - Google voices
            v.name === 'Google UK English Female' ||
            v.name === 'Google US English Female' ||
            // Windows voices
            v.name.includes('Zira') ||
            v.name.includes('Aria') ||
            v.name.includes('Jenny') ||
            v.name.includes('Natasha') ||
            // macOS / iOS voices
            v.name.includes('Samantha') ||
            v.name.includes('Karen') ||
            v.name.includes('Moira') ||
            v.name.includes('Tessa') ||
            v.name.includes('Fiona') ||
            // Generic fallback
            v.name.toLowerCase().includes('female')
        );
        if (feminineVoice) utterance.voice = feminineVoice;
        window.speechSynthesis.speak(utterance);
    };

    const handleToggleRecording = () => {
        const SpeechRecognition =
            (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

        if (!SpeechRecognition) {
            toast.error('Voice input is not supported in this browser. Please try Chrome, Edge, or Brave.');
            return;
        }

        if (isRecording) {
            recognitionRef.current?.stop();
            setIsRecording(false);
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.lang = 'en-US';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;
        recognitionRef.current = recognition;

        recognition.onstart = () => setIsRecording(true);
        recognition.onend = () => setIsRecording(false);

        recognition.onerror = (event: any) => {
            setIsRecording(false);
            switch (event.error) {
                case 'not-allowed':
                case 'permission-denied':
                    toast.error('Microphone access denied. Please allow mic permissions in your browser settings.');
                    break;
                case 'network':
                    toast.error('Network error. Check your internet connection and try again.');
                    break;
                case 'no-speech':
                    toast.info('No speech detected. Please try again.');
                    break;
                case 'aborted':
                    break; // user stopped it manually, no toast needed
                default:
                    toast.error(`Voice input error: ${event.error}. Try again.`);
            }
        };

        recognition.onresult = (event: any) => {
            const transcript = event.results[0][0].transcript;
            setInputValue(transcript);
            if (inputRef.current) inputRef.current.focus();
        };

        try {
            recognition.start();
        } catch (e) {
            toast.error('Could not start voice input. Please try again.');
            setIsRecording(false);
        }
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen]);

    // Load history from Firestore when chat opens (only once per session)
    useEffect(() => {
        if (!isOpen || historyFetched.current || !user?.uid) return;
        historyFetched.current = true;

        const loadHistory = async () => {
            setIsLoadingHistory(true);
            try {
                const res = await fetch(`${API_BASE_URL}/chat/history/${user.uid}`);
                if (!res.ok) throw new Error('Failed to load history');
                const data = await res.json();

                if (data.messages && data.messages.length > 0) {
                    const restored: Message[] = data.messages.map((m: any, i: number) => ({
                        id: `history-${i}`,
                        role: m.role === 'human' ? 'user' : 'assistant',
                        content: m.content,
                        timestamp: new Date(m.ts),
                    }));
                    setMessages(restored);
                } else {
                    // No history — show welcome
                    setMessages([{
                        id: 'welcome',
                        role: 'assistant',
                        content: `Hey ${userProfile?.name || 'there'}! 👋 I'm your AI Learning Assistant. I'm here to help you stay on track with your ${mode === 'academic' ? 'academics' : 'skill-building journey'}!\n\nTry asking me:\n• "What's my schedule today?"\n• "Show my upcoming deadlines"\n• "How's my progress?"`,
                        timestamp: new Date(),
                    }]);
                }
            } catch {
                // On error, just show welcome
                setMessages([{
                    id: 'welcome',
                    role: 'assistant',
                    content: `Hey ${userProfile?.name || 'there'}! 👋 I'm your AI Learning Assistant.`,
                    timestamp: new Date(),
                }]);
            } finally {
                setIsLoadingHistory(false);
            }
        };

        loadHistory();
    }, [isOpen, user?.uid, userProfile?.name, mode]);

    const handleSendMessage = async (content: string) => {
        if (!content.trim()) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: content.trim(),
            timestamp: new Date(),
        };

        setMessages(prev => [...prev, userMessage]);
        setInputValue('');
        setIsTyping(true);

        try {
            const response = await fetch(`${API_BASE_URL}/chat/message`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: content,
                    uid: user?.uid || 'anonymous',
                    mode: mode,
                    user_name: userProfile?.name || 'Student',
                    session_id: 'default',
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to get response');
            }

            const data = await response.json();

            const assistantMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: data.response,
                timestamp: new Date(),
            };

            setMessages(prev => [...prev, assistantMessage]);
            speak(data.response);
        } catch (error) {
            console.error('Chat Error:', error);
            const errorMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: "Sorry, I'm having trouble connecting to my brain right now. Please try again in a moment.",
                timestamp: new Date(),
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsTyping(false);
        }
    };

    const handleQuickPrompt = (prompt: string) => {
        handleSendMessage(prompt);
    };

    const isAcademic = mode === 'academic';

    // Gate: only render on allowed pages in academic mode
    if (!isAllowed) return null;

    // Animation Variants
    const containerVariants: Variants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { duration: 0.3, ease: "easeOut" }
        },
        exit: {
            opacity: 0,
            transition: { duration: 0.2, ease: "easeIn" }
        }
    };

    const messageVariants = {
        hidden: { opacity: 0, y: 10, scale: 0.98 },
        visible: { opacity: 1, y: 0, scale: 1 }
    };

    return (
        <>
            {/* Floating Chat Button */}
            <AnimatePresence>
                {!isOpen && (
                    <motion.button
                        layoutId="chat-fab"
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        whileHover={{ scale: 1.05, boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)" }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setIsOpen(true)}
                        className={cn(
                            "fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full shadow-xl transition-all duration-300 backdrop-blur-sm",
                            isAcademic ? "bg-blue-600 shadow-blue-500/30 hover:bg-blue-700" : ""
                        )}
                        style={!isAcademic ? {
                            background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)))',
                            boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)'
                        } : {}}
                    >
                        <MessageCircle className="h-6 w-6 text-white" />
                        <span className="absolute -right-1 -top-1 flex h-3.5 w-3.5">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-40" />
                            <span className={cn(
                                "relative inline-flex h-3.5 w-3.5 rounded-full border-2 border-white",
                                isAcademic ? "bg-green-400" : "bg-[#4ADE80] dark:border-zinc-900"
                            )} />
                        </span>
                    </motion.button>
                )}
            </AnimatePresence>

            {/* Chat Window */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        layoutId="chat-fab"
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        className={cn(
                            "fixed bottom-6 right-6 z-50 flex h-[650px] w-[400px] flex-col overflow-hidden rounded-3xl shadow-2xl backdrop-blur-xl",
                            isAcademic
                                ? "bg-white/95 border border-blue-100 shadow-blue-900/10"
                                : "border border-white/20 bg-background/80 dark:bg-zinc-900/80 dark:border-white/10"
                        )}
                        style={!isAcademic ? {
                            boxShadow: '0 20px 50px -12px rgba(0, 0, 0, 0.25)'
                        } : {}}
                    >
                        {/* Header */}
                        <div className={cn(
                            "relative flex items-center justify-between border-b p-5 backdrop-blur-md",
                            isAcademic
                                ? "bg-blue-600 border-blue-500/30"
                                : "border-white/10 bg-gradient-to-r from-primary/10 to-accent/5"
                        )}>
                            <div className="flex items-center gap-3.5">
                                <div className={cn(
                                    "relative flex h-10 w-10 items-center justify-center rounded-xl shadow-lg",
                                    isAcademic ? "bg-white/20" : "bg-gradient-to-br from-primary to-accent"
                                )}>
                                    <Bot className="h-5 w-5 text-white" />
                                    <span className={cn(
                                        "absolute -bottom-1 -right-1 h-3 w-3 rounded-full border-2",
                                        isAcademic ? "border-blue-600 bg-green-400" : "border-white bg-[#4ADE80] dark:border-zinc-900"
                                    )} />
                                </div>
                                <div>
                                    <h3 className={cn("font-heading text-base font-bold", isAcademic ? "text-white" : "text-foreground")}>
                                        AI Assistant
                                    </h3>
                                    <p className={cn(
                                        "text-xs flex items-center gap-1.5",
                                        isAcademic ? "text-blue-100" : "text-muted-foreground"
                                    )}>
                                        <span className={cn(
                                            "inline-block h-1.5 w-1.5 rounded-full animate-pulse",
                                            isAcademic ? "bg-green-400" : "bg-[#4ADE80]"
                                        )} />
                                        Online & Ready
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-1">
                                {/* TTS Toggle */}
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => {
                                        if (isTTSEnabled) window.speechSynthesis?.cancel();
                                        setIsTTSEnabled(v => !v);
                                    }}
                                    title={isTTSEnabled ? 'Mute bot voice' : 'Enable bot voice'}
                                    className={cn(
                                        "rounded-full p-2 transition-colors",
                                        isTTSEnabled
                                            ? isAcademic
                                                ? "bg-white/20 text-white"
                                                : "bg-primary/20 text-primary"
                                            : isAcademic
                                                ? "text-blue-200 hover:bg-white/10 hover:text-white"
                                                : "text-muted-foreground hover:bg-black/5 hover:text-foreground dark:hover:bg-white/10"
                                    )}
                                >
                                    {isTTSEnabled
                                        ? <Volume2 className="h-4 w-4" />
                                        : <VolumeX className="h-4 w-4" />}
                                </motion.button>
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className={cn(
                                        "rounded-full p-2 transition-colors",
                                        isAcademic
                                            ? "text-blue-100 hover:bg-white/10 hover:text-white"
                                            : "text-muted-foreground hover:bg-black/5 hover:text-foreground dark:hover:bg-white/10"
                                    )}
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>
                        </div>

                        {/* Messages Area */}
                        <div className="flex-1 overflow-y-auto p-5 space-y-5 scrollbar-thin scrollbar-thumb-rounded-full scrollbar-track-transparent scrollbar-thumb-muted-foreground/20">
                            {isLoadingHistory && (
                                <div className="flex justify-center pt-4">
                                    <div className="flex gap-1.5">
                                        <span className={cn("h-2 w-2 rounded-full animate-bounce [animation-delay:-0.3s]", isAcademic ? "bg-blue-400" : "bg-primary/60")} />
                                        <span className={cn("h-2 w-2 rounded-full animate-bounce [animation-delay:-0.15s]", isAcademic ? "bg-blue-400" : "bg-primary/60")} />
                                        <span className={cn("h-2 w-2 rounded-full animate-bounce", isAcademic ? "bg-blue-400" : "bg-primary/60")} />
                                    </div>
                                </div>
                            )}
                            {messages.map((message) => (
                                <motion.div
                                    key={message.id}
                                    variants={messageVariants}
                                    initial="hidden"
                                    animate="visible"
                                    className={cn(
                                        'flex gap-3 group',
                                        message.role === 'user' ? 'flex-row-reverse' : ''
                                    )}
                                >
                                    <div className={cn(
                                        'flex h-8 w-8 shrink-0 items-center justify-center rounded-full shadow-sm',
                                        message.role === 'user'
                                            ? (isAcademic ? 'bg-blue-600 text-white' : 'bg-gradient-to-br from-primary to-accent text-white')
                                            : (isAcademic ? 'bg-blue-50 border border-blue-100 text-blue-600' : 'bg-white border border-border text-primary dark:bg-zinc-800 dark:border-zinc-700')
                                    )}>
                                        {message.role === 'user' ? <User className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
                                    </div>
                                    <div className="flex flex-col gap-1 max-w-[80%]">
                                        <div className={cn(
                                            'px-4 py-3 shadow-sm text-sm leading-relaxed',
                                            message.role === 'user'
                                                ? (isAcademic ? 'bg-blue-600 text-white rounded-2xl rounded-tr-sm' : 'bg-primary text-primary-foreground rounded-2xl rounded-tr-sm')
                                                : (isAcademic ? 'bg-white border border-blue-100 text-slate-700 rounded-2xl rounded-tl-sm' : 'bg-white border border-border/50 text-foreground rounded-2xl rounded-tl-sm dark:bg-zinc-800/80 dark:border-zinc-700')
                                        )}>
                                            <MarkdownRenderer content={message.content} />
                                        </div>
                                        <span className={cn(
                                            'text-[10px] opacity-0 group-hover:opacity-100 transition-opacity px-1',
                                            message.role === 'user' ? 'text-right text-muted-foreground' : 'text-muted-foreground'
                                        )}>
                                            {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                </motion.div>
                            ))}

                            {isTyping && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="flex gap-3"
                                >
                                    <div className={cn(
                                        "flex h-8 w-8 items-center justify-center rounded-full shadow-sm",
                                        isAcademic ? "bg-blue-50 border border-blue-100 text-blue-600" : "bg-white border border-border text-primary dark:bg-zinc-800 dark:border-zinc-700"
                                    )}>
                                        <Sparkles className="h-4 w-4" />
                                    </div>
                                    <div className={cn(
                                        "rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm",
                                        isAcademic ? "bg-white border border-blue-100" : "bg-white border border-border/50 dark:bg-zinc-800/80 dark:border-zinc-700"
                                    )}>
                                        <div className="flex gap-1.5">
                                            <span className={cn("h-1.5 w-1.5 rounded-full animate-bounce [animation-delay:-0.3s]", isAcademic ? "bg-blue-400" : "bg-primary/60")} />
                                            <span className={cn("h-1.5 w-1.5 rounded-full animate-bounce [animation-delay:-0.15s]", isAcademic ? "bg-blue-400" : "bg-primary/60")} />
                                            <span className={cn("h-1.5 w-1.5 rounded-full animate-bounce", isAcademic ? "bg-blue-400" : "bg-primary/60")} />
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            <div ref={messagesEndRef} />
                        </div>

                        {/* Quick Prompts - Only show when few messages */}
                        {messages.length <= 1 && (
                            <div className="px-5 pb-2">
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.2 }}
                                    className="flex flex-wrap gap-2"
                                >
                                    {quickPrompts.slice(0, 3).map((prompt, index) => {
                                        const Icon = prompt.icon;
                                        return (
                                            <motion.button
                                                key={index}
                                                whileHover={{ scale: 1.02, y: -2 }}
                                                whileTap={{ scale: 0.98 }}
                                                onClick={() => handleQuickPrompt(prompt.text)}
                                                className={cn(
                                                    "flex items-center gap-2 rounded-xl border px-3 py-2 text-[11px] font-medium transition-all",
                                                    isAcademic
                                                        ? "border-blue-100 bg-blue-50/50 text-blue-600 hover:bg-blue-100 hover:border-blue-200"
                                                        : "border-border/50 bg-white/50 text-muted-foreground hover:bg-primary/5 hover:text-primary hover:border-primary/20 hover:shadow-sm dark:bg-zinc-800/50"
                                                )}
                                            >
                                                <Icon className="h-3.5 w-3.5 opacity-70" />
                                                {prompt.text}
                                            </motion.button>
                                        );
                                    })}
                                </motion.div>
                            </div>
                        )}

                        {/* Input Area */}
                        <div className={cn(
                            "p-4 backdrop-blur-md",
                            isAcademic ? "bg-white/50" : "bg-white/50 dark:bg-zinc-900/50"
                        )}>
                            <form
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    handleSendMessage(inputValue);
                                }}
                                className={cn(
                                    "relative flex items-center gap-2 rounded-[24px] p-1.5 shadow-sm border transition-all duration-300",
                                    isAcademic
                                        ? "bg-white border-blue-100 focus-within:ring-2 focus-within:ring-blue-100 focus-within:border-blue-400"
                                        : "bg-white border-border/60 focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/50 dark:bg-zinc-800 dark:border-zinc-700"
                                )}
                            >
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    placeholder="Type a message..."
                                    className={cn(
                                        "flex-1 bg-transparent px-4 py-2 text-sm focus:outline-none",
                                        isAcademic ? "text-slate-800 placeholder:text-slate-400" : "text-foreground placeholder:text-muted-foreground"
                                    )}
                                    disabled={isTyping}
                                />
                                {/* Mic Button */}
                                <motion.button
                                    type="button"
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={handleToggleRecording}
                                    disabled={isTyping}
                                    className={cn(
                                        "relative flex h-9 w-9 items-center justify-center rounded-full shadow-sm transition-all disabled:cursor-not-allowed",
                                        isRecording
                                            ? "bg-red-500 text-white shadow-red-500/40"
                                            : isAcademic
                                                ? "bg-blue-50 text-blue-500 hover:bg-blue-100"
                                                : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200 dark:bg-zinc-700 dark:text-zinc-300"
                                    )}
                                >
                                    {isRecording && (
                                        <span className="absolute inset-0 rounded-full bg-red-400 animate-ping opacity-60" />
                                    )}
                                    {isRecording
                                        ? <MicOff className="h-4 w-4 relative z-10" />
                                        : <Mic className="h-4 w-4" />}
                                </motion.button>
                                {/* Send Button */}
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    type="submit"
                                    disabled={!inputValue.trim() || isTyping}
                                    className={cn(
                                        "flex h-9 w-9 items-center justify-center rounded-full shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:shadow-lg",
                                        isAcademic ? "bg-blue-600 text-white hover:bg-blue-700" : "bg-primary text-primary-foreground"
                                    )}
                                >
                                    <Send className="h-4 w-4 ml-0.5" />
                                </motion.button>
                            </form>
                            <div className="mt-2 text-center">
                                <p className="text-[10px] text-muted-foreground/60">
                                    AI can make mistakes. Check for accuracy.
                                </p>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
