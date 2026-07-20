/**
 * 스터디 교수설계 마법사 — 규칙 기반 커리큘럼 초안 생성 엔진 (순수 함수, LLM 호출 없음)
 *
 * 사용자가 입력한 조건(스터디 유형·회차 수·인원·수준·목표 유형 등)을
 * 교수설계 매핑 규칙에 따라 회차별 커리큘럼 초안(주제·학습목표·활동·과제)으로 변환한다.
 *
 * 각 설계 규칙에는 근거가 되는 교수설계 이론을 명시하며(주석 + UI 배지),
 * 아카이브에 실재하는 개념명을 conceptNames 로 연결해 딥링크 가능하게 한다.
 * (개념명은 src/lib/archive-seed.ts 에 존재하는 표제어만 사용 — 이름→id 해석은 UI에서 useConceptIndex 로 수행)
 *
 * 설계 원칙: 규칙 기반 초안 + 수동 편집이 정본. 자동 문서 생성기·LLM 연동을 만들지 않는다.
 */

// ── 조건 입력 타입 (마법사 1단계) ──

/** 스터디 유형 */
export type StudyKind =
  | "paper_reading" // 논문읽기
  | "exam_prep" // 자격증·시험 대비
  | "project" // 프로젝트·산출물
  | "sig_research" // SIG·연구
  | "tool_coding" // 도구·코딩 실습
  | "thesis_writing"; // 논문 작성

/** 최종 목표 유형 — 기반 설계 모형을 결정하는 핵심 축 */
export type GoalType =
  | "knowledge" // 지식 이해
  | "skill" // 기능 숙달
  | "artifact" // 산출물 완성
  | "exam" // 시험 합격
  | "research"; // 연구 성과(발표·논문)

/** 학습자 수준 → 스캐폴딩 강도 */
export type LearnerLevel = "beginner" | "intermediate" | "mixed";

/** 인원 규모 → 상호작용 구조 */
export type GroupSize = "small" | "medium" | "large"; // 2~4 / 5~8 / 9+

/** 주당 시간 */
export type WeeklyHours = "1h" | "2h" | "3h+";

export interface CurriculumConditions {
  studyKind: StudyKind;
  /** 총 회차 수 (2~16) */
  sessionCount: number;
  weeklyHours: WeeklyHours;
  groupSize: GroupSize;
  level: LearnerLevel;
  goalType: GoalType;
}

// ── 라벨 (UI 공용) ──

export const STUDY_KIND_LABELS: Record<StudyKind, string> = {
  paper_reading: "논문읽기",
  exam_prep: "자격증·시험 대비",
  project: "프로젝트·산출물",
  sig_research: "SIG·연구",
  tool_coding: "도구·코딩 실습 (바이브코딩 등)",
  thesis_writing: "논문 작성",
};

export const GOAL_TYPE_LABELS: Record<GoalType, string> = {
  knowledge: "지식 이해",
  skill: "기능 숙달",
  artifact: "산출물 완성",
  exam: "시험 합격",
  research: "연구 성과(발표·논문)",
};

export const LEVEL_LABELS: Record<LearnerLevel, string> = {
  beginner: "입문 위주",
  intermediate: "중급+",
  mixed: "혼합",
};

export const GROUP_SIZE_LABELS: Record<GroupSize, string> = {
  small: "2~4명",
  medium: "5~8명",
  large: "9명+",
};

export const WEEKLY_HOURS_LABELS: Record<WeeklyHours, string> = {
  "1h": "1시간",
  "2h": "2시간",
  "3h+": "3시간+",
};

// ── 설계 모형 (근거 이론 + 아카이브 개념 딥링크) ──

export interface DesignModel {
  id: string;
  /** UI 배지 라벨 (한국어) */
  name: string;
  /** 근거 이론 (영문 원어 병기) */
  theory: string;
  /** 아카이브에 실재하는 개념명 — 이름→id 해석 후 /archive/concept/{id} 딥링크 */
  conceptNames: string[];
  /** 아카이브 가이드 딥링크 — 실재하는 고정 경로 (개념 색인 조회 없이 직접 렌더) */
  guideLinks?: { href: string; label: string }[];
}

/**
 * (a) 목표 유형 → 기반 설계 모형.
 * - knowledge: Gagné 9 events 축약 (주의·선행지식 활성화 → 제시 → 이해 점검)
 * - skill: Merrill 시연-적용 원리 (시연 → 따라하기 → 독립 연습 → 피드백)
 * - artifact: PBL + 백워드 설계 (최종 산출 정의를 앞에, 마일스톤 역산, 중간 크리틱)
 * - exam: 완전학습 + 간격 반복 (개념 → 문제풀이 → 오답 복습, 후반 모의고사)
 * - research: 인지적 도제 + 세미나식 (문헌 발제 → 방법 워크숍 → 초안 크리틱 → 발표 리허설)
 */
export const GOAL_MODELS: Record<GoalType, DesignModel> = {
  knowledge: {
    id: "gagne",
    name: "가녜 9 수업사태(축약) 기반",
    theory: "Gagné's Nine Events of Instruction",
    conceptNames: ["학습의 조건", "교수설계 모형"],
  },
  skill: {
    id: "merrill",
    name: "메릴 시연-적용 원리 기반",
    theory: "Merrill's First Principles (Demonstration–Application)",
    conceptNames: ["스캐폴딩", "피드백"],
  },
  artifact: {
    id: "pbl_backward",
    name: "PBL · 백워드 설계 기반",
    theory: "Problem-Based Learning + Backward Design",
    conceptNames: ["프로젝트 기반 학습", "문제 기반 학습", "교수설계 모형"],
  },
  exam: {
    id: "mastery",
    name: "완전학습 · 간격 반복 기반",
    theory: "Mastery Learning + Spaced Repetition",
    conceptNames: ["완전학습", "반복"],
  },
  research: {
    id: "cognitive_apprenticeship",
    name: "인지적 도제 · 세미나식 기반",
    theory: "Cognitive Apprenticeship + Seminar",
    conceptNames: ["인지적 도제", "자기주도학습"],
  },
};

/** (b) 수준 → 스캐폴딩 강화 배지 (beginner/mixed 에서 추가) */
const SCAFFOLDING_MODEL: DesignModel = {
  id: "scaffolding",
  name: "스캐폴딩 강화",
  theory: "Scaffolding / Zone of Proximal Development",
  conceptNames: ["스캐폴딩"],
};

/** (c) 인원 → 협력 상호작용 배지 (medium/large 에서 추가) */
const COLLABORATIVE_MODEL: DesignModel = {
  id: "collaborative",
  name: "협력 상호작용",
  theory: "Collaborative Learning",
  conceptNames: ["협력학습"],
};

/** 논문 작성 스터디 전용 설계 모형 — 인지적 도제 + 과정중심 글쓰기 */
const THESIS_WRITING_MODEL: DesignModel = {
  id: "thesis_writing",
  name: "인지적 도제 · 과정중심 글쓰기",
  theory: "Cognitive Apprenticeship + Process Writing (plan–draft–critique–revise cycle)",
  conceptNames: ["인지적 도제", "자기주도학습", "메타인지"],
  guideLinks: [
    { href: "/archive/literature-review-guide", label: "문헌 리뷰 가이드" },
    { href: "/archive/citation-guide", label: "인용 가이드" },
    { href: "/archive/apa-style", label: "APA 스타일" },
  ],
};

// ── Bloom 동사군 (목표 유형별) — 학습목표 문장 템플릿에 사용 ──

const BLOOM_VERBS: Record<GoalType, string[]> = {
  knowledge: ["설명할 수 있다", "핵심 개념을 비교할 수 있다", "요약해 정리할 수 있다"],
  skill: ["직접 수행할 수 있다", "절차대로 구현할 수 있다", "응용해 적용할 수 있다"],
  artifact: ["설계·기획할 수 있다", "완성해 산출할 수 있다", "통합해 개선할 수 있다"],
  exam: ["정확히 풀이할 수 있다", "유형을 변별할 수 있다", "빠르고 정확하게 해결할 수 있다"],
  research: ["비판적으로 분석할 수 있다", "종합해 논증할 수 있다", "평가·검증할 수 있다"],
};

// ── 회차 초안 타입 ──

export type SessionPhase = "orientation" | "development" | "integration";

export const SESSION_PHASE_LABELS: Record<SessionPhase, string> = {
  orientation: "오리엔테이션",
  development: "전개",
  integration: "통합·평가",
};

export interface SessionDraft {
  /** 회차 번호 (1-base) */
  week: number;
  phase: SessionPhase;
  /** 주제 슬롯 */
  topic: string;
  /** 학습목표 문장 (Bloom 동사) */
  objective: string;
  /** 활동 구성 */
  activities: string[];
  /** 과제 제안 */
  assignment: string;
}

export interface CurriculumDraft {
  /** 적용된 설계 모형 배지 목록 (기반 + 스캐폴딩/협력) */
  models: DesignModel[];
  /** 스캐폴딩 강도 안내 (수준 기반) */
  scaffoldingNote: string;
  /** 상호작용 구조 안내 (인원 기반) */
  interactionNote: string;
  sessions: SessionDraft[];
}

/** 스터디 문서(activity)에 저장하는 설계 메타 — curriculumDesign 필드 */
export interface CurriculumDesignMeta {
  conditions: CurriculumConditions;
  models: { id: string; name: string; theory: string; conceptNames: string[] }[];
  scaffoldingNote: string;
  interactionNote: string;
  generatedAt: string;
}

// ── 조건별 세부 규칙 헬퍼 ──

/** 스터디 유형 → 전개 회차 주제 접두어 (유형에 맞춘 표현) */
function developmentTopicLabel(kind: StudyKind, index: number): string {
  switch (kind) {
    case "paper_reading":
      return `논문 리뷰 ${index}`;
    case "exam_prep":
      return `핵심 단원 ${index}`;
    case "project":
      return `마일스톤 ${index}`;
    case "sig_research":
      return `연구 세션 ${index}`;
    case "tool_coding":
      return `실습 ${index}`;
    case "thesis_writing":
      return `집필 블록 ${index}`;
  }
}

/** (c) 인원 → 상호작용 활동 문구 */
function interactionActivity(groupSize: GroupSize): string {
  switch (groupSize) {
    case "small":
      return "전원 발제 로테이션 (돌아가며 주도)";
    case "medium":
      return "소그룹 토의 후 전체 공유";
    case "large":
      return "팀 분할·팀별 산출물 정리";
  }
}

function interactionNoteText(groupSize: GroupSize): string {
  switch (groupSize) {
    case "small":
      return "2~4명 소규모 — 매 회차 전원이 돌아가며 발제·진행을 맡습니다.";
    case "medium":
      return "5~8명 — 소그룹으로 나눠 토의한 뒤 전체가 결과를 공유합니다.";
    case "large":
      return "9명+ — 팀을 나눠 팀별로 산출물을 만들고 상호 리뷰합니다.";
  }
}

function scaffoldingNoteText(level: LearnerLevel): string {
  switch (level) {
    case "beginner":
      return "입문 위주 — 전반부에 기초 다지기 회차를 추가하고, 매 회차 가이드 자료 슬롯을 둡니다.";
    case "mixed":
      return "혼합 — 짝 활동(동료 교수)을 삽입해 수준 차를 완충합니다.";
    case "intermediate":
      return "중급+ — 자기주도 심화 비중을 높이고 가이드는 최소화합니다.";
  }
}

/** (b) 수준 → 활동에 추가되는 스캐폴딩 문구 (없으면 빈 배열) */
function scaffoldingActivities(level: LearnerLevel): string[] {
  switch (level) {
    case "beginner":
      return ["가이드 자료 함께 읽기"];
    case "mixed":
      return ["짝 활동(동료 교수)"];
    case "intermediate":
      return [];
  }
}

/** (b) 수준 → 과제 톤 조정 */
function assignmentByLevel(level: LearnerLevel, base: string): string {
  switch (level) {
    case "beginner":
      return `${base} (가이드 자료 참고 가능)`;
    case "intermediate":
      return `${base} + 자기주도 심화 항목 1개`;
    case "mixed":
      return `${base} (짝과 상호 점검)`;
  }
}

// ── 목표 유형별 전개 회차 골격 ──

interface DevSkeletonInput {
  goalType: GoalType;
  /** 전개 회차 내 위치 (0-base) */
  posIndex: number;
  /** 전체 전개 회차 수 */
  devCount: number;
}

/** 목표 유형별 전개 회차 활동 골격 + 과제 (스캐폴딩/상호작용 전 단계) */
function developmentSkeleton({ goalType, posIndex, devCount }: DevSkeletonInput): {
  activities: string[];
  assignment: string;
  /** 위치 특화 주제 접미어 (예: 중간 크리틱/모의고사) — 없으면 undefined */
  topicOverride?: string;
} {
  const isMidpoint = devCount >= 3 && posIndex === Math.floor(devCount / 2);
  const isNearEnd = posIndex >= devCount - Math.max(1, Math.round(devCount * 0.25));

  switch (goalType) {
    case "knowledge":
      // Gagné 축약: 주의·선행지식 활성화 → 제시 → 이해 점검
      return {
        activities: ["발제(사전 배정 주제)", "핵심 쟁점 토론", "정리 퀴즈로 이해 점검"],
        assignment: "다음 회차 발제 자료 준비 + 핵심 용어 3개 정리",
      };
    case "skill":
      // Merrill 시연-적용: 시연 → 따라하기 → 독립 연습 → 피드백
      return {
        activities: ["시연(강사/발제자)", "함께 따라하기", "개별 독립 연습", "상호 피드백"],
        assignment: "이번 회차 기능을 응용한 미니 과제 1개 수행",
      };
    case "artifact":
      // PBL + 백워드: 산출 정의(앞) → 마일스톤 역산 → 중간 크리틱
      if (posIndex === 0) {
        return {
          topicOverride: "최종 산출물 정의 · 평가 기준 합의",
          activities: ["최종 산출물·성공 기준 정의(백워드)", "마일스톤 역산 배치", "역할 분담"],
          assignment: "담당 마일스톤 착수 계획 작성",
        };
      }
      if (isMidpoint) {
        return {
          topicOverride: "중간 크리틱",
          activities: ["중간 산출물 공유", "동료·운영진 크리틱", "개선 방향 반영 계획"],
          assignment: "크리틱 반영해 산출물 보완",
        };
      }
      return {
        activities: ["마일스톤 작업", "진행 상황 공유", "블로커 점검"],
        assignment: "다음 마일스톤까지 담당분 진행",
      };
    case "exam":
      // 완전학습 + 간격 반복: 개념 → 문제풀이 → 오답 복습, 후반 모의고사
      if (isNearEnd) {
        return {
          topicOverride: "모의고사 · 해설",
          activities: ["실전 모의고사", "채점·해설", "취약 유형 오답 복습"],
          assignment: "오답 노트 정리 + 암기카드로 취약 개념 반복(학회 암기카드 연계)",
        };
      }
      return {
        activities: ["핵심 개념 정리", "문제풀이 세션", "오답 복습(간격 반복)"],
        assignment: "단원 문제 세트 풀이 + 오답 암기카드 등록",
      };
    case "research":
      // 인지적 도제 + 세미나식: 문헌 발제 → 방법 워크숍 → 초안 크리틱 → 발표 리허설
      {
        const cycle = ["문헌 발제", "방법 워크숍", "초안 크리틱", "발표 리허설"];
        const stage = cycle[posIndex % cycle.length];
        return {
          topicOverride: `${stage}`,
          activities: [`${stage} 진행`, "핵심 인사이트 공유", "다음 단계 계획"],
          assignment: `${stage} 결과 정리 + 다음 세션 준비 자료 공유`,
        };
      }
  }
}

/** 논문 작성 스터디 전개 회차 골격 — 집필 블록 반복 + 섹션 마일스톤 점검 */
function thesisWritingSkeleton(posIndex: number, devCount: number): {
  activities: string[];
  assignment: string;
  topicOverride?: string;
} {
  // devCount >= 6 이면 1/3 지점에 서론·이론적 배경 마일스톤 추가
  const isEarlyMilestone = devCount >= 6 && posIndex === Math.floor(devCount / 3);
  // devCount >= 3 이면 중간 지점에 방법·결과 마일스톤
  const isMidMilestone = devCount >= 3 && posIndex === Math.floor(devCount / 2) && !isEarlyMilestone;

  if (isEarlyMilestone) {
    return {
      topicOverride: "마일스톤 점검 — 서론·이론적 배경 완성도",
      activities: [
        "완성 섹션 공유(서론·이론적 배경)",
        "동료 피드백(체크리스트 기반)",
        "미완성 블로커 점검",
        "수정 우선순위 결정",
      ],
      assignment: "마일스톤 피드백 반영 후 서론·이론적 배경 보완",
    };
  }
  if (isMidMilestone) {
    return {
      topicOverride: "마일스톤 점검 — 방법·결과 완성도",
      activities: [
        "완성 섹션 공유(방법·결과)",
        "동료 피드백(체크리스트 기반)",
        "미완성 블로커 점검",
        "수정 우선순위 결정",
      ],
      assignment: "마일스톤 피드백 반영 후 방법·결과 섹션 보완",
    };
  }
  // 일반 집필 블록: 계획→모각글→동료 크리틱→수정 계획
  return {
    activities: [
      "집필 목표 공유(각자 이번 회차 목표)",
      "라이팅 타임(모각글)",
      "동료 크리틱(체크리스트 기반)",
      "수정 계획 수립",
    ],
    assignment: "다음 회차까지 집필 분량 완성 + 체크리스트 자가 점검",
  };
}

// ── 메인 엔진 ──

/** sessionCount 범위 보정 (2~16) */
export function clampSessionCount(n: number): number {
  if (!Number.isFinite(n)) return 8;
  return Math.max(2, Math.min(16, Math.round(n)));
}

/**
 * (d) 회차 수 → 시퀀스 자동 배분:
 *  오리엔테이션(1회차) – [입문이면 기초 다지기 1회차] – 전개(골격 반복) – 통합/평가(마지막 1~2회차).
 * 각 회차에 주제 슬롯·학습목표(Bloom)·활동 구성·과제 제안 생성.
 */
export function generateCurriculum(conditions: CurriculumConditions): CurriculumDraft {
  const sessionCount = clampSessionCount(conditions.sessionCount);
  const { goalType, level, groupSize, studyKind } = conditions;

  // 통합/평가 회차 수: 7회차 이상이면 2회, 아니면 1회
  const integrationCount = sessionCount >= 7 ? 2 : 1;
  // 입문 위주면 오리엔테이션 뒤 기초 다지기 1회차 추가
  const hasFoundation = level === "beginner" && sessionCount >= 4;
  const orientationCount = 1 + (hasFoundation ? 1 : 0);

  const devCount = Math.max(0, sessionCount - orientationCount - integrationCount);

  const verbs = BLOOM_VERBS[goalType];
  const groupInteraction = interactionActivity(groupSize);
  const scaffoldExtra = scaffoldingActivities(level);

  const sessions: SessionDraft[] = [];
  let week = 1;

  // 1) 오리엔테이션
  const isThesisWriting = studyKind === "thesis_writing";
  sessions.push({
    week: week++,
    phase: "orientation",
    topic: isThesisWriting ? "오리엔테이션 · 논문 목표·일정 합의" : "오리엔테이션 · 목표 합의",
    objective: isThesisWriting
      ? "각자의 논문 목표, 완성 섹션 일정, 피드백 체크리스트 방식에 합의할 수 있다."
      : "스터디 목표와 운영 규칙에 합의하고 각자의 기대를 공유할 수 있다.",
    activities: isThesisWriting
      ? ["각자 논문 목표·현재 진도 공유", "집필 일정 합의(섹션별 마일스톤)", "피드백 체크리스트 방식 소개", groupInteraction]
      : ["목표·기대 공유", "운영 규칙·일정 합의", "아이스브레이킹", groupInteraction],
    assignment: isThesisWriting
      ? "다음 회차까지 집필 목표(섹션·분량) 정해 공유하기"
      : "다음 회차 사전 자료 훑어보기",
  });

  // 1-b) 입문 기초 다지기
  if (hasFoundation) {
    sessions.push({
      week: week++,
      phase: "orientation",
      topic: "기초 개념 · 용어 다지기",
      objective: `핵심 기초 용어와 배경을 ${verbs[0]}.`,
      activities: ["기초 개념·용어 정리", "가이드 자료 함께 읽기", groupInteraction],
      assignment: assignmentByLevel(level, "기초 용어 5개 정리"),
    });
  }

  // 2) 전개
  for (let i = 0; i < devCount; i++) {
    const skel = isThesisWriting
      ? thesisWritingSkeleton(i, devCount)
      : developmentSkeleton({ goalType, posIndex: i, devCount });
    const topic = skel.topicOverride ?? developmentTopicLabel(studyKind, i + 1);
    const verb = verbs[i % verbs.length];
    const activities = [...skel.activities, ...scaffoldExtra, groupInteraction];
    sessions.push({
      week: week++,
      phase: "development",
      topic,
      objective: `${topic} 내용을 ${verb}.`,
      activities,
      assignment: assignmentByLevel(level, skel.assignment),
    });
  }

  // 3) 통합/평가 (마지막 1~2회차)
  if (integrationCount >= 2) {
    if (isThesisWriting) {
      sessions.push({
        week: week++,
        phase: "integration",
        topic: "전체 초안 공유 · 상호 피드백",
        objective: `전체 논문 초안을 공유하고 상호 피드백을 ${verbs[verbs.length - 1]}.`,
        activities: ["전체 초안 공유", "상호 종합 피드백", "수정 우선순위 정리", groupInteraction],
        assignment: "피드백 반영 최종 수정 착수",
      });
    } else {
      sessions.push({
        week: week++,
        phase: "integration",
        topic: "산출·성과 공유",
        objective: `학습한 내용을 종합해 산출물/성과로 ${verbs[verbs.length - 1]}.`,
        activities: ["개인·팀 산출물 발표", "상호 피드백", groupInteraction],
        assignment: "발표 자료·산출물 최종본 정리",
      });
    }
  }
  sessions.push({
    week: week++,
    phase: "integration",
    topic: "전체 회고 · 목표 달성 점검",
    objective: "스터디 전체를 회고하고 목표 달성도를 점검할 수 있다.",
    activities: ["전체 회고(KPT)", "목표 달성 자가 점검", "후속 학습 계획"],
    assignment: "개인 회고 기록 + (선택) 후기 작성",
  });

  // 적용 모형 배지
  const models: DesignModel[] = [isThesisWriting ? THESIS_WRITING_MODEL : GOAL_MODELS[goalType]];
  if (level === "beginner" || level === "mixed") models.push(SCAFFOLDING_MODEL);
  if (groupSize === "medium" || groupSize === "large") models.push(COLLABORATIVE_MODEL);

  return {
    models,
    scaffoldingNote: scaffoldingNoteText(level),
    interactionNote: interactionNoteText(groupSize),
    sessions,
  };
}

/** 초안 + 조건 → 스터디 문서에 저장할 설계 메타 */
export function buildDesignMeta(
  conditions: CurriculumConditions,
  draft: CurriculumDraft,
): CurriculumDesignMeta {
  return {
    conditions: { ...conditions, sessionCount: clampSessionCount(conditions.sessionCount) },
    models: draft.models.map((m) => ({
      id: m.id,
      name: m.name,
      theory: m.theory,
      conceptNames: m.conceptNames,
    })),
    scaffoldingNote: draft.scaffoldingNote,
    interactionNote: draft.interactionNote,
    generatedAt: new Date().toISOString(),
  };
}
