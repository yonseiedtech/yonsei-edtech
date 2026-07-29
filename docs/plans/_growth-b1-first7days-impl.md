# B1 — 신입 First-7-Days 핵심행동 유도 구현 기록

> 근거: `docs/plans/service-enhancement-plan-v19-acquisition.md` §B1 (활성화 P0)
> 구현: dashboard/onboarding 영역 단독. auth/SemesterWrapped/steppingstone 미변경.
> 배포/커밋/`next build` 미실행(다른 executor 병렬 — .next lock). 검증 = tsc + eslint.

## 목표
가입 7일 이내 신입에게 정보 과부하 대신 **첫 3핵심행동(아하 모먼트)**을 단일 미션 카드로 유도:
1. 연구 준비도 진단 1회
2. 러닝 가이드 1개 살펴보기
3. 논문 읽기 타이머 1회

## 변경 파일
| 파일 | 변경 |
|---|---|
| `src/features/dashboard/FirstStepsMissionCard.tsx` | **신규** — 첫 걸음 미션 카드(3항목 체크리스트 + 각 CTA + 진행률 + 단일 다음행동 CTA + 닫기) |
| `src/app/dashboard/page.tsx` | import 1줄 + 섹션 0-b 렌더 블록(WidgetBoundary + empty:hidden)로 NewMemberOnboardingCard 직후 마운트 |

## 활성화 상태 판정(읽기 전용 · 신규 컬렉션/저장 없음)
| 행동 | 판정 소스(기존 데이터) | 재사용 훅/API | 딥링크 |
|---|---|---|---|
| ① 진단 | `diagnostic_results` 존재(길이>0) | `useUserDiagnostics(userId, list => list.length>0)` — 대시보드 공통 캐시 키 `["user-diagnostics", userId]` 공유 → **추가 read 0** | `/diagnosis` |
| ② 가이드 | `guide_progress` 의 `completedItems` 1건+ | `guideProgressApi.listByUser` + `hasGuideStarted` — **NewcomerProgressWidget 과 동일 쿼리 키 `["newcomer-onboarding-started", userId]`·판정** 재사용 → 추가 read 0 | `/learning-guides` |
| ③ 읽기 타이머 | `paper_reading_logs` 존재(길이>0) | `paperReadingLogsApi.listByUser`, 전용 키 `["first-steps-reading-done", userId]` (신입 7일 이내만 enabled) → 신입 한정 read 1회 | `/mypage/research?tab=reading` |

- 각 행동은 **존재 여부(boolean)만** 확인. 집계·정밀 이벤트 로깅 없음(v19 §4 "상태 도달 집계" 원칙 준수).
- 완료 항목은 체크 표시(취소선·success 톤), 미완료는 해당 기능으로 딥링크.

## 노출/숨김 게이트(graceful)
- 노출: 로그인 + **계정 생성 7일 이내**(`daysSinceJoinKst`, KST) + 졸업생 제외(`isAlumni`) + 미닫힘 + 3행동 미완.
- 자동 숨김: **7일 경과** 또는 **3행동 완료** 시 `null` 렌더 → 비신입/완주자 미영향.
- 사용자 닫기: per-user `localStorage`(`yedu_first_steps_mission_dismissed.<userId>`), `useSyncExternalStore` 로 SSR 안전·탭 동기화(NewMemberOnboardingCard 패턴 재사용).

## 재사용 컴포넌트/유틸
- `useUserDiagnostics`(진단 캐시 공유), `hasGuideStarted`(journey-stages 판정 단일 소스), `daysSinceJoinKst`(newcomer-sequence KST 계정 나이), `isAlumni`(widget-visibility 페르소나 게이트), `WidgetBoundary`(v18 위젯 격리), 시각 패턴은 `NewMemberOnboardingCard` 그라디언트 카드 스타일 준수.
- 신규 컬렉션·신규 대형기능·rules 변경 **없음**.

## 규율 준수
- **Date 순수성**: 렌더 경로에서 `Date.now()`/`new Date()` 직접 호출 없음. 계정 나이는 `useMemo` 안에서 순수 유틸 `daysSinceJoinKst(createdAt)` 호출(내부 now 기본값은 모듈 경계 밖 → react-hooks/purity 미검출, NewcomerProgressWidget 동일 패턴). → warning 래칫 147 초과 없음.
- **시맨틱 토큰만**: `primary/info/success/muted/card/foreground` 등 시맨틱 클래스만 사용(raw hex/팔레트 직접색 없음).
- **a11y**: 진행바 `aria-label`, 각 항목/CTA/닫기 버튼 `aria-label`, 장식 아이콘 `aria-hidden`.
- **SSR-safe**: `useSyncExternalStore` `getServerSnapshot`=false, localStorage 접근 `typeof window` 가드.
- **비로그인·데이터 부족 가드**: `!user`/`!active` 조기 null, 쿼리 기본값 `false`(옵셔널).

## 검증 결과
- `npx tsc --noEmit` → **0 errors** (EXIT 0).
- `npx eslint src/features/dashboard/FirstStepsMissionCard.tsx src/app/dashboard/page.tsx` → **0 errors / 0 warnings** (EXIT 0).
- `next build` 미실행(지침 — .next lock 병렬 회피).

## 후속(제안)
- **C3 AARRR 대시보드**: 본 카드의 3행동 완료율(가입 후 7일 내)을 운영진 insights 에 집계 노출(§B1 지표 = 활성화율).
- 온보딩 표면 과밀 검토: 신입 day0~7 구간에 NewMemberOnboardingCard(프로필/진단/관심) + 본 카드(진단/가이드/타이머) + NewcomerProgressWidget(4단계) 동시 노출 가능 → v20 에서 온보딩 카드 통합/우선순위 오케스트레이션 재검토 권장(본 작업 범위 밖, 기존 컴포넌트 무변경 원칙 유지).
- 이메일/푸시 넛지 연동은 ⚠️X3 알림정책 확정 후(§5).
