/**
 * wrapped-share — 학기 Wrapped 공유 링크 & 공유 액션 유틸 (성장 백로그 D1 공유 루프).
 *
 * 프라이버시 원칙(엄수):
 *  - 공유 URL 에 개인정보(실명·이메일·userId 등 PII)를 절대 넣지 않는다.
 *  - 부착 쿼리는 경량 익명 태그뿐: 유입 소스(src=wrapped) + 학기키(sem=2026-2).
 *  - 공유 대상은 회원 전용 개인 데이터(/mypage/wrapped)가 아니라 공개 소개 페이지(/about).
 *    → 링크를 받은 게스트가 로그인 벽 없이 학회를 먼저 둘러보는 "자연 초대장".
 */

/** 유입 소스 태그값 — 운영진 대시보드에서 Wrapped 경유 유입을 식별. */
export const WRAPPED_SHARE_SRC = "wrapped";

/** 공유 랜딩 경로 — 공개 접근 가능한 학회 소개 페이지(회원 전용 아님). */
export const WRAPPED_SHARE_PATH = "/about";

/** 프로덕션 절대 URL 폴백(SSR·window 미가용 시). */
const PROD_ORIGIN = "https://yonsei-edtech.vercel.app";

/**
 * 공유용 절대 URL 생성. PII 없이 소스·학기키만 태깅.
 * @param semesterKey "2026-2" 형태의 학기키(선택). 없으면 소스 태그만 부착.
 */
export function buildWrappedShareUrl(semesterKey?: string): string {
  const origin =
    typeof window !== "undefined" && window.location?.origin
      ? window.location.origin
      : PROD_ORIGIN;
  const params = new URLSearchParams({ src: WRAPPED_SHARE_SRC });
  if (semesterKey) params.set("sem", semesterKey);
  return `${origin}${WRAPPED_SHARE_PATH}?${params.toString()}`;
}

export type WrappedShareResult = "shared" | "copied" | "dismissed" | "failed";

/**
 * Web Share API 우선, 미지원 시 클립보드 복사 폴백.
 * navigator 접근·비순수 호출이므로 반드시 이벤트 핸들러 안에서만 호출한다.
 * 결과를 반환해 호출부(뷰)가 toast 피드백을 결정하게 한다.
 */
export async function shareWrapped(
  url: string,
  text: string,
): Promise<WrappedShareResult> {
  if (
    typeof navigator !== "undefined" &&
    typeof navigator.share === "function"
  ) {
    try {
      await navigator.share({
        title: "연세교육공학회 학기 발자취",
        text,
        url,
      });
      return "shared";
    } catch (err) {
      // 사용자가 공유 시트를 취소(AbortError) → 조용히 무시(폴백하지 않음).
      if (err instanceof DOMException && err.name === "AbortError") {
        return "dismissed";
      }
      // 그 외 실패는 아래 클립보드 폴백으로 진행.
    }
  }
  if (
    typeof navigator !== "undefined" &&
    typeof navigator.clipboard?.writeText === "function"
  ) {
    try {
      await navigator.clipboard.writeText(url);
      return "copied";
    } catch {
      return "failed";
    }
  }
  return "failed";
}
