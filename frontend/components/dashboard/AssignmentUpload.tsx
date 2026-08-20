'use client';

import { useState, useEffect } from 'react';
import { Upload, FileText, CheckCircle2, AlertCircle, Loader2, Clock, Youtube } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { GlowCard } from '@/components/ui/GlowCard';
import { toast } from 'sonner';
import { useMode } from '@/contexts/ModeContext';
import { YouTubeModal } from '@/components/dashboard/SideHustle/YouTubeModal';
import { API_BASE_URL } from '@/lib/api';

interface TodoItem {
    id: string;
    task: string;
    estimated_time: string;
    priority: 'High' | 'Medium' | 'Low';
    completed: boolean;
}

interface AssignmentResponse {
    id: string;
    title: string;
    summary: string;
    todos: TodoItem[];
}

export function AssignmentUpload() {
    const { user } = useMode();
    const [isDragging, setIsDragging] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [assignmentData, setAssignmentData] = useState<AssignmentResponse | null>(null);
    const [selectedVideoTopic, setSelectedVideoTopic] = useState<string | null>(null);
    const [selectedVideoSubject, setSelectedVideoSubject] = useState<string>('Education');

    // Load latest assignment on mount
    useEffect(() => {
        const fetchAssignments = async () => {
            if (!user?.uid) return;
            try {
                const res = await fetch(`${API_BASE_URL}/assignments/${user.uid}`);
                if (res.ok) {
                    const data = await res.json();
                    if (data && data.length > 0) {
                        setAssignmentData(data[0]); // Load the most recent one
                    }
                }
            } catch (error) {
                console.error("Failed to load assignments", error);
            }
        };
        fetchAssignments();
    }, [user?.uid]);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        const files = e.dataTransfer.files;
        if (files.length > 0 && files[0].type === 'application/pdf') {
            await uploadFile(files[0]);
        } else {
            toast.error('Please upload a PDF file');
        }
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            await uploadFile(e.target.files[0]);
        }
    };

    const toggleTodo = async (todoId: string, currentStatus: boolean) => {
        if (!assignmentData || !user?.uid) return;

        // Optimistic update
        const updatedTodos = assignmentData.todos.map(t =>
            t.id === todoId ? { ...t, completed: !currentStatus } : t
        );
        setAssignmentData({ ...assignmentData, todos: updatedTodos });

        try {
            await fetch(`${API_BASE_URL}/assignments/${user.uid}/${assignmentData.id}/todo/${todoId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ completed: !currentStatus })
            });
        } catch (error) {
            console.error("Failed to update status", error);
            toast.error("Failed to save progress");
            // Revert on error
            setAssignmentData({ ...assignmentData, todos: assignmentData.todos });
        }
    };

    const uploadFile = async (file: File) => {
        if (!user?.uid) {
            toast.error("Please log in first");
            return;
        }

        setIsUploading(true);
        const formData = new FormData();
        formData.append('file', file);
        formData.append('uid', user.uid);

        try {
            const response = await fetch(`${API_BASE_URL}/assignments/upload`, {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) throw new Error('Failed to process assignment');

            const data = await response.json();
            setAssignmentData(data);
            toast.success('Assignment processed successfully!');
        } catch (error) {
            console.error(error);
            toast.error('Failed to process assignment');
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="h-full flex flex-col">
            <div className="mb-4 flex items-center justify-between">
                <h3 className="font-heading font-bold text-lg flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    Assignment Analyzer
                </h3>
                {assignmentData && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setAssignmentData(null)}
                        className="text-muted-foreground hover:text-foreground"
                    >
                        Upload New
                    </Button>
                )}
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto pr-2 custom-scrollbar">
                <AnimatePresence mode="wait">
                    {!assignmentData ? (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className={`
                border-2 border-dashed rounded-xl p-8 text-center transition-colors
                flex flex-col items-center justify-center h-full min-h-[200px]
                ${isDragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}
              `}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                        >
                            {isUploading ? (
                                <div className="flex flex-col items-center gap-4">
                                    <div className="relative">
                                        <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
                                        <Loader2 className="h-12 w-12 animate-spin text-primary relative z-10" />
                                    </div>
                                    <div className="space-y-1">
                                        <p className="font-medium">Analyzing Assignment...</p>
                                        <p className="text-xs text-muted-foreground">Extracting tasks & estimates</p>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                                        <Upload className="h-6 w-6 text-primary" />
                                    </div>
                                    <h4 className="font-medium mb-1">Upload Assignment PDF</h4>
                                    <p className="text-xs text-muted-foreground mb-4 max-w-[200px]">
                                        Drag & drop your assignment PDF here to generate an AI todo list
                                    </p>
                                    <Button variant="outline" size="sm" className="relative group overflow-hidden border-primary/20 hover:border-primary/50">
                                        <input
                                            type="file"
                                            accept=".pdf"
                                            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-50"
                                            onChange={handleFileSelect}
                                        />
                                        <span className="relative z-10 flex items-center gap-2 pointer-events-none">
                                            Select File
                                        </span>
                                        <div className="absolute inset-0 bg-primary/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                                    </Button>
                                </>
                            )}
                        </motion.div>
                    ) : (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="space-y-3"
                        >
                            <div className="space-y-3">
                                {assignmentData.todos.map((todo) => {
                                    const isCompleted = todo.completed;
                                    return (
                                        <motion.div
                                            key={todo.id}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: 0.05 }}
                                            onClick={() => toggleTodo(todo.id, isCompleted)}
                                            className={`
                                                relative overflow-hidden
                                                flex items-start gap-4 p-4 rounded-xl border transition-all duration-300 cursor-pointer group
                                                ${isCompleted
                                                    ? 'bg-primary/5 border-primary/20'
                                                    : 'bg-card border-border hover:border-primary/40 hover:shadow-sm hover:translate-x-1'}
                                            `}
                                        >
                                            <div className={`
                                                mt-1 h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors duration-300
                                                ${isCompleted
                                                    ? 'bg-primary border-primary text-primary-foreground'
                                                    : 'border-muted-foreground/30 group-hover:border-primary/70'}
                                            `}>
                                                <CheckCircle2 className={`h-3.5 w-3.5 transition-transform duration-300 ${isCompleted ? 'scale-100' : 'scale-0'}`} />
                                            </div>

                                            <div className="flex-1 min-w-0 z-10">
                                                <div className="flex items-start justify-between gap-4">
                                                    <p className={`text-sm font-medium leading-relaxed mb-2 transition-all duration-300 ${isCompleted ? 'text-muted-foreground line-through decoration-primary/50' : 'text-foreground'}`}>
                                                        {todo.task}
                                                    </p>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setSelectedVideoTopic(todo.task);
                                                            setSelectedVideoSubject("Education");
                                                        }}
                                                        className="h-8 w-8 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 shrink-0"
                                                        title="Watch related videos"
                                                    >
                                                        <Youtube className="h-4 w-4" />
                                                    </Button>
                                                </div>

                                                <div className="flex flex-wrap items-center gap-2 text-[11px]">
                                                    <span className="flex items-center gap-1 bg-secondary/50 px-2 py-1 rounded-md text-secondary-foreground/80 font-medium">
                                                        <Clock className="h-3 w-3" />
                                                        {todo.estimated_time}
                                                    </span>

                                                    <span className={`
                                                        px-2 py-1 rounded-md font-medium border
                                                        ${todo.priority === 'High' ? 'border-red-500/20 bg-red-500/5 text-red-600 dark:text-red-400' :
                                                            todo.priority === 'Medium' ? 'border-yellow-500/20 bg-yellow-500/5 text-yellow-600 dark:text-yellow-400' :
                                                                'border-green-500/20 bg-green-500/5 text-green-600 dark:text-green-400'}
                                                    `}>
                                                        {todo.priority} Priority
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Subtle completion gradient overlay */}
                                            {isCompleted && (
                                                <div className="absolute inset-0 bg-accent/20 pointer-events-none" />
                                            )}
                                        </motion.div>
                                    );
                                })}
                            </div>

                            {assignmentData.todos.length > 0 && (
                                <div className="pt-2 flex justify-end">
                                    <p className="text-xs text-muted-foreground">
                                        {assignmentData.todos.filter(t => t.completed).length}/{assignmentData.todos.length} tasks completed
                                    </p>
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <YouTubeModal
                isOpen={!!selectedVideoTopic}
                onClose={() => setSelectedVideoTopic(null)}
                topic={selectedVideoTopic || ""}
                subject={selectedVideoSubject}
            />
        </div>
    );
}
