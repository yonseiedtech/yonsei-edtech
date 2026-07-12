/**
 * 교수학습 목표·과정안 조립 — 순수 함수 모듈
 *
 * 프로그램 설계·개발 셀프 가이드의 "학습목표 작성기"와 "교수학습 과정안 작성기"에서
 * 쓰는 조립 로직을 UI와 분리한 순수 함수로 모았습니다. 부수효과 없이 입력→문자열만
 * 반환하므로 단위 테스트로 검증합니다.
 *
 * - 학습목표: Mager 식 3요소(조건·수행 행동·준거)를 "~할 수 있다" 문장으로 조립.
 * - 과정안: 단계/활동/자료·유의점/시간(분) 행을 탭 구분 텍스트 표로 조립(복사용).
 */

/** Mager 식 학습목표 3요소 */
export interface LearningObjective {
  /** 안정적 식별자 (목록 렌더·삭제용) */
  id: string;
  /** 조건 — 어떤 상황·자료가 주어졌을 때 (예: "지도를 보고") */
  condition: string;
  /** 수행 행동 — 관찰 가능한 동사구 (예: "현재 위치를 찾다") */
  behavior: string;
  /** 준거 — 어느 수준까지 (예: "정확하게") */
  criterion: string;
}

/** 교수학습 과정안 한 행 */
export interface LessonPlanRow {
  /** 안정적 식별자 */
  id: string;
  /** 단계 (도입/전개/정리 또는 가네 9절차) */
  stage: string;
  /** 교수학습 활동 */
  activity: string;
  /** 자료·유의점 */
  materials: string;
  /** 시간(분) — 문자열 입력, 합계 계산 시 정수 파싱 */
  minutes: string;
}

const HANGUL_BASE = 0xac00;
const HANGUL_LAST = 0xd7a3;
/** 종성(받침) 종류 수 */
const JONGSEONG_COUNT = 28;
/** 종성 인덱스: ㄹ */
const JONGSEONG_RIEUL = 8;

/**
 * 동사구를 "~ㄹ/을 수 있다" 형태로 변환한다.
 * 규칙적 활용만 처리한다(ㅂ·ㄷ 불규칙 등은 입력 그대로 존중).
 * 이미 "…수 있다"로 끝나면 그대로 반환한다.
 */
export function toCanDoForm(behavior: string): string {
  const trimmed = behavior.trim();
  if (!trimmed) return "";
  if (/수\s*있다$/.test(trimmed)) return trimmed;

  let stem = trimmed;
  if (stem.endsWith("다")) stem = stem.slice(0, -1);
  if (!stem) return trimmed;

  const lastCode = stem.charCodeAt(stem.length - 1);
  if (lastCode >= HANGUL_BASE && lastCode <= HANGUL_LAST) {
    const jong = (lastCode - HANGUL_BASE) % JONGSEONG_COUNT;
    if (jong === 0) {
      // 받침 없음 → 종성 ㄹ 추가 후 " 수 있다" (예: 하 → 할 수 있다)
      const withRieul = String.fromCharCode(lastCode + JONGSEONG_RIEUL);
      return stem.slice(0, -1) + withRieul + " 수 있다";
    }
    if (jong === JONGSEONG_RIEUL) {
      // ㄹ 받침 → 그대로 (예: 만들 → 만들 수 있다)
      return stem + " 수 있다";
    }
    // 그 밖의 받침 → "을 수 있다" (예: 찾 → 찾을 수 있다)
    return stem + "을 수 있다";
  }
  // 한글 음절이 아니면 보수적 폴백
  return stem + "할 수 있다";
}

/**
 * 3요소를 "[조건], [준거] [행동]할 수 있다." 문장으로 조립한다.
 * 수행 행동이 비면 빈 문자열을 반환한다(문장이 성립하지 않으므로).
 */
export function buildObjectiveSentence(objective: LearningObjective): string {
  const behavior = objective.behavior.trim();
  if (!behavior) return "";

  // 행동을 "목적어구 + 서술 동사"로 분리해 준거(부사)를 동사 바로 앞에 둔다.
  const tokens = behavior.split(/\s+/);
  const verb = tokens.pop() ?? "";
  const head = tokens.join(" ");
  const canDo = toCanDoForm(verb);
  if (!canDo) return "";

  const cond = objective.condition.trim().replace(/[,，]\s*$/, "");
  const crit = objective.criterion.trim();

  const segments = [
    cond ? `${cond},` : "",
    head,
    crit,
    canDo,
  ].filter((seg) => seg.length > 0);

  let sentence = segments.join(" ").trim();
  if (!/[.。]$/.test(sentence)) sentence += ".";
  return sentence;
}

/** 과정안 텍스트 조립 시 함께 얹을 메타 정보 */
export interface LessonPlanMeta {
  /** 수업 주제 */
  title?: string;
  /** 대표 학습목표 문장 */
  objective?: string;
}

/**
 * 과정안 행 배열을 탭 구분 표 텍스트로 조립한다(복사·붙여넣기용).
 * 빈 칸은 "-"로 채우고, 시간(분) 합계 행을 덧붙인다.
 */
export function buildLessonPlanText(
  rows: LessonPlanRow[],
  meta: LessonPlanMeta = {},
): string {
  const lines: string[] = [];

  const title = meta.title?.trim();
  const objective = meta.objective?.trim();
  if (title) lines.push(`■ 주제: ${title}`);
  if (objective) lines.push(`■ 학습목표: ${objective}`);
  if (lines.length > 0) lines.push("");

  lines.push(["단계", "교수학습 활동", "자료·유의점", "시간(분)"].join("\t"));

  for (const row of rows) {
    const cells = [row.stage, row.activity, row.materials, row.minutes].map(
      (c) => (c ?? "").trim() || "-",
    );
    lines.push(cells.join("\t"));
  }

  const total = rows.reduce((sum, r) => {
    const n = Number.parseInt(r.minutes, 10);
    return sum + (Number.isFinite(n) ? n : 0);
  }, 0);
  if (total > 0) lines.push(["", "", "합계", String(total)].join("\t"));

  return lines.join("\n");
}

/** 도입-전개-정리 기본 3단계 (과정안 초기 프리필용) */
export const BASIC_LESSON_STAGES: { stage: string; activity: string }[] = [
  { stage: "도입", activity: "동기 유발·전시 학습 확인·학습목표 제시" },
  { stage: "전개", activity: "내용 제시·시범·활동·개별/모둠 연습" },
  { stage: "정리", activity: "핵심 정리·형성평가·차시 예고" },
];
