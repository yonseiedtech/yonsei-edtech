/**
 * 운영 콘솔 — 페이지 헤더 이미지 설정 (Sprint 70 보안 정리).
 *
 * /admin/settings/page-headers 가 redirect 누락 orphan 이어서 사용자가 직접 URL 접근 시
 * AuthGuard 우회 가능성 발견. /admin/settings/:path* → /console/settings/:path* redirect 추가하면서
 * 본 페이지를 console 에 추가 (admin 페이지 컴포넌트 그대로 재사용).
 */

export { default } from "@/app/admin/settings/page-headers/page";
