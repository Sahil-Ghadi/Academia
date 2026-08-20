'use client';

import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Send, Bot, User, Sparkles, Globe, Loader2, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MarkdownRenderer } from '@/components/ui/MarkdownRenderer';
import { useMode } from '@/contexts/ModeContext';
import { API_BASE_URL } from '@/lib/api';
import { toast } from 'sonner';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: { source: string; url?: string }[];
}

interface MultilingualAITutorProps {
  subjects: string[];
}

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Español' },
  { code: 'hi', name: 'हिन्दी' },
  { code: 'fr', name: 'Français' },
  { code: 'zh', name: '中文' },
];

export function MultilingualAITutor({ subjects }: MultilingualAITutorProps) {
  const { user } = useMode();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Hello! I am your AI Tutor. I can help explain concepts step-by-step using open textbooks. Ask me anything about your subjects!',
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || !user?.uid) return;

    const userMessage = { id: Date.now().toString(), role: 'user' as const, content: inputValue };
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    try {
      // Pass the selected language and subjects context to the backend
      const response = await fetch(`${API_BASE_URL}/chat/tutor`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: user.uid,
          message: userMessage.content,
          language: selectedLanguage,
          context: `The student is currently studying the following subjects: ${subjects.join(', ')}. Please provide explanations relevant to their level.`
        })
      });

      if (!response.ok) throw new Error('Failed to get response');

      const data = await response.json();
      
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: data.response,
        citations: data.citations // Expected from backend
      }]);
    } catch (error) {
      console.error(error);
      toast.error('Failed to send message. Please try again.');
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-background/50 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10 bg-white/5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/20 text-primary">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-bold text-foreground flex items-center gap-2">
              Multilingual AI Tutor <Sparkles className="h-4 w-4 text-yellow-500" />
            </h2>
            <p className="text-xs text-muted-foreground">Grounded step-by-step explanations</p>
          </div>
        </div>
        
        {/* Language Selector */}
        <div className="flex items-center gap-2 bg-black/20 p-1.5 rounded-lg border border-white/5">
          <Globe className="h-4 w-4 text-muted-foreground ml-1" />
          <select 
            value={selectedLanguage}
            onChange={(e) => setSelectedLanguage(e.target.value)}
            className="bg-transparent text-sm text-foreground outline-none border-none cursor-pointer pr-2"
          >
            {LANGUAGES.map(lang => (
              <option key={lang.code} value={lang.code} className="bg-background text-foreground">{lang.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Context Tags (Subjects) */}
      {subjects.length > 0 && (
        <div className="flex items-center gap-2 p-2 px-4 border-b border-white/5 bg-black/10 overflow-x-auto no-scrollbar">
          <BookOpen className="h-3.5 w-3.5 text-primary/70 shrink-0" />
          <span className="text-xs text-muted-foreground shrink-0">Active Subjects:</span>
          {subjects.map(subject => (
            <span key={subject} className="px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 text-[10px] font-medium whitespace-nowrap">
              {subject}
            </span>
          ))}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.role === 'assistant' && (
              <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0 border border-primary/30 mt-1">
                <Bot className="h-4 w-4 text-primary" />
              </div>
            )}
            <div className={`max-w-[80%] rounded-2xl p-4 ${
              msg.role === 'user' 
                ? 'bg-primary text-primary-foreground rounded-tr-sm' 
                : 'bg-white/5 border border-white/10 text-foreground rounded-tl-sm'
            }`}>
              <MarkdownRenderer content={msg.content} />
              
              {/* Citations */}
              {msg.citations && msg.citations.length > 0 && (
                <div className="mt-3 pt-3 border-t border-white/10">
                  <p className="text-xs font-semibold text-primary/80 mb-1 flex items-center gap-1">
                    <BookOpen className="h-3 w-3" /> Sources
                  </p>
                  <div className="flex flex-col gap-1">
                    {msg.citations.map((cite, i) => (
                      <a 
                        key={i} 
                        href={cite.url || '#'} 
                        target="_blank" 
                        rel="noreferrer"
                        className="text-[10px] text-muted-foreground hover:text-primary transition-colors hover:underline truncate"
                      >
                        [{i + 1}] {cite.source}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
            {msg.role === 'user' && (
              <div className="h-8 w-8 rounded-full bg-zinc-800 flex items-center justify-center shrink-0 border border-white/10 mt-1">
                <User className="h-4 w-4 text-zinc-300" />
              </div>
            )}
          </motion.div>
        ))}
        {isTyping && (
          <div className="flex gap-3 justify-start">
            <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0 border border-primary/30">
              <Bot className="h-4 w-4 text-primary" />
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl rounded-tl-sm p-4 flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" />
              <div className="w-2 h-2 rounded-full bg-primary/60 animate-bounce delay-100" />
              <div className="w-2 h-2 rounded-full bg-primary/60 animate-bounce delay-200" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-3 border-t border-white/10 bg-black/20">
        <div className="flex items-center gap-2 relative">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={`Ask a question in ${LANGUAGES.find(l => l.code === selectedLanguage)?.name}...`}
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary/50 transition-colors"
          />
          <Button 
            type="submit" 
            disabled={!inputValue.trim() || isTyping}
            className="h-11 w-11 rounded-xl shrink-0 p-0"
          >
            {isTyping ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </form>
    </div>
  );
}
