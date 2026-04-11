/**
 * 알림 생성 유틸리티
 * 주요 이벤트 발생 시 호출하여 대상 사용자에게 알림을 생성한다.
 * 향후 모바일 앱 push notification 연동을 위해 서버사이드 API로도 호출 가능한 구조.
 */

import { notificationsApi, profilesApi } from "@/lib/bkend";
import type { NotificationType } from "@/types";

async function create(
  userId: string,
  type: NotificationType,
  title: string,
  message: string,
  link?: string,
) {
  try {
    await notificationsApi.create({
      userId,
      type,
      title,
      message,
      link,
      read: false,
      createdAt: new Date().toISOString(),
    });
  } catch {
    // 알림 생성 실패는 메인 기능을 블로킹하지 않는다
  }
}

/** 승인된 전체 회원 ID 목록 조회 (fan-out용) */
async function getAllMemberIds(excludeUserId?: string): Promise<string[]> {
  try {
    const res = await profilesApi.list({
      "filter[approved]": "true",
      limit: 500,
    });
    const ids = (res.data as unknown as { id: string }[]).map((u) => u.id);
    return excludeUserId ? ids.filter((id) => id !== excludeUserId) : ids;
  } catch {
    return [];
  }
}

/** 전체 회원에게 fan-out 알림 (공지, 세미나, 뉴스레터 등) */
async function fanOut(
  type: NotificationType,
  title: string,
  message: string,
  link?: string,
  excludeUserId?: string,
) {
  const memberIds = await getAllMemberIds(excludeUserId);
  await Promise.all(memberIds.map((id) => create(id, type, title, message, link)));
}

// ── 개별 알림 트리거 ──

export function notifyMemberApproved(userId: string, userName: string) {
  return create(
    userId,
    "member_approved",
    "가입이 승인되었습니다 🎉",
    `${userName}님, 연세교육공학회 회원 가입이 승인되었습니다.`,
    "/dashboard",
  );
}

export function notifyMemberRejected(userId: string, userName: string) {
  return create(
    userId,
    "member_rejected",
    "가입 신청 결과 안내",
    `${userName}님, 회원 가입 신청이 반려되었습니다. 자세한 내용은 관리자에게 문의해 주세요.`,
  );
}

export function notifyComment(
  postAuthorId: string,
  commenterName: string,
  postTitle: string,
  postId: string,
) {
  return create(
    postAuthorId,
    "comment",
    "새 댓글이 달렸습니다",
    `${commenterName}님이 "${postTitle}"에 댓글을 남겼습니다.`,
    `/board/${postId}`,
  );
}

export function notifyNewNotice(
  postTitle: string,
  postId: string,
  authorId?: string,
) {
  return fanOut(
    "notice",
    "새 공지사항",
    postTitle,
    `/notices/${postId}`,
    authorId,
  );
}

export function notifyNewSeminar(
  seminarTitle: string,
  seminarId: string,
  creatorId?: string,
) {
  return fanOut(
    "seminar_new",
    "새 세미나가 등록되었습니다",
    seminarTitle,
    `/seminars/${seminarId}`,
    creatorId,
  );
}

export function notifyCertificateIssued(
  recipientUserId: string,
  seminarTitle: string,
  certType: "completion" | "appreciation",
) {
  const label = certType === "completion" ? "수료증" : "감사장";
  return create(
    recipientUserId,
    "certificate",
    `${label}이 발급되었습니다`,
    `"${seminarTitle}" ${label}이 발급되었습니다.`,
    "/mypage",
  );
}

export function notifyNewsletterPublished(
  newsletterTitle: string,
  issueNumber: number,
  publisherId?: string,
) {
  return fanOut(
    "newsletter",
    "새 학회보가 발행되었습니다",
    `${newsletterTitle} (제${issueNumber}호)`,
    "/newsletter",
    publisherId,
  );
}

export function notifyWaitlistPromoted(
  userId: string,
  seminarTitle: string,
  seminarId: string,
) {
  return create(
    userId,
    "waitlist_promoted",
    "대기열에서 참가 확정되었습니다 🎉",
    `"${seminarTitle}" 세미나에 자리가 생겨 참가가 확정되었습니다.`,
    `/seminars/${seminarId}`,
  );
}

export function notifySeminarReminder(
  userId: string,
  seminarTitle: string,
  seminarId: string,
  daysLeft: number,
) {
  return create(
    userId,
    "seminar_reminder",
    `세미나 D-${daysLeft} 리마인더`,
    `"${seminarTitle}" 세미나가 ${daysLeft}일 후 진행됩니다.`,
    `/seminars/${seminarId}`,
  );
}
