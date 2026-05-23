# 페이지 컨테이너 일관성 감사 (Page Container Audit)

**작성**: 2026-05-23
**범위**: `src/app/**/page.tsx` + 페이지 wrapper 컴포넌트 (`src/components/**`, `src/features/**`)
**원인 보고**: 사용자가 `/mypage` (`max-w-2xl`) 와 `/mypage/research` (`max-w-6xl`) 의 폭/여백 차이를 보고. 두 페이지는 같은 영역인데도 컨테이너가 다름.

---

## 1. 현황 — wrapper 패턴 빈도

`<div className="mx-auto max-w-* px-* ...">` 패턴을 페이지 진입점에서 추출한 결과 (Footer 등 컴포넌트 내부 컨테이너 제외).

| 패턴 | 페이지 수 | 대표 사례 |
| --- | ---: | --- |
| `mx-auto max-w-2xl px-4` | 5 | `MyPageView` (마이페이지 홈), `seminars/create`, `seminars/[id]/host` 에러 상태, `ProfileDetailView` |
| `mx-auto max-w-3xl px-4` | 14 | `MyActivitiesView`, `ActivityDetail`, `ActivityWeekDetailPage`, `seminars/[id]` 상세, `ai-forum/[id]`, `agents` 에러 상태 |
| `mx-auto max-w-4xl px-4` | 11 | `seminars` 목록, `notices`, `board/interview`, `board/seminar`, `calendar`, `labs/[id]`, `help`, `card-news` 등 |
| `mx-auto max-w-5xl px-4` | 14 | `archive` 그룹, `card-news`, `consent`, `privacy`, `terms`, `newsletter/[id]`, `seminars/[id]/host`, `cron-logs`, `about` |
| `mx-auto max-w-6xl px-4` | 30+ | `dashboard`, `courses`, `activities`, `research`, `members`, `MyResearchView`, `notices/[id]`, `board/[id]`, `ActivityPage`, `home` 섹션 다수 |
| `mx-auto max-w-7xl px-4` | 2 | `console` layout, `network`, `newsletter/[id]/magazine` |
| `container mx-auto max-w-*` | 7 | `archive/**` 그룹 (Phase 3.5/5 작업 중 — 제외) |

추가 가변요소:
- `py-6` / `py-8` / `py-10` / `py-12` / `py-14` / `py-16` 등 7가지 vertical padding 혼재
- `px-4` 표준이지만 일부 `sm:px-6` / `md:p-6` 변형 존재
- 로딩/에러 상태가 본문과 다른 max-w 사용하는 경우 빈번 (사이즈 점프 유발)

---

## 2. 일관성 부족 사례 (사용자 보고 1건 + 발견 4건)

1. **`/mypage` ↔ `/mypage/research` 폭 불일치** (사용자 보고)
   - `MyPageView`: `mx-auto max-w-2xl px-4` + `py-16`
   - `MyResearchView`: `mx-auto max-w-6xl px-4` + `py-12`
   - 같은 마이페이지 영역인데 본문 너비가 3배 차이 (672px ↔ 1152px). 좌우 여백도 페이지 이동 시 점프.

2. **`/mypage` ↔ `/mypage/activities` 폭 불일치**
   - `MyPageView`: `max-w-2xl` (672px)
   - `MyActivitiesView`: `max-w-3xl` (768px)
   - 사이드 메뉴/탭 폭이 페이지 전환마다 달라짐.

3. **`/activities` ↔ `/activities/studies/[id]`**
   - 목록(`ActivityPage`): `max-w-6xl` (1152px)
   - 상세(`ActivityDetail`): `max-w-3xl` (768px)
   - 목록 클릭 → 상세 진입 시 본문이 갑자기 좁아짐.

4. **`/seminars` ↔ `/seminars/[id]` ↔ `/seminars/[id]/host`**
   - `seminars` 목록: `max-w-4xl` (896px)
   - `seminars/[id]` 상세: `max-w-3xl` (768px)
   - `seminars/[id]/host` 정상: `max-w-5xl` (1024px) / 에러 상태: `max-w-2xl`
   - 같은 세미나 동선에서 폭이 3단계로 바뀜.

5. **로딩/에러 상태가 본문과 다름**
   - `alumni/thesis/[id]`: 로딩 `max-w-5xl`, 미발견 `max-w-3xl`, 비공개 `max-w-2xl`, 본문 `max-w-4xl` → 페이지가 어떤 상태인지에 따라 폭이 4가지로 변동.

---

## 3. 권장 표준 — PageContainer variant 매트릭스

`src/components/layout/PageContainer.tsx` 신규 도입.

| variant | max-w | 픽셀 | 용도 |
| --- | --- | ---: | --- |
| `narrow` | `max-w-3xl` | 768px | 글·문서형 페이지 (회원 글, 상세 진입, 일반 인쇄 가능 콘텐츠). |
| `default` | `max-w-5xl` | 1024px | 일반 회원 페이지 (마이페이지, 프로필, 세미나 목록, 알림 등). |
| `wide` | `max-w-7xl` | 1280px | 대시보드·캘린더·콘솔·강의·활동 목록 등 정보 밀도 높은 페이지. |
| `full` | `w-full` | 100% | 풀스크린/랜딩/이미지 도배형. |

vertical padding (py):

| py | 모바일 | 데스크톱 |
| --- | --- | --- |
| `sm` | `py-6` | `py-8` |
| `md` (기본) | `py-8` | `py-12` |
| `lg` | `py-10` | `py-14` |

horizontal padding: 항상 `px-4 sm:px-6` (`wide` 만 `lg:px-8` 추가).

### 적용 예
```tsx
<PageContainer variant="default" py="md">
  <PageHeader … />
  …
</PageContainer>
```

---

## 4. 1차 적용 우선순위 (이번 작업 범위)

사용자 보고 동선부터 가장 빈번하게 방문하는 페이지 그룹까지.

| 페이지 그룹 | variant | py | 기존 폭 → 변경 후 |
| --- | --- | --- | --- |
| `/mypage` (`MyPageView`) | `default` | `md` | `max-w-2xl` → `max-w-5xl` |
| `/mypage/research` (`MyResearchView`) | `default` | `md` | `max-w-6xl` → `max-w-5xl` |
| `/mypage/activities` (`MyActivitiesView`) | `default` | `md` | `max-w-3xl` → `max-w-5xl` |
| `/profile/[id]` (`ProfileDetailView`) | `default` | `md` | `max-w-2xl` → `max-w-5xl` |
| `/dashboard` | `wide` | `md` | `max-w-6xl` → `max-w-7xl` |
| `/courses` 목록 | `wide` | `md` | `max-w-6xl` → `max-w-7xl` |
| `/seminars` 목록 | `default` | `md` | `max-w-4xl` → `max-w-5xl` |
| `/seminars/[id]` 상세 | `narrow` | `md` | `max-w-3xl` → `max-w-3xl` (변경 없음, py·px 표준화) |
| `/activities` 목록 | `wide` | `md` | `max-w-6xl` → `max-w-7xl` |
| `/activities/**/[id]` (`ActivityDetail`) | `default` | `md` | `max-w-3xl` → `max-w-5xl` |
| `/activities/**/[id]/weeks` (`ActivityWeeksPage`) | `default` | `md` | `max-w-5xl` → `max-w-5xl` (py·px 표준화) |
| `/research` | `wide` | `md` | `max-w-6xl` → `max-w-7xl` |
| `ActivityPage` 목록 (학술활동 6종 진입점) | `wide` | `md` | `max-w-6xl` → `max-w-7xl` |

총 1차 적용: **13개 페이지/컴포넌트** (mypage 3·profile 1·dashboard 1·courses 1·seminars 2·activities 3·research 1·activity 1).

### 명시적 제외 (이번 작업 범위 밖)
- `src/app/archive/**` — Phase 3.5/5 작업 중 (사용자 지시)
- `src/app/console/archive/**` — Phase 3.5 작업 중
- `src/features/dashboard/**` 위젯 내부 — 이미 진행 중
- `src/app/console/**` (archive 외) — 기존 일관성 OK, 회귀 위험
- `src/app/admin/**`
- 풀스크린 페이지: `apa-style`, `conference`, `presentation`, `defense practice`, `print` 라우트
- 랜딩: `/`, `/intro`, `home/*` 컴포넌트
- `/calendar` — 1차 제외 (캘린더 그리드와 wrapper 결합 강함, 별도 검토)
- `/console/layout.tsx` — console 전용 max-w-7xl 유지

---

## 5. 후속 권장 (2차/3차)

| 그룹 | 권장 variant | 메모 |
| --- | --- | --- |
| `/seminars/[id]/host` | `default` | 로딩/에러 max-w 정리 우선 |
| `/courses/[id]/schedule` | `wide` | 시간표 그리드 → wide 필요 |
| `/notices`, `/notices/[id]` | `default` / `narrow` | 게시판 그룹 동일 폭 |
| `/board/**` | `default` | 카테고리 전반 일관화 |
| `/members`, `/directory` | `wide` | 카드 그리드 |
| `/newsletter`, `/newsletter/[id]` | `default` | magazine 라우트는 `full` 유지 |
| `/labs`, `/labs/[id]` | `default` | |
| `/steppingstone/**` | `default` | |
| `/about/**` | `wide` (현재 6xl) | 큰 섹션이 다수, 통일은 별도 |
| 정적 정책 페이지 (`/privacy`, `/terms`, `/consent`) | `default` | 모두 `max-w-5xl` 이미 사용 — `default` 매핑 자연스러움 |
| 로딩/에러 wrapper 별도 max-w | `default` | 사이즈 점프 제거 — 본문과 동일 variant 강제 |

장기 목표: 모든 페이지가 `<PageContainer variant=... py=...>` 패턴으로 통일 → wrapper 패턴 7종 → 4종.

---

## 6. 비고

- 본 작업은 **wrapper 만** 교체. 내부 카드 `p-4`, 헤더, 그리드 갭은 손대지 않음.
- `PageHeader` 컴포넌트는 그대로 유지하고 `PageContainer` 안쪽에 둠.
- 모바일 사이드 패딩 `px-4` 보존, 데스크톱에서만 `sm:px-6 lg:px-8` 으로 확장.
- TypeScript strict 유지, 외부 API/queryKey/동작 변경 없음.
