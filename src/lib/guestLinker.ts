/**
 * 게스트 레코드(참석자·참가신청자·수료증) → 로그인 회원 자동 연결.
 * bkend API 기반. 로그인 직후·수동 재동기화·임의 linker 실행 모두 지원.
 */
import { attendeesApi, certificatesApi } from "@/lib/bkend";
import { auth } from "@/lib/firebase";
import type { Certificate } from "@/types";

export interface LinkerInput {
  userId: string;
  userName?: string;
  studentId?: string;
  email?: string;
}

export interface LinkerResult {
  linked: number;
}

/** 게스트 참석자 → userId 채우기 (학번/이메일 매칭) */
export async function linkGuestAttendees({
  userId,
  userName,
  studentId,
  email,
}: LinkerInput): Promise<LinkerResult> {
  let linked = 0;
  const linkedIds = new Set<string>();
  try {
    if (studentId) {
      const res = await attendeesApi.findGuestsByStudentId(studentId);
      const guests = (res.data ?? []) as unknown as { id: string }[];
      for (const g of guests) {
        await attendeesApi.update(g.id, { userId, userName: userName ?? "", isGuest: false });
        linkedIds.add(g.id);
        linked += 1;
      }
    }
    if (email) {
      const res = await attendeesApi.findGuestsByEmail(email);
      const guests = (res.data ?? []) as unknown as { id: string }[];
      for (const g of guests) {
        if (linkedIds.has(g.id)) continue;
        await attendeesApi.update(g.id, { userId, userName: userName ?? "", isGuest: false });
        linked += 1;
      }
    }
  } catch {
    console.warn("[guestLinker] attendees linking failed");
  }
  return { linked };
}

/**
 * 게스트 참가 신청(activity_applicants) → userId 채우기 (학번 우선, 이메일 보조).
 * data-split 리팩토링 후: 서버 라우트 /api/auth/link-guest-applicants 로 위임 (Admin SDK).
 * 매칭 키(학번·이메일)는 서버가 인증 사용자의 프로필에서 직접 읽으므로 body 전송 불필요.
 * 시그니처 유지 — 호출처(runSignupFlow) 영향 없음.
 */
export async function linkGuestApplicants(
  _input: LinkerInput,
): Promise<LinkerResult> {
  void _input;
  try {
    const idToken = await auth.currentUser?.getIdToken();
    if (!idToken) {
      console.warn("[guestLinker] applicants linking skipped — no auth token");
      return { linked: 0 };
    }
    const res = await fetch("/api/auth/link-guest-applicants", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({}),
    });
    if (!res.ok) {
      console.warn("[guestLinker] applicants linking failed:", res.status);
      return { linked: 0 };
    }
    const json = (await res.json()) as { linked?: number };
    return { linked: json.linked ?? 0 };
  } catch {
    console.warn("[guestLinker] applicants linking failed");
    return { linked: 0 };
  }
}

/** 게스트 수료증 → recipientUserId 채우기 (학번 우선, 이메일 보조) */
export async function linkGuestCertificates({
  userId,
  studentId,
  email,
}: LinkerInput): Promise<LinkerResult> {
  if (!studentId && !email) return { linked: 0 };
  let linked = 0;
  try {
    const lowerEmail = email?.toLowerCase();
    const res = await certificatesApi.list();
    const certs = (res.data ?? []) as Certificate[];
    for (const c of certs) {
      if (c.recipientUserId) continue;
      const certSid = c.recipientStudentId as string | undefined;
      const certEmail = (c.recipientEmail as string | undefined)?.toLowerCase();
      const matchBySid = !!(studentId && certSid && certSid === studentId);
      const matchByEmail = !!(lowerEmail && certEmail && certEmail === lowerEmail);
      if (!matchBySid && !matchByEmail) continue;
      await certificatesApi.update(c.id, { recipientUserId: userId });
      linked += 1;
    }
  } catch {
    console.warn("[guestLinker] certificates linking failed");
  }
  return { linked };
}

/**
 * 비회원 해커톤 신청(comm_questions) → 로그인 회원 자동 연결.
 * 서버 라우트 /api/auth/link-guest-hackathon 으로 위임 (Admin SDK — guestEmail 매칭·삭제).
 * 시그니처 유지 — 호출처(runAllGuestLinkers) 영향 없음.
 */
export async function linkGuestHackathonApps(
  _input: LinkerInput,
): Promise<LinkerResult> {
  void _input;
  try {
    const idToken = await auth.currentUser?.getIdToken();
    if (!idToken) {
      console.warn("[guestLinker] hackathon linking skipped — no auth token");
      return { linked: 0 };
    }
    const res = await fetch("/api/auth/link-guest-hackathon", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({}),
    });
    if (!res.ok) {
      console.warn("[guestLinker] hackathon linking failed:", res.status);
      return { linked: 0 };
    }
    const json = (await res.json()) as { linked?: number };
    return { linked: json.linked ?? 0 };
  } catch {
    console.warn("[guestLinker] hackathon linking failed");
    return { linked: 0 };
  }
}

/** 위 4종 linker를 순차 실행 */
export async function runAllGuestLinkers(
  input: LinkerInput,
): Promise<{
  attendees: LinkerResult;
  applicants: LinkerResult;
  certificates: LinkerResult;
  hackathon: LinkerResult;
}> {
  const attendees = await linkGuestAttendees(input);
  const applicants = await linkGuestApplicants(input);
  const certificates = await linkGuestCertificates(input);
  const hackathon = await linkGuestHackathonApps(input);
  return { attendees, applicants, certificates, hackathon };
}
