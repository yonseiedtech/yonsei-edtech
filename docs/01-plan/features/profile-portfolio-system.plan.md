# profile-portfolio-system

> Track 2 of `site-enhancement-master-plan-v2.md` — 개인 학술 포트폴리오 시스템

## 핵심 원칙 (사용자 확정 2026-04-19)

> **개인 상세페이지(`/profile/[id]`) = 학술 포트폴리오** — 별도 포트폴리오 페이지를 만들지 않고,
> 기존 개인 상세페이지를 그대로 학술 포트폴리오로 격상한다.
> PDF 출력은 "증명서" 양식으로 개인 상세페이지에서 직접 다운로드 가능하며,
> 운영진 승인(verified) 기능도 동일 페이지에 통합된다.

## 목적

모든 활동·산출물·수상·대외활동·콘텐츠 제작이 **개인 상세페이지(=학술 포트폴리오)** 한 곳에서 누적·검증·시각화되고,
언제든 **증명서 양식의 단일 PDF**로 출력 가능하게 한다.

## 사용자 시나리오

1. **재학생 A**: 세미나 발제 후 발표자료(PDF)와 회고를 본인 활동에 바로 첨부 → 다음 학기 발표 제안 시 근거가 된다.
2. **재학생 B**: 외부 컨퍼런스에서 "연세대 교육대학원 교육공학 석사과정생"으로 발표 → 대외활동에 등록 → 운영진이 **개인 상세페이지의 미검증 배지에서 바로 승인** → 본인 페이지·증명서 PDF에 즉시 반영.
3. **졸업 직전 C**: `/profile/me`에서 "증명서 PDF 다운로드" 클릭 → 학술 활동·산출물·수상·대외활동·콘텐츠가 학회 발급 증명서 양식의 한 권 PDF로.
4. **운영자 D**: 어느 회원의 개인 상세페이지에서든 미검증 항목 옆 "승인" 버튼 → 즉시 verified 처리(별도 큐 없이도 가능). `/console/portfolio-verification`은 **일괄 검토용 보조 진입점**.

## 데이터 모델 변경

### 신규 타입 (src/types/index.ts)

```ts
// ── 활동 참여 (역할·산출물·성장 누적) ──
export type ActivityRole =
  | "leader"
  | "co_leader"
  | "presenter"
  | "facilitator"
  | "participant"
  | "mentor"
  | "mentee"
  | "designer"
  | "researcher"
  | "writer"
  | "operator"
  | "other";

export type ActivityOutputType =
  | "presentation"   // 발표자료
  | "paper"          // 논문/리포트
  | "code"           // 코드/노트북
  | "video"          // 녹화/영상
  | "design"         // 디자인 산출물
  | "report"         // 보고서
  | "dataset"
  | "other";

export interface ActivityOutput {
  id: string;
  type: ActivityOutputType;
  title: string;
  url?: string;
  /** Firestore에 base64 또는 GCS path */
  attachmentPath?: string;
  description?: string;
  createdAt: string;
}

export interface ActivityParticipation {
  id: string;
  activityId?: string;   // Activity.id
  seminarId?: string;    // Seminar.id (둘 중 하나)
  userId: string;
  role: ActivityRole;
  /** 자유 입력 추가 역할 (예: "데이터 분석 담당") */
  roleDetail?: string;
  outputs: ActivityOutput[];
  /** 본인이 적는 회고/성장 */
  growthNotes?: string;
  startedAt: string;
  endedAt?: string;
  /** 운영진 또는 leader 검증 */
  verified: boolean;
  verifiedBy?: string;
  verifiedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// ── 수상 ──
export type AwardScope = "internal" | "external";

export interface Award {
  id: string;
  userId: string;
  title: string;
  organization: string;
  scope: AwardScope;
  /** 활동 연계 수상이면 활동 ID, 아니면 null */
  linkedActivityId?: string;
  date: string;            // YYYY-MM-DD
  description?: string;
  certificatePath?: string; // 상장/증빙
  evidenceUrls?: string[];
  verified: boolean;
  verifiedBy?: string;
  createdAt: string;
  updatedAt: string;
}

// ── 대외활동 ──
export type ExternalActivityType =
  | "lecture"          // 강연
  | "publication"      // 기고/출판
  | "conference"       // 학술대회 발표
  | "panel"            // 패널/세션
  | "community"        // 커뮤니티 운영
  | "media"            // 미디어 출연/인터뷰
  | "consulting"
  | "other";

export interface ExternalActivity {
  id: string;
  userId: string;
  title: string;
  type: ExternalActivityType;
  /** 신분 표기 — 기본값 고정 */
  affiliation: "연세대학교 교육대학원 교육공학 석사과정생";
  organization?: string;   // 주최/매체
  role?: string;           // 발표자, 패널, 작성자 등
  date: string;
  endDate?: string;
  location?: string;
  url?: string;
  description?: string;
  /** 증빙 URL 또는 첨부 (포스터·기사 링크 등) */
  evidenceUrls?: string[];
  evidenceAttachments?: string[];
  verified: boolean;
  verifiedBy?: string;
  verifiedAt?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

// ── 콘텐츠 제작 이력 ──
export type ContentCreationType =
  | "interview_interviewer"
  | "interview_interviewee"
  | "paper_curation"
  | "newsletter_article"
  | "blog"
  | "video"
  | "podcast"
  | "other";

export interface ContentCreation {
  id: string;
  userId: string;
  type: ContentCreationType;
  title: string;
  url?: string;
  /** 사이트 내 자원 ID (인터뷰/뉴스레터 섹션 등) */
  internalRefType?: "interview" | "newsletter_section" | "post";
  internalRefId?: string;
  publishedAt: string;
  description?: string;
  /** 자동 수집된 항목인지 (운영자 수동 등록 X) */
  autoCollected: boolean;
  createdAt: string;
  updatedAt: string;
}
```

### Firestore 컬렉션

| 컬렉션 | 키 패턴 | 인덱스 |
|---|---|---|
| `activity_participations` | autoid | `userId`, `activityId`, `verified` |
| `awards` | autoid | `userId`, `linkedActivityId`, `verified` |
| `external_activities` | autoid | `userId`, `verified`, `date` |
| `content_creations` | autoid | `userId`, `type`, `publishedAt` |

### 기존 시스템 통합

- 기존 인터뷰(`interview_responses`)·뉴스레터 섹션(`newsletter_issues.sections.authorId`) 발생 시 → Cloud Function (또는 client-side trigger) 으로 `content_creations` 자동 적재 (`autoCollected: true`)
- 기존 `Activity.applicants[].status === "approved"` → ActivityParticipation 으로 마이그레이션 (V1 후속)

## 보안 규칙 (firestore.rules)

```
match /activity_participations/{id} {
  allow read: if true; // 프로필 가시성은 클라이언트 + canViewSection 으로 제어
  allow create, update: if isOwnerOrStaff(request.resource.data.userId);
  allow delete: if isStaff();
}
match /awards/{id} {
  allow read: if true;
  allow create, update: if isOwnerOrStaff(request.resource.data.userId);
}
match /external_activities/{id} {
  allow read: if true;
  allow create: if isOwner(request.resource.data.userId);
  allow update: if isOwner(resource.data.userId)
                || (isStaff() && onlyVerificationFields());
  allow delete: if isOwner(resource.data.userId) || isStaff();
}
match /content_creations/{id} {
  allow read: if true;
  allow write: if isStaff(); // 자동 적재 또는 운영자만
}
```

## UI/UX 설계

### 개인 상세 페이지(=학술 포트폴리오) 섹션 재구성

기존:
1. 기본정보 / Bio
2. 연락처
3. 연구관심
4. 학술활동 (4탭: 세미나·스터디·프로젝트·대외)
5. 연구활동

신규 (`/profile/[id]` 단일 페이지가 곧 학술 포트폴리오):
1. **헤더**: 기본정보 / Bio / 신분 배지 / **"증명서 PDF 다운로드" 버튼** (본인 + 운영진만 노출. 다른 회원에게는 verified 항목만 보이는 공개판 PDF 옵션)
2. 연락처
3. 연구관심
4. **학술활동** (활동별 카드: 제목 + 역할 배지 + 산출물 썸네일 + 회고 펼치기 + 연계수상 배지)
5. **산출물 라이브러리** (Output 그리드: 발표자료/논문/코드 등 type별 필터)
6. **수상** (활동연계 / 단독 분리 표시)
7. **대외활동** (verified만 외부 노출, 본인+운영진은 미검증도 표시 + **인라인 "승인" 버튼**)
8. **콘텐츠** (인터뷰/큐레이션/뉴스레터/블로그)
9. 연구활동 (기존 RecentPaper 유지)

### 인라인 승인 워크플로 (페이지 통합)

- 운영진이 개인 상세페이지에 진입했을 때, 미검증(`verified === false`) 항목 옆에 **"승인" / "반려"** 버튼이 직접 노출.
- 별도 큐를 거치지 않고 그 자리에서 verifiedBy/verifiedAt 기록 + 본인에게 토스트 알림.
- 반려 시 사유 입력 모달(짧은 textarea) → `rejectionReason` 저장.

### 본인 편집 모드 (별도 페이지 X, 인라인 토글)

- `/profile/me`에 "편집" 토글 → 각 섹션의 카드에 ✏️/🗑️ 액션 노출.
- 대외활동 등록 후: "검증 대기" 배지가 본인+운영진에게만 보이고, 외부 회원에게는 숨김 처리.

### 운영자 검증 콘솔 (보조 진입점)

- `/console/portfolio-verification` — 미검증 대외활동·수상 일괄 큐 (다수 회원을 한 번에 처리하고 싶을 때).
- 인라인 승인이 1차 채널, 콘솔 큐는 2차 채널.

## 증명서 PDF 양식

- 학회 공식 발급 증명서 톤(상단 학회 로고 + 발급일 + 발급번호 + 회원 사진/이름/소속).
- 본문: 학술활동 / 산출물 / 수상 / 대외활동 / 콘텐츠 / 연구활동을 섹션별 표 + 검증 마크.
- 하단: 학회장 직인(이미지) + "본 증명서는 yonsei-edtech.vercel.app/profile/{id}에서 실시간 검증 가능합니다" QR.
- 폰트: Pretendard / Noto Serif KR 임베드 (한글 OFL).
- **공개판 vs 본인판**: 외부 공유용 PDF는 verified 항목만 포함, 본인 다운로드는 미검증 포함(워터마크 "검증 대기").

## Phase 분할

| Phase | 기간 | 산출 |
|---|---|---|
| Phase 1 | 1주 | 타입 확장 + Firestore 컬렉션 + 운영자 입력 UI 최소판 |
| Phase 2 | 1주 | 개인 상세 페이지 섹션 재설계 (읽기 전용) |
| Phase 3 | 1주 | 본인 편집 UI + 운영자 검증 워크플로 |
| Phase 4 | 1주 | 포트폴리오 PDF (@react-pdf/renderer + Pretendard 임베드) |

## 검증 기준

- [ ] 4가지 신규 타입 모두 `src/types/index.ts`에 export
- [ ] Firestore 보안 규칙 배포 + emulator 테스트
- [ ] 운영자가 한 회원에 대해 대외활동·수상·산출물을 입력하면 그 회원 프로필에 즉시 반영
- [ ] 회원 본인이 대외활동 추가 → "검증 대기" 표시 → 운영자 승인 후 verified 노출
- [ ] PDF 다운로드 시 한글 깨짐 없음 + 5MB 이하
- [ ] `npm run build` 통과
- [ ] match rate ≥ 90%

## Phase 1 작업 체크리스트 (이번 진입)

1. `src/types/index.ts` 타입 4종 추가
2. `src/lib/bkend.ts` 에 4개 API 모듈 추가 (participationsApi, awardsApi, externalActivitiesApi, contentCreationsApi)
3. `firestore.rules` 4개 컬렉션 규칙 추가
4. 운영자 콘솔 최소판:
   - `/console/portfolio` 진입점
   - 회원 검색 → 대외활동/수상/산출물 추가 폼
5. `npm run build` + `npx tsc --noEmit` 통과 확인 후 커밋
