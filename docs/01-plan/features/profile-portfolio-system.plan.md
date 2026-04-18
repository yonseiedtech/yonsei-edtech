# profile-portfolio-system

> Track 2 of `site-enhancement-master-plan-v2.md` — 개인 학술 포트폴리오 시스템

## 목적

모든 활동·산출물·수상·대외활동·콘텐츠 제작이 한 사람의 페이지에서 누적·검증·시각화되고, 졸업 시 단일 PDF로 출력 가능하게 한다.

## 사용자 시나리오

1. **재학생 A**: 세미나 발제 후 발표자료(PDF)와 회고를 본인 활동에 바로 첨부 → 다음 학기 발표 제안 시 근거가 된다.
2. **재학생 B**: 외부 컨퍼런스에서 "연세대 교육대학원 교육공학 석사과정생"으로 발표 → 대외활동에 등록 → 운영진이 검증 → 본인 페이지·졸업 PDF에 출력.
3. **졸업 직전 C**: `/profile/me/portfolio.pdf` 다운로드 → 학술 활동·산출물·수상·대외활동·콘텐츠가 한 권의 PDF로.
4. **운영자 D**: `/console/portfolio-verification` 큐에서 미검증 대외활동/수상을 일괄 승인.

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

### 개인 상세 페이지 섹션 재구성

기존:
1. 기본정보 / Bio
2. 연락처
3. 연구관심
4. 학술활동 (4탭: 세미나·스터디·프로젝트·대외)
5. 연구활동

신규:
1. 기본정보 / Bio
2. 연락처
3. 연구관심
4. **학술활동** (활동별 카드: 제목 + 역할 배지 + 산출물 썸네일 + 회고 펼치기 + 연계수상 배지)
5. **산출물 라이브러리** (Output 그리드: 발표자료/논문/코드 등 type별 필터)
6. **수상** (활동연계 / 단독 분리 표시)
7. **대외활동** (verified만 노출, 본인은 미검증도 표시)
8. **콘텐츠** (인터뷰/큐레이션/뉴스레터/블로그)
9. 연구활동 (기존 RecentPaper 유지)

### 본인 편집 페이지

- `/profile/me/edit` — 위 섹션 각각의 추가/수정/삭제
- 대외활동 등록 후: "검증 대기" 배지 + 운영진 큐 진입

### 운영자 검증 콘솔

- `/console/portfolio-verification` — 대외활동·수상 미검증 큐
- 일괄 승인 / 반려(사유 입력) / 본인에게 알림 전송

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
