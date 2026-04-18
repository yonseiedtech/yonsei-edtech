# 수강과목 관리 + 소요조사 (Track 5)

## Context

연세대학교 교육대학원 교육공학전공 재학생/졸업생 대상 학사 관리 기능. **재학생 조교**가 매 학기 필수로 수행하는 두 가지 운영 업무를 디지털화하고, 회원이 본인 학사 이력을 누적·검색·평가할 수 있도록 한다.

### 사용자 컨텍스트 (사용자 직접 진술)

> "방학 중 방학 이후 학기 수강 과목을 수강신청 전에 사전 수강편람이 공식 홈페이지를 통해 공개가 되면, 학생들의 사전 신청 소요조사를 진행해야하고, 이 과정에 필요시 폐강과목이 안나오게 학습자의 조건과 상황에 따라 과목 조정을 권유하기도 해. 그리고 개강하면 종합시험 과목 선정을 위한 소요 조사도 받아야 해서, 관련된 기능 구현도 이번 마스터플랜에 포함되었으면 좋겠어(이건 재학생조교에게 필요한 기능..)"
>
> "위 수강과목 등록 기능과 관련해서는 과거학기들도 소급해서 등록할 수 있도록 별도 페이지 및 체크 기능을 구현해줘. 관리자가 학기별로 개설된 전공과목 리스트를 저장하는 기능도 함께 구현해주고, 그리고 같은 수강과목 관리이지만, 구별될 부분 중 하나가 교직일반 과목, 타전공과목 조회를 통해 해당 과목 상세페이지에서 해당 과목 대한 평가 및 후기, 추천여부와 더불어 수강한 재학생, 졸업생회원이 누구인지 확인할 수 있도록하는 기능도 마스터 플랜에 추가해줘"

---

## 핵심 기능 5종

### F1. 학기별 개설 과목 마스터 (관리자)
- 운영진/조교가 학기별 개설 전공과목 리스트를 등록·수정
- 공식 사전 수강편람을 보고 입력하거나, CSV/엑셀 붙여넣기로 일괄 등록
- 카테고리: 전공필수 / 전공선택 / 교직일반 / 타전공 / 교양 / 연구 / 기타
- 폐강 처리 토글 (active=false 시 노출 차단)

### F2. 회원 본인 수강 이력 등록 (현재 학기)
- `/mypage/courses` — 학기별 본인 수강 과목 체크
- 개설 과목 마스터에서 선택 + 자유 입력 폴백
- 상태: planned(예정) / enrolled(수강 중) / completed(이수) / dropped(중도포기) / cancelled(폐강)

### F3. 과거 학기 소급 등록
- `/mypage/courses/history` 별도 페이지
- 졸업생/재학생이 과거 학기 이수 과목을 한 번에 입력
- `isRetroactive: true` 플래그
- 학번/입학연도 기준 학기 자동 추천 (예: 22년 후기 입학 → 22-fall, 23-spring, ...)

### F4. 사전 수강 + 종합시험 소요조사 (조교)
- 두 가지 타입:
  - `pre_registration` — 방학 중 사전 수강 소요조사
  - `comprehensive_exam` — 개강 후 종합시험 과목 소요조사
- 조교가 설문 생성 → 회원 응답 (선택한 과목 + 학습자 조건 메모)
- 실시간 집계: 과목별 응답 수, 폐강 임계 미만 자동 경고
- 결과: 응답자 명단·연락처(권한 한정), 과목 조정 권유 워크플로우

### F5. 과목 상세 페이지 + 평가/후기 + 수강생 명단
- `/courses/[year]-[term]-[code]` 또는 `/courses/[id]`
- **교직일반/타전공/전공 모두 해당** — 회원이 검색·열람
- 표시 항목:
  - 과목 메타 (개설 학기, 교수, 학점, 분류, 강의계획서 링크)
  - 평가 집계 (난이도/업무량/추천율 평균)
  - 회원 후기 (작성자 동의 시 공개)
  - **수강한 재학생·졸업생 명단** (개인정보 동의자만, 학기 표기)
- 활용: 수강신청 결정, 졸업생 선배에게 질문, 동기 그룹 형성

---

## 데이터 모델 (요약 — 상세는 Design 단계)

### 신규 컬렉션 4종

```typescript
// 학기별 개설 과목 (관리자가 관리)
interface CourseOffering {
  id: string;
  year: number;            // 2026
  term: "spring" | "fall" | "summer" | "winter";
  courseCode?: string;     // EDU5001
  courseName: string;
  professor?: string;
  credits?: number;
  category: "major_required" | "major_elective" | "teaching_general"
          | "other_major" | "general" | "research" | "other";
  schedule?: string;       // "월 18:30-21:00"
  classroom?: string;
  syllabusUrl?: string;
  notes?: string;
  active: boolean;         // false = 폐강
  enrollmentCap?: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// 회원 수강 이력 (현재학기 + 소급)
interface CourseEnrollment {
  id: string;
  userId: string;
  year: number;
  term: SemesterTerm;
  courseId?: string;       // CourseOffering.id (있는 경우)
  courseName: string;      // 자유 입력 폴백
  courseCode?: string;
  professor?: string;
  credits?: number;
  category: CourseCategory;
  grade?: string;          // "A+", "P", "F"
  status: "planned" | "enrolled" | "completed" | "dropped" | "cancelled";
  evaluation?: {
    difficulty?: 1|2|3|4|5;
    workload?: 1|2|3|4|5;
    recommend?: boolean;
    review?: string;
    publicReview?: boolean;
  };
  isRetroactive: boolean;
  /** 명단 공개 동의 */
  publicListing?: boolean;
  createdAt: string;
  updatedAt: string;
}

// 소요조사
type CourseSurveyType = "pre_registration" | "comprehensive_exam";

interface CourseSurvey {
  id: string;
  type: CourseSurveyType;
  title: string;
  description?: string;
  year: number;
  term: SemesterTerm;
  courseIds: string[];     // 조사 대상 (없으면 자유입력)
  minEnrollmentThreshold?: number;
  openAt: string;
  deadline: string;
  status: "draft" | "open" | "closed";
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

interface CourseSurveyResponse {
  id: string;
  surveyId: string;
  userId: string;
  selectedCourseIds: string[];
  conditions?: string;     // 학습자 조건 메모
  note?: string;
  submittedAt: string;
  updatedAt: string;
}
```

### bkend API 모듈 (lib/bkend.ts)
- `courseOfferingsApi`: list / listBySemester / get / create / update / delete
- `courseEnrollmentsApi`: listByUser / listByCourse / get / create / update / delete
- `courseSurveysApi`: list / listOpen / get / create / update / close
- `courseSurveyResponsesApi`: listBySurvey / getByUserAndSurvey / create / update / delete

---

## 페이지 구성

### 회원 (Public/Members)
- `/courses` — 과목 카탈로그 (학기/카테고리 필터, 전공/교직/타전공 탭)
- `/courses/[id]` — 과목 상세 (평가 집계 + 후기 + 수강생 명단)
- `/mypage/courses` — 본인 현재 학기 수강 등록
- `/mypage/courses/history` — 과거 학기 소급 등록
- `/mypage/courses/surveys` — 본인 소요조사 응답

### 운영진/조교 (Console)
- `/console/courses` — 학기별 개설 과목 마스터 관리 (CSV 일괄 등록)
- `/console/course-surveys` — 소요조사 생성/관리
- `/console/course-surveys/[id]` — 응답자 목록 + 과목별 집계 + 폐강 위험 알림
- `/console/courses/insights` — 평가/후기 운영자 뷰 (검열, 신고 처리)

### Header / Sidebar 네비게이션
- 공개: 학술 → 과목 카탈로그 (`/courses`) 추가
- 마이페이지: 카드에 "수강 과목 관리" 추가
- 콘솔 사이드바: 회원 그룹 또는 학술활동 그룹에 "수강과목" 추가

---

## Firestore 보안 규칙 (요약)

```
match /course_offerings/{id} {
  allow read: if true;                              // 공개 카탈로그
  allow write: if isAuthenticated() && isStaffOrAbove();
}

match /course_enrollments/{id} {
  allow read: if isAuthenticated();                 // 회원 명단 권한 한정
  allow create, update: if isOwner(request.resource.data.userId);
  allow delete: if isOwner(resource.data.userId) || isStaffOrAbove();
}

match /course_surveys/{id} {
  allow read: if isAuthenticated();
  allow write: if isStaffOrAbove();
}

match /course_survey_responses/{id} {
  allow read: if isStaffOrAbove() || isOwner(resource.data.userId);
  allow create, update: if isOwner(request.resource.data.userId);
  allow delete: if isOwner(resource.data.userId) || isStaffOrAbove();
}
```

---

## 우선순위 단계 (PDCA 사이클 분할)

### Phase 1 — 데이터 모델 + 관리자 마스터 등록 (1주)
- types + bkend API 4종 모듈
- Firestore 규칙 추가 + 배포
- `/console/courses` 학기별 개설 과목 등록·수정 페이지
- CSV/표 붙여넣기 일괄 등록 유틸

### Phase 2 — 회원 수강 등록 + 소급 (1주)
- `/mypage/courses` 현재 학기 등록
- `/mypage/courses/history` 과거 학기 소급
- 학번 기반 학기 자동 추천 (입학연도 → 학기 리스트)

### Phase 3 — 소요조사 (1.5주, 조교 핵심 기능)
- `/console/course-surveys` 생성/관리
- `/console/course-surveys/[id]` 집계·폐강 위험 대시보드
- 회원 응답 페이지 + 학습자 조건 메모
- 마감 임박 리마인더 이메일 (선택)

### Phase 4 — 과목 상세 + 평가/후기 + 명단 (1주)
- `/courses` 카탈로그 검색
- `/courses/[id]` 평가 집계 + 후기 + 수강생 명단 (동의자만)
- 회원 평가 입력 폼 (난이도/업무량/추천/후기)
- 후기 공개 동의 토글

### Phase 5 — 운영자 인사이트 (선택, 0.5주)
- 학기별 수강 인원 추이
- 과목별 만족도 평균
- 후기 검열·신고 처리

---

## 핵심 파일 (전체 트랙 공통)

### 신규
- `src/types/index.ts` — Track 5 타입 5개 추가 (CourseOffering, CourseEnrollment, CourseSurvey, CourseSurveyResponse + 라벨)
- `src/lib/bkend.ts` — API 모듈 4개 추가
- `firestore.rules` — 4 컬렉션 규칙 추가
- `src/app/courses/page.tsx`, `src/app/courses/[id]/page.tsx`
- `src/app/mypage/courses/page.tsx`, `src/app/mypage/courses/history/page.tsx`
- `src/app/console/courses/page.tsx`
- `src/app/console/course-surveys/page.tsx`, `src/app/console/course-surveys/[id]/page.tsx`

### 수정
- `src/components/layout/Header.tsx` — 학술 메뉴에 "과목 카탈로그" 추가
- `src/components/mypage/MyPageView.tsx` — 카드 "수강 과목 관리" 추가
- `src/app/console/layout.tsx` — 사이드바 "수강과목"/"소요조사" 추가

### 재사용
- `ConsolePageHeader` (콘솔 일관성)
- `Badge`, `Button`, `Input`, `Textarea`, `LoadingSpinner` (UI 토큰)
- `AuthGuard` (인증 게이트)
- `isStaffOrAbove` / `isAtLeast` (권한)

---

## 비기능 요구사항

- **개인정보 동의**: 수강생 명단 공개는 회원 본인이 명시 토글한 경우만 (`publicListing: true`).
- **권한 분리**:
  - 평가/후기 작성: 본인 수강 등록 후 가능
  - 평가/후기 공개: 본인 토글로 결정 (`publicReview: true`)
  - 명단 열람: 로그인 회원만 (비로그인 차단)
- **소급 등록 검증**: 과거 학기 등록 시 학번/입학연도와 모순되는 학기 경고 (예: 25년 입학자가 22년 학기 등록)
- **폐강 알림**: 소요조사 마감 직전, 임계 미만 과목 자동 강조 — 조교가 조정 권유

---

## 검증 (Verification)

- `npx tsc --noEmit` 통과
- `npm run build` 통과
- Phase 1 종료 시: 관리자 1개 학기 분 과목 5건 이상 등록 + 카탈로그 노출 확인
- Phase 2 종료 시: 본인 수강 등록 + 과거 학기 1건 이상 소급 등록 확인
- Phase 3 종료 시: 조사 1건 생성 → 응답 1건 → 집계 정확 확인
- Phase 4 종료 시: 과목 상세에서 평가 집계·명단·후기 표시 + 권한 차단 동작 확인
- Firestore 규칙: `firebase emulators:exec` 또는 수동 권한 시나리오 (조교/회원/비회원) 검증

---

## 의존성

- 현재 `User` 타입의 `studentId`, `enrollmentYear`, `enrollmentHalf` 활용
- 평가 후기 검열 워크플로우는 기존 `posts` 신고 패턴 재사용 가능 (선택)
- 이메일 리마인더는 기존 Resend 인프라 재사용

---

## 보류 (V2)

- 강의평 자동 크롤링 (저작권 이슈 — 회원 수동 입력만)
- 과목 추천 알고리즘 (수강 이력 기반 협업 필터)
- 학점 GPA 자동 계산 (입력 신뢰도 문제)
