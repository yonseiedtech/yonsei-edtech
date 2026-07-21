"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Blocks, Info, ArrowRight, FlaskConical, Layers, GraduationCap } from "lucide-react";
import PageContainer from "@/components/ui/page-container";
import BackButton from "@/components/ui/back-button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { archiveConceptsApi } from "@/lib/bkend";
import { RELATED_RESEARCH_METHOD_NAME } from "@/lib/program-development-guide";
import AddieStagesView from "./_components/AddieStagesView";
import GagneEventsView from "./_components/GagneEventsView";
import LessonDesignTools from "./_components/LessonDesignTools";

type DesignModel = "addie" | "gagne";

const MODEL_KEY = "program-development:model:v1";

/** 공백·대소문자 무시 정규화 (AectTerminologyBrowser 패턴 재사용) */
function normalize(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

const MODEL_TABS: { key: DesignModel; label: string; sub: string; icon: typeof Layers }[] = [
  { key: "addie", label: "ADDIE", sub: "프로그램 개발 · 거시 절차", icon: Layers },
  { key: "gagne", label: "가네의 9가지 교수절차", sub: "수업 설계 · 미시 절차", icon: GraduationCap },
];

export default function ProgramDesignDevelopmentPage() {
  const [model, setModel] = useState<DesignModel>("addie");
  // 개념 매칭: normalize(name/altName/aectTerm) → conceptId
  const [conceptIndex, setConceptIndex] = useState<Map<string, string>>(new Map());
  const [conceptLoading, setConceptLoading] = useState(true);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(MODEL_KEY);
      if (raw === "addie" || raw === "gagne") setModel(raw);
    } catch {
      /* 무시 */
    }
  }, []);

  function selectModel(next: DesignModel) {
    setModel(next);
    try {
      localStorage.setItem(MODEL_KEY, next);
    } catch {
      /* 무시 */
    }
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await archiveConceptsApi.list();
        if (cancelled) return;
        const idx = new Map<string, string>();
        for (const c of res.data) {
          const keys = [c.name, c.aectTerm, ...(c.altNames ?? [])].filter(
            (x): x is string => !!x && x.trim().length > 0,
          );
          for (const k of keys) {
            const nk = normalize(k);
            if (nk && !idx.has(nk)) idx.set(nk, c.id);
          }
        }
        setConceptIndex(idx);
      } catch (err) {
        console.error("[program-development] concept load failed", err);
      } finally {
        if (!cancelled) setConceptLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const matchConceptId = useCallback(
    (name: string): string | undefined => conceptIndex.get(normalize(name)),
    [conceptIndex],
  );

  return (
    <PageContainer width="narrow">
      <BackButton href="/steppingstone" label="인지디딤판" className="mb-4" />

      <header className="mb-6 flex items-start gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-cat-1/5 text-cat-1">
          <Blocks size={28} />
        </div>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">프로그램 설계·개발</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            연수·수업·HRD 프로그램을 설계·개발할 때 참고하는 셀프 가이드입니다. 프로그램 개발의 거시 절차
            <span className="whitespace-nowrap"> (ADDIE) </span>
            와 한 차시 수업 설계의 미시 절차(가네 9절차)를 함께 담고, 각 단계에서 참고할 교육공학 이론과
            작성 도구를 안내합니다.
          </p>
          <Badge variant="secondary" className="mt-2 text-[10px]">
            순화 표기: 교육 훈련 프로그램 개발 모형 · 9가지 외부적 교수절차
          </Badge>
        </div>
      </header>

      {/* 자체 구성 고지 */}
      <div className="mb-6 flex items-start gap-2 rounded-2xl border border-warning/20 bg-warning/5 p-3 text-xs leading-relaxed text-warning">
        <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        <p>
          본 가이드는 『교수학습공학』(이명근, 2025)의 &ldquo;이론 → 교수학습원리 → 공학 방안&rdquo; 체계와
          AECT 교육공학 정의를 <strong>참고해 학회가 자체 재서술</strong>한 셀프 가이드입니다. 원문을 그대로
          옮기지 않았으며, 실제 프로그램 설계는 지도교수·현장 여건과 함께 조정하세요.
        </p>
      </div>

      {/* 모델 전환 탭 */}
      <div className="mb-4">
        <div
          role="tablist"
          aria-label="설계 모델 선택"
          className="grid grid-cols-1 gap-2 sm:grid-cols-2"
        >
          {MODEL_TABS.map((tab) => {
            const active = model === tab.key;
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                role="tab"
                type="button"
                aria-selected={active}
                onClick={() => selectModel(tab.key)}
                className={cn(
                  "flex items-center gap-3 rounded-2xl border p-3 text-left transition-colors",
                  active
                    ? "border-primary bg-primary/5"
                    : "border-border bg-background hover:border-primary/30",
                )}
              >
                <span
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                    active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                  )}
                >
                  <Icon size={18} />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold">{tab.label}</span>
                  <span className="block text-[11px] text-muted-foreground">{tab.sub}</span>
                </span>
              </button>
            );
          })}
        </div>
        <p className="mt-2 flex items-start gap-1.5 text-[11px] leading-relaxed text-muted-foreground">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          두 모델은 상보적입니다. <strong>ADDIE</strong>는 프로그램 전체를 개발하는 거시 절차, <strong>가네
          9절차</strong>는 그 안의 한 차시 수업을 설계하는 미시 절차로 활용하세요.
        </p>
      </div>

      {/* 선택된 모델 뷰 */}
      {model === "addie" ? (
        <AddieStagesView matchConceptId={matchConceptId} conceptLoading={conceptLoading} />
      ) : (
        <GagneEventsView matchConceptId={matchConceptId} conceptLoading={conceptLoading} />
      )}

      {/* 교수학습 목표·과정안 작성 도구 */}
      <LessonDesignTools model={model} />

      {/* 관련 연구방법 참조 */}
      <div className="mt-10 rounded-2xl border border-primary/30 bg-primary/5 p-5">
        <div className="flex items-start gap-3">
          <FlaskConical className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
          <div className="flex-1">
            <h3 className="text-sm font-semibold">프로그램을 연구로 발전시키려면?</h3>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              설계·개발한 프로그램의 효과와 타당성을 학위논문·학술연구로 입증하고 싶다면, 연구방법 가이드의{" "}
              <strong>&ldquo;{RELATED_RESEARCH_METHOD_NAME}&rdquo;</strong> 절차를 참고하세요.
            </p>
            <Link
              href={`/archive/research-methods?q=${encodeURIComponent(RELATED_RESEARCH_METHOD_NAME)}`}
              className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
            >
              연구방법 가이드에서 보기
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </div>
      </div>

      <p className="mt-8 text-center text-xs text-muted-foreground">
        내용에 보완이 필요하면{" "}
        <Link href="/contact" className="underline hover:text-primary">
          문의 게시판
        </Link>
        으로 알려주세요.
      </p>
    </PageContainer>
  );
}
