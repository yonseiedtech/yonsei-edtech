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
  type CognitiveLevel,
  type CognitiveScore,
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
    cognitiveLevel: entry.cognitiveLevel,
    question: entry.question ?? "",
    options: entry.options,
    answerIndex: entry.answerIndex,
    items: entry.items,
    prompt: entry.prompt,
    answer: entry.answer,
    acceptedAnswers: entry.acceptedAnswers,
    statement: entry.statement,
    answerBool: entry.answerBool,
    leftItems: entry.leftItems,
    rightItems: entry.rightItems,
    correctMap: entry.correctMap,
    passage: entry.passage,
    relatedMethodName: entry.relatedMethodName,
    relatedStatMethodName: entry.relatedStatMethodName,
    explanation: entry.explanation,
    conceptSeedKey: entry.conceptSeedKey,
    published: true,
  };
}

/** 영역별 랜덤 출제 문항 수 (단일 영역 진단). 풀이 적으면 가용분만 출제. */
const QUESTIONS_PER_AREA = 6;

/** 전체 진단 1회 출제 총 문항 수(10문제 단위). 영역·유형·인지수준이 고루 섞이게 가중 추출. */
const TOTAL_QUESTIONS_ALL = 10;
/**
 * 전체 진단 시 영역별 출제 수 — 합 TOTAL_QUESTIONS_ALL.
 * 통계 4 · 연구방법 4 · 핵심개념 2.
 * v4: 연구설계·통계 실전 적용(scenario)·지문분석(passage)은 statistics·method 영역에 집중되어 있어
 *     두 영역 정원을 늘려(4·4) 신규 유형이 10문제 랜덤에 더 잘 포함되도록 한다.
 *     pickMixed 가 유형(type) 버킷을 라운드로빈으로 뽑으므로 정원이 클수록 다양한 유형이 섞인다.
 */
const ALL_AREA_QUOTA: Record<DiagnosticArea, number> = {
  statistics: 4,
  method: 4,
  concept: 2,
};

/** Fisher-Yates 셔플 (원본 불변) */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * 유형 폭이 고르게 섞이도록 가중 추출 — 유형(type) 버킷별로 셔플 후 라운드로빈으로 count 개 선택.
 * 유형 버킷을 번갈아 뽑으므로 한 유형(예: mcq)에 쏠리지 않고, 버킷 내부 셔플로 인지수준도 자연 분산된다.
 * 풀이 count 보다 적으면 가용분만 반환.
 */
function pickMixed(
  items: (DiagnosticQuestion & { conceptSeedKey?: string })[],
  count: number,
): (DiagnosticQuestion & { conceptSeedKey?: string })[] {
  if (items.length <= count) return shuffle(items);
  // 유형별 버킷(각 버킷 셔플). 버킷 순서도 셔플해 특정 유형이 항상 먼저 나오지 않도록.
  const buckets = new Map<string, (DiagnosticQuestion & { conceptSeedKey?: string })[]>();
  for (const q of shuffle(items)) {
    const t = questionType(q);
    if (!buckets.has(t)) buckets.set(t, []);
    buckets.get(t)!.push(q);
  }
  const bucketList = shuffle([...buckets.values()]);
  const picked: (DiagnosticQuestion & { conceptSeedKey?: string })[] = [];
  let drained = false;
  while (picked.length < count && !drained) {
    drained = true;
    for (const b of bucketList) {
      if (picked.length >= count) break;
      const next = b.shift();
      if (next) {
        picked.push(next);
        drained = false;
      }
    }
  }
  return picked;
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
  const [cognitiveScores, setCognitiveScores] = useState<
    Partial<Record<CognitiveLevel, CognitiveScore>>
  >({});
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

  // ── 진단 시작 (문제은행에서 가중 추출 — 매 진단 다른 문제, 영역·유형·인지수준 혼합) ──
  const handleStart = (area: DiagnosticArea | "all") => {
    const ordered: typeof pool = [];
    if (area === "all") {
      // 전체: 영역별 정원(ALL_AREA_QUOTA, 합 10)만큼 유형 혼합 추출. 영역 순서 유지(통계→연구방법→개념).
      for (const a of DIAGNOSTIC_AREA_ORDER) {
        const inArea = pool.filter((q) => q.area === a);
        ordered.push(...pickMixed(inArea, ALL_AREA_QUOTA[a]));
      }
    } else {
      // 단일 영역: 그 영역에서 유형 혼합으로 N개 추출.
      const inArea = pool.filter((q) => q.area === area);
      ordered.push(...pickMixed(inArea, QUESTIONS_PER_AREA));
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
    const cogScores: Partial<Record<CognitiveLevel, CognitiveScore>> = {};
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

      // 인지수준별 집계 (태깅된 문항만)
      if (q.cognitiveLevel) {
        const cb = cogScores[q.cognitiveLevel] ?? { correct: 0, total: 0 };
        cb.total += 1;
        if (correct) cb.correct += 1;
        cogScores[q.cognitiveLevel] = cb;
      }
    }

    const computed = computeReadiness(scores);
    const weak = [...weakMap.values()];

    setAreaScores(scores);
    setCognitiveScores(cogScores);
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
    setCognitiveScores({});
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
              cognitiveScores={cognitiveScores}
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
