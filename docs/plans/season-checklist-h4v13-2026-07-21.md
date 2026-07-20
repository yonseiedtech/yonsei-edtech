# H4 구현 보고서 — 시즌 준비 체크리스트 공유화·자동 판정 확대 (v13, 2026-07-21)

## 변경 파일

- `src/app/console/page.tsx` — 유일한 수정 파일

---

## 구현 내용

### 1. 공유 저장 이전 (localStorage → site_settings)

**저장 키**

| 이벤트 | site_settings 키 |
|---|---|
| 해커톤 | `season_checklist_hackathon` |
| 개강 | `season_checklist_semester` |

**데이터 구조** (JSON string in `value` 필드)

```json
{
  "judge_assign": { "done": true, "by": "홍길동", "at": "2026-08-01T10:00:00.000Z" },
  "console_ready": { "done": false }
}
```

- 체크 시: `{ done: true, by: 운영진 표시명, at: ISO timestamp }` 저장
- 체크 해제 시: 해당 키 삭제 (clean state)
- 카드에 `by · 날짜` 표시 (예: "홍길동 · 8월 1일")

**동시 편집 전략**: 항목 단위로 전체 객체를 읽고 해당 키만 수정 후 재저장. 소규모 운영진 환경에서 충분하고, site_settings에 항목 수가 적어 경합 위험 낮음.

**마이그레이션** (localStorage → site_settings, 이벤트당 1회)

- 컴포넌트 마운트 후 Firestore 데이터 로딩 완료 시 `useRef` 플래그로 1회만 실행
- localStorage에 `yedu_season_chk_{evKey}_{itemKey} === "1"`인 항목을 수집
- Firestore에 해당 키가 없는 경우에만 병합 업로드 (Firestore 우선, 덮어쓰기 없음)
- 업로드 후 queryKey invalidate로 즉시 반영

**마이그레이션 대상 항목**

| 이벤트 | 마이그레이션 대상 |
|---|---|
| hackathon | `board_notice`, `judge_assign`, `console_ready` |
| semester | `onboarding`, `welcome_post` |

(기존 localStorage 수동 항목만 — 기존 auto 항목 제외)

---

### 2. 자동 판정 확대

#### 기존 자동 항목 (변경 없음)

| 항목 | 신호 | 이벤트 |
|---|---|---|
| 참가 접수 오픈 | `getHackathonPhase() === "registration"` | 해커톤 |
| 학사일정(2학기) 등록 | `calendarData` 2학기 semesterStart 존재 | 개강 |
| 신규 가입 승인 큐 비움 | `pendingMemberCount === 0` | 개강 |

#### 신규 자동 전환 항목

| 항목 | 변경 전 | 변경 후 | 신호 |
|---|---|---|---|
| 아이디어 보드 공지 게시 | 수동 (null) | **자동** | `comm_boards`(hackathon/HACKATHON_CONTEXT_ID) 게시글(comm_questions) 1건 이상 존재 |
| 온보딩 시퀀스 활성화 확인 | 수동 (null) | **자동** | `/api/console/cron-runs` → `newcomer-activation-sequence` 최근 7일 lastSuccess 존재 |

#### 신규 추가 자동 항목

| 항목 | 신호 | 딥링크(미활성 시) |
|---|---|---|
| 학사정보 캠페인 활성 | `isCampaignLive(campaign) \|\| autoLive` (개강 D-14~D+14 자동 발동) | `/console/settings/academic-status` |

#### 자동 항목 폴백 정책

| 상태 | `auto` 값 | 결과 |
|---|---|---|
| 쿼리 로딩 중 | `null` | 수동 체크 폴백 표시 |
| 쿼리 실패/에러 | `null` (retry: false) | 수동 체크 폴백 표시 |
| 판정 완료 | `true/false` | 자동 체크 상태 표시 |

#### 자동 판정 신호 툴팁

모든 자동 항목에 `autoTooltip` 필드를 추가하고, "자동" 뱃지에 `title={item.autoTooltip}` 병기하여 hover 시 신호 기준 확인 가능.

---

### 3. 항목 정의·문안 (현행 유지)

- 기존 상수·라벨 변경 없음
- 개강 이벤트 항목이 4개 → 5개로 증가 (`campaign_active` 신규 추가)
- 해커톤 이벤트 항목 구성 변경 없음 (4개 유지, board_notice만 수동→자동 전환)

---

## 신규 imports

```ts
import { useState, useRef, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { collection, getDocs, query as fsQuery, where, limit } from "firebase/firestore";
import { ..., siteSettingsApi } from "@/lib/bkend";
import { getHackathonPhase, HACKATHON_CONTEXT_ID } from "@/features/hackathon/config";
import { isCampaignLive } from "@/lib/academic-status";
import { useAcademicStatusCampaign } from "@/features/site-settings/useAcademicStatusCampaign";
```

---

## firestore.rules 판단

`firestore.rules` 기존 규칙:

```
match /site_settings/{settingId} {
  allow read: if true;
  allow write: if isAuthenticated() && getUserRole() in ['president', 'admin', 'sysadmin'];
}
```

- `season_checklist_hackathon`, `season_checklist_semester` 키가 기존 규칙 `site_settings/{settingId}` 패턴으로 **완전 커버됨**
- 콘솔 페이지는 admin/president 전용이므로 쓰기 권한 충족
- **rules 변경 불필요**

---

## 자동 판정 신호표

| 항목 키 | 이벤트 | 신호 소스 | 쿼리 키 |
|---|---|---|---|
| `board_notice` | hackathon | Firestore `comm_questions` where `boardId=hackathonBoardId` | `["console", "hackathon-board-notice-chk"]` |
| `onboarding` | semester | `/api/console/cron-runs` kind=newcomer-activation-sequence | `["console", "cron-runs-chk"]` |
| `campaign_active` | semester | `useAcademicStatusCampaign` + `isCampaignLive` + autoLive | `["site_settings", "academic_status_campaign"]` |

---

## 검증 결과

- `npx tsc --noEmit` → exit code 0 (에러 0)
- `npx eslint src/app/console/page.tsx --quiet` → 출력 없음 (에러 0)

## 수정 금지 대상 (준수 확인)

- `console/cron-logs` → 미수정
- `features/hackathon/**` → 미수정 (HACKATHON_CONTEXT_ID 읽기만)
- `features/dashboard/**` → 미수정
- Firestore rules → 미수정 (기존 규칙으로 커버)
- 카드 구성·역산 로직(v12-H1) → 미변경
