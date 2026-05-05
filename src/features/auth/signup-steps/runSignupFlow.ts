import { toast } from "sonner";
import { authApi, profilesApi, saveTokens } from "@/lib/bkend";
import { runAllGuestLinkers } from "@/lib/guestLinker";
import { auth } from "@/lib/firebase";
import { sha256Hex } from "@/lib/hash";
import { calcGeneration } from "@/lib/generation";
import type { EnrollmentStatus } from "@/types";
import type { UserConsents } from "@/lib/legal";
import type { SignupFormValues } from "./useSignupForm";

/**
 * 회원가입 핵심 플로우 — Firebase Auth + Firestore + bkend + guestLinker.
 * 기존 SignupForm.tsx의 onSubmit 본문에서 추출. SignupMultiStep과 양쪽 공유 가능.
 */
export async function runSignupFlow(
  data: SignupFormValues,
  enrollmentStatus: EnrollmentStatus,
  consents: UserConsents,
): Promise<{ autoApproved: boolean }> {
  // 보안 질문 확정
  const securityQuestion =
    data.securityQuestionSelect === "직접 입력"
      ? (data.securityQuestionCustom || "").trim()
      : data.securityQuestionSelect;
  if (!securityQuestion) {
    throw new Error("보안 질문을 입력하세요.");
  }
  if (!data.securityAnswer || !data.securityAnswer.trim()) {
    throw new Error("보안 질문 답변을 입력하세요.");
  }

  // 휴학/졸업 분기 검증
  if (enrollmentStatus === "on_leave") {
    if (
      !data.leaveStartYear ||
      !data.leaveStartHalf ||
      !data.returnYear ||
      !data.returnHalf
    ) {
      throw new Error("휴학/복학 정보를 모두 입력하세요.");
    }
  }
  if (enrollmentStatus === "graduated") {
    if (!data.thesisTitle || !data.graduationYear || !data.graduationMonth) {
      throw new Error("졸업 정보를 모두 입력하세요.");
    }
  }

  const securityAnswerHash = await sha256Hex(
    data.securityAnswer.trim().toLowerCase(),
  );

  // Firebase Auth + bkend 회원 생성
  const tokens = await authApi.signup({
    email: data.email,
    password: data.password,
    name: data.name,
  });
  saveTokens(tokens.accessToken, tokens.refreshToken);

  // Firestore 프로필 데이터 작성
  const profileData: Record<string, unknown> = {
    username: data.username,
    name: data.name,
    email: data.email,
    memberType: enrollmentStatus === "graduated" ? "alumni" : "student",
    enrollmentStatus,
    generation: calcGeneration(
      data.enrollmentYear ? Number(data.enrollmentYear) : null,
      data.enrollmentHalf ? Number(data.enrollmentHalf) : null,
    ),
    accumulatedSemesters: data.generation ? Number(data.generation) : undefined,
    studentId: data.username || "",
    phone: data.phone || "",
    birthDate: data.birthDate || "",
    enrollmentYear: data.enrollmentYear ? Number(data.enrollmentYear) : null,
    enrollmentHalf: data.enrollmentHalf ? Number(data.enrollmentHalf) : null,
    field: data.field || "",
    privacyAgreedAt: new Date().toISOString(),
    consents,
    securityQuestion,
    securityAnswerHash,
    undergraduateUniversity: data.undergraduateUniversity.trim(),
    undergraduateCollege: data.undergraduateCollege.trim(),
    undergraduateMajor1: data.undergraduateMajor1.trim(),
    undergraduateMajor1IsEducation: !!data.undergraduateMajor1IsEducation,
    undergraduateMajor2: data.undergraduateMajor2?.trim() || "",
    undergraduateMajor2IsEducation: !!data.undergraduateMajor2IsEducation,
  };

  if (enrollmentStatus === "on_leave") {
    profileData.leaveStartYear = Number(data.leaveStartYear);
    profileData.leaveStartHalf = Number(data.leaveStartHalf);
    profileData.returnYear = Number(data.returnYear);
    profileData.returnHalf = Number(data.returnHalf);
  }
  if (enrollmentStatus === "graduated") {
    profileData.thesisTitle = data.thesisTitle;
    profileData.graduationYear = Number(data.graduationYear);
    profileData.graduationMonth = Number(data.graduationMonth) as 2 | 8;
  }

  if (data.activity) profileData.occupation = data.activity;
  if (data.affiliation1) profileData.affiliation = data.affiliation1;
  if (data.affiliation2) profileData.department = data.affiliation2;
  if (data.position) profileData.position = data.position;
  if (data.activity === "corporate" && data.corporateDuty) {
    profileData.corporateDuty = data.corporateDuty;
  }
  if (data.activity === "researcher") {
    if (data.researcherTitle) profileData.researcherTitle = data.researcherTitle;
    if (data.researcherDuty) profileData.researcherDuty = data.researcherDuty;
  }
  if (data.activity === "public") {
    if (data.publicTitle) profileData.publicTitle = data.publicTitle;
    if (data.publicDuty) profileData.publicDuty = data.publicDuty;
  }
  if (data.activity === "freelancer" && data.freelancerNotes) {
    profileData.freelancerNotes = data.freelancerNotes;
  }

  await profilesApi.update("me", profileData);

  // 게스트 레코드 매칭 (참석자·신청자·수료증)
  try {
    const me = await profilesApi.get("me");
    const myId = (me as unknown as { id: string }).id;
    const result = await runAllGuestLinkers({
      userId: myId,
      userName: data.name,
      studentId: data.username || undefined,
      email: data.email || undefined,
    });
    const totalLinked =
      result.attendees.linked +
      result.applicants.linked +
      result.certificates.linked;
    if (totalLinked > 0) {
      const parts: string[] = [];
      if (result.attendees.linked > 0)
        parts.push(`참석 ${result.attendees.linked}건`);
      if (result.applicants.linked > 0)
        parts.push(`신청 ${result.applicants.linked}건`);
      if (result.certificates.linked > 0)
        parts.push(`수료증 ${result.certificates.linked}건`);
      toast.success(
        `이전 활동 기록이 연동되었습니다 (${parts.join(", ")}).`,
      );
    }
  } catch {
    // 연동 실패해도 가입은 진행
  }

  // 자동 승인 시도
  let autoApproved = false;
  try {
    const idToken = await auth.currentUser?.getIdToken();
    if (idToken) {
      const res = await fetch("/api/auth/auto-approve", {
        method: "POST",
        headers: { Authorization: `Bearer ${idToken}` },
      });
      if (res.ok) {
        const json = (await res.json()) as {
          approved?: boolean;
          autoApproved?: boolean;
        };
        if (json.approved) autoApproved = true;
      }
    }
  } catch (autoErr) {
    console.warn("[signup] auto-approve skipped:", autoErr);
  }

  return { autoApproved };
}
