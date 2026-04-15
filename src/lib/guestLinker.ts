/**
 * 게스트 레코드(참석자·참가신청자·수료증) → 로그인 회원 자동 연결.
 * bkend API 기반. 로그인 직후·수동 재동기화·임의 linker 실행 모두 지원.
 */
import { attendeesApi, activitiesApi, certificatesApi } from "@/lib/bkend";
import type { Activity, Certificate } from "@/types";

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

/** 게스트 참가 신청(activities.applicants[]) → userId 채우기 */
export async function linkGuestApplicants({
  userId,
  userName,
  email,
}: LinkerInput): Promise<LinkerResult> {
  if (!email) return { linked: 0 };
  let linked = 0;
  try {
    const lower = email.toLowerCase();
    const res = await activitiesApi.list();
    const activities = (res.data ?? []) as Activity[];
    for (const a of activities) {
      const apps = a.applicants ?? [];
      const hasMatch = apps.some((x) => x.isGuest && x.email?.toLowerCase() === lower);
      if (!hasMatch) continue;
      const updated = apps.map((x) =>
        x.isGuest && x.email?.toLowerCase() === lower
          ? { ...x, userId, name: x.name || userName || "", isGuest: false }
          : x,
      );
      await activitiesApi.update(a.id, { applicants: updated });
      linked += 1;
    }
  } catch {
    console.warn("[guestLinker] applicants linking failed");
  }
  return { linked };
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

/** 위 3종 linker를 순차 실행 */
export async function runAllGuestLinkers(
  input: LinkerInput,
): Promise<{ attendees: LinkerResult; applicants: LinkerResult; certificates: LinkerResult }> {
  const attendees = await linkGuestAttendees(input);
  const applicants = await linkGuestApplicants(input);
  const certificates = await linkGuestCertificates(input);
  return { attendees, applicants, certificates };
}
