/**
 * 게스트(비로그인) 참여 닉네임 — localStorage 영속 (2026-06-11)
 *
 * 보드 링크로 접속한 비로그인 사용자가 입장 시 1회 설정하면
 * 질문 작성기·답글 작성기의 이름 기본값으로 공유된다.
 * 로그인 사용자는 본인 이름을 쓰므로 해당 없음.
 */

const KEY = "yedu_comm_guest_name_v1";

export function getGuestNickname(): string {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(KEY) ?? "";
  } catch {
    return "";
  }
}

export function setGuestNickname(name: string): void {
  if (typeof window === "undefined") return;
  try {
    const v = name.trim();
    if (v) window.localStorage.setItem(KEY, v);
    else window.localStorage.removeItem(KEY);
  } catch {
    // storage 차단(시크릿 모드 등) 무시
  }
}
