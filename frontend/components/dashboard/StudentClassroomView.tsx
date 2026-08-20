"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen, FlaskConical, ChevronRight, CheckCircle2,
  XCircle, Loader2, Clock, Sparkles, Trophy, ArrowRight, ArrowLeft,
  FileText, Zap
} from "lucide-react";
import { API_BASE_URL } from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";

interface Post {
  id: string; title: string; body: string; subject: string;
  created_at: string; has_test: boolean; test_id?: string;
  my_score?: number | null;
}
interface Question { question: string; options: string[]; correct: string; explanation: string; }
interface TestData { id: string; title: string; difficulty: string; num_questions: number; questions: Question[]; }

// ─── One-at-a-time Quiz Player ────────────────────────────────────────────────
function QuizPlayer({ test, cid, uid, onComplete }: {
  test: TestData; cid: string; uid: string; onComplete: (score: number) => void;
}) {
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [results, setResults] = useState<{ correct: number; total: number; pct: number } | null>(null);
  const [reviewIdx, setReviewIdx] = useState(0);

  const q = test.questions[current];
  const total = test.questions.length;
  const answered = Object.keys(answers).length;
  const selectedNow = answers[current];

  const handleSelect = (letter: string) => {
    if (submitted) return;
    setAnswers((prev) => ({ ...prev, [current]: letter }));
  };

  const handleSubmit = async () => {
    let correct = 0;
    test.questions.forEach((q, i) => { if (answers[i] === q.correct) correct++; });
    const pct = Math.round((correct / total) * 100);
    setResults({ correct, total, pct });
    setSubmitted(true);
    setReviewIdx(0);
    try {
      await fetch(`${API_BASE_URL}/teacher/classroom/${cid}/tests/${test.id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid, score_pct: pct, correct, total }),
      });
    } catch { /* non-critical */ }
    onComplete(pct);
  };

  // ── Results screen ──────────────────────────────────────────────────────────
  if (submitted && results) {
    const rq = test.questions[reviewIdx];
    const userAns = answers[reviewIdx];
    const isCorrect = userAns === rq.correct;
    const color = results.pct >= 70 ? "blue" : results.pct >= 50 ? "amber" : "rose";

    return (
      <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="space-y-5">
        {/* Score Hero */}
        <div className={cn(
          "rounded-2xl p-6 text-center border-2 relative overflow-hidden shadow-sm",
          color === "blue" ? "bg-blue-500/10 border-blue-500/30"
            : color === "amber" ? "bg-amber-500/10 border-amber-500/30"
            : "bg-rose-500/10 border-rose-500/30"
        )}>
          <div className="absolute inset-0 opacity-5" style={{ backgroundImage: "radial-gradient(circle, currentColor 1px, transparent 1px)", backgroundSize: "20px 20px" }} />
          <Trophy className={cn("h-12 w-12 mx-auto mb-3",
            color === "blue" ? "text-blue-500" : color === "amber" ? "text-amber-500" : "text-rose-500"
          )} />
          <p className="text-6xl font-black mb-1 tracking-tight">{results.pct}%</p>
          <p className="font-semibold text-muted-foreground">{results.correct} / {results.total} correct</p>
          <p className={cn("text-sm font-bold mt-2",
            color === "blue" ? "text-blue-600" : color === "amber" ? "text-amber-600" : "text-rose-600"
          )}>
            {results.pct >= 70 ? "🎉 Excellent work!" : results.pct >= 50 ? "👍 Good effort — review below" : "📚 Keep practicing — review below"}
          </p>
        </div>

        {/* Question Review — one at a time */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Review · Question {reviewIdx + 1} of {total}</p>
            <div className="flex gap-1.5 flex-wrap">
              {test.questions.map((_, i) => {
                const correct = answers[i] === test.questions[i].correct;
                return (
                  <button
                    key={i}
                    onClick={() => setReviewIdx(i)}
                    className={cn(
                      "w-6 h-6 rounded-full text-[10px] font-black transition-all",
                      i === reviewIdx ? "ring-2 ring-offset-1 ring-primary scale-110" : "",
                      correct ? "bg-blue-500 text-white" : "bg-rose-500 text-white"
                    )}
                  >{i + 1}</button>
                );
              })}
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={reviewIdx}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.18 }}
              className={cn("rounded-2xl border-2 p-5 space-y-3",
                isCorrect ? "border-blue-500/30 bg-blue-500/5 shadow-sm shadow-blue-500/5" : "border-rose-500/30 bg-rose-500/5 shadow-sm shadow-rose-500/5"
              )}
            >
              <div className="flex items-start gap-2">
                {isCorrect
                  ? <CheckCircle2 className="h-5 w-5 text-blue-500 mt-0.5 shrink-0" />
                  : <XCircle className="h-5 w-5 text-rose-500 mt-0.5 shrink-0" />}
                <p className="font-bold text-sm">{reviewIdx + 1}. {rq.question}</p>
              </div>
              <div className="space-y-2 pl-7">
                {rq.options.map((opt, j) => {
                  const letter = ["A", "B", "C", "D"][j];
                  const isCorrectOpt = letter === rq.correct;
                  const isUserOpt = letter === userAns;
                  return (
                    <div key={j} className={cn(
                      "text-sm px-4 py-2.5 rounded-xl border font-medium transition-all",
                      isCorrectOpt ? "bg-blue-500/15 border-blue-500/40 text-blue-700"
                        : isUserOpt && !isCorrect ? "bg-rose-500/15 border-rose-500/40 text-rose-700 line-through opacity-80"
                        : "bg-muted/30 border-border text-muted-foreground"
                    )}>
                      <span className="font-black mr-2">{letter}.</span>{opt}
                    </div>
                  );
                })}
              </div>
              <div className="pl-7 text-xs italic text-muted-foreground border-t border-border/50 pt-3 mt-1">
                <span className="font-semibold text-primary mr-1">💡 Explanation:</span>{rq.explanation}
              </div>
            </motion.div>
          </AnimatePresence>

          <div className="flex gap-2 mt-3">
            <button
              onClick={() => setReviewIdx((i) => Math.max(0, i - 1))}
              disabled={reviewIdx === 0}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-border text-sm font-semibold hover:bg-muted/50 transition-colors disabled:opacity-30"
            >
              <ArrowLeft className="h-4 w-4" /> Prev
            </button>
            <button
              onClick={() => setReviewIdx((i) => Math.min(total - 1, i + 1))}
              disabled={reviewIdx === total - 1}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-border text-sm font-semibold hover:bg-muted/50 transition-colors disabled:opacity-30"
            >
              Next <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  // ── Taking screen — one question at a time ─────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-muted-foreground">Question {current + 1} of {total}</span>
          <span className={cn("font-black capitalize px-2.5 py-1 rounded-full",
            test.difficulty === "easy" ? "bg-blue-500/10 text-blue-600"
              : test.difficulty === "hard" ? "bg-rose-500/10 text-rose-600"
              : "bg-amber-500/10 text-amber-600"
          )}>{test.difficulty}</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden shadow-inner">
          <motion.div
            className="h-full bg-gradient-to-r from-primary/80 to-primary rounded-full shadow-sm"
            animate={{ width: `${((current + 1) / total) * 100}%` }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          />
        </div>
        {/* Dot indicators */}
        <div className="flex gap-1.5 justify-center pt-1">
          {test.questions.map((_, i) => (
            <div key={i} className={cn(
              "rounded-full transition-all duration-300",
              i === current ? "w-5 h-2 bg-primary" : answers[i] ? "w-2 h-2 bg-primary/40" : "w-2 h-2 bg-muted-foreground/20"
            )} />
          ))}
        </div>
      </div>

      {/* Question card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={current}
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -40 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          className="bg-gradient-to-br from-muted/40 to-card border-2 border-border rounded-2xl p-5 space-y-4 shadow-sm"
        >
          <div className="flex items-start gap-3">
            <span className="h-7 w-7 rounded-lg bg-primary text-primary-foreground text-xs font-black flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
              {current + 1}
            </span>
            <p className="text-base font-bold leading-snug">{q.question}</p>
          </div>

          <div className="space-y-2.5">
            {q.options.map((opt, j) => {
              const letter = ["A", "B", "C", "D"][j];
              const selected = selectedNow === letter;
              return (
                <motion.button
                  key={j}
                  onClick={() => handleSelect(letter)}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  className={cn(
                    "w-full text-left text-sm px-4 py-3.5 rounded-xl border-2 transition-all duration-200 font-medium flex items-center gap-3",
                    selected
                      ? "border-primary bg-primary/10 text-primary shadow-sm shadow-primary/10"
                      : "border-border bg-card hover:border-primary/40 hover:bg-muted/40"
                  )}
                >
                  <span className={cn(
                    "h-7 w-7 rounded-lg text-xs font-black flex items-center justify-center shrink-0 transition-colors",
                    selected ? "bg-primary text-primary-foreground shadow-inner" : "bg-muted text-muted-foreground"
                  )}>{letter}</span>
                  {opt}
                </motion.button>
              );
            })}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex gap-3">
        <button
          onClick={() => setCurrent((c) => Math.max(0, c - 1))}
          disabled={current === 0}
          className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-border text-sm font-bold hover:bg-muted/50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ArrowLeft className="h-4 w-4" /> Prev
        </button>

        {current < total - 1 ? (
          <button
            onClick={() => setCurrent((c) => c + 1)}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 text-sm font-bold transition-all shadow-sm"
          >
            Next <ArrowRight className="h-4 w-4" />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={answered < total}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-black transition-all",
              answered === total
                ? "bg-primary text-primary-foreground hover:opacity-90 shadow-md shadow-primary/20 active:scale-[0.98]"
                : "bg-muted text-muted-foreground cursor-not-allowed"
            )}
          >
            <Trophy className="h-4 w-4" />
            {answered < total ? `Answer all (${answered}/${total})` : "Submit Quiz"}
          </button>
        )}
      </div>

      {answered > 0 && current < total - 1 && (
        <p className="text-center text-xs text-muted-foreground font-medium">
          {answered} of {total} answered · {total - answered} remaining
        </p>
      )}
    </div>
  );
}

// ─── Student Classroom View ───────────────────────────────────────────────────
export function StudentClassroomView({ cid, uid, classroom }: {
  cid: string; uid: string; classroom: any;
}) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [expandedPost, setExpandedPost] = useState<string | null>(null);
  const [loadingTest, setLoadingTest] = useState<string | null>(null);
  const [activeTest, setActiveTest] = useState<{ postId: string; test: TestData } | null>(null);
  const [completedTests, setCompletedTests] = useState<Record<string, number>>({});
  const [postTabs, setPostTabs] = useState<Record<string, "notes" | "test">>({});

  const getTab = (postId: string): "notes" | "test" => postTabs[postId] ?? "notes";
  const setTab = (postId: string, tab: "notes" | "test") =>
    setPostTabs((prev) => ({ ...prev, [postId]: tab }));

  useEffect(() => { fetchPosts(); }, [cid, uid]);

  const fetchPosts = async () => {
    try {
      setLoadingPosts(true);
      const res = await fetch(`${API_BASE_URL}/teacher/classroom/${cid}/content${uid ? `?uid=${uid}` : ""}`);
      if (res.ok) {
        const data = await res.json();
        const fetched: Post[] = data.posts || [];
        setPosts(fetched);
        const preloaded: Record<string, number> = {};
        fetched.forEach((p) => { if (p.my_score !== null && p.my_score !== undefined) preloaded[p.id] = p.my_score; });
        setCompletedTests(preloaded);
      }
    } catch { toast.error("Failed to load classroom content"); }
    finally { setLoadingPosts(false); }
  };

  const handleStartTest = async (post: Post) => {
    if (!post.test_id) return;
    setLoadingTest(post.id);
    try {
      const res = await fetch(`${API_BASE_URL}/teacher/classroom/${cid}/tests/${post.test_id}`);
      if (!res.ok) throw new Error();
      const data: TestData = await res.json();
      setActiveTest({ postId: post.id, test: data });
      setExpandedPost(post.id);
    } catch { toast.error("Could not load test. Try again."); }
    finally { setLoadingTest(null); }
  };

  const handleTestComplete = (postId: string, score: number) => {
    setCompletedTests((prev) => ({ ...prev, [postId]: score }));
    setActiveTest(null);
    toast.success(`Submitted! You scored ${score}%`);
  };

  const completedCount = Object.keys(completedTests).length;
  const testCount = posts.filter((p) => p.has_test).length;

  return (
    <div className="space-y-6">
      {/* Header - Minimal & Professional Theme */}
      <div className="bg-card rounded-2xl p-6 md:p-8 border border-border/80 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center bg-primary/10 h-7 w-7 rounded-lg">
                <BookOpen className="h-3.5 w-3.5 text-primary" />
              </span>
              <span className="text-muted-foreground text-xs font-bold uppercase tracking-widest">{classroom.subject}</span>
            </div>
            <h3 className="text-2xl font-black text-foreground tracking-tight">{classroom.name}</h3>
            <p className="text-muted-foreground text-sm font-medium flex items-center gap-1.5">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary/60"></span>
              {classroom.student_count ?? "—"} classmates enrolled
            </p>
          </div>
          <span className="bg-muted text-foreground text-[10px] font-black px-3 py-1.5 rounded-full border border-border/80 uppercase tracking-wider shrink-0">
            Enrolled
          </span>
        </div>

        {/* Mini stats */}
        <div className="grid grid-cols-3 gap-3 md:gap-4 mt-8 pt-6 border-t border-border/50">
          {[
            { label: "Posts", value: posts.length, icon: FileText, color: "text-blue-500", bg: "bg-blue-500/10" },
            { label: "Tests", value: testCount, icon: FlaskConical, color: "text-violet-500", bg: "bg-violet-500/10" },
            { label: "Completed", value: completedCount, icon: Trophy, color: "text-amber-500", bg: "bg-amber-500/10" },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="bg-muted/30 rounded-2xl p-4 border border-border/50 hover:bg-muted/50 transition-colors flex flex-col sm:flex-row items-center gap-3 md:gap-4">
              <div className={cn("h-10 w-10 flex items-center justify-center rounded-xl shrink-0", bg)}>
                <Icon className={cn("h-4 w-4", color)} />
              </div>
              <div className="text-center sm:text-left">
                <p className="text-foreground font-black text-xl leading-none">{value}</p>
                <p className="text-muted-foreground text-[10px] font-bold mt-1 uppercase tracking-wider">{label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Content feed */}
      <div>
        <div className="flex items-center gap-2 mb-4 px-1">
          <div className="h-6 w-1 rounded-full bg-primary/60"></div>
          <p className="text-sm font-black uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            Classroom Content
          </p>
        </div>

        {loadingPosts ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-4 bg-card/50 rounded-3xl border border-border/50">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm font-medium">Loading contents...</p>
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-16 bg-card/50 text-muted-foreground border-2 border-dashed border-border/60 rounded-3xl">
            <div className="h-16 w-16 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-4">
              <BookOpen className="h-8 w-8 opacity-40" />
            </div>
            <p className="text-base font-bold text-foreground/80">No content available</p>
            <p className="text-sm mt-1">Your teacher hasn't posted anything yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => {
              const isExpanded = expandedPost === post.id;
              const testScore = completedTests[post.id];
              const isTestActive = activeTest?.postId === post.id;

              return (
                <div key={post.id} className="bg-card border border-border/80 rounded-2xl overflow-hidden shadow-sm hover:shadow-md hover:border-primary/20 transition-all duration-300">
                  <button
                    onClick={() => setExpandedPost(isExpanded ? null : post.id)}
                    className="w-full flex items-center justify-between p-4 md:p-5 hover:bg-muted/30 transition-colors text-left"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className={cn(
                        "w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-sm border",
                        testScore !== undefined ? "bg-blue-500/10 border-blue-500/20"
                          : post.has_test ? "bg-violet-500/10 border-violet-500/20"
                          : "bg-primary/10 border-primary/20"
                      )}>
                        {testScore !== undefined
                          ? <Trophy className="h-5 w-5 text-blue-500" />
                          : post.has_test
                          ? <FlaskConical className="h-5 w-5 text-violet-500" />
                          : <BookOpen className="h-5 w-5 text-primary" />}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-base truncate text-foreground/90">{post.title}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="text-[10px] font-bold bg-muted px-2 py-0.5 rounded-md text-muted-foreground tracking-wide">{post.subject}</span>
                          <span className="text-[11px] text-muted-foreground/80 flex items-center gap-1 font-medium">
                            <Clock className="h-3 w-3" />
                            {new Date(post.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                          </span>
                          {post.has_test && testScore !== undefined && (
                            <span className={cn("text-[10px] font-black px-2 py-0.5 rounded-md border",
                              testScore >= 70 ? "bg-blue-500/10 text-blue-600 border-blue-500/20"
                                : testScore >= 50 ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                                : "bg-rose-500/10 text-rose-600 border-rose-500/20"
                            )}>✓ {testScore}%</span>
                          )}
                          {post.has_test && testScore === undefined && (
                            <span className="text-[10px] bg-violet-500/10 text-violet-600 font-bold px-2 py-0.5 rounded-md border border-violet-500/20 animate-pulse">
                              Test Available
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className={cn("transition-transform duration-300 shrink-0 ml-3 bg-muted/50 p-1.5 rounded-lg", isExpanded && "rotate-90 bg-primary/10 text-primary")}>
                      <ChevronRight className="h-4 w-4" />
                    </div>
                  </button>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: "easeInOut" }}
                        className="overflow-hidden"
                      >
                        <div className="border-t border-border/80 bg-muted/20">
                          {/* Tab bar */}
                          <div className="flex border-b border-border/80 px-2 pt-2 gap-1 bg-muted/30">
                            <button
                              onClick={() => setTab(post.id, "notes")}
                              className={cn(
                                "flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-black uppercase tracking-wider transition-all rounded-t-xl",
                                getTab(post.id) === "notes"
                                  ? "text-primary bg-card shadow-sm border-t border-x border-border/80"
                                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50 border-t border-x border-transparent"
                              )}
                            >
                              <BookOpen className="h-3.5 w-3.5" /> Notes
                            </button>
                            {post.has_test && (
                              <button
                                onClick={() => {
                                  setTab(post.id, "test");
                                  if (!activeTest || activeTest.postId !== post.id) {
                                    if (completedTests[post.id] === undefined) {
                                      handleStartTest(post);
                                    }
                                  }
                                }}
                                className={cn(
                                  "flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-black uppercase tracking-wider transition-all rounded-t-xl",
                                  getTab(post.id) === "test"
                                    ? "text-violet-600 bg-card shadow-sm border-t border-x border-border/80"
                                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50 border-t border-x border-transparent"
                                )}
                              >
                                <FlaskConical className="h-3.5 w-3.5" />
                                Test
                                {completedTests[post.id] !== undefined && (
                                  <span className={cn(
                                    "text-[10px] font-black px-1.5 py-0.5 rounded-md",
                                    completedTests[post.id] >= 70 ? "bg-blue-500/10 text-blue-600"
                                      : completedTests[post.id] >= 50 ? "bg-amber-500/10 text-amber-600"
                                      : "bg-rose-500/10 text-rose-600"
                                  )}>
                                    {completedTests[post.id]}%
                                  </span>
                                )}
                                {completedTests[post.id] === undefined && (
                                  <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md bg-violet-500/10 text-violet-600">
                                    New
                                  </span>
                                )}
                              </button>
                            )}
                          </div>

                          {/* Tab content */}
                          <div className="p-5 md:p-6 bg-card min-h-[200px]">
                            <AnimatePresence mode="wait">
                              {getTab(post.id) === "notes" && (
                                <motion.div
                                  key="notes"
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: -10 }}
                                  transition={{ duration: 0.2 }}
                                  className="prose prose-sm md:prose-base dark:prose-invert max-w-none"
                                >
                                  <div className="bg-muted/20 rounded-2xl p-5 border border-border/50">
                                    <ReactMarkdown
                                      components={{
                                        h1: ({ children }) => <h1 className="text-2xl font-black text-foreground mb-3 mt-1 border-b border-border/60 pb-2">{children}</h1>,
                                        h2: ({ children }) => <h2 className="text-xl font-extrabold text-foreground mb-2 mt-4">{children}</h2>,
                                        h3: ({ children }) => <h3 className="text-base font-bold text-foreground mb-1.5 mt-3">{children}</h3>,
                                        p: ({ children }) => <p className="text-sm text-foreground/80 leading-relaxed mb-3">{children}</p>,
                                        ul: ({ children }) => <ul className="list-disc list-inside space-y-1 mb-3 text-sm text-foreground/80 pl-2">{children}</ul>,
                                        ol: ({ children }) => <ol className="list-decimal list-inside space-y-1 mb-3 text-sm text-foreground/80 pl-2">{children}</ol>,
                                        li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                                        strong: ({ children }) => <strong className="font-bold text-foreground">{children}</strong>,
                                        em: ({ children }) => <em className="italic text-foreground/70">{children}</em>,
                                        code: ({ children, className }) => {
                                          const isBlock = className?.includes("language-");
                                          return isBlock
                                            ? <code className="block bg-muted rounded-xl px-4 py-3 text-xs font-mono text-foreground/90 overflow-x-auto mb-3 border border-border/60">{children}</code>
                                            : <code className="bg-muted px-1.5 py-0.5 rounded-md text-xs font-mono text-primary border border-border/40">{children}</code>;
                                        },
                                        pre: ({ children }) => <pre className="mb-3">{children}</pre>,
                                        blockquote: ({ children }) => <blockquote className="border-l-4 border-primary/50 pl-4 py-1 my-3 bg-primary/5 rounded-r-xl text-sm text-foreground/70 italic">{children}</blockquote>,
                                        hr: () => <hr className="border-border/50 my-4" />,
                                        a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2 hover:opacity-80 transition-opacity">{children}</a>,
                                      }}
                                    >{post.body}</ReactMarkdown>
                                  </div>
                                </motion.div>
                              )}

                              {getTab(post.id) === "test" && post.has_test && (
                                <motion.div
                                  key="test"
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: -10 }}
                                  transition={{ duration: 0.2 }}
                                  className="space-y-4"
                                >
                                  {/* Taking the test */}
                                  {activeTest?.postId === post.id ? (
                                    <div className="space-y-4">
                                      <div className="flex items-center justify-between pb-3 border-b border-border/80">
                                        <div className="flex items-center gap-3">
                                          <div className="h-8 w-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
                                            <FlaskConical className="h-4 w-4 text-violet-500" />
                                          </div>
                                          <p className="text-sm font-black text-foreground/90 tracking-wide">{activeTest.test.title}</p>
                                        </div>
                                        <button
                                          onClick={() => { setActiveTest(null); setTab(post.id, "notes"); }}
                                          className="text-xs font-bold text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg hover:bg-muted/80 transition-colors border border-transparent hover:border-border"
                                        >
                                          ← Back to Notes
                                        </button>
                                      </div>
                                      <QuizPlayer
                                        test={activeTest.test}
                                        cid={cid}
                                        uid={uid}
                                        onComplete={(score) => handleTestComplete(post.id, score)}
                                      />
                                    </div>
                                  ) : completedTests[post.id] !== undefined ? (
                                    /* Score card */
                                    <div className={cn(
                                      "flex items-center gap-5 rounded-2xl p-6 border-2 shadow-sm",
                                      completedTests[post.id] >= 70 ? "bg-blue-500/5 border-blue-500/30"
                                        : completedTests[post.id] >= 50 ? "bg-amber-500/5 border-amber-500/30"
                                        : "bg-rose-500/5 border-rose-500/30"
                                    )}>
                                      <div className={cn(
                                        "h-16 w-16 rounded-2xl flex items-center justify-center shrink-0 shadow-sm",
                                        completedTests[post.id] >= 70 ? "bg-blue-500/20 border border-blue-500/20" 
                                        : completedTests[post.id] >= 50 ? "bg-amber-500/20 border border-amber-500/20" 
                                        : "bg-rose-500/20 border border-rose-500/20"
                                      )}>
                                        <Trophy className={cn("h-8 w-8",
                                          completedTests[post.id] >= 70 ? "text-blue-500" : completedTests[post.id] >= 50 ? "text-amber-500" : "text-rose-500"
                                        )} />
                                      </div>
                                      <div>
                                        <p className={cn("font-black text-3xl tracking-tight mb-1", 
                                          completedTests[post.id] >= 70 ? "text-blue-600 dark:text-blue-400" 
                                          : completedTests[post.id] >= 50 ? "text-amber-600 dark:text-amber-400" 
                                          : "text-rose-600 dark:text-rose-400"
                                        )}>{completedTests[post.id]}%</p>
                                        <p className="text-sm font-bold text-foreground/80">Test successfully completed</p>
                                        <p className="text-xs text-muted-foreground mt-1">Your score is recorded in the classroom.</p>
                                      </div>
                                    </div>
                                  ) : loadingTest === post.id ? (
                                    /* Loading spinner */
                                    <div className="flex flex-col items-center justify-center gap-3 py-12 text-muted-foreground bg-muted/20 rounded-2xl border border-border/50">
                                      <Loader2 className="h-6 w-6 animate-spin text-violet-500" />
                                      <span className="text-sm font-medium">Preparing test environment...</span>
                                    </div>
                                  ) : (
                                    /* Start button */
                                    <div className="py-6 px-4 bg-violet-500/5 rounded-2xl border border-violet-500/10 flex flex-col items-center justify-center text-center">
                                      <div className="h-12 w-12 bg-violet-500/10 text-violet-500 rounded-2xl flex items-center justify-center mb-4">
                                        <Zap className="h-6 w-6" />
                                      </div>
                                      <h4 className="font-bold text-foreground/90 text-lg mb-2">Ready to test your knowledge?</h4>
                                      <p className="text-sm text-muted-foreground max-w-md mb-6">This test is based on the notes above. Make sure you've read them thoroughly before starting.</p>
                                      
                                      <button
                                        onClick={() => handleStartTest(post)}
                                        className="w-full max-w-sm flex items-center justify-center gap-3 py-3.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-black text-sm transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-violet-600/20"
                                      >
                                        <FlaskConical className="h-4 w-4" /> Start Test Now <ArrowRight className="h-4 w-4" />
                                      </button>
                                    </div>
                                  )}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
