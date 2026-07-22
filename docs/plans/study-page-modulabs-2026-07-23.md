# 스터디 상세·신청 UX 개선 — 모두랩 참고 (2026-07-23)

## 1. 기존 인프라 실측 결과

### 신청 폼 설정 탭 (form-settings)
- `registrationMethod === "open"` + `isStaff` 조건에서만 표시.
- `type === "external"` → `FormBuilderByType` (공통 폼 + 유형별 폼).
- `type !== "external"` → `FormBuilder` (공통 폼만).
- 저장 필드: `activities.applicationForm: FormField[]` (공통 폼), `activities.applicationFormByType: Partial<Record<ExternalParticipantType, FormField[]>>` (유형별).
- **결론**: 커스텀 질문 시스템이 이미 완비되어 있음 → `applicationQuestions?: string[]` 신규 추가 불필요. 기존 `applicationForm`을 그대로 사용하고 상세 페이지에 미리보기만 추가.

### ApplicantEntry.answers 필드
- `answers?: Record<string, string | string[] | UploadedFile[]>` — 이미 스키마에 존재.
- `activity_applicants` 컬렉션: `write: isAuthenticated() && isStaffOrAbove()` (Firestore rules).
- **결론**: 일반 회원 신청은 반드시 `/api/activities/[id]/apply` Admin SDK 라우트를 거쳐야 함. 해당 라우트는 이미 `answers` 저장을 지원함. **rules 변경 불필요**.

### study/project apply 라우트 동작
- `joinsParticipants = activityType === "study" || activityType === "project"` → 신청 즉시 participants 추가.
- study 신청 후 `status: "pending"` + participants에 합류됨.

### curriculumDesign 구조
- `activity.curriculumDesign?.models: { id: string; name: string }[]`
- 기존 overview 탭에서 이미 모델 명 배지로 표시됨 → 재사용.

### users 문서 활용 필드
- `User.profileImage?: string` — 프로필 사진.
- `User.bio?: string` — 한줄 소개.
- `User.researchInterests?: string[]` — 관심 연구분야 태그.
- `useAllMembers()` 가 이미 `memberMap`으로 로드됨 → 별도 쿼리 불필요.

---

## 2. 스키마 추가 필드 (`activities` 문서 옵셔널)

| 필드 | 타입 | 설명 |
|------|------|------|
| `tagline` | `string?` | 한줄소개 — 상세 상단 표시 |
| `scheduleLabel` | `string?` | 모임 일정 문구 ("매주 목요일 19:00~21:00") |
| `requirements` | `string?` | 참여요건 자유 텍스트 |
| `operation` | `string?` | 운영방식 설명 |

기존 재사용 필드: `location`, `maxParticipants`, `recruitmentStartAt/EndAt`, `registrationMethod`, `tags[]`, `applicationForm[]`, `curriculumDesign`.

---

## 3. 스터디 상세 개요 탭 섹션 순서

```
[썸네일]
[1] 기본 정보 메타 카드
    · 기간 (date ~ endDate)
    · 모임 일정 (scheduleLabel, 미입력 시 미표시)
    · 장소/방식 (location, 미입력 시 미표시)
    · 정원 (participants.length / maxParticipants)
    · 모집 기간 (recruitmentPeriodLabel, 미설정 시 미표시)
    · 선발 방식 (manual→"운영진 직접 선발" / open+질문有→"사전질문 심사" / open+질문無→"선착순")
[2] 한줄소개(tagline) + 태그 칩(tags)
[3] 상세 소개 (description + detailContent)
[4] 운영방식 (operation, 미입력 시 미표시)
[5] 커리큘럼 설계 (curriculumDesign, 기존 컴포넌트 재사용)
[6] 참여요건 (requirements, 미입력 시 미표시)
[7] 사전질문 미리보기 (applicationForm 질문 목록, 없으면 미표시)
[8] 모임장 소개 카드 (leaderId → memberMap → profileImage/bio/researchInterests)
[9] 하단 신청 CTA (모집 중 + open + 미신청 시만 표시)
```

미입력 필드는 모두 미표시(하위호환).

---

## 4. 신청 흐름

```
상세 페이지 CTA
    └─ [study + open + 미신청 + 로그인] → /activities/studies/[id]/apply
    └─ [study + open + 미신청 + 비로그인] → /login?next=.../apply
    └─ [study + manual] → 기존 유지 (운영진 수동 추가)
    └─ [project / external] → 기존 유지

/activities/studies/[id]/apply 페이지
    ├─ 비로그인: 로그인 CTA
    ├─ 이미 신청: "이미 신청하셨습니다" 화면
    ├─ 모집 마감: "모집이 마감되었습니다" 화면
    ├─ 신청 폼: 스터디 요약 헤더 + applicationForm 질문
    │           질문 없으면 기본 "지원 동기" 1문 표시
    └─ 제출 완료: "신청 완료" 화면 + 스터디/목록 링크
```

### 제출 API 사용
- `POST /api/activities/[id]/apply` (기존 라우트)
- Body: `{ answers: Record<string, string> }` (answers 키는 field.id)
- study type → 라우트에서 participants 즉시 합류 (기존 동작 유지)

---

## 5. Firestore rules 판단

- `activity_applicants`: `write: isAuthenticated() && isStaffOrAbove()` → 변경 필요 없음.
- 일반 회원 신청은 Admin SDK(`/api/activities/[id]/apply`)를 통해 우회 → 기존과 동일.
- `answers` 필드는 이미 `ApplicantEntry` 스키마에 존재 → 추가 불필요.

---

## 6. 신청현황 탭 — 답변 열람

- 각 신청자 행에 "사전 답변 보기/접기" 토글 버튼 추가 (운영진만).
- `expandedAnswerKeys: Set<string>` state로 관리.
- `applicationForm` 필드 레이블과 매칭해 답변 표시; 레이블 미매칭 시 답변 키로 표시.

---

## 7. 변경 파일 목록

| 파일 | 변경 내용 |
|------|-----------|
| `src/types/academic.ts` | Activity 인터페이스에 tagline/scheduleLabel/requirements/operation 추가 |
| `src/features/activities/ActivityInfoEditor.tsx` | 4개 필드 state/useEffect/save/UI 추가 (비-external 조건) |
| `src/features/activities/ActivityDetail.tsx` | 개요 탭 스터디 전용 레이아웃·하단 CTA·CTA Link 전환·신청현황 답변 펼침 |
| `src/app/activities/studies/[id]/apply/page.tsx` | 신규: 사전질문 신청 페이지 |
