import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { requireAuth } from "@/lib/api-auth";
import type { ApplicantEntry, PublicSpeaker } from "@/types";

/** speaker applicants → activities 문서용 비-PII 공개 투영 */
function computePublicSpeakers(applicants: ApplicantEntry[]): PublicSpeaker[] {
  return applicants
    .filter((a) => a.participantType === "speaker")
    .map((a) => ({
      name: a.name,
      ...(a.speakerSubmissionType ? { submissionType: a.speakerSubmissionType } : {}),
      ...(a.speakerPaperTitle ? { paperTitle: a.speakerPaperTitle } : {}),
    }));
}

/** undefined 값을 재귀적으로 제거 */
function stripUndefinedDeep<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((v) => stripUndefinedDeep(v)) as unknown as T;
  }
  if (value && typeof value === "object" && !(value instanceof Date)) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (v === undefined) continue;
      out[k] = stripUndefinedDeep(v);
    }
    return out as T;
  }
  return value;
}

/**
 * POST /api/auth/link-guest-applicants — 비회원 신청 → 로그인 회원 자동 연결.
 *
 * 모든 activity_applicants 문서(및 split doc 없는 activities)를 스캔하여,
 * isGuest 이고 학번/이메일 일치하는 항목에 userId 를 채우고 isGuest:false 로 갱신한다.
 *
 * 매칭 키(학번·이메일)는 body 가 아니라 인증된 사용자의 users/{uid} 프로필에서 읽는다.
 * (body 의 studentId/email 을 무검증 사용하면 타인 신청 이력 탈취 가능.)
 */
export async function POST(req: NextRequest) {
  const authResult = await requireAuth(req);
  if (authResult instanceof NextResponse) return authResult;
  const uid = authResult.uid;

  const db = getAdminDb();

  // HIGH-3: 매칭 키는 인증 사용자의 프로필 문서에서 취득.
  let studentId = "";
  let email = "";
  try {
    const userSnap = await db.collection("users").doc(uid).get();
    const u = userSnap.data() as Record<string, unknown> | undefined;
    studentId = ((u?.username as string | undefined) ?? "").trim();
    email = ((u?.email as string | undefined) ?? authResult.email ?? "")
      .trim()
      .toLowerCase();
  } catch {
    email = (authResult.email ?? "").trim().toLowerCase();
  }
  if (!studentId && !email) {
    return NextResponse.json({ linked: 0 });
  }

  const matches = (a: ApplicantEntry): boolean => {
    if (!a.isGuest) return false;
    if (studentId && a.studentId && a.studentId.trim() === studentId) return true;
    if (email && a.email && a.email.toLowerCase() === email) return true;
    return false;
  };

  try {
    let linked = 0;

    // 처리 대상 activityId 수집 — split doc 우선, 없으면 activities 임베드
    const splitSnap = await db.collection("activity_applicants").get();
    const splitDocs = new Map<string, ApplicantEntry[]>();
    for (const d of splitSnap.docs) {
      splitDocs.set(d.id, (d.data()?.applicants as ApplicantEntry[]) ?? []);
    }

    const actSnap = await db.collection("activities").get();
    const nowIso = new Date().toISOString();

    for (const actDoc of actSnap.docs) {
      const activityId = actDoc.id;
      const current: ApplicantEntry[] = splitDocs.has(activityId)
        ? splitDocs.get(activityId)!
        : ((actDoc.data()?.applicants as ApplicantEntry[]) ?? []);
      if (current.length === 0) continue;
      const preMatchCount = current.filter(matches).length;
      if (preMatchCount === 0) continue;

      const splitRef = db.collection("activity_applicants").doc(activityId);
      const actRef = db.collection("activities").doc(activityId);
      await db.runTransaction(async (tx) => {
        const fresh = await tx.get(splitRef);
        const actFresh = await tx.get(actRef);
        const freshApplicants: ApplicantEntry[] = fresh.exists
          ? ((fresh.data()?.applicants as ApplicantEntry[]) ?? [])
          : ((actFresh.data()?.applicants as ApplicantEntry[]) ?? []);
        const freshNext = freshApplicants.map((a) =>
          matches(a) ? { ...a, userId: uid, isGuest: false } : a,
        );
        tx.set(
          splitRef,
          stripUndefinedDeep({ applicants: freshNext, updatedAt: nowIso }),
        );
        if (actFresh.exists) {
          tx.update(
            actRef,
            stripUndefinedDeep({
              publicSpeakers: computePublicSpeakers(freshNext),
              updatedAt: nowIso,
            }),
          );
        }
      });
      linked += preMatchCount;
    }

    return NextResponse.json({ linked });
  } catch (err) {
    console.error("[/api/auth/link-guest-applicants]", err);
    return NextResponse.json({ error: "연동에 실패했습니다." }, { status: 500 });
  }
}
