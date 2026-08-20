'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Send, BrainCircuit, GraduationCap, FileQuestion, Volume2, VolumeX, Loader2, Sparkles, Layers, Maximize2, X, MessageSquareText } from 'lucide-react';
import { useMode } from '@/contexts/ModeContext';
import { API_BASE_URL } from '@/lib/api';
import { MarkdownRenderer } from '@/components/ui/MarkdownRenderer';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { VisualizationPanel } from '@/components/tutor/VisualizationPanel';

type TutorMode = 'explain' | 'exam_prep';

interface MCQ {
    question: string;
    options: string[];
    correct_index: number;
    topic: string;
    explanation: string;
    answered_index?: number; // set when user picks an option
}

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    topic?: string;
    mcq?: MCQ;
    visualizable?: boolean; // only true for explain-mode substantive explanations
}

function RobotAvatar({ isSpeaking, isThinking, tutorMode }: {
    isSpeaking: boolean; isThinking: boolean; tutorMode: TutorMode;
}) {
    const modeColor = tutorMode === 'explain' ? '#6366f1' : '#f43f5e';
    const modeLight = tutorMode === 'explain' ? '#818cf8' : '#fb7185';

    const [blink, setBlink] = useState(false);
    useEffect(() => {
        const next = () => setTimeout(() => {
            setBlink(true);
            setTimeout(() => { setBlink(false); next(); }, 120);
        }, 2200 + Math.random() * 3500);
        const t = next(); return () => clearTimeout(t);
    }, []);

    const [mouth, setMouth] = useState(0);
    useEffect(() => {
        if (!isSpeaking) { setMouth(0); return; }
        let raf: number, t = 0;
        const loop = () => {
            t += 0.14;
            setMouth(Math.max(0, Math.sin(t) * 0.5 + Math.sin(t * 1.9) * 0.35 + 0.15));
            raf = requestAnimationFrame(loop);
        };
        raf = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(raf);
    }, [isSpeaking]);

    const mH = 4 + mouth * 18;
    const mY = 90 - mH / 2;

    return (
        <motion.div
            className="relative"
            animate={{ y: isThinking ? [0, -4, 0] : [0, -10, 0] }}
            transition={{ repeat: Infinity, duration: isThinking ? 1.4 : 3.2, ease: 'easeInOut' }}
            style={{ filter: `drop-shadow(0 10px 24px ${modeColor}40)` }}
        >
            <svg width="170" height="200" viewBox="0 0 180 210" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* body */}
                <rect x="42" y="120" width="96" height="82" rx="20" fill="var(--card)" stroke={modeColor} strokeWidth="2.5" />
                <rect x="55" y="134" width="70" height="48" rx="12" fill={modeColor} fillOpacity="0.08" stroke={modeColor} strokeWidth="1" strokeOpacity="0.4" />
                {[0,1,2].map(i => (
                    <motion.circle key={i} cx={72 + i * 18} cy={158} r={5}
                        fill={i === 1 ? modeLight : modeColor}
                        animate={{ opacity: i % 2 === 0 ? [1, 0.3, 1] : [0.3, 1, 0.3] }}
                        transition={{ repeat: Infinity, duration: 1.0 + i * 0.15 }}
                    />
                ))}
                {/* left arm */}
                <motion.g style={{ transformOrigin: '42px 140px' }}
                    animate={{ rotate: isSpeaking ? [-18, 18, -18] : isThinking ? [-8, 8, -8] : [-5, 5, -5] }}
                    transition={{ repeat: Infinity, duration: isSpeaking ? 0.55 : 2.5, ease: 'easeInOut' }}>
                    <rect x="17" y="128" width="28" height="18" rx="9" fill={modeColor} fillOpacity="0.85" />
                    <rect x="8" y="143" width="26" height="16" rx="8" fill={modeColor} fillOpacity="0.7" />
                    <ellipse cx="10" cy="168" rx="11" ry="9" fill={modeColor} fillOpacity="0.9" />
                    <ellipse cx="10" cy="165" rx="8" ry="6" fill={modeLight} fillOpacity="0.5" />
                </motion.g>
                {/* right arm */}
                <motion.g style={{ transformOrigin: '138px 140px' }}
                    animate={{ rotate: isSpeaking ? [18, -18, 18] : isThinking ? [8, -8, 8] : [5, -5, 5] }}
                    transition={{ repeat: Infinity, duration: isSpeaking ? 0.6 : 2.7, ease: 'easeInOut' }}>
                    <rect x="135" y="128" width="28" height="18" rx="9" fill={modeColor} fillOpacity="0.85" />
                    <rect x="146" y="143" width="26" height="16" rx="8" fill={modeColor} fillOpacity="0.7" />
                    <ellipse cx="170" cy="168" rx="11" ry="9" fill={modeColor} fillOpacity="0.9" />
                    <ellipse cx="170" cy="165" rx="8" ry="6" fill={modeLight} fillOpacity="0.5" />
                </motion.g>
                {/* neck */}
                <rect x="80" y="108" width="20" height="16" rx="6" fill="var(--muted)" stroke={modeColor} strokeWidth="1.5" />
                {/* head */}
                <rect x="32" y="24" width="116" height="88" rx="26" fill="var(--card)" stroke={modeColor} strokeWidth="2.5" />
                <rect x="44" y="32" width="92" height="26" rx="10" fill={modeColor} fillOpacity="0.06" />
                {/* antenna */}
                <rect x="86" y="8" width="8" height="20" rx="4" fill={modeColor} fillOpacity="0.8" />
                <motion.circle cx="90" cy="7" r="6" fill={modeColor}
                    animate={{ opacity: [1, 0.35, 1], r: [6, 7.5, 6] }}
                    transition={{ repeat: Infinity, duration: 0.85 }} />
                {/* bolts */}
                <circle cx="32" cy="68" r="5" fill="var(--muted)" stroke={modeColor} strokeWidth="1.5" />
                <circle cx="148" cy="68" r="5" fill="var(--muted)" stroke={modeColor} strokeWidth="1.5" />
                {/* left eye */}
                <circle cx="70" cy="72" r="16" fill="var(--background)" stroke={modeColor} strokeWidth="2" />
                <motion.circle cx="70" cy="72" r={blink ? 1 : 9} fill={modeColor}
                    animate={{ scale: isThinking ? [1, 1.12, 1] : 1 }}
                    transition={{ repeat: Infinity, duration: 0.9 }} />
                {!blink && <><circle cx="73" cy="69" r="3.5" fill="white" opacity="0.9" /><circle cx="63" cy="75" r="1.5" fill={modeLight} opacity="0.6" /></>}
                {/* right eye */}
                <circle cx="110" cy="72" r="16" fill="var(--background)" stroke={modeColor} strokeWidth="2" />
                <motion.circle cx="110" cy="72" r={blink ? 1 : 9} fill={modeColor}
                    animate={{ scale: isThinking ? [1, 1.12, 1] : 1 }}
                    transition={{ repeat: Infinity, duration: 0.9 }} />
                {!blink && <><circle cx="113" cy="69" r="3.5" fill="white" opacity="0.9" /><circle cx="103" cy="75" r="1.5" fill={modeLight} opacity="0.6" /></>}
                {/* mouth */}
                <rect x={90 - 20} y={mY} width="40" height={mH} rx={mH / 2} fill={modeColor} opacity="0.9" />
                {mouth > 0.08 && <rect x={90 - 15} y={mY + 3} width="30" height={Math.max(2, mH - 7)} rx={Math.max(1, mH / 2 - 3.5)} fill="var(--background)" opacity="0.8" />}
                {/* sound waves */}
                <AnimatePresence>
                    {isSpeaking && [0,1,2,3,4].map(i => (
                        <motion.rect key={i} x={68 + i * 12} y={195} width="6" rx="3" fill={modeColor}
                            initial={{ height: 4, y: 199 }}
                            animate={{ height: [4, 10 + i * 3, 4], y: [199, 193, 199] }}
                            transition={{ repeat: Infinity, duration: 0.45 + i * 0.08, ease: 'easeInOut' }} />
                    ))}
                </AnimatePresence>
                <motion.ellipse cx="90" cy="207" rx="52" ry="6" fill={modeColor}
                    animate={{ opacity: [0.1, 0.2, 0.1], rx: [52, 56, 52] }}
                    transition={{ repeat: Infinity, duration: 3.2 }} />
                
                {/* scanning laser for thinking state */}
                {isThinking && (
                    <motion.rect x="30" width="120" height="3" fill={modeLight} opacity="0.8" style={{ filter: `drop-shadow(0 0 10px ${modeLight})` }}
                        animate={{ y: [24, 108, 24], opacity: [0, 1, 0] }}
                        transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                    />
                )}
            </svg>
        </motion.div>
    );
}

// ────────────────────────────────────────────────────────
// Page Component
// ────────────────────────────────────────────────────────
export default function TutorPage() {
    const { user } = useMode();
    const [tutorMode, setTutorMode] = useState<TutorMode>('explain');
    const [messages, setMessages] = useState<Message[]>([]);
    const [historyLoaded, setHistoryLoaded] = useState(false);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [soundEnabled, setSoundEnabled] = useState(true);
    const [activeViz, setActiveViz] = useState<{ topic: string; subject: string } | null>(null);
    const [isVizExpanded, setIsVizExpanded] = useState(false);
    const [examActive, setExamActive] = useState(false); // tracks if rapid-fire MCQ loop is running

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const synthRef = useRef<SpeechSynthesis | null>(null);

    useEffect(() => {
        if (typeof window !== 'undefined') synthRef.current = window.speechSynthesis;
        return () => { synthRef.current?.cancel(); };
    }, []);

    // Restore chat history from Firestore on mount
    useEffect(() => {
        if (!user?.uid || historyLoaded) return;
        fetch(`${API_BASE_URL}/tutor/history/${user.uid}?session_id=tutor_session&limit=40`)
            .then(r => r.json())
            .then(data => {
                const raw: any[] = data.messages ?? [];
                const fetched: Message[] = raw.map((m, i) => {
                    let topic: string | undefined;
                    if (m.role === 'assistant') {
                        const prev = raw.slice(0, i).reverse().find((p: any) => p.role === 'user');
                        if (prev) topic = extractTopic(prev.content);
                    }
                    return { id: m.id, role: m.role as 'user' | 'assistant', content: m.content, topic };
                });
                if (fetched.length > 0) {
                    setMessages(fetched);
                } else {
                    setMessages([{ id: 'welcome', role: 'assistant', content: "👋 Hello! I am your AI Knowledge Engine. I have analyzed your mastery profile.\n\nAsk me to explain any topic, and you can trigger **Visualizations** for step-by-step interactive breakdowns." }]);
                }
            })
            .catch(() => {
                setMessages([{ id: 'welcome', role: 'assistant', content: "👋 Hello! I am your AI Knowledge Engine. I have analyzed your mastery profile.\n\nAsk me to explain any topic, and you can trigger **Visualizations** for step-by-step interactive breakdowns." }]);
            })
            .finally(() => setHistoryLoaded(true));
    }, [user?.uid, historyLoaded]);

    useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, isTyping]);

    const speakText = (text: string) => {
        if (!soundEnabled || !synthRef.current) return;
        synthRef.current.cancel();
        const utt = new SpeechSynthesisUtterance(text.replace(/[#*`_[\]]/g, '').replace(/\n+/g, ' ').slice(0, 400));
        utt.rate = 1.05; utt.pitch = 1.05;
        utt.onstart = () => setIsSpeaking(true);
        utt.onend = () => setIsSpeaking(false);
        utt.onerror = () => setIsSpeaking(false);
        synthRef.current.speak(utt);
    };

    const extractTopic = (msg: string) =>
        msg.replace(/^(explain|what is|how does|describe|teach me|show me)\s+/i, '').split(' ').slice(0, 5).join(' ');

    const deriveTopicFromContent = (content: string) =>
        content
            .replace(/[#*`_>]/g, '')
            .replace(/\n.*/s, '')
            .replace(/^(sure|of course|great|let me|here|let\'s|okay)[^a-z]*/i, '')
            .split(' ').slice(0, 5).join(' ').trim();


    const modes = {
        explain:   { label: 'Deep Explain', color: '#3b82f6', bg: 'from-blue-600 to-cyan-500', sub: 'Adaptive Analogies'  },
        exam_prep: { label: 'Exam Simulator',color: '#f43f5e', bg: 'from-rose-600 to-orange-500', sub: 'Rapid Recall'     },
    };
    const current = modes[tutorMode];

    const handleModeChange = async (m: TutorMode) => {
        const prev = tutorMode;
        setTutorMode(m);
        synthRef.current?.cancel(); setIsSpeaking(false);

        // When switching TO exam mode, immediately fire a MCQ
        if (m === 'exam_prep' && prev !== 'exam_prep' && user?.uid) {
            setIsTyping(true);
            try {
                const res = await fetch(`${API_BASE_URL}/tutor/mcq`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ uid: user.uid, session_id: 'tutor_session' }),
                });
                if (!res.ok) throw new Error();
                const mcq = await res.json();
                setMessages(p => [...p, {
                    id: Date.now().toString(),
                    role: 'assistant',
                    content: `⚡ **Exam Mode Activated!** Let's test your knowledge on **${mcq.topic}**.`,
                    mcq,
                }]);
                setExamActive(true);
            } catch {
                setMessages(p => [...p, {
                    id: Date.now().toString(),
                    role: 'assistant',
                    content: '⚡ **Exam Simulator active!** Ask me a topic to start a rapid-fire quiz.',
                }]);
            } finally {
                setIsTyping(false);
            }
        }

        // Reset exam when switching away from exam_prep
        if (m !== 'exam_prep') {
            setExamActive(false);
        }
    };

    const handleMCQAnswer = async (msgId: string, mcq: MCQ, selectedIndex: number) => {
        if (!examActive) return; // if exam was stopped, don't chain next question
        // Mark answered locally immediately
        setMessages(p => p.map(m => m.id === msgId ? { ...m, mcq: { ...mcq, answered_index: selectedIndex } } : m));
        const isCorrect = selectedIndex === mcq.correct_index;
        const selectedText = mcq.options[selectedIndex];
        const correctText = mcq.options[mcq.correct_index];
        setMessages(p => [...p, { id: Date.now().toString(), role: 'user', content: `${String.fromCharCode(65 + selectedIndex)}: ${selectedText}` }]);
        setIsTyping(true);
        try {
            const res = await fetch(`${API_BASE_URL}/tutor/message`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    uid: user!.uid,
                    message: `My answer to "${mcq.question}" is "${selectedText}". Correct answer is "${correctText}". I was ${isCorrect ? 'CORRECT' : 'WRONG'}. Give 1-line feedback and call update_elo_score.`,
                    mode: 'exam_prep',
                    session_id: 'tutor_session',
                }),
            });
            const data = await res.json();
            speakText(data.response);

            // Only chain next MCQ if exam is still active
            if (examActive) {
                const mcqRes = await fetch(`${API_BASE_URL}/tutor/mcq`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ uid: user!.uid, session_id: 'tutor_session', topic_hint: mcq.topic }),
                });
                const nextMCQ = mcqRes.ok ? await mcqRes.json() : null;
                setMessages(p => [
                    ...p,
                    { id: Date.now().toString(), role: 'assistant' as const, content: data.response },
                    ...(nextMCQ ? [{ id: (Date.now() + 1).toString(), role: 'assistant' as const, content: `Next question on **${nextMCQ.topic}**:`, mcq: nextMCQ }] : []),
                ]);
            } else {
                // Exam was stopped — just show the feedback
                setMessages(p => [...p, { id: Date.now().toString(), role: 'assistant' as const, content: data.response }]);
            }
        } catch {
            toast.error('Failed to evaluate answer.');
        } finally {
            setIsTyping(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || !user) return;
        const userMsg = input.trim();
        const topic = extractTopic(userMsg);
        setInput('');
        setMessages(p => [...p, { id: Date.now().toString(), role: 'user', content: userMsg, topic }]);
        setIsTyping(true);
        synthRef.current?.cancel(); setIsSpeaking(false);
        try {
            const res = await fetch(`${API_BASE_URL}/tutor/message`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ uid: user.uid, message: userMsg, mode: tutorMode, session_id: 'tutor_session' }),
            });
            if (!res.ok) throw new Error();
            const data = await res.json();
            const isExplainMode = tutorMode === 'explain';
            const isSubstantial = (data.response?.length ?? 0) > 150;
            setMessages(p => [...p, {
                id: Date.now().toString(),
                role: 'assistant',
                content: data.response,
                topic,
                visualizable: isExplainMode && isSubstantial,
            }]);
            speakText(data.response);
        } catch {
            toast.error('AI Engine unreachable. Please ensure the backend is running.');
        } finally {
            setIsTyping(false);
        }
    };

    return (
        <DashboardLayout title="AI Learning Engine" subtitle="Real-time adaptive tutoring and generative visualizations.">
            <div className="relative flex gap-4 h-[calc(100vh-140px)] w-full max-w-[1600px] mx-auto overflow-hidden rounded-3xl p-1">
                
                {/* ── LEFT PANEL: Controls & Avatar ── */}
                <div className={cn(
                    "flex flex-col gap-4 transition-all duration-500 shrink-0",
                    isVizExpanded ? "w-0 opacity-0 overflow-hidden" : "w-64 opacity-100"
                )}>
                    {/* Glassmorphic Avatar Card */}
                    <div className="relative rounded-3xl bg-card border border-border/50 flex flex-col items-center justify-center py-6 overflow-hidden flex-1 min-h-[300px]">
                        
                        <div className="z-10 w-full flex-1 flex flex-col items-center justify-center">
                            <RobotAvatar isSpeaking={isSpeaking} isThinking={isTyping} tutorMode={tutorMode} />
                        </div>

                        <div className="z-10 mt-4 text-center px-4 w-full">
                            <div className={cn("inline-flex items-center justify-center px-3 py-1 rounded-full border mb-3 shadow-lg")}
                                style={{ background: `${current.color}15`, borderColor: `${current.color}40`, color: current.color }}>
                                <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                                <span className="text-[10px] font-black tracking-widest uppercase">{current.label}</span>
                            </div>
                            <div className="h-12 flex items-center justify-center mt-2">
                                <motion.div 
                                    className="flex items-center gap-3 px-4 py-2.5 rounded-2xl border bg-background/50 shadow-sm"
                                    style={{ borderColor: `${current.color}30` }}
                                    animate={{ 
                                        boxShadow: isTyping || isSpeaking ? `0 0 20px ${current.color}15` : `0 0 0px ${current.color}0`
                                    }}
                                >
                                    {isSpeaking ? (
                                        <div className="flex gap-[3px] items-center h-3.5">
                                            {[1,2,3,4,5].map(i => (
                                                <motion.div key={i} className="w-[3px] rounded-full" style={{ background: current.color }}
                                                    animate={{ height: ['4px', '14px', '4px'] }}
                                                    transition={{ repeat: Infinity, duration: 0.4 + i*0.1, ease: "easeInOut" }}
                                                />
                                            ))}
                                        </div>
                                    ) : isTyping ? (
                                        <div className="flex gap-1.5 items-center">
                                            {[0,1,2].map(i => (
                                                <motion.div key={i} className="w-1.5 h-1.5 rounded-full" style={{ background: current.color }}
                                                    animate={{ y: [0, -5, 0], opacity: [0.3, 1, 0.3] }}
                                                    transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.15 }}
                                                />
                                            ))}
                                        </div>
                                    ) : (
                                        <motion.div className="w-2 h-2 rounded-full" style={{ background: current.color }}
                                            animate={{ opacity: [1, 0.3, 1] }}
                                            transition={{ repeat: Infinity, duration: 2.5 }}
                                        />
                                    )}
                                    <span className="text-[11px] font-black uppercase tracking-widest mt-0.5" style={{ color: current.color }}>
                                        {isTyping ? 'Synthesizing...' : isSpeaking ? 'Transmitting...' : 'Awaiting Input'}
                                    </span>
                                </motion.div>
                            </div>
                        </div>

                        <button onClick={() => { setSoundEnabled(s => !s); synthRef.current?.cancel(); setIsSpeaking(false); }}
                            className="absolute top-4 right-4 p-2 rounded-full bg-background/50 backdrop-blur-md border border-border/50 hover:bg-muted transition-colors z-20 shadow-sm">
                            {soundEnabled ? <Volume2 className="w-4 h-4 text-foreground/80" /> : <VolumeX className="w-4 h-4 text-muted-foreground" />}
                        </button>
                    </div>

                    {/* Mode Selector */}
                    <div className="bg-card border border-border/50 rounded-3xl p-3">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-2 mb-2">Engine Mode</p>
                        <div className="flex flex-col gap-1.5">
                            {([
                                { id: 'explain',   Icon: GraduationCap, label: 'Deep Explain',  color: '#3b82f6', bg: 'bg-blue-500' },
                                { id: 'exam_prep', Icon: FileQuestion,  label: 'Exam Simulator',color: '#f43f5e', bg: 'bg-rose-500' },
                            ] as const).map(({ id, Icon, label, color, bg }) => (
                                <button key={id} onClick={() => handleModeChange(id)}
                                    className={cn('flex items-center gap-3 p-3 rounded-2xl transition-all text-left w-full relative overflow-hidden group',
                                        tutorMode === id ? `bg-muted shadow-sm border border-border/80` : 'hover:bg-muted/50 bg-transparent border border-transparent'
                                    )}>
                                    {tutorMode === id && (
                                        <motion.div layoutId="mode-bg" className="absolute inset-0 opacity-[0.03]" style={{ background: color }} />
                                    )}
                                    <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-sm transition-colors z-10 relative", tutorMode === id ? bg : "bg-card border border-border group-hover:border-muted-foreground/30")}>
                                        <Icon className={cn("w-4 h-4", tutorMode === id ? "text-white" : "text-muted-foreground")} />
                                    </div>
                                    <div className="flex flex-col z-10 relative">
                                        <span className={cn("text-xs font-bold", tutorMode === id ? "text-foreground" : "text-muted-foreground")}>{label}</span>
                                    </div>
                                    {tutorMode === id && <div className="ml-auto w-2 h-2 rounded-full" style={{ background: color, boxShadow: `0 0 10px ${color}` }} />}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* ── MIDDLE PANEL: Chat ── */}
                <div className={cn(
                    "flex flex-col transition-all duration-500 h-full relative",
                    activeViz ? (isVizExpanded ? "w-[400px]" : "flex-1") : "flex-1"
                )}>
                    <div className="absolute inset-0 bg-card border border-border/60 rounded-3xl flex flex-col overflow-hidden">
                        
                        <div className="h-14 px-5 border-b border-border/50 bg-background/40 flex items-center gap-3 shrink-0">
                            <MessageSquareText className="w-5 h-5" style={{ color: current.color }} />
                            <span className="font-bold text-sm tracking-wide">Neural Chat Interface</span>
                            <span className="ml-auto px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider" style={{ background: `${current.color}15`, color: current.color }}>
                                {current.sub}
                            </span>
                        </div>

                        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 scroll-smooth">
                            {!historyLoaded && (
                                <div className="flex flex-col gap-6 animate-pulse">
                                    {[80, 60, 90].map((w, i) => (
                                        <div key={i} className={cn('flex gap-3', i % 2 === 0 ? 'flex-row' : 'flex-row-reverse')}>
                                            <div className="w-8 h-8 rounded-full bg-muted shrink-0" />
                                            <div className="h-16 rounded-2xl bg-muted/60" style={{ width: `${w}%` }} />
                                        </div>
                                    ))}
                                </div>
                            )}
                            {historyLoaded && messages.map(msg => (
                                <motion.div key={msg.id}
                                    initial={{ opacity: 0, y: 15, scale: 0.98 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                                    className={cn('flex gap-3 w-full', msg.role === 'user' ? 'flex-row-reverse' : 'flex-row')}
                                >
                                    {msg.role === 'assistant' ? (
                                        <div className="w-8 h-8 rounded-xl shrink-0 flex items-center justify-center shadow-lg border mt-1"
                                            style={{ background: `linear-gradient(135deg, ${current.color}, #000)`, borderColor: `${current.color}50` }}>
                                            <BrainCircuit className="w-4 h-4 text-white" />
                                        </div>
                                    ) : (
                                        <div className="w-8 h-8 rounded-xl shrink-0 flex items-center justify-center shadow-md bg-muted border border-border mt-1">
                                            <span className="text-[10px] font-black text-muted-foreground uppercase">You</span>
                                        </div>
                                    )}
                                    <div className="flex flex-col gap-2 max-w-[85%]">
                                        <div className={cn(
                                            'px-6 py-4 text-[14.5px] leading-relaxed relative overflow-hidden',
                                            msg.role === 'user'
                                                ? 'bg-foreground text-background rounded-[24px] rounded-tr-[4px] font-medium shadow-md'
                                                : 'bg-card border border-border text-foreground rounded-[24px] rounded-tl-[4px] shadow-sm'
                                        )}>
                                            {msg.role === 'user' && (
                                                <div className="absolute inset-0 opacity-10 bg-gradient-to-tr from-white/0 to-white/40" />
                                            )}
                                                <MarkdownRenderer content={msg.content} />
                                        </div>
                                        {msg.role === 'assistant' && msg.mcq && (
                                            <div className="flex flex-col gap-2 w-full mt-1">
                                                {/* Question text */}
                                                <p className="text-sm font-bold text-foreground px-1">{msg.mcq.question}</p>
                                                {/* Options */}
                                                <div className="grid grid-cols-1 gap-2">
                                                    {msg.mcq.options.map((opt, idx) => {
                                                        const isAnswered = msg.mcq!.answered_index !== undefined;
                                                        const isSelected = msg.mcq!.answered_index === idx;
                                                        const isCorrect = idx === msg.mcq!.correct_index;
                                                        let btnStyle = 'border-border/60 bg-muted/30 hover:border-muted-foreground/40 hover:bg-muted/60';
                                                        if (isAnswered) {
                                                            if (isCorrect) btnStyle = 'border-emerald-500 bg-emerald-500/10 text-emerald-600';
                                                            else if (isSelected) btnStyle = 'border-rose-500 bg-rose-500/10 text-rose-500 line-through';
                                                            else btnStyle = 'border-border/30 bg-muted/10 opacity-40';
                                                        }
                                                        return (
                                                            <button
                                                                key={idx}
                                                                disabled={isAnswered}
                                                                onClick={() => handleMCQAnswer(msg.id, msg.mcq!, idx)}
                                                                className={cn(
                                                                    'flex items-center gap-3 px-4 py-2.5 rounded-xl border-2 text-left text-sm font-medium transition-all',
                                                                    isAnswered ? '' : 'hover:-translate-y-px active:scale-[0.98]',
                                                                    btnStyle
                                                                )}
                                                            >
                                                                <span className={cn(
                                                                    'w-6 h-6 rounded-md border-2 flex items-center justify-center text-[11px] font-black shrink-0',
                                                                    isAnswered && isCorrect ? 'border-emerald-500 bg-emerald-500 text-white' :
                                                                    isAnswered && isSelected ? 'border-rose-500 bg-rose-500 text-white' :
                                                                    'border-current'
                                                                )}>
                                                                    {String.fromCharCode(65 + idx)}
                                                                </span>
                                                                {opt}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                                {/* Explanation after answering */}
                                                {msg.mcq.answered_index !== undefined && msg.mcq.explanation && (
                                                    <p className="text-xs text-muted-foreground italic px-1 mt-1 border-l-2 border-muted pl-3">
                                                        💡 {msg.mcq.explanation}
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                        {msg.role === 'assistant' && msg.visualizable && msg.topic && (
                                            <button
                                                onClick={() => { setActiveViz({ topic: msg.topic!, subject: 'General' }); setIsVizExpanded(false); }}
                                                className="self-start flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] font-bold border transition-all hover:-translate-y-0.5 shadow-sm group overflow-hidden relative"
                                                style={{
                                                    borderColor: `${current.color}40`, color: current.color, background: `${current.color}05`,
                                                }}
                                            >
                                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-[100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                                                <Layers className="w-3.5 h-3.5" />
                                                Generate Visualization: {msg.topic}
                                            </button>
                                        )}
                                    </div>
                                </motion.div>
                            ))}

                            <AnimatePresence>
                                {isTyping && (
                                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex gap-3">
                                        <div className="w-8 h-8 rounded-xl shrink-0 flex items-center justify-center shadow-lg border mt-1"
                                            style={{ background: `linear-gradient(135deg, ${current.color}, #000)`, borderColor: `${current.color}50` }}>
                                            <BrainCircuit className="w-4 h-4 text-white" />
                                        </div>
                                        <div className="bg-background border border-border/60 rounded-3xl rounded-tl-sm px-5 py-4 flex items-center gap-2 shadow-sm">
                                            {[0, 0.15, 0.3].map((d, i) => (
                                                <motion.span key={i} className="block w-2.5 h-2.5 rounded-full" style={{ background: current.color }}
                                                    animate={{ y: [0, -6, 0], opacity: [0.3, 1, 0.3] }}
                                                    transition={{ repeat: Infinity, duration: 0.9, delay: d }} />
                                            ))}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                            <div ref={messagesEndRef} className="h-2" />
                        </div>

                        <div className="p-4 bg-background/60 backdrop-blur-xl border-t border-border/50">
                            {/* Stop Quiz banner — shown when rapid-fire exam is running */}
                            <AnimatePresence>
                                {examActive && tutorMode === 'exam_prep' && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="mb-3 flex items-center justify-between px-4 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20"
                                    >
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                                            <span className="text-xs font-bold text-rose-500">Rapid-Fire Exam Active</span>
                                        </div>
                                        <button
                                            onClick={() => {
                                                setExamActive(false);
                                                setMessages(p => [...p, {
                                                    id: Date.now().toString(),
                                                    role: 'assistant',
                                                    content: '✅ Exam session ended. Great work! Switch back to **Deep Explain** mode to review any topics, or start a new session anytime.',
                                                }]);
                                            }}
                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500 text-white text-xs font-bold hover:bg-rose-600 transition-colors shadow-sm"
                                        >
                                            <X className="w-3 h-3" />
                                            Stop Quiz
                                        </button>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                            <form onSubmit={handleSubmit} className="relative flex items-center">
                                <input value={input} onChange={e => setInput(e.target.value)} disabled={isTyping}
                                    placeholder={isTyping ? 'Engine is processing...' : 'Type your query here...'}
                                    className="w-full bg-muted/50 border border-border/80 rounded-2xl pl-5 pr-14 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-all disabled:opacity-60 shadow-inner"
                                    style={{ ['--tw-ring-color' as string]: current.color }}
                                />
                                <motion.button type="submit" disabled={isTyping || !input.trim()}
                                    whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                                    className="absolute right-2 w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 disabled:opacity-40 shadow-md transition-colors"
                                    style={{ background: input.trim() ? current.color : 'var(--muted)', color: input.trim() ? '#fff' : 'var(--muted-foreground)' }}
                                >
                                    {isTyping ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 ml-0.5" />}
                                </motion.button>
                            </form>
                        </div>
                    </div>
                </div>

                {/* ── RIGHT PANEL: Visualization (Sliding/Expanding) ── */}
                <AnimatePresence>
                    {activeViz && (
                        <motion.div
                            initial={{ opacity: 0, width: 0, marginLeft: 0 }}
                            animate={{ opacity: 1, width: isVizExpanded ? 'calc(100% - 400px)' : '380px', marginLeft: 0 }}
                            exit={{ opacity: 0, width: 0, marginLeft: 0 }}
                            transition={{ type: 'spring', stiffness: 280, damping: 30 }}
                            className="h-full relative shrink-0 z-20"
                        >
                            <div className="absolute inset-0 bg-card border border-border/80 rounded-3xl overflow-hidden flex flex-col">
                                <div className="h-14 px-4 border-b border-border/50 flex items-center justify-between bg-background/50">
                                    <div className="flex items-center gap-2 overflow-hidden">
                                        <Layers className="w-4 h-4 shrink-0" style={{ color: current.color }} />
                                        <span className="font-bold text-[13px] truncate tracking-wide">Visualization Engine</span>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                        <button onClick={() => setIsVizExpanded(!isVizExpanded)}
                                            className="p-2 hover:bg-muted rounded-lg transition-colors text-muted-foreground hover:text-foreground">
                                            <Maximize2 className="w-3.5 h-3.5" />
                                        </button>
                                        <button onClick={() => { setActiveViz(null); setIsVizExpanded(false); }}
                                            className="p-2 hover:bg-muted rounded-lg transition-colors text-muted-foreground hover:text-rose-400">
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                                <div className="flex-1 relative overflow-hidden">
                                    <VisualizationPanel
                                        topic={activeViz.topic}
                                        subject={activeViz.subject}
                                        accent={current.color}
                                        uid={user?.uid}
                                    />
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

            </div>
        </DashboardLayout>
    );
}
