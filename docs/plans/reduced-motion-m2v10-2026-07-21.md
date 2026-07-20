# reduced-motion M2-v10 구현 보고서 (2026-07-20)

> 백로그: v10 M2 "reduced-motion 전역 확대 — framer-motion 18파일 방어"
> 실행: executor · 검증: tsc --noEmit + eslint --quiet

---

## 1. 전역 커버 범위 분석 (수정 전)

| 커버 메커니즘 | 파일 범위 | 상태 |
|---|---|---|
| `MotionConfig reducedMotion="user"` (v9-M4, layout.tsx) | `motion.*` 컴포넌트 사용 전체 | 전역 커버 |
| `globals.css @media prefers-reduced-motion: reduce` (v9-M4) | Tailwind CSS 애니메이션·트랜지션 | 전역 커버 |
| 개별 `useReducedMotion()` 가드 (v9-M4 기구현) | HeroSection·ResearchJourneySection·ResearchHero | 개별 커버 |
| **MotionConfig 미커버 — `useAnimationFrame` rAF 직접 루프** | InteractiveWrap.tsx | **미방어** |
| **MotionConfig 미커버 — SVG SMIL `<animate>`** | HabitTracker.tsx | **미방어** |

---

## 2. framer-motion 18파일 전수 실측 결과

| 파일 | 사용 패턴 | 방어 방식 | 상태 |
|---|---|---|---|
| `components/layout/MotionProvider.tsx` | MotionConfig 제공자 | — | PROVIDER |
| `components/home/HeroSection.tsx` | `useAnimationFrame` (Aurora 블롭) | `useReducedMotion` + `if (reduce) return;` | DONE(v9) |
| `components/home/ResearchJourneySection.tsx` | `motion.*` + `useReducedMotion` | `reduce ? false : { ... }` 패턴 | DONE(v9) |
| `features/research-analytics/ResearchHero.tsx` | `motion.*` + 카운트업 rAF + 부유 태그 drift | `useReducedMotion` + `if (reduced) setValue(target); return;` + `y: reduced ? 0 : [...]` | DONE(v9) |
| `components/home/StatsSection.tsx` | `motion.div whileInView` | MotionConfig 전역 | OK |
| `components/home/ActivityCards.tsx` | `motion.div whileInView` | MotionConfig 전역 | OK |
| `components/home/AboutPreview.tsx` | `motion.div whileInView` | MotionConfig 전역 | OK |
| `components/home/GuestSpeakersSection.tsx` | `motion.a` + `useSpring` (마우스 드리븐, 자동루프 없음) | MotionConfig 전역 | OK |
| `components/about/Timeline.tsx` | `motion.div whileInView` | MotionConfig 전역 | OK |
| `app/about/greeting/page.tsx` | `motion.div whileInView` | MotionConfig 전역 | OK |
| `features/board/InterviewPlayer.tsx` | `motion.div` + `AnimatePresence` | MotionConfig 전역 | OK |
| `features/board/InterviewCertificate.tsx` | `motion.div` (spring 등장) | MotionConfig 전역 | OK |
| `features/defense/DefensePracticeRunner.tsx` | `motion.*` + `AnimatePresence` (rAF는 STT 타이머 전용) | MotionConfig 전역 | OK |
| `features/research/ResearchReportInterview.tsx` | `motion.*` + `AnimatePresence` | MotionConfig 전역 | OK |
| `components/chat/ChatWidget.tsx` | `motion.*` + `AnimatePresence` | MotionConfig 전역 | OK |
| `app/signup/page.tsx` | framer-motion은 comment에만 등장(SignupMultiStep 동적 import) | — | N/A |
| **`components/home/InteractiveWrap.tsx`** | `useAnimationFrame` 무한 블롭 드리프트 | `useReducedMotion` + `if (reduce) return;` | **FIXED(v10)** |
| **`features/mypage/HabitTracker.tsx`** | SVG SMIL `<animate repeatCount="indefinite">` 펄스 링 3개 | `useReducedMotion` + `{!reduce && <animate ...>}` | **FIXED(v10)** |

---

## 3. 변경 내역

### 3-1. `src/components/home/InteractiveWrap.tsx`

**문제**: `InteractiveBackdrop`의 `useAnimationFrame` 콜백이 무한 루프로 blob 위치(`mx`, `my`)를 갱신. `MotionConfig reducedMotion="user"`는 `motion.*` 트랜지션을 0ms로 만들지만 `requestAnimationFrame` 직접 루프는 계속 실행됨.

**변경**:
- import에 `useReducedMotion` 추가
- `InteractiveBackdrop` 내 `const reduce = useReducedMotion();` 추가
- `useAnimationFrame` 콜백 첫 줄에 `if (reduce) return;` 가드 추가

```diff
- import { motion, useScroll, useTransform, useInView, useMotionValue, useSpring, useAnimationFrame } from "framer-motion";
+ import { motion, useScroll, useTransform, useInView, useMotionValue, useSpring, useAnimationFrame, useReducedMotion } from "framer-motion";

  // InteractiveBackdrop 내부
+ const reduce = useReducedMotion();
  useAnimationFrame((t) => {
+   if (reduce) return; // a11y: prefers-reduced-motion 시 블롭 드리프트 중단
    const s = t / 1000;
    mx.set(Math.sin(s * 0.15) * 60);
    my.set(Math.cos(s * 0.2) * 40);
  });
```

### 3-2. `src/features/mypage/HabitTracker.tsx`

**문제**: `DailyChart`의 SVG `<animate>` 요소 3개(`repeatCount="indefinite"`)가 SMIL 애니메이션으로 펄스 링·점 깜박임을 구현. SVG SMIL은 CSS `animation-duration` 재정의(globals.css)의 적용 대상이 아니며 `MotionConfig`도 커버하지 않음.

**변경**:
- import에 `useReducedMotion` 추가
- `DailyChart` 함수 상단에 `const reduce = useReducedMotion();` 추가
- 3개 `<animate>` 요소를 `{!reduce && <animate ...>}` 조건부 렌더링으로 변경

```diff
- import { motion } from "framer-motion";
+ import { motion, useReducedMotion } from "framer-motion";

  function DailyChart(...) {
+   const reduce = useReducedMotion(); // a11y: SVG SMIL 펄스 가드 (M2-v10)
    ...
-   <animate attributeName="r" values="5;11;5" dur="1.4s" repeatCount="indefinite" />
-   <animate attributeName="opacity" values="0.35;0;0.35" dur="1.4s" repeatCount="indefinite" />
+   {!reduce && <animate attributeName="r" values="5;11;5" dur="1.4s" repeatCount="indefinite" />}
+   {!reduce && <animate attributeName="opacity" values="0.35;0;0.35" dur="1.4s" repeatCount="indefinite" />}
    ...
-   <animate attributeName="opacity" values="1;0.35;1" dur="1.4s" repeatCount="indefinite" />
+   {!reduce && <animate attributeName="opacity" values="1;0.35;1" dur="1.4s" repeatCount="indefinite" />}
```

---

## 4. 검증

| 항목 | 결과 |
|---|---|
| `npx tsc --noEmit` | **오류 0** |
| `npx eslint src/components/home/InteractiveWrap.tsx src/features/mypage/HabitTracker.tsx --quiet` | **경고·오류 0** |
| MotionConfig 전역 커버 (motion.* 14개 파일) | layout.tsx `<MotionProvider>` 확인 완료 |
| 개별 가드 추가 파일 | 2개 (InteractiveWrap·HabitTracker) |
| build / commit | 없음 (규율 준수) |

---

## 5. 동작 불변 확인

- `prefers-reduced-motion: no-preference` 사용자: 변화 없음 (`reduce = false` → 모든 애니메이션 기존과 동일)
- `prefers-reduced-motion: reduce` 사용자:
  - InteractiveWrap 배경 blob: 정적 위치 유지 (rAF 루프 중단, motion 값은 0 고정)
  - HabitTracker 오늘 점: 정적 점·링 렌더(크기·투명도 고정, 깜박임 없음)

---

## 6. 잔여

| 항목 | 내용 |
|---|---|
| `GuestSpeakersSection.tsx` `useSpring` 3D 틸트 | 마우스 드리븐(자동루프 없음) — MotionConfig 커버로 충분. 모션 민감 사용자는 tilt 스프링이 즉시 정착. |
| L4 reduced-motion 자동 스모크 | M2 확대 후 axe 스모크에 모션 체크 추가 (v10-L4) |
