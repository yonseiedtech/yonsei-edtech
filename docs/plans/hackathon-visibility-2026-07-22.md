# Hackathon Section Visibility Gate (2026-07-22)

## 개요

`/hackathon` 허브의 **수상작·팀 현황·산출물 제출** 세 영역을 기본 비공개로 하고,
관리자가 콘솔 "당일 운영" 탭에서 영역별 토글로 열어야만 노출되도록 구현한다.
신규 Firestore 컬렉션 없음 — 기존 `site_settings(hackathon_ops)` 문서 확장.

---

## 플래그 구조

### `SectionVisibility` (config.ts 신규)

```ts
export interface SectionVisibility {
  teams: boolean;        // 팀 현황 섹션
  submissions: boolean;  // 산출물 제출 섹션
  awards: boolean;       // 수상작 영역 (발표 예정 플레이스홀더 포함)
}

// 기본값(필드 부재·null) — 전부 비공개
export const HACKATHON_SECTION_VISIBILITY_DEFAULT: SectionVisibility = {
  teams: false,
  submissions: false,
  awards: false,
};
```

### `HackathonOpsOverride` 확장 (config.ts)

```ts
export interface HackathonOpsOverride {
  phase: HackathonPhaseKey | null;
  submissionClosed: boolean | null;
  sectionVisibility: SectionVisibility | null;  // ← 신규
}
```

**하위호환**: 기존 저장 문서에 `sectionVisibility` 필드가 없으면 `null`로 파싱 →
`resolveSectionVisibility(null)` = `HACKATHON_SECTION_VISIBILITY_DEFAULT` (전부 비공개).
기존 hackathon_ops 문서를 마이그레이션할 필요 없음.

### 저장 경로

`site_settings` 컬렉션의 `key="hackathon_ops"` 문서 `value` JSON에 병합:

```json
{
  "phase": null,
  "submissionClosed": null,
  "sectionVisibility": {
    "teams": false,
    "submissions": false,
    "awards": false
  }
}
```

---

## 게이트 매트릭스

| 영역 | visibility 값 | 렌더 여부 | 비고 |
|------|--------------|----------|------|
| 수상작 (`HackathonAwards`) | `awards: true` | 렌더 | 발표 예정 플레이스홀더·심사 중 안내·공개 갤러리 모두 포함 |
| 수상작 | `awards: false` 또는 로딩 중 | 미렌더 | 플레이스홀더도 숨김 |
| 팀 현황 (`HackathonTeamView`) | `teams: true` | 렌더 | |
| 팀 현황 | `teams: false` 또는 로딩 중 | 미렌더 | |
| 산출물 제출 (`HackathonSubmissions`) | `submissions: true` | 렌더 | phase 기반 마감 로직은 내부에서 그대로 작동 |
| 산출물 제출 | `submissions: false` 또는 로딩 중 | 미렌더 | |

**항상 노출**: 히어로·HackathonPhaseTimeline·HackathonLiveBanner·참가 신청·당일 타임라인·FAQ — 변경 없음.

---

## phase × visibility 조합 가이드

| phase | 권장 visibility | 설명 |
|-------|----------------|------|
| registration | 전부 false | 행사 전 — 참가 신청만 노출 |
| submission (행사 당일 오픈) | teams: true, submissions: true | 팀 확인 + 제출 폼 공개 |
| judging | awards: true | 심사 중 안내 표시 (수상작 없음 → 심사 중 플레이스홀더) |
| awards | awards: true | 공개 갤러리 (개별 published 토글은 심사 탭) |

> 단계(phase)와 영역 공개(sectionVisibility)는 독립 — 단계를 전환해도 영역이 자동으로 열리지 않음.

---

## 변경 파일

| 파일 | 변경 내용 |
|------|----------|
| `src/features/hackathon/config.ts` | `SectionVisibility` 인터페이스·`HACKATHON_SECTION_VISIBILITY_DEFAULT`·`resolveSectionVisibility()` 추가, `HackathonOpsOverride` + `HACKATHON_OPS_DEFAULT` 확장 |
| `src/features/hackathon/useHackathonOps.ts` | `sectionVisibility` 파싱·`resolveSectionVisibility` import·반환값 추가 |
| `src/features/hackathon/HackathonSectionGate.tsx` | **신규** 클라이언트 래퍼 — 3섹션 visibility 게이트 |
| `src/app/hackathon/page.tsx` | 세 섹션 제거 → `<HackathonSectionGate />` 교체 |
| `src/features/hackathon/HackathonDdayConsole.tsx` | "영역 공개" 토글 카드 추가 (Eye/EyeOff, 3개 행) |

---

## 콘솔 UI

위치: 콘솔 → 해커톤 → **당일 운영** 탭 → 단계 전환 실행 아래 "영역 공개" 카드.

- 3개 행(팀 현황 / 산출물 제출 / 수상작), 각 행: 이름 + 공개/비공개 배지 + 공개·숨기기 버튼.
- 저장은 기존 `useUpdateHackathonOps` 뮤테이션 재사용 (`apply({ sectionVisibility: {...} })`).
- 안내 문구: "행사 당일 순서에 맞춰 공개하세요 — 팀 현황 → 산출물 제출 → 수상작"
- 단계 전환 독립성 명시 문구: "단계 전환과 독립적 — 단계를 전환해도 자동 공개되지 않습니다"

---

## Firestore Rules

`site_settings` 컬렉션의 `hackathon_ops` key write는 현재 `president/admin/sysadmin`에게만 허용.
`hackathon_ops` 갱신은 `siteSettingsApi`(bkend.ai Admin SDK 경유)를 통해 이루어지므로
클라이언트 Firestore 룰과 무관. **rules 무변경**.
