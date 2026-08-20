"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send, Sparkles, Loader2, BookOpen, FlaskConical, ChevronDown,
  CheckCircle2, FileText, Plus, X, Clock, Upload, FileUp,
  Zap, FileScan, AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { API_BASE_URL } from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";

interface Post {
  id: string; title: string; body: string; subject: string;
  created_at: string; has_test: boolean; test_id?: string;
  source?: string; original_filename?: string;
}
interface GeneratedQuestion { question: string; options: string[]; correct: string; explanation: string; }

type FormMode = "manual" | "pdf";

export function ContentPanel({ cid, teacherUid }: { cid: string; teacherUid: string }) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [formMode, setFormMode] = useState<FormMode>("manual");

  // Manual post
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [subject, setSubject] = useState("");
  const [sending, setSending] = useState(false);

  // PDF upload
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfSubject, setPdfSubject] = useState("");
  const [pdfUploading, setPdfUploading] = useState(false);
  const [pdfStage, setPdfStage] = useState<"idle" | "parsing" | "generating" | "saving" | "done">("idle");
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Test generation
  const [generatingFor, setGeneratingFor] = useState<string | null>(null);
  const [numQ, setNumQ] = useState(5);
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [generatedTest, setGeneratedTest] = useState<{ postId: string; questions: GeneratedQuestion[] } | null>(null);
  const [expandedPost, setExpandedPost] = useState<string | null>(null);

  useEffect(() => { fetchPosts(); }, [cid]);

  const fetchPosts = async () => {
    try {
      setLoadingPosts(true);
      const res = await fetch(`${API_BASE_URL}/teacher/classroom/${cid}/content`);
      if (res.ok) setPosts((await res.json()).posts || []);
    } catch { toast.error("Failed to load content"); }
    finally { setLoadingPosts(false); }
  };

  // ── Manual send ────────────────────────────────────────────────────────────
  const handleSend = async () => {
    if (!title.trim() || !body.trim()) { toast.error("Fill in title and body"); return; }
    setSending(true);
    try {
      const res = await fetch(`${API_BASE_URL}/teacher/classroom/${cid}/content/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teacher_uid: teacherUid, title: title.trim(), body: body.trim(), subject: subject.trim() || "General" }),
      });
      if (!res.ok) throw new Error();
      toast.success("Content sent to all students!");
      setTitle(""); setBody(""); setSubject(""); setShowForm(false);
      fetchPosts();
    } catch { toast.error("Failed to send content"); }
    finally { setSending(false); }
  };

  // ── PDF upload ─────────────────────────────────────────────────────────────
  const handleFileSelect = (file: File) => {
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      toast.error("Please select a PDF file"); return;
    }
    if (file.size > 20 * 1024 * 1024) {
      toast.error("File too large (max 20 MB)"); return;
    }
    setPdfFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const handlePdfUpload = async () => {
    if (!pdfFile) { toast.error("Please select a PDF"); return; }
    setPdfUploading(true);
    setPdfStage("parsing");

    try {
      const form = new FormData();
      form.append("file", pdfFile);
      form.append("teacher_uid", teacherUid);
      form.append("subject", pdfSubject.trim() || "General");

      setPdfStage("generating");
      const res = await fetch(`${API_BASE_URL}/teacher/classroom/${cid}/content/upload-pdf`, {
        method: "POST",
        body: form,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Upload failed");
      }

      const data = await res.json();
      setPdfStage("done");
      toast.success(`Notes generated from ${data.pages_extracted} page(s)!`);
      setTimeout(() => {
        setPdfFile(null); setPdfSubject(""); setPdfStage("idle");
        setShowForm(false); fetchPosts();
      }, 1200);
    } catch (e: any) {
      toast.error(e.message || "PDF processing failed");
      setPdfStage("idle");
    } finally {
      setPdfUploading(false);
    }
  };

  // ── Test generation ────────────────────────────────────────────────────────
  const handleGenerateTest = async (postId: string) => {
    setGeneratingFor(postId); setGeneratedTest(null);
    try {
      const res = await fetch(`${API_BASE_URL}/teacher/classroom/${cid}/content/${postId}/generate-test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teacher_uid: teacherUid, content_id: postId, num_questions: numQ, difficulty }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setGeneratedTest({ postId, questions: data.questions });
      toast.success(`Generated ${data.num_questions} questions!`);
      fetchPosts();
    } catch { toast.error("Test generation failed. Check backend."); }
    finally { setGeneratingFor(null); }
  };

  const stageLabel: Record<typeof pdfStage, string> = {
    idle: "",
    parsing: "Extracting text from PDF...",
    generating: "AI is generating notes...",
    saving: "Saving to classroom...",
    done: "Notes created!",
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black tracking-tight">Classroom Content</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Send notes, upload PDFs & generate AI-powered tests</p>
        </div>
        <Button onClick={() => { setShowForm((v) => !v); if (showForm) { setPdfFile(null); setPdfStage("idle"); } }} className="rounded-xl gap-2 font-bold">
          {showForm ? <><X className="h-4 w-4" /> Cancel</> : <><Plus className="h-4 w-4" /> New Post</>}
        </Button>
      </div>

      {/* Create form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6 space-y-5">
              {/* Mode tabs */}
              <div className="flex gap-1 p-1 bg-muted/50 rounded-xl w-fit border border-border">
                {([["manual", FileText, "Write Notes"], ["pdf", FileScan, "Upload PDF"]] as const).map(([mode, Icon, label]) => (
                  <button
                    key={mode}
                    onClick={() => setFormMode(mode)}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all",
                      formMode === mode ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4" /> {label}
                  </button>
                ))}
              </div>

              {/* Manual form */}
              {formMode === "manual" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-black uppercase tracking-wider text-muted-foreground">Title *</Label>
                      <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Chapter 3 Notes" className="h-11 rounded-xl" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-black uppercase tracking-wider text-muted-foreground">Subject</Label>
                      <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Mathematics" className="h-11 rounded-xl" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-black uppercase tracking-wider text-muted-foreground">Content Body *</Label>
                    <textarea
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                      placeholder="Paste notes, summaries, or any content here..."
                      className="w-full h-40 rounded-xl border border-input bg-background px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <Button onClick={handleSend} disabled={sending || !title.trim() || !body.trim()} className="rounded-xl font-bold gap-2">
                    {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    {sending ? "Sending..." : "Send to Classroom"}
                  </Button>
                </div>
              )}

              {/* PDF upload form */}
              {formMode === "pdf" && (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-black uppercase tracking-wider text-muted-foreground">Subject</Label>
                    <Input value={pdfSubject} onChange={(e) => setPdfSubject(e.target.value)} placeholder="e.g. Physics" className="h-11 rounded-xl" />
                  </div>

                  {/* Drop zone */}
                  <div
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={cn(
                      "relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200 select-none",
                      dragOver ? "border-primary bg-primary/10 scale-[1.01]" : "border-border hover:border-primary/50 hover:bg-muted/30",
                      pdfFile ? "border-emerald-500/50 bg-emerald-500/5" : ""
                    )}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf"
                      className="hidden"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); }}
                    />

                    {pdfFile ? (
                      <div className="space-y-2">
                        <div className="h-14 w-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto">
                          <FileText className="h-7 w-7 text-emerald-500" />
                        </div>
                        <p className="font-bold text-sm text-emerald-600">{pdfFile.name}</p>
                        <p className="text-xs text-muted-foreground">{(pdfFile.size / 1024).toFixed(1)} KB · Click to change</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center mx-auto">
                          <Upload className="h-7 w-7 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-bold text-sm">Drag & drop a PDF here</p>
                          <p className="text-xs text-muted-foreground mt-0.5">or click to browse · max 20 MB</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Progress stages */}
                  {pdfUploading && (
                    <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex items-center gap-3">
                      <Loader2 className="h-5 w-5 animate-spin text-primary shrink-0" />
                      <div>
                        <p className="text-sm font-bold">{stageLabel[pdfStage]}</p>
                        <p className="text-xs text-muted-foreground">This may take 30–60 seconds</p>
                      </div>
                    </div>
                  )}
                  {pdfStage === "done" && (
                    <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 flex items-center gap-3">
                      <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                      <p className="text-sm font-bold text-emerald-600">Notes generated and posted!</p>
                    </div>
                  )}

                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 flex items-start gap-2 text-amber-700">
                    <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                    <p className="text-xs font-medium">Works best with text-based PDFs. Scanned image PDFs cannot be parsed.</p>
                  </div>

                  <Button
                    onClick={handlePdfUpload}
                    disabled={!pdfFile || pdfUploading}
                    className="w-full rounded-xl font-bold gap-2 h-12"
                  >
                    {pdfUploading
                      ? <><Loader2 className="h-4 w-4 animate-spin" /> Processing...</>
                      : <><Zap className="h-4 w-4" /> Parse PDF & Generate Notes</>}
                  </Button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Post list */}
      {loadingPosts ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : posts.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground border-2 border-dashed border-border rounded-2xl">
          <FileText className="h-12 w-12 mx-auto mb-3 opacity-20" />
          <p className="font-semibold">No content posted yet</p>
          <p className="text-sm mt-1">Write notes manually or upload a PDF to get started.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <div key={post.id} className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
              <button
                onClick={() => setExpandedPost(expandedPost === post.id ? null : post.id)}
                className="w-full flex items-center justify-between p-5 hover:bg-muted/20 transition-colors text-left"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                    post.source === "pdf_upload" ? "bg-orange-500/10 border border-orange-500/20" : "bg-primary/10 border border-primary/20"
                  )}>
                    {post.source === "pdf_upload"
                      ? <FileScan className="h-5 w-5 text-orange-500" />
                      : <BookOpen className="h-5 w-5 text-primary" />}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold truncate">{post.title}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{post.subject}</span>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {new Date(post.created_at).toLocaleDateString()}
                      </span>
                      {post.source === "pdf_upload" && (
                        <span className="text-xs text-orange-600 bg-orange-500/10 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                          <FileUp className="h-3 w-3" /> PDF
                        </span>
                      )}
                      {post.has_test && (
                        <span className="text-xs text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Test Ready
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <ChevronDown className={cn("h-5 w-5 text-muted-foreground transition-transform shrink-0 ml-2", expandedPost === post.id && "rotate-180")} />
              </button>

              <AnimatePresence>
                {expandedPost === post.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="border-t border-border p-5 space-y-4 bg-muted/10">
                      {post.original_filename && (
                        <p className="text-xs text-muted-foreground italic flex items-center gap-1.5">
                          <FileScan className="h-3.5 w-3.5" /> Source: {post.original_filename}
                        </p>
                      )}
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

                      {/* Test generator */}
                      <div className="bg-muted/40 rounded-xl p-4 space-y-3 border border-border">
                        <p className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                          <Sparkles className="h-3.5 w-3.5 text-primary" /> Generate AI Test from this content
                        </p>
                        <div className="flex flex-wrap gap-3 items-end">
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Questions</Label>
                            <select value={numQ} onChange={(e) => setNumQ(Number(e.target.value))} className="h-9 rounded-lg border border-input bg-background px-3 text-sm">
                              {[3, 5, 7, 10].map((n) => <option key={n} value={n}>{n} Qs</option>)}
                            </select>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Difficulty</Label>
                            <select value={difficulty} onChange={(e) => setDifficulty(e.target.value as any)} className="h-9 rounded-lg border border-input bg-background px-3 text-sm capitalize">
                              {["easy", "medium", "hard"].map((d) => <option key={d} value={d} className="capitalize">{d}</option>)}
                            </select>
                          </div>
                          <Button onClick={() => handleGenerateTest(post.id)} disabled={generatingFor === post.id} size="sm" className="rounded-xl gap-2 font-bold">
                            {generatingFor === post.id
                              ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Generating...</>
                              : <><FlaskConical className="h-3.5 w-3.5" /> {post.has_test ? "Re-generate" : "Generate Test"}</>}
                          </Button>
                        </div>
                      </div>

                      {/* Generated test preview */}
                      {generatedTest?.postId === post.id && (
                        <div className="space-y-3">
                          <p className="text-sm font-bold text-emerald-600 flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4" /> {generatedTest.questions.length} questions generated
                          </p>
                          {generatedTest.questions.map((q, i) => (
                            <div key={i} className="bg-background border border-border rounded-xl p-4 space-y-2">
                              <p className="text-sm font-semibold">{i + 1}. {q.question}</p>
                              <ul className="space-y-1">
                                {q.options.map((opt, j) => (
                                  <li key={j} className={cn(
                                    "text-xs px-3 py-1.5 rounded-lg",
                                    ["A", "B", "C", "D"][j] === q.correct ? "bg-emerald-500/10 text-emerald-700 font-semibold" : "text-muted-foreground"
                                  )}>{opt}</li>
                                ))}
                              </ul>
                              <p className="text-xs text-muted-foreground italic border-t border-border pt-2">{q.explanation}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
