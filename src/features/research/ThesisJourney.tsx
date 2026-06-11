"use client";

/**
 * 논문 여정 (Thesis Journey) — 학기 기반 순차적 논문 작성 가이드 (2026-06-11)
 *
 * 석사 5학기 표준 흐름(주제 탐색→구체화→계획서→데이터·본문→완성·심사)에 맞춰
 * "지금 학기에 무엇을 하면 되는지"와 추천 도구·방법론 팁을 한 카드로 제공한다.
 *
 * 단계 산정: user.thesisJourneyStage(수동 오버라이드) 우선,
 * 없으면 getEffectiveSemesterCount(누적학기 우선·달력 폴백)로 자동 추정.
 * 방법론 팁은 연구방법론 커리큘럼(타당도·인과·설계·통계 위계·작성 원칙)을 일반화한 내용.
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Compass,
  Target,
  FileText,
  Database,
  Award,
  Check,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  ArrowRight,
  Pencil,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { profilesApi } from "@/lib/bkend";
import { getEffectiveSemesterCount } from "@/lib/interview-target";
import type { User } from "@/types";

interface JourneyTool {
  label: string;
  href: string;
}

interface JourneyStage {
  stage: number;
  semesterLabel: string;
  title: string;
  icon: React.ElementType;
  goal: string;
  tools: JourneyTool[];
  tips: string[];
}

/** 대시보드 인사 헤더 등 외부에서 단계 메타 재사용 (체감 스프린트) */
export const JOURNEY_STAGES: JourneyStage[] = [
  {
    stage: 1,
    semesterLabel: "1학기",
    title: "주제 탐색",
    icon: Compass,
    goal: "관심 분야의 지형을 파악하고 선행 논문 읽기 습관을 만듭니다.",
    tools: [
      { label: "논문 읽기 시작", href: "/mypage/research?tab=reading" },
      { label: "졸업생 학위논문 둘러보기", href: "/alumni/thesis" },
      { label: "연구 흐름 분석 보기", href: "/research" },
      { label: "교육공학 아카이브", href: "/archive" },
    ],
    tips: [
      "시대별 키워드 흐름(연구 분석)으로 우리 전공에서 어떤 주제가 이어져 왔는지 먼저 봅니다.",
      "읽은 논문은 그때그때 분석 노트로 남겨야 2학기에 선행연구 정리가 빨라집니다.",
      "관심 개념은 아카이브에서 '개념→변인→측정도구' 연결을 확인해 두세요.",
    ],
  },
  {
    stage: 2,
    semesterLabel: "2학기",
    title: "주제 구체화",
    icon: Target,
    goal: "연구 문제를 측정 가능한 형태로 좁히고 선행연구를 체계적으로 정리합니다.",
    tools: [
      { label: "연구보고서(소논문) 작성", href: "/mypage/research?tab=writing&sub=report" },
      { label: "아카이브 변인·측정도구", href: "/archive" },
      { label: "읽기 리스트 정리", href: "/mypage/research?tab=reading" },
    ],
    tips: [
      "좋은 연구 문제는 '개념'이 아니라 '변인' 수준으로 진술됩니다 — 무엇을 어떻게 측정할지가 보여야 합니다.",
      "해당 분야 메타분석을 인용하면 연구 필요성과 기대 효과크기의 근거가 강해집니다.",
      "연구보고서 인터뷰 모드(분석·처방·실행연구 등 5트랙)로 한 사이클을 미리 경험해 보세요.",
    ],
  },
  {
    stage: 3,
    semesterLabel: "3학기",
    title: "연구계획서",
    icon: FileText,
    goal: "종합시험을 통과하고, 연구 설계가 정당화된 계획서를 완성합니다.",
    tools: [
      { label: "계획서 인터뷰 모드", href: "/mypage/research?tab=writing&sub=proposal" },
      { label: "연구방법론 개념(아카이브)", href: "/archive" },
      { label: "종합시험 현황", href: "/courses" },
    ],
    tips: [
      "설계 선택을 정당화하세요 — 현장 연구라면 '이질(비동등) 통제집단 사전-사후 설계'가 교육 연구에서 가장 강력하고 일반적입니다.",
      "인과 주장은 통계가 아니라 설계로 확보됩니다: ①시간 선행 ②관련성 ③경쟁 가설 배제, 3요건을 계획서에서 미리 논증하세요.",
      "집단 간 사전 점수가 다를 수 있다면 ANCOVA(공변량 통제)를 분석 계획에 명시해 두세요.",
    ],
  },
  {
    stage: 4,
    semesterLabel: "4학기",
    title: "데이터 수집·분석",
    icon: Database,
    goal: "자료를 수집하고 올바른 통계 기법으로 분석하며 본문(1~3장)을 작성합니다.",
    tools: [
      { label: "학위논문 본문 작성", href: "/mypage/research?tab=writing&sub=thesis" },
      { label: "연구 타이머로 집필 루틴", href: "/mypage/research?tab=timer" },
      { label: "통계 개념(아카이브)", href: "/archive" },
    ],
    tips: [
      "검정 위계를 기억하세요: 2집단=t검정 → 3집단↑=ANOVA(주효과+상호작용) → 사전 차이 통제=ANCOVA.",
      "범주형 배경변수(성별·학기 등)의 집단 동질성은 카이제곱(χ²)으로 검증하면 선발 위협 방어가 강해집니다.",
      "정규성 검정이 기각돼도 표본이 충분하면(n≥30) 중심극한정리로 모수 검정을 방어할 수 있습니다.",
      "탈락·결측은 '예방했다'가 아니라 실제 수치로 보고하는 것이 정석입니다.",
    ],
  },
  {
    stage: 5,
    semesterLabel: "5학기",
    title: "완성·심사 방어",
    icon: Award,
    goal: "결과·논의(4~5장)를 완성하고 타당도 위협 방어 논리로 심사를 준비합니다.",
    tools: [
      { label: "학위논문 마무리", href: "/mypage/research?tab=writing&sub=thesis" },
      { label: "논문 심사 연습 (따라읽기·STT)", href: "/steppingstone/thesis-defense" },
      { label: "작성 원칙·타당도(아카이브)", href: "/archive" },
    ],
    tips: [
      "한계 절은 '내적/외적 타당도 위협' 프레임으로 구조화하세요 — 성숙·호손효과·통계적 회귀 같은 요인을 명시적으로 호명하고 어떻게 통제·논의했는지 적습니다.",
      "'차이가 있다(비교)'와 '효과를 미친다(인과)'의 표현 수위를 점검하세요 — 인과 주장은 설계 근거와 함께만.",
      "작성 5원칙 최종 점검: '매우·크게' 같은 모호 표현은 수치로, 동일 개념은 한 용어로 통일, 방법·결과는 과거 시제.",
    ],
  },
];

interface Props {
  user: User;
  /** 본인 화면 여부 — 본인일 때만 단계 수정 가능 */
  editable?: boolean;
}

export default function ThesisJourney({ user, editable = true }: Props) {
  const autoStage = useMemo(() => {
    const sem = getEffectiveSemesterCount(user);
    if (sem == null) return null;
    return Math.min(Math.max(sem, 1), 5);
  }, [user]);

  const override = user.thesisJourneyStage;
  const initialStage =
    typeof override === "number" && override >= 1 && override <= 5
      ? override
      : (autoStage ?? 1);

  const [currentStage, setCurrentStage] = useState(initialStage);
  const [viewStage, setViewStage] = useState(initialStage);
  const [expanded, setExpanded] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const semCount = useMemo(() => getEffectiveSemesterCount(user), [user]);
  const isOverSemester = semCount != null && semCount > 5;

  async function handleStageChange(next: number) {
    setCurrentStage(next);
    setViewStage(next);
    setEditing(false);
    if (!editable) return;
    setSaving(true);
    try {
      await profilesApi.update(user.id, { thesisJourneyStage: next });
      toast.success(`내 논문 단계가 "${JOURNEY_STAGES[next - 1].title}"(으)로 설정되었습니다.`);
    } catch {
      toast.error("단계 저장에 실패했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setSaving(false);
    }
  }

  const stage = JOURNEY_STAGES[viewStage - 1];
  const StageIcon = stage.icon;
  const isCurrentView = viewStage === currentStage;

  return (
    <section
      aria-label="논문 여정"
      className="rounded-2xl border-2 border-primary/20 bg-gradient-to-br from-primary/5 via-card to-card p-5 shadow-sm"
    >
      {/* ── 헤더 ── */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-bold tracking-tight">📖 나의 논문 여정</h2>
          {isOverSemester && (
            <Badge variant="secondary" className="text-[10px]">수료/초과 학기</Badge>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {editable && (
            <button
              type="button"
              onClick={() => setEditing((v) => !v)}
              disabled={saving}
              className="inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] text-muted-foreground hover:bg-muted"
            >
              <Pencil size={11} />
              단계 수정
            </button>
          )}
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            className="rounded-lg border p-1 text-muted-foreground hover:bg-muted"
            aria-label={expanded ? "여정 접기" : "여정 펼치기"}
          >
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>
      <p className="mt-0.5 text-[11px] text-muted-foreground">
        {typeof override === "number"
          ? "직접 설정한 단계 기준입니다."
          : autoStage != null
            ? `입학 학기 기준 ${semCount}학기차로 추정했습니다 — 다르면 "단계 수정"으로 바꿔주세요.`
            : "학기 정보가 없어 1단계부터 시작합니다 — \"단계 수정\"으로 내 단계를 선택하세요."}
      </p>

      {/* ── 단계 수정 모드 ── */}
      {editing && (
        <div className="mt-3 flex flex-wrap gap-1.5 rounded-xl border bg-muted/40 p-2.5">
          {JOURNEY_STAGES.map((s) => (
            <button
              key={s.stage}
              type="button"
              disabled={saving}
              onClick={() => handleStageChange(s.stage)}
              className={cn(
                "rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors",
                s.stage === currentStage
                  ? "border-primary bg-primary text-primary-foreground"
                  : "bg-card hover:bg-muted",
              )}
            >
              {s.semesterLabel} {s.title}
            </button>
          ))}
        </div>
      )}

      {/* ── 스테퍼 ── */}
      <ol className="mt-4 flex items-center gap-0 overflow-x-auto pb-1" aria-label="논문 여정 5단계">
        {JOURNEY_STAGES.map((s, idx) => {
          const done = s.stage < currentStage;
          const active = s.stage === currentStage;
          const viewing = s.stage === viewStage;
          return (
            <li key={s.stage} className="flex min-w-0 flex-1 items-center">
              <button
                type="button"
                onClick={() => setViewStage(s.stage)}
                aria-current={active ? "step" : undefined}
                className={cn(
                  "group flex min-w-0 flex-col items-center gap-1 px-1 text-center",
                  viewing ? "" : "opacity-80 hover:opacity-100",
                )}
              >
                <span
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold transition-all",
                    done
                      ? "border-primary bg-primary text-primary-foreground"
                      : active
                        ? "border-primary bg-primary/10 text-primary ring-4 ring-primary/15"
                        : "border-muted-foreground/30 bg-card text-muted-foreground",
                    viewing && !active && "border-primary/50",
                  )}
                >
                  {done ? <Check size={14} /> : s.stage}
                </span>
                <span
                  className={cn(
                    "w-full truncate text-[10px] font-medium leading-tight",
                    active ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  {s.semesterLabel}
                  <br />
                  {s.title}
                </span>
              </button>
              {idx < JOURNEY_STAGES.length - 1 && (
                <span
                  aria-hidden
                  className={cn(
                    "mx-0.5 mb-5 h-0.5 flex-1 rounded-full",
                    s.stage < currentStage ? "bg-primary" : "bg-muted",
                  )}
                />
              )}
            </li>
          );
        })}
      </ol>

      {/* ── 현재(또는 선택) 단계 카드 ── */}
      {expanded && (
        <div className="mt-4 rounded-xl border bg-card p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <StageIcon size={20} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-bold">
                  {stage.semesterLabel} — {stage.title}
                </h3>
                {!isCurrentView && (
                  <Badge variant="outline" className="text-[10px]">
                    {viewStage < currentStage ? "지난 단계" : "다음 단계 미리보기"}
                  </Badge>
                )}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{stage.goal}</p>
            </div>
          </div>

          {/* 추천 도구 */}
          <div className="mt-3 flex flex-wrap gap-1.5">
            {stage.tools.map((t) => (
              <Link
                key={t.href + t.label}
                href={t.href}
                className="inline-flex items-center gap-1 rounded-lg border bg-card px-2.5 py-1.5 text-xs font-medium transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
              >
                {t.label}
                <ArrowRight size={11} />
              </Link>
            ))}
          </div>

          {/* 방법론 팁 */}
          <div className="mt-3 rounded-lg bg-muted/40 p-3">
            <p className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
              <Lightbulb size={12} className="text-amber-500" />
              이 단계의 연구방법론 팁
            </p>
            <ul className="mt-1.5 space-y-1.5">
              {stage.tips.map((tip, i) => (
                <li key={i} className="flex gap-1.5 text-xs leading-relaxed text-foreground/90">
                  <span className="mt-0.5 shrink-0 text-primary">·</span>
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </section>
  );
}
