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
  kind: "activity" | "seminar";
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
}

interface Bucket {
  studentId: string;
  name: string;
  email?: string;
  phone?: string;
  records: PotentialRecord[];
}

export async function GET(req: NextRequest) {
  const authResult = await requireAuth(req, "staff");
  if (authResult instanceof NextResponse) return authResult;

  try {
    const db = getAdminDb();

    // ── 승인 회원의 학번 집합 (이미 회원인 학번 제외용) ──
    const usersSnap = await db.collection("users").get();
    const memberStudentIds = new Set<string>();
    for (const doc of usersSnap.docs) {
      const u = doc.data() as Record<string, unknown>;
      if (u.approved === false || u.rejected === true) continue;
      const sid = normalizeStudentId(u.studentId) || normalizeStudentId(u.username);
      if (sid) memberStudentIds.add(sid);
    }

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

    // ── 응답 조립 ──
    const potentialMembers: PotentialMember[] = [...buckets.values()]
      .map((b) => {
        const dates = b.records.map((rec) => rec.date).filter(Boolean).sort();
        return {
          studentId: b.studentId,
          name: b.name || "(이름 미상)",
          email: b.email,
          phone: b.phone,
          recordCount: b.records.length,
          lastActivityDate: dates.length > 0 ? dates[dates.length - 1] : "",
          records: b.records.sort((x, y) => (y.date || "").localeCompare(x.date || "")),
        };
      })
      .sort((a, b) => {
        if (b.recordCount !== a.recordCount) return b.recordCount - a.recordCount;
        return (b.lastActivityDate || "").localeCompare(a.lastActivityDate || "");
      });

    return NextResponse.json({ potentialMembers });
  } catch (err) {
    console.error("[/api/console/potential-members]", err);
    return NextResponse.json(
      { error: "잠재회원 목록을 불러오지 못했습니다." },
      { status: 500 },
    );
  }
}
