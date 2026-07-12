// ── 연구 설계 (Research Design) ──
//
// 연구 여정에서 '연구 보고서'와 '연구 계획서' 사이의 신설 단계.
// 교육공학 학위논문 연구방법(III장) 전형 구조를 역산한 8섹션 작성 도구.
// 컬렉션: research_designs (사용자당 1건, 본인 rw + staff read).

/** 연구 접근 — 양적/질적/혼합 (빈 값 = 미선택) */
export type ResearchDesignApproach = "" | "quantitative" | "qualitative" | "mixed";

export const RESEARCH_DESIGN_APPROACH_LABELS: Record<
  Exclude<ResearchDesignApproach, "">,
  string
> = {
  quantitative: "양적 연구",
  qualitative: "질적 연구",
  mixed: "혼합 연구",
};

/** 3. 연구 대상 — 모집단·표본·표집·보호 */
export interface ResearchDesignParticipants {
  /** 모집단 */
  population: string;
  /** 표본 크기 */
  sampleSize: string;
  /** 표집 방법 (확률·비확률·의도적 등) */
  samplingMethod: string;
  /** 표본 크기 산정 근거 (검정력·포화 등) */
  sizeRationale: string;
  /** 참여자 보호 (동의·익명화·IRB) */
  protection: string;
}

export const EMPTY_PARTICIPANTS: ResearchDesignParticipants = {
  population: "",
  sampleSize: "",
  samplingMethod: "",
  sizeRationale: "",
  protection: "",
};

/** 4. 연구 절차 — 단계별 계획 (research-methods.procedures 에서 프리필) */
export interface ResearchDesignProcedureStep {
  /** 단계 이름 */
  step: string;
  /** 단계별 계획 상세 */
  detail: string;
}

/** 5. 연구 도구 — 측정도구(양적) 항목 */
export interface ResearchDesignInstrument {
  id: string;
  /** 아카이브 측정도구 ID (archive_measurements) — 선택 시 */
  measurementId?: string;
  /** 도구 이름 (측정도구 선택 시 denorm, 또는 자체 개발 도구 이름) */
  name: string;
  /** 측정·타당화 계획 (문항수·신뢰도·개발 절차 등) */
  plan: string;
}

/** ADDIE 단계 — 프로그램 개발 설계(효과분석 연구)용 */
export const ADDIE_STEPS: { id: string; label: string }[] = [
  { id: "analysis", label: "분석 (Analysis)" },
  { id: "design", label: "설계 (Design)" },
  { id: "development", label: "개발 (Development)" },
  { id: "implementation", label: "실행 (Implementation)" },
  { id: "evaluation", label: "평가 (Evaluation)" },
];

/** 6. 프로그램 개발 설계 — 효과분석(개발) 연구일 때만 노출 */
export interface ResearchDesignProgram {
  /** 프로그램 개발 설계 활성화 여부 */
  enabled: boolean;
  /** 처치 프로그램 개요 */
  overview: string;
  /** 회기 구성 */
  sessions: string;
  /** 체크한 ADDIE 단계 id 목록 */
  addieChecked: string[];
}

export const EMPTY_PROGRAM: ResearchDesignProgram = {
  enabled: false,
  overview: "",
  sessions: "",
  addieChecked: [],
};

export interface ResearchDesign {
  id: string;
  userId: string;
  // 1. 연구 유형·접근
  approach: ResearchDesignApproach;
  /** 선택한 연구방법 이름 (research-methods 시드/아카이브 명칭) */
  methodName?: string;
  /** 접근·방법 선택 이유 */
  approachRationale?: string;
  // 2. 연구 모형 — research_models(doc id = userId) 연결. 1인 1개라 사실상 userId.
  modelId?: string;
  // 3. 연구 대상
  participants: ResearchDesignParticipants;
  // 4. 연구 절차
  procedureSteps: ResearchDesignProcedureStep[];
  // 5. 연구 도구 (양적: 측정도구 / 질적: qualInstruments)
  instruments: ResearchDesignInstrument[];
  /** 질적 도구 — 면담 프로토콜 개요·델파이 패널 구성·질문 초안 */
  qualInstruments?: string;
  // 6. 프로그램 개발 설계 (효과분석 연구)
  programDesign?: ResearchDesignProgram;
  // 7. 자료 수집·분석
  /** 자료 수집 절차 */
  dataCollection: string;
  /** 자료 분석 — 양적: 가설별 통계방법 / 질적: 코딩·주제분석·신뢰성 */
  dataAnalysis: string;
  /** 선택한 통계분석 방법 이름 목록 (archive_statistical_methods.name) — 양적·혼합. 하위호환 위해 옵셔널. */
  selectedStatMethods?: string[];
  /** 연구윤리 체크(EthicsChecklistPanel.ETHICS_ITEMS id) — 윤리 단계 흡수 */
  ethicsChecked?: string[];
  lastSavedAt?: string;
  createdAt: string;
  updatedAt: string;
}

/** 빈 값 판정 헬퍼 */
function filled(v?: string): boolean {
  return !!v && v.trim().length > 0;
}

/** 8섹션 각각의 완성 여부 (섹션 완성도 칩·진행 판정용) */
export interface ResearchDesignSectionStatus {
  approach: boolean;
  model: boolean;
  participants: boolean;
  procedure: boolean;
  instruments: boolean;
  program: boolean;
  collectionAnalysis: boolean;
}

/**
 * 각 섹션 완성 여부 계산. 프로그램 섹션은 효과분석(programDesign.enabled)일 때만
 * 완성 대상이 되며, 비활성 시 완성으로 간주(진행률 왜곡 방지).
 */
export function designSectionStatus(
  d: ResearchDesign | null | undefined,
): ResearchDesignSectionStatus {
  if (!d) {
    return {
      approach: false,
      model: false,
      participants: false,
      procedure: false,
      instruments: false,
      program: true,
      collectionAnalysis: false,
    };
  }
  const p = d.participants ?? EMPTY_PARTICIPANTS;
  const programEnabled = !!d.programDesign?.enabled;
  const instrumentsFilled =
    d.approach === "qualitative"
      ? filled(d.qualInstruments)
      : (d.instruments ?? []).some((it) => filled(it.name) || filled(it.plan)) ||
        filled(d.qualInstruments);
  return {
    approach: d.approach !== "",
    model: filled(d.modelId),
    participants: filled(p.population) || filled(p.sampleSize) || filled(p.samplingMethod),
    procedure: (d.procedureSteps ?? []).some((s) => filled(s.step) || filled(s.detail)),
    instruments: instrumentsFilled,
    program: programEnabled
      ? filled(d.programDesign?.overview) || filled(d.programDesign?.sessions)
      : true,
    collectionAnalysis: filled(d.dataCollection) || filled(d.dataAnalysis),
  };
}

/** 완성도(0~100) — 진행 판정·MiniProgress 용 */
export function computeDesignProgress(d: ResearchDesign | null | undefined): number {
  if (!d) return 0;
  const s = designSectionStatus(d);
  const keys: (keyof ResearchDesignSectionStatus)[] = [
    "approach",
    "model",
    "participants",
    "procedure",
    "instruments",
    "program",
    "collectionAnalysis",
  ];
  const done = keys.filter((k) => s[k]).length;
  return Math.round((done / keys.length) * 100);
}
