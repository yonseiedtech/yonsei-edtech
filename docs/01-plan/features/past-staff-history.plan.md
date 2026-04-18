# 역대 학회 운영진 이력 (Track 8) — 학기 단위 운영진 스냅샷 + 개인 페이지 연동

## Context

현재 역대 회장만 관리되고 있으며 (`past_presidents` site setting + `PastPresidentsSection`), 운영진 교체는 `staff-admin/transition`에서 단발성 일괄 변경으로 구현되어 있다. **이력은 남지 않고**, 교체 시점에 기존 운영진 role이 `alumni`로 변경되어 누가 언제 어떤 직책이었는지 추적할 수 없다.

본 트랙은 다음을 해결한다:
1. **역대 회장 → 역대 운영진**으로 확장 (회장만 보이던 것을 학기별 전체 운영진 스냅샷으로)
2. **학기 단위 조직 개편 반영** — 회장은 통상 1년/2학기 임기를 유지하지만 부회장·총무·부장 등은 매 학기 바뀌는 경우가 많음
3. **운영진 교체 기능과 연계** — `staff-admin/transition`에서 교체 실행 시 이전 학기 스냅샷이 자동 보존됨
4. **개인 상세 페이지 (`/profile/[id]`)에 운영진 이력 표시** — "이 회원은 26년 1학기 학술부장, 26년 2학기 부회장으로 활동했음"

### 사용자 진술 (2026-04-19)

> "역대 학회장 기능을 역대 학회 운영진 기능으로 수정하는 건이야. 학기 단위로 운영진을 볼 수 있도록 구현이 필요해. 물론 MVP로 표 형태여도 될 것 같아. … 학기 단위로 조직 개편이 있다보니 학회장을 제외하고 나머지 직책들은 매 학기 바뀌는 것도 있어서, 학기 단위 운영진 설정 기능을 구현해주면 좋을 것 같고, 기존 운영진 교체 기능과 연계해서…! 운영진 활동한 이력도 개인 상세페이지에 연동되도록 기능을 구현해줘"

---

## 핵심 기능

### F1. 학기 단위 운영진 스냅샷 (Term Roster)
- 한 학기 = 한 스냅샷 record
- 학기 식별: `year` + `term`(`spring` | `fall`) + 선택적 `generation`(기수)
- 회장은 학기 두 개에 걸쳐 동일 인물이 자주 등장 → 별도 입력 없이 자동 복사 옵션

### F2. 공개 페이지 — 역대 운영진 (`/about/past-staff`)
- **MVP**: 학기별 표 (year/term × position × name)
- 학기 선택기 (드롭다운 또는 사이드 인덱스)
- 회장은 상단에 강조 (사진·기수·임기), 그 아래 표
- 모바일: 카드 리스트 폴백
- (선택) 졸업생 회원 본인 클릭 시 `/profile/[id]` 이동

기존 `/about/history` 와 별도 페이지로 신설 (역사 ≠ 운영진 인사이력).

### F3. 운영진 설정 콘솔 (`/console/settings/past-staff`)
- 기존 `PastPresidentsSection` 확장 → `PastStaffSection`
- 학기 추가 / 학기별 운영진 행 편집 / 학기 복제 ("이전 학기에서 가져오기")
- MVP: 표 입력 (Sheet-style — 행 = 직책, 열 = 입력 필드)
- 학기 자동 정렬 (최신순)

### F4. 운영진 교체 연계 (`staff-admin/transition` 수정)
- 교체 실행 시 **현재 staff/president → past_staff 컬렉션에 자동 스냅샷 기록**
- 다이얼로그에 "이번 교체로 보존될 학기" 선택 (year + term)
- 교체 후 안내: "26년 1학기 운영진 명단이 역대 운영진에 보존되었습니다"

### F5. 개인 페이지 운영진 이력 위젯 (`/profile/[id]`)
- 사용자별 운영진 이력 자동 집계: `past_staff_terms` 에서 `members[].userId == 본인` 검색
- 표시 형식:
  - "26년 1학기 — 학술부장"
  - "26년 2학기 — 부회장"
  - "27년 1~2학기 — 회장 (제 12대)"
- 학기별 클릭 시 `/about/past-staff?term=2026-spring` 으로 이동
- 본인 페이지(`/profile/me`)에서도 동일 노출

### F6. 마이페이지 위젯 (선택)
- "내 운영진 활동 이력" 카드
- 입력 누락 시 "운영진이었던 기억이 있으신가요? 운영진에게 알려 추가받으세요" 링크

---

## 데이터 모델

### 신규 컬렉션: `past_staff_terms`

```typescript
export type SemesterTerm = "spring" | "fall";  // (수강과목과 동일 단순화 — Track 5와 분리)

export interface PastStaffMember {
  /** 직책 (예: "회장", "부회장", "총무", "학술부장", "홍보부장", "대외협력부장", "편집부장", "기타") */
  position: string;
  /** 회원 id (있으면 프로필 연동) */
  userId?: string;
  /** 표시용 이름 (회원이 아닌 경우 또는 표시 우선) */
  name: string;
  affiliation?: string;
  /** 비고 (학번, 추가 역할 등) */
  note?: string;
}

export interface PastStaffTerm {
  id: string;
  year: number;                  // 2026
  term: SemesterTerm;             // "spring" / "fall"
  /** 학회 기수 (회장 임기 기준) */
  generation?: number;
  /** 회장 강조용 빠른 접근 (members 중 position === "회장" 자동 도출 가능) */
  presidentName?: string;
  members: PastStaffMember[];
  /** 운영진 교체 자동 스냅샷 여부 */
  source: "manual" | "transition_auto";
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}
```

### bkend API 모듈 (신규)

```typescript
export const pastStaffTermsApi = {
  list: () => dataApi.list<PastStaffTerm>("past_staff_terms", {
    sort: "year:desc,term:desc", limit: 200,
  }),
  get: (id) => dataApi.get<PastStaffTerm>("past_staff_terms", id),
  /** 특정 회원이 포함된 모든 학기 — 프로필 페이지용 */
  listByUser: async (userId) => {
    // bkend.ai 의 array-contains 쿼리 또는 클라이언트 필터
    const res = await dataApi.list<PastStaffTerm>("past_staff_terms", { limit: 500 });
    return {
      ...res,
      data: res.data.filter((t) => t.members.some((m) => m.userId === userId)),
    };
  },
  create, update, delete,
};
```

### 마이그레이션
- 기존 `past_presidents` site setting 데이터를 일회성 스크립트로 `past_staff_terms` 로 변환
  - 한 회장 = 1 record (term은 임기 처음 학기로 가정 + presidentName 채움)
- 변환 후 `past_presidents` 는 deprecated 표시, 1주 후 삭제

---

## Firestore 보안 규칙

```
match /past_staff_terms/{id} {
  allow read: if true;                                 // 공개
  allow write: if isAuthenticated() && isStaffOrAbove();
}
```

---

## 페이지 구성

### 공개
- `/about/past-staff` — 역대 운영진 (학기 표 + 회장 하이라이트)
- `/profile/[id]` 내 위젯 — 본인 운영진 이력 (회원이 클릭 가능)

### 콘솔 (운영진/학회장)
- `/console/settings/past-staff` — 학기 CRUD + 행 편집 + 복제
- `/staff-admin/transition` — 교체 실행 시 자동 스냅샷 옵션 추가

### 사이드바 / 헤더
- `/about/past-staff` — Header → "학회소개" 그룹에 "역대 운영진" 추가
- `/console/settings/past-staff` — 콘솔 사이드바 "시스템 → 사이트 설정" 하위 또는 별도 메뉴

---

## 우선순위 단계 (PDCA 사이클)

### Phase 1 — 데이터 모델 + 콘솔 입력 + 공개 페이지 (MVP, 1주)
- `PastStaffTerm` 타입 + `pastStaffTermsApi`
- Firestore 규칙
- `/console/settings/past-staff` — 학기별 표 입력 (sheet-style)
- `/about/past-staff` — 학기 표 공개 페이지 (회장 하이라이트 X, 단순 표)
- 기존 `past_presidents` 마이그레이션 스크립트 (1회성)

### Phase 2 — 개인 페이지 연동 (3일)
- `pastStaffTermsApi.listByUser` 구현
- `/profile/[id]` 페이지에 "운영진 이력" 위젯 추가
- `/profile/me` 동일 위젯
- 마이페이지 진입점 카드 (선택)

### Phase 3 — 운영진 교체 연계 (3일)
- `staff-admin/transition` 다이얼로그에 학기 입력 (year + term + generation)
- transitionMutation 성공 시 `past_staff_terms.create` 호출 (source: "transition_auto")
- 교체 후 안내 토스트 + 링크 ("역대 운영진 보러가기")

### Phase 4 — 회장 하이라이트 + UI 완성도 (2일)
- 공개 페이지에서 회장만 카드 형태로 강조 (사진·기수·임기)
- 학기 선택기 + 사이드 인덱스
- 모바일 카드 폴백
- 회원 클릭 시 `/profile/[id]` 이동

### Phase 5 — 정리 (1일)
- `past_presidents` deprecated 처리
- `PastPresidentsSection` 콘솔에서 제거 또는 read-only로 보존 (UX 안내 후 삭제)

---

## 핵심 파일

### 신규
- `src/types/index.ts` — `PastStaffTerm`, `PastStaffMember`, `SemesterTerm` 별도 정의 (Track 5와 분리)
- `src/lib/bkend.ts` — `pastStaffTermsApi`
- `firestore.rules` — `past_staff_terms` 규칙
- `src/app/about/past-staff/page.tsx`
- `src/app/console/settings/past-staff/page.tsx`
- `src/features/admin/settings/PastStaffSection.tsx` (sheet-style 입력)
- `src/components/profile/PastStaffHistoryWidget.tsx`
- `scripts/migrate-past-presidents-to-staff-terms.ts`

### 수정
- `src/features/admin/settings/PastPresidentsSection.tsx` — deprecated 안내 + read-only 모드 (Phase 5)
- `src/app/profile/[id]/page.tsx` — `<PastStaffHistoryWidget userId={id} />` 추가
- `src/app/profile/me/page.tsx` — 동일
- `src/app/staff-admin/transition/page.tsx` — 학기 입력 + 자동 스냅샷
- `src/components/layout/Header.tsx` — "학회소개" → "역대 운영진" 추가
- `src/app/console/settings/layout.tsx` — 사이드바 신규 항목

### 재사용
- `usePastPresidents` 훅 패턴 → `usePastStaffTerms` 동일 구조
- `Section`, `Input`, `Button`, `Badge` 등 기존 UI
- `useAuthStore`, `isStaffOrAbove` 권한 헬퍼
- 운영진 교체 다이얼로그 (transition page) 그대로 활용

---

## 비기능 요구사항

- **공개 정보 신중 처리**: 본명·소속만 노출, 이메일/전화 비노출
- **userId 미연결 케이스**: 졸업한 지 오래된 운영진은 회원 DB에 없을 수 있음 — `name` 만으로도 입력 가능
- **학기 자동 정렬**: 최신 학기가 위로 (UX 일관성)
- **모바일 카드형 폴백**: 표는 모바일에서 가로 스크롤 또는 카드 분해
- **회장 임기 표현**: 통상 1년 → 두 학기 record가 동일 회장 → 공개 페이지에서 회장 카드는 학기 단위가 아닌 임기 단위로 묶어 표시 (presidentName + generation 으로 그룹화)

---

## 검증 (Verification)

- `npx tsc --noEmit` / `npm run build` 통과
- Phase 1 종료: 콘솔에서 26년 1학기 / 26년 2학기 두 학기 입력 → `/about/past-staff` 에 표 노출
- Phase 2 종료: 운영진 회원 한 명 `/profile/[id]` 진입 → "26년 1학기 학술부장 / 26년 2학기 부회장" 자동 노출
- Phase 3 종료: `staff-admin/transition` 에서 "26년 가을 → 27년 봄" 교체 → past_staff_terms 에 26-fall record 자동 생성 + presidentName 보존
- Phase 4 종료: 공개 페이지에 회장만 상단 카드, 임기 그룹화 ("제 12대 회장 — 김연세 — 27년 봄~27년 가을")
- Phase 5 종료: `past_presidents` 콘솔 섹션 제거 또는 read-only, 데이터 100% 마이그레이션 확인

---

## 보류 (V2)

- 운영진 활동 평가/포상 (직책별 평점·표창)
- 직책별 인수인계 자료 자동 연결 (Handover 컬렉션과 매칭)
- 운영진 사진 갤러리 (학기별 단체 사진)
- 자동 임기 만료 알림 (학기 종료 1개월 전 교체 안내 메일)
- "역대 운영진 동문회" 그룹 — 졸업생 + 옛 운영진 별도 분류

---

## 의존성

- 기존 `past_presidents` site setting 데이터 (마이그레이션 대상)
- `profilesApi`, `useAuthStore` (이미 존재)
- `staff-admin/transition` 페이지 (수정 대상 — Phase 3)
- 단계 7(회원 타임라인 — bright-sparking-cerf 마스터 플랜) 와 데이터 공유 (개인 페이지 위젯이 타임라인 진입점이 될 수 있음)

---

## 마스터 로드맵 위치

`bright-sparking-cerf.md` 기준:

> ### 단계 9 — Track 8: 역대 학회 운영진 이력 (1.5주)
> - 단계 5(org-structure-v2) 완료 후 진입 권장 — 직책 시맨틱(advisor/president/vice_president/team_member)과 직접 연계
> - 단계 7(회원 타임라인) 의 개인 페이지 위젯과 데이터 공유
