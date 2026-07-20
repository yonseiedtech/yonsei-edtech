# 해커톤 사후 파이프라인 H2v13 구현 보고서 (2026-07-21)

> 트랙 A — v13 §H2 "아카이브로 남습니다" 약속 이행 + 팀원 크레딧

---

## 1. 변경 파일 목록

| 파일 | 변경 내용 |
|---|---|
| `src/types/hackathon.ts` | `HackathonSubmission`에 `memberIds?: string[]` 필드 추가 |
| `src/features/hackathon/HackathonSubmissions.tsx` | `MemberAutocomplete` 기반 팀원 다중 선택 UI + `memberIds` payload 저장 |
| `src/lib/portfolio-autofill.ts` | 해커톤 소스를 `ownerId ∪ memberIds`로 확장, 역할 구분 |
| `src/features/hackathon/HackathonAwards.tsx` | 수상→포트폴리오 1클릭 버튼 + 운영진 아카이브 딥링크 |
| `src/features/hackathon/config.ts` | `HACKATHON_PORTFOLIO_HINT` 실제 버튼 존재에 맞게 갱신 |
| `src/app/console/archive/writing-tips/new/page.tsx` | `useSearchParams`로 `?title=&url=` 프리필 수신 |
| `src/components/archive/WritingTipForm.tsx` | `prefill?: { title?, url? }` prop 추가 — 신규 폼에서 title·참고자료 URL 자동 채움 |

---

## 2. 필드 스키마 (hackathon_submissions 문서 추가 필드)

```
memberIds: string[]   // 선택 사항, 기본값 없음 (기존 문서에는 필드 부재)
```

- 기존 `members: string[]` (이름 배열) 하위호환 **유지** — 텍스트 입력란 그대로 존재
- `memberIds` = profiles userId 배열, 신규 또는 수정 저장 시에만 기록됨
- 미선택(빈 배열) 저장 허용 — 제출 마찰 최소화

---

## 3. firestore.rules 판단

기존 `hackathon_submissions` 규칙 분석:

```
allow create: if isAuthenticated()
  && request.resource.data.ownerId == request.auth.uid
  && !request.resource.data.keys().hasAny(['award'])
  && request.resource.data.get('published', false) == false;

allow update: if isAuthenticated() && (
  (resource.data.ownerId == request.auth.uid
    && request.resource.data.ownerId == request.auth.uid
    && !request.resource.data.diff(resource.data).affectedKeys().hasAny(['award', 'published', 'ownerId']))
  || isStaffOrAbove()
);
```

**판단: rules 수정 불필요.**
- create 규칙: `memberIds` 필드를 차단하는 `hasAny` 목록에 없음 → 통과
- update 규칙: 변경 차단 대상은 `['award', 'published', 'ownerId']` 뿐 → `memberIds` 수정 허용

---

## 4. 구현 상세

### 4-1. 팀원 크레딧 (memberIds)

- **UI**: `HackathonSubmissions.tsx` 폼에 `MemberAutocomplete` 기반 다중 선택 UI 추가
  - 이름 칩(chip) + 개별 X 제거, `approvedOnly=true` 승인 회원만 검색
  - `ownerId` 및 기존 선택된 멤버는 `excludeIds`로 중복 제외
  - 기존 편집 모드 진입 시 `mine.memberIds` → `useAllMembers()` 로 이름 매핑
- **저장**: `handleSave()`에서 `memberIds: memberIdItems.map(m => m.id)` payload 포함
- **하위호환**: 기존 `members: string` 텍스트 입력 및 표시는 그대로 유지

### 4-2. 자동적재 확장 (portfolio-autofill.ts)

```typescript
// Before: ownerId 일치만
if (sub.ownerId !== userId) continue;
const sourceRef = `hackathon:submission:${sub.id}`;
role: "팀 대표",

// After: ownerId ∪ memberIds
const isOwner = sub.ownerId === userId;
const isMember = !isOwner && (sub.memberIds ?? []).includes(userId);
if (!isOwner && !isMember) continue;
const sourceRef = isOwner
  ? `hackathon:submission:${sub.id}`          // 대표: 기존 키 그대로 (하위호환)
  : `hackathon:submission:${sub.id}:member`;  // 팀원: 별도 키로 멱등 보장
role: isOwner ? "팀 대표" : "팀원",
```

- 멱등: sourceRef가 대표/팀원 별도이므로 한 제출에 두 사람이 각각 적재 가능
- `PortfolioAutofillDialog`는 변경 없음 — 이미 `hackathon_submissions` 전체 조회 후 filter

### 4-3. 수상→기록 반자동 (HackathonAwards.tsx)

① **포트폴리오 1클릭 버튼** (본인에게만 표시):
- 조건: `s.ownerId === user.id || (s.memberIds ?? []).includes(user.id)`
- 호출: `externalActivitiesApi.create()`에 `autoSourceRef: "hackathon:award:{id}"` 포함
- 멱등: `autoSourceRef`는 PortfolioAutofillDialog의 기존 dedup 로직에서도 "추가됨"으로 표시
- 세션 내 완료 표시: `addedAwards: Set<string>` 상태로 버튼 → "포트폴리오에 추가됨" 전환
- type: `"conference"`, role: 대표 "팀 대표 (수상)" / 팀원 "팀원 (수상)"
- 색상: 시맨틱 토큰만 사용 (`border-primary/20 bg-primary/10 text-primary`)

② **아카이브 산출물로 등록 딥링크** (staff 이상에게만 표시):
- 착지: `/console/archive/writing-tips/new?title=...&url=...`
- title = `[해커톤 수상] {제목} ({팀명})`, url = 발표자료 > 데모 > 저장소 우선순위
- 폼 쪽에서 수신: `ConsoleWritingTipsNewPage`가 `useSearchParams()`로 파라미터 읽어 `WritingTipForm`에 `prefill` prop 전달
- `WritingTipForm`에서: `title` 필드 초기값으로 `prefill.title`, 참고자료 목록에 `prefill.url` 1건 자동 추가

③ **HACKATHON_PORTFOLIO_HINT** 갱신:
- "직접 추가해" 수동 안내 → 실제 버튼 존재를 안내하는 문구로 교체

---

## 5. 멱등 처리 요약

| 소스 | sourceRef / autoSourceRef | 멱등 방식 |
|---|---|---|
| 해커톤 참가 (대표) | `hackathon:submission:{id}` | PortfolioAutofillDialog 기존 dedup |
| 해커톤 참가 (팀원) | `hackathon:submission:{id}:member` | PortfolioAutofillDialog 기존 dedup |
| 수상 이력 1클릭 | `hackathon:award:{id}` | 세션 내: addedAwards Set; 크로스세션: autoSourceRef 중복 표시 |

---

## 6. 검증 결과

- `npx tsc --noEmit`: **에러 0**
- `npx eslint --quiet` (7개 파일): **에러 0**
- `node scripts/check-rawcolor-ratchet.mjs`: **PASS (347/347 — 변동 없음)**
- 신규 컬렉션: **0** (hackathon_submissions 필드 추가 + external_activities 재사용)
- `npm run build` / `git commit`: 메인 게이트에서 수행 예정
