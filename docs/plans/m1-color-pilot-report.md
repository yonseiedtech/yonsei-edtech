# M1 파일럿 — 마이페이지 핵심 4파일 색상 시맨틱 토큰화 조사 결과

- 대상: DESIGN.md §2.1 Foundation 컬러 + Status 컬러 매핑 기준
- 범위: `src/components/mypage/MyActivityHub.tsx`, `src/features/mypage/LearningStreak.tsx`, `src/features/mypage/ProfileViewsWidget.tsx`, `src/components/mypage/DiagnosticWeakConceptPath.tsx` (4개 파일 외 수정 없음)
- 검증: `npx tsc --noEmit` — 에러 0 (코드 변경 없음, 조사만 수행)

## 결론 요약

4개 파일 전체를 grep 전수 조사(`gray-`, `slate-`, `zinc-`, `neutral-`, `stone-`, `bg-white`, `text-black`, 하드코딩 hex 등)한 결과 **raw gray/slate 계열 클래스가 단 한 건도 없음**을 확인했다. 즉 DESIGN.md §2.1의 `muted`/`border`/`card`/`foreground` 매핑 대상(gray 계열)이 애초에 존재하지 않아 **치환 건수 = 0건**이다.

기존에도 중립 UI(배경·테두리·보조텍스트)는 이미 `bg-card`, `bg-muted`, `text-muted-foreground`, `text-primary`, `border`(토큰) 로 일관되게 작성되어 있었다.

## 파일별 치환 건수

| 파일 | 치환 건수 | 비고 |
|---|---|---|
| `MyActivityHub.tsx` | 0 | gray 계열 없음. 이미 `bg-primary/15`, `text-primary`, `bg-muted`, `text-muted-foreground` 사용 중 |
| `LearningStreak.tsx` | 0 | gray 계열 없음. 이미 `bg-card`, `bg-muted/40`, `text-muted-foreground`, `text-primary` 사용 중 |
| `ProfileViewsWidget.tsx` | 0 | gray 계열 없음. 전체가 이미 `bg-card`, `bg-muted`, `text-muted-foreground`, `text-primary` |
| `DiagnosticWeakConceptPath.tsx` | 0 | gray 계열 없음. 중립 영역은 이미 `bg-card/60`, `text-muted-foreground`, `text-foreground` 사용 중 |

## 보류 목록 (건드리지 않음 — 이유 명시)

### 1. 브랜드 의도 컬러 (규칙에 따라 원천적으로 제외)
- `LearningStreak.tsx` — 잔디 강도(`bg-emerald-200/400/500/700`, `bg-muted/40`), 마일스톤 배지(`bg-emerald-50 text-emerald-800 ring-emerald-200`), 순위 링크(`amber-50/100/300 text-amber-700`), 요일 라벨(`text-rose-400`/`text-blue-400`) 등 → emerald "잔디" 브랜드 계열, amber 순위/연구 계열. 그대로 둠.
- `DiagnosticWeakConceptPath.tsx` — violet 진단 계열 전체(`border-violet-200/60 dark:border-violet-800/40`, `bg-violet-50/60`, `text-violet-900` 등), amber 전구 아이콘(`text-amber-500`), 30분 읽기 버튼(`bg-violet-600 dark:bg-violet-500 text-white`) → violet "진단" 브랜드 계열. 그대로 둠.
- `MyActivityHub.tsx` — 카테고리 배지 3종(세미나=`primary`, 학술활동=`emerald`, 모임=`violet`) → 이미 `bg-primary/15 text-primary` 는 토큰이며, emerald/violet 카테고리 컬러는 브랜드 카테고리 의도색. 그대로 둠.

### 2. Status 배지 — 시맨틱 소스(`src/lib/design-tokens.ts` `SEMANTIC`/`STATUS_CHIP`)와 근접하지만 명도가 달라 시각 변화 위험 → 보류
- `MyActivityHub.tsx` `STATUS_META` (approved/pending/rejected/upcoming, 62~74행): `bg-emerald-100/amber-100/rose-100/blue-100` + `text-*-700` + `dark:bg-*-950/40` + `dark:text-*-300`.
- 프로젝트에는 이미 동일 의도의 시맨틱 토큰(`STATUS_CHIP.success/warning/danger/info` = `SEMANTIC.*.chip`)이 `src/lib/design-tokens.ts` 에 정의돼 있으나, 값이 다르다:
  - 현재: `bg-*-100 text-*-700 dark:bg-*-950/40` (border 없음)
  - 토큰: `bg-*-50 text-*-700 border-*-200 dark:bg-*-950/50 border 포함`
  - 배경 명도(100→50)·다크 투명도(40→50)·테두리 유무가 달라 그대로 대입 시 **시각 변화**가 발생한다. 규칙상("시각 변화가 생기는 치환은 하지 말 것") 자동 치환하지 않고 보류.
  - 후속 작업 제안: 별도 승인 하에 `STATUS_META` → `STATUS_CHIP` 전환(시각 검수 포함)을 M2 이후 별도 티켓으로 진행 권장.

### 3. 기타 raw 색상 (브랜드/포인트 컬러라 매핑 대상 아님)
- `DiagnosticWeakConceptPath.tsx:175` `dark:bg-black/20` — violet 톤 패널 내부 다크모드 반투명 오버레이(디자인 의도된 딤 효과). `bg-muted` 등으로 대체 시 톤이 달라져 보류.
- `LearningStreak.tsx:411` `text-white/90` — 잔디 셀(색칠된 배경) 위 대비용 텍스트 색. 배경이 emerald 계열이라 semantic `foreground` 대체 대상 아님.

## 종합
DESIGN.md §2.1 매핑표 기준 "raw gray → muted/border/card" 치환 대상 자체가 이 4개 파일에는 없었다(0건). 발견된 모든 raw 팔레트 클래스는 브랜드 의도 컬러(잔디/진단/연구 계열) 또는 기존 시맨틱 토큰과 명도가 달라 시각 변화 위험이 있는 status 배지였으므로 규칙에 따라 전량 보류했다. 코드 변경 없음.
