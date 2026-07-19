# 운영진 설정(조직 연동) 리뷰 지적사항 보수 — 2026-07-19

리뷰 보고서 `docs/plans/org-settings-review-2026-07-19.md` 의 B급 8건 + C급 2건 처리 내역.
최소 변경 원칙(과설계 금지) 준수. `#9`(grad-life 프리필)는 범위 제외.

## 수정 파일
- `src/features/admin/settings/useOrgChart.ts`
- `src/features/admin/settings/OrgChartEditor.tsx`
- `src/features/admin/HandoverSection.tsx`
- `src/components/ui/MemberAutocomplete.tsx`

(`member/OrgChart.tsx` 는 배정 단계 차단(#5)·계단식 삭제 방어(#8)가 상류에서 해결되어 직접 수정 불필요)

## 항목별 처리 결과

- **#4 파싱 크래시** — `useOrgChart.ts` queryFn 의 `JSON.parse` 를 try/catch 로 감쌈. 실패·비배열 시 `[]` 폴백 + `console.warn`. 손상값이 공개 조직도까지 붕괴시키지 않음.
- **#5 미승인 회원 노출** — `MemberAutocomplete` 에 `approvedOnly` prop 추가(승인 회원만 검색 노출). `OrgChartEditor` 배정 UI 에서 `approvedOnly` 지정 + "승인된 회원만 배정할 수 있습니다" 힌트. 공개 조직도는 저장된 비정규화 이름을 쓰므로 배정 단계 차단이 1차 방어.
- **#8 계단식 삭제** — `handleDelete` 를 서브트리 전체 재귀 수집(Set + 고정점 루프) 후 일괄 제거로 변경. 추가로 `buildOrgTree` 에서 죽은 parentId 를 가리키는 고아 노드를 루트로 승격하지 않고 드롭.
- **#1 과도승격** — `ORG_ROLE_TO_USER_ROLE` 에서 `team_member` 매핑 제거(팀원은 운영진 권한 불필요 → 제안 제외). `vice_president`/`direct_aide`→`staff` 는 실권한 판단으로 유지하되, 승격 제안 박스에 `ROLE_PERMISSION_NOTE`("부여될 권한: 운영진 콘솔 접근…") 문구로 부여 권한 수준 명시.
- **#2 잔존권한** — `warnResidualRole()` 헬퍼 추가. 배정 해제(`onClear`)·교체(`onSelect`) 시 이전 담당자가 staff 이상 역할 보유자면 "계정 역할은 자동으로 변경되지 않습니다. 회원 관리에서 역할을 검토하세요" toast. 자동 강등 없음(원칙 유지).
- **#3 동시편집** — `useOrgChart` 가 로드 시 `signature`(updatedAt 우선, 없으면 원본 value) 노출. `handleSaveAll` 을 async 로 바꿔 저장 직전 `siteSettingsApi.getByKey` 로 최신 시그니처를 재조회·비교, 다르면 `confirm("다른 운영자가 먼저 저장했습니다. 덮어쓸까요?")` 후 진행. 항목단위 patch 재설계 없이 통짜 저장 유지.
- **#6 고아 userId** — `OrgChartEditor` 에 `useAllMembers` 추가. `isOrphanAssignee()` 로 배정 userId 가 현재 회원 목록에 없으면 카드에 "탈퇴/미확인 회원" 경고 배지(로딩 중 오탐 방지 가드 포함). 프로필 링크 자체는 유지(프로필 페이지가 null 처리).
- **#7 개명 매칭** — `HandoverSection` 의 `roleOptions` 를 (조직 직책 ∪ 기본 STAFF_ROLES ∪ **기존 handover_docs 의 실재 role**) 합집합으로 확장. 이를 위해 `handover_docs` 쿼리를 `roleOptions` 위로 이동(중복 쿼리 제거). 직책 개명 시에도 기존 문서가 탭에서 이탈하지 않음.
- **#10 ?role= 검증** — `validRoleParam = roleParam ∈ roleOptions ? roleParam : null`. 필터 동기화·`?compose=1` 자동오픈 모두 `validRoleParam` 기준으로만 동작 → 개명·삭제된 role 딥링크는 무시. `docForm` 초기 role 도 `STAFF_ROLES[0]` 안전값으로.
- **#11 이탈 경고** — `dirty` 플래그 추가. 편집 핸들러(추가·삭제·순서이동·기본구조 불러오기)에서 `setDirty(true)`, 저장 성공 시 해제. `dirty` 시 `beforeunload` 리스너로 이탈 경고.
- **#12 order** — 신규 직책 order 를 저장 시 동일 부모 스코프 `max+1` 로 부여(전역 count 충돌 제거). `handleMoveOrder` 스왑 범위를 동일 `parentId` 스코프로 한정(다른 가지 순서 비교란).

## 검증
- `npx tsc --noEmit` → exit 0 (src 타입 오류 0)
- `npx eslint src --quiet` → 통과 (오류 0)
- build·배포는 메인 통합 게이트에서 수행(본 작업 범위 아님). commit/push 미수행.
