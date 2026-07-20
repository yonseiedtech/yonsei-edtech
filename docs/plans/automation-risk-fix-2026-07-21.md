# 자동화 고위험 R1~R4 보정 — 처리 내역 (2026-07-21)

> 근거: `docs/plans/automation-audit-h6v11-2026-07-21.md` (고위험 4건)
> 검증: `npx tsc --noEmit` 에러 0 · `npx eslint src --quiet` 통과(exit 0) · approval-rules 테스트 11/11 통과
> 제약 준수: `HackathonBoard.tsx`·`features/kudos`·`app/console/page.tsx`·아카이브 신선도 영역 **미수정**. build·commit 안 함.

---

## R1 — 가입 자동 승인의 서버 이관 (②-2)

**변경 전**: 자동 승인 평가·실행이 `AdminMemberTab` 클라이언트 `useEffect` (운영진이 `/console/members` 를 브라우저로 열어야 발동). 토글은 운영진 개인 `localStorage("autoApproveEnabled")`.

**변경 후**:
- 자동 승인 **실행을 서버 cron `pending-signup-nudge` 에 병합**(일 1회). 미승인 회원 중 규칙 통과 자격자를 `partitionPending`(기존 규칙 로직 재사용)로 골라 `approved=true` 처리하고, 승인 알림(`member_approved`)·감사로그(`audit_logs`, action=`auto_approve_cron`)를 부수 발생. 자동 승인 후 남은 미처리분만 운영진 넛지 대상으로 계산.
- 토글을 **`site_settings` 전역 키 `auto_approve_enabled`** 로 이관(`approval-rules.ts` 에 `AUTO_APPROVE_SETTINGS_KEY`·`isAutoApproveEnabled` 추가). 문서 부재/미설정 시 기본 ON, 명시적 `"false"` 일 때만 비활성.
- `AdminMemberTab` 의 **클라이언트 자동 승인 `useEffect` 제거**. 토글은 `localStorage` → `site_settings`(전역) 로 변경. 운영진 수동 "일괄 승인" 버튼은 유지.

**토글 의미 변경 명시**: 자동 승인 스위치가 **운영진 개인 브라우저별 localStorage → 전체 운영진 공통 site_settings 전역 설정**으로 바뀌었다. 한 운영진이 끄면 전체에 적용된다. UI 문구도 "자동 승인 (전역) … 서버가 매일 자동 승인 … 전체 운영진에 공통 적용" 으로 갱신.

**채택 근거(보안)**: 서명업 직후 경로(`/api/auth/auto-approve`, 60분 창)는 그대로 유지. cron 경로는 제거된 클라이언트 `useEffect` 와 **동일한 규칙(`partitionPending`)·무시간창** 동작을 서버로 옮긴 것이라 기존 신뢰경계와 일관. 규칙 자체(yonsei.ac.kr 이메일 + 학번 + 중복 없음)가 게이트이므로 시간창 없이도 안전.

- `src/lib/auth/approval-rules.ts` — 상수·헬퍼 추가(순수 함수, 기존 로직 무변경)
- `src/app/api/cron/pending-signup-nudge/route.ts` — 자동 승인 실행 병합
- `src/features/admin/AdminMemberTab.tsx` — useEffect 제거 + 토글 site_settings 이관

---

## R2 — 승인 지연 시 신입 시퀀스 유실 방지 (②-8)

**변경 전**: `newcomer-activation-sequence` 가 각 단계에서 `가입후경과일 === dayOffset` **정확 일치**한 신입만 대상. 승인이 D+2 에 나면(그 전엔 `approved==false` 라 제외) D+1 넛지가 영구 미발송.

**변경 후 (채택안: "미발송 단계 보정")**: 각 신입에 대해 **가입 후 경과일이 도달한 가장 최근 단계 1개**만 오늘의 대상으로 삼는다(`stepForElapsed`). 앞 단계를 놓쳐도 최근 1단계만 보정 발송(몰아서 다 보내지 않음). 기존 `push_logs` dedup(단계당 1회)·단계별 스킵 조건은 그대로 유지. 정시 승인 신입에겐 결과적으로 D+1→D+3→… 기존 케이던스와 **동일하게 동작**(경과일이 정확히 dayOffset 인 날 그 단계가 최근 단계가 되므로).

**채택 근거(대안 비교)**: 감사 대안 "기준일 = max(가입일, 승인일)" 은 신뢰할 승인일 필드가 없어 기각 — 자동 승인은 `autoApprovedAt` 을 남기지만 운영진 수동 승인(`profilesApi.approve`)은 타임스탬프를 남기지 않아 데이터가 불완전. "미발송 최근 단계 보정" 은 기존 dedup·스킵을 그대로 재사용하고 과알림 없이 유실만 회수하므로 더 안전.

- `src/app/api/cron/newcomer-activation-sequence/route.ts` — 대상 선정 로직 교체 + `stepForElapsed` 추가

---

## R3 — 9/1 조직도 학기 전환 공백 (③-5)

**변경 전**: 조직도는 학기별 문서 `org_chart:{학기}`. 9/1 에 `org_chart:2026-2` 부재 시 레거시 단일 키 또는 DEFAULT 시드(공석)로 표시 회귀. 직전 학기 폴백 없음.

**변경 후**: `semester-advance` cron(실측·매일 실행)에 **신학기 조직도 자동 이월**(`carryOverOrgChart`) 추가:
- `org_chart:{현재학기}` 문서가 **없을 때만** 직전 학기(`org_chart:{직전학기}`) → 없으면 레거시 `org_chart` 값을 복사 생성. **비파괴·멱등**(문서 있으면 스킵, 원본이 전혀 없으면 빈 조직도 생성 안 함).
- 이월이 실제 일어난 경우에만 운영진(staff+)에게 **인앱 알림 1회**("신학기 조직도가 이월됐습니다 — 검토하세요", 링크 `/console/settings/org-chart`).
- 매일 실행돼도 신학기 문서가 생기면 이후 스킵되므로 알림도 자연히 1회.

**참고**: 조직도 키 규약(`org_chart:{sem}`)은 클라이언트 `useOrgChart.ts` 와 동일하나, 그 파일이 `"use client"`(firebase client SDK 의존)라 서버 cron 에 인라인(`orgChartKey`)해 클라이언트 번들 유입을 회피.

- `src/app/api/cron/semester-advance/route.ts` — `carryOverOrgChart` 추가 + 결과 반환

---

## R4 — 심사 정체·빈 수상 발표 방지 (①-16·19)

**① awards 자동 전환 가드 (published ≥ 1)**: `config.ts` 에 `resolveHackathonPhaseGuarded(override, publishedCount)` 추가 — 자동(날짜) 폴백으로 awards 진입 시 공개 수상작이 0건이면 "심사(judging)" 유지. 운영진 수동 지정(override.phase==="awards")은 존중. 공개 스테이지 머신 `HackathonPhaseTimeline` 에 적용. `hackathon_submissions` list 규칙이 로그인 전용이라 **로그인 사용자만 실측**, 비로그인·수동 지정 시엔 원본 단계 유지(publishedCount=1 로 가드 비활성). `HackathonAwards` 는 이미 awards+0건을 숨김 처리하므로 무변경.

**② 심사 정체 넛지**: **신규 cron 없이** 기존 `hackathon-submission-reminder` 에 병합(`runJudgingStallNudge`). 수상 발표일(`HACKATHON_AWARDS_ANNOUNCE_DATE`) **D-2·D-1** 에 심사 진행률<100%(미판정 제출물 존재)면 심사위원(staff+)에게 인앱 넛지. dedup `push_logs/{hackathon_judging_nudge_{judgeId}_{dayKey}}`. 제출 마감 이후(dDiff<0) 구간에서 발동하도록 past-deadline 분기에 삽입.

**③ 수상 지정분 일괄 공개 버튼 (#18)**: 심사 콘솔(`app/console/hackathon/page.tsx` — 규율상 수정 허용) 심사 탭 상단에 `award` 지정됐지만 미공개인 산출물을 한 번에 공개하는 버튼 추가(개별 토글 누락 방지).

- `src/features/hackathon/config.ts` — `resolveHackathonPhaseGuarded`
- `src/features/hackathon/HackathonPhaseTimeline.tsx` — 가드 적용
- `src/app/api/cron/hackathon-submission-reminder/route.ts` — 심사 정체 넛지 병합
- `src/app/console/hackathon/page.tsx` — 일괄 공개 버튼

---

## 검증 결과
- `npx tsc --noEmit`: **에러 0**
- `npx eslint src --quiet`: **통과 (exit 0)**
- `vitest run approval-rules.test.ts`: **11/11 통과**
- build·commit: 규율대로 **미실행**
