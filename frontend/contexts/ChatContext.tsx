'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, onAuthStateChanged } from "firebase/auth";
import { auth } from '@/lib/firebase';
import { API_BASE_URL } from '@/lib/api';

interface StudyReminder {
    id: string;
    subject: string;
    topic: string;
    dueTime: Date;
    priority: 'high' | 'medium' | 'low';
    completed: boolean;
}

interface Deadline {
    id: string;
    title: string;
    dueDate: Date;
    category: 'exam' | 'assignment' | 'project';
    subject?: string;
}

interface ChatContextType {
    reminders: StudyReminder[];
    addReminder: (reminder: Omit<StudyReminder, 'id' | 'completed'>) => void;
    completeReminder: (id: string) => void;
    deleteReminder: (id: string) => void;
    deadlines: Deadline[];
    addDeadline: (deadline: Omit<Deadline, 'id'>) => void;
    deleteDeadline: (id: string) => void;
    chatHistory: { role: 'user' | 'assistant'; content: string }[];
    addToChatHistory: (message: { role: 'user' | 'assistant'; content: string }) => void;
    clearChatHistory: () => void;
    refreshData: () => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: ReactNode }) {
    const [reminders, setReminders] = useState<StudyReminder[]>([]);
    const [deadlines, setDeadlines] = useState<Deadline[]>([]);
    const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
    const [user, setUser] = useState<User | null>(null);

    // Listen to auth changes
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
            setUser(firebaseUser);
        });
        return () => unsubscribe();
    }, []);

    // Fetch reminders and deadlines when user is authenticated
    useEffect(() => {
        if (user) {
            fetchReminders();
            fetchDeadlines();
        }
    }, [user]);

    const fetchReminders = async () => {
        if (!user) return;

        try {
            const response = await fetch(`${API_BASE_URL}/dashboard/reminders/${user.uid}`);
            if (response.ok) {
                const data = await response.json();
                const formattedReminders = data.reminders.map((r: any) => ({
                    ...r,
                    dueTime: new Date(r.dueTime)
                }));
                setReminders(formattedReminders);
            }
        } catch (err) {
            console.error('Error fetching reminders:', err);
        }
    };

    const fetchDeadlines = async () => {
        if (!user) return;

        try {
            const response = await fetch(`${API_BASE_URL}/dashboard/deadlines/${user.uid}`);
            if (response.ok) {
                const data = await response.json();
                const formattedDeadlines = data.deadlines.map((d: any) => ({
                    ...d,
                    dueDate: new Date(d.dueDate)
                }));
                setDeadlines(formattedDeadlines);
            }
        } catch (err) {
            console.error('Error fetching deadlines:', err);
        }
    };

    const refreshData = () => {
        fetchReminders();
        fetchDeadlines();
    };

    const addReminder = (reminder: Omit<StudyReminder, 'id' | 'completed'>) => {
        const newReminder: StudyReminder = {
            ...reminder,
            id: Date.now().toString(),
            completed: false,
        };
        setReminders(prev => [...prev, newReminder]);
    };

    const completeReminder = (id: string) => {
        setReminders(prev =>
            prev.map(r => (r.id === id ? { ...r, completed: true } : r))
        );
    };

    const deleteReminder = (id: string) => {
        setReminders(prev => prev.filter(r => r.id !== id));
    };

    const addDeadline = (deadline: Omit<Deadline, 'id'>) => {
        const newDeadline: Deadline = {
            ...deadline,
            id: Date.now().toString(),
        };
        setDeadlines(prev => [...prev, newDeadline]);
    };

    const deleteDeadline = (id: string) => {
        setDeadlines(prev => prev.filter(d => d.id !== id));
    };

    const addToChatHistory = (message: { role: 'user' | 'assistant'; content: string }) => {
        setChatHistory(prev => [...prev, message]);
    };

    const clearChatHistory = () => {
        setChatHistory([]);
    };

    return (
        <ChatContext.Provider
            value={{
                reminders,
                addReminder,
                completeReminder,
                deleteReminder,
                deadlines,
                addDeadline,
                deleteDeadline,
                chatHistory,
                addToChatHistory,
                clearChatHistory,
                refreshData,
            }}
        >
            {children}
        </ChatContext.Provider>
    );
}

export function useChatContext() {
    const context = useContext(ChatContext);
    if (context === undefined) {
        throw new Error('useChatContext must be used within a ChatProvider');
    }
    return context;
}
