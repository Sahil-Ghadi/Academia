'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Play, Pause, RotateCcw, Loader2 } from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
    RadarChart, Radar, PolarGrid, PolarAngleAxis, Cell,
} from 'recharts';
import { Light as SyntaxHighlighter } from 'react-syntax-highlighter';
import python from 'react-syntax-highlighter/dist/esm/languages/hljs/python';
import javascript from 'react-syntax-highlighter/dist/esm/languages/hljs/javascript';
import cpp from 'react-syntax-highlighter/dist/esm/languages/hljs/cpp';
import java from 'react-syntax-highlighter/dist/esm/languages/hljs/java';
import { atomOneDark } from 'react-syntax-highlighter/dist/esm/styles/hljs';
import * as d3 from 'd3';
import { cn } from '@/lib/utils';
import { MarkdownRenderer } from '@/components/ui/MarkdownRenderer';

// Register languages
SyntaxHighlighter.registerLanguage('python', python);
SyntaxHighlighter.registerLanguage('javascript', javascript);
SyntaxHighlighter.registerLanguage('cpp', cpp);
SyntaxHighlighter.registerLanguage('java', java);

// ─── Types ────────────────────────────────────────────────
interface ArrayDef { label?: string; values: string[]; highlight?: number[]; colors?: Record<string, string>; }
interface TreeNodeDef { id: number; val: string; x?: number; y?: number; children?: number[]; }
interface TreeEdgeDef { from: number; to: number; }
interface CompRow { label: string; a: string; b: string; winner?: 'a' | 'b' | 'none'; }

interface VisualStep {
    id: number; title: string; description: string;
    type: 'concept' | 'array_op' | 'tree_op' | 'code' | 'comparison';
    icon?: string; points?: string[];
    arrays?: ArrayDef[]; action?: string;
    nodes?: TreeNodeDef[]; edges?: TreeEdgeDef[]; highlight_nodes?: number[];
    language?: string; code?: string[]; highlight?: number[]; explanation?: string;
    col_a?: string; col_b?: string; rows?: CompRow[];
}
interface VisualizationData { topic: string; summary: string; steps: VisualStep[]; }

const colorMap: Record<string, string> = {
    green: '#22c55e', red: '#ef4444', orange: '#f97316',
    blue: '#3b82f6', purple: '#a855f7', yellow: '#eab308', cyan: '#06b6d4',
};
const rc = (k: string) => colorMap[k] ?? k;

// ─── Concept ──────────────────────────────────────────────
function ConceptStep({ step, accent }: { step: VisualStep; accent: string }) {
    return (
        <div className="flex flex-col items-center justify-center h-full gap-6 px-8 py-6 bg-muted/20">
            {step.icon && (
                <motion.div initial={{ scale: 0, rotate: -20, opacity: 0 }} animate={{ scale: 1, rotate: 0, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                    className="w-24 h-24 shrink-0 rounded-[32px] flex items-center justify-center text-5xl relative"
                    style={{ background: `linear-gradient(135deg, ${accent}30, ${accent}10)`, border: `1px solid ${accent}40` }}>
                    {step.icon.length > 4 ? '💡' : step.icon}
                    <div className="absolute inset-0 rounded-[32px] overflow-hidden pointer-events-none">
                        <motion.div className="w-full h-full bg-white opacity-20" animate={{ x: ['-100%', '100%'] }} transition={{ repeat: Infinity, duration: 2.5, ease: 'linear' }} style={{ transform: 'skewX(-20deg)' }} />
                    </div>
                </motion.div>
            )}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
                className="text-[13px] text-center font-medium leading-relaxed max-w-md text-foreground/90">
                <MarkdownRenderer content={step.description} />
            </motion.div>
            <div className="w-full max-w-md flex flex-col gap-3">
                {(step.points ?? []).map((p, i) => (
                    <motion.div key={i} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 + i * 0.1, type: 'spring', stiffness: 300 }}
                        className="flex items-start gap-3 px-4 py-3 rounded-2xl text-[13px] bg-card border border-border/50 hover:bg-muted/50 transition-colors"
                        style={{ borderColor: `${accent}20` }}>
                        <div className="flex items-center justify-center w-6 h-6 rounded-full shrink-0 font-black text-[11px] text-white" style={{ background: accent, boxShadow: `0 0 10px ${accent}80` }}>
                            {i + 1}
                        </div>
                        <div className="pt-0.5 text-muted-foreground w-full">
                            <MarkdownRenderer content={p} />
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
}

// ─── Array: D3-inspired bars with swap animation ──────────
function ArrayStep({ step, accent }: { step: VisualStep; accent: string }) {
    const arr = (step.arrays ?? [])[0];
    if (!arr) return null;
    const vals = arr.values ?? [];
    const nums = vals.map(v => Number(v));
    const isNumeric = nums.every(n => !isNaN(n) && n >= 0);

    return (
        <div className="flex flex-col items-center justify-center h-full gap-5 px-6 py-6 bg-muted/20">
            {arr.label && <p className="text-xs font-black text-muted-foreground uppercase tracking-widest">{arr.label}</p>}

            {isNumeric ? (
                <div className="w-full h-48 max-w-md bg-card rounded-3xl p-4 border border-border/50">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={vals.map((v, i) => ({ v, i, num: Number(v) }))}
                            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <XAxis dataKey="i" tick={{ fontSize: 11, fill: '#888' }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 11, fill: '#888' }} axisLine={false} tickLine={false} />
                            <Tooltip
                                cursor={{ fill: `${accent}10` }}
                                contentStyle={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', border: `1px solid ${accent}50`, fontSize: 12, borderRadius: 12, boxShadow: '0 10px 25px rgba(0,0,0,0.5)' }}
                                formatter={(v: number) => [v, 'Value']} />
                            <Bar dataKey="num" radius={[6, 6, 0, 0]} isAnimationActive animationDuration={800}>
                                {vals.map((_, i) => {
                                    const isHL = arr.highlight?.includes(i);
                                    const cust = arr.colors?.[String(i)];
                                    const fill = isHL ? (cust ? rc(cust) : accent) : `${accent}30`;
                                    return (
                                        <Cell key={i} fill={fill}
                                            style={isHL ? { filter: `drop-shadow(0 0 8px ${fill})` } : {}} />
                                    );
                                })}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            ) : (
                <div className="flex gap-3 flex-wrap justify-center max-w-md bg-card rounded-3xl p-6 border border-border/50">
                    {vals.map((v, i) => {
                        const isHL = arr.highlight?.includes(i);
                        const cust = arr.colors?.[String(i)];
                        const fill = isHL ? (cust ? rc(cust) : accent) : 'var(--muted)';
                        return (
                            <motion.div key={i}
                                initial={{ opacity: 0, y: -20, scale: 0.5 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                transition={{ delay: i * 0.05, type: 'spring', stiffness: 400, damping: 25 }}
                                className="flex flex-col items-center gap-2">
                                <div className="min-w-[56px] h-14 px-3 shrink-0 rounded-2xl flex items-center justify-center font-black text-sm border-2 relative overflow-hidden"
                                    style={isHL ? {
                                        background: fill, borderColor: fill, color: 'white',
                                        boxShadow: `0 10px 20px ${fill}60, inset 0 2px 10px rgba(255,255,255,0.3)`,
                                    } : { borderColor: 'var(--border)', background: fill }}>
                                    {isHL && <div className="absolute inset-0 bg-white/20" />}
                                    <span className="relative z-10 break-all text-center">{v}</span>
                                </div>
                                <span className="text-[10px] font-bold text-muted-foreground">IDX {i}</span>
                            </motion.div>
                        );
                    })}
                </div>
            )}

            {step.action && (
                <motion.div initial={{ opacity: 0, scale: 0.8, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ delay: 0.3 }}
                    className="px-6 py-2.5 rounded-full text-[13px] font-black text-white flex items-center gap-2 hover:opacity-90 transition-opacity"
                    style={{ background: `linear-gradient(to right, ${accent}, ${accent}dd)` }}>
                    ⚡ {step.action}
                </motion.div>
            )}
        </div>
    );
}

// ─── Tree: D3 auto-layout ─────────────────────────────────
function TreeStep({ step, accent }: { step: VisualStep; accent: string }) {
    const rawNodes = step.nodes ?? [];
    const rawEdges = step.edges ?? [];
    const hlSet = new Set(step.highlight_nodes ?? []);
    const W = 400, H = 280;

    const { laidOut } = useMemo(() => {
        if (!rawNodes.length) return { laidOut: [] };
        const childIds = new Set(rawEdges.map(e => e.to));
        const rootId = rawNodes.find(n => !childIds.has(n.id))?.id ?? rawNodes[0].id;
        const childMap: Record<number, number[]> = {};
        rawEdges.forEach(e => { (childMap[e.from] ??= []).push(e.to); });
        const nodeMap = Object.fromEntries(rawNodes.map(n => [n.id, n]));

        const buildTree = (id: number): d3.HierarchyNode<any> => {
            const children = (childMap[id] ?? []).map(buildTree);
            return { id, val: nodeMap[id]?.val ?? '?', children: children.length ? children : undefined } as any;
        };

        const root = d3.hierarchy(buildTree(rootId) as any);
        const treeLayout = d3.tree<any>().size([W - 80, H - 80]);
        treeLayout(root);

        return {
            laidOut: root.descendants().map(d => ({
                id: (d.data as any).id as number,
                val: (d.data as any).val as string,
                x: (d as any).x + 40,
                y: (d as any).y + 40,
                parent: d.parent ? { x: (d.parent as any).x + 40, y: (d.parent as any).y + 40 } : null,
            })),
        };
    }, [rawNodes, rawEdges]);

    return (
        <div className="flex flex-col items-center justify-center h-full gap-4 py-4 bg-muted/20">
            <div className="w-full max-w-lg bg-card rounded-3xl border border-border/50 flex justify-center py-4 shadow-sm">
                <svg width="100%" viewBox={`0 0 ${W} ${H}`} className="max-h-64 overflow-visible">
                    {/* edges */}
                    {laidOut.filter(n => n.parent).map((n, i) => (
                        <motion.line key={`edge-${i}`}
                            x1={n.parent!.x} y1={n.parent!.y} x2={n.x} y2={n.y}
                            stroke={accent} strokeOpacity="0.3" strokeWidth="3" strokeLinecap="round"
                            initial={{ pathLength: 0, opacity: 0 }}
                            animate={{ pathLength: 1, opacity: 1 }}
                            transition={{ delay: i * 0.05, duration: 0.5, ease: "easeOut" }}
                        />
                    ))}
                    {/* nodes */}
                    {laidOut.map((n, i) => {
                        const isHL = hlSet.has(n.id);
                        return (
                            <motion.g key={n.id}
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ delay: 0.1 + i * 0.05, type: 'spring', stiffness: 300, damping: 20 }}
                                style={{ transformOrigin: `${n.x}px ${n.y}px` }}>
                                <title>{n.val}</title>
                                {isHL && (
                                    <motion.circle cx={n.x} cy={n.y} r={34} fill={accent} opacity={0.15}
                                        animate={{ r: [32, 42, 32], opacity: [0.15, 0.3, 0.15] }} transition={{ repeat: Infinity, duration: 2 }} />
                                )}
                                <circle cx={n.x} cy={n.y} r={24}
                                    fill={isHL ? accent : 'var(--card)'}
                                    stroke={accent} strokeWidth={isHL ? 0 : 3}
                                    style={isHL ? { filter: `drop-shadow(0 8px 16px ${accent}80)` } : { filter: `drop-shadow(0 4px 6px rgba(0,0,0,0.2))` }} />
                                <text x={n.x} y={n.y + 5} textAnchor="middle" fontSize="11" fontWeight="900"
                                    fill={isHL ? 'white' : accent}>{n.val.length > 6 ? n.val.substring(0, 5) + '..' : n.val}</text>
                            </motion.g>
                        );
                    })}
                </svg>
            </div>
            {step.action && (
                <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
                    className="text-[13px] text-center px-6 py-2 rounded-full font-bold"
                    style={{ background: `${accent}15`, color: accent, border: `1px solid ${accent}30` }}>
                    🌳 {step.action}
                </motion.p>
            )}
        </div>
    );
}

// ─── Code: react-syntax-highlighter + animated cursor ─────
function CodeStep({ step, accent }: { step: VisualStep; accent: string }) {
    const lines = step.code ?? [];
    const hlSet = new Set(step.highlight ?? []);
    const [revealed, setRevealed] = useState(0);

    useEffect(() => {
        setRevealed(0);
        if (!lines.length) return;
        let i = 0;
        const t = setInterval(() => { i++; setRevealed(i); if (i >= lines.length) clearInterval(t); }, 200);
        return () => clearInterval(t);
    }, [step]);

    const fullCode = lines.join('\n');
    const lang = step.language ?? 'python';

    const customStyle = {
        ...atomOneDark,
        'hljs': { ...atomOneDark['hljs'], background: '#0a0a0f', fontSize: '12px', lineHeight: '24px', padding: '16px', borderRadius: '16px' },
    };

    return (
        <div className="flex flex-col h-full gap-3 px-6 py-4 bg-muted/20">
            {step.explanation && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                    className="px-4 py-3 bg-card rounded-2xl border border-border/50 shrink-0">
                    <div className="text-[12px] font-medium text-foreground/90 leading-relaxed">
                        <MarkdownRenderer content={step.explanation} />
                    </div>
                </motion.div>
            )}
            <div className="flex-1 overflow-hidden relative rounded-[20px] border" style={{ borderColor: `${accent}40` }}>
                <div className="absolute top-0 left-0 right-0 h-8 bg-black/40 border-b border-white/10 flex items-center px-4 gap-2 z-10 backdrop-blur-md">
                    <div className="w-3 h-3 rounded-full bg-rose-500" />
                    <div className="w-3 h-3 rounded-full bg-amber-500" />
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                    <span className="ml-2 text-[10px] text-white/50 font-mono tracking-widest uppercase font-bold">{lang}</span>
                </div>
                <div className="h-full pt-8 overflow-auto custom-scrollbar">
                    <SyntaxHighlighter language={lang} style={customStyle}
                        showLineNumbers lineNumberStyle={{ color: '#4a4a6c', fontSize: 11, minWidth: '2.5em', paddingRight: '1em' }}
                        wrapLines
                        lineProps={(lineNumber: number) => {
                            const i = lineNumber - 1;
                            const isHL = hlSet.has(i);
                            const isRevealed = i < revealed;
                            return {
                                style: {
                                    display: 'block',
                                    opacity: isRevealed ? 1 : 0.05,
                                    transition: 'all 0.3s',
                                    background: isHL ? `${accent}25` : 'transparent',
                                    borderLeft: isHL ? `4px solid ${accent}` : '4px solid transparent',
                                    boxShadow: isHL ? `inset 20px 0 20px -20px ${accent}` : 'none',
                                },
                            };
                        }}>
                        {fullCode}
                    </SyntaxHighlighter>
                </div>
                {revealed < lines.length && (
                    <motion.div className="absolute left-16 pointer-events-none w-2 h-5 rounded-sm z-20"
                        style={{ top: `${44 + revealed * 24}px`, background: accent, boxShadow: `0 0 10px ${accent}` }}
                        animate={{ opacity: [1, 0, 1] }} transition={{ repeat: Infinity, duration: 0.5 }} />
                )}
            </div>
        </div>
    );
}

// ─── Comparison: table + radar chart ─────────────────────
function ComparisonStep({ step, accent }: { step: VisualStep; accent: string }) {
    const rows = step.rows ?? [];
    const nums = rows.map(r => ({ subject: r.label, A: isNaN(Number(r.a)) ? 0 : Number(r.a), B: isNaN(Number(r.b)) ? 0 : Number(r.b) }));
    const hasNums = nums.some(n => n.A > 0 || n.B > 0);

    return (
        <div className="flex flex-col h-full gap-4 px-6 py-6 bg-muted/20">
            <div className="flex flex-col gap-1.5 shrink-0 bg-card rounded-3xl p-4 border border-border/50 shadow-sm">
                <div className="grid grid-cols-3 text-[11px] font-black uppercase tracking-widest text-muted-foreground px-2 mb-2">
                    <span>Metric</span>
                    <span className="text-center" style={{ color: accent }}>{step.col_a ?? 'A'}</span>
                    <span className="text-center" style={{ color: '#f97316' }}>{step.col_b ?? 'B'}</span>
                </div>
                {rows.slice(0, hasNums ? 4 : 8).map((row, i) => (
                    <motion.div key={i} initial={{ opacity: 0, x: -15 }} animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.08, type: 'spring' }}
                        className="grid grid-cols-3 py-2 px-3 rounded-xl text-[12px] items-center bg-card/50 border border-border/20 hover:bg-muted/50 transition-colors"
                        style={{ background: i % 2 === 0 ? `${accent}05` : 'transparent' }}>
                        <span className="text-foreground/80 font-semibold">{row.label}</span>
                        <span className={cn('text-center font-mono font-black', row.winner === 'a' ? 'text-green-500' : '')}>{row.a}</span>
                        <span className={cn('text-center font-mono font-black', row.winner === 'b' ? 'text-green-500' : '')}>{row.b}</span>
                    </motion.div>
                ))}
            </div>
            {hasNums && (
                <div className="flex-1 min-h-[200px] bg-card rounded-3xl p-2 border border-border/50">
                    <ResponsiveContainer width="100%" height="100%">
                        <RadarChart data={nums} margin={{ top: 10, right: 30, left: 30, bottom: 10 }}>
                            <PolarGrid stroke="var(--border)" strokeDasharray="3 3" />
                            <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: '#888', fontWeight: 'bold' }} />
                            <Radar name={step.col_a ?? 'A'} dataKey="A" stroke={accent} strokeWidth={2} fill={accent} fillOpacity={0.3} isAnimationActive />
                            <Radar name={step.col_b ?? 'B'} dataKey="B" stroke="#f97316" strokeWidth={2} fill="#f97316" fillOpacity={0.2} isAnimationActive />
                            <Tooltip 
                                contentStyle={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)', border: `1px solid ${accent}40`, fontSize: 12, borderRadius: 12, boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }} 
                                itemStyle={{ fontWeight: 'bold' }}
                            />
                        </RadarChart>
                    </ResponsiveContainer>
                </div>
            )}
        </div>
    );
}

// ─── Panel Shell ──────────────────────────────────────────
export function VisualizationPanel({ topic, subject = 'General', accent, uid }: { topic: string; subject?: string; accent: string; uid?: string; }) {
    const [data, setData] = useState<VisualizationData | null>(null);
    const [loading, setLoading] = useState(true);
    const [step, setStep] = useState(0);
    const [playing, setPlaying] = useState(false);
    const timer = useRef<NodeJS.Timeout | null>(null);
    const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

    useEffect(() => {
        setLoading(true); setStep(0); setPlaying(false); setData(null);
        fetch(`${API}/tutor/visualize`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ topic, subject, uid }),
        })
            .then(r => r.json())
            .then(d => { setData(d?.steps?.length ? d : null); setLoading(false); })
            .catch(() => setLoading(false));
    }, [topic]);

    useEffect(() => {
        if (!playing || !data) return;
        const n = data.steps.length;
        timer.current = setInterval(() => {
            setStep(s => { if (s >= n - 1) { setPlaying(false); return s; } return s + 1; });
        }, 5500);
        return () => { if (timer.current) clearInterval(timer.current); };
    }, [playing, data]);

    const steps = data?.steps ?? [];
    const cur = steps[step];
    const total = steps.length;

    const render = (s: VisualStep) => {
        switch (s.type) {
            case 'concept':    return <ConceptStep    step={s} accent={accent} />;
            case 'array_op':   return <ArrayStep      step={s} accent={accent} />;
            case 'tree_op':    return <TreeStep       step={s} accent={accent} />;
            case 'code':       return <CodeStep       step={s} accent={accent} />;
            case 'comparison': return <ComparisonStep step={s} accent={accent} />;
            default:           return <ConceptStep    step={s} accent={accent} />;
        }
    };

    return (
        <div className="flex flex-col h-full bg-background/50">
            {cur && (
                <div className="px-6 pt-5 pb-3 shrink-0 flex items-center gap-3">
                    <span className="text-[11px] font-black px-3 py-1 rounded-full text-white shadow-md flex items-center gap-1"
                        style={{ background: `linear-gradient(135deg, ${accent}, ${accent}90)` }}>
                        {cur.type.replace('_', ' ').toUpperCase()}
                    </span>
                    <h3 className="text-sm font-bold truncate text-foreground/90">{cur.title}</h3>
                </div>
            )}

            <div className="flex-1 relative overflow-hidden">
                {loading ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}>
                            <Loader2 className="w-10 h-10" style={{ color: accent }} />
                        </motion.div>
                        <p className="text-sm font-bold text-muted-foreground animate-pulse">Synthesizing Visuals...</p>
                    </div>
                ) : cur ? (
                    <AnimatePresence mode="wait">
                        <motion.div key={step}
                            initial={{ opacity: 0, x: 30, filter: 'blur(5px)' }} 
                            animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }} 
                            exit={{ opacity: 0, x: -30, filter: 'blur(5px)' }}
                            transition={{ duration: 0.35, ease: "easeOut" }}
                            className="absolute inset-0 overflow-auto custom-scrollbar">
                            {render(cur)}
                        </motion.div>
                    </AnimatePresence>
                ) : !loading && (
                    <div className="absolute inset-0 flex items-center justify-center text-sm font-medium text-muted-foreground">
                        Data insufficient for visualization.
                    </div>
                )}
            </div>

            {total > 1 && (
                <div className="flex justify-center gap-2 py-3 shrink-0">
                    {steps.map((_, i) => (
                        <button key={i} onClick={() => { setStep(i); setPlaying(false); }}
                            className="rounded-full transition-all duration-300"
                            style={{ width: i === step ? 24 : 8, height: 8, background: i === step ? accent : 'var(--border)', opacity: i === step ? 1 : 0.5 }} />
                    ))}
                </div>
            )}

            <div className="px-5 pb-5 pt-1 flex items-center justify-center gap-3 shrink-0">
                <button onClick={() => { setStep(0); setPlaying(false); }} disabled={loading}
                    className="p-2.5 rounded-xl bg-card border shadow-sm hover:bg-muted transition-colors disabled:opacity-40">
                    <RotateCcw className="w-4 h-4 text-muted-foreground" />
                </button>
                <button onClick={() => { setStep(s => Math.max(0, s - 1)); setPlaying(false); }}
                    disabled={step === 0 || loading}
                    className="p-2.5 rounded-xl bg-card border shadow-sm hover:bg-muted transition-colors disabled:opacity-40">
                    <ChevronLeft className="w-4 h-4" />
                </button>
                <button onClick={() => setPlaying(p => !p)} disabled={loading || total === 0}
                    className="px-6 py-2.5 rounded-xl font-black text-sm text-white flex items-center gap-2 disabled:opacity-40 shadow-lg hover:shadow-xl transition-all hover:scale-105 active:scale-95"
                    style={{ background: `linear-gradient(135deg, ${accent}, ${accent}dd)` }}>
                    {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    {playing ? 'PAUSE' : 'AUTOPLAY'}
                </button>
                <button onClick={() => { setStep(s => Math.min(total - 1, s + 1)); setPlaying(false); }}
                    disabled={step >= total - 1 || loading}
                    className="p-2.5 rounded-xl bg-card border shadow-sm hover:bg-muted transition-colors disabled:opacity-40">
                    <ChevronRight className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}
