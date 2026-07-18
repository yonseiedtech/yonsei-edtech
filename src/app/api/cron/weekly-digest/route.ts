import { NextRequest } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { verifyCronAuth } from "@/lib/cron-auth";
import { fanOutNotificationAdmin } from "@/lib/notifications-bridge";
import { todayYmdKst } from "@/lib/dday";
import {
  WEEKLY_GOAL_PRESETS,
  weekDays,
  judgeWeeklyGoal,
} from "@/lib/weekly-goal";
import type { WeeklyGoalChannel } from "@/types/weekly-goal";

/**
 * 주간 다이제스트 이메일 cron — Sprint 54
 *
 * 매주 월요일 09:00 KST (= UTC 0:00 일요일/월요일).
 * Vercel Hobby 1일 1회 한도 호환을 위해 cron 은 매일 돌리고,
 * 핸들러 안에서 "오늘이 KST 월요일"인지 검사 후 발송.
 *
 * 콘텐츠
 *  - 신규/예정 세미나 5건
 *  - 인기 게시글 3건 (최근 14일 createdAt 기준)
 *  - 다가오는 활동 3건 (최근 30일 시작)
 *
 * 수신 대상: approved=true 회원 중 notificationPrefs.weeklyDigest !== false
 * 중복 방지: email_logs 의 type=weekly_digest + targetId=<weekStart> 1건만
 */

interface SeminarLite {
  id: string;
  title: string;
  date: string;
  time?: string;
  location?: string;
}

interface PostLite {
  id: string;
  title: string;
  category?: string;
  createdAt: string;
}

interface ActivityLite {
  id: string;
  type: string;
  title: string;
  date?: string;
}

interface QuestionLite {
  id: string;
  boardId: string;
  body: string;
  createdAt: string;
}

/**
 * 수신자별 "나의 한 주" 개인 요약 (R2 — 개인화 주간 다이제스트).
 * 데이터 없는 항목은 호출부에서 줄을 생략(graceful) 한다.
 */
interface PersonalDigest {
  /** 지난 7일(KST) 잔디 활동이 1건 이상 있던 distinct 일수 */
  activeDays: number;
  /** 지난 7일 연구/학습 타이머 누적 분 (study_sessions durationMinutes 합) */
  timerMinutes: number;
  /** 오늘(KST) 기준 due 인 암기카드 수 (dueAt <= todayKST) */
  dueCards: number;
  /** 진단 준비도 변화 — 최신 - 직전 회차 (없으면 null). { paper, analysis } */
  readinessDelta: { paper: number; analysis: number } | null;
  /** C-2(2026-07-04): 안 읽은 인앱 알림 수 — 읽음률 0% 대응, 알림함 진입 유도 */
  unreadNotifications: number;
  /** 미완료 온보딩 항목 라벨 (서버에서 알 수 있는 프로필 기반 항목만) */
  onboardingTodo: string[];
}

/**
 * 수신자별 "이번 주 학습 제안" 재유입 블록 (M3 — service-ux-gap-plan 2026-07-17).
 * 신규 학습 자산(진단·연구 설계·이론 가계도)으로의 재유입을 유도한다.
 * 데이터 없는 항목은 호출부에서 줄을 생략(graceful) 한다.
 *
 * 참고: 복습 due 암기카드는 이미 "나의 한 주" 블록(PersonalDigest.dueCards)에서
 * 노출되므로 중복 방지를 위해 이 블록에는 포함하지 않는다.
 */
interface LearningSuggestion {
  /** 진단 상태 — never: 미응시 / stale: 마지막 진단 30일+ 경과 / null: 최근 응시 */
  diagnosis: "never" | "stale" | null;
  /** research_designs 문서 없음 → 연구 설계 시작 제안 */
  needsResearchDesign: boolean;
  /** M1(v5): 지난주 주간 목표 결과 — 목표 설정자만. 없으면 undefined(줄 생략) */
  lastGoal?: LastGoalResult;
}

/** M1(v5): 지난주 주간 목표 달성 요약 (설정자만) */
interface LastGoalResult {
  area: string;
  achieved: boolean;
  progress: number;
  target: number;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** YYYY-MM-DD(KST) 문자열을 일 단위로 가감 — 지난주 경계 계산용 */
function shiftYmd(ymd: string, deltaDays: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + deltaDays);
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "UTC",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(dt);
}

/** ISO(또는 Date) → KST "YYYY-MM-DD" (없거나 파싱 실패 시 null) */
function isoToYmdKst(iso: string | undefined | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return todayYmdKst(d);
}

function isMondayKst(now: Date = new Date()): boolean {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    weekday: "short",
  });
  return fmt.format(now) === "Mon";
}

async function loadUpcomingSeminars(db: FirebaseFirestore.Firestore, todayYmd: string): Promise<SeminarLite[]> {
  const snap = await db.collection("seminars").where("date", ">=", todayYmd).limit(20).get();
  return snap.docs
    .map((d) => {
      const data = d.data() as { title?: string; date?: string; time?: string; location?: string };
      return {
        id: d.id,
        title: data.title ?? "",
        date: data.date ?? "",
        time: data.time,
        location: data.location,
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 5);
}

async function loadPopularPosts(db: FirebaseFirestore.Firestore): Promise<PostLite[]> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 14);
  const cutoffIso = cutoff.toISOString();
  const snap = await db.collection("posts").where("createdAt", ">=", cutoffIso).limit(50).get();
  return snap.docs
    .map((d) => {
      const data = d.data() as { title?: string; category?: string; createdAt?: string; viewCount?: number };
      return {
        id: d.id,
        title: data.title ?? "",
        category: data.category,
        createdAt: data.createdAt ?? "",
        _view: data.viewCount ?? 0,
      };
    })
    .sort((a, b) => b._view - a._view || b.createdAt.localeCompare(a.createdAt))
    .slice(0, 3);
}

async function loadUpcomingActivities(db: FirebaseFirestore.Firestore, todayYmd: string): Promise<ActivityLite[]> {
  const snap = await db.collection("activities").where("date", ">=", todayYmd).limit(20).get();
  return snap.docs
    .map((d) => {
      const data = d.data() as { type?: string; title?: string; date?: string };
      return {
        id: d.id,
        type: data.type ?? "study",
        title: data.title ?? "",
        date: data.date,
      };
    })
    .sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""))
    .slice(0, 3);
}

/** 최근 14일 내 작성된 미답변(답변 0건·미해결) 소통 보드 질문 — Sprint UX-1 */
async function loadUnansweredQuestions(db: FirebaseFirestore.Firestore): Promise<QuestionLite[]> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 14);
  const cutoffIso = cutoff.toISOString();
  const snap = await db.collection("comm_questions").where("createdAt", ">=", cutoffIso).limit(50).get();
  return snap.docs
    .map((d) => {
      const data = d.data() as { boardId?: string; body?: string; createdAt?: string; answerCount?: number; resolved?: boolean };
      return {
        id: d.id,
        boardId: data.boardId ?? "",
        body: data.body ?? "",
        createdAt: data.createdAt ?? "",
        _open: (data.answerCount ?? 0) === 0 && data.resolved !== true,
      };
    })
    .filter((q) => q._open && q.boardId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 3);
}

/* ────────────────────────── 개인화 집계 (R2 — 나의 한 주) ────────────────────────── */

/**
 * 수신자별 "나의 한 주" 개인 요약을 한 번의 collection-wide 조회로 집계한다.
 * (회원 수 × 컬렉션 N 의 per-user 조회를 피하고, flashcard-review-reminder cron 과
 *  동일하게 전수 조회 후 userId 로 그룹핑한다.)
 *
 * 읽기 전용 — 어떤 컬렉션도 수정하지 않는다.
 *
 * @param userIds 발송 후보 회원 id (그 외 회원 데이터는 결과에 담지 않음)
 * @param usersById 회원 doc (온보딩 프로필 항목 판정용)
 * @param todayYmd 오늘(KST) YYYY-MM-DD
 */
async function loadPersonalDigests(
  db: FirebaseFirestore.Firestore,
  userIds: string[],
  usersById: Map<string, { bio?: string; researchInterests?: string[]; interestKeywords?: string[] }>,
  todayYmd: string,
): Promise<{
  personal: Map<string, PersonalDigest>;
  /** M3 재유입 제안 — 수신자별 학습 자산 갭 */
  suggestions: Map<string, LearningSuggestion>;
  /** Phase 3 동료 하이라이트용 원시 집계 (지난 7일) */
  timerMinByUser: Map<string, number>;
  activeDaysByUser: Map<string, Set<string>>;
}> {
  const wanted = new Set(userIds);
  const weekStart = shiftYmd(todayYmd, -7); // 지난 7일 경계 (KST YMD)
  const weekStartIso = `${weekStart}T00:00:00.000Z`; // ISO 비교용 하한(보수적으로 넓게)

  // 결과 누적기
  const activeDaysByUser = new Map<string, Set<string>>();
  const timerMinByUser = new Map<string, number>();
  const dueCardsByUser = new Map<string, number>();
  // 진단 결과는 createdAt desc 로 최신 2건만 필요 → userId 별로 모았다가 정렬
  const diagByUser = new Map<string, { createdAt: string; paper: number; analysis: number }[]>();

  function markActiveDay(userId: string, ymd: string | null) {
    if (!ymd || !wanted.has(userId)) return;
    if (ymd < weekStart) return; // 지난 7일 밖 제외
    let set = activeDaysByUser.get(userId);
    if (!set) {
      set = new Set<string>();
      activeDaysByUser.set(userId, set);
    }
    set.add(ymd);
  }

  // ── (1) 잔디 활동일 + 연구 타이머 분: study_sessions (지난주) ──
  // 종료된 세션만, 30분+는 잔디 활동일로, durationMinutes 는 타이머 누적으로.
  const studySnap = await db
    .collection("study_sessions")
    .where("endTime", ">=", weekStartIso)
    .get();
  for (const doc of studySnap.docs) {
    const s = doc.data() as { userId?: string; endTime?: string; durationMinutes?: number };
    if (!s.userId || !wanted.has(s.userId)) continue;
    const ymd = isoToYmdKst(s.endTime);
    if (!ymd || ymd < weekStart) continue;
    const mins = s.durationMinutes ?? 0;
    timerMinByUser.set(s.userId, (timerMinByUser.get(s.userId) ?? 0) + mins);
    if (mins >= 30) markActiveDay(s.userId, ymd);
  }

  // ── (2) 잔디 활동일 보강: 논문 읽기 기록(readAt) / 진단평가(createdAt) ──
  // readAt 은 이미 KST YYYY-MM-DD → 지난주 범위 필터.
  const readSnap = await db
    .collection("paper_reading_logs")
    .where("readAt", ">=", weekStart)
    .get();
  for (const doc of readSnap.docs) {
    const r = doc.data() as { userId?: string; readAt?: string };
    if (!r.userId || !wanted.has(r.userId) || !r.readAt) continue;
    markActiveDay(r.userId, r.readAt);
  }

  // ── (3) due 암기카드 수 (dueAt <= todayKST), 진단 준비도 변화 ──
  const dueSnap = await db
    .collection("flashcards")
    .where("dueAt", "<=", todayYmd)
    .get();
  for (const doc of dueSnap.docs) {
    const f = doc.data() as { userId?: string };
    if (!f.userId || !wanted.has(f.userId)) continue;
    dueCardsByUser.set(f.userId, (dueCardsByUser.get(f.userId) ?? 0) + 1);
  }

  // 진단 결과 — 준비도 변화(최신-직전). createdAt 으로 정렬해 상위 2건 사용.
  const diagSnap = await db.collection("diagnostic_results").get();
  for (const doc of diagSnap.docs) {
    const r = doc.data() as {
      userId?: string;
      createdAt?: string;
      paperReadiness?: number;
      analysisReadiness?: number;
    };
    if (!r.userId || !wanted.has(r.userId)) continue;
    let arr = diagByUser.get(r.userId);
    if (!arr) {
      arr = [];
      diagByUser.set(r.userId, arr);
    }
    arr.push({
      createdAt: r.createdAt ?? "",
      paper: typeof r.paperReadiness === "number" ? r.paperReadiness : 0,
      analysis: typeof r.analysisReadiness === "number" ? r.analysisReadiness : 0,
    });
    // 진단평가 응시일도 지난주면 잔디 활동일로 반영
    const ymd = isoToYmdKst(r.createdAt);
    if (ymd && ymd >= weekStart) markActiveDay(r.userId, ymd);
  }

  // C-2: 미읽음 알림 집계 (단일 쿼리 → userId 버킷)
  const unreadByUser = new Map<string, number>();
  try {
    const unreadSnap = await db.collection("notifications").where("read", "==", false).limit(5000).get();
    for (const doc of unreadSnap.docs) {
      const uid = (doc.data() as { userId?: string }).userId;
      if (uid && wanted.has(uid)) unreadByUser.set(uid, (unreadByUser.get(uid) ?? 0) + 1);
    }
  } catch {
    /* 집계 실패는 다이제스트를 막지 않음 */
  }

  // ── M3: 연구 설계 착수 여부 (research_designs — 사용자당 1건, 단일 전수 스캔) ──
  // 실패해도 재유입 제안만 건너뛰고(needsResearchDesign=false) 나머지는 계속.
  const hasDesignByUser = new Set<string>();
  try {
    const designSnap = await db.collection("research_designs").get();
    for (const doc of designSnap.docs) {
      const uid = (doc.data() as { userId?: string }).userId;
      if (uid && wanted.has(uid)) hasDesignByUser.add(uid);
    }
  } catch {
    /* 스캔 실패 시 오탐 방지를 위해 설계 제안을 띄우지 않음 */
  }

  // 진단 30일+ 경과 판정 기준일 (KST YMD)
  const diagStaleCutoff = shiftYmd(todayYmd, -30);

  // ── 회원별 결과 조립 ──
  const out = new Map<string, PersonalDigest>();
  const suggestions = new Map<string, LearningSuggestion>();
  for (const userId of userIds) {
    // 진단 준비도 변화 (최신 - 직전)
    let readinessDelta: PersonalDigest["readinessDelta"] = null;
    const diag = diagByUser.get(userId);
    if (diag && diag.length >= 2) {
      const sorted = diag.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      const latest = sorted[0];
      const prev = sorted[1];
      readinessDelta = {
        paper: latest.paper - prev.paper,
        analysis: latest.analysis - prev.analysis,
      };
    }

    // 미완료 온보딩 (서버가 알 수 있는 프로필 기반 항목만 — visited.* 는 localStorage 라 제외)
    const u = usersById.get(userId);
    const onboardingTodo: string[] = [];
    if (u) {
      const hasBio = Boolean(u.bio && u.bio.trim().length > 0);
      if (!hasBio) onboardingTodo.push("자기소개 작성");
      const interests = Array.isArray(u.researchInterests) ? u.researchInterests : [];
      const kw = Array.isArray(u.interestKeywords) ? u.interestKeywords : [];
      if (interests.length + kw.length < 1) onboardingTodo.push("관심 분야 선택");
    }

    out.set(userId, {
      activeDays: activeDaysByUser.get(userId)?.size ?? 0,
      timerMinutes: timerMinByUser.get(userId) ?? 0,
      dueCards: dueCardsByUser.get(userId) ?? 0,
      readinessDelta,
      unreadNotifications: unreadByUser.get(userId) ?? 0,
      onboardingTodo,
    });

    // M3: 재유입 제안 — 진단 상태 + 연구 설계 착수 여부
    let diagnosis: LearningSuggestion["diagnosis"] = null;
    if (!diag || diag.length === 0) {
      diagnosis = "never";
    } else {
      const latestYmd = diag
        .map((d) => isoToYmdKst(d.createdAt))
        .filter((y): y is string => y !== null)
        .sort()
        .pop();
      if (!latestYmd || latestYmd < diagStaleCutoff) diagnosis = "stale";
    }
    suggestions.set(userId, {
      diagnosis,
      needsResearchDesign: !hasDesignByUser.has(userId),
    });
  }
  return { personal: out, suggestions, timerMinByUser, activeDaysByUser };
}

/**
 * Phase 3 — 동료 하이라이트 (공통 블록).
 * 지난 7일 타이머 몰입 1~3위 + 활동일 1~3위. showInLeaderboard=false 회원은 제외
 * (리더보드와 동일한 공개 정책). 표시할 사람이 없으면 빈 문자열.
 */
function buildPeerHighlightHtml(
  timerMinByUser: Map<string, number>,
  activeDaysByUser: Map<string, Set<string>>,
  usersById: Map<string, { name?: string; showInLeaderboard?: boolean }>,
): string {
  const visible = (id: string) => {
    const u = usersById.get(id);
    return !!u?.name && u.showInLeaderboard !== false;
  };
  const fmtMin = (min: number) => {
    const h = Math.floor(min / 60);
    const m = min % 60;
    return h > 0 ? `${h}시간 ${m}분` : `${m}분`;
  };

  const timerTop = [...timerMinByUser.entries()]
    .filter(([id, min]) => min >= 30 && visible(id))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);
  const daysTop = [...activeDaysByUser.entries()]
    .map(([id, set]) => [id, set.size] as const)
    .filter(([id, days]) => days >= 2 && visible(id))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  const lines: string[] = [];
  if (timerTop.length > 0) {
    const names = timerTop
      .map(([id, min]) => `<b>${escapeHtml(usersById.get(id)?.name ?? "")}</b> ${escapeHtml(fmtMin(min))}`)
      .join(" · ");
    lines.push(`<li>⏱️ 이번 주 몰입 — ${names}</li>`);
  }
  if (daysTop.length > 0) {
    const names = daysTop
      .map(([id, days]) => `<b>${escapeHtml(usersById.get(id)?.name ?? "")}</b> ${days}일`)
      .join(" · ");
    lines.push(`<li>🌱 꾸준한 활동 — ${names}</li>`);
  }
  if (lines.length === 0) return "";

  const base = "https://yonsei-edtech.vercel.app";
  return `
      <h3 style="color: #003876; border-left: 4px solid #003876; padding-left: 8px; margin: 24px 0 8px;">👏 동료 하이라이트</h3>
      <ul style="line-height: 1.9; padding-left: 20px;">${lines.join("")}
        <li style="color:#888;font-size:13px"><a href="${base}/leaderboard" style="color:#003876;text-decoration:none">리더보드에서 내 순위 보기 →</a></li>
      </ul>
`;
}

/* ────────────────── M1(v5): 지난주 주간 목표 달성 집계 ────────────────── */

/** Firestore Admin Timestamp | ISO 문자열 | epoch → KST YYYY-MM-DD (실패 시 null) */
function anyToYmdKst(v: unknown): string | null {
  if (!v) return null;
  if (typeof v === "string") return isoToYmdKst(v);
  if (typeof v === "object" && v !== null) {
    const o = v as { toDate?: () => Date; _seconds?: number; seconds?: number };
    if (typeof o.toDate === "function") return todayYmdKst(o.toDate());
    const secs = typeof o._seconds === "number" ? o._seconds : o.seconds;
    if (typeof secs === "number") return todayYmdKst(new Date(secs * 1000));
  }
  return null;
}

/**
 * 지난주(weekKey === weekStart) 목표를 세운 회원의 달성 여부를 잔디 원천에서 판정한다.
 * 목표가 하나도 없으면 추가 조회 없이 빈 Map 반환(비용 0). 필요한 채널만 집계한다.
 *
 * 달성 판정은 "해당 주 채널 활동 일수" — 클라이언트 카드(countGoalDaysInWeek)와 동일 정의.
 * 읽기 전용. 실패는 조용히 건너뛴다(다이제스트 차단 금지).
 *
 * @param weekStart 지난주 월요일 KST YMD (= shiftYmd(todayYmd,-7))
 */
async function loadLastWeekGoalResults(
  db: FirebaseFirestore.Firestore,
  userIds: string[],
  weekStart: string,
): Promise<Map<string, LastGoalResult>> {
  const out = new Map<string, LastGoalResult>();
  const wanted = new Set(userIds);

  const goals: { userId: string; channel: WeeklyGoalChannel; target: number }[] = [];
  try {
    const snap = await db.collection("weekly_goals").where("weekKey", "==", weekStart).get();
    for (const doc of snap.docs) {
      const g = doc.data() as { userId?: string; channel?: string; target?: number };
      if (!g.userId || !wanted.has(g.userId)) continue;
      if (g.channel !== "reading" && g.channel !== "flashcard" && g.channel !== "writing") continue;
      goals.push({ userId: g.userId, channel: g.channel, target: g.target ?? 1 });
    }
  } catch {
    return out;
  }
  if (goals.length === 0) return out;

  const weekDaySet = new Set(weekDays(weekStart)); // 지난주 7일
  const need = new Set(goals.map((g) => g.channel));
  const daysByUser: Record<WeeklyGoalChannel, Map<string, Set<string>>> = {
    reading: new Map(),
    flashcard: new Map(),
    writing: new Map(),
  };
  const bump = (channel: WeeklyGoalChannel, uid: string | undefined, ymd: string | null) => {
    if (!uid || !wanted.has(uid) || !ymd || !weekDaySet.has(ymd)) return;
    let s = daysByUser[channel].get(uid);
    if (!s) {
      s = new Set<string>();
      daysByUser[channel].set(uid, s);
    }
    s.add(ymd);
  };

  // reading: paper_reading_logs.readAt(문자열 YMD) — 지난주 범위 조회
  if (need.has("reading")) {
    try {
      const snap = await db.collection("paper_reading_logs").where("readAt", ">=", weekStart).get();
      for (const doc of snap.docs) {
        const r = doc.data() as { userId?: string; readAt?: string };
        bump("reading", r.userId, r.readAt ?? null);
      }
    } catch {
      /* graceful */
    }
  }
  // flashcard: streak_events.ymd(문자열) + type flashcard-study — 지난주 범위 조회
  if (need.has("flashcard")) {
    try {
      const snap = await db.collection("streak_events").where("ymd", ">=", weekStart).get();
      for (const doc of snap.docs) {
        const e = doc.data() as { userId?: string; type?: string; ymd?: string };
        if (e.type !== "flashcard-study") continue;
        bump("flashcard", e.userId, e.ymd ?? null);
      }
    } catch {
      /* graceful */
    }
  }
  // writing: writing_paper_history.createdAt(Timestamp/문자열) — 전수 스캔 후 변환(타입 불일치 방어)
  if (need.has("writing")) {
    try {
      const snap = await db.collection("writing_paper_history").get();
      for (const doc of snap.docs) {
        const h = doc.data() as { userId?: string; createdAt?: unknown };
        bump("writing", h.userId, anyToYmdKst(h.createdAt));
      }
    } catch {
      /* graceful */
    }
  }

  for (const g of goals) {
    const count = daysByUser[g.channel].get(g.userId)?.size ?? 0;
    const j = judgeWeeklyGoal(g.target, count);
    out.set(g.userId, {
      area: WEEKLY_GOAL_PRESETS[g.channel].area,
      achieved: j.achieved,
      progress: j.progress,
      target: j.target,
    });
  }
  return out;
}

/** 개인 요약에 표시할 내용이 하나라도 있는지 (없으면 개인 블록 자체 생략) */
function hasPersonalContent(p: PersonalDigest): boolean {
  return (
    p.activeDays > 0 ||
    p.timerMinutes > 0 ||
    p.dueCards > 0 ||
    p.readinessDelta !== null ||
    p.onboardingTodo.length > 0 ||
    // QA-v3: 미읽음 알림만 있는 회원(=이탈 위험군, C-2 타깃)이 generic 묶음으로 빠지던 문제
    p.unreadNotifications > 0
  );
}

/** "나의 한 주" 개인 블록 HTML (내용 없는 줄은 생략) */
function buildPersonalHtml(p: PersonalDigest): string {
  const base = "https://yonsei-edtech.vercel.app";
  const lines: string[] = [];

  if (p.activeDays > 0) {
    lines.push(`<li>🌱 지난 7일 활동한 날 <b>${p.activeDays}일</b></li>`);
  }
  if (p.timerMinutes > 0) {
    const h = Math.floor(p.timerMinutes / 60);
    const m = p.timerMinutes % 60;
    const label = h > 0 ? `${h}시간 ${m}분` : `${m}분`;
    lines.push(`<li>⏱️ 연구·학습 타이머 누적 <b>${escapeHtml(label)}</b></li>`);
  }
  if (p.dueCards > 0) {
    lines.push(
      `<li>🃏 오늘 복습할 암기카드 <b>${p.dueCards}장</b> <a href="${base}/flashcards" style="color:#003876;text-decoration:none;font-size:13px">복습하기 →</a></li>`,
    );
  }
  if (p.unreadNotifications > 0) {
    lines.push(
      `<li>🔔 안 읽은 알림 <b>${p.unreadNotifications}건</b> <a href="${base}/mypage/notifications" style="color:#003876;text-decoration:none;font-size:13px">확인하기 →</a></li>`,
    );
  }
  if (p.readinessDelta) {
    const fmtDelta = (n: number) => (n > 0 ? `▲${n}` : n < 0 ? `▼${Math.abs(n)}` : "변화 없음");
    const { paper, analysis } = p.readinessDelta;
    lines.push(
      `<li>🧭 진단 준비도 변화 — 논문작성 <b>${fmtDelta(paper)}</b> · 연구분석 <b>${fmtDelta(analysis)}</b></li>`,
    );
  }
  if (p.onboardingTodo.length > 0) {
    lines.push(
      `<li>📌 시작하기 미완료: ${p.onboardingTodo.map((t) => escapeHtml(t)).join(" · ")} <a href="${base}/mypage/edit" style="color:#003876;text-decoration:none;font-size:13px">완성하기 →</a></li>`,
    );
  }

  if (lines.length === 0) return "";

  return `
      <h3 style="color: #003876; border-left: 4px solid #003876; padding-left: 8px; margin: 24px 0 8px;">🙋 나의 한 주</h3>
      <ul style="line-height: 1.9; padding-left: 20px;">${lines.join("")}</ul>
`;
}

/** 재유입 제안(진단·연구 설계·지난주 목표)에 표시할 내용이 하나라도 있는지 */
function hasSuggestionContent(s: LearningSuggestion): boolean {
  return s.diagnosis !== null || s.needsResearchDesign || s.lastGoal !== undefined;
}

/**
 * M3 — "이번 주 학습 제안" 재유입 블록 HTML.
 * 해당되는 항목 2~3개(진단·연구 설계)를 골라 CTA 로 노출하고,
 * 항상 이론 가계도 발견 1줄을 가볍게 덧붙인다. 내용 없으면 빈 문자열.
 */
function buildSuggestionHtml(s: LearningSuggestion): string {
  if (!hasSuggestionContent(s)) return "";
  const base = "https://yonsei-edtech.vercel.app";
  const lines: string[] = [];

  // M1(v5): 지난주 목표 달성 회고 — 목표 설정자만. 맨 위에 노출.
  if (s.lastGoal) {
    const g = s.lastGoal;
    const status = g.achieved
      ? `달성 🎉 (${g.progress}/${g.target}일)`
      : `아쉽게 미달 (${g.progress}/${g.target}일)`;
    lines.push(
      `<li>🎯 지난주 ${escapeHtml(g.area)} 목표 — <b>${status}</b> <a href="${base}/dashboard" style="color:#003876;text-decoration:none;font-size:13px">이번 주 목표 세우기 →</a></li>`,
    );
  }
  if (s.diagnosis === "never") {
    lines.push(
      `<li>🧭 아직 진단을 안 하셨네요 — 논문·연구 준비도를 3분 만에 확인하세요 <a href="${base}/diagnosis" style="color:#003876;text-decoration:none;font-size:13px">진단 시작 →</a></li>`,
    );
  } else if (s.diagnosis === "stale") {
    lines.push(
      `<li>🧭 마지막 진단 후 한 달이 지났어요 — 그동안의 성장을 다시 진단해보세요 <a href="${base}/diagnosis" style="color:#003876;text-decoration:none;font-size:13px">재진단 →</a></li>`,
    );
  }
  if (s.needsResearchDesign) {
    lines.push(
      `<li>📐 연구 설계를 아직 시작하지 않으셨어요 — 8단계 가이드로 연구방법을 잡아보세요 <a href="${base}/mypage/research" style="color:#003876;text-decoration:none;font-size:13px">설계 시작 →</a></li>`,
    );
  }
  // 가벼운 발견 1줄 — 이론 가계도(아카이브 신규 자산) 둘러보기
  lines.push(
    `<li>🌳 이론 가계도에서 교육공학 이론의 계보를 한눈에 <a href="${base}/archive/theory-map" style="color:#003876;text-decoration:none;font-size:13px">둘러보기 →</a></li>`,
  );

  return `
      <h3 style="color: #003876; border-left: 4px solid #003876; padding-left: 8px; margin: 24px 0 8px;">🎓 이번 주 학습 제안</h3>
      <ul style="line-height: 1.9; padding-left: 20px;">${lines.join("")}</ul>
`;
}

function buildHtml({ seminars, posts, activities, questions, personal, suggestion, peersHtml }: { seminars: SeminarLite[]; posts: PostLite[]; activities: ActivityLite[]; questions: QuestionLite[]; personal?: PersonalDigest; suggestion?: LearningSuggestion; peersHtml?: string }): string {
  const base = "https://yonsei-edtech.vercel.app";
  const seminarHtml = seminars.length === 0
    ? "<li style=\"color:#888\">예정된 세미나가 없습니다.</li>"
    : seminars.map((s) => `<li><a href="${base}/seminars/${s.id}" style="color:#003876;text-decoration:none">${escapeHtml(s.title)}</a> <span style="color:#888;font-size:13px">${escapeHtml(s.date)}${s.time ? ` ${escapeHtml(s.time)}` : ""}</span></li>`).join("");
  const postHtml = posts.length === 0
    ? "<li style=\"color:#888\">최근 인기 게시글이 없습니다.</li>"
    : posts.map((p) => `<li><a href="${base}/board/${p.id}" style="color:#003876;text-decoration:none">${escapeHtml(p.title)}</a></li>`).join("");
  const activityRoute = (t: string) => t === "project" ? "projects" : t === "external" ? "external" : "studies";
  const actHtml = activities.length === 0
    ? "<li style=\"color:#888\">예정된 활동이 없습니다.</li>"
    : activities.map((a) => `<li><a href="${base}/activities/${activityRoute(a.type)}/${a.id}" style="color:#003876;text-decoration:none">${escapeHtml(a.title)}</a> <span style="color:#888;font-size:13px">${escapeHtml(a.date ?? "")}</span></li>`).join("");

  return `
    <div style="font-family: 'Pretendard', sans-serif; max-width: 600px; margin: 0 auto; color: #1a1a1a;">
      <h2 style="color: #003876; margin: 0 0 8px;">연세교육공학회 주간 다이제스트</h2>
      <p style="color: #666; margin: 0 0 24px;">이번 주 학회 활동을 한눈에 확인하세요.</p>
${personal ? buildPersonalHtml(personal) : ""}
${suggestion ? buildSuggestionHtml(suggestion) : ""}
${peersHtml ?? ""}
      <h3 style="color: #003876; border-left: 4px solid #003876; padding-left: 8px; margin: 24px 0 8px;">📅 다가오는 세미나</h3>
      <ul style="line-height: 1.9; padding-left: 20px;">${seminarHtml}</ul>

      <h3 style="color: #003876; border-left: 4px solid #003876; padding-left: 8px; margin: 24px 0 8px;">📝 최근 인기 게시글</h3>
      <ul style="line-height: 1.9; padding-left: 20px;">${postHtml}</ul>

      <h3 style="color: #003876; border-left: 4px solid #003876; padding-left: 8px; margin: 24px 0 8px;">🎯 다가오는 활동</h3>
      <ul style="line-height: 1.9; padding-left: 20px;">${actHtml}</ul>
${questions.length > 0 ? `
      <h3 style="color: #003876; border-left: 4px solid #003876; padding-left: 8px; margin: 24px 0 8px;">💬 답을 기다리는 질문</h3>
      <ul style="line-height: 1.9; padding-left: 20px;">${questions.map((q) => `<li><a href="${base}/boards/${q.boardId}" style="color:#003876;text-decoration:none">${escapeHtml(q.body.length > 60 ? `${q.body.slice(0, 60)}…` : q.body)}</a></li>`).join("")}</ul>
` : ""}
      <p style="margin-top: 32px;"><a href="${base}/dashboard" style="display: inline-block; padding: 10px 20px; background: #003876; color: white; text-decoration: none; border-radius: 6px;">대시보드 가기</a></p>

      <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0 16px;" />
      <p style="color: #888; font-size: 12px;">
        본 메일은 매주 월요일 발송됩니다. 받지 않으시려면 <a href="${base}/mypage" style="color: #003876;">마이페이지 → 알림 설정</a> 에서 "주간 다이제스트"를 끄세요.
      </p>
      <p style="color: #888; font-size: 12px;">연세교육공학회 | yonsei.edtech@gmail.com</p>
    </div>
  `;
}

async function sendDigest(db: FirebaseFirestore.Firestore, weekKey: string): Promise<{ sent: number; recipients: number }> {
  const Resend = (await import("resend")).Resend;
  const key = process.env.RESEND_API_KEY;
  if (!key) return { sent: 0, recipients: 0 };

  const todayYmd = todayYmdKst();
  const [seminars, posts, activities, questions] = await Promise.all([
    loadUpcomingSeminars(db, todayYmd),
    loadPopularPosts(db),
    loadUpcomingActivities(db, todayYmd),
    loadUnansweredQuestions(db),
  ]);

  // 콘텐츠 0건이면 발송 스킵 (무의미한 메일 방지)
  if (seminars.length === 0 && posts.length === 0 && activities.length === 0 && questions.length === 0) {
    return { sent: 0, recipients: 0 };
  }

  // 회원 이메일 + userId 수집 (개인화 집계·온보딩 판정에 회원 doc 보존)
  const usersSnap = await db.collection("users").where("approved", "==", true).get();
  const recipients: { id: string; email: string }[] = [];
  const userIds: string[] = [];
  const usersById = new Map<
    string,
    { bio?: string; researchInterests?: string[]; interestKeywords?: string[]; name?: string; showInLeaderboard?: boolean }
  >();
  for (const u of usersSnap.docs) {
    const d = u.data() as {
      email?: string;
      contactEmail?: string;
      notificationPrefs?: { weeklyDigest?: boolean };
      bio?: string;
      researchInterests?: string[];
      interestKeywords?: string[];
      name?: string;
      showInLeaderboard?: boolean;
    };
    if (d.notificationPrefs?.weeklyDigest === false) continue;
    userIds.push(u.id);
    usersById.set(u.id, {
      bio: d.bio,
      researchInterests: d.researchInterests,
      interestKeywords: d.interestKeywords,
      name: d.name,
      showInLeaderboard: d.showInLeaderboard,
    });
    const email = d.email || d.contactEmail;
    if (email) recipients.push({ id: u.id, email });
  }
  if (recipients.length === 0) return { sent: 0, recipients: 0 };

  // 수신자별 "나의 한 주" 개인 집계 + M3 재유입 제안 (읽기 전용). 실패해도 비개인화 발송은 계속.
  let personalById = new Map<string, PersonalDigest>();
  let suggestionById = new Map<string, LearningSuggestion>();
  let peersHtml = "";
  try {
    const agg = await loadPersonalDigests(
      db,
      recipients.map((r) => r.id),
      usersById,
      todayYmd,
    );
    personalById = agg.personal;
    suggestionById = agg.suggestions;
    // Phase 3: 동료 하이라이트 — 지난 7일 몰입·활동 상위 회원 (리더보드 공개 정책 준수)
    peersHtml = buildPeerHighlightHtml(agg.timerMinByUser, agg.activeDaysByUser, usersById);
  } catch (e) {
    console.error("[email] weekly-digest personal aggregate error:", e);
  }

  // M1(v5): 지난주 목표 달성 회고 병합 (설정자만). 실패해도 나머지 발송은 계속.
  // todayYmd 는 KST 월요일이므로 -7 = 지난주 월요일 = 지난주 목표의 weekKey.
  try {
    const goalResults = await loadLastWeekGoalResults(
      db,
      recipients.map((r) => r.id),
      shiftYmd(todayYmd, -7),
    );
    for (const [uid, res] of goalResults) {
      const s = suggestionById.get(uid) ?? { diagnosis: null, needsResearchDesign: false };
      s.lastGoal = res;
      suggestionById.set(uid, s);
    }
  } catch (e) {
    console.error("[email] weekly-digest goal-result merge error:", e);
  }

  const resend = new Resend(key);
  const subject = `[연세교육공학회] 주간 다이제스트 (${weekKey})`;

  // 개인 콘텐츠(나의 한 주) 또는 M3 재유입 제안이 있는 회원은 개별 발송,
  // 둘 다 없는 회원은 공통 BCC 묶음 발송.
  const isPersonal = (id: string) => {
    const p = personalById.get(id);
    const s = suggestionById.get(id);
    return (p ? hasPersonalContent(p) : false) || (s ? hasSuggestionContent(s) : false);
  };
  const personalRecipients = recipients.filter((r) => isPersonal(r.id));
  const genericEmails = recipients.filter((r) => !isPersonal(r.id)).map((r) => r.email);

  const genericHtml = buildHtml({ seminars, posts, activities, questions, peersHtml });

  let sent = 0;

  // (a) 비개인화 회원 — 기존 BCC 묶음 (50건 배치)
  for (let i = 0; i < genericEmails.length; i += 50) {
    const batch = genericEmails.slice(i, i + 50);
    try {
      await resend.emails.send({
        from: "연세교육공학회 <noreply@yonsei-edtech.vercel.app>",
        to: "noreply@yonsei-edtech.vercel.app",
        bcc: batch,
        subject,
        html: genericHtml,
      });
      sent += batch.length;
    } catch (e) {
      console.error("[email] weekly-digest generic send error:", e);
    }
  }

  // (b) 개인 콘텐츠 보유 회원 — 개별 발송 (개인 블록 + 공통 이벤트)
  for (const r of personalRecipients) {
    const personal = personalById.get(r.id);
    const suggestion = suggestionById.get(r.id);
    const html = buildHtml({ seminars, posts, activities, questions, personal, suggestion, peersHtml });
    try {
      await resend.emails.send({
        from: "연세교육공학회 <noreply@yonsei-edtech.vercel.app>",
        to: r.email,
        subject,
        html,
      });
      sent += 1;
    } catch (e) {
      console.error("[email] weekly-digest personal send error:", e);
    }
  }

  await db.collection("email_logs").add({
    type: "weekly_digest",
    targetId: weekKey,
    recipientCount: sent,
    sentAt: new Date().toISOString(),
    sentBy: "system",
  });

  // 인앱 알림 동시 적재 (이메일 발송 성공 여부와 무관하게 수행)
  await fanOutNotificationAdmin(userIds, {
    type: "weekly_digest",
    title: `주간 다이제스트 (${weekKey})`,
    body: "이번 주 학회 활동을 확인하세요.",
    relatedLink: "/dashboard",
    metadata: { sourceId: `weekly_digest_${weekKey}` },
  });

  return { sent, recipients: recipients.length };
}

export async function GET(req: NextRequest) {
  if (!verifyCronAuth(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = getAdminDb();
    const todayYmd = todayYmdKst();

    if (!isMondayKst()) {
      return Response.json({ ok: true, skipped: "not Monday KST", todayYmd });
    }

    // codex-M12(2026-07-07): 조회→발송이 원자적이지 않아 재시도·동시호출 시 중복 발송.
    //   결정적 ID(weekly_digest_lock_<weekKey>) create 로 원자적 예약 — create 는 문서가
    //   이미 있으면 실패하므로 동시 호출 중 하나만 통과.
    const lockRef = db.collection("email_logs").doc(`weekly_digest_lock_${todayYmd}`);
    try {
      await lockRef.create({
        type: "weekly_digest_lock",
        targetId: todayYmd,
        status: "sending",
        createdAt: new Date().toISOString(),
      });
    } catch {
      return Response.json({ ok: true, skipped: "already sent (lock)", todayYmd });
    }

    try {
      const result = await sendDigest(db, todayYmd);
      await lockRef.update({ status: "sent", sentAt: new Date().toISOString(), recipientCount: result.sent });
      return Response.json({ ok: true, todayYmd, ...result });
    } catch (e) {
      // 발송 실패 시 락 해제 — 다음 실행이 재시도할 수 있도록
      await lockRef.delete().catch(() => {});
      throw e;
    }
  } catch (err) {
    console.error("[cron/weekly-digest]", err);
    return Response.json({ error: "Internal error" }, { status: 500 });
  }
}
