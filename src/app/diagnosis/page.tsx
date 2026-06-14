"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ClipboardCheck } from "lucide-react";
import PageContainer from "@/components/ui/page-container";
import PageHeader from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthStore } from "@/features/auth/auth-store";
import {
  archiveConceptsApi,
  diagnosticQuestionsApi,
  diagnosticResultsApi,
} from "@/lib/bkend";
import { SEED_DIAGNOSTIC_QUESTIONS } from "@/lib/diagnostic-seed";
import {
  DIAGNOSTIC_AREA_ORDER,
  computeReadiness,
  gradeQuestion,
  questionType,
  type AreaScore,
  type DiagnosticAnswer,
  type DiagnosticArea,
  type DiagnosticQuestion,
} from "@/types";
import type { ArchiveConcept } from "@/types";
import DiagnosisLanding from "@/components/diagnosis/DiagnosisLanding";
import DiagnosisRunner from "@/components/diagnosis/DiagnosisRunner";
import DiagnosisReport, { type WeakConcept } from "@/components/diagnosis/DiagnosisReport";

type Phase = "landing" | "running" | "report";

/** seedKey 가 있는 문항을 클라이언트 전용 식별자로 변환 (Firestore 미적재 폴백) */
function seedToQuestion(
  entry: (typeof SEED_DIAGNOSTIC_QUESTIONS)[number],
): DiagnosticQuestion & { conceptSeedKey?: string } {
  return {
    id: `seed:${entry.seedKey}`,
    type: questionType(entry),
    area: entry.area,
    question: entry.question ?? "",
    options: entry.options,
    answerIndex: entry.answerIndex,
    items: entry.items,
    prompt: entry.prompt,
    answer: entry.answer,
    acceptedAnswers: entry.acceptedAnswers,
    explanation: entry.explanation,
    conceptSeedKey: entry.conceptSeedKey,
    published: true,
  };
}

/** 영역별 랜덤 출제 문항 수 (매 진단 다른 문제·유형 혼합). 풀이 적으면 가용분만 출제. */
const QUESTIONS_PER_AREA = 6;
/** 전체 진단 시 영역당 출제 수(전체는 세 영역 합산). */
const QUESTIONS_PER_AREA_ALL = 5;

/** Fisher-Yates 셔플 (원본 불변) */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const EMPTY_COUNTS: Record<DiagnosticArea, number> = {
  statistics: 0,
  method: 0,
  concept: 0,
};

export default function DiagnosisPage() {
  const { user } = useAuthStore();

  const [phase, setPhase] = useState<Phase>("landing");
  const [loading, setLoading] = useState(true);
  // 전체 풀 (Firestore published 또는 정적 시드 폴백)
  const [pool, setPool] = useState<(DiagnosticQuestion & { conceptSeedKey?: string })[]>([]);
  // seedKey → 실제 archive_concepts 문서 (약점 링크용)
  const [conceptBySeedKey, setConceptBySeedKey] = useState<Record<string, ArchiveConcept>>({});
  // conceptId → concept 문서 (Firestore 문항의 conceptId 직접 매핑)
  const [conceptById, setConceptById] = useState<Record<string, ArchiveConcept>>({});

  // 현재 진단 세션
  const [activeQuestions, setActiveQuestions] = useState<
    (DiagnosticQuestion & { conceptSeedKey?: string })[]
  >([]);
  const [areaScores, setAreaScores] = useState<Partial<Record<DiagnosticArea, AreaScore>>>({});
  const [readiness, setReadiness] = useState({ paperReadiness: 0, analysisReadiness: 0 });
  const [weakConcepts, setWeakConcepts] = useState<WeakConcept[]>([]);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  // ── 문항 풀 + 개념 로드 ──
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [questionsRes, conceptsRes] = await Promise.all([
          diagnosticQuestionsApi.listPublished().catch(() => null),
          archiveConceptsApi.list().catch(() => null),
        ]);
        if (cancelled) return;

        // 개념 매핑 (seedKey·id 양방향)
        const bySeed: Record<string, ArchiveConcept> = {};
        const byId: Record<string, ArchiveConcept> = {};
        for (const c of conceptsRes?.data ?? []) {
          if (c.seedKey) bySeed[c.seedKey] = c;
          byId[c.id] = c;
        }
        setConceptBySeedKey(bySeed);
        setConceptById(byId);

        // 문항: Firestore published 가 있으면 사용, 없으면 정적 시드 폴백
        const fromDb = questionsRes?.data ?? [];
        if (fromDb.length > 0) {
          setPool(fromDb);
        } else {
          setPool(SEED_DIAGNOSTIC_QUESTIONS.map(seedToQuestion));
        }
      } catch (err) {
        console.error("[diagnosis] load failed", err);
        if (!cancelled) setPool(SEED_DIAGNOSTIC_QUESTIONS.map(seedToQuestion));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const countsByArea = useMemo(() => {
    const counts: Record<DiagnosticArea, number> = { ...EMPTY_COUNTS };
    for (const q of pool) counts[q.area] = (counts[q.area] ?? 0) + 1;
    return counts;
  }, [pool]);

  // ── 진단 시작 (문제은행에서 영역별 N개 랜덤 추출 — 매 진단 다른 문제·유형 혼합) ──
  const handleStart = (area: DiagnosticArea | "all") => {
    // 전체: 세 영역 각각 N_ALL 개 / 단일 영역: 그 영역 N 개. 풀이 적으면 가용분만.
    const areas = area === "all" ? DIAGNOSTIC_AREA_ORDER : [area];
    const perArea = area === "all" ? QUESTIONS_PER_AREA_ALL : QUESTIONS_PER_AREA;
    const ordered: typeof pool = [];
    for (const a of DIAGNOSTIC_AREA_ORDER) {
      if (!areas.includes(a)) continue;
      const inArea = pool.filter((q) => q.area === a);
      // 영역 내부를 셔플 후 앞에서 perArea 개 선택 → 영역 순서는 유지(통계→연구방법→개념)
      ordered.push(...shuffle(inArea).slice(0, perArea));
    }
    if (ordered.length === 0) return;
    setActiveQuestions(ordered);
    setSaveState("idle");
    setPhase("running");
  };

  /** 문항의 약점 개념 해석 — conceptId(Firestore) 우선, 없으면 conceptSeedKey(폴백) */
  const resolveConcept = (
    q: DiagnosticQuestion & { conceptSeedKey?: string },
  ): WeakConcept | null => {
    if (q.conceptId) {
      const c = conceptById[q.conceptId];
      return { id: q.conceptId, name: c?.name ?? "관련 개념" };
    }
    if (q.conceptSeedKey) {
      // 개념이 아카이브에 적재되어 있으면 실제 문서로 링크, 아니면 약점 링크 생략
      const c = conceptBySeedKey[q.conceptSeedKey];
      if (c) return { id: c.id, name: c.name };
      return null;
    }
    return null;
  };

  // ── 채점 (유형별 분기 — gradeQuestion 이 mcq·ordering·term 모두 처리) ──
  const handleComplete = async (answers: Record<string, DiagnosticAnswer>) => {
    const scores: Partial<Record<DiagnosticArea, AreaScore>> = {};
    const weakMap = new Map<string, WeakConcept>();

    for (const q of activeQuestions) {
      const bucket = scores[q.area] ?? { correct: 0, total: 0 };
      bucket.total += 1;
      const correct = gradeQuestion(q, answers[q.id]);
      if (correct) {
        bucket.correct += 1;
      } else {
        const wc = resolveConcept(q);
        if (wc) weakMap.set(wc.id ?? wc.name, wc);
      }
      scores[q.area] = bucket;
    }

    const computed = computeReadiness(scores);
    const weak = [...weakMap.values()];

    setAreaScores(scores);
    setReadiness(computed);
    setWeakConcepts(weak);
    setPhase("report");

    // 결과 저장 (로그인 사용자만)
    if (user) {
      setSaveState("saving");
      try {
        await diagnosticResultsApi.create({
          userId: user.id,
          areaScores: scores,
          weakConceptIds: weak.filter((w) => w.id).map((w) => w.id as string),
          weakConceptNames: weak.map((w) => w.name),
          paperReadiness: computed.paperReadiness,
          analysisReadiness: computed.analysisReadiness,
        });
        setSaveState("saved");
      } catch (err) {
        console.error("[diagnosis] save result failed", err);
        setSaveState("error");
      }
    }
  };

  const handleRetry = () => {
    setActiveQuestions([]);
    setAreaScores({});
    setWeakConcepts([]);
    setSaveState("idle");
    setPhase("landing");
  };

  return (
    <PageContainer width="default">
      <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
        <Link href="/archive">
          <Button variant="ghost" size="sm" className="mb-3">
            <ArrowLeft className="mr-1 h-4 w-4" />
            아카이브
          </Button>
        </Link>

        <PageHeader
          icon={ClipboardCheck}
          title="교육공학 진단평가"
          description="통계방법 · 연구방법 · 핵심개념을 진단해 논문 작성 준비도와 연구 분석 준비도를 확인하고, 약점 개념을 아카이브로 연결합니다."
        />

        <div className="mt-6">
          {loading && phase === "landing" ? (
            <div className="space-y-4">
              <Skeleton className="h-24 w-full rounded-2xl" />
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-40 w-full rounded-2xl" />
                ))}
              </div>
            </div>
          ) : phase === "landing" ? (
            <DiagnosisLanding
              countsByArea={countsByArea}
              totalQuestions={pool.length}
              onStart={handleStart}
              loading={loading}
            />
          ) : phase === "running" ? (
            <DiagnosisRunner
              questions={activeQuestions}
              onComplete={handleComplete}
              onCancel={handleRetry}
            />
          ) : (
            <DiagnosisReport
              areaScores={areaScores}
              paperReadiness={readiness.paperReadiness}
              analysisReadiness={readiness.analysisReadiness}
              weakConcepts={weakConcepts}
              onRetry={handleRetry}
              saveState={saveState}
            />
          )}
        </div>
      </div>
    </PageContainer>
  );
}
