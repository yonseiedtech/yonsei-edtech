"use client";

/**
 * 활동 상세 — 세션 연구 분석 노트 페이지 (Sprint 67-D)
 *
 * 학술대회 세션을 단순 메모가 아닌 "연구 분석 노트" 로 작성:
 * - analysisNote (긴 마크다운 분석문)
 * - keyInsights (핵심 인사이트 bullet)
 * - questions (발표자/세션에 대한 질문)
 * - references (참고 자료)
 *
 * 기존 personalNotes (짧은 메모) 는 호환 유지.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  Clock,
  Loader2,
  MapPin,
  NotebookPen,
  Plus,
  Save,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/features/auth/auth-store";
import { userSessionPlansApi } from "@/lib/bkend";
import type { UserSessionPlan } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import EmptyState from "@/components/ui/empty-state";

export default function SessionNotePage() {
  const router = useRouter();
  const params = useParams<{ id: string; planId: string }>();
  const activityId = String(params.id ?? "");
  const planId = String(params.planId ?? "");
  const { user } = useAuthStore();

  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState<UserSessionPlan | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [analysisNote, setAnalysisNote] = useState("");
  const [keyInsights, setKeyInsights] = useState<string[]>([]);
  const [questions, setQuestions] = useState<string[]>([]);
  const [references, setReferences] = useState<string[]>([]);
  const [insightInput, setInsightInput] = useState("");
  const [questionInput, setQuestionInput] = useState("");
  const [referenceInput, setReferenceInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [dirty, setDirty] = useState(false);
  const skipDirtyRef = useRef(true);

  // 데이터 로드
  useEffect(() => {
    if (!planId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await userSessionPlansApi.get(planId);
        if (cancelled) return;
        if (!res) {
          setError("일정을 찾을 수 없습니다.");
        } else {
          setPlan(res);
          skipDirtyRef.current = true;
          setAnalysisNote(res.analysisNote ?? res.personalNotes ?? "");
          setKeyInsights(res.keyInsights ?? []);
          setQuestions(res.questions ?? []);
          setReferences(res.references ?? []);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "일정 로드 실패");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [planId]);

  // dirty 감지
  useEffect(() => {
    if (skipDirtyRef.current) {
      skipDirtyRef.current = false;
      return;
    }
    setDirty(true);
  }, [analysisNote, keyInsights, questions, references]);

  // 본인 plan인지 검증
  const isOwner = useMemo(() => {
    if (!plan || !user) return false;
    return plan.userId === user.id;
  }, [plan, user]);

  async function handleSave() {
    if (!plan) return;
    setSaving(true);
    try {
      await userSessionPlansApi.upsert(plan.id, {
        ...plan,
        analysisNote: analysisNote.trim() || undefined,
        keyInsights: keyInsights.length > 0 ? keyInsights : undefined,
        questions: questions.length > 0 ? questions : undefined,
        references: references.length > 0 ? references : undefined,
        notedAt: new Date().toISOString(),
      } as unknown as Record<string, unknown>);
      setDirty(false);
      setSavedAt(new Date());
      toast.success("노트가 저장되었습니다.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "저장 실패");
    } finally {
      setSaving(false);
    }
  }

  // 자동 저장 (3초 idle)
  useEffect(() => {
    if (!dirty || !plan) return;
    const t = setTimeout(() => {
      handleSave();
    }, 3000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dirty, analysisNote, keyInsights, questions, references]);

  function addInsight() {
    const v = insightInput.trim();
    if (!v) return;
    setKeyInsights((prev) => [...prev, v]);
    setInsightInput("");
  }
  function addQuestion() {
    const v = questionInput.trim();
    if (!v) return;
    setQuestions((prev) => [...prev, v]);
    setQuestionInput("");
  }
  function addReference() {
    const v = referenceInput.trim();
    if (!v) return;
    setReferences((prev) => [...prev, v]);
    setReferenceInput("");
  }

  if (loading) {
    return (
      <div className="container mx-auto py-10">
        <div className="flex items-center justify-center py-20 text-sm text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 노트를 불러오는 중…
        </div>
      </div>
    );
  }

  if (error || !plan) {
    return (
      <div className="container mx-auto py-10">
        <EmptyState
          icon={NotebookPen}
          title={error ?? "일정을 찾을 수 없습니다"}
          description="목록으로 돌아가 다시 시도해 주세요."
          actions={[
            { label: "프로그램으로", href: `/activities/external/${activityId}/program` },
          ]}
        />
      </div>
    );
  }

  if (!isOwner) {
    return (
      <div className="container mx-auto py-10">
        <EmptyState
          icon={NotebookPen}
          title="권한이 없습니다"
          description="본인 일정에 대한 노트만 접근할 수 있습니다."
          actions={[
            { label: "내 일정으로", href: `/activities/external/${activityId}` },
          ]}
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl space-y-5 py-6">
      <div className="flex items-start gap-3 border-b pb-3">
        <div className="rounded-md bg-primary/10 p-2 text-primary">
          <NotebookPen className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-lg font-semibold">세션 연구 분석 노트</h1>
          <p className="text-xs text-muted-foreground">
            발표를 듣고 떠오른 분석·인사이트·질문을 체계적으로 정리해 두세요.
          </p>
        </div>
      </div>

      {/* 세션 메타 정보 */}
      <div className="rounded-lg border bg-card p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1 space-y-1">
            <h3 className="font-semibold leading-snug">
              {plan.sessionTitle ?? "(세션 제목 없음)"}
            </h3>
            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
              {plan.sessionDate && (
                <span className="inline-flex items-center gap-1">
                  <Calendar className="h-3 w-3" /> {plan.sessionDate}
                </span>
              )}
              {(plan.sessionStartTime || plan.sessionEndTime) && (
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3 w-3" /> {plan.sessionStartTime}–{plan.sessionEndTime}
                </span>
              )}
              {plan.sessionTrack && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> {plan.sessionTrack}
                </span>
              )}
            </div>
            {(plan.reasons?.length || plan.reasonForSelection) && (
              <div className="flex flex-wrap items-center gap-1 pt-1 text-[11px]">
                <span className="text-muted-foreground">선택 이유:</span>
                {(plan.reasons ?? []).map((r) => (
                  <Badge key={r} variant="secondary" className="text-[10px]">
                    {r}
                  </Badge>
                ))}
                {plan.reasonForSelection && (
                  <span className="text-muted-foreground">
                    · {plan.reasonForSelection}
                  </span>
                )}
              </div>
            )}
          </div>
          <Link href={`/activities/external/${activityId}`}>
            <Button size="sm" variant="ghost">
              <ArrowLeft className="mr-1 h-3 w-3" /> 내 일정
            </Button>
          </Link>
        </div>
      </div>

      {/* 저장 상태 표시 */}
      <div className="flex items-center justify-between">
        <div className="text-xs text-muted-foreground">
          {dirty ? (
            <span className="text-amber-700 dark:text-amber-300">
              ● 저장되지 않음 (3초 후 자동 저장)
            </span>
          ) : savedAt ? (
            <span className="text-emerald-700 dark:text-emerald-300">
              ✓ 저장됨 · {savedAt.toLocaleTimeString("ko-KR")}
            </span>
          ) : (
            <span>변경 사항 없음</span>
          )}
        </div>
        <Button size="sm" onClick={handleSave} disabled={saving || !dirty}>
          {saving ? (
            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
          ) : (
            <Save className="mr-1 h-3 w-3" />
          )}
          저장
        </Button>
      </div>

      {/* 분석 노트 (긴 마크다운) */}
      <div className="rounded-lg border bg-card p-4 space-y-2">
        <div>
          <h4 className="font-medium">분석 노트</h4>
          <p className="text-xs text-muted-foreground">
            발표 핵심 주장·이론적 배경·연구 방법·한계·내 연구와의 연결점 등을 자유롭게 정리하세요. 마크다운 문법 사용 가능.
          </p>
        </div>
        <Textarea
          rows={14}
          value={analysisNote}
          onChange={(e) => setAnalysisNote(e.target.value)}
          placeholder={`예:\n\n## 발표 요약\n- ...\n\n## 이론적 배경\n- ...\n\n## 연구 방법\n- 표본:\n- 분석 방법:\n\n## 결과\n- ...\n\n## 비판적 검토\n- ...\n\n## 내 연구와의 연관성\n- ...`}
          className="font-mono text-sm"
        />
      </div>

      {/* 핵심 인사이트 */}
      <div className="rounded-lg border bg-card p-4 space-y-2">
        <div>
          <h4 className="font-medium">핵심 인사이트</h4>
          <p className="text-xs text-muted-foreground">
            발표를 통해 새롭게 알게 된 점·재확인된 점을 1줄씩 정리.
          </p>
        </div>
        <div className="flex gap-2">
          <Input
            value={insightInput}
            onChange={(e) => setInsightInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addInsight();
              }
            }}
            placeholder="새 인사이트를 입력하고 Enter"
          />
          <Button size="sm" variant="outline" onClick={addInsight}>
            <Plus className="h-3 w-3" />
          </Button>
        </div>
        {keyInsights.length > 0 ? (
          <ul className="space-y-1">
            {keyInsights.map((it, i) => (
              <li
                key={i}
                className="flex items-start gap-2 rounded-md bg-muted/30 px-2 py-1 text-sm"
              >
                <span className="flex-1">• {it}</span>
                <button
                  type="button"
                  onClick={() => setKeyInsights(keyInsights.filter((_, j) => j !== i))}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-muted-foreground italic">아직 등록된 인사이트가 없습니다.</p>
        )}
      </div>

      {/* 질문 */}
      <div className="rounded-lg border bg-card p-4 space-y-2">
        <div>
          <h4 className="font-medium">질문</h4>
          <p className="text-xs text-muted-foreground">
            발표자/세션에게 묻고 싶은 점, 추후 본인이 답을 찾아보고 싶은 점.
          </p>
        </div>
        <div className="flex gap-2">
          <Input
            value={questionInput}
            onChange={(e) => setQuestionInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addQuestion();
              }
            }}
            placeholder="새 질문을 입력하고 Enter"
          />
          <Button size="sm" variant="outline" onClick={addQuestion}>
            <Plus className="h-3 w-3" />
          </Button>
        </div>
        {questions.length > 0 ? (
          <ul className="space-y-1">
            {questions.map((q, i) => (
              <li
                key={i}
                className="flex items-start gap-2 rounded-md bg-blue-50 px-2 py-1 text-sm dark:bg-blue-950/30"
              >
                <span className="flex-1">Q{i + 1}. {q}</span>
                <button
                  type="button"
                  onClick={() => setQuestions(questions.filter((_, j) => j !== i))}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-muted-foreground italic">아직 등록된 질문이 없습니다.</p>
        )}
      </div>

      {/* 참고 자료 */}
      <div className="rounded-lg border bg-card p-4 space-y-2">
        <div>
          <h4 className="font-medium">참고 자료</h4>
          <p className="text-xs text-muted-foreground">
            언급된 논문, URL, 책, 이론 등 후속 탐색이 필요한 자료.
          </p>
        </div>
        <div className="flex gap-2">
          <Input
            value={referenceInput}
            onChange={(e) => setReferenceInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addReference();
              }
            }}
            placeholder="논문 인용 / URL / 책 제목 등"
          />
          <Button size="sm" variant="outline" onClick={addReference}>
            <Plus className="h-3 w-3" />
          </Button>
        </div>
        {references.length > 0 ? (
          <ul className="space-y-1">
            {references.map((r, i) => (
              <li
                key={i}
                className="flex items-start gap-2 rounded-md bg-emerald-50 px-2 py-1 text-sm dark:bg-emerald-950/30"
              >
                <span className="flex-1 break-all">{r}</span>
                <button
                  type="button"
                  onClick={() => setReferences(references.filter((_, j) => j !== i))}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-muted-foreground italic">아직 등록된 참고 자료가 없습니다.</p>
        )}
      </div>

      <div className="flex items-center justify-between border-t pt-4">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="mr-1 h-3 w-3" /> 뒤로
        </Button>
        <Button onClick={handleSave} disabled={saving || !dirty}>
          {saving ? (
            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
          ) : (
            <Save className="mr-1 h-3 w-3" />
          )}
          저장
        </Button>
      </div>
    </div>
  );
}
