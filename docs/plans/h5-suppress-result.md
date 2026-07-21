# H5 eslint-disable exhaustive-deps 주석 의도 명시 결과

작업일: 2026-07-21  
대상: `react-hooks/exhaustive-deps` suppress 주석 16곳 → 의도 명시 텍스트 추가

## 처리 결과 (파일별)

| # | 파일 | 줄 | 분류 | 추가된 의도 설명 |
|---|------|----|------|----------------|
| 1 | `src/app/diagnosis/page.tsx` | 281 | **other** (user-id-once) | `phase excluded to avoid re-firing on state change; fires once per user/load cycle` |
| 2 | `src/features/admin/AdminMemberTab.tsx` | 407 | **other** (stable-helper) | `getSortValue/onboardingProgress helpers stable, intentionally omitted` |
| 3 | `src/features/studio/StudioEditor.tsx` | 422 | **subscription** | `typing/removeSelected excluded to prevent resubscription churn on every keystroke` |
| 4 | `src/app/dashboard/page.tsx` | 162 | **other** (self-update-guard) | `user.lastVisitAt excluded to avoid re-trigger loop after self-update` |
| 5 | `src/features/admin/settings/GreetingSection.tsx` | 62 | **other** (granular-field-deps) | `granular field deps intentional; avoids resync on object reference change` |
| 6 | `src/features/steppingstone/SemesterRoadmap.tsx` | 447 | **other** (cache-bust-signal) | `progressTick is a cache-bust signal for localStorage reads, not a true reactive dep` |
| 7 | `src/app/courses/page.tsx` | 193 | **other** (circular-update) | `tab excluded to prevent circular update; VALID_TABS is a stable constant` |
| 8 | `src/features/activities/ActivityDetail.tsx` | 347 | **other** (circular-reset) | `applyParticipantType/type excluded to prevent circular reset; setters are stable` |
| 9 | `src/components/profile/ProfileAcademicActivities.tsx` | 172 | **other** (stable-helper) | `isSpeaker uses owner props already in deps; function ref excluded` |
| 10 | `src/components/profile/ProfileAcademicActivities.tsx` | 241 | **other** (inline-const) | `sort comparators use inline constants only; no external deps needed` |
| 11 | `src/features/conference/ConferenceProgramEditor.tsx` | 835 | **subscription** (debounce) | `handleSave excluded to prevent autosave timer reset on every render` |
| 12 | `src/app/steppingstone/onboarding/page.tsx` | 472 | **other** (user-id-once) | `user object ref excluded; fires once per user id to log onboarding entry` |
| 13 | `src/features/seminar-live/LectureNotesEditor.tsx` | 40 | **mount-once** | `deck.lectureNotes excluded to protect in-progress edits from external updates` |
| 14 | `src/features/defense/DefensePracticeRunner.tsx` | 874 | **subscription** (timer) | `evaluateReadAlong/readAlongUnit excluded to prevent silence timer churn` |
| 15 | `src/features/research/ResearchModelEditor.tsx` | 155 | **mount-once** | `mount-once: initial flow layout computed only on mount, value/readOnly changes handled separately` |
| 16 | `src/features/research/ResearchDesignEditor.tsx` | 368 | **other** (derived-dep) | `strictKind derived from form.approach already in deps; not a separate reactive value` |
| 17 | `src/features/research/ResearchReportInterview.tsx` | 1693 | **other** (latest-value-read) | `dirty/saving/onAutoSave read latest values without re-subscribing on slide nav` |

> 참고: #9와 #10이 같은 파일의 서로 다른 위치여서 실제 편집 횟수는 17회.

## 분류 집계

| 분류 | 건수 | 설명 |
|------|------|------|
| mount-once | 2 | `[]` deps, 컴포넌트 마운트 시 단 1회 실행 의도 |
| subscription | 3 | 이벤트 리스너·타이머 재구독 방지 목적 |
| other | 12 | 순환 업데이트 방지·stable 헬퍼·파생값·self-update 루프 방지 등 |
| fixed | 0 | 실제 버그 위험 수정 건 없음 (모두 의도적 suppression으로 판단) |

## 검증

```
npx tsc --noEmit → 오류 0건 (출력 없음)
```

코드 로직 변경 없음. 주석 텍스트만 추가됨.
