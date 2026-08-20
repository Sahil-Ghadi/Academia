'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import {
  Bot,
  GraduationCap,
  Rocket,
  ArrowRight,
  Sparkles,
  Brain,
  Target,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const features = [
  {
    icon: Brain,
    title: 'AI-Powered Planning',
    description: 'Autonomous agents analyze your progress and create optimal study schedules.'
  },
  {
    icon: Target,
    title: 'Weakness Detection',
    description: 'Automatically identifies and prioritizes areas needing improvement.'
  },
  {
    icon: Zap,
    title: 'Real-time Adaptation',
    description: 'System adjusts workload based on upcoming exams and deadlines.'
  },
];

const modeComparison = [
  {
    mode: 'academic',
    icon: GraduationCap,
    title: 'Academic Mode',
    description: 'Focus on college coursework, exams, and syllabus completion.',
    features: ['Study plan generation', 'Exam preparation', 'Weak topic analysis', 'Performance tracking'],
    color: 'from-blue-500 to-cyan-500'
  },
  {
    mode: 'side-hustle',
    icon: Rocket,
    title: 'Side Hustle Mode',
    description: 'Build marketable skills like coding, AI, and design.',
    features: ['Skill progress tracking', 'Project assignments', 'Learning source mapping', 'Portfolio readiness'],
    color: 'from-purple-500 to-pink-500'
  },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="container mx-auto flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
              <Bot className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-heading text-xl font-bold">LearnAI Orchestrator</span>
          </div>
          <Link href="/onboarding">
            <Button className="gap-2">
              Get Started <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-32 pb-20">
        {/* Background decoration */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute left-1/4 top-1/4 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute right-1/4 bottom-1/4 h-96 w-96 rounded-full bg-accent/10 blur-3xl" />
        </div>

        <div className="container mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm">
              <Sparkles className="h-4 w-4 text-primary" />
              <span>AI-Powered Autonomous Learning</span>
            </div>

            <h1 className="mb-6 font-heading text-5xl font-bold leading-tight md:text-7xl">
              <span className="gradient-text">Dual-Mode</span> Learning
              <br />
              Orchestrator
            </h1>

            <p className="mx-auto mb-10 max-w-2xl text-lg text-muted-foreground md:text-xl">
              Balance academics and side hustle skills with autonomous AI agents that plan,
              adapt, and optimize your learning journey in real-time.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-4">
              <Link href="/onboarding">
                <Button size="lg" className="gap-2 text-lg">
                  Get Started Free <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
              <Button variant="outline" size="lg" className="gap-2 text-lg">
                Watch Demo
              </Button>
            </div>
          </motion.div>

          {/* Dashboard Preview */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="mt-16"
          >
            <div className="relative mx-auto max-w-5xl overflow-hidden rounded-2xl border border-border shadow-2xl">
              <div className="flex items-center gap-2 border-b border-border bg-card px-4 py-3">
                <div className="h-3 w-3 rounded-full bg-destructive/60" />
                <div className="h-3 w-3 rounded-full bg-accent/60" />
                <div className="h-3 w-3 rounded-full bg-primary/60" />
                <span className="ml-4 text-sm text-muted-foreground">LearnAI Dashboard</span>
              </div>
              <div className="bg-gradient-to-br from-primary/10 via-accent/5 to-background p-8 min-h-[300px] flex items-center justify-center">
                <div className="text-center">
                  <Bot className="h-16 w-16 text-primary mx-auto mb-4" />
                  <p className="text-lg text-muted-foreground">AI-Powered Learning Dashboard</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="border-t border-border bg-muted/30 py-24">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="mb-16 text-center"
          >
            <h2 className="mb-4 font-heading text-4xl font-bold">What Makes It Different</h2>
            <p className="mx-auto max-w-2xl text-muted-foreground">
              This isn&apos;t a chatbot. It&apos;s an agentic system that makes autonomous decisions
              about your learning path.
            </p>
          </motion.div>

          <div className="grid gap-8 md:grid-cols-3">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="feature-card"
                >
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="mb-2 font-heading text-xl font-bold">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Mode Comparison Section */}
      <section className="py-24">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="mb-16 text-center"
          >
            <h2 className="mb-4 font-heading text-4xl font-bold">Two Modes, One System</h2>
            <p className="mx-auto max-w-2xl text-muted-foreground">
              Switch between academic focus and skill-building with a single toggle.
              The entire dashboard transforms to match your current priority.
            </p>
          </motion.div>

          <div className="grid gap-8 md:grid-cols-2">
            {modeComparison.map((item, index) => {
              const Icon = item.icon;
              return (
                <motion.div
                  key={item.mode}
                  initial={{ opacity: 0, x: index === 0 ? -20 : 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  className="overflow-hidden rounded-2xl border border-border bg-card"
                >
                  <div className={`bg-gradient-to-r ${item.color} p-6`}>
                    <div className="flex items-center gap-3">
                      <Icon className="h-8 w-8 text-white" />
                      <h3 className="font-heading text-2xl font-bold text-white">{item.title}</h3>
                    </div>
                  </div>
                  <div className="p-6">
                    <p className="mb-4 text-muted-foreground">{item.description}</p>
                    <ul className="space-y-3">
                      {item.features.map((feature) => (
                        <li key={feature} className="flex items-center gap-2">
                          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/20">
                            <div className="h-2 w-2 rounded-full bg-primary" />
                          </div>
                          <span className="text-sm">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="border-t border-border bg-muted/30 py-24">
        <div className="container mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="mb-4 font-heading text-4xl font-bold">Ready to Transform Your Learning?</h2>
            <p className="mx-auto mb-8 max-w-2xl text-muted-foreground">
              Join students who are already balancing academics and side hustles with AI-powered orchestration.
            </p>
            <Link href="/onboarding">
              <Button size="lg" className="gap-2 text-lg">
                Get Started Now <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="container mx-auto px-6">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary" />
              <span className="font-heading font-bold">LearnAI Orchestrator</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2025 Dual-Mode Learning Orchestrator. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
