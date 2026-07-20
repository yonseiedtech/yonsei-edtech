# H1 구현 보고서 — 개강 D-day 운영 준비 카운트다운 (v12, 2026-07-21)

## 변경 파일

- `src/app/console/page.tsx` — 유일한 수정 파일

## 구현 내용

### 신규 코드 블록 (console/page.tsx 상단 영역)

| 심볼 | 역할 |
|---|---|
| `calcDdayDiff(targetYmd)` | KST 기준 오늘~대상일 일수 계산 (`todayYmdKst` 재사용) |
| `ddayBadge(diff)` | "D-32" / "D-day" / "D+N 지남" 라벨 생성 |
| `SeasonItem` type | 체크리스트 항목 (key·label·auto·href) |
| `SeasonEventDef` type | 이벤트 정의 (key·dateLabel·diff·items 등) |
| `UpcomingSeasonCard` component | 다가오는 시즌 카운트다운 카드 |

### UpcomingSeasonCard 상세

**이벤트 정의 (하드코딩 금지 원칙 준수 — 기존 config 재사용)**

| 이벤트 | 날짜 | D-day (2026-07-21 기준) | 소스 |
|---|---|---|---|
| 에듀테크 해커톤 | 2026-08-22 (토) | D-32 | `HACKATHON_EVENT.date` config 상수 일치 |
| 2026년 후기 개강 | 2026-09-01 (화) | D-42 | 관례 9/1 기준 |

**자동 판정 체크 항목**

| 이벤트 | 체크 항목 | 자동 판정 신호 | 소스 |
|---|---|---|---|
| 해커톤 | 참가 접수 오픈 | `getHackathonPhase() === "registration"` | `features/hackathon/config.ts` 재사용 |
| 개강 | 학사일정(2학기) 등록 | `calendarData.entries.some(e.year===2026 && e.semester==="second" && e.semesterStart)` | `useAcademicCalendar` 재사용 |
| 개강 | 신규 가입 승인 큐 비움 | `pendingData?.total === 0` | 기존 query 재사용 (로딩 중 = null → 수동 표시) |

**수동 체크 항목 (localStorage 영속)**

| 이벤트 | 항목 | 딥링크 |
|---|---|---|
| 해커톤 | 아이디어 보드 공지 게시 | /console/hackathon |
| 해커톤 | 심사위원 배정 완료 | — |
| 해커톤 | 당일 콘솔 세팅 점검 | /console/hackathon |
| 개강 | 온보딩 시퀀스 활성화 확인 | /console/members |
| 개강 | 신입 환영 게시글 준비 | /console/posts |

**localStorage 키 패턴**: `yedu_season_chk_{eventKey}_{itemKey}` = "1"

### JSX 삽입 위치

```
ConsolePageHeader
  ↓
ActionableBanners (승인대기·미답변·학술활동·세미나) ← 긴급 알림 우선
  ↓
UpcomingSeasonCard ← H1 신규 (카운트다운이 큐보다 상단)
  ↓
처리 대기 통합 큐 (H3 기존)
  ↓
StatCards ...
```

### 신규 import (재사용)

```ts
import { getHackathonPhase } from "@/features/hackathon/config";
import { useAcademicCalendar } from "@/features/site-settings/useAcademicCalendar";
import { todayYmdKst } from "@/lib/dday";
// 아이콘: CalendarDays, CheckCircle2, Circle (기존 lucide-react 라인 확장)
```

**신규 컬렉션 0 · 신규 API 엔드포인트 0** — 전량 기존 자산 재사용.

## 검증 결과

- `npx tsc --noEmit` → exit code 0 (에러 0)
- `npx eslint src/app/console/page.tsx --quiet` → 출력 없음 (경고 0)

## 수정 금지 대상 (준수 확인)

- `console/cron-logs` · `api/console/cron-runs` → 미수정 (H2 트랙)
- `features/mypage` · `components/mypage` → 미수정 (H4 트랙)
- `features/admin/settings` · `console/handover` → 미수정 (H3/M4 트랙)
