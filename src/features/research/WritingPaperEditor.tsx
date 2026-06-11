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
  Diff, RotateCcw, ArrowUp, ArrowDown,
  Loader2, Compass, GraduationCap,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { chapterCharCount } from "./thesis-progress";
import type {
  User,
  WritingPaper,
  WritingPaperChapterKey,
  WritingSection,
  WritingResearchProfile,
  ResearchApproachType,
  ResearchDesignType,
  WritingPaperVersion,
} from "@/types";
import {
  WRITING_APPROACH_LABELS,
  RESEARCH_DESIGN_LABELS,
  STAT_METHOD_LABELS,
} from "@/types";
import type { StatMethodType } from "@/types";
import { advisorFeedbackApi, writingPapersApi, writingPaperVersionsApi } from "@/lib/bkend";
import type { AdvisorFeedbackNote } from "@/types";
import { useStudyTimerStore } from "./study-timer/study-timer-store";
import { useCreateSession, useStudySessionsByWritingPaper } from "./study-timer/useStudySessions";
import {
  useWritingPaper,
  useEnsureWritingPaper,
  useUpdateWritingPaper,
} from "./useWritingPaper";
import { useLogWritingActivity } from "./useWritingPaperHistory";

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

/** 챕터·연구 접근별 추천 섹션 템플릿 */
function templateHeadings(
  chapter: WritingPaperChapterKey,
  approach: ResearchApproachType,
): string[] {
  const qual = approach === "qualitative";
  switch (chapter) {
    case "intro":
      return ["연구의 필요성", "연구 목적 및 연구 문제"];
    case "background":
      return qual
        ? ["핵심 개념과 이론", "선행연구 고찰"]
        : ["핵심 개념과 이론", "선행연구 고찰", "연구모형 및 가설"];
    case "method":
      return qual
        ? ["연구 설계", "연구 참여자", "자료 수집", "자료 분석", "신뢰성·타당성 확보"]
        : ["연구 설계", "연구 대상", "측정 도구", "연구 절차", "자료 분석"];
    case "results":
      return qual
        ? ["주제(테마)별 결과"]
        : ["기술통계 및 가정 검정", "연구문제별 결과"];
    case "conclusion":
      return ["요약 및 논의", "시사점", "연구의 한계 및 후속연구 제언"];
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

function buildTemplateSections(headings: string[]): WritingSection[] {
  return headings.map((heading) => ({ id: uid(), heading, paragraphs: [emptyParagraph()] }));
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
  /** 아카이브 개념 딥링크 (/archive/concept?q=) */
  archiveQuery?: string;
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
    archiveQuery: "중심극한정리와 정규성",
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
    archiveQuery: "중심극한정리와 정규성",
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
    archiveQuery: "공분산분석(ANCOVA)",
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
    archiveQuery: "상관분석과 회귀분석",
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
    archiveQuery: "상관분석과 회귀분석",
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
    archiveQuery: "카이제곱 검정",
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
    archiveQuery: "구조방정식모형(SEM)",
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
    archiveQuery: "요인분석과 구성타당도",
  },
};

function buildEmptyForm(approach: ResearchApproachType): FormState {
  const sections = {} as SectionsState;
  for (const k of CHAPTER_KEYS) sections[k] = buildTemplateSections(templateHeadings(k, approach));
  return { title: "", sections };
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
      sections[k] = normalizeSections(structured);
    } else if (p.chapters?.[k]?.trim()) {
      sections[k] = migratePlainText(p.chapters[k]!);
    } else {
      sections[k] = buildTemplateSections(templateHeadings(k, approach));
    }
  }
  return { title: p.title ?? "", sections };
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
  const [guideOpen, setGuideOpen] = useState(false);
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

  function markDirty() {
    setDirty(true);
  }

  // ── 섹션·단락 조작 ──

  function updateSection(k: WritingPaperChapterKey, sectionId: string, patch: Partial<WritingSection>) {
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
      const next = [...arr];
      [next[idx], next[to]] = [next[to], next[idx]];
      return { ...prev, sections: { ...prev.sections, [k]: next } };
    });
    markDirty();
  }

  function addSection(k: WritingPaperChapterKey, heading = "새 섹션") {
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
    if (hasContent && !confirm(`"${sec?.heading}" 섹션과 단락을 모두 삭제하시겠습니까?`)) return;
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
          lastSavedAt: now,
        },
      });
      setSavedAt(now);
      baseSavedAtRef.current = now;
      setDirty(false);
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
      toast.info(`${STAT_METHOD_LABELS[m]} 보고 골격은 이미 삽입되어 있습니다 — '${ASSUMPTION_SECTION_HEADING}' 섹션을 확인하세요.`);
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
    toast.success(`${STAT_METHOD_LABELS[m]} 가정 검정 보고 골격을 추가했습니다 — 빈칸(___)을 결과값으로 채우세요.`);
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
        if (structured && structured.length > 0) sections[k] = normalizeSections(structured);
        else if (v.chapters?.[k]?.trim()) sections[k] = migratePlainText(v.chapters[k]!);
        else sections[k] = buildTemplateSections(templateHeadings(k, restoredApproach));
      }
      setForm({ title: v.title ?? "", sections });
      setDirty(true);
      toast.success(`"${v.label}" 버전을 불러왔습니다 — 저장 버튼을 눌러 확정하세요.`);
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

  // ── 렌더 ──

  const stepIdx = STEPS.findIndex((s) => s.key === step);
  const canPrev = stepIdx > 0;
  const canNext = stepIdx < STEPS.length - 1;
  const total = useMemo(() => totalChars(form), [form]);
  const guides = getChapterGuides(step, profile?.approach);
  const currentSections = form.sections[step];
  const unusedTemplates = templateHeadings(step, approach).filter(
    (h) => !currentSections.some((s) => s.heading.trim() === h),
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
          {!readOnly && (
            <div className="flex shrink-0 items-center gap-2">
              {savedAt && !saving && (
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
              {/* 사용성 평가 반영: 임시저장/저장 이중 버튼 → 저장 1개로 통합 (savedAt 표시가 상태를 대신) */}
              <Button size="sm" onClick={() => handleSave()} disabled={saving || (!dirty && !!savedAt)}>
                <Save size={12} className="mr-1" />
                {saving ? "저장 중…" : dirty ? "저장" : "저장됨"}
              </Button>
            </div>
          )}
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
                          onClick={() => setCompareId(comparing ? null : v.id)}
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

      {/* ── 스텝 탭 ── */}
      <div className="flex items-center gap-1 rounded-2xl border bg-card p-1.5">
        {STEPS.map((s, i) => {
          const active = step === s.key;
          return (
            <button
              key={s.key}
              type="button"
              onClick={() => setStep(s.key)}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <s.icon size={14} />
              <span className="hidden sm:inline">{i + 1}. {s.label}</span>
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
      </div>

      {/* ── 스텝 내용: 섹션 · 단락 ── */}
      <section className="rounded-2xl border bg-card p-5">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold">
            {stepIdx + 1}. {STEPS[stepIdx].label}
          </h4>
          <span className="text-[11px] text-muted-foreground">
            {chapterChars(form, step).toLocaleString()}자
          </span>
        </div>

        <div className="mt-3 space-y-4">
          {currentSections.map((sec, si) => (
            <div key={sec.id} className="rounded-xl border bg-background/50 p-3.5">
              {/* 섹션 헤더 */}
              <div className="flex items-center gap-2">
                <span className="shrink-0 text-[11px] font-bold text-primary">{si + 1}.</span>
                <Input
                  className="h-8 flex-1 border-transparent bg-transparent px-1 text-sm font-semibold shadow-none focus-visible:border-input"
                  value={sec.heading}
                  placeholder="섹션 제목 (예: 연구의 필요성)"
                  onChange={(e) => updateSection(step, sec.id, { heading: e.target.value })}
                  disabled={readOnly}
                />
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
                      disabled={si === currentSections.length - 1}
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
                  </div>
                )}
              </div>

              {/* 단락들 */}
              <div className="mt-2 space-y-2">
                {sec.paragraphs.map((p, pi) => (
                  <div key={p.id} className="group relative">
                    <Textarea
                      className="min-h-[72px] font-sans text-sm leading-relaxed"
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

        {/* 섹션 추가 */}
        {!readOnly && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => addSection(step)}
              className="inline-flex items-center gap-1 rounded-lg border border-dashed px-3 py-1.5 text-xs font-medium text-muted-foreground hover:border-primary/40 hover:text-primary"
            >
              <Plus size={12} />
              섹션 추가
            </button>
            {unusedTemplates.map((h) => (
              <button
                key={h}
                type="button"
                onClick={() => addSection(step, h)}
                className="rounded-full border bg-muted/40 px-2.5 py-1 text-[11px] text-muted-foreground hover:border-primary/40 hover:text-primary"
                title="추천 섹션 추가"
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
            onClick={() => setGuideOpen((v) => !v)}
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

        {/* 선택한 분석 방법의 기본 가정 검정 — 결과 장 한정 자동 표시 (2026-06-12) */}
        {step === "results" && (profile?.methods?.length ?? 0) > 0 && (
          <div className="mt-3 rounded-xl border border-sky-200/70 bg-sky-50/40 p-3.5 dark:border-sky-800/50 dark:bg-sky-950/10">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-sky-800 dark:text-sky-200">
              <Microscope size={13} />
              선택한 분석 방법의 기본 가정 검정 — 결과 보고 전 확인하세요
            </p>
            <div className="mt-2.5 space-y-3.5">
              {profile!.methods!.map((m) => {
                const g = ASSUMPTION_GUIDES[m];
                if (!g) return null;
                return (
                  <div key={m} className="rounded-lg bg-card/60 p-2.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-xs font-bold text-sky-900 dark:text-sky-100">
                        {STAT_METHOD_LABELS[m]}
                      </span>
                      {g.archiveQuery && (
                        <Link
                          href={`/archive/concept?q=${encodeURIComponent(g.archiveQuery)}`}
                          className="rounded-full border border-sky-300/60 px-2 py-0.5 text-[10px] text-sky-700 transition-colors hover:bg-sky-100 dark:border-sky-700/60 dark:text-sky-300 dark:hover:bg-sky-900/40"
                        >
                          아카이브 개념 보기
                        </Link>
                      )}
                      {!readOnly && (
                        <button
                          type="button"
                          onClick={() => insertAssumptionSkeleton(m)}
                          className="rounded-full border border-dashed border-sky-400/60 px-2 py-0.5 text-[10px] font-medium text-sky-700 transition-colors hover:bg-sky-600 hover:text-white dark:text-sky-300"
                        >
                          + 보고 골격 섹션에 삽입
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
    </div>
  );
}
