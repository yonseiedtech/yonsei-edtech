"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { pollsApi, pollResponsesApi } from "@/lib/bkend";
import { useAuthStore } from "@/features/auth/auth-store";
import { isAtLeast } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  Vote, Plus, Loader2, CheckCircle, Clock, Lock,
  BarChart3, ChevronDown, ChevronUp, Trash2, Star,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { arrayUnion } from "firebase/firestore";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Poll, PollQuestion, PollOption, PollResponse } from "@/types";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899", "#84cc16"];

function generateId() {
  return Math.random().toString(36).slice(2, 10);
}

// ── Poll Card ──
function PollCard({ poll, onVote, onViewResults }: {
  poll: Poll;
  onVote: (poll: Poll) => void;
  onViewResults: (poll: Poll) => void;
}) {
  const { user } = useAuthStore();
  const hasVoted = user ? poll.voterIds?.includes(user.id) : false;
  const isActive = poll.status === "active";
  const isClosed = poll.status === "closed";
  const isExpired = poll.endsAt ? new Date(poll.endsAt) < new Date() : false;

  return (
    <div className="rounded-xl border bg-white p-5 transition-shadow hover:shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <Badge variant="secondary" className={cn("text-xs",
              poll.type === "vote" ? "bg-blue-50 text-blue-700" : "bg-violet-50 text-violet-700"
            )}>
              {poll.type === "vote" ? "투표" : "설문"}
            </Badge>
            <Badge variant="secondary" className={cn("text-xs",
              isActive && !isExpired ? "bg-green-50 text-green-700" :
              isClosed || isExpired ? "bg-gray-100 text-gray-600" :
              "bg-amber-50 text-amber-700"
            )}>
              {isClosed || isExpired ? "마감" : isActive ? "진행중" : "준비중"}
            </Badge>
            {hasVoted && (
              <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 text-xs">
                <CheckCircle size={10} className="mr-0.5" /> 참여완료
              </Badge>
            )}
          </div>
          <h3 className="font-semibold text-sm">{poll.title}</h3>
          {poll.description && <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{poll.description}</p>}
          <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
            <span>{poll.createdByName}</span>
            <span>{poll.voterIds?.length ?? 0}명 참여</span>
            {poll.endsAt && <span>마감: {new Date(poll.endsAt).toLocaleDateString("ko-KR")}</span>}
          </div>
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        {isActive && !isExpired && !hasVoted && (
          <Button size="sm" onClick={() => onVote(poll)}>
            <Vote size={14} className="mr-1" /> 참여하기
          </Button>
        )}
        {(hasVoted || isClosed || isExpired || poll.showResults) && (
          <Button size="sm" variant="outline" onClick={() => onViewResults(poll)}>
            <BarChart3 size={14} className="mr-1" /> 결과 보기
          </Button>
        )}
      </div>
    </div>
  );
}

// ── Results Dialog ──
function ResultsView({ poll, responses }: { poll: Poll; responses: PollResponse[] }) {
  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">{responses.length}명 참여</p>
      {poll.questions.map((q) => (
        <div key={q.id} className="space-y-2">
          <h4 className="text-sm font-medium">{q.text}</h4>
          {(q.type === "single" || q.type === "multiple") && q.options && (
            <QuestionChart question={q} responses={responses} />
          )}
          {q.type === "rating" && (
            <RatingChart questionId={q.id} responses={responses} />
          )}
          {q.type === "text" && (
            <div className="max-h-40 space-y-1 overflow-y-auto rounded-lg border p-3">
              {responses.map((r) => {
                const ans = r.answers[q.id];
                return ans ? <p key={r.id} className="text-xs text-muted-foreground">{String(ans)}</p> : null;
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function QuestionChart({ question, responses }: { question: PollQuestion; responses: PollResponse[] }) {
  const counts = new Map<string, number>();
  question.options?.forEach((o) => counts.set(o.id, 0));
  for (const r of responses) {
    const ans = r.answers[question.id];
    if (Array.isArray(ans)) {
      ans.forEach((a) => counts.set(a, (counts.get(a) ?? 0) + 1));
    } else if (typeof ans === "string") {
      counts.set(ans, (counts.get(ans) ?? 0) + 1);
    }
  }
  const data = question.options?.map((o) => ({
    name: o.text, count: counts.get(o.id) ?? 0,
  })) ?? [];

  return (
    <ResponsiveContainer width="100%" height={Math.max(120, data.length * 35)}>
      <BarChart data={data} layout="vertical">
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
        <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11 }} />
        <Tooltip />
        <Bar dataKey="count" name="응답" fill="#3b82f6" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function RatingChart({ questionId, responses }: { questionId: string; responses: PollResponse[] }) {
  const counts = [0, 0, 0, 0, 0];
  let sum = 0, n = 0;
  for (const r of responses) {
    const val = Number(r.answers[questionId]);
    if (val >= 1 && val <= 5) { counts[val - 1]++; sum += val; n++; }
  }
  const avg = n > 0 ? (sum / n).toFixed(1) : "-";
  const data = counts.map((count, i) => ({ rating: `${i + 1}점`, count }));

  return (
    <div>
      <p className="mb-2 text-xs text-muted-foreground">평균: <span className="font-bold text-foreground">{avg}</span> / 5.0 ({n}명)</p>
      <ResponsiveContainer width="100%" height={120}>
        <BarChart data={data}>
          <XAxis dataKey="rating" tick={{ fontSize: 11 }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
          <Tooltip />
          <Bar dataKey="count" name="응답" fill="#f59e0b" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function PollsPage() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const isStaff = isAtLeast(user, "staff");

  const [showCreate, setShowCreate] = useState(false);
  const [showVote, setShowVote] = useState<Poll | null>(null);
  const [showResults, setShowResults] = useState<Poll | null>(null);
  const [voteAnswers, setVoteAnswers] = useState<Record<string, string | string[] | number>>({});

  // Create form
  const [form, setForm] = useState({
    title: "", description: "", type: "vote" as Poll["type"],
    allowAnonymous: false, showResults: true, endsAt: "",
    questions: [{ id: generateId(), text: "", type: "single" as PollQuestion["type"], options: [{ id: generateId(), text: "", votes: 0 }, { id: generateId(), text: "", votes: 0 }], required: true }] as PollQuestion[],
  });

  const { data: polls = [] } = useQuery({
    queryKey: ["polls"],
    queryFn: async () => {
      const res = await pollsApi.list();
      return res.data as unknown as Poll[];
    },
  });

  const { data: resultResponses = [] } = useQuery({
    queryKey: ["poll_responses", showResults?.id],
    queryFn: async () => {
      if (!showResults) return [];
      const res = await pollResponsesApi.list(showResults.id);
      return res.data as unknown as PollResponse[];
    },
    enabled: !!showResults,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      await pollsApi.create({
        ...form,
        status: "active",
        voterIds: [],
        createdBy: user?.id ?? "",
        createdByName: user?.name ?? "",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["polls"] });
      setShowCreate(false);
      setForm({ title: "", description: "", type: "vote", allowAnonymous: false, showResults: true, endsAt: "", questions: [{ id: generateId(), text: "", type: "single", options: [{ id: generateId(), text: "", votes: 0 }, { id: generateId(), text: "", votes: 0 }], required: true }] });
      toast.success("투표/설문이 생성되었습니다.");
    },
  });

  const voteMutation = useMutation({
    mutationFn: async () => {
      if (!showVote || !user) return;
      await pollResponsesApi.create({
        pollId: showVote.id,
        userId: showVote.allowAnonymous ? null : user.id,
        userName: showVote.allowAnonymous ? null : user.name,
        answers: voteAnswers,
      });
      // voterIds에 추가
      const pollRef = doc(db, "polls", showVote.id);
      await updateDoc(pollRef, { voterIds: arrayUnion(user.id) });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["polls"] });
      setShowVote(null);
      setVoteAnswers({});
      toast.success("참여가 완료되었습니다!");
    },
  });

  const closeMutation = useMutation({
    mutationFn: (id: string) => pollsApi.update(id, { status: "closed" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["polls"] });
      toast.success("투표가 마감되었습니다.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => pollsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["polls"] });
      toast.success("삭제되었습니다.");
    },
  });

  // Form helpers
  function addQuestion() {
    setForm((f) => ({ ...f, questions: [...f.questions, { id: generateId(), text: "", type: "single", options: [{ id: generateId(), text: "", votes: 0 }, { id: generateId(), text: "", votes: 0 }], required: true }] }));
  }
  function updateQuestion(idx: number, patch: Partial<PollQuestion>) {
    setForm((f) => ({ ...f, questions: f.questions.map((q, i) => i === idx ? { ...q, ...patch } : q) }));
  }
  function removeQuestion(idx: number) {
    setForm((f) => ({ ...f, questions: f.questions.filter((_, i) => i !== idx) }));
  }
  function addOption(qIdx: number) {
    setForm((f) => ({
      ...f,
      questions: f.questions.map((q, i) => i === qIdx ? { ...q, options: [...(q.options ?? []), { id: generateId(), text: "", votes: 0 }] } : q),
    }));
  }
  function updateOption(qIdx: number, oIdx: number, text: string) {
    setForm((f) => ({
      ...f,
      questions: f.questions.map((q, i) => i === qIdx ? { ...q, options: q.options?.map((o, j) => j === oIdx ? { ...o, text } : o) } : q),
    }));
  }
  function removeOption(qIdx: number, oIdx: number) {
    setForm((f) => ({
      ...f,
      questions: f.questions.map((q, i) => i === qIdx ? { ...q, options: q.options?.filter((_, j) => j !== oIdx) } : q),
    }));
  }

  const activePolls = polls.filter((p) => p.status === "active" && (!p.endsAt || new Date(p.endsAt) >= new Date()));
  const closedPolls = polls.filter((p) => p.status === "closed" || (p.endsAt && new Date(p.endsAt) < new Date()));

  return (
    <div className="py-16">
      <div className="mx-auto max-w-3xl px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Vote size={24} className="text-primary" />
            <h1 className="text-2xl font-bold">투표 / 설문</h1>
          </div>
          {isStaff && (
            <Button onClick={() => setShowCreate(true)}>
              <Plus size={16} className="mr-1" /> 새 투표/설문
            </Button>
          )}
        </div>

        {/* Active polls */}
        <div className="mt-6 space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground">진행 중</h2>
          {activePolls.length === 0 ? (
            <p className="rounded-lg border bg-white py-8 text-center text-sm text-muted-foreground">진행 중인 투표/설문이 없습니다.</p>
          ) : (
            activePolls.map((p) => (
              <div key={p.id}>
                <PollCard poll={p} onVote={setShowVote} onViewResults={setShowResults} />
                {isStaff && (
                  <div className="mt-1 flex gap-1 justify-end">
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => closeMutation.mutate(p.id)}>마감</Button>
                    <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive" onClick={() => { if (confirm("삭제하시겠습니까?")) deleteMutation.mutate(p.id); }}>삭제</Button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {closedPolls.length > 0 && (
          <div className="mt-8 space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground">마감됨</h2>
            {closedPolls.map((p) => (
              <div key={p.id}>
                <PollCard poll={p} onVote={setShowVote} onViewResults={setShowResults} />
                {isStaff && (
                  <div className="mt-1 flex justify-end">
                    <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive" onClick={() => { if (confirm("삭제?")) deleteMutation.mutate(p.id); }}>삭제</Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>투표/설문 만들기</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="flex gap-2">
              {(["vote", "survey"] as const).map((t) => (
                <button key={t} onClick={() => setForm((f) => ({ ...f, type: t }))} className={cn("flex-1 rounded-lg border py-2 text-sm font-medium transition-colors", form.type === t ? "border-primary bg-primary/5 text-primary" : "text-muted-foreground")}>
                  {t === "vote" ? "투표" : "설문"}
                </button>
              ))}
            </div>
            <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="제목" />
            <Input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="설명 (선택)" />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium">마감일 (선택)</label>
                <Input type="date" value={form.endsAt} onChange={(e) => setForm((f) => ({ ...f, endsAt: e.target.value }))} />
              </div>
              <div className="space-y-2 pt-5">
                <label className="flex items-center gap-2 text-xs">
                  <input type="checkbox" checked={form.allowAnonymous} onChange={(e) => setForm((f) => ({ ...f, allowAnonymous: e.target.checked }))} />
                  익명 허용
                </label>
                <label className="flex items-center gap-2 text-xs">
                  <input type="checkbox" checked={form.showResults} onChange={(e) => setForm((f) => ({ ...f, showResults: e.target.checked }))} />
                  투표 후 결과 공개
                </label>
              </div>
            </div>

            <div className="border-t pt-3">
              <h4 className="text-sm font-medium mb-2">질문</h4>
              {form.questions.map((q, qi) => (
                <div key={q.id} className="mb-3 rounded-lg border p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <Input value={q.text} onChange={(e) => updateQuestion(qi, { text: e.target.value })} placeholder={`질문 ${qi + 1}`} className="flex-1" />
                    <select value={q.type} onChange={(e) => updateQuestion(qi, { type: e.target.value as PollQuestion["type"] })} className="rounded border px-2 py-1.5 text-xs">
                      <option value="single">단일 선택</option>
                      <option value="multiple">복수 선택</option>
                      <option value="text">주관식</option>
                      <option value="rating">별점 (1-5)</option>
                    </select>
                    {form.questions.length > 1 && (
                      <button onClick={() => removeQuestion(qi)} className="text-muted-foreground hover:text-destructive"><Trash2 size={14} /></button>
                    )}
                  </div>
                  {(q.type === "single" || q.type === "multiple") && (
                    <div className="space-y-1 pl-2">
                      {q.options?.map((o, oi) => (
                        <div key={o.id} className="flex items-center gap-2">
                          <div className={cn("h-3.5 w-3.5 shrink-0 rounded border", q.type === "single" ? "rounded-full" : "")} />
                          <Input value={o.text} onChange={(e) => updateOption(qi, oi, e.target.value)} placeholder={`선택지 ${oi + 1}`} className="h-8 text-xs" />
                          {(q.options?.length ?? 0) > 2 && (
                            <button onClick={() => removeOption(qi, oi)} className="text-muted-foreground hover:text-destructive"><Trash2 size={12} /></button>
                          )}
                        </div>
                      ))}
                      <button onClick={() => addOption(qi)} className="text-xs text-primary hover:underline">+ 선택지 추가</button>
                    </div>
                  )}
                </div>
              ))}
              <button onClick={addQuestion} className="text-xs text-primary hover:underline">+ 질문 추가</button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>취소</Button>
            <Button onClick={() => {
              if (!form.title) { toast.error("제목을 입력하세요."); return; }
              if (form.questions.some((q) => !q.text)) { toast.error("모든 질문을 입력하세요."); return; }
              createMutation.mutate();
            }} disabled={createMutation.isPending}>
              {createMutation.isPending && <Loader2 size={14} className="mr-1 animate-spin" />}
              생성
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Vote Dialog */}
      <Dialog open={!!showVote} onOpenChange={() => { setShowVote(null); setVoteAnswers({}); }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{showVote?.title}</DialogTitle></DialogHeader>
          {showVote?.description && <p className="text-sm text-muted-foreground">{showVote.description}</p>}
          <div className="space-y-4">
            {showVote?.questions.map((q) => (
              <div key={q.id} className="space-y-2">
                <h4 className="text-sm font-medium">{q.text} {q.required && <span className="text-destructive">*</span>}</h4>
                {q.type === "single" && q.options?.map((o) => (
                  <label key={o.id} className="flex items-center gap-2 rounded-lg border px-3 py-2 cursor-pointer hover:bg-muted/30">
                    <input type="radio" name={q.id} value={o.id} checked={voteAnswers[q.id] === o.id} onChange={() => setVoteAnswers((a) => ({ ...a, [q.id]: o.id }))} />
                    <span className="text-sm">{o.text}</span>
                  </label>
                ))}
                {q.type === "multiple" && q.options?.map((o) => {
                  const selected = (voteAnswers[q.id] as string[] | undefined) ?? [];
                  return (
                    <label key={o.id} className="flex items-center gap-2 rounded-lg border px-3 py-2 cursor-pointer hover:bg-muted/30">
                      <input type="checkbox" checked={selected.includes(o.id)} onChange={(e) => {
                        setVoteAnswers((a) => ({
                          ...a,
                          [q.id]: e.target.checked ? [...selected, o.id] : selected.filter((s) => s !== o.id),
                        }));
                      }} />
                      <span className="text-sm">{o.text}</span>
                    </label>
                  );
                })}
                {q.type === "text" && (
                  <textarea value={(voteAnswers[q.id] as string) ?? ""} onChange={(e) => setVoteAnswers((a) => ({ ...a, [q.id]: e.target.value }))} className="w-full rounded-lg border px-3 py-2 text-sm" rows={3} placeholder="답변을 입력하세요" />
                )}
                {q.type === "rating" && (
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((v) => (
                      <button key={v} onClick={() => setVoteAnswers((a) => ({ ...a, [q.id]: v }))} className={cn("rounded-lg border p-2 transition-colors", (voteAnswers[q.id] as number) >= v ? "bg-amber-100 border-amber-400 text-amber-600" : "text-muted-foreground hover:bg-muted")}>
                        <Star size={20} fill={(voteAnswers[q.id] as number) >= v ? "currentColor" : "none"} />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowVote(null); setVoteAnswers({}); }}>취소</Button>
            <Button onClick={() => {
              if (!showVote) return;
              const missing = showVote.questions.filter((q) => q.required && !voteAnswers[q.id]);
              if (missing.length > 0) { toast.error("필수 질문에 답해 주세요."); return; }
              voteMutation.mutate();
            }} disabled={voteMutation.isPending}>
              {voteMutation.isPending && <Loader2 size={14} className="mr-1 animate-spin" />}
              제출
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Results Dialog */}
      <Dialog open={!!showResults} onOpenChange={() => setShowResults(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{showResults?.title} — 결과</DialogTitle></DialogHeader>
          {showResults && <ResultsView poll={showResults} responses={resultResponses} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
