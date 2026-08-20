'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Save, GraduationCap, LogOut, Plus, X,
  Book, Rocket, Users, Copy, CheckCircle2, School,
} from 'lucide-react';
import { auth } from '@/lib/firebase';
import { DashboardLayout } from '@/components/DashboardLayout';
import { GlowCard } from '@/components/ui/GlowCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useMode } from '@/contexts/ModeContext';
import { toast } from 'sonner';
import { API_BASE_URL } from '@/lib/api';

export default function ProfilePage() {
  const { userProfile, setUserProfile, isOnboarded, isLoading, isAuthenticated, user } = useMode();
  const router = useRouter();

  const isTeacher = userProfile?.role === 'teacher';

  const [localSubjects, setLocalSubjects] = useState<string[]>([]);
  const [localInterests, setLocalInterests] = useState<string[]>([]);
  const [newSubject, setNewSubject] = useState('');
  const [newInterest, setNewInterest] = useState('');
  const [formProfile, setFormProfile] = useState<any>({});
  const [classroom, setClassroom] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  useEffect(() => {
    if (!isLoading && isAuthenticated && !isOnboarded) {
      router.push('/onboarding');
    }
  }, [isOnboarded, isLoading, router, isAuthenticated]);

  useEffect(() => {
    if (userProfile) {
      setLocalSubjects(userProfile.academicSubjects || []);
      setLocalInterests(userProfile.sideHustleInterests || []);
      setFormProfile({
        name: userProfile.name || '',
        college: userProfile.college || '',
        course: userProfile.course || '',
      });
    }
  }, [userProfile]);

  // Fetch classroom info for teachers
  useEffect(() => {
    if (isTeacher && user) {
      fetch(`${API_BASE_URL}/teacher/classroom/${user.uid}`)
        .then(r => r.json())
        .then(d => setClassroom(d.classroom))
        .catch(console.error);
    }
  }, [isTeacher, user]);

  // Fetch classroom for students who already joined
  useEffect(() => {
    if (!isTeacher && user && userProfile?.classroom_id) {
      fetch(`${API_BASE_URL}/teacher/classroom/${user.uid}`)
        .then(r => r.json())
        .then(d => setClassroom(d.classroom))
        .catch(console.error);
    }
  }, [isTeacher, user, userProfile?.classroom_id]);

  const handleJoinClassroom = async () => {
    if (!inviteCode.trim() || !user) return;
    setIsJoining(true);
    try {
      const res = await fetch(`${API_BASE_URL}/teacher/classroom/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: user.uid, invite_code: inviteCode.trim().toUpperCase() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Invalid invite code');
      toast.success(`✅ Joined "${data.classroom_name}" successfully!`);
      setInviteCode('');
      // Update local profile to reflect joined classroom
      if (userProfile) setUserProfile({ ...userProfile, classroom_id: data.classroom_id });
      // Re-fetch classroom info
      fetch(`${API_BASE_URL}/teacher/classroom/${user.uid}`)
        .then(r => r.json())
        .then(d => setClassroom(d.classroom))
        .catch(console.error);
    } catch (error: any) {
      toast.error(error.message || 'Failed to join classroom');
    } finally {
      setIsJoining(false);
    }
  };

  const handleCopyCode = () => {
    if (!classroom?.invite_code) return;
    navigator.clipboard.writeText(classroom.invite_code);
    setCopied(true);
    toast.success('Invite code copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAddSubject = () => {
    if (newSubject.trim() && !localSubjects.includes(newSubject.trim())) {
      setLocalSubjects([...localSubjects, newSubject.trim()]);
      setNewSubject('');
    }
  };

  const handleRemoveSubject = (subject: string) => {
    setLocalSubjects(localSubjects.filter(s => s !== subject));
  };

  const handleAddInterest = () => {
    if (newInterest.trim() && !localInterests.includes(newInterest.trim())) {
      setLocalInterests([...localInterests, newInterest.trim()]);
      setNewInterest('');
    }
  };

  const handleRemoveInterest = (interest: string) => {
    setLocalInterests(localInterests.filter(i => i !== interest));
  };

  const handleSave = async () => {
    if (!user) return;
    try {
      const updatedProfile = {
        ...userProfile,
        ...formProfile,
        uid: user.uid,
        academic_subjects: localSubjects,
        side_hustle_interests: localInterests,
      };
      const response = await fetch(`${API_BASE_URL}/profile/${user.uid}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedProfile),
      });
      if (!response.ok) throw new Error('Failed to update profile');
      const data = await response.json();
      setUserProfile({
        ...userProfile,
        ...data,
        academicSubjects: data.academic_subjects,
        sideHustleInterests: data.side_hustle_interests,
      } as any);
      toast.success('Profile updated successfully!');
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Failed to save profile changes');
    }
  };

  const handleLogout = async () => {
    try {
      await auth.signOut();
      if (user) localStorage.removeItem(`userProfile_${user.uid}`);
      router.push('/');
      toast.success('Signed out successfully');
    } catch {
      toast.error('Failed to sign out');
    }
  };

  if (isLoading || !isOnboarded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-pulse text-lg text-muted-foreground">Loading profile...</div>
      </div>
    );
  }

  return (
    <DashboardLayout
      title="My Profile"
      subtitle={isTeacher ? 'Manage your educator account' : 'Manage your personal information and learning focus'}
    >
      <div className="mx-auto max-w-5xl space-y-6">

        {/* Hero Profile Card */}
        <GlowCard className="p-0 overflow-hidden border-primary/20">
          <div className="relative h-32 bg-gradient-to-r from-primary/20 to-secondary/20">
            <div className="absolute inset-0 bg-grid-white/5 [mask-image:linear-gradient(0deg,transparent,black)]" />
            {isTeacher && (
              <div className="absolute top-4 right-4 bg-accent/20 border border-accent/30 text-accent text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider flex items-center gap-1.5">
                <GraduationCap className="h-3.5 w-3.5" /> Educator
              </div>
            )}
          </div>
          <div className="px-8 pb-8">
            <div className="relative flex justify-between items-end -mt-12 mb-6">
              <div className="flex items-end gap-6">
                <div className="h-24 w-24 rounded-2xl border-4 border-background bg-zinc-800 flex items-center justify-center shadow-xl">
                  <span className="text-3xl font-bold text-primary">
                    {userProfile?.name?.charAt(0).toUpperCase() || 'U'}
                  </span>
                </div>
                <div className="mb-2">
                  <h1 className="text-4xl font-bold">{userProfile?.name}</h1>
                  <div className="flex items-center gap-2 text-muted-foreground text-lg">
                    {isTeacher ? <Users className="h-5 w-5" /> : <GraduationCap className="h-5 w-5" />}
                    <span>
                      {isTeacher
                        ? `${userProfile?.college} • Teacher`
                        : `${userProfile?.college} • ${userProfile?.course}`}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" value={formProfile.name || ''} onChange={(e) => setFormProfile({ ...formProfile, name: e.target.value })} className="bg-muted/50" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="college">Institution</Label>
                <Input id="college" value={formProfile.college || ''} onChange={(e) => setFormProfile({ ...formProfile, college: e.target.value })} className="bg-muted/50" />
              </div>
              {!isTeacher && (
                <div className="space-y-2">
                  <Label htmlFor="course">Major / Course</Label>
                  <Input id="course" value={formProfile.course || ''} onChange={(e) => setFormProfile({ ...formProfile, course: e.target.value })} className="bg-muted/50" />
                </div>
              )}
            </div>
          </div>
        </GlowCard>

        {/* Teacher: Classroom Info */}
        {isTeacher && classroom && (
          <GlowCard delay={0.1}>
            <div className="mb-6 flex items-center gap-3">
              <div className="icon-container">
                <School className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="font-heading text-lg font-bold">Your Classroom</h2>
                <p className="text-xs text-muted-foreground">Share the code with students to join</p>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="bg-muted/40 rounded-xl p-4 border border-border">
                <p className="text-xs font-black uppercase tracking-wider text-muted-foreground mb-1">Name</p>
                <p className="font-bold text-foreground">{classroom.name}</p>
              </div>
              <div className="bg-muted/40 rounded-xl p-4 border border-border">
                <p className="text-xs font-black uppercase tracking-wider text-muted-foreground mb-1">Subject</p>
                <p className="font-bold text-foreground">{classroom.subject}</p>
              </div>
              <div className="bg-muted/40 rounded-xl p-4 border border-border flex items-center justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-wider text-muted-foreground mb-1">Invite Code</p>
                  <p className="font-mono font-bold text-lg tracking-widest text-foreground">{classroom.invite_code}</p>
                </div>
                <button onClick={handleCopyCode} className="h-9 w-9 bg-primary/10 text-primary rounded-lg flex items-center justify-center hover:bg-primary/20 transition-colors">
                  {copied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </GlowCard>
        )}

        {/* Students-only: Join Classroom */}
        {!isTeacher && (
          <GlowCard delay={0.05}>
            <div className="mb-5 flex items-center gap-3">
              <div className="icon-container">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="font-heading text-lg font-bold">Classroom</h2>
                <p className="text-xs text-muted-foreground">
                  {classroom ? 'You are enrolled in a classroom' : 'Join your teacher\'s classroom with an invite code'}
                </p>
              </div>
            </div>

            {classroom ? (
              <div className="grid gap-4 md:grid-cols-3">
                <div className="bg-muted/40 rounded-xl p-4 border border-border">
                  <p className="text-xs font-black uppercase tracking-wider text-muted-foreground mb-1">Classroom</p>
                  <p className="font-bold text-foreground">{classroom.name}</p>
                </div>
                <div className="bg-muted/40 rounded-xl p-4 border border-border">
                  <p className="text-xs font-black uppercase tracking-wider text-muted-foreground mb-1">Subject</p>
                  <p className="font-bold text-foreground">{classroom.subject}</p>
                </div>
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                  <p className="text-sm font-bold text-emerald-600">Enrolled</p>
                </div>
              </div>
            ) : (
              <div className="flex gap-3">
                <Input
                  placeholder="Enter invite code e.g. XK92AB"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === 'Enter' && handleJoinClassroom()}
                  maxLength={6}
                  className="h-12 bg-muted/50 rounded-xl font-mono tracking-widest uppercase text-base"
                />
                <Button
                  onClick={handleJoinClassroom}
                  disabled={isJoining || inviteCode.trim().length < 4}
                  className="h-12 px-6 rounded-xl font-bold shrink-0"
                >
                  {isJoining ? 'Joining...' : 'Join Class'}
                </Button>
              </div>
            )}
          </GlowCard>
        )}

        {/* Students-only: Academic Subjects + Side Hustle */}
        {!isTeacher && (
          <div className="grid gap-6 md:grid-cols-2">
            <GlowCard delay={0.1} className="h-full">
              <div className="mb-6 flex items-center gap-3">
                <div className="icon-container"><Book className="h-5 w-5 text-primary" /></div>
                <div>
                  <h2 className="font-heading text-lg font-bold">Academic Subjects</h2>
                  <p className="text-xs text-muted-foreground">Manage your current semester subjects</p>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Input placeholder="Add a subject (e.g. Data Structures)" value={newSubject} onChange={(e) => setNewSubject(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddSubject()} />
                  <Button onClick={handleAddSubject} size="icon" variant="secondary"><Plus className="h-4 w-4" /></Button>
                </div>
                <div className="flex flex-wrap gap-2 min-h-[100px] content-start">
                  {localSubjects.map((subject) => (
                    <div key={subject} className="flex items-center gap-1 bg-primary/10 text-primary border border-primary/20 px-3 py-1.5 rounded-full text-sm">
                      {subject}
                      <button onClick={() => handleRemoveSubject(subject)} className="hover:text-destructive transition-colors ml-1"><X className="h-3 w-3" /></button>
                    </div>
                  ))}
                  {localSubjects.length === 0 && <p className="text-sm text-muted-foreground italic">No subjects added yet.</p>}
                </div>
              </div>
            </GlowCard>

            <GlowCard delay={0.2} className="h-full">
              <div className="mb-6 flex items-center gap-3">
                <div className="icon-container"><Rocket className="h-5 w-5 text-[#a855f7]" /></div>
                <div>
                  <h2 className="font-heading text-lg font-bold">Side Hustle Interests</h2>
                  <p className="text-xs text-muted-foreground">Skills you want to monetize</p>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Input placeholder="Add an interest (e.g. Web Development)" value={newInterest} onChange={(e) => setNewInterest(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddInterest()} />
                  <Button onClick={handleAddInterest} size="icon" variant="secondary"><Plus className="h-4 w-4" /></Button>
                </div>
                <div className="flex flex-wrap gap-2 min-h-[100px] content-start">
                  {localInterests.map((interest) => (
                    <div key={interest} className="flex items-center gap-1 bg-[#a855f7]/10 text-[#a855f7] border border-[#a855f7]/20 px-3 py-1.5 rounded-full text-sm">
                      {interest}
                      <button onClick={() => handleRemoveInterest(interest)} className="hover:text-destructive transition-colors ml-1"><X className="h-3 w-3" /></button>
                    </div>
                  ))}
                  {localInterests.length === 0 && <p className="text-sm text-muted-foreground italic">No interests added yet.</p>}
                </div>
              </div>
            </GlowCard>
          </div>
        )}

        {/* Save Button */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-end pt-4">
          <Button onClick={handleSave} size="lg" className="min-w-[150px] gap-2 shadow-lg shadow-primary/25">
            <Save className="h-4 w-4" /> Save Profile
          </Button>
        </motion.div>

        {/* Sign Out */}
        <div className="mt-12 pt-8 border-t border-zinc-800 flex justify-center">
          <Button variant="destructive" onClick={handleLogout} className="gap-2 bg-red-500/10 text-red-500 hover:bg-red-500/20 hover:text-red-400 border border-red-500/50">
            <LogOut className="h-4 w-4" /> Sign Out
          </Button>
        </div>

      </div>
    </DashboardLayout>
  );
}
