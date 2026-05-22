import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { verifyAuth } from "@/lib/api-auth";
import { ROLE_HIERARCHY } from "@/lib/permissions";
import type { ApplicantEntry, ExternalParticipantType, SpeakerSubmissionType, PublicSpeaker } from "@/types";

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

/** undefined 값을 재귀적으로 제거 (Firestore 거부) */
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

interface ApplyBody {
  name?: string;
  studentId?: string;
  email?: string;
  phone?: string;
  answers?: ApplicantEntry["answers"];
  participantType?: ExternalParticipantType;
  speakerSubmissionType?: SpeakerSubmissionType;
  speakerPaperTitle?: string;
  userId?: string;
  guestKey?: string;
  isGuest?: boolean;
  /** 수정 대상 항목 키 (userId / guestKey / `${name}-${appliedAt}`) */
  editKey?: string;
}

/** applicant 항목의 식별 키 (ActivityDetail 의 키 규칙과 동일) */
function keyOf(a: ApplicantEntry): string {
  return a.userId ?? a.guestKey ?? `${a.name}-${a.appliedAt}`;
}

/**
 * POST /api/activities/[id]/apply — 활동 신청 제출 + 수정 (회원·비회원 공용).
 *
 * Admin SDK 트랜잭션으로 activity_applicants/{id} 를 갱신하고,
 * activities/{id}.publicSpeakers (+ study/project 의 participants) 를 재계산한다
 * (lost-update 방지). firestore.rules 의 activity_applicants write 는 staff 전용이라
 * 비-staff 신청은 반드시 이 라우트(Admin SDK)를 거쳐야 한다.
 */
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id: activityId } = await ctx.params;
  if (!activityId) {
    return NextResponse.json({ error: "활동 ID가 필요합니다." }, { status: 400 });
  }

  let body: ApplyBody;
  try {
    body = (await req.json()) as ApplyBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // 회원 신청 시 토큰 검증 (있으면 검증, 없으면 비회원 신청으로 처리)
  const authUser = await verifyAuth(req);
  const isStaff =
    !!authUser && ROLE_HIERARCHY[authUser.role] >= ROLE_HIERARCHY.staff;

  const db = getAdminDb();

  // HIGH-3: 인증 회원의 name·studentId·email 은 body 가 아닌 users/{uid} 프로필에서 취득.
  // (비인증 게스트는 자기보고 불가피 — body 사용 유지)
  let profileName: string | undefined;
  let profileStudentId: string | undefined;
  let profileEmail: string | undefined;
  if (authUser) {
    try {
      const userSnap = await db.collection("users").doc(authUser.uid).get();
      const u = userSnap.data() as Record<string, unknown> | undefined;
      profileName = ((u?.name as string | undefined) ?? "").trim() || undefined;
      profileStudentId =
        ((u?.username as string | undefined) ?? "").trim() || undefined;
      profileEmail =
        ((u?.email as string | undefined) ?? authUser.email ?? "")
          .trim()
          .toLowerCase() || undefined;
    } catch {
      // 프로필 조회 실패 시 토큰 정보로 폴백
      profileName = authUser.name?.trim() || undefined;
      profileEmail = authUser.email?.trim().toLowerCase() || undefined;
    }
  }

  // 인증 회원이면 프로필 값 우선, 비인증 게스트면 body 값.
  const name = authUser
    ? (profileName ?? (body.name ?? "").trim())
    : (body.name ?? "").trim();
  if (!name) {
    return NextResponse.json({ error: "이름이 필요합니다." }, { status: 400 });
  }

  const isSpeaker = body.participantType === "speaker";
  if (isSpeaker && !(body.speakerPaperTitle ?? "").trim()) {
    return NextResponse.json(
      { error: "발표자 신청은 논문/작품 제목이 필요합니다." },
      { status: 400 },
    );
  }

  const splitRef = db.collection("activity_applicants").doc(activityId);
  const actRef = db.collection("activities").doc(activityId);

  try {
    await db.runTransaction(async (tx) => {
      const splitSnap = await tx.get(splitRef);
      const actSnap = await tx.get(actRef);
      if (!actSnap.exists) {
        throw new Error("활동을 찾을 수 없습니다.");
      }
      const actData = actSnap.data() as Record<string, unknown>;
      const activityType = actData.type as string | undefined;
      // study/project 신청은 즉시 participants 에 합류 (대외활동은 승인 절차 거침)
      const joinsParticipants =
        activityType === "study" || activityType === "project";
      // seed: split doc 없으면 activities.applicants 로 초기화 (마이그레이션 전 안전성)
      const current: ApplicantEntry[] = splitSnap.exists
        ? ((splitSnap.data()?.applicants as ApplicantEntry[]) ?? [])
        : ((actData.applicants as ApplicantEntry[]) ?? []);
      const currentParticipants: string[] =
        (actData.participants as string[] | undefined) ?? [];

      let next: ApplicantEntry[];
      let nextParticipants: string[] | undefined;

      const speakerExtras = isSpeaker
        ? {
            speakerSubmissionType: body.speakerSubmissionType,
            speakerPaperTitle: (body.speakerPaperTitle ?? "").trim(),
          }
        : {};

      if (body.editKey) {
        // 수정 모드 — 기존 항목 교체
        const idx = current.findIndex((a) => keyOf(a) === body.editKey);
        if (idx < 0) {
          throw new Error("수정할 신청을 찾을 수 없습니다.");
        }
        const existing = current[idx];
        // HIGH-1: editKey 수정은 (1) 인증된 본인 또는 (2) 인증된 staff 이상만 허용.
        // 비인증 게스트의 자기수정 경로는 제거 — 게스트는 editKey 만으로 타인 신청 변조 가능.
        const isSelfEdit = !!authUser && existing.userId === authUser.uid;
        if (!isSelfEdit && !isStaff) {
          throw new Error("이 신청을 수정할 권한이 없습니다.");
        }
        const updated: ApplicantEntry = {
          ...existing,
          name,
          studentId:
            authUser && profileStudentId !== undefined
              ? profileStudentId
              : body.studentId ?? existing.studentId,
          email:
            (authUser ? profileEmail : (body.email ?? "").trim().toLowerCase()) ||
            existing.email,
          phone: body.phone ?? existing.phone,
          answers:
            body.answers && Object.keys(body.answers).length > 0
              ? body.answers
              : undefined,
          participantType: body.participantType ?? existing.participantType,
          speakerSubmissionType: isSpeaker
            ? body.speakerSubmissionType
            : undefined,
          speakerPaperTitle: isSpeaker
            ? (body.speakerPaperTitle ?? "").trim()
            : undefined,
          // HIGH-1: 회원 본인이 이미 승인된 신청을 수정하면 status 를 pending 으로 되돌린다.
          // staff 수정 시에는 status 유지.
          status:
            isSelfEdit && !isStaff && existing.status === "approved"
              ? "pending"
              : existing.status,
        };
        next = current.map((a, i) => (i === idx ? updated : a));
      } else {
        // 신규 신청
        if (authUser) {
          // 회원 — userId 중복 체크
          const dup = current.some((a) => a.userId === authUser.uid);
          if (dup) {
            throw new Error("이미 신청하셨습니다.");
          }
          const entry: ApplicantEntry = {
            userId: authUser.uid,
            name,
            studentId: profileStudentId,
            email: profileEmail ?? authUser.email,
            phone: body.phone,
            answers:
              body.answers && Object.keys(body.answers).length > 0
                ? body.answers
                : undefined,
            appliedAt: new Date().toISOString(),
            status: "pending",
            participantType: body.participantType,
            ...speakerExtras,
          };
          next = [...current, entry];
          // study/project: 회원은 신청 즉시 참여자 합류
          if (joinsParticipants && !currentParticipants.includes(authUser.uid)) {
            nextParticipants = [...currentParticipants, authUser.uid];
          }
        } else {
          // 비회원 — 이름·학번·이메일 필수, guestKey/이름+학번 중복 체크
          const studentId = (body.studentId ?? "").trim();
          const email = (body.email ?? "").trim().toLowerCase();
          if (!email || !studentId) {
            throw new Error("비회원 신청은 이름·학번·이메일이 모두 필요합니다.");
          }
          const dup = current.some(
            (a) =>
              (body.guestKey && a.guestKey === body.guestKey) ||
              (a.name === name && (a.studentId ?? "") === studentId),
          );
          if (dup) {
            throw new Error("이미 신청하셨습니다.");
          }
          const guestKey =
            body.guestKey ||
            `guest_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
          const entry: ApplicantEntry = {
            guestKey,
            isGuest: true,
            name,
            studentId,
            email,
            phone: body.phone,
            answers:
              body.answers && Object.keys(body.answers).length > 0
                ? body.answers
                : undefined,
            appliedAt: new Date().toISOString(),
            status: "pending",
            participantType: body.participantType,
            ...speakerExtras,
          };
          next = [...current, entry];
        }
      }

      const nowIso = new Date().toISOString();
      tx.set(
        splitRef,
        stripUndefinedDeep({ applicants: next, updatedAt: nowIso }),
      );
      tx.update(
        actRef,
        stripUndefinedDeep({
          publicSpeakers: computePublicSpeakers(next),
          ...(nextParticipants !== undefined
            ? { participants: nextParticipants }
            : {}),
          updatedAt: nowIso,
        }),
      );
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[/api/activities/[id]/apply]", err);
    const message = err instanceof Error ? err.message : "신청에 실패했습니다.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
