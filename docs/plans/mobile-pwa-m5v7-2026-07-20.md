# M5 — 모바일 경험 개선 (하단 탐색·오프라인 아카이브 읽기·푸시 유도)

- 계획 출처: `docs/plans/service-enhancement-plan-v7-2026-07-20.md` M5 (난이도 M)
- 작업일: 2026-07-20
- 범위 원칙: **점검(실측) 우선 · 필요한 만큼만 보정 · 대공사 금지 · sw.js 캐시 원칙 불가침**

---

## 1. 하단 탐색(BottomNav) 실측 점검표

파일: `src/components/layout/BottomNav.tsx` (baseline 제외 → 시맨틱 토큰만 사용)

| 점검 항목 | 실측 결과 | 판정 | 조치 |
|---|---|---|---|
| 1차 탭 구성 | 디딤판·연구활동·학술활동·커뮤니티·마이 (5) + 더보기 시트(대시보드·**진단평가**·캘린더·세미나·**아카이브**·리더보드·뉴스레터·카드뉴스·회원·도움말) | 적정 | 유지 (Sprint 67-AQ 피드백 반영된 의도적 구성 — 재편 안 함) |
| 핵심 표면 도달성 | 진단평가·아카이브는 더보기 시트에 존재(도달 가능). 모임(`/gatherings`)은 미포함 | 보완 | 아래 활성표시 보완으로 완화. 모임 승격은 대공사라 보류 |
| 활성 상태 표시 (1차 탭) | 상단 인디케이터 바 + 아이콘 scale-110 + text-primary + `aria-current="page"` | 양호 | 유지 |
| 활성 상태 표시 (더보기) | **결함**: `/archive`·`/diagnosis`·`/leaderboard` 등 더보기 항목에 있으면 1차 탭 어느 것도 활성 안 됨 → 하단 바에 위치 신호 소실 | **보완** | 더보기 버튼에 활성표시 추가 (아래) |
| 안전영역(safe-area) | nav `paddingBottom: env(safe-area-inset-bottom)`, 시트 `calc(env(safe-area-inset-bottom) + 1rem)` | 양호 | 유지 |
| 터치 타깃 ≥44px | 1차 탭·더보기 버튼·시트 항목 `min-h-[56px]` / `py-3` | 양호 (≥44px) | 유지 |
| a11y | 시트 포커스 트랩 + Escape 닫기 + `role="dialog" aria-modal` | 양호 | 유지 |
| 색상 | 전부 시맨틱 토큰(primary·card·muted-foreground) | 양호 | 유지 |

### 보정 (최소 diff)
- **더보기 버튼 활성 반영**: 현재 경로가 1차 탭에 없고 더보기 시트 항목에 해당하면 더보기 버튼을 활성 표시.
  - `primaryActive = ITEMS.some(isActive)`, `moreActive = !primaryActive && MORE_ITEMS.some(isActive)`.
  - 1차 탭이 이미 커버하는 `/dashboard`·`/calendar`·`/seminars`에서는 중복 하이라이트가 안 되도록 `!primaryActive` 가드.
  - 1차 탭과 동일한 시각 규약(상단 인디케이터 바 + scale-110 + font-semibold) + `aria-current="page"`.

---

## 2. 오프라인 아카이브 읽기 (설계·구현)

### 원칙: SW 확장 금지 → 클라이언트 로컬 캐시
- `public/sw.js`는 **정적 자산만** 캐시(해시 번들·아이콘·이미지). 과거 `_rsc` 페이로드 캐시로 낡은 페이지가 영구 서빙된 사고로 하드닝됨 → **RSC/HTML 캐시 절대 금지 유지**. 이번 작업은 sw.js를 건드리지 않음.
- 오프라인 "읽기"는 **클라이언트 localStorage 스냅샷**으로 해결. 아카이브 상세(`archive/[type]/[id]`) 한정.

### 신규 모듈: `src/lib/archive-offline-cache.ts`
- `OfflineArchiveItem`: `{ type, id, title, href, body, meta?, cachedAt }` — 본문(정의/설명) 스냅샷 저장.
- 저장소: `localStorage["yet:archive:offline-cache:v1"]`, 최대 **10건**(href 기준 dedup·최신순).
- API: `cacheArchiveDetail()` / `getOfflineArchiveItems()` / `getOfflineArchiveItem(type,id)`.
- SSR·파싱·쿼터 실패는 조용히 무시(best-effort). 서버 저장 없음 → 로그인 무관·개인정보 이슈 없음. (기존 `archive-recent-views.ts` 규약과 동일 계열)

### 상세 페이지 연동: `src/app/archive/[type]/[id]/page.tsx`
- **캐시 적재**: 기존 "최근 본 항목" 기록(`recordRecentView`) 시점에 `cacheArchiveDetail()`도 호출 — 본문(`item.description`) + 타입별 메타(측정도구 원어명·저자 / 변인 유형 / 개념 순화어).
- **오프라인 감지·폴백**: 데이터 로드 `catch`에서 `navigator.onLine === false`이면 토스트 대신
  - 이 항목의 캐시 스냅샷이 있으면 → 저장 본문을 읽기 모드로 표시.
  - 없으면 → 캐시된 "최근 읽은 항목" 목록을 폴백으로 노출.
- **상태 추적**: `online`/`offline` 이벤트 리스너로 `isOffline` 갱신 → 폴백 안내 문구 분기.
- **렌더**: 신규 로컬 컴포넌트 `OfflineArchiveView` — `WifiOff` 배지 + 오프라인 안내 배너 + 본문 카드 + "오프라인에서 읽을 수 있는 최근 항목" 링크 목록.

### 스코프 밖 (의도적 제외)
- 아카이브 리스트·가이드·다른 라우트의 오프라인화 (상세 한정 원칙).
- IndexedDB (텍스트 ~10건 → localStorage로 충분, 오버엔지니어링 회피).

---

## 3. 푸시 유도 점검·개선

| 컴포넌트 | 상태 | 빈도/dedup 정책 | 판정 |
|---|---|---|---|
| `components/pwa/InstallPromptBanner.tsx` (layout 전역) | 활성 | `beforeinstallprompt` 가로채기 + 모바일/coarse-pointer/narrow 조건 + standalone 제외 + **14일 쿨다운**(`pwa_install_dismissed_at`) | 합리적 |
| `features/dashboard/PushPermissionPrompt.tsx` (dashboard) | 활성 | 권한 default일 때만 + **14일 dismiss**(DISMISS_DAYS) + SEMANTIC 톤 토큰. 문구 이미 구체적("수업 30분 전·새 댓글") | 합리적 → 문구 개선 불필요 |
| `components/notifications/PushPermissionPrompt.tsx` | **미사용(dead)** | 어디서도 import 안 됨 | 손대지 않음 (정리는 별도 백로그) |

### 개선 (문구 1줄 · 새 컴포넌트 없음)
- `InstallPromptBanner` 가치 제안을 신규 오프라인 읽기와 연결:
  - 기존: "연세교육공학회를 앱처럼 빠르게 사용하세요."
  - 개선: **"홈 화면에서 바로 열고, 오프라인에서도 최근 본 자료를 읽을 수 있어요."**
- dashboard 푸시 프롬프트 문구는 이미 구체적·강함 → 변경 안 함(스코프 크리프 회피).

---

## 4. 다크모드·시맨틱 토큰 준수
- BottomNav·InstallPromptBanner·offline-cache: 시맨틱 토큰만 (baseline 제외 파일 → raw 팔레트 금지 게이트 대상, 위반 0).
- 상세 페이지 `OfflineArchiveView`: baseline 포함 파일이라 raw 허용되나, amber 안내 배너는 `dark:` 대응 병기(기존 순화어/AECT 배지와 동일 패턴).

---

## 5. 수정·신규 파일
- 신규 `src/lib/archive-offline-cache.ts`
- 수정 `src/app/archive/[type]/[id]/page.tsx` (캐시 적재 + 오프라인 폴백 + `OfflineArchiveView`)
- 수정 `src/components/layout/BottomNav.tsx` (더보기 활성표시)
- 수정 `src/components/pwa/InstallPromptBanner.tsx` (문구 1줄)

## 6. 검증
- `npx tsc --noEmit` → src 에러 **0**.
- `npx eslint src --quiet` → exit **0** (경고 억제, 에러 0). 개별 파일 린트: 에러 0, 기존 경고 1건(BottomNav L105 `set-state-in-effect` — 미변경 라인, 룰=warn).
- build·commit 미수행(지시).
