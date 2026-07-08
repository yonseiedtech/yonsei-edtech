import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { requireAuth } from "@/lib/api-auth";
import type { ApplicantEntry, ExternalParticipantType } from "@/types";

/**
 * GET /api/console/potential-members
 *
 * 대외 학술대회·세미나에 비회원(게스트)으로 등록한 인물을 "잠재회원"으로 집계한다.
 * staff 전용 — 학번·이메일·연락처 등 PII 를 포함하므로 비-staff 노출 금지.
 *
 * 수집 출처
 *  (a) 활동 신청자 — activity_applicants/{id}.applicants 중 isGuest===true.
 *      activity_applicants 문서가 없는 활동은 activities/{id}.applicants 임베드로 dual-read fallback.
 *  (b) 세미나 비회원 등록 — seminar_registrations 중 userId 없는(게스트) 항목.
 *  (c) 모임 일정 투표 게스트 — networking_availability 중 isGuest===true 항목.
 *
 * 그룹핑
 *  - 학번(studentId) 정규화 후 같은 학번 = 같은 잠재회원.
 *  - 학번이 없으면 이름+이메일 조합을 보조 키로 사용.
 *  - users 컬렉션에 username/studentId 가 일치하는 승인 회원이 있으면 그 학번은 제외 (이미 회원).
 */

/** 학번 정규화 — 공백 제거 + 엑셀 소수점 케이스(2025431009.0) 보정 */
function normalizeStudentId(raw: unknown): string {
  if (raw == null) return "";
  const s = String(raw).trim();
  if (!s) return "";
  const num = Number(s);
  if (!Number.isNaN(num) && num > 1_000_000_000) return String(Math.round(num));
  return s;
}

interface PotentialRecord {
  kind: "activity" | "seminar" | "networking";
  id: string;
  title: string;
  date: string;
  status?: string;
  participantType?: ExternalParticipantType;
}

interface PotentialMember {
  studentId: string;
  name: string;
  email?: string;
  phone?: string;
  recordCount: number;
  lastActivityDate: string;
  records: PotentialRecord[];
  /** 가입 후보 우선순위 점수 (참여수·최근성·다양성·발표자 가중). 높을수록 유력. */
  interestScore: number;
  /** 마지막 활동 이후 경과일 (정렬·연락 타이밍 판단용). 날짜 없으면 null. */
  daysSinceLastActivity: number | null;
}

interface ConvertedMember {
  studentId: string;
  name: string;
  joinedAt: string;
}

interface Bucket {
  studentId: string;
  name: string;
  email?: string;
  phone?: string;
  records: PotentialRecord[];
}

const DAY_MS = 86_400_000;

/** 가입 후보 우선순위 점수 — 참여수·최근성·종류 다양성·발표자 가중 합산 */
function computeInterestScore(
  records: PotentialRecord[],
  daysSince: number | null,
): number {
  if (records.length === 0) return 0;
  // 참여 건수 (건당 10점, 상한 60)
  let score = Math.min(records.length * 10, 60);
  // 활동·세미나 양쪽 다 참여하면 다양성 보너스
  const hasActivity = records.some((r) => r.kind === "activity");
  const hasSeminar = records.some((r) => r.kind === "seminar");
  if (hasActivity && hasSeminar) score += 15;
  // 발표자/자원봉사자로 참여한 적 있으면 높은 관여도 가중
  if (records.some((r) => r.participantType === "speaker")) score += 20;
  else if (records.some((r) => r.participantType === "volunteer")) score += 10;
  // 최근성 — 30일 이내 +25, 90일 이내 +10, 그 외 0
  if (daysSince != null) {
    if (daysSince <= 30) score += 25;
    else if (daysSince <= 90) score += 10;
  }
  return score;
}

export async function GET(req: NextRequest) {
  const authResult = await requireAuth(req, "staff");
  if (authResult instanceof NextResponse) return authResult;

  try {
    const db = getAdminDb();

    // ── 승인 회원의 학번 집합 (이미 회원인 학번 제외용) ──
    // 더불어 최근 30일 내 가입한 회원을 "전환 추적" 후보로 수집한다.
    const usersSnap = await db.collection("users").get();
    const memberStudentIds = new Set<string>();
    const recentJoins: ConvertedMember[] = [];
    const nowMs = Date.now();
    for (const doc of usersSnap.docs) {
      const u = doc.data() as Record<string, unknown>;
      if (u.approved === false || u.rejected === true) continue;
      const sid = normalizeStudentId(u.studentId) || normalizeStudentId(u.username);
      if (sid) memberStudentIds.add(sid);

      const createdAt = (u.createdAt as string) || "";
      const t = createdAt ? Date.parse(createdAt) : NaN;
      if (!Number.isNaN(t) && nowMs - t <= 30 * DAY_MS) {
        recentJoins.push({
          studentId: sid,
          name: ((u.name as string) ?? "").trim() || "(이름 미상)",
          joinedAt: createdAt,
        });
      }
    }
    recentJoins.sort((a, b) => (b.joinedAt || "").localeCompare(a.joinedAt || ""));

    // 학번 보유 잠재회원: studentId → Bucket
    // 학번 미보유: "이름|이메일" → Bucket
    const buckets = new Map<string, Bucket>();

    function bucketFor(studentId: string, name: string, email?: string): Bucket {
      const key = studentId
        ? `sid:${studentId}`
        : `ne:${name.trim().toLowerCase()}|${(email ?? "").trim().toLowerCase()}`;
      let b = buckets.get(key);
      if (!b) {
        b = { studentId, name, email, phone: undefined, records: [] };
        buckets.set(key, b);
      }
      return b;
    }

    // ── (a) 활동 신청자 — activity_applicants + activities 임베드 dual-read ──
    const actSnap = await db.collection("activities").get();
    for (const actDoc of actSnap.docs) {
      const act = actDoc.data() as Record<string, unknown>;
      const splitSnap = await db.collection("activity_applicants").doc(actDoc.id).get();
      const applicants: ApplicantEntry[] = splitSnap.exists
        ? ((splitSnap.data()?.applicants as ApplicantEntry[]) ?? [])
        : ((act.applicants as ApplicantEntry[]) ?? []);

      const title = (act.title as string) ?? "(제목 없음)";
      const date = (act.date as string) ?? "";

      for (const a of applicants) {
        if (a?.isGuest !== true) continue;
        const sid = normalizeStudentId(a.studentId);
        // 이미 회원인 학번이면 제외
        if (sid && memberStudentIds.has(sid)) continue;
        const name = (a.name ?? "").trim();
        if (!sid && !name) continue;

        const b = bucketFor(sid, name, a.email);
        if (!b.name && name) b.name = name;
        if (!b.email && a.email) b.email = a.email;
        if (!b.phone && a.phone) b.phone = a.phone;
        b.records.push({
          kind: "activity",
          id: actDoc.id,
          title,
          date: a.appliedAt || date,
          status: a.status,
          participantType: a.participantType,
        });
      }
    }

    // ── (b) 세미나 비회원 등록 ──
    const seminarsSnap = await db.collection("seminars").get();
    const seminarMeta = new Map<string, { title: string; date: string }>();
    for (const s of seminarsSnap.docs) {
      const sd = s.data() as Record<string, unknown>;
      seminarMeta.set(s.id, {
        title: (sd.title as string) ?? "(제목 없음)",
        date: (sd.date as string) ?? "",
      });
    }

    const regSnap = await db.collection("seminar_registrations").get();
    for (const regDoc of regSnap.docs) {
      const r = regDoc.data() as Record<string, unknown>;
      // 게스트 = userId 가 없는 등록
      if (r.userId) continue;
      const sid = normalizeStudentId(r.studentId);
      if (sid && memberStudentIds.has(sid)) continue;
      const name = ((r.name as string) ?? "").trim();
      const email = (r.email as string | undefined) || undefined;
      if (!sid && !name) continue;

      const meta = seminarMeta.get((r.seminarId as string) ?? "");
      const b = bucketFor(sid, name, email);
      if (!b.name && name) b.name = name;
      if (!b.email && email) b.email = email;
      if (!b.phone && r.phone) b.phone = r.phone as string;
      b.records.push({
        kind: "seminar",
        id: (r.seminarId as string) ?? regDoc.id,
        title: meta?.title ?? "(세미나)",
        date: (r.createdAt as string) || meta?.date || "",
        status: r.status as string | undefined,
      });
    }

    // ── (c) 모임 일정 투표 게스트 응답 (networking_availability) ──
    const availSnap = await db
      .collection("networking_availability")
      .where("isGuest", "==", true)
      .get();
    if (!availSnap.empty) {
      // 게스트 응답이 있을 때만 이벤트 제목 맵을 로드 (불필요한 전체 read 회피)
      const eventTitles = new Map<string, string>();
      const evSnap = await db.collection("networking_events").get();
      for (const e of evSnap.docs) {
        eventTitles.set(e.id, (e.data().title as string) ?? "(모임)");
      }
      for (const doc of availSnap.docs) {
        const a = doc.data() as Record<string, unknown>;
        const sid = normalizeStudentId(a.studentId);
        if (sid && memberStudentIds.has(sid)) continue;
        const name = ((a.guestName as string) ?? "").trim();
        if (!sid && !name) continue;

        const title = eventTitles.get((a.eventId as string) ?? "") ?? "(모임)";
        const b = bucketFor(sid, name, undefined);
        if (!b.name && name) b.name = name;
        b.records.push({
          kind: "networking",
          id: (a.eventId as string) ?? doc.id,
          title: `모임 일정 투표: ${title}`,
          date: (a.updatedAt as string) || (a.createdAt as string) || "",
        });
      }
    }

    // ── 게스트 이력 보유 학번 집합 (전환 추적용) ──
    // 버킷이 만들어졌던 학번 = 가입 전 게스트 이력이 있었던 학번.
    const guestStudentIds = new Set<string>();
    for (const b of buckets.values()) {
      if (b.studentId) guestStudentIds.add(b.studentId);
    }

    // ── 응답 조립 ──
    const potentialMembers: PotentialMember[] = [...buckets.values()]
      .map((b) => {
        const dates = b.records.map((rec) => rec.date).filter(Boolean).sort();
        const lastActivityDate = dates.length > 0 ? dates[dates.length - 1] : "";
        const lastTs = lastActivityDate ? Date.parse(lastActivityDate) : NaN;
        const daysSinceLastActivity = Number.isNaN(lastTs)
          ? null
          : Math.max(0, Math.floor((nowMs - lastTs) / DAY_MS));
        const sortedRecords = b.records.sort((x, y) =>
          (y.date || "").localeCompare(x.date || ""),
        );
        return {
          studentId: b.studentId,
          name: b.name || "(이름 미상)",
          email: b.email,
          phone: b.phone,
          recordCount: b.records.length,
          lastActivityDate,
          records: sortedRecords,
          daysSinceLastActivity,
          interestScore: computeInterestScore(sortedRecords, daysSinceLastActivity),
        };
      })
      .sort((a, b) => {
        if (b.interestScore !== a.interestScore) return b.interestScore - a.interestScore;
        if (b.recordCount !== a.recordCount) return b.recordCount - a.recordCount;
        return (b.lastActivityDate || "").localeCompare(a.lastActivityDate || "");
      });

    // 최근 30일 가입자 중 게스트 이력이 있던 = 잠재회원 → 정회원 전환 성공 사례.
    const recentConversions = recentJoins.filter(
      (m) => m.studentId && guestStudentIds.has(m.studentId),
    );

    return NextResponse.json({
      potentialMembers,
      recentConversions,
    });
  } catch (err) {
    console.error("[/api/console/potential-members]", err);
    return NextResponse.json(
      { error: "잠재회원 목록을 불러오지 못했습니다." },
      { status: 500 },
    );
  }
}
