'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Youtube, Loader2, PlayCircle, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { API_BASE_URL } from '@/lib/api';
import YouTube, { YouTubeEvent } from 'react-youtube';
import { useMode } from '@/contexts/ModeContext';
import { useGamification } from '@/contexts/GamificationContext';

interface VideoResource {
    id: string;
    title: string;
    thumbnail: string;
    duration: string;
    channel: string;
    link: string;
    viewCount: string;
}

interface YouTubeModalProps {
    isOpen: boolean;
    onClose: () => void;
    topic: string;
    subject: string;
}

export function YouTubeModal({ isOpen, onClose, topic, subject }: YouTubeModalProps) {
    const { user, mode } = useMode();
    const { awardXP } = useGamification();
    const [videos, setVideos] = useState<VideoResource[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Player state
    const [selectedVideo, setSelectedVideo] = useState<VideoResource | null>(null);
    const watchStartTime = useRef<number | null>(null);
    const totalWatchTimeSeconds = useRef<number>(0);

    useEffect(() => {
        if (isOpen && topic && subject) {
            fetchVideos();
            setSelectedVideo(null);
            totalWatchTimeSeconds.current = 0;
            watchStartTime.current = null;
        } else {
            setVideos([]);
            setLoading(true);
        }
    }, [isOpen, topic, subject]);

    const fetchVideos = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/learning/recommend`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ topic, subject })
            });

            if (!res.ok) throw new Error("Failed to fetch videos");

            const data = await res.json();
            setVideos(data);
        } catch (error) {
            console.error(error);
            toast.error("Failed to load video recommendations");
        } finally {
            setLoading(false);
        }
    };

    const handleVideoSelect = (video: VideoResource) => {
        setSelectedVideo(video);
        totalWatchTimeSeconds.current = 0;
        watchStartTime.current = null;
    };

    const sendTelemetry = async () => {
        if (!selectedVideo || !user?.uid) return;
        
        // If currently playing when closing, accumulate the time
        if (watchStartTime.current) {
            const currentSessionTime = (Date.now() - watchStartTime.current) / 1000;
            totalWatchTimeSeconds.current += currentSessionTime;
            watchStartTime.current = null;
        }

        const totalSeconds = Math.floor(totalWatchTimeSeconds.current);
        if (totalSeconds < 5) return; // Ignore very short clicks

        try {
            await fetch(`${API_BASE_URL}/learning/telemetry`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    uid: user.uid,
                    video_id: selectedVideo.id,
                    topic: topic,
                    subject: subject,
                    watch_time_seconds: totalSeconds,
                    mode: mode
                })
            });
            console.log(`Telemetry sent: Watched ${totalSeconds}s of ${selectedVideo.id} in ${mode} mode`);
        } catch (e) {
            console.error("Failed to send telemetry", e);
        }
    };

    const handleBackToGrid = async () => {
        await sendTelemetry();
        setSelectedVideo(null);
        totalWatchTimeSeconds.current = 0;
    };

    const handleClose = async () => {
        if (selectedVideo) {
            await sendTelemetry();
        }
        onClose();
    };

    // YouTube Event Handlers
    const onPlayerPlay = (event: YouTubeEvent) => {
        watchStartTime.current = Date.now();
    };

    const onPlayerPause = (event: YouTubeEvent) => {
        if (watchStartTime.current) {
            const currentSessionTime = (Date.now() - watchStartTime.current) / 1000;
            totalWatchTimeSeconds.current += currentSessionTime;
            watchStartTime.current = null;
        }
    };

    const onPlayerEnd = (event: YouTubeEvent) => {
        onPlayerPause(event);
        // Award XP for completing a video lesson
        awardXP('video_watched');
        toast.success('Lesson Completed! +15 XP');
    };

    const opts = {
        height: '100%',
        width: '100%',
        playerVars: {
            autoplay: 1,
            modestbranding: 1,
            rel: 0,
        },
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={handleClose}
                        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="w-full max-w-4xl bg-card border border-border rounded-2xl shadow-2xl overflow-hidden relative z-10 max-h-[85vh] flex flex-col"
                    >
                        {/* Header */}
                        <div className="p-6 border-b border-border flex justify-between items-center bg-card/50">
                            <div className="flex items-center gap-3">
                                {selectedVideo && (
                                    <button
                                        onClick={handleBackToGrid}
                                        className="p-2 hover:bg-accent rounded-full transition-colors text-muted-foreground hover:text-foreground"
                                    >
                                        <ArrowLeft className="h-5 w-5" />
                                    </button>
                                )}
                                <div>
                                    <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                                        <Youtube className="h-6 w-6 text-red-600" />
                                        {selectedVideo ? 'Learning Mode' : 'Recommended Videos'}
                                    </h2>
                                    <p className="text-muted-foreground text-sm mt-1">
                                        {selectedVideo 
                                            ? <span className="line-clamp-1">{selectedVideo.title}</span> 
                                            : <>Top picks for learning about <span className="text-primary font-medium">{topic}</span></>
                                        }
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={handleClose}
                                className="p-2 hover:bg-accent rounded-full transition-colors text-muted-foreground hover:text-foreground"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-6 bg-background min-h-[400px]">
                            {loading ? (
                                <div className="flex flex-col items-center justify-center h-64 gap-4">
                                    <Loader2 className="h-10 w-10 text-primary animate-spin" />
                                    <p className="text-muted-foreground">Curating best videos for you...</p>
                                </div>
                            ) : selectedVideo ? (
                                <div className="h-full flex flex-col gap-4">
                                    <div className="flex-1 rounded-xl overflow-hidden border border-border bg-black min-h-[400px]">
                                        <YouTube 
                                            videoId={selectedVideo.id} 
                                            opts={opts} 
                                            onPlay={onPlayerPlay}
                                            onPause={onPlayerPause}
                                            onEnd={onPlayerEnd}
                                            className="w-full h-full aspect-video"
                                            iframeClassName="w-full h-full"
                                        />
                                    </div>
                                    <div className="bg-card border border-border rounded-xl p-4 flex justify-between items-center">
                                        <div>
                                            <h3 className="font-bold text-foreground">{selectedVideo.title}</h3>
                                            <p className="text-muted-foreground text-sm">{selectedVideo.channel}</p>
                                        </div>
                                    </div>
                                </div>
                            ) : videos.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {videos.map((video) => (
                                        <div
                                            key={video.id}
                                            onClick={() => handleVideoSelect(video)}
                                            className="group relative bg-card border border-border rounded-xl overflow-hidden hover:border-primary/50 transition-all hover:shadow-xl hover:shadow-primary/5 cursor-pointer block"
                                        >
                                            <div className="aspect-video w-full relative overflow-hidden">
                                                <img
                                                    src={video.thumbnail}
                                                    alt={video.title}
                                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 opacity-90 group-hover:opacity-100"
                                                />
                                                <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                                    <div className="h-12 w-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/40 text-white opacity-0 group-hover:opacity-100 transform scale-75 group-hover:scale-100 transition-all duration-300">
                                                        <PlayCircle className="h-6 w-6 fill-white text-transparent" />
                                                    </div>
                                                </div>
                                                <div className="absolute bottom-2 right-2 bg-black/80 text-white text-[10px] font-bold px-1.5 py-0.5 rounded text-xs">
                                                    {video.duration}
                                                </div>
                                            </div>

                                            <div className="p-4 space-y-2">
                                                <h3 className="font-semibold text-card-foreground line-clamp-2 leading-tight group-hover:text-primary transition-colors">
                                                    {video.title}
                                                </h3>

                                                <div className="flex items-center justify-between text-xs text-muted-foreground mt-3 border-t border-border pt-3">
                                                    <span className="flex items-center gap-1.5 hover:text-foreground transition-colors">
                                                        <span className="font-medium truncate max-w-[120px]">{video.channel}</span>
                                                    </span>
                                                    <span className="bg-secondary px-2 py-0.5 rounded-full font-mono text-[10px] text-secondary-foreground">
                                                        {video.viewCount} views
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-64 text-center">
                                    <p className="text-muted-foreground mb-2">No videos found for this topic.</p>
                                    <button
                                        onClick={fetchVideos}
                                        className="text-primary hover:underline text-sm"
                                    >
                                        Try Again
                                    </button>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
