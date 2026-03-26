---
name: yonsei-edtech PM Analysis 2026
description: 연세교육공학회 웹사이트 PM 분석 결과 — 핵심 pain point, 기능 갭, 우선순위
type: project
---

PM 분석 문서 작성 완료: `docs/01-plan/features/pm-analysis-2026.plan.md`

**Why:** 사이트의 기능은 갖춰졌으나 핵심 운영 신뢰성 문제(알림 부재, 세미나 등록 혼용, 학회보 딥링크 없음)가 회원 경험을 저하시키고 있음.

**How to apply:** 향후 기능 개발 우선순위 결정 시 이 문서의 MoSCoW 분류와 Iteration 계획을 참조.

## Must (즉시 해결 필요)
- M-01: 회원 승인/거절 이메일 알림 (이메일 인프라 전무)
- M-02: 세미나 등록 방식 단일화 (toggleAttendance + RegistrationForm 혼용)
- M-03: 가입 신청 후 승인 상태 조회 UI
- M-04: 학회보 URL 딥링크 (/newsletter/[id] 경로 추가)
- M-05: 가입 폼에 기수 입력 필드 추가

## 핵심 아키텍처 결정 필요
- 이메일 발송: Resend API vs Firebase Extensions (Trigger Email)
- 학회보 URL: /newsletter/[id] 신규 라우팅
- 세미나 등록: attendeeIds 배열 방식 vs registrations 컬렉션 방식 통일
