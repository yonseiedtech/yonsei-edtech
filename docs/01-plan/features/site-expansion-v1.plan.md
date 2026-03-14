# Plan: 연세교육공학회 웹사이트 기능 확장 (site-expansion-v1)

> **작성일**: 2026-03-14
> **기반**: 기능 확장 기획 제안서 (4종)

---

## 1. 기능 개요

| # | 기능 | 핵심 가치 | 우선순위 |
|---|------|----------|---------|
| F4 | 프로필 확장 (직업·소속) | 나머지 기능의 데이터 기반 | 1단계 |
| F1 | 외부 연사 프로필 표시 | 세미나 신뢰도 향상 | 2단계 |
| F3 | 운영진 연락망 | 내부 커뮤니케이션 | 3단계 |
| F2 | 보도자료 자동 생성 | 운영 효율화 | 4단계 |

---

## 2. 구현 계획

### F4: 프로필 확장

**타입 변경**: `User` 인터페이스에 소속 정보 필드 추가
- `occupation`: "student" | "corporate" | "teacher" | "researcher" | "freelancer" | "other"
- `affiliation`: string (소속 기관명)
- `department`: string (학과/부서)
- `position`: string (직책/과정)
- `contactEmail`: string (연락용 이메일)
- `contactVisibility`: "public" | "members" | "staff" | "private"

**파일 변경**:
- `types/index.ts`: User 타입 확장
- `features/auth/ProfileEditor.tsx`: 소속 정보 섹션 추가 (신분 유형 select → 조건부 필드)
- `components/members/MemberCard.tsx`: 소속·직책 표시
- `app/members/page.tsx`: MemberData에 소속 정보 추가

### F1: 외부 연사 프로필

**타입 변경**: `Seminar` 인터페이스에 발표자 상세 추가
- `speakerType`: "member" | "guest"
- `speakerAffiliation`: string
- `speakerPosition`: string
- `speakerPhotoUrl`: string

**파일 변경**:
- `types/index.ts`: Seminar 타입 확장
- `features/seminar/seminar-data.ts`: mock 데이터에 외부 연사 예시 추가
- `app/seminars/[id]/page.tsx`: 발표자 카드 UI (내부/외부 구분)
- `components/home/GuestSpeakersSection.tsx` (신규): 홈 "감사한 연사분들" 섹션
- `features/seminar/SeminarForm.tsx`: 등록 폼에 발표자 구분 필드

### F3: 운영진 연락망

**파일 변경**:
- `app/directory/page.tsx` (신규): 운영진·자문위원·역대 회장 탭 테이블
- `Header.tsx`: MEMBER_NAV에 "연락망" 추가
- AuthGuard 보호 (로그인 필수)

### F2: 보도자료 자동 생성

**파일 변경**:
- `app/seminars/[id]/page.tsx`: 운영진용 "보도자료 생성" 버튼 + Dialog
- 템플릿 기반 텍스트 조합 (API 불필요)
- 복사/다운로드 버튼

---

## 3. 구현 순서

```
1. [F4] types/index.ts 타입 확장
2. [F4] ProfileEditor 소속 정보 섹션
3. [F4] MemberCard + members/page.tsx 소속 표시
4. [F1] Seminar 타입 + mock 데이터 외부 연사
5. [F1] 세미나 상세 발표자 카드
6. [F1] 홈 GuestSpeakersSection
7. [F3] 운영진 연락망 페이지
8. [F2] 보도자료 자동 생성 Dialog
9. 빌드 검증
```
