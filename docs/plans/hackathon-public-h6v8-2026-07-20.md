# 해커톤 공개 페이지 실전 완성 — H6 구현 보고서 (v8, 2026-07-20)

> 트랙 C · D-33 (행사: 2026-08-22)

---

## 1. 구현 요약

계획서(`service-enhancement-plan-v8-2026-07-20.md`) H6 갭 3종 전량 보정:

| 갭 | 기존 상태 | 구현 후 |
|---|---|---|
| 단계별 상태 타임라인 | 없음 | `HackathonPhaseTimeline` — 4단계 스테퍼 + 현재 단계 강조 |
| D-day 카운트다운 | 히어로 배지 라벨만 (정적) | 실시간 일·시간·분·초 카운트다운 (1초 갱신) |
| 수상작 행사 전 안내 | `return null` (완전 숨김) | 단계별 상태 기계: 예정 플레이스홀더 / 심사 중 / 공개 갤러리 |
| 대시보드 참가 CTA | 없음 | `HackathonCtaBanner` — 행사 종료 전까지 노출, 1회 닫기 |

---

## 2. 수정 파일

### 2-1. `src/features/hackathon/config.ts` (수정)
- `HackathonPhaseKey` 타입 (`registration | submission | judging | awards`)
- `HackathonPhaseInfo` 인터페이스
- `HACKATHON_PHASE_TIMELINE` — 4단계 정의 (startDate 기반, 운영진 갱신용)
- `getHackathonPhase(now?)` — 오늘 날짜 → 현재 단계 판정 순수 함수
- `HACKATHON_AWARDS_ANNOUNCE_DATE` — 수상 발표 예정 날짜 (`2026-08-29`, 잠정)

### 2-2. `src/features/hackathon/HackathonPhaseTimeline.tsx` (신규)
- `"use client"` — 1초마다 `setInterval` 카운트다운
- 4단계 스테퍼 (완료: CheckCircle2 success색 / 현재: Circle primary색 / 예정: 흐림)
- 현재 단계 설명 문구
- 카운트다운 블록 (registration 단계만, hydration 안전: mount 후 노출)
- 행사 시작 기준: 2026-08-22 10:00 KST = UTC 01:00

### 2-3. `src/features/hackathon/HackathonCtaBanner.tsx` (신규)
- `"use client"` — localStorage dismiss (키: `yedu_hackathon_cta_v1_2026-08-22`)
- 행사 종료(past) 이후 자동 숨김 (`formatDday` 재사용)
- hydration 안전: `visible` 초기값 false → mount 후 localStorage 확인 후 노출
- 터치 타깃 보강 (`touch-manipulation`)

### 2-4. `src/features/hackathon/HackathonAwards.tsx` (수정)
- `getHackathonPhase()` / `HACKATHON_AWARDS_ANNOUNCE_DATE` import 추가
- 단계별 상태 기계:
  - `registration | submission` → 수상 발표 예정 플레이스홀더 (모든 방문자)
  - `judging` + 수상작 없음 → 심사 진행 중 안내
  - `awards` + published 수상작 있음 → 공개 갤러리 (기존 로직 유지)
- Firestore 쿼리 `enabled` 조건: `!!user && isPostEvent` — 행사 전 불필요 쿼리 방지

### 2-5. `src/app/hackathon/page.tsx` (수정)
- `HackathonPhaseTimeline` import 추가
- 히어로 섹션 직후에 `<HackathonPhaseTimeline />` 삽입
- 수상작 섹션 주석 갱신 (단계별 상태 반영)

### 2-6. `src/app/dashboard/page.tsx` (수정)
- `HackathonCtaBanner` import 추가
- `<SemesterKickoffBanner />` 직후에 `<HackathonCtaBanner />` 삽입

---

## 3. 설계 결정

- **신규 컬렉션 없음**: 계획서 원칙 그대로. config 정적 상수 + 기존 `hackathon_submissions` 재사용.
- **운영진 갱신 최소화**: `HACKATHON_PHASE_TIMELINE[].startDate` 와 `HACKATHON_AWARDS_ANNOUNCE_DATE` 만 수정하면 모든 단계 UI가 전환.
- **모바일 우선**: `CountUnit` 폰트 `sm:text-3xl`(모바일 `2xl`), 스테퍼 `flex-wrap`, 터치 타깃 보강.
- **수정 금지 준수**: `src/features/dashboard/**` 는 건드리지 않고 `src/app/dashboard/page.tsx` 에만 import 추가. `console/**` 미접촉.

---

## 4. 검증

- `npx tsc --noEmit` → **출력 없음 (에러 0)**
- `npx eslint [6파일] --quiet` → **출력 없음 (에러 0)**
- build·commit 은 규율에 따라 생략

---

## 5. 운영진 인수인계

| 항목 | 파일 | 갱신 방법 |
|---|---|---|
| 행사 단계 전환 날짜 | `config.ts` `HACKATHON_PHASE_TIMELINE[].startDate` | 날짜 문자열만 수정 |
| 수상 발표 예정일 | `config.ts` `HACKATHON_AWARDS_ANNOUNCE_DATE` | 날짜 문자열만 수정 |
| 행사 장소 확정 | `config.ts` `HACKATHON_EVENT.place` | 문자열 교체 |
| 타임라인 세부 조정 | `config.ts` `HACKATHON_TIMELINE` | 배열 항목 수정 |
| CTA 배너 닫기 초기화 | 없음 | dismiss 키가 날짜 포함이라 다음 회차에 자동 초기화 |
