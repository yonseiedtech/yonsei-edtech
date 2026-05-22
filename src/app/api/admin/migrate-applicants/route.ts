import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { requireAuth } from "@/lib/api-auth";
import { FieldValue } from "firebase-admin/firestore";
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

/** applicant 항목의 안정 식별 키 (포함 검증용) */
function keyOf(a: ApplicantEntry): string {
  return a.userId ?? a.guestKey ?? `${a.name}-${a.appliedAt}`;
}

/**
 * POST /api/admin/migrate-applicants — activities.applicants → activity_applicants 마이그레이션.
 *
 * 쿼리파라미터 `?mode=` 로 동작을 명확히 분리한다 (기본: copy).
 *  - mode=copy   : activities/{id}.applicants → activity_applicants/{id} 로 복사만 한다.
 *                  이미 split doc 이 존재하면 skip. 절대 삭제하지 않음. idempotent.
 *  - mode=delete : activity_applicants/{id} 를 다시 읽어 임베드 applicants 의 모든 항목을
 *                  포함하는지 검증한 후에만 activities/{id}.applicants 를 제거한다.
 *                  검증 실패 시 해당 활동 skip + skippedDetail 에 보고.
 */
export async function POST(req: NextRequest) {
  const authResult = await requireAuth(req, "admin");
  if (authResult instanceof NextResponse) return authResult;

  const modeParam = req.nextUrl.searchParams.get("mode");
  const mode: "copy" | "delete" = modeParam === "delete" ? "delete" : "copy";

  try {
    const db = getAdminDb();
    const actSnap = await db.collection("activities").get();
    const nowIso = new Date().toISOString();

    let migrated = 0;
    let deleted = 0;
    let skipped = 0;
    const skippedDetail: string[] = [];

    for (const actDoc of actSnap.docs) {
      const data = actDoc.data() as Record<string, unknown>;
      const embedded = (data.applicants as ApplicantEntry[] | undefined) ?? [];
      const splitRef = db.collection("activity_applicants").doc(actDoc.id);
      const splitSnap = await splitRef.get();

      if (mode === "copy") {
        if (splitSnap.exists) {
          // 이미 split doc 존재 — idempotent skip
          skipped++;
          continue;
        }
        if (embedded.length > 0) {
          await splitRef.set({ applicants: embedded, updatedAt: nowIso });
          await actDoc.ref.update({
            publicSpeakers: computePublicSpeakers(embedded),
            updatedAt: nowIso,
          });
          migrated++;
        } else {
          // 복사할 applicants 없음
          skipped++;
        }
        continue;
      }

      // mode === "delete" — 복사 성공 검증 후에만 임베드 제거
      if (data.applicants === undefined) {
        // 제거할 임베드 필드 없음
        skipped++;
        continue;
      }
      if (!splitSnap.exists) {
        // split doc 이 없는데 임베드를 지우면 데이터 영구 손실 — skip
        skipped++;
        skippedDetail.push(
          `${actDoc.id}: activity_applicants 문서가 없어 삭제하지 않음 (먼저 mode=copy 실행 필요)`,
        );
        continue;
      }
      const splitApplicants =
        (splitSnap.data()?.applicants as ApplicantEntry[] | undefined) ?? [];
      const splitKeys = new Set(splitApplicants.map(keyOf));
      const missing = embedded.filter((a) => !splitKeys.has(keyOf(a)));
      if (splitApplicants.length < embedded.length || missing.length > 0) {
        // split 문서가 임베드의 모든 항목을 포함하지 않음 — 검증 실패, skip
        skipped++;
        skippedDetail.push(
          `${actDoc.id}: 검증 실패 — split ${splitApplicants.length}건, embedded ${embedded.length}건, 누락 ${missing.length}건`,
        );
        continue;
      }
      // 검증 통과 — 임베드 필드 제거
      await actDoc.ref.update({
        applicants: FieldValue.delete(),
        updatedAt: nowIso,
      });
      deleted++;
    }

    return NextResponse.json({ mode, migrated, deleted, skipped, skippedDetail });
  } catch (err) {
    console.error("[/api/admin/migrate-applicants]", err);
    return NextResponse.json(
      { error: "마이그레이션에 실패했습니다." },
      { status: 500 },
    );
  }
}
