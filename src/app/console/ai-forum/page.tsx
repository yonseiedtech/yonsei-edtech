"use client";

/**
 * AI 포럼 운영진 콘솔 (Sprint 67-AR — 개최/중지/관리)
 *
 * 운영진(staff 이상)이 토론을 등록(개최), 진행 중인 토론을 중지, 보관 처리할 수 있는 페이지.
 * Phase 1에서는 Firestore에 직접 토론 생성. Phase 2 cron이 도착하면 자동 라운드 진행.
 */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowRight,
  Bot,
  CheckCircle2,
  Loader2,
  Play,
  Plus,
  Square,
  Trash2,
} from "lucide-react";
import AuthGuard from "@/features/auth/AuthGuard";
import { useAuthStore } from "@/features/auth/auth-store";
import { aiForumsApi } from "@/lib/bkend";
import {
  AI_FORUM_CATEGORIES,
  AI_PERSONAS,
  type AIForumStatus,
  type AIForumTopic,
  type AIPersonaKey,
} from "@/types/ai-forum";
import { isAtLeast } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

const STATUS_LABEL: Record<AIForumStatus, { label: string; cls: string }> = {
  scheduled: { label: "개최 대기", cls: "bg-slate-100 text-slate-700" },
  in_progress: { label: "진행 중", cls: "bg-amber-100 text-amber-700" },
  completed: { label: "종료", cls: "bg-emerald-100 text-emerald-700" },
  archived: { label: "보관", cls: "bg-muted text-muted-foreground" },
};

const DEFAULT_PARTICIPANTS: AIPersonaKey[] = [
  "edtech_theorist",
  "learning_scientist",
  "teacher_practitioner",
  "critical_reviewer",
];

function AdminContent() {
  const { user } = useAuthStore();
  const [topics, setTopics] = useState<AIForumTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  // 신규 등록 폼
  const [showNew, setShowNew] = useState(false);
  const [title, setTitle] = useState("");
  const [seedPrompt, setSeedPrompt] = useState("");
  const [category, setCategory] = useState<string>(AI_FORUM_CATEGORIES[0]);
  const [maxRounds, setMaxRounds] = useState(5);
  const [participants, setParticipants] = useState<AIPersonaKey[]>(DEFAULT_PARTICIPANTS);
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await aiForumsApi.list();
      setTopics(res.data ?? []);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "목록 불러오기 실패";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canManage = useMemo(() => isAtLeast(user, "staff"), [user]);

  async function handleStart(id: string) {
    setBusyId(id);
    try {
      await aiForumsApi.start(id);
      toast.success("토론을 개최했습니다.");
      void load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "개최 실패");
    } finally {
      setBusyId(null);
    }
  }

  async function handleStop(id: string) {
    if (!confirm("이 토론을 중지하시겠습니까? 진행 중인 라운드는 더 이상 추가되지 않습니다.")) return;
    setBusyId(id);
    try {
      await aiForumsApi.stop(id);
      toast.success("토론을 중지했습니다.");
      void load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "중지 실패");
    } finally {
      setBusyId(null);
    }
  }

  async function handleArchive(id: string) {
    if (!confirm("이 토론을 보관 처리하시겠습니까? 목록에서 숨겨집니다.")) return;
    setBusyId(id);
    try {
      await aiForumsApi.archive(id);
      toast.success("보관 처리되었습니다.");
      void load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "보관 실패");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("이 토론을 영구 삭제합니다. 되돌릴 수 없습니다. 계속할까요?")) return;
    setBusyId(id);
    try {
      await aiForumsApi.delete(id);
      toast.success("삭제되었습니다.");
      void load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "삭제 실패");
    } finally {
      setBusyId(null);
    }
  }

  async function handleCreate() {
    if (!title.trim()) return toast.error("주제를 입력해주세요.");
    if (!seedPrompt.trim()) return toast.error("시드 프롬프트를 입력해주세요.");
    if (participants.length < 2) return toast.error("최소 2명의 페르소나를 선택해주세요.");

    setSubmitting(true);
    try {
      await aiForumsApi.create({
        title: title.trim(),
        seedPrompt: seedPrompt.trim(),
        category,
        participants,
        currentRound: 0,
        maxRounds,
        status: "scheduled" as AIForumStatus,
        approved: true, // 운영진이 직접 등록한 경우 자동 승인
        createdBy: user?.id ?? "unknown",
        messageCount: 0,
        createdAt: new Date().toISOString(),
      });
      toast.success("새 토론이 등록되었습니다. '개최' 버튼으로 시작하세요.");
      setTitle("");
      setSeedPrompt("");
      setCategory(AI_FORUM_CATEGORIES[0]);
      setMaxRounds(5);
      setParticipants(DEFAULT_PARTICIPANTS);
      setShowNew(false);
      void load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "등록 실패");
    } finally {
      setSubmitting(false);
    }
  }

  function toggleParticipant(k: AIPersonaKey) {
    setParticipants((prev) => (prev.includes(k) ? prev.filter((p) => p !== k) : [...prev, k]));
  }

  if (!canManage) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <div className="rounded-2xl border-2 border-amber-200 bg-amber-50/50 p-6 text-center dark:border-amber-900 dark:bg-amber-950/20">
          <AlertTriangle size={28} className="mx-auto mb-2 text-amber-600" />
          <h2 className="text-lg font-bold">접근 권한 없음</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            AI 포럼 운영은 학회 운영진(staff 이상)만 가능합니다.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
            <Bot size={11} />
            운영진 콘솔
          </div>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">AI 포럼 운영</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            토론 주제를 등록(개최)하고 진행 중인 토론을 중지하거나 보관 처리할 수 있습니다.
          </p>
        </div>
        <Button onClick={() => setShowNew((v) => !v)} className="gap-1">
          <Plus size={14} />
          {showNew ? "닫기" : "새 토론 등록"}
        </Button>
      </header>

      {showNew && (
        <section className="mb-8 rounded-2xl border-2 border-primary/30 bg-primary/5 p-6">
          <h2 className="text-lg font-bold">새 토론 개최</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            등록 후 "개최" 버튼을 눌러야 AI들의 라운드 토론이 시작됩니다. (Phase 2 cron 도입 전에는 라운드 수동 진행)
          </p>

          <div className="mt-5 space-y-4">
            <div>
              <label htmlFor="title" className="text-sm font-semibold">토론 주제</label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="예: 생성형 AI를 학부 수업에 전면 도입해야 하는가?"
                className="mt-1.5"
              />
            </div>

            <div>
              <label htmlFor="seedPrompt" className="text-sm font-semibold">시드 프롬프트 (배경·논점)</label>
              <Textarea
                id="seedPrompt"
                value={seedPrompt}
                onChange={(e) => setSeedPrompt(e.target.value)}
                placeholder="AI 페르소나들에게 제공될 토론의 배경과 논점을 2~4문장으로 작성해주세요."
                className="mt-1.5 min-h-[100px]"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="category" className="text-sm font-semibold">카테고리</label>
                <select
                  id="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="mt-1.5 h-10 w-full rounded-md border bg-background px-3 text-sm"
                >
                  {AI_FORUM_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="maxRounds" className="text-sm font-semibold">최대 라운드 (1~7)</label>
                <Input
                  id="maxRounds"
                  type="number"
                  min={1}
                  max={7}
                  value={maxRounds}
                  onChange={(e) =>
                    setMaxRounds(Math.min(7, Math.max(1, Number(e.target.value) || 5)))
                  }
                  className="mt-1.5"
                />
              </div>
            </div>

            <div>
              <span className="block text-sm font-semibold">참여 페르소나 (2명 이상)</span>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {Object.values(AI_PERSONAS).map((p) => {
                  const checked = participants.includes(p.key);
                  return (
                    <label
                      key={p.key}
                      className={`flex cursor-pointer items-start gap-2 rounded-xl border p-3 transition-colors ${
                        checked ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleParticipant(p.key)}
                        className="mt-0.5"
                      />
                      <div className="flex-1">
                        <div className={`text-sm font-bold ${p.color}`}>
                          {p.avatarEmoji} {p.name}
                        </div>
                        <div className="text-xs text-muted-foreground">{p.description}</div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowNew(false)} disabled={submitting}>
                취소
              </Button>
              <Button onClick={handleCreate} disabled={submitting} className="gap-1">
                {submitting ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                등록
              </Button>
            </div>
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-base font-bold">등록된 토론</h2>
        {loading ? (
          <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
            <Loader2 size={16} className="mr-2 animate-spin" />
            불러오는 중…
          </div>
        ) : topics.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-muted-foreground/30 p-8 text-center text-sm text-muted-foreground">
            아직 등록된 토론이 없습니다. 우측 상단 "새 토론 등록"으로 시작하세요.
          </div>
        ) : (
          <div className="space-y-3">
            {topics.map((t) => {
              const status = STATUS_LABEL[t.status];
              const isBusy = busyId === t.id;
              return (
                <article
                  key={t.id}
                  className="rounded-2xl border bg-card p-5 shadow-sm"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${status.cls}`}>
                      {status.label}
                    </span>
                    <Badge variant="secondary">{t.category}</Badge>
                    <span className="text-xs text-muted-foreground">
                      라운드 {t.currentRound} / {t.maxRounds} · 발언 {t.messageCount ?? 0}건
                    </span>
                  </div>
                  <h3 className="mt-2 text-lg font-bold tracking-tight">{t.title}</h3>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{t.seedPrompt}</p>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Link
                      href={`/ai-forum/${t.id}`}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                    >
                      관전 페이지 보기
                      <ArrowRight size={12} />
                    </Link>

                    <div className="ml-auto flex flex-wrap items-center gap-2">
                      {t.status === "scheduled" && (
                        <Button
                          size="sm"
                          onClick={() => handleStart(t.id)}
                          disabled={isBusy}
                          className="gap-1"
                        >
                          {isBusy ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
                          개최
                        </Button>
                      )}
                      {t.status === "in_progress" && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleStop(t.id)}
                          disabled={isBusy}
                          className="gap-1"
                        >
                          {isBusy ? <Loader2 size={12} className="animate-spin" /> : <Square size={12} />}
                          중지
                        </Button>
                      )}
                      {(t.status === "completed" || t.status === "in_progress") && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleArchive(t.id)}
                          disabled={isBusy}
                        >
                          보관
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(t.id)}
                        disabled={isBusy}
                        className="text-destructive"
                      >
                        <Trash2 size={12} />
                      </Button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <div className="mt-10 rounded-2xl border-2 border-dashed border-muted-foreground/20 bg-muted/30 p-4 text-xs text-muted-foreground">
        <strong>Phase 1 안내</strong>: 현재는 토론 등록·개최·중지만 가능합니다. AI 페르소나의 자동 라운드 진행은 Phase 2(Vercel Cron 도입) 이후 활성화됩니다. 그 전까지는 관전 페이지에 데모 토론 2건만 표시됩니다.
      </div>
    </div>
  );
}

export default function AIForumAdminPage() {
  return (
    <AuthGuard>
      <AdminContent />
    </AuthGuard>
  );
}
