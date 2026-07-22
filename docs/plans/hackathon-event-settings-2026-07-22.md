# 해커톤 행사 설정 편집 — 콘솔 통합 (2026-07-22)

## 1. 목적

해커톤의 시간·장소·당일 타임라인·제출 마감 등 설정을 **코드 수정 없이 콘솔에서 편집**할 수 있게 한다.
동시에 행사를 **대내 학술대회 목록의 단일 항목**으로 관리해 다회성(multi-event) 구조를 확립한다.

---

## 2. 스키마 확장

### 2.1 `HackathonSettings` (신규 인터페이스)

`src/features/internal-conference/conferences.ts`의 `InternalConference`에 `hackathonSettings?` 추가.

```ts
interface HackathonSettings {
  intro?: string;
  highlights?: string[];
  timeline?: { time: string; label: string }[];
  submissionDeadline?: string;          // "YYYY-MM-DDTHH:mm"
  awardsAnnounceDate?: string;          // "YYYY-MM-DD"
  phaseStartDates?: {
    registration?: string;
    submission?: string;
    judging?: string;
    awards?: string;
  };
}
```

저장소: `site_settings key="internal_conferences"` JSON 배열 — **신규 컬렉션 없음**.

---

## 3. Resolve 우선순위 매트릭스

| 필드 | 1순위 | 2순위 | 3순위 |
|------|-------|-------|-------|
| title · tagline | InternalConference.title/tagline | — | HACKATHON_EVENT 상수 |
| date · dayLabel · timeLabel · place | InternalConference 필드 | — | HACKATHON_EVENT 상수 |
| intro | hackathonSettings.intro | — | HACKATHON_EVENT.intro |
| highlights | hackathonSettings.highlights | — | HACKATHON_EVENT.highlights |
| timeline | hackathonSettings.timeline | — | HACKATHON_TIMELINE 상수 |
| submissionDeadline | hackathonSettings.submissionDeadline | — | HACKATHON_SUBMISSION_DEADLINE |
| awardsAnnounceDate | hackathonSettings.awardsAnnounceDate | InternalConference.awardsAnnounceDate | HACKATHON_AWARDS_ANNOUNCE_DATE |
| phaseStartDates.* | hackathonSettings.phaseStartDates.* | — | HACKATHON_PHASE_TIMELINE[i].startDate |

**폴백 보장**: `hackathonSettings` 가 없으면 모든 값이 기존 config 상수와 100% 동일.

---

## 4. 신규/변경 파일

### 신규

| 파일 | 역할 |
|------|------|
| `src/features/hackathon/useHackathonEvent.ts` | Firestore → config 폴백 순으로 resolve 해 `ResolvedHackathonEvent` 반환 |
| `src/features/hackathon/HackathonHeroMeta.tsx` | 히어로 섹션 클라이언트 컴포넌트 (tagline·title·intro·meta badges·highlights) |
| `src/features/hackathon/HackathonDayTimeline.tsx` | 당일 타임라인 클라이언트 컴포넌트 |

### 변경

| 파일 | 변경 요약 |
|------|-----------|
| `conferences.ts` | `HackathonSettings` 인터페이스 + `InternalConference.hackathonSettings?` 추가 |
| `config.ts` | `getHackathonPhase(phaseStartDates?)`, `isHackathonSubmissionClosed(deadlineOverride?)`, `resolveHackathonPhase/SubmissionClosed/PhaseGuarded` — 선택적 설정 주입 파라미터 추가 (하위호환) |
| `useHackathonOps.ts` | `useHackathonEvent()` 호출 → `event.phaseStartDates`, `event.submissionDeadline` 주입 |
| `hackathon/page.tsx` | 히어로·타임라인 섹션을 `HackathonHeroMeta` · `HackathonDayTimeline` 로 교체 |
| `console/hackathon/page.tsx` | "행사 설정" 탭 추가 (`HackathonEventSettingsTab` 컴포넌트) |
| `InternalConferencesView.tsx` | 해커톤 카드에 staff 전용 "콘솔 › 해커톤 운영 › 행사 설정" 링크 |

---

## 5. 콘솔 UI — 행사 설정 탭

위치: 콘솔 › 해커톤 운영 › **행사 설정** (세 번째 탭)

구성 섹션:

1. **안내 배너** — "이 행사는 대내 학술대회 목록의 항목으로 관리됩니다"
2. **행사 선택** (hackathon kind 행사가 2개 이상일 때만 표시)
3. **비활성 행사 경고** (선택 행사가 현재 활성 컨텍스트가 아닐 때)
4. **기본 정보** — 제목·태그라인·날짜·요일·시간·장소·소개·하이라이트 3줄
5. **당일 타임라인 편집기** — 행 추가/삭제, time + label 입력
6. **일정 설정** — 제출 마감(datetime-local) · 수상 발표일(date)
7. **단계별 시작일** — 참가접수·제출·심사·수상 각 날짜(date)
8. **설정 저장** 버튼 → `useSaveInternalConferences` 로 저장

저장 경로: `useInternalConferences` → `useSaveInternalConferences` — **당일 운영·심사 탭과 동일 저장소(site_settings), 데이터 정합 자동**.

---

## 6. 런타임 해상(resolve) 계층

```
useHackathonEvent()
  └─ useInternalConferences()       ← site_settings/internal_conferences (React Query dedupe)
      └─ find(contextId === HACKATHON_CONTEXT_ID)
          └─ merge(hackathonSettings → config constants)
              → ResolvedHackathonEvent

useHackathonOps()
  ├─ useQuery(hackathon_ops)        ← site_settings/hackathon_ops
  └─ useHackathonEvent()            ← 위와 동일 (dedupe)
      → phase = resolveHackathonPhase(override, now, event.phaseStartDates)
      → submissionClosed = resolveHackathonSubmissionClosed(override, now, event.submissionDeadline)
```

---

## 7. 하위호환 보장

- `hackathonSettings` 미존재 → 모든 값이 기존 config 상수와 동일 (데이터 무손실)
- `getHackathonPhase()` / `isHackathonSubmissionClosed()` 기존 호출 — 새 파라미터 선택적이므로 전부 그대로 동작
- `resolveHackathonPhaseGuarded(override, publishedCount)` 기존 호출 — 하위호환
- `HackathonDdayConsole` · `HackathonPhaseTimeline` 등 기존 컴포넌트 — 변경 없음

---

## 8. 제약

- 신규 Firestore 컬렉션 없음 (site_settings 재사용)
- 당일 운영·심사 탭은 현행 `HACKATHON_CONTEXT_ID` 고정 — 과확장 금지
- 비활성 행사 선택 시 운영 표면 연결은 추후 지원 안내만 표시
