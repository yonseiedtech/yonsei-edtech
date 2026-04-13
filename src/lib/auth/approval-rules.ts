import type { User } from "@/types";

const APPROVED_EMAIL_DOMAINS = ["yonsei.ac.kr"];

export interface ApprovalEvaluation {
  qualifying: boolean;
  reasons: string[];
  risk: "low" | "medium" | "high";
}

/**
 * 가입 신청 사용자에 대해 자동 승인 규칙을 평가한다.
 * qualifying=true: 자동 승인 가능 / false: 수동 검토 필요
 */
export function evaluateSignup(user: User, allUsers: User[]): ApprovalEvaluation {
  const reasons: string[] = [];

  // 1. 이름 길이 2자 이상
  if (!user.name || user.name.trim().length < 2) {
    reasons.push("이름이 너무 짧습니다 (2자 이상 필요)");
  }

  // 2. 이메일 도메인 확인
  const email = user.email ?? "";
  const domain = email.split("@")[1] ?? "";
  const domainOk = APPROVED_EMAIL_DOMAINS.includes(domain);
  if (!email) {
    reasons.push("이메일이 없습니다");
  } else if (!domainOk) {
    reasons.push(`이메일 도메인이 승인된 목록에 없습니다 (${email})`);
  }

  // 3. 학번 존재 여부
  if (!user.studentId) {
    reasons.push("학번이 없습니다");
  } else {
    // 4. 중복 학번 확인 (본인 제외)
    const duplicate = allUsers.find(
      (u) => u.id !== user.id && u.studentId === user.studentId && u.approved,
    );
    if (duplicate) {
      reasons.push(`학번 중복: ${user.studentId} (${duplicate.name})`);
    }
  }

  const qualifying = reasons.length === 0;

  // 위험도 평가
  let risk: "low" | "medium" | "high";
  if (qualifying) {
    risk = "low";
  } else if (reasons.length === 1 && !domainOk && email) {
    // 도메인만 미일치 → 중간 위험
    risk = "medium";
  } else {
    risk = "high";
  }

  return { qualifying, reasons, risk };
}

/**
 * 승인 대기 목록을 자동 승인 가능 / 검토 필요로 분리
 */
export function partitionPending(
  pending: User[],
  allUsers: User[],
): { qualifying: User[]; risky: User[] } {
  const qualifying: User[] = [];
  const risky: User[] = [];
  for (const u of pending) {
    const result = evaluateSignup(u, allUsers);
    if (result.qualifying) qualifying.push(u);
    else risky.push(u);
  }
  return { qualifying, risky };
}
