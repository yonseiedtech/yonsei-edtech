"use client";

/**
 * 학위논문 에디터 v2 (2026-06-11 — 구조화 작성 도구로 격상)
 *
 * v1(챕터당 textarea 1개) → v2 변경점:
 *  1. 연구 방향 프로파일: 첫 작성 시 양적/질적/혼합 × 설계 유형 선택 다이얼로그.
 *     → 연구방법·결과 장의 섹션 템플릿과 "심사위원의 눈" 가이드가 유형별 분기.
 *  2. 섹션·단락 구조화: 챕터 = 섹션(소제목) 배열, 섹션 = 단락 배열.
 *     소제목 수정·섹션 추가/삭제·단락 추가/삭제/수정. 기존 평문은 자동 이전(빈 줄 분리).
 *  3. 버전 스냅샷: writing_paper_history(자동 통계 로그)와 구분되는 명시적
 *     라벨 저장·복원·삭제 (writing_paper_versions, 복원 전 자동 백업).
 *
 * 호환: 저장 시 sections 를 평문으로 직렬화해 chapters 에도 기록
 *       (콘솔 어드민·작성 이력 charCount·인쇄 뷰 등 기존 소비처 무수정 동작).
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import Link from "next/link";
import {
  Save, FileText, CheckCircle2, ChevronLeft, ChevronRight,
  BookOpen, FlaskConical, Microscope, BarChart3, Flag,
  Play, Timer, Lightbulb, Plus, Trash2, History,
  Diff, RotateCcw, ArrowUp, ArrowDown, Download, ClipboardCheck, Quote, Copy, Calculator,
  Loader2, Compass, GraduationCap, Paperclip, BookMarked, ListOrdered,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { chapterCharCount } from "./thesis-progress";
import { lintThesis, questionCoverage, LINT_CHAPTER_LABELS, type LintIssue, type QuestionCoverage } from "./writing-lint";
import StyleCheckPanel from "./StyleCheckPanel";
import ResearchQuestionsPanel from "./ResearchQuestionsPanel";
import AppendixPanel from "./AppendixPanel";
import TableBuilderDialog from "./TableBuilderDialog";
import { phrasesForChapter } from "./phrase-bank";
import MethodHelper, { STAT_METHOD_DESCRIPTIONS, type DesignRef } from "./MethodHelper";
import DataAnalyzer from "./DataAnalyzer";
import ReadingDrawer from "./ReadingDrawer";
import AbstractPanel from "./AbstractPanel";
import EthicsChecklistPanel from "./EthicsChecklistPanel";
import MethodStructurePanel from "./MethodStructurePanel";
import { logEditorEvent } from "./editor-telemetry";
import type {
  User,
  WritingPaper,
  WritingPaperChapterKey,
  WritingSection,
  WritingResearchProfile,
  ResearchApproachType,
  ResearchDesignType,
  WritingPaperVersion,
  ResearchQuestionItem,
  StatisticalMethod,
  AppendixItem,
  InstrumentItem,
  ProcedureStep,
} from "@/types";
import {
  WRITING_APPROACH_LABELS,
  RESEARCH_DESIGN_LABELS,
  STAT_METHOD_LABELS,
} from "@/types";
import type { StatMethodType } from "@/types";
import { advisorFeedbackApi, writingPapersApi, writingPaperVersionsApi, researchProposalsApi, researchReportsApi, researchPapersApi, statisticalMethodsApi } from "@/lib/bkend";
import type { AdvisorFeedbackNote, ResearchProposal, ResearchReport, ResearchPaper } from "@/types";
import { formatApa7List } from "@/lib/apa7";
import { buildMatrixTable, hasMatrixData } from "./literature-matrix";
import { useStudyTimerStore } from "./study-timer/study-timer-store";
import { useCreateSession, useStudySessionsByWritingPaper } from "./study-timer/useStudySessions";
import {
  useWritingPaper,
  useEnsureWritingPaper,
  useUpdateWritingPaper,
} from "./useWritingPaper";
import { useLogWritingActivity } from "./useWritingPaperHistory";
import ResearchJourneyGuide from "./ResearchJourneyGuide";

interface Props {
  user: User;
  readOnly?: boolean;
}

const STEPS = [
  { key: "intro" as const, label: "서론", icon: BookOpen },
  { key: "background" as const, label: "이론적 배경", icon: FlaskConical },
  { key: "method" as const, label: "연구 방법", icon: Microscope },
  { key: "results" as const, label: "연구 결과", icon: BarChart3 },
  { key: "conclusion" as const, label: "결론", icon: Flag },
];

type StepKey = (typeof STEPS)[number]["key"];

// ── 연구 방향 선택 설명 — 온보딩 다이얼로그 하단 안내 (2026-06-12, 사이클 32. 부심 2·10·11주차) ──

const APPROACH_DESCRIPTIONS: Record<ResearchApproachType, string> = {
  quantitative:
    "이론에서 가설을 세워 통계로 검증하는 연역적 접근입니다 — 다수 표본을 표집해 결과의 일반화를 목적으로 합니다.",
  qualitative:
    "참여·관찰·심층 면담으로 현상의 의미를 이해·해석하는 귀납적 접근입니다 — 소수 참여자를 깊게 다루며, 연구자 자신이 중요한 연구 도구가 됩니다.",
  mixed:
    "양적·질적 자료를 함께 수집해 수치 검증과 맥락 이해를 통합합니다 — 두 자료의 우선순위와 통합 방식을 설계 단계에서 정해야 합니다.",
};

const DESIGN_DESCRIPTIONS: Record<ResearchDesignType, string> = {
  experimental:
    "처치를 조작하고 참여자를 무선할당해 집단을 구성합니다 — 인과 추론력이 가장 강하지만, 학교·현장에서는 무선할당이 어려운 경우가 많습니다.",
  quasi_experimental:
    "기존 학급·집단 단위로 실험·통제집단을 구성합니다(비동등 통제집단 사전-사후) — 교육학 현장 연구에서 가장 강력하고 일반적인 설계이며, 집단 간 사전 차이는 ANCOVA로 통제합니다.",
  non_experimental:
    "변인을 조작하지 않고 설문·검사로 변인 간 관계를 파악합니다 — 인과관계를 주장할 수 없으므로 '관련이 있다' 수위로 기술합니다.",
  qualitative_design:
    "사례연구·현상학·근거이론 등으로 현상의 의미를 심층 탐구합니다 — 맥락의 풍부한 기술과 신뢰성 전략(삼각검증·참여자 확인)으로 일반화 한계를 방어합니다.",
  undecided:
    "아직 정하지 않아도 괜찮습니다 — 설계가 정해지면 언제든 다시 선택하세요. 연구 방법 장의 '연구 방법·분석 도우미'에서 설계 9종을 비교해볼 수 있습니다.",
};

/** 챕터·연구 접근별 추천 섹션 템플릿 */
function templateHeadings(
  chapter: WritingPaperChapterKey,
  approach: ResearchApproachType,
): string[] {
  const qual = approach === "qualitative";
  switch (chapter) {
    case "intro":
      // R1(2026-07-03): 용어의 정의(조작적 정의) 절 — 석사논문 필수 요건
      return ["연구의 필요성", "연구 목적", "용어의 정의"];
    case "background":
      // 2026-07-03 사용자 요청: 기본 절명은 "이론적 배경 N" — 절 이름은 헤더에서 자유 수정.
      // (기존 가이드 절명은 SECTION_GUIDES 키워드로 계속 지원 — 사용자가 이름을 바꾸면 매칭)
      return qual
        ? ["이론적 배경 1", "이론적 배경 2", "이론적 배경 3"]
        : ["이론적 배경 1", "이론적 배경 2", "이론적 배경 3", "연구모형 및 가설"];
    case "method":
      // R1(2026-07-03): 연구 절차(사전-처치-사후 타임라인) 절 추가
      // R2(2026-07-03): '연구 윤리' 절 — 동의·IRB·개인정보 보고 (P0 필수 요건)
      return qual
        ? ["연구 설계", "연구 참여자", "연구 절차", "자료 수집", "자료 분석", "신뢰성·타당성 확보", "연구 윤리"]
        : ["연구 설계", "연구 대상", "측정 도구", "프로그램 설계 및 적용", "연구 절차", "자료 수집 및 분석", "연구 윤리"];
    case "results":
      return qual
        ? ["주제(테마)별 결과"]
        : ["기술통계 및 가정 검정", "연구문제별 결과"];
    case "conclusion":
      // R1(2026-07-03): 논의(선행연구와의 비교 해석)를 결론과 분리 — 심사 단골 요구
      return ["요약", "논의", "결론", "한계 및 제언"];
  }
}

/** 챕터별 심사 방어 가이드 — 연구 접근에 따라 method/results 분기 */
const CHAPTER_GUIDES_BASE: Record<WritingPaperChapterKey, string[]> = {
  intro: [
    "연구 필요성에 해당 분야 메타분석 결과를 인용하면 근거가 한층 강해집니다.",
    "연구 문제는 '개념'이 아니라 '변인' 수준으로 — 무엇을 어떻게 측정할지 보이게 진술하세요.",
    "'본 연구의 목적은 ~'으로 시작했으면 '~하는 데 있다'로 받아야 주술 호응이 맞습니다.",
    "핵심 용어는 처음 명명한 표현으로 논문 끝까지 통일합니다 (일관성 원칙).",
  ],
  background: [
    "깔때기 구조로 조직하세요 — 가장 큰 개념(예: 구성주의·학습자 중심 교육)에서 시작해 내 연구의 변인으로 점차 좁혀갑니다. 절 배치 순서가 곧 논증 순서입니다.",
    "절 제목을 '인지 부하 이론'처럼 일반론으로 두지 마세요 — 연구 문제에서 다루는 하위 변인·맥락이 절 제목에 드러나야 합니다.",
    "절과 절 사이의 이론적 흐름이 이어져야 합니다(예: 구성주의 → 비고츠키 → 매개 도구) — 각 절이 어느 연구 문제·가설을 받치는지 점검하세요.",
    "이론적 배경은 서론(필요성)과 연구 방법(설계)을 지지하는 다리입니다 — 석사논문의 차별성은 선행 연구에 새 요소·관점을 더하는 데서 나오므로, '기존 연구 조합 + 내가 더한 지점'이 보이게 하세요.",
    "핵심 구인마다 '개념 정의 → 측정 방법 → 선행연구 결과' 순으로 조직하면 읽기 쉽습니다.",
    "이론·정의는 현재시제(~이다), 특정 연구의 결과는 과거시제(~하였다)로 구분합니다.",
    "변인 간 관계의 선행연구 근거가 연구모형·가설로 자연스럽게 이어지는지 점검하세요.",
  ],
  method: [
    "설계 선택을 정당화하세요 — 현장 연구라면 '이질(비동등) 통제집단 사전-사후 설계'가 교육 연구에서 가장 강력하다는 위계로 설명할 수 있습니다.",
    "표본은 모집단 → 표집 방법 → 최종 표본 순으로, 탈락·결측은 실제 수치로 보고합니다.",
    "측정도구는 신뢰도(Cronbach's α)와 타당도(전문가 내용타당도·요인구조)를 함께 보고합니다.",
    "분석 방법 선택 이유를 명시하세요: 사전 점수 차이 통제=ANCOVA, 범주형 배경변수 동질성=카이제곱(χ²).",
  ],
  results: [
    "결과 기술은 과거시제로, p값과 함께 효과크기(Cohen's d, η²)를 보고합니다.",
    "가정 검정(정규성·등분산)을 먼저 보고하세요 — 정규성이 기각돼도 n≥30이면 중심극한정리로 방어할 수 있습니다.",
    "결과 장에서는 '차이가 있었다'(비교)로 기술하고, '효과를 미쳤다'(인과)는 설계 근거와 함께 논의에서 다룹니다.",
    "'매우·크게' 같은 모호한 정도 표현 대신 구체적 수치를 사용합니다 (정확성 원칙).",
  ],
  conclusion: [
    "결과 ≠ 결론 — 결과 요약을 넘어 해석과 시사점으로 나아가야 합니다.",
    "한계 절은 '내적/외적 타당도 위협' 프레임으로 구조화하세요: 성숙·호손효과·통계적 회귀 같은 요인을 명시적으로 호명하고 어떻게 통제·논의했는지 적습니다.",
    "인과 주장을 한다면 3요건(시간 선행·관련성·경쟁가설 배제) 충족을 구조적으로 논증하세요.",
    "후속연구 제언에서 매개 기제 검증은 구조방정식(SEM) 기반으로 제안하면 설득력이 높습니다.",
  ],
};

const QUALITATIVE_GUIDE_OVERRIDES: Partial<Record<WritingPaperChapterKey, string[]>> = {
  method: [
    "연구 참여자 선정 기준과 연구 맥락(현장)을 구체적으로 기술하세요 — 질적 연구의 일반화는 '맥락의 풍부한 기술'에서 나옵니다.",
    "자료 수집·분석 절차의 감사 추적(audit trail)을 남기고, 코딩→범주→주제 도출 과정을 투명하게 보여주세요.",
    "신뢰성 확보 전략(삼각검증·동료 검토·참여자 확인 member check)을 명시합니다.",
    "연구자의 위치와 성찰성(reflexivity)을 기술하면 심사 방어가 강해집니다.",
  ],
  results: [
    "주제(테마)별로 결과를 조직하고, 각 주장은 참여자 인용(원자료)으로 뒷받침하세요.",
    "인용문은 맥락(참여자·상황)을 함께 제시하고, 연구자 해석과 원자료를 구분합니다.",
    "소수 사례·반례(negative case)도 보고하면 분석의 신뢰성이 높아집니다.",
  ],
};

function getChapterGuides(
  chapter: WritingPaperChapterKey,
  approach: ResearchApproachType | undefined,
): string[] {
  if (approach === "qualitative" && QUALITATIVE_GUIDE_OVERRIDES[chapter]) {
    return QUALITATIVE_GUIDE_OVERRIDES[chapter]!;
  }
  return CHAPTER_GUIDES_BASE[chapter];
}

// ── 구조 헬퍼 ──

function uid(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `id_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
  }
}

function emptyParagraph() {
  return { id: uid(), text: "" };
}

/** 장 도입 요약 단락의 고정 헤딩 — UI 에서 번호 없는 전용 카드로 렌더 (2026-06-12) */
const CHAPTER_OVERVIEW_HEADING = "장 요약";

function isOverviewSection(sec: WritingSection): boolean {
  return sec.heading.trim() === CHAPTER_OVERVIEW_HEADING;
}

/** 섹션 배열 맨 앞에 장 요약 섹션 보장 (idempotent) — 빈 단락이라 직렬화·글자수에 무영향 */
function withOverview(list: WritingSection[]): WritingSection[] {
  if (list.some(isOverviewSection)) return list;
  return [{ id: uid(), heading: CHAPTER_OVERVIEW_HEADING, paragraphs: [emptyParagraph()] }, ...list];
}

function buildTemplateSections(headings: string[]): WritingSection[] {
  return withOverview(
    headings.map((heading) => ({ id: uid(), heading, paragraphs: [emptyParagraph()] })),
  );
}

/** v1 평문 → 섹션 1개(빈 줄 기준 단락 분리)로 이전 */
function migratePlainText(text: string): WritingSection[] {
  const paragraphs = text
    .split(/\n{2,}/)
    .map((t) => t.trim())
    .filter(Boolean)
    .map((t) => ({ id: uid(), text: t }));
  return [
    {
      id: uid(),
      heading: "본문",
      paragraphs: paragraphs.length > 0 ? paragraphs : [emptyParagraph()],
    },
  ];
}

type SectionsState = Record<WritingPaperChapterKey, WritingSection[]>;

interface FormState {
  title: string;
  sections: SectionsState;
  abstract: string;
  abstractKeywords: string[];
  /** R1(2026-07-03): 영문 초록 */
  abstractEn: string;
  /** R3(2026-07-03): 참고문헌 텍스트 — APA7 생성 후 자유 편집 */
  references: string;
  researchQuestions: ResearchQuestionItem[];
  appendices: AppendixItem[];
  /** R2(2026-07-03): 연구윤리 체크리스트 완료 항목 */
  ethicsChecked: string[];
  /** R5(2026-07-03): 측정도구 신뢰도 표 · 연구 절차 타임라인 */
  instruments: InstrumentItem[];
  procedureSteps: ProcedureStep[];
}

const CHAPTER_KEYS: WritingPaperChapterKey[] = ["intro", "background", "method", "results", "conclusion"];

/** 복원 직전 자동 저장되는 버전 라벨 prefix — 일괄 정리 매칭에 사용 */
const AUTO_BACKUP_PREFIX = "복원 전 자동 백업";

// ── 분석 방법별 기본 가정 검정 (2026-06-12) ──
// 결과 장에서 자동 표시 + 보고 골격 원클릭 삽입. archiveQuery 는 archive-seed 실존 개념명.

const ASSUMPTION_SECTION_HEADING = "기술통계 및 가정 검정";

interface AssumptionGuide {
  /** 보고 전 확인할 가정 체크리스트 */
  assumptions: string[];
  /** '가정 검정' 섹션에 삽입되는 보고 골격 단락 — ___ 를 결과값으로 채움 */
  skeleton: string[];
  /** 아카이브 가이드 딥링크 (전체 경로) */
  archiveHref?: string;
}

const ASSUMPTION_GUIDES: Record<StatMethodType, AssumptionGuide> = {
  ttest: {
    assumptions: [
      "종속변수 정규성 — Shapiro-Wilk 또는 왜도·첨도(|왜도|<2, |첨도|<7)로 확인",
      "등분산성 — 독립표본이면 Levene 검정, 위반 시 Welch's t 로 보고",
      "관측치 독립성 — 대응표본이면 차이값의 정규성을 확인",
      "정규성이 기각돼도 집단별 n≥30이면 중심극한정리로 방어할 수 있습니다",
    ],
    skeleton: [
      "분석에 앞서 종속변수의 정규성을 Shapiro-Wilk 검정으로 확인한 결과, 모든 집단에서 정규성 가정을 충족하였다(W = ___, p > .05).",
      "Levene의 등분산성 검정 결과 분산의 동질성 가정이 충족되었다(F = ___, p > .05).",
    ],
    archiveHref: "/archive/statistical-methods?q=%EC%A4%91%EC%8B%AC%EA%B7%B9%ED%95%9C",
  },
  anova: {
    assumptions: [
      "집단별 종속변수 정규성 — Shapiro-Wilk 또는 왜도·첨도",
      "등분산성 — Levene 검정, 위반 시 Welch's ANOVA·Brown-Forsythe 대안 보고",
      "관측치 독립성 — 표집·배치 절차에서 확보",
      "사후검정 선택 근거 — 등분산이면 Tukey HSD, 이분산이면 Games-Howell",
    ],
    skeleton: [
      "분산분석에 앞서 집단별 정규성(Shapiro-Wilk)과 등분산성(Levene)을 검토한 결과 가정이 충족되었다(정규성 모든 집단 p > .05; Levene F = ___, p > .05).",
    ],
    archiveHref: "/archive/statistical-methods?q=%EC%A4%91%EC%8B%AC%EA%B7%B9%ED%95%9C",
  },
  ancova: {
    assumptions: [
      "ANOVA 기본 가정(정규성·등분산성·독립성)에 더해 아래 두 가지가 핵심입니다",
      "회귀계수 동질성 — 집단×공변량 상호작용이 유의하지 않아야 함(p > .05, 본분석 전 선행 보고)",
      "공변량-처치 독립성 — 공변량(사전점수)은 처치 이전에 측정되어야 함",
      "공변량 측정 신뢰도 확인 — 신뢰도가 낮으면 통제 효과가 과소추정됩니다",
    ],
    skeleton: [
      "공분산분석의 전제인 회귀계수 동질성을 검정한 결과, 집단과 공변량(사전점수)의 상호작용이 통계적으로 유의하지 않아(F = ___, p > .05) 가정을 충족하였다.",
      "이에 사전점수를 공변량으로 투입하여 집단 간 사후점수 차이를 공분산분석으로 검증하였다.",
    ],
    archiveHref: "/archive/statistical-methods?q=ANCOVA",
  },
  regression: {
    assumptions: [
      "선형성 — 예측변수와 종속변수의 산점도 확인",
      "잔차 정규성 — P-P plot·히스토그램",
      "등분산성 — 잔차 산점도에서 패턴 없음",
      "다중공선성 — VIF < 10(보수적 기준 < 5), 공차한계 > .10",
      "잔차 독립성 — Durbin-Watson 통계량 2 내외",
    ],
    skeleton: [
      "회귀분석의 가정 검토 결과 잔차의 정규성과 등분산성이 확인되었으며, 모든 예측변수의 VIF는 ___로 다중공선성 문제가 없었고, Durbin-Watson 통계량은 ___로 잔차의 독립성이 확보되었다.",
    ],
    archiveHref: "/archive/statistical-methods?q=%ED%9A%8C%EA%B7%80",
  },
  correlation: {
    assumptions: [
      "Pearson 상관은 두 변수의 정규성과 선형 관계를 가정합니다",
      "산점도로 선형성·이상치를 먼저 확인",
      "정규성 위반 또는 서열 변수면 Spearman ρ 를 보고",
    ],
    skeleton: [
      "상관분석에 앞서 산점도와 정규성 검토를 통해 선형성 가정을 확인하였다. 정규성을 충족하지 않은 변수는 Spearman 상관계수를 함께 보고하였다.",
    ],
    archiveHref: "/archive/statistical-methods?q=%ED%9A%8C%EA%B7%80",
  },
  chisquare: {
    assumptions: [
      "기대빈도 5 미만인 셀이 전체의 20% 이하여야 함",
      "관측치 독립성 — 한 응답자는 한 셀에만 속해야 함",
      "2×2 분할표는 연속성 수정(Yates) 또는 Fisher 정확검정을 함께 검토",
    ],
    skeleton: [
      "카이제곱 검정의 가정 검토 결과 기대빈도가 5 미만인 셀은 전체의 ___%로 기준(20% 이하)을 충족하였다.",
    ],
    archiveHref: "/archive/statistical-methods?q=%EC%B9%B4%EC%9D%B4%EC%A0%9C%EA%B3%B1",
  },
  sem: {
    assumptions: [
      "다변량 정규성 — 위반 시 MLR(robust) 추정 또는 부트스트랩",
      "표본 크기 — 통상 N≥200 또는 자유모수당 10 이상 권장",
      "적합도 판단 기준을 사전 명시 — χ²/df ≤ 3, CFI·TLI ≥ .90, RMSEA ≤ .08, SRMR ≤ .08",
      "측정모형 검증(CFA) 후 구조모형 순서로 보고",
    ],
    skeleton: [
      "측정모형의 적합도는 χ²/df = ___, CFI = ___, TLI = ___, RMSEA = ___(90% CI ___~___), SRMR = ___로 수용 기준을 충족하였다.",
    ],
    archiveHref: "/archive/statistical-methods?q=%EA%B5%AC%EC%A1%B0%EB%B0%A9%EC%A0%95%EC%8B%9D",
  },
  factor_analysis: {
    assumptions: [
      "표본 적합성 — KMO ≥ .60(.80 이상 양호)",
      "Bartlett 구형성 검정 유의(p < .05)",
      "표본 크기 — 문항당 5~10명 권장",
      "공통성 .40 미만 문항은 제거·수정 검토",
    ],
    skeleton: [
      "요인분석의 적합성 검토 결과 KMO = ___로 기준을 충족하였고, Bartlett의 구형성 검정도 통계적으로 유의하였다(χ² = ___, p < .001).",
    ],
    archiveHref: "/archive/statistical-methods?q=%EC%9A%94%EC%9D%B8%EB%B6%84%EC%84%9D",
  },
};

// ── 분석 방법별 '자료 분석' 기술 골격 — 연구 방법 장용 (2026-06-12) ──
const ANALYSIS_SECTION_HEADING = "자료 분석";

const ANALYSIS_SKELETONS: Record<StatMethodType, string> = {
  ttest: "집단 간 ___의 차이를 검증하기 위해 독립표본 t검정을 실시하였다.",
  anova: "세 집단 이상의 ___ 차이를 검증하기 위해 일원분산분석(ANOVA)을 실시하였으며, 사후검정은 ___을 사용하였다.",
  ancova: "집단 간 사전점수 차이를 통제하기 위해 사전점수를 공변량으로 한 공분산분석(ANCOVA)을 실시하였다.",
  regression: "___이 ___에 미치는 영향을 검증하기 위해 회귀분석을 실시하였다.",
  correlation: "주요 변인 간 관계를 파악하기 위해 Pearson 상관분석을 실시하였다.",
  chisquare: "범주형 배경변수의 집단 간 동질성을 검증하기 위해 카이제곱(χ²) 검정을 실시하였다.",
  sem: "변인 간 구조적 관계와 매개효과를 검증하기 위해 구조방정식모형(SEM) 분석을 실시하였다.",
  factor_analysis: "측정도구의 구성타당도를 확인하기 위해 요인분석을 실시하였다.",
};

// ③→④ 연계: 아카이브 통계방법 seedKey → 에디터 StatMethodType (결과 템플릿 매핑)
// MANOVA·MANCOVA·CVI·CLT 등 StatMethodType 에 없는 항목은 매핑 생략(전용 템플릿 없음).
const SEEDKEY_TO_STATTYPE: Record<string, StatMethodType> = {
  "statistical-method:t-test": "ttest",
  "statistical-method:anova-oneway": "anova",
  "statistical-method:ancova": "ancova",
  "statistical-method:multiple-regression": "regression",
  "statistical-method:logistic-regression": "regression",
  "statistical-method:correlation": "correlation",
  "statistical-method:chi-square": "chisquare",
  "statistical-method:sem": "sem",
  "statistical-method:efa": "factor_analysis",
  "statistical-method:cfa": "factor_analysis",
};

// ── 분석 방법별 결과 '서술문' 템플릿 (2026-07-01) — '연구문제별 결과' 서술 골격 ──
// APA 보고 관례(통계량·자유도·p·효과크기)를 담은 문장 틀. 빈칸(___)은 본인 수치로 채운다.
const RESULTS_NARRATIVE_TEMPLATES: Record<StatMethodType, string> = {
  ttest:
    "독립표본 t검정 결과, 실험집단의 ___ 점수(M=___, SD=___)는 통제집단(M=___, SD=___)보다 높았으며, 그 차이는 통계적으로 유의하였다, t(___)=___, p___. 효과크기는 Cohen's d=___로 ___ 수준이었다.",
  anova:
    "일원분산분석 결과, ___에 따른 ___의 차이는 통계적으로 유의하였다, F(___, ___)=___, p___, η²=___. 사후검정(___) 결과, ___ 집단이 ___ 집단보다 유의하게 높았다.",
  ancova:
    "사전점수를 공변량으로 통제한 공분산분석 결과, 집단 간 사후 ___의 차이는 유의하였다, F(___, ___)=___, p___, 부분 η²=___. 조정된 평균은 실험집단 ___(SE=___), 통제집단 ___(SE=___)이었다.",
  regression:
    "회귀분석 결과, ___은(는) ___을(를) 유의하게 예측하였다, β=___, t=___, p___. 회귀모형의 설명력은 R²=___(조정 R²=___), F(___, ___)=___, p___이었다.",
  correlation:
    "상관분석 결과, ___와(과) ___는 유의한 (정적/부적) 상관을 보였다, r=___, p___. 주요 변인 간 상관계수는 <표 Ⅳ-_>에 제시하였다.",
  chisquare:
    "카이제곱 검정 결과, ___와(과) ___ 간의 관계는 통계적으로 유의하였다, χ²(___, N=___)=___, p___. 기대빈도 5 미만 셀의 비율을 확인하였다.",
  sem:
    "구조방정식모형 분석 결과, 모형의 적합도는 양호하였다(CFI=___, TLI=___, RMSEA=___, SRMR=___). ___→___ 경로계수는 유의하였다, β=___, p___. 간접효과는 부트스트래핑으로 검증하였다(간접효과=___, 95% CI[___, ___]).",
  factor_analysis:
    "요인분석 결과 ___개 요인이 추출되었으며, 총 설명분산은 ___%였다. 각 문항의 요인부하량은 ___ 이상이었고, 요인별 신뢰도는 Cronbach's α=___이었다.",
};

// ── 분석 방법별 결과 표 골격 — 가정·결과 보고용 텍스트 표 (2026-06-12, 사이클 31) ──
// 표 제목 첫 부분(slice 20)이 방법별로 달라 중복 삽입 가드 키로 사용한다.

const ANALYSIS_TABLE_TEMPLATES: Record<StatMethodType, string> = {
  ttest: `<표 Ⅳ-_> 집단별 기술통계 및 t검정 결과
구분 | 집단 | N | M | SD | t | p | Cohen's d
사전 | 실험 | ___ | ___ | ___ | ___ | ___ |
     | 통제 | ___ | ___ | ___ |     |     |
사후 | 실험 | ___ | ___ | ___ | ___ | ___ | ___
     | 통제 | ___ | ___ | ___ |     |     |`,
  anova: `<표 Ⅳ-_> 분산분석(ANOVA) 결과
변량원 | SS | df | MS | F | p | η²
집단 간 | ___ | ___ | ___ | ___ | ___ | ___
집단 내 | ___ | ___ | ___ |     |     |
전체   | ___ | ___ |     |     |     |`,
  ancova: `<표 Ⅳ-_> 공분산분석(ANCOVA) 결과 (공변량: 사전점수)
변량원        | SS | df | MS | F | p | η²
공변량(사전)  | ___ | ___ | ___ | ___ | ___ | ___
집단          | ___ | ___ | ___ | ___ | ___ | ___
오차          | ___ | ___ | ___ |     |     |

<표 Ⅳ-_> 집단별 사후점수 조정평균
집단 | N | M | SD | 조정 M | SE
실험 | ___ | ___ | ___ | ___ | ___
통제 | ___ | ___ | ___ | ___ | ___`,
  regression: `<표 Ⅳ-_> 회귀분석 결과
변인   | B | SE | β | t | p | VIF
(상수) | ___ | ___ |   | ___ | ___ |
___    | ___ | ___ | ___ | ___ | ___ | ___
R² = ___, F = ___ (p = ___), Durbin-Watson = ___`,
  correlation: `<표 Ⅳ-_> 주요 변인 간 상관계수
변인    | 1 | 2 | 3
1. ___  | 1 |   |
2. ___  | ___ | 1 |
3. ___  | ___ | ___ | 1
*p < .05, **p < .01`,
  chisquare: `<표 Ⅳ-_> 집단별 ___ 분포 및 동질성 검정 (χ²)
구분 | 실험집단 n(%) | 통제집단 n(%) | χ² | p
___  | ___ (___)     | ___ (___)     | ___ | ___
___  | ___ (___)     | ___ (___)     |     |`,
  sem: `<표 Ⅳ-_> 측정모형 적합도 지수
χ² | df | χ²/df | CFI | TLI | RMSEA (90% CI) | SRMR
___ | ___ | ___ | ___ | ___ | ___ (___~___) | ___`,
  factor_analysis: `<표 Ⅳ-_> 탐색적 요인분석 결과
문항        | 요인1 | 요인2 | 공통성
___         | ___   | ___   | ___
고유값      | ___   | ___   |
설명변량(%) | ___   | ___   |
KMO = ___, Bartlett χ² = ___ (p < .001)`,
};

/** MethodHelper 전달용 파생 맵 — 모듈 스코프에서 1회 계산 */
const ASSUMPTIONS_BY_METHOD = Object.fromEntries(
  (Object.keys(ASSUMPTION_GUIDES) as StatMethodType[]).map((k) => [k, ASSUMPTION_GUIDES[k].assumptions]),
) as Record<StatMethodType, string[]>;
const ARCHIVE_BY_METHOD = Object.fromEntries(
  (Object.keys(ASSUMPTION_GUIDES) as StatMethodType[]).map((k) => [k, ASSUMPTION_GUIDES[k].archiveHref]),
) as Partial<Record<StatMethodType, string>>;

// ── 섹션(소제목)별 작성 가이드 — 부심 강의 2·3주차 일반화 (2026-06-12) ──
// 헤딩 부분 매칭이라 사용자가 소제목을 일부 수정해도 동작한다.
const SECTION_GUIDES: { keywords: string[]; tips: string[] }[] = [
  {
    keywords: ["연구의 필요성", "연구 필요성"],
    tips: [
      "'왜 이 연구인가'는 선행연구의 부족한 점을 비판적으로 짚을 때 설득력이 생깁니다 — 요약 나열이 아니라 한계를 명시하고, 내 연구가 그 공백을 어떻게 채우는지로 마무리하세요.",
      "필요성 논증의 3축을 점검하세요: 참신성(새로운 문제·방법·자료) · 중요성(이론적 의의 + 실용적 가치) · 해결 가능성(내 역량과 환경에서 가능한 범위).",
      "근거 없이 변인을 등장시키면 연구의 중요성을 설명할 수 없고 결과 논의도 막힙니다 — 모든 핵심 변인은 선행연구·이론 근거와 함께 도입하세요.",
      "해당 분야 메타분석이 있다면 인용하세요 — 필요성과 기대 효과크기의 근거가 한층 강해집니다.",
    ],
  },
  {
    keywords: ["연구 목적", "연구목적"],
    tips: [
      "위계를 지키세요: 연구 주제(포괄) → 연구 목적('…에 차이가 있는지 살펴보고자 한다' 수준의 구체) → 연구 문제(매우 구체).",
      "'본 연구의 목적은 ~'으로 시작했다면 '~하는 데 있다'로 받아 주술 호응을 맞추세요.",
      "목적은 뒤이을 연구 문제로 자연스럽게 이어지도록 진술하세요 — 목적이 '무엇을 밝히려는가'라면, 연구 문제는 그것을 검증 가능한 물음으로 구체화한 것입니다.",
    ],
  },
  {
    keywords: ["용어의 정의", "용어 정의", "조작적 정의"],
    tips: [
      "핵심 변인마다 개념적 정의(이론에 근거한 의미)와 조작적 정의(본 연구에서 무엇으로 측정하는지)를 구분해 제시하세요.",
      "조작적 정의는 측정 도구와 1:1로 대응해야 합니다 — '본 연구에서 ○○은 △△(개발자, 연도) 척도로 측정한 점수를 의미한다' 형식이 표준입니다.",
      "여기서 명명한 표현을 논문 끝까지 통일하세요 — 같은 개념을 다른 이름으로 부르면 일관성 지적을 받습니다.",
    ],
  },
  {
    keywords: ["연구 문제", "연구문제"],
    tips: [
      "연구 문제는 서술문보다 의문문이 연구자의 생각을 더 분명히 보여줍니다 — 여러 개라면 복합 서술문 대신 각각 별개의 의문문으로 진술하세요.",
      "잘 진술된 연구 문제의 시금석: 서술문으로 바꿨을 때 그대로 연구 가설이 되는가? (예: '…에 따라 차이가 있을 것인가?' → '…에 따라 차이가 있다')",
      "연구 문제에는 독립변인(원인)과 종속변인(결과)이 측정 가능한 수준으로 드러나야 합니다.",
    ],
  },
  {
    keywords: ["핵심 개념", "개념과 이론", "이론적 고찰", "이론적 배경"],
    tips: [
      "가장 큰 개념(예: 구성주의)부터 제시하고 내 연구의 변인으로 점차 좁혀가세요 — 깔때기 구조가 이론적 배경의 정석입니다.",
      "구인(構因)마다 '개념 정의 → 측정 방법 → 선행연구 결과' 순으로 조직하면 읽기 쉽습니다.",
      "2차 자료(교과서·개론서)보다 1차 자료(학술지·학위논문)를 인용하세요 — 권위 있는 학술지 인용이 신뢰를 만듭니다.",
      "이론·정의는 현재시제(~이다), 특정 연구의 결과는 과거시제(~하였다)로 구분합니다.",
    ],
  },
  {
    keywords: ["선행연구", "선행 연구"],
    tips: [
      "선행연구 고찰은 요약 나열이 아니라 종합입니다 — 무엇이 밝혀졌고, 무엇이 엇갈리며, 무엇이 비어 있는지의 흐름으로 재구성하세요.",
      "문헌 고찰의 목적 5가지를 점검하세요: 현황 파악 · 연구 문제 정교화 · 해결 방안 탐색 · 이론적 기초 수립 · 기존 연구의 한계 파악.",
      "내 연구와 유사한 설계의 연구를 충분히 확보하세요 — 그 연구들의 방식·논리·한계가 내 연구 정당화의 재료가 됩니다.",
    ],
  },
  {
    keywords: ["연구모형", "가설"],
    tips: [
      "가설은 변인 간 관계에 대한 잠정적 결론입니다 — 이론·선행연구에 근거해 관계의 방향까지 진술하세요.",
      "변인 간 관계의 선행연구 근거가 연구모형·가설로 자연스럽게 이어지는지 점검하세요 — 근거 없는 경로는 심사에서 지적됩니다.",
    ],
  },
  // ── 연구 방법 장 — 부심 강의 4~7주차 일반화 (2026-06-12) ──
  {
    keywords: ["연구 대상", "연구대상", "연구 참여자"],
    tips: [
      "모집단 → 표집 방법 → 최종 표본 순으로 기술하고, 표집 방법(무선·층화·군집·편의·목적 등)을 명명하세요 — 편의 표집이라면 일반화 한계와 연결됩니다.",
      "표본 수의 절대 법칙은 없지만 분석 방법별 권장선을 근거로 제시하세요 — 예: t검정은 셀당 최소 5~7명, 10명 미만은 문제가 됩니다.",
      "범주형 배경변수(성별·학년·소속 등)의 집단 간 동질성은 카이제곱(χ²)으로 검증하면 선발 위협 방어가 강해집니다.",
      "탈락·결측은 '예방했다'가 아니라 실제 수치로 보고하는 것이 정석입니다.",
    ],
  },
  {
    keywords: ["측정 도구", "측정도구", "연구 도구", "검사 도구"],
    tips: [
      "도구마다 출처(원개발자·번안자)를 밝히고 '조작적 정의 → 문항 구성(하위요인·문항 수·척도) → 신뢰도 → 타당도' 순으로 기술하세요.",
      "신뢰도는 Cronbach's α(내적 일관성)가 보편적입니다 — 선행연구의 α와 본 연구 표본의 α를 함께 보고하면 방어가 강해집니다.",
      "신뢰도는 타당도의 필요조건일 뿐입니다(항상 5kg 적게 재는 체중계는 일관되지만 정확하지 않음) — 타당도 확보 방법을 별도로 명시하세요: 전문가 내용 타당도 / 기존 준거와의 상관(공인) / 요인분석(구인).",
      "리커트 척도는 경험적으로 4점 이상이면 등간으로 간주해 모수 통계에 활용합니다 — 단계 수·중립 범주 포함 여부는 응답 대상의 특성을 근거로 선택했음을 밝히세요.",
      "채점자가 개입하는 도구(루브릭·관찰지 등)는 관찰자 간 신뢰도를 함께 보고하세요.",
      "본 검사 전 파일럿 테스트로 문항을 점검·개선했다면 그 과정을 적으세요 — 도구의 엄격성을 보여주는 근거가 됩니다.",
    ],
  },
  {
    keywords: ["연구 절차", "연구절차", "실험 절차"],
    tips: [
      "처치 기간의 충분성을 점검하세요 — 1~2시간의 짧은 처치로는 근본적 변화를 관찰하기 어렵습니다. 인지·태도 변화를 다루면 최소 5차시 내외가 권장됩니다.",
      "사전검사 → 처치 → 사후검사의 시점과 간격을 명시하고, 두 집단이 처치 외 조건에서 동일했음을 보여주세요.",
    ],
  },
  {
    keywords: ["연구 윤리", "연구윤리", "윤리적 고려"],
    tips: [
      "사람을 대상으로 하는 연구는 소속 기관 IRB(기관생명윤리위원회) 심의 대상인지 먼저 확인하세요 — 학교 현장 연구도 예외가 아니며, 승인(또는 면제) 번호를 본문에 보고합니다.",
      "동의는 '누구에게, 무엇을 설명하고, 어떤 방식으로' 받았는지 구체적으로 — 미성년 참여자는 법정대리인 동의를 함께 받았음을 명시하세요.",
      "개인정보는 최소 수집·익명(가명) 처리·보관 기간·폐기 계획의 4요소로 보고하면 방어가 강해집니다.",
      "에디터의 '연구윤리 체크리스트'(방법 장 하단)를 점검하면 표준 보고 문형을 이 절에 삽입할 수 있습니다.",
    ],
  },
  {
    keywords: ["자료 분석", "분석 방법", "자료분석"],
    tips: [
      "분석 방법마다 선택 이유를 명시하세요 — 사전 점수 차이 통제=ANCOVA, 범주형 동질성=카이제곱(χ²), 2집단 비교=t검정.",
      "마지막에 유의수준을 명시하세요 — 예: '모든 통계 분석은 유의수준 .05에서 검증하였다.'",
      "사용한 통계 프로그램(SPSS·R 등)과 버전을 밝히는 것이 관례입니다.",
    ],
  },
  // ── 결과·결론 장 — 부심 강의 9·11·12·13·15주차 일반화 (2026-06-12) ──
  {
    keywords: ["기술통계"],
    tips: [
      "집단별 기술통계(사례 수·평균·표준편차)를 먼저 표로 제시한 뒤 가정 검정을 보고하세요 — 독자가 분포를 먼저 봐야 검정 결과를 해석할 수 있습니다.",
      "결과 기술은 과거시제로, p값과 함께 효과크기(Cohen's d, η²)를 보고하세요.",
    ],
  },
  {
    keywords: ["연구문제별", "연구 문제별", "가설 검증"],
    tips: [
      "서론의 연구 문제 순서 그대로 결과를 제시하세요 — 문제마다 '분석 결과 → 통계치(p·효과크기) → 한 줄 해석'의 리듬을 유지합니다.",
      "결과 장에서는 '차이가 있었다(비교)'로 기술하세요 — '효과를 미쳤다(인과)'는 설계 근거와 함께 논의에서 다룹니다.",
      "표·그림 번호와 본문 참조가 일치하는지, '매우·크게' 같은 모호 표현 대신 수치를 썼는지 점검하세요.",
    ],
  },
  {
    keywords: ["요약 및 논의", "논의"],
    tips: [
      "결과 ≠ 결론 — 결과 요약을 넘어, 선행연구와의 일치·불일치를 해석하고 그 이유를 논하세요.",
      "'차이가 있다(비교)'와 '효과를 미친다(인과)'의 표현 수위를 점검하세요 — 인과 주장은 설계(통제집단·시간 선행·경쟁가설 배제) 근거와 함께만.",
      "의견에는 근거를 붙이세요(객관성 원칙) — 해석마다 어떤 결과·선행연구에 기댄 것인지 드러나야 합니다.",
    ],
  },
  {
    keywords: ["시사점", "제언", "후속연구", "후속 연구"],
    tips: [
      "이론적 시사점과 실천적(현장) 시사점을 구분해 제시하면 기여가 분명해집니다.",
      "후속연구 제언은 한계와 짝을 이뤄야 합니다 — 본 연구가 못 한 것을 다음 연구가 어떻게 풀 수 있는지로 연결하세요.",
      "매개 기제 검증을 제언한다면 구조방정식(SEM) 기반으로 제안하면 설득력이 높습니다.",
    ],
  },
  {
    keywords: ["연구의 한계", "한계"],
    tips: [
      "한계 절은 '내적/외적 타당도 위협' 프레임으로 구조화하세요 — 성숙·호손효과·통계적 회귀·검사 경험 같은 요인을 명시적으로 호명하고 어떻게 통제·논의했는지 적습니다.",
      "한계는 변명이 아니라 방어입니다 — '무엇을 통제했고, 무엇이 남았으며, 후속연구가 어떻게 보완할 수 있는지'의 구조로 쓰세요.",
      "표본의 특수성(특정 학교·집단)이 있다면 일반화 한계(선발×실험 상호작용)로 명시하세요.",
    ],
  },
];

function getSectionGuides(heading: string): string[] | null {
  const h = heading.trim();
  if (!h) return null;
  const found = SECTION_GUIDES.find((g) => g.keywords.some((k) => h.includes(k)));
  return found ? found.tips : null;
}

function buildEmptyForm(approach: ResearchApproachType): FormState {
  const sections = {} as SectionsState;
  for (const k of CHAPTER_KEYS) sections[k] = buildTemplateSections(templateHeadings(k, approach));
  return { title: "", sections, abstract: "", abstractKeywords: [], abstractEn: "", references: "", researchQuestions: [], appendices: [], ethicsChecked: [], instruments: [], procedureSteps: [] };
}

function normalizeSections(list: WritingSection[]): WritingSection[] {
  return list.map((s) => ({
    id: s.id || uid(),
    heading: s.heading ?? "",
    paragraphs:
      s.paragraphs && s.paragraphs.length > 0
        ? s.paragraphs.map((p) => ({ id: p.id || uid(), text: p.text ?? "" }))
        : [emptyParagraph()],
  }));
}

function fromPaper(p: WritingPaper | undefined, approach: ResearchApproachType): FormState {
  if (!p) return buildEmptyForm(approach);
  const sections = {} as SectionsState;
  for (const k of CHAPTER_KEYS) {
    const structured = p.sections?.[k];
    if (structured && structured.length > 0) {
      sections[k] = withOverview(normalizeSections(structured));
    } else if (p.chapters?.[k]?.trim()) {
      sections[k] = withOverview(migratePlainText(p.chapters[k]!));
    } else {
      sections[k] = buildTemplateSections(templateHeadings(k, approach));
    }
  }
  return {
    title: p.title ?? "",
    sections,
    abstract: p.abstract ?? "",
    abstractKeywords: p.abstractKeywords ?? [],
    abstractEn: p.abstractEn ?? "",
    references: p.references ?? "",
    researchQuestions: p.researchQuestions ?? [],
    appendices: p.appendices ?? [],
    ethicsChecked: p.ethicsChecked ?? [],
    instruments: p.instruments ?? [],
    procedureSteps: p.procedureSteps ?? [],
  };
}

/** 콘솔·이력 등 기존 소비처 호환용 평문 직렬화 */
function serializeChapter(list: WritingSection[]): string {
  return list
    .map((s) => {
      const body = s.paragraphs.map((pp) => pp.text.trim()).filter(Boolean).join("\n\n");
      if (!body) return "";
      return s.heading.trim() ? `[${s.heading.trim()}]\n${body}` : body;
    })
    .filter(Boolean)
    .join("\n\n");
}

function serializeAll(sections: SectionsState): Record<WritingPaperChapterKey, string> {
  const out = {} as Record<WritingPaperChapterKey, string>;
  for (const k of CHAPTER_KEYS) out[k] = serializeChapter(sections[k]);
  return out;
}

function totalChars(form: FormState): number {
  return CHAPTER_KEYS.reduce(
    (sum, k) => sum + form.sections[k].reduce((s, sec) => s + sec.paragraphs.reduce((a, p) => a + p.text.length, 0), 0),
    0,
  );
}

function chapterChars(form: FormState, k: WritingPaperChapterKey): number {
  return form.sections[k].reduce((s, sec) => s + sec.paragraphs.reduce((a, p) => a + p.text.length, 0), 0);
}

function chapterIsEmpty(list: WritingSection[]): boolean {
  return list.every((sec) => sec.paragraphs.every((p) => !p.text.trim()));
}

export default function WritingPaperEditor({ user, readOnly = false }: Props) {
  const { paper, isLoading } = useWritingPaper(user.id);
  const ensure = useEnsureWritingPaper();
  const update = useUpdateWritingPaper();
  const logActivity = useLogWritingActivity();
  const queryClient = useQueryClient();

  const { active: timerActive, start: startTimer } = useStudyTimerStore();
  const { mutateAsync: createSession } = useCreateSession();
  const writingSessions = useStudySessionsByWritingPaper(paper?.id);
  const writingTotalMin = writingSessions.reduce((s, x) => s + (x.durationMinutes || 0), 0);
  const isTimerActive = timerActive?.writingPaperId === paper?.id;

  const profile: WritingResearchProfile | undefined = paper?.researchProfile;
  const approach: ResearchApproachType = profile?.approach ?? "quantitative";

  const [form, setForm] = useState<FormState>(() => buildEmptyForm("quantitative"));
  const [hydrated, setHydrated] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  /** 저장 경합 감지: hydrate/저장 시점의 서버 lastSavedAt — 저장 전 비교해 stale 덮어쓰기 차단 */
  const baseSavedAtRef = useRef<string | null>(null);
  const [step, setStep] = useState<StepKey>("intro");
  // 사이클 70: 초록 탭 — 5장 챕터(step)와 병렬 모드. step 타입은 그대로 두어 챕터 로직 무영향.
  const [onAbstract, setOnAbstract] = useState(false);
  const [onAppendix, setOnAppendix] = useState(false);
  const [onReferences, setOnReferences] = useState(false);
  const [refsBusy, setRefsBusy] = useState(false);
  // D: 이론배경/방법/결과/결론 절별 하위 탭 — 활성 절 인덱스(장 전환 시 0으로)
  const [sectionTab, setSectionTab] = useState(0);
  useEffect(() => {
    setSectionTab(0);
  }, [step]);
  // ③→④ 연계용: 아카이브 통계방법(id→seedKey 매핑)
  const [archiveStatMethods, setArchiveStatMethods] = useState<StatisticalMethod[]>([]);
  useEffect(() => {
    let cancelled = false;
    statisticalMethodsApi
      .listPublished()
      .then((res) => {
        if (!cancelled) setArchiveStatMethods(res.data);
      })
      .catch((err) => console.error("[writing-paper] stat methods load failed", err));
    return () => {
      cancelled = true;
    };
  }, []);
  // 결과 장 추천 대상 = 프로파일에서 고른 통계방법 ∪ 연구문제에 태그된 통계방법(③)
  const resultsMethods = useMemo<StatMethodType[]>(() => {
    const idToSeed = new Map(archiveStatMethods.map((s) => [s.id, s.seedKey ?? ""]));
    const set = new Set<StatMethodType>(profile?.methods ?? []);
    for (const q of form.researchQuestions) {
      for (const id of q.statMethodIds) {
        const t = SEEDKEY_TO_STATTYPE[idToSeed.get(id) ?? ""];
        if (t) set.add(t);
      }
    }
    return [...set];
  }, [archiveStatMethods, profile?.methods, form.researchQuestions]);
  const taggedOnlyMethods = useMemo(
    () => new Set(resultsMethods.filter((m) => !(profile?.methods ?? []).includes(m))),
    [resultsMethods, profile?.methods],
  );
  // Phase 4-A (지식 SSOT): StatMethodType → 아카이브 정확한 문서 딥링크.
  // 하드코딩된 검색쿼리(archiveHref) 대신, 로드된 아카이브 문서의 seedKey 역매핑으로 해석.
  const archiveDocHrefByType = useMemo(() => {
    const m = new Map<StatMethodType, string>();
    for (const doc of archiveStatMethods) {
      const t = SEEDKEY_TO_STATTYPE[doc.seedKey ?? ""];
      if (t && !m.has(t)) m.set(t, `/archive/statistical-methods/${doc.id}`);
    }
    return m;
  }, [archiveStatMethods]);
  const [guideOpen, setGuideOpen] = useState(false);
  const [sectionGuideOpen, setSectionGuideOpen] = useState<string | null>(null);
  const [lintOpen, setLintOpen] = useState(false);
  const [tocOpen, setTocOpen] = useState(false);
  const [tableBuilderOpen, setTableBuilderOpen] = useState(false);
  const [lintIssues, setLintIssues] = useState<LintIssue[] | null>(null);
  const [lintCoverage, setLintCoverage] = useState<QuestionCoverage[]>([]);
  const [phrasesOpen, setPhrasesOpen] = useState(false);
  const [analyzerOpen, setAnalyzerOpen] = useState(false);
  const ensureTriggeredRef = useRef(false);

  // 연구 방향 다이얼로그
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileDismissed, setProfileDismissed] = useState(false);
  const [selApproach, setSelApproach] = useState<ResearchApproachType>("quantitative");
  const [selDesign, setSelDesign] = useState<ResearchDesignType>("quasi_experimental");
  const [selMethods, setSelMethods] = useState<StatMethodType[]>([]);
  const [profileSaving, setProfileSaving] = useState(false);

  // 연구 코크핏 연동: 미반영 지도 노트 (본인 전용 — readOnly 조회에서는 비활성)
  const { data: feedbackNotes = [] } = useQuery({
    queryKey: ["advisor-feedback", user.id],
    enabled: !readOnly,
    queryFn: async () =>
      (await advisorFeedbackApi.listByUser(user.id)).data as AdvisorFeedbackNote[],
  });
  // P2: 연구계획서 — 빈 서론/방법 장 시딩용 (코크핏과 동일 캐시 키)
  const { data: proposals = [] } = useQuery({
    queryKey: ["research-proposals", user.id],
    queryFn: async () => (await researchProposalsApi.listByUser(user.id)).data as ResearchProposal[],
    enabled: !readOnly && !!user.id,
    staleTime: 5 * 60_000,
  });
  // R3: 연구보고서 — 서론(필요성)·이론적 배경 시딩용
  const { data: reports = [] } = useQuery({
    queryKey: ["research_report_for_paper", user.id],
    queryFn: async () => (await researchReportsApi.listByUser(user.id)).data as ResearchReport[],
    enabled: !readOnly && !!user.id,
    staleTime: 5 * 60_000,
  });
  const report = reports[0];
  // R4: 문헌 매트릭스 → 이론적 배경 비교표 삽입용 (ThesisJourney 와 캐시 공유)
  const { data: myPapers = [] } = useQuery({
    queryKey: ["research_papers", user.id],
    queryFn: async () => (await researchPapersApi.list(user.id)).data as ResearchPaper[],
    enabled: !readOnly && !!user.id,
    staleTime: 5 * 60_000,
  });
  const matrixPaperCount = useMemo(
    () => myPapers.filter((pp) => !pp.isDraft && hasMatrixData(pp)).length,
    [myPapers],
  );

  const pendingByChapter = useMemo(() => {
    const map = new Map<string, AdvisorFeedbackNote[]>();
    for (const n of feedbackNotes) {
      if (n.status !== "pending") continue;
      const list = map.get(n.chapter) ?? [];
      list.push(n);
      map.set(n.chapter, list);
    }
    return map;
  }, [feedbackNotes]);

  // 버전 패널
  const [versionsOpen, setVersionsOpen] = useState(false);
  const [versionLabel, setVersionLabel] = useState("");
  const [versionBusy, setVersionBusy] = useState(false);
  const [compareId, setCompareId] = useState<string | null>(null);
  const { data: allVersions = [] } = useQuery({
    queryKey: ["writing_paper_versions", user.id],
    queryFn: async () => {
      const res = await writingPaperVersionsApi.listByUser(user.id);
      return res.data as WritingPaperVersion[];
    },
    enabled: !!user.id,
  });
  const versions = useMemo(
    () =>
      allVersions
        .filter((v) => !paper || v.paperId === paper.id)
        .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? "")),
    [allVersions, paper],
  );

  async function handleStartWritingTimer() {
    if (timerActive) { toast.error("이미 진행 중인 세션이 있습니다"); return; }
    if (!paper) return;
    try {
      const session = await createSession({
        type: "writing",
        writingPaperId: paper.id,
        targetTitle: form.title || "(제목 미정)",
      });
      startTimer({
        id: session.id,
        type: "writing",
        writingPaperId: paper.id,
        targetTitle: form.title || "(제목 미정)",
        startTime: Date.now(),
      });
    } catch { toast.error("타이머 시작에 실패했습니다"); }
  }

  useEffect(() => {
    if (readOnly || isLoading || paper || ensureTriggeredRef.current) return;
    ensureTriggeredRef.current = true;
    ensure.mutate(user.id);
  }, [paper, isLoading, readOnly, user.id, ensure]);

  useEffect(() => {
    if (paper && !hydrated) {
      setForm(fromPaper(paper, paper.researchProfile?.approach ?? "quantitative"));
      setSavedAt(paper.lastSavedAt ?? paper.updatedAt ?? null);
      // QA P1: 다중 탭/기기 저장 경합 감지 기준점 (서버 lastSavedAt 스냅샷)
      baseSavedAtRef.current = paper.lastSavedAt ?? null;
      setHydrated(true);
    }
  }, [paper, hydrated]);

  // QA P1: 미저장 본문이 있을 때 새로고침·창 닫기 무경고 소실 방지
  useEffect(() => {
    if (!dirty || readOnly) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty, readOnly]);

  // 첫 작성자 온보딩: 프로파일 미설정 + 본문 거의 없음 → 연구 방향 선택 유도
  useEffect(() => {
    if (!hydrated || readOnly || !paper || profileDismissed || profileOpen) return;
    if (paper.researchProfile) return;
    if (totalChars(form) >= 50) return;
    setProfileOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, paper, readOnly]);

  // QA-v2: dirty 세대 토큰 — 저장 완료 시 "저장 시작 이후 입력이 없을 때만" dirty 를 내린다
  const dirtyGenRef = useRef(0);
  const dirtyRef = useRef(false);
  useEffect(() => {
    dirtyRef.current = dirty;
  }, [dirty]);

  function markDirty() {
    dirtyGenRef.current += 1;
    setDirty(true);
  }

  // QA-v2 High: SPA 내부 이동 가드 — beforeunload 는 클라이언트 라우팅을 못 막는다.
  // dirty 상태에서 내부 링크 클릭 시 확인 (capture 단계, Next Link 는 defaultPrevented 존중)
  useEffect(() => {
    if (readOnly) return;
    function onDocClick(e: MouseEvent) {
      if (!dirtyRef.current) return;
      const a = (e.target as HTMLElement | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a) return;
      const href = a.getAttribute("href") ?? "";
      if (!href.startsWith("/")) return; // 외부 링크·해시는 beforeunload 대상
      if (a.target === "_blank" || e.metaKey || e.ctrlKey || e.shiftKey) return;
      if (!confirm("저장되지 않은 변경이 있습니다. 이 페이지를 떠나면 사라질 수 있어요.\n이동할까요?")) {
        e.preventDefault();
        e.stopPropagation();
      }
    }
    document.addEventListener("click", onDocClick, true);
    return () => document.removeEventListener("click", onDocClick, true);
  }, [readOnly]);

  /** 현재 장을 기본 구성(템플릿)으로 초기화 — 이 장 내용 삭제 후 기본 절 구조로 되돌림 */
  function resetChapter(k: WritingPaperChapterKey) {
    if (readOnly) return;
    if (
      !confirm(
        `'${LINT_CHAPTER_LABELS[k]}' 장을 기본 구성으로 초기화할까요?\n현재 이 장에 작성한 내용은 삭제되고 기본 절 구조로 되돌아갑니다.`,
      )
    )
      return;
    const approach = profile?.approach ?? "quantitative";
    setForm((prev) => ({
      ...prev,
      sections: { ...prev.sections, [k]: buildTemplateSections(templateHeadings(k, approach)) },
    }));
    markDirty();
    toast.success(`'${LINT_CHAPTER_LABELS[k]}' 장을 기본 구성으로 초기화했습니다.`);
  }

  /** F: 현재 장의 활성 절에 표 단락 삽입 — 표 빌더 팝업(TableBuilderDialog)에서 호출 */
  function insertTable(tableText?: string) {
    if (readOnly || !paper) return;
    // QA-v2: 절이 없으면 삽입 자체가 안 되는데 성공 토스트가 뜨던 결함 — 선검사
    if (form.sections[step].every((sec) => isOverviewSection(sec))) {
      toast.error("표를 넣을 절이 없습니다 — 먼저 '절 추가'로 절을 만들어주세요.");
      return;
    }
    const table =
      tableText ??
      "<표 _-_> 표 제목\n구분 | 항목1 | 항목2 | 항목3\n___ | ___ | ___ | ___\n___ | ___ | ___ | ___";
    setForm((prev) => {
      const cur = [...prev.sections[step]];
      const bodyIdxs = cur.map((_s, i) => i).filter((i) => !isOverviewSection(cur[i]));
      if (bodyIdxs.length === 0) return prev;
      const targetIdx = bodyIdxs[Math.min(sectionTab, bodyIdxs.length - 1)];
      const sec = cur[targetIdx];
      cur[targetIdx] = { ...sec, paragraphs: [...sec.paragraphs, { id: uid(), text: table }] };
      return { ...prev, sections: { ...prev.sections, [step]: cur } };
    });
    markDirty();
    toast.success(
      tableText
        ? "표를 삽입했습니다 — 표 번호(<표 _-_>)를 채우고 저장하세요."
        : "표 골격을 추가했습니다 — 열·값을 채우세요.",
    );
  }

  // ── 섹션·단락 조작 ──

  function updateSection(k: WritingPaperChapterKey, sectionId: string, patch: Partial<WritingSection>) {
    // UX-1(2026-07-04): "장 요약"은 개요 절 식별자(헤딩 기반) — 일반 절 이름으로 쓰면
    // 해당 절이 편집 화면에서 사라지므로 차단
    if (patch.heading !== undefined && patch.heading.trim() === "장 요약") {
      toast.error("'장 요약'은 예약된 절 이름입니다 — 다른 이름을 사용해주세요.");
      return;
    }
    setForm((prev) => ({
      ...prev,
      sections: {
        ...prev.sections,
        [k]: prev.sections[k].map((s) => (s.id === sectionId ? { ...s, ...patch } : s)),
      },
    }));
    markDirty();
  }

  function updateParagraph(k: WritingPaperChapterKey, sectionId: string, paraId: string, text: string) {
    setForm((prev) => ({
      ...prev,
      sections: {
        ...prev.sections,
        [k]: prev.sections[k].map((s) =>
          s.id === sectionId
            ? { ...s, paragraphs: s.paragraphs.map((p) => (p.id === paraId ? { ...p, text } : p)) }
            : s,
        ),
      },
    }));
    markDirty();
  }

  function addParagraph(k: WritingPaperChapterKey, sectionId: string) {
    setForm((prev) => ({
      ...prev,
      sections: {
        ...prev.sections,
        [k]: prev.sections[k].map((s) =>
          s.id === sectionId ? { ...s, paragraphs: [...s.paragraphs, emptyParagraph()] } : s,
        ),
      },
    }));
    markDirty();
  }

  function removeParagraph(k: WritingPaperChapterKey, sectionId: string, paraId: string) {
    const sec = form.sections[k].find((s) => s.id === sectionId);
    const para = sec?.paragraphs.find((p) => p.id === paraId);
    if (para?.text.trim() && !confirm("이 단락을 삭제하시겠습니까?")) return;
    setForm((prev) => ({
      ...prev,
      sections: {
        ...prev.sections,
        [k]: prev.sections[k].map((s) => {
          if (s.id !== sectionId) return s;
          const remain = s.paragraphs.filter((p) => p.id !== paraId);
          return { ...s, paragraphs: remain.length > 0 ? remain : [emptyParagraph()] };
        }),
      },
    }));
    markDirty();
  }

  function moveParagraph(k: WritingPaperChapterKey, sectionId: string, paraId: string, dir: -1 | 1) {
    setForm((prev) => ({
      ...prev,
      sections: {
        ...prev.sections,
        [k]: prev.sections[k].map((s) => {
          if (s.id !== sectionId) return s;
          const idx = s.paragraphs.findIndex((p) => p.id === paraId);
          const to = idx + dir;
          if (idx < 0 || to < 0 || to >= s.paragraphs.length) return s;
          const arr = [...s.paragraphs];
          [arr[idx], arr[to]] = [arr[to], arr[idx]];
          return { ...s, paragraphs: arr };
        }),
      },
    }));
    markDirty();
  }

  function moveSection(k: WritingPaperChapterKey, sectionId: string, dir: -1 | 1) {
    setForm((prev) => {
      const arr = prev.sections[k];
      const idx = arr.findIndex((s) => s.id === sectionId);
      const to = idx + dir;
      if (idx < 0 || to < 0 || to >= arr.length) return prev;
      if (isOverviewSection(arr[to])) return prev; // 장 요약 위로는 이동 불가
      const next = [...arr];
      [next[idx], next[to]] = [next[to], next[idx]];
      return { ...prev, sections: { ...prev.sections, [k]: next } };
    });
    markDirty();
  }

  function addSection(k: WritingPaperChapterKey, heading = "새 절") {
    setForm((prev) => ({
      ...prev,
      sections: {
        ...prev.sections,
        [k]: [...prev.sections[k], { id: uid(), heading, paragraphs: [emptyParagraph()] }],
      },
    }));
    markDirty();
  }

  function removeSection(k: WritingPaperChapterKey, sectionId: string) {
    const sec = form.sections[k].find((s) => s.id === sectionId);
    const hasContent = sec?.paragraphs.some((p) => p.text.trim());
    if (hasContent && !confirm(`"${sec?.heading}" 절과 단락을 모두 삭제하시겠습니까?`)) return;
    setForm((prev) => {
      const remain = prev.sections[k].filter((s) => s.id !== sectionId);
      return {
        ...prev,
        sections: {
          ...prev.sections,
          [k]: remain.length > 0 ? remain : buildTemplateSections(templateHeadings(k, approach)),
        },
      };
    });
    markDirty();
  }

  // ── 저장 ──

  async function handleSave(showToast = true) {
    if (!paper || readOnly) return;
    setSaving(true);
    const now = new Date().toISOString();
    // QA-v2: 저장 시작 시점의 dirty 세대 — 저장 중 타이핑분이 payload 에 없으면 dirty 유지
    const genAtStart = dirtyGenRef.current;
    try {
      // QA P1: last-write-wins 경합 가드 — 다른 탭/기기에서 저장된 흔적이 있으면 확인 후 진행
      try {
        const fresh = await writingPapersApi.get(paper.id);
        const serverSavedAt = (fresh as WritingPaper | null)?.lastSavedAt ?? null;
        if (serverSavedAt && serverSavedAt !== baseSavedAtRef.current) {
          const ok = confirm(
            "다른 탭/기기에서 이 논문이 저장된 흔적이 있습니다.\n계속 저장하면 그 내용을 덮어씁니다. 진행할까요?\n(취소 후 새로고침하면 최신 내용을 불러옵니다)",
          );
          if (!ok) {
            setSaving(false);
            return;
          }
        }
      } catch {
        // 충돌 확인 실패는 저장을 막지 않음 (오프라인 등)
      }
      await update.mutateAsync({
        id: paper.id,
        data: {
          title: form.title,
          sections: form.sections,
          chapters: serializeAll(form.sections),
          abstract: form.abstract,
          abstractKeywords: form.abstractKeywords,
          abstractEn: form.abstractEn,
          references: form.references,
          researchQuestions: form.researchQuestions,
          appendices: form.appendices,
          ethicsChecked: form.ethicsChecked,
          instruments: form.instruments,
          procedureSteps: form.procedureSteps,
          lastSavedAt: now,
        },
      });
      setSavedAt(now);
      baseSavedAtRef.current = now;
      if (dirtyGenRef.current === genAtStart) {
        setDirty(false);
      } else if (showToast) {
        toast.info("저장 중 입력한 내용이 있어요 — 한 번 더 저장해주세요.");
      }
      logActivity.mutate({
        userId: user.id,
        paperId: paper.id,
        charCount: totalChars(form),
        lastChapter: step,
        title: form.title?.trim() || undefined,
      });
      if (showToast) toast.success("저장되었습니다.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "저장 실패");
    } finally {
      setSaving(false);
    }
  }

  // ── 연구 방향 프로파일 ──

  async function handleProfileSave() {
    if (!paper) return;
    setProfileSaving(true);
    try {
      const newProfile: WritingResearchProfile = {
        approach: selApproach,
        design: selDesign,
        methods: selApproach === "qualitative" ? [] : selMethods,
      };
      await update.mutateAsync({ id: paper.id, data: { researchProfile: newProfile } });
      // 작성 내용이 없는 챕터만 새 접근의 템플릿으로 재구성 (작성분 보존)
      setForm((prev) => {
        const next = { ...prev.sections } as SectionsState;
        for (const k of CHAPTER_KEYS) {
          if (chapterIsEmpty(next[k])) next[k] = buildTemplateSections(templateHeadings(k, selApproach));
        }
        return { ...prev, sections: next };
      });
      setProfileOpen(false);
      const methodNote =
        selApproach !== "qualitative" && selMethods.length > 0
          ? ` · 분석 ${selMethods.length}종 (결과 장에서 가정 검정 가이드 제공)`
          : "";
      toast.success(
        `연구 방향이 설정되었습니다 — ${WRITING_APPROACH_LABELS[selApproach]} · ${RESEARCH_DESIGN_LABELS[selDesign]}${methodNote}`,
      );
      // 가정을 놓치지 않도록 — 새로 선택된 방법의 골격을 방법·결과 장에 자동 배치
      if (selApproach !== "qualitative") {
        const prevMethods = profile?.methods ?? [];
        const newOnes = selMethods.filter((m) => !prevMethods.includes(m));
        if (newOnes.length > 0) seedScaffoldsForMethods(newOnes);
      }
    } catch {
      toast.error("저장에 실패했습니다.");
    } finally {
      setProfileSaving(false);
    }
  }

  function openProfileDialog() {
    setSelApproach(profile?.approach ?? "quantitative");
    setSelDesign(profile?.design ?? "quasi_experimental");
    setSelMethods(profile?.methods ?? []);
    setProfileOpen(true);
  }

  /** 선택한 분석 방법의 가정 검정 보고 골격을 결과 장 '가정 검정' 섹션에 삽입 */
  function insertAssumptionSkeleton(m: StatMethodType) {
    if (readOnly || !paper) return;
    const g = ASSUMPTION_GUIDES[m];
    const target = form.sections.results.find((sec) => sec.heading.includes("가정 검정"));
    const existing = target ? target.paragraphs.map((p) => p.text) : [];
    const adds = g.skeleton.filter((t) => !existing.some((e) => e.startsWith(t.slice(0, 14))));
    if (adds.length === 0) {
      toast.info(`${STAT_METHOD_LABELS[m]} 보고 골격은 이미 삽입되어 있습니다 — '${ASSUMPTION_SECTION_HEADING}' 절을 확인하세요.`);
      return;
    }
    setForm((prev) => {
      const cur = [...prev.sections.results];
      let idx = cur.findIndex((sec) => sec.heading.includes("가정 검정"));
      if (idx < 0) {
        cur.unshift({ id: uid(), heading: ASSUMPTION_SECTION_HEADING, paragraphs: [] });
        idx = 0;
      }
      const sec = cur[idx];
      const kept = sec.paragraphs.filter((p) => p.text.trim());
      cur[idx] = { ...sec, paragraphs: [...kept, ...adds.map((t) => ({ id: uid(), text: t }))] };
      return { ...prev, sections: { ...prev.sections, results: cur } };
    });
    markDirty();
    logEditorEvent(user.id, "assumption_insert");
    toast.success(`${STAT_METHOD_LABELS[m]} 가정 검정 보고 골격을 추가했습니다 — 빈칸(___)을 결과값으로 채우세요.`);
  }

  /** 선택한 분석 방법의 기술 골격을 연구 방법 장 '자료 분석' 절에 삽입 */
  function insertAnalysisSkeleton(m: StatMethodType) {
    if (readOnly || !paper) return;
    const text = ANALYSIS_SKELETONS[m];
    const matches = (h: string) => h.includes("자료 분석") || h.includes("자료분석") || h.includes("분석 방법");
    const target = form.sections.method.find((sec) => matches(sec.heading));
    const existing = target ? target.paragraphs.map((par) => par.text) : [];
    if (existing.some((e) => e.startsWith(text.slice(0, 12)))) {
      toast.info(`${STAT_METHOD_LABELS[m]} 기술 문장은 이미 삽입되어 있습니다 — '${ANALYSIS_SECTION_HEADING}' 절을 확인하세요.`);
      return;
    }
    setForm((prev) => {
      const cur = [...prev.sections.method];
      let idx = cur.findIndex((sec) => matches(sec.heading));
      if (idx < 0) {
        cur.push({ id: uid(), heading: ANALYSIS_SECTION_HEADING, paragraphs: [] });
        idx = cur.length - 1;
      }
      const sec = cur[idx];
      const kept = sec.paragraphs.filter((par) => par.text.trim());
      cur[idx] = { ...sec, paragraphs: [...kept, { id: uid(), text }] };
      return { ...prev, sections: { ...prev.sections, method: cur } };
    });
    markDirty();
    logEditorEvent(user.id, "analysis_insert");
    toast.success(`${STAT_METHOD_LABELS[m]} 기술 문장을 '${ANALYSIS_SECTION_HEADING}' 절에 추가했습니다 — 빈칸(___)을 변인명으로 채우세요.`);
  }

  /** 선택한 연구 설계의 기술 골격을 연구 방법 장 '연구 설계' 섹션에 삽입 */
  function insertDesignSkeleton(ref: DesignRef) {
    if (readOnly || !paper || !ref.skeleton) return;
    const text = ref.skeleton;
    const matches = (h: string) => h.includes("연구 설계") || h.includes("연구설계");
    const target = form.sections.method.find((sec) => matches(sec.heading));
    const existing = target ? target.paragraphs.map((par) => par.text) : [];
    if (existing.some((e) => e.startsWith(text.slice(0, 12)))) {
      toast.info("이 설계의 기술 골격은 이미 삽입되어 있습니다 — '연구 설계' 절을 확인하세요.");
      return;
    }
    setForm((prev) => {
      const cur = [...prev.sections.method];
      let idx = cur.findIndex((sec) => matches(sec.heading));
      if (idx < 0) {
        // 연구 설계는 방법 장의 첫 절이 관례 — 장 요약 바로 뒤에 배치
        const overviewIdx = cur.findIndex((sec) => isOverviewSection(sec));
        const insertAt = overviewIdx >= 0 ? overviewIdx + 1 : 0;
        cur.splice(insertAt, 0, { id: uid(), heading: "연구 설계", paragraphs: [] });
        idx = insertAt;
      }
      const sec = cur[idx];
      const kept = sec.paragraphs.filter((par) => par.text.trim());
      cur[idx] = { ...sec, paragraphs: [...kept, { id: uid(), text }] };
      return { ...prev, sections: { ...prev.sections, method: cur } };
    });
    markDirty();
    toast.success(`${ref.label} 기술 골격을 '연구 설계' 절에 추가했습니다 — 빈칸(___)을 채우세요.`);
  }

  /** 분석 방법의 결과 표 골격을 결과 장 '가정 검정' 섹션에 삽입 */
  function insertResultTable(m: StatMethodType) {
    if (readOnly || !paper) return;
    const table = ANALYSIS_TABLE_TEMPLATES[m];
    const guard = table.slice(0, 20);
    const target = form.sections.results.find((sec) => sec.heading.includes("가정 검정"));
    const existing = target ? target.paragraphs.map((par) => par.text) : [];
    if (existing.some((e) => e.startsWith(guard))) {
      toast.info(`${STAT_METHOD_LABELS[m]} 표 골격은 이미 삽입되어 있습니다.`);
      return;
    }
    setForm((prev) => {
      const cur = [...prev.sections.results];
      let idx = cur.findIndex((sec) => sec.heading.includes("가정 검정"));
      if (idx < 0) {
        cur.unshift({ id: uid(), heading: ASSUMPTION_SECTION_HEADING, paragraphs: [] });
        idx = 0;
      }
      const sec = cur[idx];
      const kept = sec.paragraphs.filter((par) => par.text.trim());
      cur[idx] = { ...sec, paragraphs: [...kept, { id: uid(), text: table }] };
      return { ...prev, sections: { ...prev.sections, results: cur } };
    });
    markDirty();
    logEditorEvent(user.id, "table_insert");
    toast.success(`${STAT_METHOD_LABELS[m]} 결과 표 골격을 추가했습니다 — 표 번호와 수치를 채우세요.`);
  }

  /** 통계방법별 결과 '서술문' 템플릿을 '연구문제별 결과' 섹션에 삽입 (2026-07-01) */
  function insertResultsNarrative(m: StatMethodType) {
    if (readOnly || !paper) return;
    const tmpl = RESULTS_NARRATIVE_TEMPLATES[m];
    const guard = tmpl.slice(0, 16);
    const isNarrativeSec = (h: string) => h.includes("연구문제별") || (h.includes("결과") && !h.includes("가정"));
    const target = form.sections.results.find((sec) => isNarrativeSec(sec.heading));
    const existing = target ? target.paragraphs.map((par) => par.text) : [];
    if (existing.some((e) => e.startsWith(guard))) {
      toast.info(`${STAT_METHOD_LABELS[m]} 결과 서술문 골격은 이미 삽입되어 있습니다.`);
      return;
    }
    setForm((prev) => {
      const cur = [...prev.sections.results];
      let idx = cur.findIndex((sec) => isNarrativeSec(sec.heading));
      if (idx < 0) {
        cur.push({ id: uid(), heading: "연구문제별 결과", paragraphs: [] });
        idx = cur.length - 1;
      }
      const sec = cur[idx];
      const kept = sec.paragraphs.filter((par) => par.text.trim());
      cur[idx] = { ...sec, paragraphs: [...kept, { id: uid(), text: tmpl }] };
      return { ...prev, sections: { ...prev.sections, results: cur } };
    });
    markDirty();
    logEditorEvent(user.id, "table_insert");
    toast.success(`${STAT_METHOD_LABELS[m]} 결과 서술문 골격을 추가했습니다 — 빈칸(___)을 수치로 채우세요.`);
  }

  /** 데이터 분석기 결과(표·보고 문장)를 결과 장 '가정 검정' 섹션에 삽입 */
  function insertAnalysisResultText(text: string) {
    if (readOnly || !paper || !text.trim()) return;
    const target = form.sections.results.find((sec) => sec.heading.includes("가정 검정"));
    const existing = target ? target.paragraphs.map((par) => par.text) : [];
    if (existing.includes(text)) {
      toast.info("동일한 분석 결과가 이미 삽입되어 있습니다.");
      return;
    }
    setForm((prev) => {
      const cur = [...prev.sections.results];
      let idx = cur.findIndex((sec) => sec.heading.includes("가정 검정"));
      if (idx < 0) {
        cur.unshift({ id: uid(), heading: ASSUMPTION_SECTION_HEADING, paragraphs: [] });
        idx = 0;
      }
      const sec = cur[idx];
      const kept = sec.paragraphs.filter((par) => par.text.trim());
      cur[idx] = { ...sec, paragraphs: [...kept, { id: uid(), text }] };
      return { ...prev, sections: { ...prev.sections, results: cur } };
    });
    markDirty();
    if (step !== "results") setStep("results");
    toast.success("분석 결과를 '기술통계 및 가정 검정' 절에 삽입했습니다 — 표 번호를 채우고 저장하세요.");
  }

  /** P2: 연구계획서의 목적·범위·방법을 빈 서론/방법 장의 초안 단락으로 시딩 */
  async function seedFromProposal() {
    if (readOnly || !paper || proposals.length === 0) return;
    const prop = proposals[0];
    const introEmpty = chapterIsEmpty(form.sections.intro);
    const methodEmpty = chapterIsEmpty(form.sections.method);
    if (!introEmpty && !methodEmpty) {
      toast.info("서론·연구 방법 장에 이미 작성분이 있어 시딩을 건너뜁니다.");
      return;
    }
    setForm((prev) => {
      const next = { ...prev.sections } as SectionsState;
      if (introEmpty) {
        const secs = [...next.intro];
        let idx = secs.findIndex((sec) => sec.heading.includes("연구 목적"));
        if (idx < 0) idx = secs.length - 1;
        const adds: { id: string; text: string }[] = [];
        if (prop.purpose?.trim()) adds.push({ id: uid(), text: prop.purpose.trim() });
        if (prop.scope?.trim()) adds.push({ id: uid(), text: `본 연구의 범위는 다음과 같다. ${prop.scope.trim()}` });
        if (adds.length > 0) {
          const kept = secs[idx].paragraphs.filter((par) => par.text.trim());
          secs[idx] = { ...secs[idx], paragraphs: [...kept, ...adds] };
          next.intro = secs;
        }
      }
      if (methodEmpty && prop.method?.trim()) {
        const secs = [...next.method];
        const ovIdx = secs.findIndex((sec) => isOverviewSection(sec));
        const idx = ovIdx >= 0 ? ovIdx : 0;
        const kept = secs[idx].paragraphs.filter((par) => par.text.trim());
        secs[idx] = { ...secs[idx], paragraphs: [...kept, { id: uid(), text: prop.method.trim() }] };
        next.method = secs;
      }
      return { ...prev, sections: next };
    });
    markDirty();
    toast.success("연구계획서 내용을 초안으로 가져왔습니다 — 본문 수준으로 다듬어 저장하세요.");
  }

  /**
   * R3(2026-07-03): 연구보고서 → 논문 이관 파이프.
   * - 현장 문제(현상·영향·중요성) → 서론 '연구의 필요성' 초안
   * - 이론 카드(정의·선택 이유·핵심 개념·문제 연결) → 이론적 배경 절 (카드당 1절)
   * - 선행연구 분석 + 이론 종합 → '선행연구 고찰' 절
   * 이론적 배경 장이 비어 있을 때만 절을 교체하고, 필요성은 해당 절이 비어 있을 때만 채운다.
   */
  function seedFromReport() {
    if (readOnly || !paper || !report) return;
    const bgEmpty = chapterIsEmpty(form.sections.background);
    const sectionEmpty = (k: WritingPaperChapterKey, kw: string[]) => {
      const sec = form.sections[k].find((sc) => kw.some((w) => sc.heading.includes(w)));
      return !sec || sec.paragraphs.every((par) => !par.text.trim());
    };
    const needEmpty = sectionEmpty("intro", ["필요성"]);
    // R3-확장(2026-07-04): 방법 장 절 단위 시딩 대상
    const subjectEmpty = sectionEmpty("method", ["연구 대상", "연구 참여자"]);
    const programEmpty = sectionEmpty("method", ["프로그램"]);

    // 필요성 초안 — v2 구조화 입력 우선, 없으면 레거시 필드
    const needParts: string[] = [];
    const phen = (report.problemPhenomena ?? []).map((t) => t.trim()).filter(Boolean);
    if (phen.length > 0) needParts.push(phen.join(" "));
    else if (report.problemPhenomenon?.trim()) needParts.push(report.problemPhenomenon.trim());
    if (report.problemImpact?.trim()) needParts.push(report.problemImpact.trim());
    if (report.problemImportance?.trim()) needParts.push(report.problemImportance.trim());
    if (needParts.length === 0 && report.problemDefinition?.trim()) needParts.push(report.problemDefinition.trim());
    if (needParts.length === 0 && report.fieldProblem?.trim()) needParts.push(report.fieldProblem.trim());
    // R3-확장: 문제 진단(1.5장) — 기존 시도의 한계·격차·핵심 원인은 필요성 논증의 재료
    if (report.diagnosisAttempts?.trim()) needParts.push(`기존 시도와 한계: ${report.diagnosisAttempts.trim()}`);
    if (report.diagnosisGap?.trim()) needParts.push(`현재 상태와 목표 간 격차: ${report.diagnosisGap.trim()}`);
    if (report.diagnosisPrimaryCause?.trim()) needParts.push(`본 연구가 집중하는 핵심 원인: ${report.diagnosisPrimaryCause.trim()}`);

    // R3-확장: 학습자 분석(3장) → '연구 대상/참여자' 절 초안
    const subjectParts: string[] = [];
    if (report.fieldAudience?.trim()) subjectParts.push(`본 연구의 대상은 ${report.fieldAudience.trim()}이다.`);
    if (report.learnerProfile?.trim()) subjectParts.push(report.learnerProfile.trim());
    if (report.learnerCognitive?.trim()) subjectParts.push(`인지·지식 수준: ${report.learnerCognitive.trim()}`);
    if (report.learnerAffective?.trim()) subjectParts.push(`정서·동기 특성: ${report.learnerAffective.trim()}`);

    // R3-확장: 환경 분석(2장)·학습 과제·목표(4장) → '프로그램 설계 및 적용' 절 초안
    const programParts: string[] = [];
    if (report.envLearning?.trim()) programParts.push(`학습 환경: ${report.envLearning.trim()}`);
    if (report.envTransfer?.trim()) programParts.push(`적용(전이) 환경: ${report.envTransfer.trim()}`);
    if (report.envConstraint?.trim()) programParts.push(`제약·맥락: ${report.envConstraint.trim()}`);
    const steps = (report.taskSteps ?? []).map((t) => t.trim()).filter(Boolean);
    if (steps.length > 0) {
      programParts.push(`학습 과제 위계: ${steps.map((t, i) => `(${i + 1}) ${t}`).join(" → ")}`);
    } else if (report.taskDecompose?.trim()) {
      programParts.push(`학습 과제 위계: ${report.taskDecompose.trim()}`);
    }
    const mager = [report.outcomeMagerA, report.outcomeMagerB, report.outcomeMagerC, report.outcomeMagerD]
      .map((t) => t?.trim())
      .filter(Boolean)
      .join(" / ");
    if (mager) programParts.push(`학습 목표(Mager ABCD): ${mager}`);
    else if (report.outcomeMagerABCD?.trim()) programParts.push(`학습 목표: ${report.outcomeMagerABCD.trim()}`);
    if (report.outcomeCognitive?.trim()) programParts.push(`인지적 목표: ${report.outcomeCognitive.trim()}`);
    if (report.outcomeSkillAttitude?.trim()) programParts.push(`기능·태도 목표: ${report.outcomeSkillAttitude.trim()}`);

    // 이론적 배경 절 — 이론 카드가 있으면 카드당 1절, 없으면 레거시 단일 이론 필드
    const bgSections: WritingSection[] = [];
    const cards = (report.theoryCards ?? []).filter((c) => c.name?.trim());
    for (const c of cards) {
      const pars: string[] = [];
      const meta = [c.scholar?.trim(), c.year?.trim()].filter(Boolean).join(", ");
      const concepts = (c.concepts ?? []).filter((k) => k.name?.trim());
      if (c.selectionReason?.trim()) pars.push(c.selectionReason.trim());
      for (const k of concepts) {
        pars.push(k.definition?.trim() ? `${k.name.trim()}: ${k.definition.trim()}` : k.name.trim());
      }
      if (c.problemLink?.trim()) pars.push(c.problemLink.trim());
      if (pars.length === 0) pars.push("");
      bgSections.push({
        id: uid(),
        heading: meta ? `${c.name.trim()} (${meta})` : c.name.trim(),
        paragraphs: pars.map((t) => ({ id: uid(), text: t })),
      });
    }
    if (cards.length === 0 && (report.theoryType?.trim() || report.theoryDefinition?.trim())) {
      const pars = [report.theoryDefinition, report.theoryConnection]
        .map((t) => t?.trim())
        .filter((t): t is string => !!t);
      bgSections.push({
        id: uid(),
        heading: report.theoryType?.trim() || "이론적 배경 1",
        paragraphs: (pars.length > 0 ? pars : [""]).map((t) => ({ id: uid(), text: t })),
      });
    }
    const priorParts = [
      report.priorResearchAnalysis,
      report.theoryRelationProblem,
      report.theoryRelationRoles,
      report.theoryRelationIntegration,
    ]
      .map((t) => t?.trim())
      .filter((t): t is string => !!t);
    if (priorParts.length > 0) {
      bgSections.push({
        id: uid(),
        heading: "선행연구 고찰",
        paragraphs: priorParts.map((t) => ({ id: uid(), text: t })),
      });
    }

    const seedNeed = needEmpty && needParts.length > 0;
    const seedBg = bgEmpty && bgSections.length > 0;
    const seedSubject = subjectEmpty && subjectParts.length > 0;
    const seedProgram = programEmpty && programParts.length > 0;
    if (!seedNeed && !seedBg && !seedSubject && !seedProgram) {
      toast.info("보고서에서 가져올 내용이 없거나, 대상 절에 이미 작성분이 있습니다.");
      return;
    }
    const fillSection = (
      secs: WritingSection[],
      kw: string[],
      fallbackHeading: string,
      parts: string[],
    ): WritingSection[] => {
      const arr = [...secs];
      let idx = arr.findIndex((sc) => kw.some((w) => sc.heading.includes(w)));
      if (idx < 0) {
        arr.push({ id: uid(), heading: fallbackHeading, paragraphs: [] });
        idx = arr.length - 1;
      }
      const kept = arr[idx].paragraphs.filter((par) => par.text.trim());
      arr[idx] = { ...arr[idx], paragraphs: [...kept, ...parts.map((t) => ({ id: uid(), text: t }))] };
      return arr;
    };
    setForm((prev) => {
      const next = { ...prev.sections } as SectionsState;
      if (seedNeed) next.intro = fillSection(next.intro, ["필요성"], "연구의 필요성", needParts);
      if (seedSubject) {
        next.method = fillSection(
          next.method,
          ["연구 대상", "연구 참여자"],
          profile?.approach === "qualitative" ? "연구 참여자" : "연구 대상",
          subjectParts,
        );
      }
      if (seedProgram) {
        next.method = fillSection(next.method, ["프로그램"], "프로그램 설계 및 적용", programParts);
      }
      if (seedBg) {
        // 양적 트랙의 '연구모형 및 가설' 템플릿 절은 유지한 채 앞쪽 빈 템플릿을 교체
        const keepModel = next.background.filter(
          (sec) => sec.heading.includes("연구모형") && bgSections.every((b) => !b.heading.includes("연구모형")),
        );
        next.background = [...bgSections, ...keepModel];
      }
      return { ...prev, sections: next };
    });
    markDirty();
    const done = [
      seedNeed && "서론(필요성·진단)",
      seedBg && "이론적 배경",
      seedSubject && "연구 대상(학습자 분석)",
      seedProgram && "프로그램 설계(환경·과제·목표)",
    ]
      .filter(Boolean)
      .join(" · ");
    toast.success(`연구보고서 내용을 ${done} 초안으로 가져왔습니다 — 인용·문장을 본문 수준으로 다듬어 저장하세요.`);
    logEditorEvent(user.id, "seed_from_report");
  }

  /** R3: 계획서 referencePaperIds + 보고서 priorResearchPaperIds → APA7 참고문헌 텍스트 */
  async function generateReferences() {
    if (readOnly || !paper) return;
    const ids = new Set<string>([
      ...(proposals[0]?.referencePaperIds ?? []),
      ...(report?.priorResearchPaperIds ?? []),
    ]);
    if (ids.size === 0) {
      toast.info("계획서·보고서에 연결된 문헌이 없습니다 — '읽은 논문'에 등록하고 계획서 참고문헌에 추가하세요.");
      return;
    }
    // QA-v2: 덮어쓰기 확인은 fetch 전에 — await 이후 stale form 검사로 입력분이 소실되는 경합 방지
    if (form.references.trim() && !confirm("참고문헌 내용이 이미 있습니다. 생성 결과로 덮어쓸까요?")) return;
    setRefsBusy(true);
    try {
      const res = await researchPapersApi.list(user.id);
      const papers = (res.data as ResearchPaper[]).filter((pp) => ids.has(pp.id));
      if (papers.length === 0) {
        toast.info("연결된 문헌 정보를 찾지 못했습니다.");
        return;
      }
      setForm((prev) => ({ ...prev, references: formatApa7List(papers) }));
      markDirty();
      toast.success(`문헌 ${papers.length}편을 APA 7판 형식으로 정렬했습니다 — 확인 후 저장하세요.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "참고문헌 생성에 실패했습니다.");
    } finally {
      setRefsBusy(false);
    }
  }

  /** R2: 연구문제의 가설 목록을 이론적 배경 '연구모형 및 가설' 절에 H1~ 형식으로 나열 */
  function insertHypotheses() {
    if (readOnly || !paper) return;
    const hyps = form.researchQuestions
      .map((q) => q.hypothesisText?.trim())
      .filter((t): t is string => !!t);
    if (hyps.length === 0) return;
    const lines = hyps.map((t, i) => `H${i + 1}. ${t}`);
    // QA-v2: 기존 H목록을 항상 새 목록으로 교체 — 가설 편집·삭제 후 재삽입 시 번호 꼬임 방지
    const isHypLine = (t: string) => /^H\d+\.\s/.test(t.trim());
    const target = form.sections.background.find(
      (sec) => sec.heading.includes("연구모형") || sec.heading.includes("가설"),
    );
    const existingHyps = (target?.paragraphs ?? []).map((par) => par.text.trim()).filter(isHypLine);
    if (existingHyps.length === lines.length && existingHyps.every((t, i) => t === lines[i])) {
      toast.info("모든 가설이 이미 절에 나열되어 있습니다.");
      return;
    }
    if (
      existingHyps.length > 0 &&
      !confirm(`절에 있는 기존 가설 ${existingHyps.length}개를 현재 목록(${lines.length}개)으로 교체할까요?`)
    ) {
      return;
    }
    setForm((prev) => {
      const secs = [...prev.sections.background];
      let idx = secs.findIndex((sec) => sec.heading.includes("연구모형") || sec.heading.includes("가설"));
      if (idx < 0) {
        secs.push({ id: uid(), heading: "연구모형 및 가설", paragraphs: [] });
        idx = secs.length - 1;
      }
      const kept = secs[idx].paragraphs.filter((par) => par.text.trim() && !isHypLine(par.text));
      secs[idx] = { ...secs[idx], paragraphs: [...kept, ...lines.map((t) => ({ id: uid(), text: t }))] };
      return { ...prev, sections: { ...prev.sections, background: secs } };
    });
    markDirty();
    toast.success(`가설 ${lines.length}개를 '연구모형 및 가설' 절에 나열했습니다 — 각 가설의 이론 근거를 앞 절에서 받쳐주세요.`);
  }

  /** R4: 문헌 매트릭스 → 이론적 배경 '선행연구 고찰' 절에 비교표 삽입 */
  function insertLiteratureMatrix() {
    if (readOnly || !paper) return;
    const table = buildMatrixTable(myPapers);
    if (!table) {
      toast.info("매트릭스에 정리된 논문이 없습니다 — 논문 읽기 탭의 문헌 리뷰 매트릭스를 먼저 채우세요.");
      return;
    }
    const target = form.sections.background.find((sec) => sec.heading.includes("선행연구"));
    if (target && target.paragraphs.some((par) => par.text.trim() === table.trim())) {
      toast.info("동일한 비교표가 이미 삽입되어 있습니다.");
      return;
    }
    setForm((prev) => {
      const secs = [...prev.sections.background];
      let idx = secs.findIndex((sec) => sec.heading.includes("선행연구"));
      if (idx < 0) {
        secs.push({ id: uid(), heading: "선행연구 고찰", paragraphs: [] });
        idx = secs.length - 1;
      }
      const kept = secs[idx].paragraphs.filter((par) => par.text.trim());
      secs[idx] = { ...secs[idx], paragraphs: [...kept, { id: uid(), text: table }] };
      return { ...prev, sections: { ...prev.sections, background: secs } };
    });
    markDirty();
    toast.success("선행연구 비교표를 '선행연구 고찰' 절에 삽입했습니다 — 표 번호와 본문 해설(종합)을 이어 쓰세요.");
  }

  /** R2: 연구윤리 보고 문형을 방법 장 '연구 윤리' 절에 삽입.
   * P2(2026-07-04): 문장 단위 중복 검사 — 항목을 추가 체크 후 재삽입해도 새 문장만 추가된다. */
  function insertEthicsText(text: string) {
    if (readOnly || !paper || !text.trim()) return;
    const sentences = text
      .split(/(?<=다\.)\s+/)
      .map((t) => t.trim())
      .filter(Boolean);
    const target = form.sections.method.find((sec) => sec.heading.includes("윤리"));
    const existing = (target?.paragraphs ?? []).map((par) => par.text).join(" ");
    const adds = sentences.filter((sent) => !existing.includes(sent));
    if (adds.length === 0) {
      toast.info("체크한 항목의 보고 문형이 모두 이미 삽입되어 있습니다.");
      return;
    }
    setForm((prev) => {
      const secs = [...prev.sections.method];
      let idx = secs.findIndex((sec) => sec.heading.includes("윤리"));
      if (idx < 0) {
        secs.push({ id: uid(), heading: "연구 윤리", paragraphs: [] });
        idx = secs.length - 1;
      }
      const kept = secs[idx].paragraphs.filter((par) => par.text.trim());
      secs[idx] = { ...secs[idx], paragraphs: [...kept, { id: uid(), text: adds.join(" ") }] };
      return { ...prev, sections: { ...prev.sections, method: secs } };
    });
    markDirty();
    toast.success(`보고 문형 ${adds.length}문장을 '연구 윤리' 절에 삽입했습니다 — 기관명·승인번호 빈칸(___)을 채우세요.`);
  }

  /** R5: 방법 장의 특정 절(키워드 매칭, 없으면 생성)에 단락 삽입 — 표 위젯 공용.
   * P2(2026-07-04): 같은 제목의 기존 표가 있으면 confirm 후 교체 — 재삽입 시 표 2벌 방지. */
  function insertMethodBlock(keywords: string[], fallbackHeading: string, text: string) {
    if (readOnly || !paper || !text.trim()) return;
    const titleLine = text.split("\n")[0].trim(); // "<표 _-_> …" 캡션
    const target = form.sections.method.find((sec) => keywords.some((k) => sec.heading.includes(k)));
    const dupIdx = (target?.paragraphs ?? []).findIndex(
      (par) => par.text.trim().split("\n")[0].trim() === titleLine,
    );
    if (dupIdx >= 0) {
      if (target!.paragraphs[dupIdx].text.trim() === text.trim()) {
        toast.info("동일한 표가 이미 삽입되어 있습니다.");
        return;
      }
      if (!confirm("같은 제목의 표가 이미 있습니다. 최신 내용으로 교체할까요?")) return;
    }
    setForm((prev) => {
      const secs = [...prev.sections.method];
      let idx = secs.findIndex((sec) => keywords.some((k) => sec.heading.includes(k)));
      if (idx < 0) {
        secs.push({ id: uid(), heading: fallbackHeading, paragraphs: [] });
        idx = secs.length - 1;
      }
      const kept = secs[idx].paragraphs.filter(
        (par) => par.text.trim() && par.text.trim().split("\n")[0].trim() !== titleLine,
      );
      secs[idx] = { ...secs[idx], paragraphs: [...kept, { id: uid(), text }] };
      return { ...prev, sections: { ...prev.sections, method: secs } };
    });
    markDirty();
    toast.success(`'${fallbackHeading}' 절에 표를 반영했습니다 — 표 번호와 빈칸(___)을 채우고 저장하세요.`);
  }

  /**
   * 선택한 분석 방법들의 골격(자료 분석 문장 + 가정 검정 보고)을
   * 방법·결과 장에 자동 배치 — 가정을 놓치지 않도록 섹션을 미리 생성한다.
   */
  function seedScaffoldsForMethods(ms: StatMethodType[], opts?: { silent?: boolean }) {
    if (readOnly || !paper || ms.length === 0) return;
    const matchesAnalysis = (h: string) => h.includes("자료 분석") || h.includes("자료분석") || h.includes("분석 방법");
    const aExisting =
      form.sections.method.find((sec) => matchesAnalysis(sec.heading))?.paragraphs.map((par) => par.text) ?? [];
    const rExisting =
      form.sections.results.find((sec) => sec.heading.includes("가정 검정"))?.paragraphs.map((par) => par.text) ?? [];
    const aAdds: string[] = [];
    const rAdds: string[] = [];
    for (const m of ms) {
      const at = ANALYSIS_SKELETONS[m];
      if (!aExisting.some((e) => e.startsWith(at.slice(0, 12))) && !aAdds.includes(at)) aAdds.push(at);
      for (const t of ASSUMPTION_GUIDES[m].skeleton) {
        if (!rExisting.some((e) => e.startsWith(t.slice(0, 14))) && !rAdds.includes(t)) rAdds.push(t);
      }
    }
    if (aAdds.length === 0 && rAdds.length === 0) return;
    setForm((prev) => {
      const methodSecs = [...prev.sections.method];
      const resultSecs = [...prev.sections.results];
      if (aAdds.length > 0) {
        let ai = methodSecs.findIndex((sec) => matchesAnalysis(sec.heading));
        if (ai < 0) {
          methodSecs.push({ id: uid(), heading: ANALYSIS_SECTION_HEADING, paragraphs: [] });
          ai = methodSecs.length - 1;
        }
        const kept = methodSecs[ai].paragraphs.filter((par) => par.text.trim());
        methodSecs[ai] = { ...methodSecs[ai], paragraphs: [...kept, ...aAdds.map((t) => ({ id: uid(), text: t }))] };
      }
      if (rAdds.length > 0) {
        let ri = resultSecs.findIndex((sec) => sec.heading.includes("가정 검정"));
        if (ri < 0) {
          resultSecs.unshift({ id: uid(), heading: ASSUMPTION_SECTION_HEADING, paragraphs: [] });
          ri = 0;
        }
        const kept = resultSecs[ri].paragraphs.filter((par) => par.text.trim());
        resultSecs[ri] = { ...resultSecs[ri], paragraphs: [...kept, ...rAdds.map((t) => ({ id: uid(), text: t }))] };
      }
      return { ...prev, sections: { ...prev.sections, method: methodSecs, results: resultSecs } };
    });
    markDirty();
    if (!opts?.silent) {
      toast.success("선택한 분석 방법의 자료 분석 문장과 가정 검정 보고 골격을 자동 배치했습니다 — 빈칸(___)을 채우고 저장하세요.");
    }
  }

  /** 도우미에서 분석 방법을 내 연구 방향에 추가 + 골격 자동 배치 */
  async function addMethodToProfile(m: StatMethodType) {
    if (!paper || !profile) return;
    const next = [...(profile.methods ?? [])];
    if (next.includes(m)) return;
    next.push(m);
    try {
      await update.mutateAsync({ id: paper.id, data: { researchProfile: { ...profile, methods: next } } });
      toast.success(`${STAT_METHOD_LABELS[m]} 을(를) 내 연구 방향에 추가했습니다 — 결과 장에서 가정 검정 가이드가 표시됩니다.`);
      seedScaffoldsForMethods([m], { silent: true });
    } catch {
      toast.error("연구 방향 갱신에 실패했습니다.");
    }
  }

  // ── 버전 스냅샷 ──

  async function createVersion(label: string, silent = false): Promise<boolean> {
    if (!paper) return false;
    try {
      const payload: Record<string, unknown> = {
        userId: user.id,
        paperId: paper.id,
        label,
        sections: form.sections,
        chapters: serializeAll(form.sections),
        // QA-v2: 참고문헌·초록·연구문제·방법 위젯 데이터도 스냅샷에 포함 (복원 시 선택 반영)
        abstract: form.abstract,
        abstractKeywords: form.abstractKeywords,
        abstractEn: form.abstractEn,
        references: form.references,
        researchQuestions: form.researchQuestions,
        ethicsChecked: form.ethicsChecked,
        instruments: form.instruments,
        procedureSteps: form.procedureSteps,
        appendices: form.appendices,
        charCount: totalChars(form),
        createdAt: new Date().toISOString(),
      };
      if (form.title.trim()) payload.title = form.title.trim();
      if (profile) payload.researchProfile = profile;
      await writingPaperVersionsApi.create(payload);
      void queryClient.invalidateQueries({ queryKey: ["writing_paper_versions", user.id] });
      if (!silent) toast.success(`버전 "${label}" 이 저장되었습니다.`);
      return true;
    } catch {
      if (!silent) toast.error("버전 저장에 실패했습니다.");
      return false;
    }
  }

  async function handleSaveVersion() {
    const label = versionLabel.trim() || `v${versions.length + 1} (${new Date().toLocaleDateString("ko-KR")})`;
    setVersionBusy(true);
    const ok = await createVersion(label);
    if (ok) setVersionLabel("");
    setVersionBusy(false);
  }

  async function handleRestoreVersion(v: WritingPaperVersion) {
    if (!confirm(`"${v.label}" 버전으로 복원하시겠습니까?\n현재 내용은 '복원 전 자동 백업' 버전으로 보관됩니다.`)) return;
    setVersionBusy(true);
    try {
      const t = new Date();
      // QA P1: 백업 실패를 무시하고 복원하면 '복원 전 자동 백업' 약속이 깨져 현재 내용 유실 가능 → 중단
      const backedUp = await createVersion(
        `${AUTO_BACKUP_PREFIX} (${t.getHours().toString().padStart(2, "0")}:${t.getMinutes().toString().padStart(2, "0")})`,
        true,
      );
      if (!backedUp) {
        toast.error("복원 전 자동 백업에 실패해 복원을 중단했습니다. 잠시 후 다시 시도해주세요.");
        return;
      }
      const restoredApproach = v.researchProfile?.approach ?? approach;
      const sections = {} as SectionsState;
      for (const k of CHAPTER_KEYS) {
        const structured = v.sections?.[k];
        if (structured && structured.length > 0) sections[k] = withOverview(normalizeSections(structured));
        else if (v.chapters?.[k]?.trim()) sections[k] = withOverview(migratePlainText(v.chapters[k]!));
        else sections[k] = buildTemplateSections(templateHeadings(k, restoredApproach));
      }
      // QA-v2: 스냅샷에 담긴 필드는 함께 복원, 없는 필드(구버전 스냅샷)는 현재 값 보존
      setForm((prev) => ({
        ...prev,
        title: v.title ?? "",
        sections,
        ...(v.abstract !== undefined ? { abstract: v.abstract } : {}),
        ...(v.abstractKeywords !== undefined ? { abstractKeywords: v.abstractKeywords } : {}),
        ...(v.abstractEn !== undefined ? { abstractEn: v.abstractEn } : {}),
        ...(v.references !== undefined ? { references: v.references } : {}),
        ...(v.researchQuestions !== undefined ? { researchQuestions: v.researchQuestions } : {}),
        ...(v.ethicsChecked !== undefined ? { ethicsChecked: v.ethicsChecked } : {}),
        ...(v.instruments !== undefined ? { instruments: v.instruments } : {}),
        ...(v.procedureSteps !== undefined ? { procedureSteps: v.procedureSteps } : {}),
        ...(v.appendices !== undefined ? { appendices: v.appendices } : {}),
      }));
      setDirty(true);
      const withExtras = v.references !== undefined || v.abstract !== undefined;
      toast.success(
        withExtras
          ? `"${v.label}" 버전을 불러왔습니다 (본문·초록·참고문헌 포함) — 저장 버튼을 눌러 확정하세요.`
          : `"${v.label}" 버전의 본문을 불러왔습니다 — 초록·참고문헌은 유지됩니다. 저장 버튼을 눌러 확정하세요.`,
      );
    } finally {
      setVersionBusy(false);
    }
  }

  async function handleDeleteVersion(v: WritingPaperVersion) {
    if (!confirm(`"${v.label}" 버전을 삭제하시겠습니까? 되돌릴 수 없습니다.`)) return;
    try {
      await writingPaperVersionsApi.delete(v.id);
      void queryClient.invalidateQueries({ queryKey: ["writing_paper_versions", user.id] });
      toast.success("버전이 삭제되었습니다.");
    } catch {
      toast.error("삭제에 실패했습니다.");
    }
  }

  async function handleCleanupAutoBackups() {
    const targets = versions.filter((v) => v.label.startsWith(AUTO_BACKUP_PREFIX));
    if (targets.length === 0) return;
    if (!confirm(`복원 전 자동 백업 ${targets.length}개를 모두 삭제하시겠습니까? 되돌릴 수 없습니다.`)) return;
    setVersionBusy(true);
    let failed = 0;
    try {
      for (const v of targets) {
        try {
          await writingPaperVersionsApi.delete(v.id);
        } catch {
          failed += 1;
        }
      }
      void queryClient.invalidateQueries({ queryKey: ["writing_paper_versions", user.id] });
      if (failed === 0) toast.success(`자동 백업 ${targets.length}개를 정리했습니다.`);
      else toast.warning(`${targets.length - failed}개 정리, ${failed}개는 실패했습니다.`);
    } finally {
      setVersionBusy(false);
    }
  }

  /** 자가 점검 — 부심 작성 원칙 기반 규칙 검사 (writing-lint 순수 엔진) */
  function runLint() {
    logEditorEvent(user.id, "lint_run");
    setLintIssues(lintThesis(form.sections));
    setLintCoverage(questionCoverage(form.sections));
    setLintOpen(true);
  }

  /** P2: 차례 — 작성분이 있는 장·절 구조에서 자동 생성 */
  function buildTocText(): string {
    const roman = ["Ⅰ", "Ⅱ", "Ⅲ", "Ⅳ", "Ⅴ"];
    const lines: string[] = [];
    STEPS.forEach((st, i) => {
      const chapterSecs = form.sections[st.key];
      const hasContent = chapterSecs.some((sec) => sec.paragraphs.some((par) => par.text.trim()));
      if (!hasContent) return;
      lines.push(`${roman[i]}. ${st.label}`);
      let n = 0;
      for (const sec of chapterSecs) {
        if (isOverviewSection(sec)) continue;
        if (!sec.paragraphs.some((par) => par.text.trim())) continue;
        n += 1;
        lines.push(`  ${n}. ${sec.heading.trim() || "본문"}`);
      }
    });
    if (form.references.trim()) lines.push("참고문헌");
    if (form.appendices.length > 0) lines.push("부록");
    return lines.join("\n");
  }

  /** P2: 표·그림 목차 — 본문에서 <표 …>/<그림 …> 라인을 스캔 */
  function buildFigureTocText(): { tables: string[]; figures: string[] } {
    const tables: string[] = [];
    const figures: string[] = [];
    // QA-v2: "<표 Ⅳ-1>과 같이 …" 같은 본문 참조 문장을 목차에 넣지 않도록 캡션 패턴만 수집
    const CAPTION_RE = /^<(표|그림)\s[^>]{0,24}>\s*(.*)$/;
    const isCaption = (line: string): "표" | "그림" | null => {
      const m = CAPTION_RE.exec(line);
      if (!m) return null;
      const rest = m[2].trim();
      if (rest.length > 60 || /(이다|한다|였다|있다|됐다|되었다|나타났다)[.。]?$/.test(rest)) return null;
      return m[1] as "표" | "그림";
    };
    for (const k of CHAPTER_KEYS) {
      for (const sec of form.sections[k]) {
        for (const par of sec.paragraphs) {
          for (const raw of par.text.split("\n")) {
            const line = raw.trim();
            const kind = isCaption(line);
            if (kind === "표") tables.push(line);
            else if (kind === "그림") figures.push(line);
          }
        }
      }
    }
    return { tables, figures };
  }

  /** 작성 본문을 평문 .txt 로 내보내기 — 장(Ⅰ~Ⅴ)·섹션 번호·단락 빈 줄 구분 */
  function handleExportText() {
    logEditorEvent(user.id, "export_txt");
    const roman = ["Ⅰ", "Ⅱ", "Ⅲ", "Ⅳ", "Ⅴ"];
    const title = form.title.trim() || "학위논문 초안";
    const lines: string[] = [title, ""];
    // P2: 차례·표 목차 — 작성분이 있을 때만 문서 앞에 포함
    const tocText = buildTocText();
    if (tocText) {
      lines.push("차 례", "", tocText, "");
      const { tables, figures } = buildFigureTocText();
      if (tables.length > 0) lines.push("표 목 차", "", ...tables, "");
      if (figures.length > 0) lines.push("그 림 목 차", "", ...figures, "");
    }
    let hasBody = false;
    STEPS.forEach((st, i) => {
      const chapterLines: string[] = [];
      let secNo = 0;
      for (const sec of form.sections[st.key]) {
        const paras = sec.paragraphs.map((par) => par.text.trim()).filter(Boolean);
        if (paras.length === 0) continue;
        hasBody = true;
        if (isOverviewSection(sec)) {
          // 장 요약은 번호·헤딩 없이 장 제목 바로 아래 도입 단락으로
          for (const t of paras) chapterLines.push(t, "");
          continue;
        }
        secNo += 1;
        chapterLines.push(`${secNo}. ${sec.heading.trim() || "본문"}`, "");
        for (const t of paras) chapterLines.push(t, "");
      }
      if (chapterLines.length > 0) {
        lines.push(`${roman[i]}. ${st.label}`, "");
        lines.push(...chapterLines);
      }
    });
    if (!hasBody) {
      toast.info("내보낼 작성 내용이 없습니다 — 본문을 작성한 뒤 다시 시도하세요.");
      return;
    }
    if (form.references.trim()) {
      lines.push("참고문헌", "", ...form.references.trim().split("\n"), "");
    }
    // UX-1(2026-07-04): 초록·영문 초록·부록도 내보내기에 포함 (관례 위치)
    if (form.abstract.trim()) {
      lines.push("국문 초록", "", form.abstract.trim(), "");
      if (form.abstractKeywords.length > 0) lines.push(`주요어: ${form.abstractKeywords.join(", ")}`, "");
    }
    if (form.abstractEn.trim()) {
      lines.push("Abstract", "", form.abstractEn.trim(), "");
    }
    if (form.appendices.length > 0) {
      lines.push("부록", "");
      form.appendices.forEach((ap, i) => {
        lines.push(`부록 ${i + 1}. ${ap.title}`);
        if (ap.note.trim()) lines.push(ap.note.trim());
        lines.push("");
      });
    }
    lines.push(
      "—",
      `총 ${totalChars(form).toLocaleString()}자 · ${new Date().toLocaleDateString("ko-KR")} 내보냄 · 연세교육공학회 논문 에디터`,
    );
    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const ymd = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `${title.replace(/[\/:*?"<>|]/g, "_")}_${ymd}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast.success("텍스트 파일(.txt)로 내보냈습니다.");
  }

  // ── 렌더 ──

  const stepIdx = STEPS.findIndex((s) => s.key === step);
  const canPrev = stepIdx > 0;
  const canNext = stepIdx < STEPS.length - 1;
  const total = useMemo(() => totalChars(form), [form]);
  const guides = getChapterGuides(step, profile?.approach);
  const currentSections = form.sections[step];
  const overviewSection = currentSections.find(isOverviewSection);
  const bodySections = currentSections.filter((sec) => !isOverviewSection(sec));
  // D: 서론 외(이론배경·방법·결과·결론)에서 절이 2개 이상이면 하위 탭으로 전환
  const useSectionTabs = step !== "intro" && bodySections.length > 1;
  const activeSectionIdx = Math.min(sectionTab, Math.max(0, bodySections.length - 1));
  // UX-1(2026-07-04): "요약 및 논의" 절이 있는데 "+ 요약"·"+ 논의" 칩이 떠 중복 절을 유도하던 문제
  // — 정확 일치 외에 부분 포함 관계도 사용된 것으로 간주
  const unusedTemplates = templateHeadings(step, approach).filter(
    (h) =>
      !currentSections.some((s) => {
        const cur = s.heading.trim();
        return cur.length >= 2 && (cur === h || cur.includes(h) || h.includes(cur));
      }),
  );

  if (isLoading || (!paper && !readOnly)) {
    return (
      <p className="rounded-2xl border bg-card py-10 text-center text-sm text-muted-foreground">
        논문을 불러오는 중...
      </p>
    );
  }

  if (!paper && readOnly) {
    return (
      <p className="rounded-2xl border border-dashed bg-muted/30 py-10 text-center text-sm text-muted-foreground">
        아직 작성된 논문이 없습니다.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <ResearchJourneyGuide userId={user.id} current="thesis" readOnly={readOnly} />
      {/* ── 연구 방향 선택 다이얼로그 ── */}
      <Dialog
        open={profileOpen}
        onOpenChange={(open) => {
          if (!open) {
            setProfileOpen(false);
            setProfileDismissed(true);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Compass size={17} className="text-primary" />
              내 논문의 연구 방향
            </DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">
            선택에 따라 연구방법·연구결과 장의 추천 섹션과 작성 가이드가 맞춤 구성됩니다.
            나중에 언제든 변경할 수 있습니다.
          </p>
          <div>
            <p className="mb-1.5 text-xs font-semibold">연구 접근</p>
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(WRITING_APPROACH_LABELS) as ResearchApproachType[]).map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => setSelApproach(a)}
                  className={cn(
                    "rounded-lg border px-3 py-2 text-xs font-medium transition-colors",
                    selApproach === a
                      ? "border-primary bg-primary text-primary-foreground"
                      : "bg-card hover:bg-muted",
                  )}
                >
                  {WRITING_APPROACH_LABELS[a]}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-1.5 text-xs font-semibold">연구 설계</p>
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(RESEARCH_DESIGN_LABELS) as ResearchDesignType[]).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setSelDesign(d)}
                  className={cn(
                    "rounded-lg border px-3 py-2 text-xs font-medium transition-colors",
                    selDesign === d
                      ? "border-primary bg-primary text-primary-foreground"
                      : "bg-card hover:bg-muted",
                  )}
                >
                  {RESEARCH_DESIGN_LABELS[d]}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-[11px] text-muted-foreground">
              예: 현장에서 기존 학급 단위로 비교하면 준실험, 설문·상관 연구는 비실험입니다.
            </p>
          </div>
          {selApproach !== "qualitative" && (
            <div>
              <p className="mb-1.5 text-xs font-semibold">
                주요 분석 방법{" "}
                <span className="font-normal text-muted-foreground">(복수 선택 가능)</span>
              </p>
              <div className="flex flex-wrap gap-1.5">
                {(Object.keys(STAT_METHOD_LABELS) as StatMethodType[]).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() =>
                      setSelMethods((prev) =>
                        prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m],
                      )
                    }
                    className={cn(
                      "rounded-lg border px-3 py-2 text-xs font-medium transition-colors",
                      selMethods.includes(m)
                        ? "border-primary bg-primary text-primary-foreground"
                        : "bg-card hover:bg-muted",
                    )}
                  >
                    {STAT_METHOD_LABELS[m]}
                  </button>
                ))}
              </div>
              <p className="mt-1.5 text-[11px] text-muted-foreground">
                선택하면 연구 결과 장에 해당 방법의 기본 가정 검정 가이드와 보고 골격이 자동으로 제공됩니다.
              </p>
            </div>
          )}
          {/* 선택 항목 구체 설명 — 사이클 32 */}
          <div className="space-y-1.5 rounded-lg bg-muted/50 px-3 py-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              선택한 방향 안내
            </p>
            <p className="text-[11px] leading-relaxed">
              <span className="font-semibold text-primary">{WRITING_APPROACH_LABELS[selApproach]}</span>
              <span className="text-foreground/80"> — {APPROACH_DESCRIPTIONS[selApproach]}</span>
            </p>
            <p className="text-[11px] leading-relaxed">
              <span className="font-semibold text-primary">{RESEARCH_DESIGN_LABELS[selDesign]}</span>
              <span className="text-foreground/80"> — {DESIGN_DESCRIPTIONS[selDesign]}</span>
            </p>
            {selApproach !== "qualitative" && selMethods.length > 0 && (
              <ul className="space-y-1">
                {selMethods.map((m) => (
                  <li key={m} className="text-[11px] leading-relaxed">
                    <span className="font-semibold text-primary">{STAT_METHOD_LABELS[m]}</span>
                    <span className="text-foreground/80"> — {STAT_METHOD_DESCRIPTIONS[m].definition} {STAT_METHOD_DESCRIPTIONS[m].whenToUse}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setProfileOpen(false);
                setProfileDismissed(true);
              }}
            >
              나중에
            </Button>
            <Button size="sm" onClick={handleProfileSave} disabled={profileSaving}>
              {profileSaving && <Loader2 size={13} className="mr-1 animate-spin" />}
              설정 완료
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── 데이터 분석기 ── */}
      <DataAnalyzer
        open={analyzerOpen}
        onOpenChange={setAnalyzerOpen}
        onInsertText={insertAnalysisResultText}
        readOnly={readOnly}
      />

      {/* ── 자가 점검 결과 다이얼로그 ── */}
      <Dialog open={lintOpen} onOpenChange={setLintOpen}>
        <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardCheck size={17} className="text-primary" />
              글쓰기 자가 점검
              {lintIssues && (
                <span className="text-xs font-normal text-muted-foreground">
                  지적 {lintIssues.filter((i) => i.severity === "warn").length} · 제안{" "}
                  {lintIssues.filter((i) => i.severity === "info").length}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>
          <p className="text-[11px] text-muted-foreground">
            작성 원칙(정확성·객관성·일관성·가독성)과 시제·인과 수위·효과크기를 규칙 기반으로 검사합니다.
            모든 항목은 제안이며 최종 판단은 작성자의 몫입니다.
          </p>
          {lintIssues && lintIssues.length === 0 && (
            <p className="rounded-lg bg-emerald-50 px-3 py-4 text-center text-sm text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">
              ✓ 규칙 검사를 모두 통과했습니다.
            </p>
          )}
          {lintIssues && lintIssues.length > 0 && (
            <div className="space-y-3">
              {(["intro", "background", "method", "results", "conclusion"] as const).map((ch) => {
                const chIssues = lintIssues.filter((i) => i.chapter === ch);
                if (chIssues.length === 0) return null;
                return (
                  <div key={ch}>
                    <div className="mb-1 flex items-center justify-between">
                      <p className="text-xs font-bold">{LINT_CHAPTER_LABELS[ch]} ({chIssues.length})</p>
                      <button
                        type="button"
                        onClick={() => {
                          setStep(ch);
                          setLintOpen(false);
                        }}
                        className="text-[11px] text-primary hover:underline"
                      >
                        이 장으로 이동 →
                      </button>
                    </div>
                    <ul className="space-y-1.5">
                      {chIssues.map((issue, ii) => (
                        <li
                          key={ii}
                          className={cn(
                            "rounded-lg border px-2.5 py-2 text-[11px] leading-relaxed",
                            issue.severity === "warn"
                              ? "border-amber-200/70 bg-amber-50/50 text-amber-900 dark:border-amber-800/40 dark:bg-amber-950/15 dark:text-amber-100"
                              : "border-sky-200/70 bg-sky-50/40 text-sky-900 dark:border-sky-800/40 dark:bg-sky-950/15 dark:text-sky-100",
                          )}
                        >
                          {issue.sectionHeading && (
                            <span className="mr-1 font-semibold">[{issue.sectionHeading}]</span>
                          )}
                          {issue.message}
                          {issue.excerpt && (
                            <span className="mt-0.5 block text-[10px] opacity-70">{issue.excerpt}</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          )}
          {lintCoverage.length > 0 && (
            <div className="rounded-lg border border-dashed px-3 py-2.5">
              <p className="text-[11px] font-semibold">
                연구 문제 ↔ 결과 장 대조 ({lintCoverage.length}개) — 키워드 겹침 기반 후보 판정이니 직접 확인하세요
              </p>
              <ul className="mt-1.5 space-y-1">
                {lintCoverage.map((qc, qi) => (
                  <li key={qi} className="flex items-start gap-1.5 text-[11px]">
                    <span
                      className={cn(
                        "mt-0.5 shrink-0 rounded px-1 py-0.5 text-[9px] font-bold leading-none",
                        qc.covered
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                          : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
                      )}
                    >
                      {qc.covered ? "결과 장에서 다룸 후보" : "결과 장에서 핵심어 미발견"}
                    </span>
                    <span className="text-muted-foreground">{qc.question}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── 헤더 ── */}
      <section className="rounded-2xl border bg-card p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <FileText size={18} className="text-primary" />
            <div>
              <h3 className="text-sm font-semibold">논문</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                5장 구조로 집필하세요. · {total.toLocaleString()}자
                {writingTotalMin > 0 && (
                  <span className="ml-1">
                    · <Timer size={10} className="mr-0.5 inline" />
                    {writingTotalMin >= 60 ? `${Math.floor(writingTotalMin / 60)}시간 ${Math.round(writingTotalMin % 60)}분` : `${Math.round(writingTotalMin)}분`}
                  </span>
                )}
              </p>
            </div>
            {!readOnly && !isTimerActive && (
              <button
                type="button"
                onClick={handleStartWritingTimer}
                className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2.5 py-1.5 text-xs font-medium text-primary hover:bg-primary/20"
              >
                <Play size={12} />
                작성 시작
              </button>
            )}
            {isTimerActive && (
              <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2.5 py-1.5 text-xs font-medium text-primary animate-pulse">
                <Timer size={12} />
                측정 중
              </span>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {!readOnly && savedAt && !saving && (
              <span className="hidden items-center gap-1 text-[11px] text-muted-foreground sm:flex">
                <CheckCircle2 size={12} className="text-emerald-500" />
                {(() => {
                  const diff = Date.now() - new Date(savedAt).getTime();
                  if (diff < 60_000) return "방금 저장됨";
                  const t = new Date(savedAt);
                  return `${t.getHours().toString().padStart(2, "0")}:${t.getMinutes().toString().padStart(2, "0")} 저장됨`;
                })()}
              </span>
            )}
            <Button variant="outline" size="sm" onClick={() => {
                logEditorEvent(user.id, "analyzer_open");
                setAnalyzerOpen(true);
              }} title="엑셀 데이터를 붙여넣으면 t검정·ANOVA·ANCOVA 등을 분석해 표를 생성합니다 (브라우저 내 계산)">
              <Calculator size={12} className="mr-1" />
              데이터 분석
            </Button>
            <Button variant="outline" size="sm" onClick={runLint} title="부심 작성 원칙 기반 자가 점검 (정확성·객관성·일관성·시제·인과 수위)">
              <ClipboardCheck size={12} className="mr-1" />
              자가 점검
            </Button>
            <Button variant="outline" size="sm" onClick={() => setTocOpen(true)} title="장·절 구조와 본문의 <표>·<그림>에서 차례를 자동 생성">
              <ListOrdered size={12} className="mr-1" />
              목차
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportText} title="작성 본문을 텍스트 파일로 다운로드">
              <Download size={12} className="mr-1" />
              내보내기
            </Button>
            {!readOnly && (
              <>
                {/* 사용성 평가 반영: 임시저장/저장 이중 버튼 → 저장 1개로 통합 (savedAt 표시가 상태를 대신) */}
                <Button size="sm" onClick={() => handleSave()} disabled={saving || (!dirty && !!savedAt)}>
                  <Save size={12} className="mr-1" />
                  {saving ? "저장 중…" : dirty ? "저장" : "저장됨"}
                </Button>
              </>
            )}
          </div>
        </div>

        {/* 연구 방향 프로파일 칩 */}
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {profile ? (
            <>
              <Badge variant="secondary" className="text-[11px]">
                {WRITING_APPROACH_LABELS[profile.approach]}
              </Badge>
              <Badge variant="outline" className="text-[11px]">
                {RESEARCH_DESIGN_LABELS[profile.design]}
              </Badge>
            </>
          ) : (
            <Badge variant="outline" className="text-[11px] text-muted-foreground">연구 방향 미설정</Badge>
          )}
          {!readOnly && (
            <button
              type="button"
              onClick={openProfileDialog}
              className="text-[11px] text-primary hover:underline"
            >
              {profile ? "변경" : "설정하기"}
            </button>
          )}
        </div>

        <div className="mt-4">
          <label className="text-xs font-semibold text-muted-foreground">제목</label>
          <Input
            className="mt-1"
            value={form.title}
            placeholder="논문 제목 (가제)"
            onChange={(e) => {
              setForm((prev) => ({ ...prev, title: e.target.value }));
              markDirty();
            }}
            disabled={readOnly || !paper}
          />
        </div>
      </section>

      {/* P2+R3: 계획서·보고서 → 본문 시딩 배너 (빈 장이 남아 있을 때) */}
      {!readOnly && paper && (
        (proposals.length > 0 && (chapterIsEmpty(form.sections.intro) || chapterIsEmpty(form.sections.method))) ||
        (!!report && (chapterIsEmpty(form.sections.background) || chapterIsEmpty(form.sections.method)))
      ) && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-dashed border-primary/40 bg-primary/5 px-4 py-3">
            <p className="text-xs text-foreground/85">
              연구 여정 앞 단계의 산출물을 초안으로 가져올 수 있어요 —{" "}
              <span className="font-semibold">계획서</span>의 목적·범위·방법은 서론·연구 방법으로,{" "}
              <span className="font-semibold">보고서</span>의 문제·이론·선행연구·학습자·환경 분석은 서론·이론적 배경·연구 방법으로.
            </p>
            <div className="flex shrink-0 gap-2">
              {proposals.length > 0 &&
                (chapterIsEmpty(form.sections.intro) || chapterIsEmpty(form.sections.method)) && (
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => void seedFromProposal()}>
                    계획서에서 가져오기
                  </Button>
                )}
              {!!report && (chapterIsEmpty(form.sections.background) || chapterIsEmpty(form.sections.method)) && (
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => seedFromReport()}>
                  보고서에서 가져오기
                </Button>
              )}
            </div>
          </div>
        )}

      {/* ── 버전 스냅샷 패널 ── */}
      <section className="rounded-2xl border bg-card">
        <button
          type="button"
          onClick={() => setVersionsOpen((v) => !v)}
          aria-expanded={versionsOpen}
          className="flex w-full items-center justify-between px-5 py-3.5 text-left"
        >
          <span className="flex items-center gap-2 text-sm font-semibold">
            <History size={15} className="text-primary" />
            버전 관리
            {versions.length > 0 && (
              <Badge variant="secondary" className="text-[10px]">{versions.length}</Badge>
            )}
            <span className="text-[11px] font-normal text-muted-foreground">
              피드백 반영 전·심사 제출본 등 시점을 저장하고 복원
            </span>
          </span>
          <ChevronRight
            size={15}
            className={cn("shrink-0 text-muted-foreground transition-transform", versionsOpen && "rotate-90")}
          />
        </button>
        {versionsOpen && (
          <div className="border-t px-5 py-4">
            {!readOnly && (
              <div className="flex gap-2">
                <Input
                  className="h-8 text-xs"
                  placeholder='버전 라벨 — 예: "지도교수 1차 피드백 반영 전"'
                  value={versionLabel}
                  onChange={(e) => setVersionLabel(e.target.value)}
                />
                <Button size="sm" className="h-8 shrink-0 gap-1 text-xs" onClick={handleSaveVersion} disabled={versionBusy}>
                  {versionBusy ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                  버전 저장
                </Button>
              </div>
            )}
            {!readOnly && versions.filter((v) => v.label.startsWith(AUTO_BACKUP_PREFIX)).length >= 2 && (
              <button
                type="button"
                onClick={handleCleanupAutoBackups}
                disabled={versionBusy}
                className="mt-2 inline-flex items-center gap-1 rounded-md border border-dashed px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:border-destructive/40 hover:text-destructive disabled:opacity-50"
              >
                <Trash2 size={11} />
                자동 백업 {versions.filter((v) => v.label.startsWith(AUTO_BACKUP_PREFIX)).length}개 정리
              </button>
            )}
            {versions.length === 0 ? (
              <p className="mt-3 text-xs text-muted-foreground">
                저장된 버전이 없습니다. 큰 수정 전에 버전을 남겨두면 언제든 되돌릴 수 있어요.
              </p>
            ) : (
              <ul className="mt-3 divide-y">
                {versions.map((v) => {
                  const comparing = compareId === v.id;
                  return (
                    <li key={v.id} className="py-2">
                      <div className="flex items-center gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-medium">{v.label}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {new Date(v.createdAt).toLocaleString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                            {" · "}{v.charCount.toLocaleString()}자
                          </p>
                        </div>
                        <Button
                          variant={comparing ? "secondary" : "ghost"}
                          size="sm"
                          className="h-7 gap-1 text-[11px]"
                          aria-expanded={comparing}
                          onClick={() => {
                            if (!comparing) logEditorEvent(user.id, "version_compare");
                            setCompareId(comparing ? null : v.id);
                          }}
                        >
                          <Diff size={11} />비교
                        </Button>
                        {!readOnly && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 gap-1 text-[11px]"
                              onClick={() => handleRestoreVersion(v)}
                              disabled={versionBusy}
                            >
                              <RotateCcw size={11} />복원
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-destructive"
                              aria-label="버전 삭제"
                              onClick={() => handleDeleteVersion(v)}
                            >
                              <Trash2 size={12} />
                            </Button>
                          </>
                        )}
                      </div>
                      {comparing && (
                        <div className="mt-2 rounded-lg bg-muted/50 px-3 py-2">
                          <p className="mb-1.5 text-[10px] font-medium text-muted-foreground">
                            이 버전 → 현재 편집본 장별 글자수
                          </p>
                          <ul className="grid grid-cols-1 gap-y-1 sm:grid-cols-2 sm:gap-x-6">
                            {STEPS.map((st) => {
                              const before = chapterCharCount(v, st.key);
                              const after = chapterCharCount({ sections: form.sections }, st.key);
                              const delta = after - before;
                              return (
                                <li key={st.key} className="flex items-center justify-between gap-2 text-[11px]">
                                  <span className="text-muted-foreground">{st.label}</span>
                                  <span className="tabular-nums">
                                    {before.toLocaleString()} → {after.toLocaleString()}
                                    <span
                                      className={cn(
                                        "ml-1",
                                        delta > 0 ? "text-emerald-600" : delta < 0 ? "text-rose-500" : "text-muted-foreground",
                                      )}
                                    >
                                      ({delta > 0 ? "+" : ""}{delta.toLocaleString()})
                                    </span>
                                  </span>
                                </li>
                              );
                            })}
                          </ul>
                          <p className="mt-1.5 text-[10px] text-muted-foreground">
                            글자수가 줄어드는 장은 복원 시 현재 작성분이 덮어쓰여요 — 복원 전 자동 백업이 함께 저장됩니다.
                          </p>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </section>

      {/* ── 스텝 탭 ── UX-1(2026-07-04): 375px 에서 8개 탭 압착 — 가로 스크롤 전환 */}
      <div className="flex items-center gap-1 overflow-x-auto rounded-2xl border bg-card p-1.5">
        {STEPS.map((s, i) => {
          const active = !onAbstract && !onAppendix && !onReferences && step === s.key;
          return (
            <button
              key={s.key}
              type="button"
              onClick={() => {
                setStep(s.key);
                setOnAbstract(false);
                setOnAppendix(false);
                setOnReferences(false);
              }}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex flex-1 shrink-0 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <s.icon size={14} />
              <span className="hidden sm:inline">{["Ⅰ", "Ⅱ", "Ⅲ", "Ⅳ", "Ⅴ"][i]}. {s.label}</span>
              <span className="sm:hidden">{["서론", "이론", "방법", "결과", "결론"][i]}</span>
              {(pendingByChapter.get(s.key)?.length ?? 0) > 0 && (
                <span
                  title={`미반영 지도 ${pendingByChapter.get(s.key)!.length}건`}
                  className={cn(
                    "ml-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold",
                    active ? "bg-primary-foreground/20 text-primary-foreground" : "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-200",
                  )}
                >
                  {pendingByChapter.get(s.key)!.length}
                </span>
              )}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => {
            setOnAbstract(true);
            setOnAppendix(false);
            setOnReferences(false);
          }}
          className={cn(
            "flex flex-1 shrink-0 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors",
            onAbstract && !onAppendix && !onReferences
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          <FileText size={14} />
          <span>초록</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setOnAppendix(true);
            setOnAbstract(false);
            setOnReferences(false);
          }}
          className={cn(
            "flex flex-1 shrink-0 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors",
            onAppendix
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          <Paperclip size={14} />
          <span>부록</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setOnReferences(true);
            setOnAbstract(false);
            setOnAppendix(false);
          }}
          className={cn(
            "flex flex-1 shrink-0 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors",
            onReferences
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          <BookMarked size={14} />
          <span className="hidden sm:inline">참고문헌</span>
          <span className="sm:hidden">문헌</span>
        </button>
      </div>

      {onReferences ? (
        /* R3: 참고문헌 패널 — 계획서·보고서 연결 문헌을 APA7로 자동 정렬 */
        <section className="space-y-3 rounded-2xl border bg-card p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="text-sm font-semibold">참고문헌 (References)</h4>
            {!readOnly && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                onClick={() => void generateReferences()}
                disabled={refsBusy || !paper}
              >
                {refsBusy ? <Loader2 size={13} className="mr-1 animate-spin" /> : <Quote size={13} className="mr-1" />}
                계획서·보고서 문헌으로 생성 (APA7)
              </Button>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground">
            연구계획서·연구보고서에 연결해 둔 &lsquo;읽은 논문&rsquo;을 APA 7판 형식으로 저자·연도순 정렬해 채웁니다.
            생성 후 자유롭게 편집하세요 — 내용이 이미 있으면 덮어쓰기 전에 확인을 거칩니다.
          </p>
          <textarea
            value={form.references}
            readOnly={readOnly || refsBusy}
            onChange={(e) => {
              setForm((prev) => ({ ...prev, references: e.target.value }));
              markDirty();
            }}
            rows={16}
            placeholder="참고문헌 목록 — 우측 상단 버튼으로 계획서·보고서의 문헌을 APA7 형식으로 불러올 수 있어요."
            className="w-full resize-y rounded-xl border bg-background p-3.5 text-sm leading-relaxed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 read-only:opacity-60"
          />
        </section>
      ) : onAppendix ? (
        <AppendixPanel
          items={form.appendices}
          readOnly={readOnly}
          onChange={(next) => {
            setForm((prev) => ({ ...prev, appendices: next }));
            markDirty();
          }}
        />
      ) : onAbstract ? (
        <AbstractPanel
          value={form.abstract}
          keywords={form.abstractKeywords}
          valueEn={form.abstractEn}
          onChangeEn={(next) => {
            setForm((prev) => ({ ...prev, abstractEn: next }));
            markDirty();
          }}
          readOnly={readOnly}
          onChange={(next) => {
            setForm((prev) => ({ ...prev, abstract: next }));
            markDirty();
          }}
          onKeywordsChange={(next) => {
            setForm((prev) => ({ ...prev, abstractKeywords: next }));
            markDirty();
          }}
        />
      ) : (
      <>

      {/* ── 스텝 내용: 섹션 · 단락 ── */}
      <section className="rounded-2xl border bg-card p-5">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold">
            {["Ⅰ", "Ⅱ", "Ⅲ", "Ⅳ", "Ⅴ"][stepIdx]}. {STEPS[stepIdx].label}
          </h4>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-muted-foreground">
              {chapterChars(form, step).toLocaleString()}자
            </span>
            {!readOnly && (
              <button
                type="button"
                onClick={() => resetChapter(step)}
                title="이 장을 기본 구성으로 초기화"
                className="inline-flex items-center gap-1 rounded-lg border border-dashed px-2 py-0.5 text-[10px] text-muted-foreground transition-colors hover:border-destructive/40 hover:text-destructive"
              >
                <RotateCcw size={11} />
                기본값 초기화
              </button>
            )}
          </div>
        </div>

        {/* 장 요약 — 세부 절 앞 도입 단락 (항상 표시) */}
        {overviewSection && (
          <div className="mt-3 rounded-xl border border-dashed border-primary/35 bg-primary/[0.03] p-3.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-bold text-primary">{CHAPTER_OVERVIEW_HEADING}</span>
              <span className="text-[10px] text-muted-foreground">
                이 장에서 무엇을 다루는지 한두 단락으로 개관하세요 — 세부 절 앞에 배치됩니다
              </span>
            </div>
            <div className="mt-2 space-y-2">
              {overviewSection.paragraphs.map((p, pi) => (
                <div key={p.id} className="group relative">
                  <Textarea
                    className="min-h-[64px] font-sans text-base leading-relaxed"
                    rows={2}
                    value={p.text}
                    placeholder={`예: 본 장에서는 …을 검토한다. 먼저 …을 살펴보고, 이어서 …을 논의한다.`}
                    onChange={(e) => updateParagraph(step, overviewSection.id, p.id, e.target.value)}
                    disabled={readOnly || !paper}
                  />
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() => removeParagraph(step, overviewSection.id, p.id)}
                      aria-label="요약 단락 삭제"
                      className="absolute right-2 top-2 rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-destructive sm:text-muted-foreground/0 sm:group-focus-within:text-muted-foreground sm:group-hover:text-muted-foreground"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              ))}
            </div>
            {!readOnly && (
              <button
                type="button"
                onClick={() => addParagraph(step, overviewSection.id)}
                className="mt-2 inline-flex items-center gap-1 rounded-md border border-dashed px-2.5 py-1 text-[11px] text-muted-foreground hover:border-primary/40 hover:text-primary"
              >
                <Plus size={11} />
                요약 단락 추가
              </button>
            )}
          </div>
        )}

        <div className="mt-3 space-y-4">
          {useSectionTabs && (
            <div className="mb-3 flex flex-wrap gap-1.5">
              {bodySections.map((sec, si) => (
                <button
                  key={sec.id}
                  type="button"
                  onClick={() => setSectionTab(si)}
                  className={cn(
                    "rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors",
                    si === activeSectionIdx
                      ? "border-primary bg-primary text-primary-foreground shadow-sm"
                      : "bg-card text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  {si + 1}. {sec.heading.trim() || "(제목 없음)"}
                </button>
              ))}
            </div>
          )}
          {bodySections.map((sec, si) => (
            <div
              key={sec.id}
              className={cn(
                "rounded-xl border bg-background/50 p-3.5",
                useSectionTabs && si !== activeSectionIdx && "hidden",
              )}
            >
              {/* 섹션 헤더 */}
              <div className="flex items-center gap-2">
                <span className="shrink-0 text-[11px] font-bold text-primary">{si + 1}.</span>
                <Input
                  className="h-8 flex-1 border-transparent bg-transparent px-1 text-sm font-semibold shadow-none focus-visible:border-input"
                  value={sec.heading}
                  placeholder="절 제목 (예: 연구의 필요성)"
                  onChange={(e) => updateSection(step, sec.id, { heading: e.target.value })}
                  disabled={readOnly}
                />
                {getSectionGuides(sec.heading) && (
                  <button
                    type="button"
                    onClick={() => {
                      if (sectionGuideOpen !== sec.id) logEditorEvent(user.id, "section_guide_open");
                      setSectionGuideOpen((cur) => (cur === sec.id ? null : sec.id));
                    }}
                    aria-expanded={sectionGuideOpen === sec.id}
                    aria-label="이 섹션 작성 가이드"
                    title="이 절 작성 가이드"
                    className={cn(
                      "shrink-0 rounded-md p-1.5 transition-colors",
                      sectionGuideOpen === sec.id
                        ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                        : "text-amber-500/80 hover:bg-amber-50 hover:text-amber-600 dark:hover:bg-amber-950/30",
                    )}
                  >
                    <Lightbulb size={14} />
                  </button>
                )}
                {!readOnly && (
                  <div className="flex shrink-0 items-center gap-0.5">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-primary"
                      aria-label="섹션 위로 이동"
                      disabled={si === 0}
                      onClick={() => moveSection(step, sec.id, -1)}
                    >
                      <ArrowUp size={13} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-primary"
                      aria-label="섹션 아래로 이동"
                      disabled={si === bodySections.length - 1}
                      onClick={() => moveSection(step, sec.id, 1)}
                    >
                      <ArrowDown size={13} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                      aria-label="섹션 삭제"
                      onClick={() => removeSection(step, sec.id)}
                    >
                      <Trash2 size={13} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-primary"
                      aria-label="지금까지 변경 저장"
                      title="지금까지의 변경을 저장 (전체 문서 저장)"
                      disabled={saving || (!dirty && !!savedAt)}
                      onClick={() => handleSave()}
                    >
                      <Save size={13} />
                    </Button>
                  </div>
                )}
              </div>

              {/* 섹션 작성 가이드 — 부심 강의 2·3주차 일반화 */}
              {sectionGuideOpen === sec.id && getSectionGuides(sec.heading) && (
                <ul className="mt-2 space-y-1.5 rounded-lg border border-amber-200/60 bg-amber-50/50 px-3 py-2.5 dark:border-amber-800/40 dark:bg-amber-950/15">
                  {getSectionGuides(sec.heading)!.map((tip, ti) => (
                    <li
                      key={ti}
                      className="flex gap-1.5 text-[11px] leading-relaxed text-amber-900/90 dark:text-amber-100/90"
                    >
                      <span className="mt-0.5 shrink-0">·</span>
                      {tip}
                    </li>
                  ))}
                </ul>
              )}

              {/* 단락들 */}
              <div className="mt-2 space-y-2">
                {sec.paragraphs.map((p, pi) => (
                  <div key={p.id} className="group relative">
                    <Textarea
                      className="min-h-[72px] font-sans text-base leading-relaxed"
                      rows={3}
                      value={p.text}
                      placeholder={`단락 ${pi + 1}`}
                      onChange={(e) => updateParagraph(step, sec.id, p.id, e.target.value)}
                      disabled={readOnly || !paper}
                    />
                    {!readOnly && (
                      <div className="absolute right-2 top-2 flex items-center gap-0.5">
                        <button
                          type="button"
                          onClick={() => moveParagraph(step, sec.id, p.id, -1)}
                          disabled={pi === 0}
                          aria-label="단락 위로 이동"
                          className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-primary disabled:pointer-events-none disabled:opacity-25 sm:text-muted-foreground/0 sm:group-focus-within:text-muted-foreground sm:group-hover:text-muted-foreground"
                        >
                          <ArrowUp size={12} />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveParagraph(step, sec.id, p.id, 1)}
                          disabled={pi === sec.paragraphs.length - 1}
                          aria-label="단락 아래로 이동"
                          className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-primary disabled:pointer-events-none disabled:opacity-25 sm:text-muted-foreground/0 sm:group-focus-within:text-muted-foreground sm:group-hover:text-muted-foreground"
                        >
                          <ArrowDown size={12} />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeParagraph(step, sec.id, p.id)}
                          aria-label="단락 삭제"
                          className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-destructive sm:text-muted-foreground/0 sm:group-focus-within:text-muted-foreground sm:group-hover:text-muted-foreground"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {!readOnly && (
                <button
                  type="button"
                  onClick={() => addParagraph(step, sec.id)}
                  className="mt-2 inline-flex items-center gap-1 rounded-md border border-dashed px-2.5 py-1 text-[11px] text-muted-foreground hover:border-primary/40 hover:text-primary"
                >
                  <Plus size={11} />
                  단락 추가
                </button>
              )}
            </div>
          ))}
        </div>

        {/* 구조화된 연구문제 — 서론 상단(섹션 루프 직후·학술 문형 위) (2026-07-01) */}
        {step === "intro" && (
          <ResearchQuestionsPanel
            items={form.researchQuestions}
            readOnly={readOnly}
            onChange={(next) => {
              setForm((prev) => ({ ...prev, researchQuestions: next }));
              markDirty();
            }}
          />
        )}

        {/* R2: 가설 → '연구모형 및 가설' 절 나열 배너 (이론적 배경 장) */}
        {step === "background" && !readOnly && paper &&
          form.researchQuestions.some((q) => q.hypothesisText?.trim()) && (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-dashed border-primary/40 bg-primary/5 px-4 py-3">
              <p className="text-xs text-foreground/85">
                서론의 연구문제에 작성한{" "}
                <span className="font-semibold">
                  가설 {form.researchQuestions.filter((q) => q.hypothesisText?.trim()).length}개
                </span>
                가 있어요 — H1~ 형식으로 절에 나열할 수 있습니다.{" "}
                <span className="text-muted-foreground">
                  단, 우리 전공 논문은 가설을 본문에 직접 쓰지 않는 관례가 있으니 수록 여부는 지도교수와 확인하세요.
                </span>
              </p>
              <Button size="sm" variant="outline" className="h-7 shrink-0 text-xs" onClick={insertHypotheses}>
                &lsquo;연구모형 및 가설&rsquo; 절에 나열
              </Button>
            </div>
          )}

        {/* R4: 문헌 매트릭스 → 선행연구 비교표 삽입 배너 (이론적 배경 장) */}
        {step === "background" && !readOnly && paper && matrixPaperCount > 0 && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-dashed border-primary/40 bg-primary/5 px-4 py-3">
            <p className="text-xs text-foreground/85">
              문헌 리뷰 매트릭스에 정리한 논문{" "}
              <span className="font-semibold">{matrixPaperCount}편</span>이 있어요 — 저자·대상·설계·결과·시사점
              비교표로 삽입할 수 있습니다.
            </p>
            <Button size="sm" variant="outline" className="h-7 shrink-0 text-xs" onClick={insertLiteratureMatrix}>
              선행연구 비교표 삽입
            </Button>
          </div>
        )}

        {/* R2: 연구윤리 체크리스트 (연구 방법 장) */}
        {step === "method" && (
          <EthicsChecklistPanel
            checked={form.ethicsChecked}
            readOnly={readOnly}
            onChange={(next) => {
              setForm((prev) => ({ ...prev, ethicsChecked: next }));
              markDirty();
            }}
            onInsert={insertEthicsText}
          />
        )}

        {/* R5: 측정도구 신뢰도 표 + 연구 절차 타임라인 (연구 방법 장) */}
        {step === "method" && (
          <MethodStructurePanel
            instruments={form.instruments}
            procedure={form.procedureSteps}
            readOnly={readOnly}
            approach={profile?.approach}
            onInstrumentsChange={(next) => {
              setForm((prev) => ({ ...prev, instruments: next }));
              markDirty();
            }}
            onProcedureChange={(next) => {
              setForm((prev) => ({ ...prev, procedureSteps: next }));
              markDirty();
            }}
            onInsertInstruments={(text) =>
              profile?.approach === "qualitative"
                ? insertMethodBlock(["자료 수집", "연구 도구", "측정 도구"], "자료 수집", text)
                : insertMethodBlock(["측정 도구", "측정도구", "연구 도구", "검사 도구"], "측정 도구", text)
            }
            onInsertProcedure={(text) =>
              insertMethodBlock(["연구 절차", "연구절차", "실험 절차"], "연구 절차", text)
            }
          />
        )}

        {/* 섹션 추가 */}
        {!readOnly && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => addSection(step)}
              className="inline-flex items-center gap-1 rounded-lg border border-dashed px-3 py-1.5 text-xs font-medium text-muted-foreground hover:border-primary/40 hover:text-primary"
            >
              <Plus size={12} />
              절 추가
            </button>
            <button
              type="button"
              onClick={() => setTableBuilderOpen(true)}
              className="inline-flex items-center gap-1 rounded-lg border border-dashed px-3 py-1.5 text-xs font-medium text-muted-foreground hover:border-primary/40 hover:text-primary"
              title="행·열·이름을 지정해 표 만들기"
            >
              <Plus size={12} />
              표 추가
            </button>
            {unusedTemplates.map((h) => (
              <button
                key={h}
                type="button"
                onClick={() => addSection(step, h)}
                className="rounded-full border bg-muted/40 px-2.5 py-1 text-[11px] text-muted-foreground hover:border-primary/40 hover:text-primary"
                title="추천 절 추가"
              >
                + {h}
              </button>
            ))}
          </div>
        )}

        {/* 챕터별 심사 방어 가이드 — 연구 접근별 분기 (기본 접힘) */}
        <div className="mt-4 rounded-xl border border-amber-200/70 bg-amber-50/40 dark:border-amber-800/50 dark:bg-amber-950/10">
          <button
            type="button"
            onClick={() => {
              if (!guideOpen) logEditorEvent(user.id, "guide_open");
              setGuideOpen((v) => !v);
            }}
            aria-expanded={guideOpen}
            className="flex w-full items-center justify-between px-3.5 py-2.5 text-left"
          >
            <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-800 dark:text-amber-200">
              <Lightbulb size={13} />
              심사위원의 눈 — {STEPS[stepIdx].label} 체크 {guides.length}가지
              {profile?.approach === "qualitative" && (step === "method" || step === "results") && (
                <span className="font-normal text-amber-700/80 dark:text-amber-300/80">(질적 연구 기준)</span>
              )}
            </span>
            <ChevronRight
              size={14}
              className={cn(
                "shrink-0 text-amber-700/70 transition-transform dark:text-amber-300/70",
                guideOpen && "rotate-90",
              )}
            />
          </button>
          {guideOpen && (
            <ul className="space-y-1.5 border-t border-amber-200/60 px-3.5 py-3 dark:border-amber-800/40">
              {guides.map((tip, i) => (
                <li key={i} className="flex gap-1.5 text-xs leading-relaxed text-amber-900/90 dark:text-amber-100/90">
                  <span className="mt-0.5 shrink-0">·</span>
                  {tip}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* 읽기 서랍 — 내 읽기 노트를 인용으로 (파이프라인 P1, 2026-06-13) */}
        <ReadingDrawer userId={user.id} chapter={step} />

        {/* 학술 문형 은행 — 장별 정형 문형, 클릭=클립보드 복사 (2026-06-12) */}
        <div className="mt-3 rounded-xl border border-violet-200/70 bg-violet-50/30 dark:border-violet-800/50 dark:bg-violet-950/10">
          <button
            type="button"
            onClick={() => {
              if (!phrasesOpen) logEditorEvent(user.id, "phrases_open");
              setPhrasesOpen((v) => !v);
            }}
            aria-expanded={phrasesOpen}
            className="flex w-full items-center justify-between px-3.5 py-2.5 text-left"
          >
            <span className="flex items-center gap-1.5 text-xs font-semibold text-violet-800 dark:text-violet-200">
              <Quote size={13} />
              학술 문형 — {STEPS[stepIdx].label}에서 자주 쓰는 표현
              <span className="font-normal text-violet-700/70 dark:text-violet-300/70">(클릭하면 복사돼요)</span>
            </span>
            <ChevronRight
              size={14}
              className={cn(
                "shrink-0 text-violet-700/70 transition-transform dark:text-violet-300/70",
                phrasesOpen && "rotate-90",
              )}
            />
          </button>
          {phrasesOpen && (
            <div className="space-y-2.5 border-t border-violet-200/60 px-3.5 py-3 dark:border-violet-800/40">
              {phrasesForChapter(step).map((group) => (
                <div key={group.label}>
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-violet-700/80 dark:text-violet-300/80">
                    {group.label}
                  </p>
                  <ul className="space-y-1">
                    {group.phrases.map((phrase) => (
                      <li key={phrase}>
                        <button
                          type="button"
                          onClick={() => {
                            void navigator.clipboard.writeText(phrase).then(
                              () => toast.success("문형이 복사되었습니다 — 원하는 단락에 붙여넣고 빈칸(___)을 채우세요."),
                              () => toast.error("복사에 실패했습니다."),
                            );
                          }}
                          className="group flex w-full items-start gap-1.5 rounded-md px-2 py-1 text-left text-[11px] leading-relaxed text-violet-900/90 transition-colors hover:bg-violet-100/60 dark:text-violet-100/90 dark:hover:bg-violet-900/30"
                        >
                          <Copy size={10} className="mt-0.5 shrink-0 opacity-40 group-hover:opacity-100" />
                          {phrase}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 선택한 분석 방법 기술 — 연구 방법 장 한정 자동 표시 (2026-06-12) */}
        {step === "method" && (profile?.methods?.length ?? 0) > 0 && (
          <div className="mt-3 rounded-xl border border-sky-200/70 bg-sky-50/40 p-3.5 dark:border-sky-800/50 dark:bg-sky-950/10">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-sky-800 dark:text-sky-200">
              <Microscope size={13} />
              선택한 분석 방법 기술 — &lsquo;자료 분석&rsquo; 섹션에 골격을 삽입할 수 있어요
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {profile!.methods!.map((m) => (
                <div key={m} className="flex items-center gap-1 rounded-lg bg-card/60 px-2 py-1.5">
                  <span className="text-[11px] font-semibold text-sky-900 dark:text-sky-100">
                    {STAT_METHOD_LABELS[m]}
                  </span>
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() => insertAnalysisSkeleton(m)}
                      className="rounded-full border border-dashed border-sky-400/60 px-2.5 py-1.5 text-[11px] font-medium text-sky-700 transition-colors hover:bg-sky-600 hover:text-white dark:text-sky-300"
                    >
                      + 기술 문장 삽입
                    </button>
                  )}
                </div>
              ))}
            </div>
            <p className="mt-2 text-[10px] text-muted-foreground">
              각 방법의 선택 이유(예: 사전 차이 통제=ANCOVA)를 함께 적고, 마지막은 &lsquo;모든 통계 분석은 유의수준 .05에서 검증하였다&rsquo;로 마무리하세요.
            </p>
          </div>
        )}

        {/* 연구 방법·분석 도우미 — 설계 9종·통계 8종 레퍼런스 (사이클 31) */}
        {step === "method" && (
          <MethodHelper
            userId={user.id}
            selectedMethods={profile?.methods ?? []}
            assumptionsByMethod={ASSUMPTIONS_BY_METHOD}
            archiveByMethod={{ ...ARCHIVE_BY_METHOD, ...Object.fromEntries(archiveDocHrefByType) }}
            readOnly={readOnly}
            hasProfile={!!profile}
            onInsertAnalysis={insertAnalysisSkeleton}
            onInsertDesign={insertDesignSkeleton}
            onAddMethod={(m) => void addMethodToProfile(m)}
            onOpenProfile={openProfileDialog}
          />
        )}

        {/* 선택한 분석 방법의 기본 가정 검정 — 결과 장 한정 자동 표시 (2026-06-12) */}
        {step === "results" && resultsMethods.length > 0 && (
          <div className="mt-3 rounded-xl border border-sky-200/70 bg-sky-50/40 p-3.5 dark:border-sky-800/50 dark:bg-sky-950/10">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-sky-800 dark:text-sky-200">
              <Microscope size={13} />
              분석 방법별 가정·결과 골격 — 프로파일 선택 + 연구문제 태그(③) 방법 포함
            </p>
            <div className="mt-2.5 space-y-3.5">
              {resultsMethods.map((m) => {
                const g = ASSUMPTION_GUIDES[m];
                if (!g) return null;
                return (
                  <div key={m} className="rounded-lg bg-card/60 p-2.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-xs font-bold text-sky-900 dark:text-sky-100">
                        {STAT_METHOD_LABELS[m]}
                      </span>
                      {taggedOnlyMethods.has(m) && (
                        <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-semibold text-amber-800 dark:bg-amber-900/50 dark:text-amber-200">
                          연구문제 태그
                        </span>
                      )}
                      {(archiveDocHrefByType.get(m) ?? g.archiveHref) && (
                        <Link
                          href={archiveDocHrefByType.get(m) ?? g.archiveHref!}
                          className="rounded-full border border-sky-300/60 px-2.5 py-1.5 text-[11px] text-sky-700 transition-colors hover:bg-sky-100 dark:border-sky-700/60 dark:text-sky-300 dark:hover:bg-sky-900/40"
                        >
                          아카이브 개념 보기{archiveDocHrefByType.has(m) ? " (해석·참고문헌)" : ""}
                        </Link>
                      )}
                      {!readOnly && (
                        <button
                          type="button"
                          onClick={() => insertAssumptionSkeleton(m)}
                          className="rounded-full border border-dashed border-sky-400/60 px-2.5 py-1.5 text-[11px] font-medium text-sky-700 transition-colors hover:bg-sky-600 hover:text-white dark:text-sky-300"
                        >
                          + 보고 골격 섹션에 삽입
                        </button>
                      )}
                      {!readOnly && (
                        <button
                          type="button"
                          onClick={() => insertResultTable(m)}
                          className="rounded-full border border-dashed border-sky-400/60 px-2.5 py-1.5 text-[11px] font-medium text-sky-700 transition-colors hover:bg-sky-600 hover:text-white dark:text-sky-300"
                        >
                          + 결과 표 골격 삽입
                        </button>
                      )}
                      {!readOnly && (
                        <button
                          type="button"
                          onClick={() => insertResultsNarrative(m)}
                          className="rounded-full border border-dashed border-emerald-400/60 px-2 py-0.5 text-[10px] font-medium text-emerald-700 transition-colors hover:bg-emerald-600 hover:text-white dark:text-emerald-300"
                        >
                          + 결과 서술문 삽입
                        </button>
                      )}
                    </div>
                    <ul className="mt-1.5 space-y-1">
                      {g.assumptions.map((a, i) => (
                        <li
                          key={i}
                          className="flex gap-1.5 text-[11px] leading-relaxed text-sky-900/85 dark:text-sky-100/85"
                        >
                          <span className="mt-0.5 shrink-0">·</span>
                          {a}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 이 장의 미반영 지도 노트 — 지도 노트 탭과 양방향 연결 (연구 코크핏) */}
        {!readOnly && (pendingByChapter.get(step)?.length ?? 0) > 0 && (
          <div className="mt-3 rounded-xl border border-rose-200/70 bg-rose-50/40 p-3.5 dark:border-rose-800/50 dark:bg-rose-950/10">
            <p className="flex items-center justify-between gap-2 text-xs font-semibold text-rose-800 dark:text-rose-200">
              <span className="flex items-center gap-1.5">
                <GraduationCap size={13} />
                이 장의 미반영 지도 {pendingByChapter.get(step)!.length}건
              </span>
              <Link
                href="/mypage/research?tab=feedback"
                className="font-normal text-rose-700/80 hover:underline dark:text-rose-300/80"
              >
                지도 노트에서 관리 →
              </Link>
            </p>
            <ul className="mt-2 space-y-1.5">
              {pendingByChapter.get(step)!.slice(0, 3).map((n) => (
                <li key={n.id} className="flex gap-1.5 text-xs leading-relaxed text-rose-900/90 dark:text-rose-100/90">
                  <span className="mt-0.5 shrink-0 text-[10px] tabular-nums text-rose-600/70">{n.meetingDate.slice(5)}</span>
                  <span className="line-clamp-2">{n.content}</span>
                </li>
              ))}
              {pendingByChapter.get(step)!.length > 3 && (
                <li className="text-[11px] text-rose-700/70 dark:text-rose-300/70">
                  외 {pendingByChapter.get(step)!.length - 3}건…
                </li>
              )}
            </ul>
          </div>
        )}
      </section>

      {/* 문체 점검(번역투·시제/태) — 현재 장 인라인, 이전/다음 위 (2026-07-01) */}
      <div className="mt-1">
        <StyleCheckPanel sections={{ [step]: form.sections[step] }} />
      </div>

      {/* P2: 목차 미리보기 다이얼로그 */}
      <Dialog open={tocOpen} onOpenChange={setTocOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ListOrdered size={16} className="text-primary" />
              목차 미리보기
            </DialogTitle>
          </DialogHeader>
          {(() => {
            const toc = buildTocText();
            const { tables, figures } = buildFigureTocText();
            if (!toc) {
              return (
                <p className="rounded-lg border border-dashed px-3 py-6 text-center text-xs text-muted-foreground">
                  아직 작성분이 없습니다 — 본문을 작성하면 장·절 구조에서 차례가 자동 생성됩니다.
                </p>
              );
            }
            const full = [
              "차 례", "", toc,
              ...(tables.length > 0 ? ["", "표 목 차", "", ...tables] : []),
              ...(figures.length > 0 ? ["", "그 림 목 차", "", ...figures] : []),
            ].join("\n");
            return (
              <>
                <p className="text-[11px] text-muted-foreground">
                  작성분이 있는 장·절과 본문의 &lt;표&gt;·&lt;그림&gt; 캡션에서 자동 생성했습니다. 페이지 번호는 최종
                  편집(한글/워드)에서 자동 목차 기능으로 붙이세요. 텍스트 내보내기에도 포함됩니다.
                </p>
                <pre className="max-h-80 overflow-y-auto whitespace-pre-wrap rounded-xl border bg-muted/30 p-3.5 text-xs leading-relaxed">
                  {full}
                </pre>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setTocOpen(false)}>닫기</Button>
                  <Button
                    onClick={() => {
                      void navigator.clipboard
                        .writeText(full)
                        .then(() => toast.success("목차를 복사했습니다."))
                        .catch(() => toast.error("클립보드 복사에 실패했습니다."));
                    }}
                  >
                    <Copy size={13} className="mr-1.5" />
                    복사
                  </Button>
                </DialogFooter>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* 표 빌더 팝업 */}
      <TableBuilderDialog
        open={tableBuilderOpen}
        onOpenChange={setTableBuilderOpen}
        onInsert={(text) => insertTable(text)}
      />


      {/* ── 이전 / 다음 네비게이션 ── */}
      <div className="flex items-center justify-between rounded-2xl border bg-card p-3">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setStep(STEPS[stepIdx - 1].key)}
          disabled={!canPrev}
        >
          <ChevronLeft size={14} className="mr-1" />
          이전
        </Button>
        <span className="text-xs text-muted-foreground">
          {stepIdx + 1} / {STEPS.length}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setStep(STEPS[stepIdx + 1].key)}
          disabled={!canNext}
        >
          다음
          <ChevronRight size={14} className="ml-1" />
        </Button>
      </div>
      </>
      )}

      {/* ── 하단 고정 저장 바 — 모든 탭(본문·초록·부록·참고문헌) 공통 (QA-v2) ── */}
      {!readOnly && (
        <div className="sticky bottom-0 z-30 -mx-1 flex items-center justify-between gap-2 rounded-t-xl border border-b-0 bg-background/95 px-3 py-2 shadow-[0_-4px_12px_rgba(0,0,0,0.06)] backdrop-blur">
          <span className="truncate text-xs text-muted-foreground">
            {saving
              ? "저장 중…"
              : dirty
                ? "저장되지 않은 변경이 있습니다"
                : savedAt
                  ? `마지막 저장 ${new Date(savedAt).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}`
                  : ""}
          </span>
          <div className="flex shrink-0 items-center gap-2">
            <Button size="sm" variant="outline" onClick={handleSaveVersion} disabled={versionBusy} title="라벨을 붙여 버전 스냅샷 저장">
              버전 저장
            </Button>
            <Button size="sm" onClick={() => handleSave()} disabled={saving || (!dirty && !!savedAt)}>
              <Save size={12} className="mr-1" />
              {saving ? "저장 중…" : dirty ? "저장" : "저장됨"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
