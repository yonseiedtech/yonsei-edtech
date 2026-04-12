# [Plan] academic-activities-v2 — 학술활동(스터디/프로젝트/대외) 세미나급 고도화

## 배경
이전에 "세미나와 비슷하게 구현"을 요청받았으나 실제로는 `ActivityList` 단일 컴포넌트로 **간단 CRUD만** 구현되어 있다 (제목/설명/날짜/상태/담당자/참여자/장소/태그). 세미나는 홍보·타임라인·신청/참석·리뷰·수료증·포스터·리포트 등 10+개 하위 기능을 보유하고 있어 격차가 매우 크다.

## 목표
`세미나 완전 동일 수준`으로 스터디·프로젝트·대외학술활동을 격상.
- 활동별 **상세 페이지**
- **홍보 탭**(포스터 생성·공유)
- **타임라인 탭**(마일스톤/주차 일정)
- **신청/참석자 관리**
- **리뷰/후기** 수집
- **수료증**(해당되는 경우 - 스터디·프로젝트는 "수료증/참여증")
- **리포트**(CSV/PDF 내보내기)
- **포스터 생성기** (AI 포스터)

## 범위

### In scope
- `activitiesApi` (bkend.ts) 확장: 신청자/리뷰/타임라인/미디어 서브 컬렉션 엔드포인트
- 활동 데이터 모델 확장: `participants[]`, `timeline[]`, `reviews[]`, `poster`, `promotionHtml`, `certificateTemplate`
- 라우트 신설:
  - `/academic-admin/{studies,projects,external}/[id]/page.tsx` (대시보드)
  - 하위 탭: `promotion`, `timeline`, `registrations`, `reviews`, `certificate`, `poster`, `report`
  - 공개 라우트: `/activities/{type}/[id]` (세미나처럼 회원용 신청 페이지)
- 공통 컴포넌트화: 세미나의 `PromotionTab`, `TimelineTab`, `RegistrationsTab`, `ReviewManagement`, `ReportTab`, `CertificateGenerator`, `PosterGenerator` 를 세미나/활동에서 재사용 가능하도록 리팩터
- 알림 시스템 연동: 신청 접수·리뷰 요청·마감 임박
- `activity-dashboard` 페이지 개선: 활동별 통계 카드

### Out of scope
- 수업/학점 연동 (LMS 통합은 세미나만)
- 활동 간 의존성 그래프

## 핵심 파일/영향 범위

### 신규
- `src/features/activities/ActivityDashboard.tsx`
- `src/features/activities/PromotionTab.tsx`
- `src/features/activities/TimelineTab.tsx`
- `src/features/activities/RegistrationsTab.tsx`
- `src/features/activities/ReviewManagement.tsx`
- `src/features/activities/ReportTab.tsx`
- `src/features/activities/CertificateGenerator.tsx`
- `src/features/activities/PosterGenerator.tsx`
- `src/app/academic-admin/studies/[id]/**` (탭별 페이지)
- `src/app/academic-admin/projects/[id]/**`
- `src/app/academic-admin/external/[id]/**`
- `src/app/activities/[type]/[id]/page.tsx` (공개 상세)

### 리팩터 대상
- `src/features/seminar-admin/PromotionTab.tsx` → `src/features/shared/event-tabs/PromotionTab.tsx` 로 추출 후 양쪽에서 import
- (TimelineTab, RegistrationsTab, ReviewManagement, ReportTab, PosterGenerator, CertificateGenerator 동일)
- `src/lib/bkend.ts` — activitiesApi 확장 (registrations, reviews, timeline CRUD)
- `src/types/index.ts` — Activity 확장

### 데이터 모델 변경 (Activity)
```ts
interface Activity {
  // 기존
  id, type, title, description, date, endDate, status, leader, members[], location, tags[]
  // 신규
  capacity?: number;
  registrationOpen?: boolean;
  posterUrl?: string;
  promotionHtml?: string;
  timeline?: TimelineItem[];
  certificateTemplateUrl?: string;
  coverImageUrl?: string;
}
// 서브 컬렉션
// activities/{id}/registrations/{userId}
// activities/{id}/reviews/{userId}
```

## 수락 기준
- [ ] 스터디/프로젝트/대외 각 유형에서 활동을 만들면 상세 대시보드로 이동 가능
- [ ] 세미나와 동일한 7개 탭(홍보·타임라인·신청·리뷰·수료증·포스터·리포트) 모두 동작
- [ ] 공개 `/activities/{type}/[id]`에서 신청 가능, 비로그인은 로그인 유도
- [ ] 신청 시 알림 발송, 마감 임박 시 리마인더 발송
- [ ] 활동 리뷰 수집·관리, CSV export 가능
- [ ] 수료증/참여증 PDF 다운로드 (세미나와 동일 로직 재사용)
- [ ] 세미나 기능이 리팩터 후에도 회귀 없이 정상 작동

## 리팩터 전략 (중요)
**1단계** 세미나 탭 컴포넌트들을 `features/shared/event-tabs/` 로 이동하면서 prop으로 `entity: "seminar" | "activity"`, `entityId`, `endpoints` 를 주입받도록 일반화.
**2단계** 세미나 페이지가 공통 컴포넌트 사용하도록 교체 → 회귀 테스트.
**3단계** 활동 페이지에서 동일 컴포넌트 재사용.

이 순서를 지켜야 세미나 기능 회귀를 최소화할 수 있다.

## 위험
- 세미나 기능 회귀 가능성 매우 큼 → 단계별 분할 필수, 각 단계 E2E 스모크 테스트
- Firestore 쿼리 복합 인덱스 (이미 `af4344c` 커밋에서 sort 제거한 이력 있음) → 인덱스 사전 정의
- 수료증/포스터 생성은 세미나 고유 데이터 의존 → 활동에 맞는 필드 매핑 필요
- 범위가 크므로 최소 2주 예상

## 예상 일정
- Design: 1일 (탭별 와이어프레임 + 리팩터 계획)
- Do:
  - Phase 1 (공통 컴포넌트 추출 + 세미나 회귀 검증): 2~3일
  - Phase 2 (활동 대시보드 + 탭 적용): 3~4일
  - Phase 3 (공개 신청 페이지 + 알림 연동): 2일
- Check/Report: 1일
- **총 9~11일**
