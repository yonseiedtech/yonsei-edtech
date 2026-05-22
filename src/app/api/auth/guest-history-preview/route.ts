import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { checkRateLimit } from "@/lib/rate-limit";
import type { ApplicantEntry } from "@/types";

/**
 * GET /api/auth/guest-history-preview
 *
 * 잠재회원(Potential Member) Phase B — 회원가입 전 활동 이력 사전 안내용.
 *
 * 인증 불필요(가입 전 호출). 쿼리: ?studentId=...&email=... (둘 중 최소 하나 필수).
 * 학번 또는 이메일이 일치하는 비회원(게스트) 활동·세미나 이력을 수집한다.
 *
 * 수집 출처
 *  (a) 활동 신청자 — activity_applicants/{id}.applicants 중 isGuest===true.
 *      activity_applicants 문서가 없는 활동은 activities/{id}.applicants 임베드로 dual-read fallback.
 *  (b) 세미나 비회원 등록 — seminar_registrations 중 userId 없는(게스트) 항목.
 *
 * ⚠️ 응답은 제목·날짜·종류만 반환. 학번은 추측 가능하므로 타인 정보 노출 방지를 위해
 *    이름·이메일·전화·답변·학번 등 PII 는 절대 반환하지 않는다.
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

interface PreviewRecord {
  kind: "activity" | "seminar";
  title: string;
  date: string;
}

export async function GET(req: NextRequest) {
  // 학번/이메일 enumeration 차단을 위한 IP rate-limit
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rateLimited = checkRateLimit(`guest_history_preview_${ip}`, {
    limit: 10,
    windowSec: 60,
  });
  if (rateLimited) return rateLimited;

  const studentId = normalizeStudentId(req.nextUrl.searchParams.get("studentId"));
  const email = (req.nextUrl.searchParams.get("email") ?? "").trim().toLowerCase();

  if (!studentId && !email) {
    return NextResponse.json(
      { error: "학번 또는 이메일이 필요합니다." },
      { status: 400 },
    );
  }

  try {
    const db = getAdminDb();
    const records: PreviewRecord[] = [];

    // ── (a) 활동 게스트 신청 — activity_applicants + activities 임베드 dual-read ──
    const actSnap = await db.collection("activities").get();
    for (const actDoc of actSnap.docs) {
      const act = actDoc.data() as Record<string, unknown>;
      const splitSnap = await db
        .collection("activity_applicants")
        .doc(actDoc.id)
        .get();
      const applicants: ApplicantEntry[] = splitSnap.exists
        ? ((splitSnap.data()?.applicants as ApplicantEntry[]) ?? [])
        : ((act.applicants as ApplicantEntry[]) ?? []);

      const title = (act.title as string) ?? "(제목 없음)";
      const date = (act.date as string) ?? "";

      for (const a of applicants) {
        if (a?.isGuest !== true) continue;
        const sid = normalizeStudentId(a.studentId);
        const aEmail = (a.email ?? "").trim().toLowerCase();
        const match =
          (!!studentId && !!sid && sid === studentId) ||
          (!!email && !!aEmail && aEmail === email);
        if (!match) continue;
        records.push({ kind: "activity", title, date: a.appliedAt || date });
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
      const rEmail = ((r.email as string | undefined) ?? "").trim().toLowerCase();
      const match =
        (!!studentId && !!sid && sid === studentId) ||
        (!!email && !!rEmail && rEmail === email);
      if (!match) continue;

      const meta = seminarMeta.get((r.seminarId as string) ?? "");
      records.push({
        kind: "seminar",
        title: meta?.title ?? "(세미나)",
        date: (r.createdAt as string) || meta?.date || "",
      });
    }

    records.sort((x, y) => (y.date || "").localeCompare(x.date || ""));

    return NextResponse.json({ count: records.length, records });
  } catch (err) {
    console.error("[/api/auth/guest-history-preview]", err);
    return NextResponse.json(
      { error: "활동 이력을 불러오지 못했습니다." },
      { status: 500 },
    );
  }
}
