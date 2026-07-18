/**
 * 공개 프로필 서버 투영 (P1-1, 2026-07-03)
 *
 * 배경: users/{uid} 는 securityAnswerHash·birthDate·calendarToken·연락처까지 담는데,
 * rules `get: if true` 로 비로그인에게 문서 전체가 노출되고 있었다 (QA-v2 Critical 체인).
 * 이제 공개 소비처(QR 명함·프로필 SSR)는 이 투영을 거치고, rules get 은 인증 필수로 상향.
 *
 * 투영 원칙:
 *  - HARD_SECRET: 어떤 뷰어에게도 반환하지 않음 (계정 보안·내부 토큰·법정 개인정보)
 *  - 연락처(email/contactEmail/phone)·SNS: profile-visibility 의 canViewSection 을
 *    서버에서 그대로 실행해 뷰어·via(qr|link) 컨텍스트별로 제거
 *  - 나머지 표시 필드(직함·소속·학기·소개 등)는 기존 프로필 화면 계약 유지
 */

import { getAdminDb } from "./firebase-admin";
import { canViewSection, type ViaParam, type ViewerInfo } from "./profile-visibility";
import type { User } from "@/types";

/** 절대 외부 반환 금지 — 뷰어와 무관 */
const HARD_SECRET_FIELDS = [
  "securityQuestion",
  "securityAnswerHash",
  "calendarToken",
  "studentId",
  "birthDate",
  // 잔디 "연구 쉼표" 사용 기록 — 순수 개인용, 공개 프로필에 노출 금지
  "streakFreezes",
] as const;

export async function getProjectedProfile(
  id: string,
  viewer: ViewerInfo | null,
  via: ViaParam,
): Promise<Partial<User> | null> {
  const snap = await getAdminDb().collection("users").doc(id).get();
  if (!snap.exists) return null;
  const raw = { id: snap.id, ...snap.data() } as User & Record<string, unknown>;
  // 미승인 계정은 공개 투영 대상이 아님 (가입 대기 상태 노출 방지)
  if ((raw as { approved?: boolean }).approved === false) return null;

  const proj = { ...raw } as Record<string, unknown>;
  for (const f of HARD_SECRET_FIELDS) delete proj[f];

  const isSelf = !!viewer?.id && viewer.id === raw.id;
  if (!isSelf) {
    if (!canViewSection("email", viewer, raw, via)) {
      delete proj.email;
      delete proj.contactEmail;
    }
    if (!canViewSection("phone", viewer, raw, via)) {
      delete proj.phone;
    }
    if (!canViewSection("socials", viewer, raw, via)) {
      delete proj.socials;
    }
  }
  return proj as Partial<User>;
}
