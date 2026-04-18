# 활동 호스트 참가자 대시보드 (Track 7) — 연사/모임장/PM/운영자용 신청자 인사이트

## Context

기존 학술활동 상세 페이지는 **공개·신청 위주**로 설계되어 있어, 활동을 실제로 진행하는 **호스트(연사·모임장·PM·운영자)** 가 신청자 한 명 한 명을 깊이 이해하기 어렵다.

호스트는 다음을 알아야 한다:
- 신청자가 **누구**인지 (단순 이름·이메일 이상)
- 신분 (재학생 / 휴학생 / 졸업생) 및 직업 유형 (학교교사·연구원·박사후·기타)
- **그동안의 학술활동 이력** (세미나·스터디·프로젝트·대외 학술 참여, 발표 경험, 수료증 보유)
- **연구 관심 분야**와 진행 중인 연구물 (연구보고서·연구계획서·논문 작성 상태)
- 학회비 납부 상태, 회원 등급

이 정보를 한곳에서 보면 호스트는 **세션 구성·발표 매칭·과제 난이도 조절·후속 멘토링 추천**을 훨씬 정확하게 할 수 있다.

### 사용자 진술 (2026-04-19)

> "추후 개발 마스터플랜에 학술행사 상세페이지와 구별되는 세미나는 연사, 스터디는 모임장, 프로젝트는 PM(모임장과 동일하지만 다른 용어사용), 대외 학술행사는 운영자만의 별도 페이지를 구현해줬으면 좋겠어(관리자, 운영진, 학회장도 접근 가능한). 단순 신청자 현황 외에 회원DB나 그동안 학술활동 참여현황, 신분(재학생, 휴학생, 졸업생)인지 현재 신분유형(학교교사 기타) 관심분야, 참가자의 연구보고서, 연구계획서, 논문 작성 상태를 비롯한 신청자 정보 현황을 볼 수 있었으면 좋겠어."

---

## 핵심 기능

### F1. 호스트 전용 대시보드 라우트
| 활동 | 호스트 호칭 | 라우트 |
|---|---|---|
| 세미나 | 연사 (Speaker) | `/seminars/[id]/host` |
| 스터디 | 모임장 (Study Host) | `/activities/studies/[id]/host` |
| 프로젝트 | PM (Project Manager) | `/activities/projects/[id]/host` |
| 대외 학술행사 | 운영자 (Coordinator) | `/activities/external/[id]/host` |

- **접근 권한**: 해당 활동에 호스트로 지정된 사용자 + `staff` / `president` / `admin`
- 일반 운영자는 모든 활동의 host 페이지 접근 가능 (운영 효율)
- 호스트 본인은 자신의 활동만 접근

### F2. 신청자 카드 뷰 (참가자 인사이트 카드)
한 명당 카드 한 장. 펼치면 상세.

**카드 헤더**
- 이름 / 프로필 사진 / 역할 배지 (학회장·운영진·회원·졸업생)
- 신분 배지 (재학생 / 휴학생 / 졸업생)
- 직업 유형 (학교교사·연구원·박사후·기타) — Track 2 portfolio.currentRole 활용
- 학번 / 기수 / 누적학기

**카드 본문 (펼침)**
1. **연락처**: 이메일 / 전화 (운영진 권한 한정)
2. **학술활동 참여 이력**:
   - 참여한 세미나 N회 (출석률 %)
   - 발표한 세미나 N회
   - 스터디 N개, 프로젝트 N개
   - 대외 학술발표 N회
   - 보유 수료증 N장
3. **연구 활동 (Track 2 + 연구 트랙)**:
   - 연구 관심 분야 (interests 배열)
   - 진행 중인 연구계획서 N건 + 최신 1건 요약
   - 발표 논문 / 게재 논문 N편
   - 진행 중인 연구보고서 (StudySession·ResearchProposal 연계)
4. **회원 상태**:
   - 학회비 납부 (✓ / ✗ / N년치 미납)
   - 회원 가입일·승인일
5. **호스트 메모** (호스트 본인만 작성·열람 가능):
   - 세션별 인상·후속 액션 메모

### F3. 집계 위젯 (대시보드 상단)
- 총 신청자 N명
- 신분 분포 (재학생/휴학생/졸업생 도넛)
- 직업 분포 (학교교사·박사후·연구원 등 막대)
- 관심분야 워드클라우드 또는 상위 5개 태그
- 평균 학술활동 참여 횟수
- 신청 시간대별 그래프 (선택)

### F4. 액션 도구
- **CSV 내보내기**: 신청자 목록 + 핵심 필드 (호스트가 오프라인 분석)
- **단체 메일/카톡 안내**: Resend 연동 (이미 인프라 존재)
- **세션 자료 배포**: 활동 페이지 자료실에 즉시 업로드
- **참석/불참 출석 체크**: 세미나는 기존 QR 출석 연계

### F5. 대시보드 링크 노출
- 호스트가 본인 활동에 들어왔을 때, 활동 상세 페이지 우측 상단에 **"호스트 대시보드"** 버튼 노출
- 마이페이지 → "내가 진행하는 활동" 위젯에 링크

### F6. 호스트 회고 (Retrospective) — 호스트 본인 작성·운영진 열람
호스트가 활동 종료 후(또는 진행 중) 자신의 운영 회고를 남길 수 있는 영역.

**필드 (3분할 회고 템플릿)**
1. **좋았던 점 (Liked)** — 잘 굴러간 진행/참가자 반응/운영 요소
2. **아쉬웠던 점 (Lacked)** — 시간 부족·자료 미비·참여 저조 등
3. **보완·발전시킬 사항 (Longed for / Next Action)** — 다음 회차 또는 인수인계 시 반영할 개선안

**부가 메타**
- 종합 평점 1~5 (운영자 본인 자평) — 선택
- 후속 액션 태그 (`#재초청`, `#커리큘럼개편`, `#장소변경`, `#예산증액` 등)
- 첨부 이미지/파일 (활동 사진·메모지) — 선택, 최대 3개

**가시성**
- 작성: 활동 호스트 본인만
- 열람: 호스트 본인 + `staff` / `president` / `admin` (운영진 인수인계 가치 ↑)
- 비공개 토글: "초안" 상태로 본인만 보기 가능

**활용 시나리오**
- `/console/host-overview` — 모든 활동 회고 모아보기, 학기말 운영 리뷰 자료
- 신임 호스트가 동일 활동 직전 회차 회고 자동 표시 → 시행착오 감소
- 인수인계 리포트(단계 3 Handover PDF)에 자동 첨부 옵션
- AI 요약: 학기 말 모든 회고를 `gemini-2.5-flash`로 요약 → 학회 운영 리포트 초안 (V2)

**데이터 모델**
```typescript
interface HostRetrospective {
  id: string;
  activityType: "seminar" | "study" | "project" | "external";
  activityId: string;
  hostUserId: string;
  liked: string;        // 좋았던 점 (Markdown)
  lacked: string;       // 아쉬웠던 점
  longedFor: string;    // 보완/발전 사항
  rating?: number;      // 1~5
  followUpTags?: string[];
  attachments?: string[];  // bkend.ai 파일 ID
  status: "draft" | "published";
  createdAt: string;
  updatedAt: string;
}
```

---

## 데이터 모델

### 기존 자산 재활용 (신규 컬렉션 최소)
- `seminars` / `studies` / `projects` / `externalActivities` — `hostUserIds: string[]` 필드 추가 (없으면)
- `applications` (또는 `enrollments`) — 신청자 raw 데이터
- `profiles` — 회원 프로필 (이미 존재)
- `portfolio` (Track 2) — currentRole, interests, education
- `activityLog` — 회원별 학술활동 참여 이력 (이미 dashboard-enhance에서 일부 집계)
- `research_proposals` (방금 추가) / `study_sessions` — 연구물 상태
- `certificates` — 수료증 보유 현황
- `fees` — 학회비 납부

### 신규 또는 수정
```typescript
// 활동별 host 지정 (기존 활동 컬렉션에 필드 추가)
interface SeminarHostable {
  hostUserIds: string[];  // 연사로 지정된 회원 id
  // 기존: speakerName(string) 등은 유지하되 hostUserIds로 매칭
}
interface StudyHostable { hostUserIds: string[]; }
interface ProjectHostable { hostUserIds: string[]; }
interface ExternalActivityHostable { hostUserIds: string[]; }

// 호스트 회고 (활동×호스트 조합) — F6
// → 위 F6 섹션의 HostRetrospective 타입과 동일, 컬렉션명: host_retrospectives

// 호스트 메모 (활동×참가자×호스트 조합)
interface HostNote {
  id: string;
  activityType: "seminar" | "study" | "project" | "external";
  activityId: string;
  participantUserId: string;
  hostUserId: string;
  body: string;            // 호스트 본인만 열람·수정
  tags?: string[];         // 우수참가자, 추천멘토링 등
  createdAt: string;
  updatedAt: string;
}
```

### bkend API 모듈 (신규)
- `hostDashboardApi.getParticipants(activityType, activityId)` — 신청자 + 프로필 + 포트폴리오 + 활동이력 조인
- `hostNotesApi.list / upsert / delete`
- `hostRetrospectivesApi.list / get / upsert / delete` — F6 호스트 회고 CRUD
  - `listByActivity(activityType, activityId)` — 운영진/호스트 본인용
  - `listByHost(hostUserId)` — 호스트 본인의 모든 회고
  - `listForOverview()` — 운영진 전체 보기 (`/console/host-overview`)

---

## Firestore 보안 규칙

```
match /host_notes/{id} {
  allow read: if isAuthenticated()
    && (resource.data.hostUserId == request.auth.uid || isStaffOrAbove());
  allow create: if isAuthenticated()
    && request.resource.data.hostUserId == request.auth.uid;
  allow update, delete: if isAuthenticated()
    && resource.data.hostUserId == request.auth.uid;
}

// F6 호스트 회고 — 호스트 본인 작성, 본인+운영진 열람
match /host_retrospectives/{id} {
  allow read: if isAuthenticated()
    && (resource.data.hostUserId == request.auth.uid
        || (resource.data.status == 'published' && isStaffOrAbove()));
  allow create: if isAuthenticated()
    && request.resource.data.hostUserId == request.auth.uid;
  allow update, delete: if isAuthenticated()
    && resource.data.hostUserId == request.auth.uid;
}

// 호스트 대시보드용 정보 접근 — 클라이언트 조인 시
// 1) seminars/studies/projects/externalActivities: hostUserIds 포함 시 호스트 본인 read 허용
// 2) profiles/portfolio/research_proposals: 호스트는 신청자 본인이 아니지만,
//    bkend.ai 서버 사이드 조인 또는 운영자 권한으로 조회
//    → bkend.ai 서버 함수(예: collection groupQuery)로 가공하여 응답하는 방식 권장.
```

> ⚠️ 보안 정밀화: 호스트가 "자기 활동 신청자만" 보게 하려면 클라이언트 단순 read로는 부족. 가능한 옵션:
> - **(권장)** bkend.ai의 서버 함수로 `getHostParticipants(activityType, activityId)` 엔드포인트 신설 → activity의 hostUserIds 검증 후 데이터 조립.
> - 또는 staff 권한 부여 (호스트=명예 staff)로 Firestore 직접 접근 — 권한 과다 위험.

---

## 페이지 구성

### 호스트 (활동별 진행자)
- `/seminars/[id]/host` — 연사 페이지
- `/activities/studies/[id]/host` — 모임장 페이지 (PM과 컴포넌트 공유)
- `/activities/projects/[id]/host` — PM 페이지 (모임장과 동일 컴포넌트, 호칭만 변경)
- `/activities/external/[id]/host` — 외부 운영자 페이지

### 운영자 (관리자·학회장·운영진)
- 동일 라우트로 모든 호스트 페이지 접근 가능 + `/console/host-overview`(선택) — 모든 활동 호스트 대시보드 인덱스

### 마이페이지 통합
- `/mypage` 위젯: "내가 진행하는 활동" — 본인이 호스트인 활동 목록 + 대시보드 바로가기

---

## 우선순위 단계 (PDCA 사이클)

### Phase 1 — 데이터 모델 + 단일 활동(세미나) 호스트 페이지 (1주)
- `hostUserIds` 필드 추가 (seminars 우선)
- 호스트 권한 헬퍼 (`isHostOrStaff(user, activity)`)
- `/seminars/[id]/host` MVP: 신청자 카드 뷰 (헤더 + 1단계 펼침)
- bkend.ai 서버 함수 또는 클라이언트 조인 결정 + 구현

### Phase 2 — 학술 이력·연구 정보 통합 (1주)
- 신청자별 학술활동 참여 이력 집계 함수
- 연구 트랙 연계 (research_proposals, study_sessions)
- 카드 펼침 본문 완성

### Phase 3 — 다른 활동 유형 확장 (1주)
- studies / projects / external 호스트 페이지 (컴포넌트 90% 재사용, 호칭만 변경)
- 모임장↔PM 호칭만 다르게 — `<HostDashboard role="PM" />` 패턴

### Phase 4 — 액션 도구 + 호스트 회고 (4일)
- CSV 내보내기
- 단체 메일 (Resend 재사용 — 단계 3 인프라)
- 호스트 메모 CRUD
- 집계 위젯 (도넛/막대/태그)
- **F6 호스트 회고**: 좋았던 점/아쉬웠던 점/보완사항 3분할 폼 + 평점 + 태그 + 첨부
  - 활동 종료 시점에 자동 알림 (회고 작성 유도)
  - `/console/host-overview` 운영진 회고 모아보기

### Phase 5 — 마이페이지 통합 + 권한 정밀화 (3일)
- 마이페이지 "내가 진행하는 활동" 위젯
- bkend.ai 서버 함수로 권한 정밀 검증
- E2E 검증

---

## 핵심 파일

### 신규
- `src/app/seminars/[id]/host/page.tsx`
- `src/app/activities/studies/[id]/host/page.tsx`
- `src/app/activities/projects/[id]/host/page.tsx`
- `src/app/activities/external/[id]/host/page.tsx`
- `src/components/host/HostDashboard.tsx` (재사용 컨테이너, role prop으로 호칭 전환)
- `src/components/host/ParticipantCard.tsx`
- `src/components/host/ParticipantInsights.tsx` (학술활동·연구·회원 정보 종합)
- `src/components/host/HostStatsWidget.tsx` (도넛·막대·태그)
- `src/components/host/HostNoteEditor.tsx`
- `src/components/host/HostRetrospectiveSection.tsx` — F6 회고 섹션 (3분할 + 평점 + 태그)
- `src/components/host/HostRetrospectiveList.tsx` — 운영자 보기용 회고 카드 리스트
- `src/app/console/host-overview/page.tsx` — 운영진 회고 모아보기 페이지
- `src/lib/host-helpers.ts` — `isHostOrStaff`, 신청자 데이터 조립

### 수정
- `src/types/index.ts` — Seminar/Study/Project/ExternalActivity에 `hostUserIds` 필드 추가, HostNote 타입
- `src/lib/bkend.ts` — `hostDashboardApi`, `hostNotesApi`
- `firestore.rules` — `host_notes` 규칙
- 활동 상세 페이지 4종 — 우측 상단 "호스트 대시보드" 버튼 (호스트 본인일 때)
- `src/components/mypage/MyPageView.tsx` — "내가 진행하는 활동" 위젯
- bkend.ai 백엔드 — `getHostParticipants` 서버 함수 (별도 협업 필요)

### 재사용 가능한 기존 자산
- Track 2 portfolio (currentRole, interests, education)
- dashboard-enhance 위젯 패턴 (StatCard, MiniChart)
- ResearchProposal / StudySession 데이터
- Resend 이메일 발송 인프라 (단계 3)
- Certificate 발급 데이터

### 기존 세미나 구현 — 표준화 베이스라인 (참고·재사용·일반화)

세미나에는 이미 풍부한 호스트/운영 기능이 구현되어 있다. **Track 7은 새로 만드는 것이 아니라, 세미나에 흩어져 있는 기능을 표준 컴포넌트로 추출하고 study/project/external에 동일하게 적용하는 것**이 핵심 가치다.

| 영역 | 기존 세미나 자산 | Track 7 표준화 방향 |
|---|---|---|
| 호스트 도구 패널 | `src/features/seminar/detail/StaffTools.tsx` (출석체크·보도자료·AI 생성·SNS·메일 버튼) | `<HostToolbar role="speaker|host|pm|coordinator" />` 로 추출, 활동 유형별 노출 도구 변형 |
| 출석/참석 통계 | `src/features/seminar/CheckinDashboard.tsx` (전체/출석/미출석 + 진행률 바 + 참석자 목록) | `<ParticipantsRoster />` 로 일반화 — 활동 유형별 출석 개념 매핑 (스터디=주차별 출석, 프로젝트=마일스톤 참여, 외부=등록 확인) |
| QR 출석 | `/seminars/[id]/checkin` + `QrCodeDisplay`, `QrScanner`, `CheckinResult` | 세미나 한정 유지 (스터디/프로젝트는 적용 X), 단 출석 데이터 모델은 활동 공통 컬렉션으로 통일 검토 |
| 신청 폼 | `SeminarRegistrationForm.tsx` (163 LOC) + `RegistrationSection.tsx` (201 LOC) | 활동 유형별 추가 질문 (스터디=목표·헌신도, 프로젝트=기술 스택, 외부=발표 자료 제출) — 공통 베이스 + slot 패턴 |
| 자료 공유 | `MaterialsSection.tsx`, `SeminarLMS.tsx` (253 LOC) | LMS는 세미나/스터디 공통 적용 (스터디 주차별 자료실 자연스럽게 매핑), 프로젝트는 산출물 트래커, 외부는 발표자료 보관 |
| 후기 | `SeminarReviews.tsx`, `ReviewsSection.tsx`, `/review`, `/speaker-review` | 후기 도메인 모델 통일 — `ActivityReview { activityType, activityId, role: "participant" \| "host", body, rating }` |
| 수료증 | `AttendanceCertificate.tsx` | 활동 공통 수료증 인프라로 일반화 (단계 3 PDF 자동화와 통합) |
| 운영진 도구 위젯 | StaffTools 의 보도자료/AI/SNS/이메일 버튼 | `<HostActionBar />` 로 추출, AI 프롬프트만 활동 유형별 분기 (세미나=발표 요약, 스터디=주차 회고 등) |

#### 표준화 컴포넌트 카탈로그 (신규 — `src/features/shared/host/`)

```
src/features/shared/host/
├── HostDashboardLayout.tsx       # 공통 레이아웃 (히어로 + 탭)
├── HostToolbar.tsx               # 운영진 도구 패널 (StaffTools 일반화)
├── HostActionBar.tsx             # 보도자료·AI·SNS·메일 액션 바
├── ParticipantsRoster.tsx        # 신청자/참석자 카드 리스트 (CheckinDashboard 일반화)
├── ParticipantCard.tsx           # 카드 헤더 (이름·신분·역할 배지)
├── ParticipantInsights.tsx       # 카드 펼침 본문 (학술이력·연구·회원)
├── HostStatsWidget.tsx           # 도넛/막대/태그 집계
├── HostNoteEditor.tsx            # 호스트 메모
└── role-config.ts                # role → 호칭/도구/AI 프롬프트 매핑 테이블
```

`role-config.ts`:
```typescript
export type HostRole = "speaker" | "host" | "pm" | "coordinator";
export const HOST_ROLE_CONFIG: Record<HostRole, {
  label: string;            // "연사" / "모임장" / "PM" / "운영자"
  activityType: "seminar" | "study" | "project" | "external";
  tools: ("checkin" | "lms" | "press" | "ai_press" | "ai_sns" | "ai_email" | "milestone")[];
  aiPromptKey: string;      // AI 프롬프트 분기
}> = {
  speaker:     { label: "연사",   activityType: "seminar",  tools: ["checkin","lms","press","ai_press","ai_sns","ai_email"], aiPromptKey: "seminar" },
  host:        { label: "모임장", activityType: "study",    tools: ["lms","ai_email"], aiPromptKey: "study" },
  pm:          { label: "PM",     activityType: "project",  tools: ["milestone","ai_email"], aiPromptKey: "project" },
  coordinator: { label: "운영자", activityType: "external", tools: ["lms","press","ai_press","ai_sns"], aiPromptKey: "external" },
};
```

#### 단계별 마이그레이션 (회귀 위험 최소화)

각 단계마다 **세미나 동작은 100% 보존**, 표준 컴포넌트는 옵션 플래그로 점진 전환.

1. **Phase 0 — 추출**: 기존 세미나 컴포넌트를 `src/features/shared/host/`로 복사·일반화 (세미나 코드는 건드리지 않음)
2. **Phase 1 — 세미나 → 표준 전환**: 세미나에서 새 컴포넌트 사용으로 교체 + 회귀 테스트
3. **Phase 2 — 스터디/프로젝트/외부 적용**: role-config 만 추가하면 자동 동작
4. **Phase 3 — 도메인 통합**: ActivityReview, 자료 공유, 수료증을 활동 공통 컬렉션으로 마이그레이션 (선택, V2)

#### 회귀 테스트 체크리스트 (Phase 1 종료 시)
- [ ] 세미나 상세 페이지 우측 상단 "운영진 도구" 패널 동작 (출석체크 / 보도자료 / AI 3종)
- [ ] `/seminars/[id]/checkin` QR 스캐너 정상
- [ ] `/seminars/[id]/lms` LMS 자료/공지 노출
- [ ] `/seminars/[id]/review`, `/seminars/[id]/speaker-review` 후기 작성
- [ ] AttendanceCertificate PDF 발급
- [ ] SeminarRegistrationForm 신청 처리

---

## 비기능 요구사항

- **개인정보 보호**: 호스트는 신청자의 연락처 마스킹 옵션 제공 (이메일·전화 일부 가림)
- **모바일 대응**: 카드 뷰 1열, 펼침은 BottomSheet 형태
- **성능**: 신청자 100명 이상에서도 1초 내 렌더 (가상 스크롤 또는 페이지네이션)
- **로깅**: 호스트의 신청자 정보 조회는 audit_log에 기록 (개인정보 접근 추적)
- **권한 정밀화**: 호스트는 본인 활동만, 운영진은 전체 — 클라이언트 가드 + 서버 가드 이중

---

## 검증 (Verification)

- `npx tsc --noEmit` / `npm run build` 통과
- Phase 1 종료: 임의 세미나 호스트로 지정된 회원이 `/seminars/[id]/host` 진입 → 신청자 카드 5장 이상 표시
- Phase 2 종료: 카드 펼침 시 학술이력·연구 정보 정상 노출
- Phase 3 종료: studies / projects / external 동일 패턴 동작
- Phase 4 종료: CSV 다운로드, 단체 메일 발송, 호스트 메모 저장 확인
- Phase 5 종료: 마이페이지 "내가 진행하는 활동" 진입 + 권한 우회 시도 거부

---

## 보류 (V2)

- 신청자 매칭 추천 (관심분야 유사도 기반 클러스터링)
- 세미나 후 자동 발송되는 호스트 리포트 (참가자 인사이트 PDF)
- 호스트 간 신청자 정보 공유 (예: 같은 연구 분야 호스트 추천)
- 신청자가 자신의 정보 노출 범위를 직접 설정 (privacy slider)

---

## 의존성

- Track 2 (학술 포트폴리오) — currentRole, interests 데이터 (이미 완료 ✅)
- Track 3 (수료증·이메일 자동화) — Resend 인프라 (계획 중)
- 단계 7 (회원 타임라인) — 회원별 활동 이력 집계 함수 (계획 중)
- bkend.ai 서버 함수 협업 — `getHostParticipants` (백엔드 작업 필요)

---

## 마스터 로드맵 위치

기존 `bright-sparking-cerf.md` 마스터 플랜에 **Track 7**로 추가:

> ### 단계 8 — Track 7: 활동 호스트 참가자 대시보드 (3주)
> - Phase 1~5 (위 단계)
> - 단계 4(학술활동 통합 격상)와 단계 7(회원 타임라인) 중간에 배치 권장
> - 단계 4의 신청 UI / 단계 7의 회원별 집계 함수와 데이터 공유
