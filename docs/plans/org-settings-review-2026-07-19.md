# 운영진 설정(조직 연동) 독립 코드 리뷰 — 2026-07-19

- 대상 커밋: `f28ddcf0` (조직 연동 트랙)
- 리뷰 파일: `OrgChartEditor.tsx`, `useOrgChart.ts`, `HandoverSection.tsx`, `member/OrgChart.tsx` (+ 연동: `useMembers.ts`, `MemberAutocomplete.tsx`, `permissions.ts`, `public-profile.ts`)
- 방식: 읽기 전용 정적 리뷰. `npx tsc --noEmit` = **exit 0** (대상 4파일 타입 오류 0). LSP 서버 미설치로 tsc 대체 검증.
- 심각도: **A** = 반드시 수정(치명/차단) · **B** = 수정 권고(데이터안전·정합·논리결함) · **C** = 선택(엣지·UX)

## 판정: REQUEST CHANGES (권고) — A급 0건 / B급 8건 / C급 5건
자동 강등 없음·명시 승격·감사로그·공석 처리 등 핵심 설계는 정확. 다만 **동시편집 유실, JSON 파싱 크래시, 미승인 회원 실명 공개 노출, 계단식 삭제 누락**은 배포 상태에서 실제 사고로 이어질 수 있어 우선 보완 권고.

## 발견 표

| # | 파일:라인 | 문제 | 심각도 | 수정안 |
|---|-----------|------|--------|--------|
| 1 | OrgChartEditor.tsx:43-49 | `team_member`/`vice_president`/`direct_aide` → 모두 `staff`(권한계층 3) 승격 제안. 단순 "팀원" 직책 배정이 계정을 운영진(staff) 권한으로 올리도록 제안 → 최소권한 위반·과도승격 | B | 승격 제안을 실제 권한이 필요한 역할(president/advisor)로 한정하거나, team_member는 `member` 매핑 또는 제안 제외 |
| 2 | OrgChartEditor.tsx:224-228 (onClear), handlePromote 전용 | 배정 해제·재배정 시 이전 담당자의 상향된 계정 역할을 되돌리는 경로 없음 → 승격 권한이 고아로 잔존(silent privilege) | B | 해제/재배정 시 "역할 강등 검토" 안내 또는 감사 태그. (자동 강등은 금지 원칙과 상충하므로 수동 유도) |
| 3 | useOrgChart.ts:77-90 + OrgChartEditor.tsx:335-340 | `site_settings.org_chart` 전체 JSON 통짜 덮어쓰기. 낙관적 동시성(version/updatedAt) 없음 → 두 운영자 동시 편집 시 last-write-wins 무통보 유실 | B | 저장 시 서버 updatedAt 비교 후 충돌 경고, 또는 항목 단위 patch |
| 4 | useOrgChart.ts:65 | `JSON.parse(row.value)` try/catch 없음. 손상/레거시 값이면 쿼리 전체 throw → 편집기뿐 아니라 **공개 조직도**(member/OrgChart.tsx)까지 동반 붕괴 | B | try/catch로 감싸 실패 시 `[]` 폴백 + 콘솔 경고 |
| 5 | member/OrgChart.tsx:83-85, 228-233 / 배정: OrgChartEditor.tsx:221-230 | **미승인 회원 실명 공개 노출.** 배정은 `useAllMembers`(approved 무관)에서 선택 → `userName`이 org_chart에 비정규화 저장 → 공개 조직도가 대기중 가입자의 실명·이니셜을 렌더. 프로필 링크는 `getProjectedProfile`이 approved===false를 null 처리해 막지만(양호), 조직도 카드의 이름 자체는 그대로 노출 | B | 배정 시 승인 회원만 허용(MemberAutocomplete에 approved 필터) 또는 공개 렌더 전 승인 상태 확인 |
| 6 | member/OrgChart.tsx:104-114 | 고아 userId·stale 비정규화. 담당자 하드삭제(useDeleteMember)/개명 시 org_chart는 옛 이름·사진 유지, `/profile/{userId}`는 null 프로필로 귀결(유령 카드) | B | 렌더 시 실제 회원 존재/이름 재조회 또는 저장 시 회원 삭제 훅과 정리, 최소한 링크 유효성 폴백 |
| 7 | HandoverSection.tsx:51-54,124-137 + OrgChartEditor.tsx:124-126 | 직책명 문자열 매칭(`d.role === title`). 직책 개명 시 기존 handover_docs가 해당 탭에서 이탈(roleOptions에 옛 이름 없음)·linkedNoteCount 0. 하위호환/마이그레이션 없음 | B | 직책에 안정적 id 부여 후 docs를 id로 연결, 또는 개명 시 handover_docs.role 일괄 갱신 |
| 8 | OrgChartEditor.tsx:313-315 + useOrgChart.ts:101-107 | 계단식 삭제 불완전. `handleDelete`는 직속 자식(parentId===id)만 제거 → 손자 노드의 parentId가 죽은 노드 지목 → `buildOrgTree`가 고아를 **루트로 승격** → 공개 조직도 최상단에 튀어나옴 | B | 삭제 시 서브트리 전체 재귀 제거, 또는 buildOrgTree에서 고아를 루트 승격하지 않고 드롭 |
| 9 | OrgChartEditor.tsx:266-271 | grad-life 교차링크가 정적 `/console/grad-life/positions` — 회원/직책 컨텍스트 미전달. "이력에 기록" 문구 대비 실제 프리필 없음 | C | `?userId=&position=` 쿼리 전달 후 대상 페이지 프리필 |
| 10 | HandoverSection.tsx:75-82 | `?role=` 파라미터를 검증 없이 역할 값으로 사용 → 오래된/개명된 role로 진입 시 고아 role 문서 생성 가능 | C | roleOptions 포함 여부 검증 후 미포함이면 무시/경고 |
| 11 | OrgChartEditor.tsx 전반 (dirty guard 없음) | 저장 전 이탈 경고 없음. 모든 편집이 로컬 `items` 상태, 저장 전 이탈 시 무통보 유실. 파괴적 "초기화"에만 confirm | C | beforeunload 또는 dirty 플래그 기반 이탈 확인 |
| 12 | OrgChartEditor.tsx:74, 317-333 | 신규 직책 기본 order=`allPositions.length` → 삭제 후 기존 order와 충돌 가능. handleMoveOrder는 order가 레벨-전역이라 다른 부모 가지 순서까지 교란 | C | order를 부모 스코프로 재계산, 신규 order는 동일 레벨 max+1 |
| 13 | member/OrgChart.tsx (duty/handover 비노출) | (양호) `duty`·`handover`가 공개 조직도에 렌더되지 않음 — 스펙(공개 비노출) 준수 | POSITIVE | — |

## 관점별 요약
1. **정확성**: 강등 제안 없음(needsPromotion이 current<suggested만 발화, advisor 계층 2가 staff 3 보유자에게 오발 안 함) — 정확. 승격은 confirm→changeRole→logAudit 명시 경로만·자동변경 없음 — 스펙 충족(POSITIVE). 단 매핑 과도승격(#1)·해제 시 잔존권한(#2).
2. **데이터 안전**: 동시편집 유실(#3), 파싱 크래시 전파(#4), 고아 userId·stale(#6). 공개 프로필 링크는 미승인/삭제를 서버 투영이 방어(양호)하나 **조직도 카드 이름 노출은 미방어(#5)**.
3. **연동 일관성**: 개명 시 handover 매칭 단절(#7). ?role=&compose=1 딥링크는 composedRef 1회 가드로 정확(POSITIVE). grad-life 프리필은 실질 미동작(#9).
4. **UX·엣지**: 공석 렌더 우수(POSITIVE). 계단식 삭제 누락(#8), 이탈 경고 없음(#11), order 충돌(#12).

## 검증 근거
- `git show f28ddcf0` diff 확인, 대상 4파일 + 연동 7파일 정독.
- `npx tsc --noEmit` exit 0 — 대상 파일 신규 타입 오류 0.
- `getProjectedProfile`(public-profile.ts:39): approved===false → null 확인(프로필 링크 방어 O, 조직도 이름 노출 X).
