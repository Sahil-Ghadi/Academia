'use client';

import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
    Bot,
    Target,
    Calendar,
    BarChart3,
    Briefcase,
    Code2,
    Cpu,
    TrendingUp
} from 'lucide-react';

const features = [
    {
        icon: Calendar,
        title: "AI Study Planner",
        description: "Dynamic schedules that adapt to your pace. Never miss an exam or a gig deadline.",
        className: "md:col-span-2",
    },
    {
        icon: Target,
        title: "Weak Area Detection",
        description: "Pinpoint gaps in your knowledge and get targeted exercises.",
        className: "md:col-span-1",
    },
    {
        icon: Briefcase,
        title: "Gig Marketplace",
        description: "Find side hustles that match your current skill level instantly.",
        className: "md:col-span-1",
    },
    {
        icon: Code2,
        title: "Project Generator",
        description: "Get ideas for portfolio projects based on market demand.",
        className: "md:col-span-2",
    },
    {
        icon: BarChart3,
        title: "Unified Analytics",
        description: "Track academic grades and freelance income in one dashboard.",
        className: "md:col-span-3",
    },
];

export function FeatureBento() {
    return (
        <div className="py-24 bg-zinc-950 text-white">
            <div className="container mx-auto px-6">
                <div className="text-center mb-16 max-w-2xl mx-auto">
                    <h2 className="text-3xl md:text-4xl font-bold mb-4">
                        Everything You Need. <br />
                        <span className="text-zinc-500">Nothing You Don't.</span>
                    </h2>
                    <p className="text-zinc-400">
                        A complete ecosystem designed to help you balance the pressure of grades with the ambition of earning.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-5xl mx-auto">
                    {features.map((feature, i) => (
                        <BentoCard key={i} feature={feature} index={i} />
                    ))}
                </div>
            </div>
        </div>
    );
}

function BentoCard({ feature, index }: { feature: any, index: number }) {
    const divRef = useRef<HTMLDivElement>(null);
    const [isFocused, setIsFocused] = useState(false);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [opacity, setOpacity] = useState(0);

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!divRef.current) return;

        const div = divRef.current;
        const rect = div.getBoundingClientRect();

        setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    };

    const handleFocus = () => {
        setIsFocused(true);
        setOpacity(1);
    };

    const handleBlur = () => {
        setIsFocused(false);
        setOpacity(0);
    };

    const handleMouseEnter = () => {
        setOpacity(1);
    };

    const handleMouseLeave = () => {
        setOpacity(0);
    };

    const isEven = index % 2 === 0;

    return (
        <motion.div
            ref={divRef}
            onMouseMove={handleMouseMove}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            viewport={{ once: true }}
            className={`relative overflow-hidden rounded-xl border p-8 ${feature.className} ${isEven
                ? "bg-white border-zinc-200"
                : "bg-zinc-900 border-zinc-800"
                }`}
        >
            <div
                className="pointer-events-none absolute -inset-px opacity-0 transition duration-300"
                style={{
                    opacity,
                    background: isEven
                        ? `radial-gradient(600px circle at ${position.x}px ${position.y}px, rgba(0,0,0,0.05), transparent 40%)`
                        : `radial-gradient(600px circle at ${position.x}px ${position.y}px, rgba(255,255,255,0.05), transparent 40%)`,
                }}
            />

            <div className="relative z-10">
                <div className={`mb-4 inline-flex items-center justify-center rounded-lg p-3 ${isEven ? "bg-primary/10" : "bg-[#a855f7]/10"
                    }`}>
                    <feature.icon className={`h-6 w-6 ${isEven ? "text-primary" : "text-[#a855f7]"}`} />
                </div>
                <h3 className={`mb-2 text-xl font-bold ${isEven ? "text-black" : "text-white"}`}>
                    {feature.title}
                </h3>
                <p className={`text-sm leading-relaxed ${isEven ? "text-zinc-600" : "text-zinc-400"}`}>
                    {feature.description}
                </p>
            </div>
        </motion.div>
    );
}
