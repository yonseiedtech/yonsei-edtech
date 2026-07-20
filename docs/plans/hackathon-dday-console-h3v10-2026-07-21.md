# H3 v10 — 해커톤 당일 운영 실행 콘솔 (2026-07-21)

> 구현: 2026-07-20 · 행사: 2026-08-22 (D-33) · 담당: v10-H3
> 계획 근거: `docs/plans/service-enhancement-plan-v10-2026-07-21.md` H3 · 리허설 감사 `docs/plans/hackathon-dday-h3v9-2026-07-21.md`

---

## 1. 목표

리허설(v9-H3)은 당일 흐름을 "걸어봤을 뿐" 운영진이 실제로 클릭할 실행 화면이 부재했다.
v10-H3 는 **운영진이 행사 당일 한 화면에서 단계 전환을 실행**하는 콘솔을 구축한다.

- 단계 전환(접수 마감→제출 오픈→제출 마감→심사→수상 공개)을 순서대로 배치한 체크리스트형 실행 화면
- 하드코딩 날짜 의존을 운영자 버튼으로 덮어쓸 수 있게(수동 우선·자동 폴백)
- 현황 위젯: 참가 신청·팀 확정·제출·심사 진행률 실시간 요약(기존 데이터 재사용)
- staff+ 전용 · 파괴적 전환(마감 등)은 confirm

---

## 2. 설계 — 수동 우선·자동 폴백 오버라이드

기존 단계 판정은 `getHackathonPhase()`(날짜 기반)·`isHackathonSubmissionClosed()`(마감 시각 기반)로 순수 계산되어 운영진이 개입할 수 없었다. 이를 **site_settings 오버라이드**(M6v9·H6v8 의 `site_settings` 메커니즘 재사용)로 덮어쓸 수 있게 한다. **신규 컬렉션 없음.**

### 2-1. 저장 구조 (`config.ts` 추가)

| 심볼 | 역할 |
|---|---|
| `HACKATHON_OPS_SETTINGS_KEY = "hackathon_ops"` | site_settings 저장 키 |
| `HackathonOpsOverride { phase, submissionClosed }` | 각 필드 `null` = 자동(날짜) 폴백 |
| `resolveHackathonPhase(override, now)` | `override.phase ?? getHackathonPhase(now)` (수동 우선) |
| `resolveHackathonSubmissionClosed(override, now)` | `override.submissionClosed ?? isHackathonSubmissionClosed(now)` |

기존 `getHackathonPhase`·`isHackathonSubmissionClosed`·`HACKATHON_PHASE_TIMELINE` 는 그대로 유지(자동 폴백 근거).

### 2-2. 공유 훅 (`useHackathonOps.ts` 신규)

`site_settings(key="hackathon_ops")` 를 `siteSettingsApi` 로 read/write (useSiteContent 패턴 준용).

- `useHackathonOps()` → `{ override, recordId, phase, submissionClosed, isManual, isLoading }` (effective 값 = 수동 우선·자동 폴백)
- `useUpdateHackathonOps()` → recordId 있으면 update, 없으면 create (mentoring/page-header 패턴 동일)
- 쿼리 키 `["site_settings","hackathon_ops"]` 를 공개 컴포넌트·콘솔이 공유 → React Query dedupe

### 2-3. 공개 컴포넌트 배선 (오버라이드 실제 반영)

오버라이드가 의미를 가지려면 공개 표면도 effective 값을 읽어야 한다. 3개 소비처를 훅으로 전환:

| 파일 | 변경 |
|---|---|
| `HackathonPhaseTimeline.tsx` | `getHackathonPhase()` → `useHackathonOps().phase` |
| `HackathonAwards.tsx` | `getHackathonPhase()` → `useHackathonOps().phase` |
| `HackathonSubmissions.tsx` | `isHackathonSubmissionClosed()` → `useHackathonOps().submissionClosed` |

> 하이드레이션 안전: 서버·클라이언트 초기 렌더 모두 useQuery data=undefined → 기본값(auto) 사용 → 기존과 동일. 오버라이드 반영은 mount 후 정상 업데이트.

---

## 3. 콘솔 UI — 당일 운영 탭

`console/hackathon` 를 **Tabs 로 재구성**: `당일 운영`(기본) + `심사`(기존 루브릭 콘솔 이관, 로직 무변경).

### 3-1. 현황 위젯 (`HackathonDdayConsole.tsx` 신규 · 기존 컬렉션 재사용)

| 지표 | 출처 |
|---|---|
| 참가 신청 | `comm_boards`(hackathon) → `comm_questions` 건수 |
| 팀 확정 | `hackathon_submissions` 중 `members.length>0` |
| 제출 | `hackathon_submissions` 건수 |
| 심사 진행률 | `hackathon_judgings` 로 심사된 제출 수 / 전체 제출 (%) |

### 3-2. 단계 전환 체크리스트

현재 effective 단계(`phase`+`submissionClosed`)로 완료/활성 표시(스테퍼). 각 스텝 버튼:

| 스텝 | 액션 | confirm |
|---|---|---|
| 접수 마감 · 제출 오픈 | `{ phase:"submission", submissionClosed:false }` | 없음 |
| 제출 마감 | `{ submissionClosed:true }` | **있음** |
| 심사 시작 | `{ phase:"judging", submissionClosed:true }` | **있음** |
| 수상 공개 | `{ phase:"awards" }` | **있음** |
| 자동으로 되돌리기 | `{ phase:null, submissionClosed:null }` (수동 지정 시만 노출) | 없음 |

현재 단계 카드에 `수동 지정`/`자동(날짜)` 배지 + 수동일 때 자동 기준 병기.

---

## 4. 수정·생성 파일

| 파일 | 종류 |
|---|---|
| `src/features/hackathon/config.ts` | 수정 — 오버라이드 타입·resolver 추가 |
| `src/features/hackathon/useHackathonOps.ts` | 신규 — 공유 훅 |
| `src/features/hackathon/HackathonDdayConsole.tsx` | 신규 — 당일 운영 콘솔 |
| `src/features/hackathon/HackathonPhaseTimeline.tsx` | 수정 — effective phase |
| `src/features/hackathon/HackathonAwards.tsx` | 수정 — effective phase |
| `src/features/hackathon/HackathonSubmissions.tsx` | 수정 — effective submissionClosed |
| `src/app/console/hackathon/page.tsx` | 수정 — Tabs(당일 운영/심사) |
| `src/app/console/layout.tsx` | 수정 — nav 라벨 "해커톤 심사"→"해커톤 운영" |

---

## 5. 검증

| 항목 | 결과 |
|---|---|
| `npx tsc --noEmit` | src 에러 0 (exit 0) |
| `npx eslint src --quiet` | 통과 (exit 0 · raw 색상 재유입 0) |
| 신규 컬렉션 | 없음 — `site_settings`·`comm_*`·`hackathon_*` 기존 재사용 |
| build·commit | 미수행(지침 준수) |
