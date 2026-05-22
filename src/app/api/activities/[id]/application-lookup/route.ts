import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import type { ApplicantEntry } from "@/types";

interface LookupBody {
  name?: string;
  studentId?: string;
}

/**
 * 비인증 응답용 비-PII 화이트리스트 투영.
 * email·phone·answers·studentId·guestKey·userId 는 절대 반환하지 않는다.
 */
interface PublicLookupResult {
  name: string;
  status: ApplicantEntry["status"];
  participantType?: ApplicantEntry["participantType"];
  appliedAt: string;
  speakerSubmissionType?: ApplicantEntry["speakerSubmissionType"];
  speakerPaperTitle?: string;
}

function toPublicResult(a: ApplicantEntry): PublicLookupResult {
  return {
    name: a.name,
    status: a.status,
    ...(a.participantType ? { participantType: a.participantType } : {}),
    appliedAt: a.appliedAt,
    ...(a.speakerSubmissionType ? { speakerSubmissionType: a.speakerSubmissionType } : {}),
    ...(a.speakerPaperTitle ? { speakerPaperTitle: a.speakerPaperTitle } : {}),
  };
}

/**
 * POST /api/activities/[id]/application-lookup — 비회원 신청현황 조회 (인증 불필요).
 *
 * 이름+학번이 정확히 일치하는 신청 항목 1건만, 비-PII 화이트리스트로 투영하여 반환한다.
 * email·phone·answers·studentId·guestKey·userId 등 민감정보는 절대 반환하지 않는다.
 */
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id: activityId } = await ctx.params;
  if (!activityId) {
    return NextResponse.json({ error: "활동 ID가 필요합니다." }, { status: 400 });
  }

  let body: LookupBody;
  try {
    body = (await req.json()) as LookupBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const name = (body.name ?? "").trim();
  const studentId = (body.studentId ?? "").trim();
  if (!name || !studentId) {
    return NextResponse.json(
      { error: "이름과 학번을 모두 입력해주세요." },
      { status: 400 },
    );
  }

  try {
    const db = getAdminDb();
    const splitSnap = await db
      .collection("activity_applicants")
      .doc(activityId)
      .get();
    let applicants: ApplicantEntry[];
    if (splitSnap.exists) {
      applicants = (splitSnap.data()?.applicants as ApplicantEntry[]) ?? [];
    } else {
      // dual-read fallback
      const actSnap = await db.collection("activities").doc(activityId).get();
      applicants = actSnap.exists
        ? ((actSnap.data()?.applicants as ApplicantEntry[]) ?? [])
        : [];
    }
    const matched =
      applicants.find(
        (a) =>
          (a.name ?? "").trim() === name &&
          (a.studentId ?? "").trim() === studentId,
      ) ?? null;
    const found: PublicLookupResult | null = matched
      ? toPublicResult(matched)
      : null;
    return NextResponse.json({ found });
  } catch (err) {
    console.error("[/api/activities/[id]/application-lookup]", err);
    return NextResponse.json({ error: "조회에 실패했습니다." }, { status: 500 });
  }
}
