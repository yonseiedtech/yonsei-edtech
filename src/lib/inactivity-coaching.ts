/**
 * inactivity-coaching — 잔디 비활성 영역 자동 코칭 판정 (순수 함수)
 *
 * 대시보드가 이미 로드하는 학습 잔디/활동 데이터(useGradActivityData 의
 * `activityByDay: Map<ymd, Map<라벨, 점수>>`)를 입력으로,
 * "최근 14일간 멈춘 연구 습관" 한 가지를 골라 가벼운 다음 한 걸음을 제안한다.
 *
 * 원칙:
 *  - 추가 fetch 없음 — 이미 상주하는 잔디 집계 데이터만 재사용.
 *  - "환류(re-engagement)": 과거 기록이 있던 습관이 최근 14일 멈췄을 때만 제안.
 *    (한 번도 안 쓴 기능을 잔소리하지 않음 → 활동이 고르게 있으면 자연히 미노출)
 *  - 최대 1개만 반환(과밀 금지). 우선순위 상위 1건.
 *  - 신입 가드(가입 60일↓)는 호출부에서 getMemberStage 로 처리한다.
 */

/** 최근성 판정 창(일). 오늘 포함 최근 14일. */
export const INACTIVITY_WINDOW_DAYS = 14;

/** 코칭 채널 한 개 — 잔디 활동 라벨(들) → 제안 문구·딥링크 */
interface CoachChannel {
  key: string;
  /** LearningStreak/useGradActivityData 의 활동 라벨(정확히 일치) */
  labels: readonly string[];
  /** 짧은 영역명 — 접근성/제목용 */
  area: string;
  /** 코칭 한 줄 문구 */
  message: string;
  /** CTA 버튼 텍스트 */
  cta: string;
  /** 딥링크 */
  href: string;
}

/** 코칭 제안 1건(순수 함수 반환) */
export interface CoachingSuggestion {
  key: string;
  area: string;
  message: string;
  cta: string;
  href: string;
}

/**
 * 우선순위 순서(위가 상위). 여러 채널이 동시에 멈췄으면 위에서부터 1건만 고른다.
 * 연구 핵심 습관(읽기·집필) 우선, 그다음 복습·진단.
 */
const CHANNELS: readonly CoachChannel[] = [
  {
    key: "reading",
    labels: ["논문 읽기 기록", "논문·아카이브 열람"],
    area: "논문 읽기",
    message: "최근 2주간 논문 읽기 기록이 없어요 — 오늘 10분 타이머로 가볍게 시작해 볼까요?",
    cta: "읽기 시작",
    href: "/mypage/research?tab=reading",
  },
  {
    key: "writing",
    labels: ["논문 작성"],
    area: "논문 집필",
    message: "최근 2주간 집필 기록이 없어요 — 오늘 한 문단만 이어써 볼까요?",
    cta: "이어쓰기",
    href: "/mypage/research?tab=writing",
  },
  {
    key: "flashcard",
    labels: ["암기카드 학습"],
    area: "개념 복습",
    message: "최근 2주간 복습 기록이 없어요 — 암기카드 5장만 가볍게 넘겨 볼까요?",
    cta: "복습하기",
    href: "/flashcards",
  },
  {
    key: "diagnosis",
    labels: ["진단평가"],
    area: "연구 준비도 진단",
    message: "최근 2주간 진단 기록이 없어요 — 지금 준비도를 다시 점검해 볼까요?",
    cta: "진단하기",
    href: "/diagnosis",
  },
] as const;

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** epoch ms → 로컬 YYYY-MM-DD */
function ymdLocal(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/**
 * 최근 14일 비활성 연구 습관 중 우선순위 1건의 코칭 제안을 고른다.
 *
 * 채널이 "멈춤(lapsed)" = 과거에 한 번이라도 기록이 있고(everActive)
 * 최근 14일 안에는 기록이 없음(!recentActive). 멈춘 채널이 없으면 null.
 *
 * @param activityByDay Map<"YYYY-MM-DD", Map<활동 라벨, 점수>> — 잔디 집계 결과
 * @param now 기준 시각(epoch ms). 기본 Date.now()
 */
export function pickInactivityCoaching(
  activityByDay: Map<string, Map<string, number>>,
  now: number = Date.now(),
): CoachingSuggestion | null {
  const todayYmd = ymdLocal(now);
  const cutoffYmd = ymdLocal(now - (INACTIVITY_WINDOW_DAYS - 1) * 24 * 60 * 60 * 1000);

  // 라벨 → 채널 key 역인덱스
  const labelToKey = new Map<string, string>();
  for (const ch of CHANNELS) {
    for (const label of ch.labels) labelToKey.set(label, ch.key);
  }

  const everActive = new Set<string>();
  const recentActive = new Set<string>();

  for (const [ymd, labels] of activityByDay) {
    if (ymd > todayYmd) continue; // 미래 데이터 방어
    const isRecent = ymd >= cutoffYmd;
    for (const label of labels.keys()) {
      const key = labelToKey.get(label);
      if (!key) continue;
      everActive.add(key);
      if (isRecent) recentActive.add(key);
    }
  }

  for (const ch of CHANNELS) {
    if (everActive.has(ch.key) && !recentActive.has(ch.key)) {
      return {
        key: ch.key,
        area: ch.area,
        message: ch.message,
        cta: ch.cta,
        href: ch.href,
      };
    }
  }
  return null;
}
