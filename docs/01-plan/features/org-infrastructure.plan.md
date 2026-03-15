# 지속가능한 조직 체계 구축 (org-infrastructure) Planning Document

> **Summary**: 하드코딩된 멤버/운영진 데이터를 DB 기반으로 전환하고, 운영진 교체·인수인계·졸업생 연락망 자체 관리가 가능한 조직 인프라를 구축한다.
>
> **Project**: yonsei-edtech
> **Date**: 2026-03-15
> **Status**: Draft

---

## 1. Overview

### 1.1 Purpose

현재 시스템의 멤버/운영진 데이터가 코드에 하드코딩되어 있어, 매 학기 운영진 교체 시 개발자의 코드 수정이 필수적이다.
이를 DB 기반으로 전환하여 **비개발자 운영진도 자체적으로 조직을 관리**할 수 있게 한다.

### 1.2 Background

연세교육공학회는 학생 자치 학술 조직으로, 매 학기(또는 매년) 운영진이 교체된다.
현재 시스템은 기능적으로 우수하지만, **지속가능성의 핵심인 "사람이 바뀌어도 시스템이 돌아가는 구조"**가 갖춰지지 않았다.

핵심 문제:
1. `/members` 페이지: 12명 MEMBERS 배열 하드코딩
2. `/directory` 페이지: 운영진·자문위원·역대회장 하드코딩
3. 관리자 통계: `ALL_MEMBER_COUNT = 5` 등 상수
4. 졸업생이 자신의 연락처/소속을 직접 수정할 방법 없음
5. 운영진 임기 기록이 없어 인수인계 히스토리 추적 불가

### 1.3 Related Documents

- `docs/02-design/features/bkend-integration.design.md` — bkend API 연동 설계
- `docs/ROLE_PERMISSIONS.md` — 역할별 권한 정의

---

## 2. Scope

### 2.1 In Scope

- [x] 멤버 소개 페이지(`/members`) DB 전환 — 하드코딩 → profilesApi
- [x] 운영진 연락망(`/directory`) DB 전환 — 역할 필터로 동적 조회
- [x] 졸업생/회원 본인 프로필 수정 기능 (마이페이지에서)
- [x] 관리자 회원 관리 실 데이터 연동 (AdminMemberTab)
- [x] 운영진 교체 워크플로우 (역할 일괄 변경 UI)
- [x] 기수별·분야별·역할별 멤버 검색/필터
- [x] 역대 운영진 히스토리 (임기 기록)

### 2.2 Out of Scope (별도 피처)

- 프로필 이미지 업로드 (파일 업로드 인프라 별도 구축)
- 1:1 메시지/채팅 (네트워킹 고도화)
- 외부 학회 활동 관리 시스템
- 학회보 제작 워크플로우
- 소셜 로그인 (Google/Naver)

---

## 3. Requirements

### 3.1 Functional Requirements

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-01 | `/members` 페이지가 bkend users 테이블에서 승인된 회원 목록을 동적으로 조회한다 | High | Pending |
| FR-02 | `/directory` 페이지가 역할 필터(staff/president/advisor)로 운영진을 동적 조회한다 | High | Pending |
| FR-03 | 회원이 마이페이지에서 본인 프로필(소속/직종/연락처/분야/자기소개)을 수정할 수 있다 | High | Pending |
| FR-04 | 프로필 수정 시 bkend API를 통해 서버에 저장된다 | High | Pending |
| FR-05 | AdminMemberTab이 bkend에서 실제 회원 목록을 조회/승인/역할 변경한다 | High | Pending |
| FR-06 | 관리자가 "운영진 교체" UI에서 복수 회원의 역할을 일괄 변경할 수 있다 | Medium | Pending |
| FR-07 | 기수별·분야별·역할별 복합 필터로 멤버를 검색할 수 있다 | Medium | Pending |
| FR-08 | 역대 운영진 히스토리가 별도 테이블에 기록되어 열람할 수 있다 | Low | Pending |
| FR-09 | 연락처 공개 범위(전체/회원/운영진/비공개) 설정이 조회 시 적용된다 | Medium | Pending |

### 3.2 Non-Functional Requirements

| Category | Criteria | Measurement Method |
|----------|----------|-------------------|
| 성능 | 멤버 목록 로딩 < 500ms | Lighthouse |
| 보안 | 비공개 연락처는 해당 범위 외 사용자에게 노출되지 않음 | 수동 검증 |
| 접근성 | 비개발자 운영진이 코드 수정 없이 모든 관리 가능 | 사용성 테스트 |

---

## 4. Success Criteria

### 4.1 Definition of Done

- [ ] `/members` 페이지에 하드코딩된 MEMBERS 배열이 제거되고 API 호출로 대체
- [ ] `/directory` 페이지에 하드코딩된 배열이 제거되고 역할 필터 API 호출로 대체
- [ ] 회원 본인이 마이페이지에서 프로필을 수정하고 서버에 저장 가능
- [ ] AdminMemberTab에서 실제 회원 승인/역할 변경이 bkend에 반영
- [ ] 운영진 교체 시 코드 수정이 필요 없음
- [ ] 빌드 성공 + 기존 기능 정상 작동

### 4.2 Quality Criteria

- [ ] Zero lint errors
- [ ] 빌드 성공
- [ ] Mock 데이터 의존성 제거 (members, directory)

---

## 5. Risks and Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| bkend users 테이블에 데이터가 없어 빈 페이지 표시 | High | High | 초기 데이터 시딩 스크립트 준비 + 빈 상태 UI |
| 기존 Mock 기반 기능이 깨짐 | Medium | Medium | API 실패 시 graceful fallback 유지 |
| 연락처 공개 범위 구현이 bkend RLS로 불가 | Medium | Low | 클라이언트 측 필터링으로 대체 |
| 운영진 교체 시 실수로 잘못된 역할 배정 | Medium | Medium | 변경 전 확인 다이얼로그 + 변경 로그 기록 |

---

## 6. Architecture Considerations

### 6.1 Project Level

- **Dynamic** — bkend.ai BaaS + React Query + Zustand 기존 패턴 유지

### 6.2 Key Architectural Decisions

| Decision | Selected | Rationale |
|----------|----------|-----------|
| 데이터 소스 | bkend.ai users 테이블 | 이미 스키마 정의 + API 클라이언트 완성 |
| 상태 관리 | React Query (server state) | 기존 useBoard 패턴과 동일하게 |
| 멤버 조회 | profilesApi.list() + 필터 | bkend의 filter[role], filter[generation] 활용 |
| 프로필 수정 | profilesApi.update(id, data) | 마이페이지 ProfileEditor에서 호출 |
| 역대 운영진 | role_history 테이블 (신규) | 임기 시작/종료 기록 |

### 6.3 데이터 모델 변경

```
기존 users 테이블 활용 (변경 없음):
- id, email, name, username, role, generation, field
- bio, occupation, affiliation, department, position
- contactEmail, contactVisibility, approved, profileImage

신규 테이블: role_history
- id (auto)
- userId (FK → users)
- role (string)
- startDate (string)
- endDate (string, nullable)
- note (string, 예: "15기 회장")
```

### 6.4 구현 순서

```
1. useMembers.ts 훅 생성 (profilesApi 래핑)
2. /members 페이지 DB 전환 (하드코딩 제거)
3. /directory 페이지 DB 전환 (하드코딩 제거)
4. ProfileEditor API 저장 연동
5. AdminMemberTab 실 데이터 연동
6. 운영진 교체 UI (일괄 역할 변경)
7. (선택) role_history 테이블 + 역대 운영진
```

---

## 7. Convention Prerequisites

### 7.1 기존 컨벤션 확인

- [x] ESLint configuration
- [x] TypeScript strict mode
- [x] Feature-based folder structure (`src/features/`)
- [x] React Query + Zustand fallback 패턴 (useBoard.ts 참고)

### 7.2 환경변수

| Variable | Purpose | 상태 |
|----------|---------|------|
| `NEXT_PUBLIC_BKEND_URL` | bkend API 엔드포인트 | ✅ 설정됨 |
| `NEXT_PUBLIC_BKEND_API_KEY` | bkend API 키 | ✅ 설정됨 |

---

## 8. 사용자 스토리

| 역할 | 스토리 | 우선순위 |
|------|--------|----------|
| 졸업생 | 로그인 후 마이페이지에서 현재 소속/직급을 업데이트할 수 있다 | P0 |
| 방문자 | `/members`에서 기수별 회원 목록을 볼 수 있다 | P0 |
| 회원 | `/directory`에서 현 운영진 연락처를 확인할 수 있다 | P0 |
| 회장 | 관리자에서 신입 회원을 승인하고, 졸업생 역할을 alumni로 변경할 수 있다 | P0 |
| 회장 | 학기 초에 운영진 교체를 일괄 처리할 수 있다 (코드 수정 없이) | P1 |
| 운영진 | 역대 회장/운영진 히스토리를 확인할 수 있다 | P2 |

---

## 9. Next Steps

1. [ ] Design 문서 작성 (`org-infrastructure.design.md`)
2. [ ] bkend users 테이블에 초기 데이터 확인/시딩
3. [ ] 구현 시작

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-15 | Initial draft | Claude |
