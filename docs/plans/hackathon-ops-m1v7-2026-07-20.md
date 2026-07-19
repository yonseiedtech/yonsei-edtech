# 해커톤 허브 운영 완성 — 산출물 제출·심사 루브릭·수상작 아카이브 (v7-M1)

- 작성: 2026-07-20 (executor)
- 대상 이벤트: 에듀테크 해커톤 2026-08-22
- 계획 출처: `docs/plans/service-enhancement-plan-v7-2026-07-20.md` §3 M1
- 범위: 기존 해커톤 허브(v6-H6, 참가 신청·아이디어 보드 = comm_boards)를 확장.
  참가 신청/아이디어는 기존 comm_boards 그대로 두고, **산출물 제출·심사·수상**은
  심사(judging) 도메인이 필요하여 전용 컬렉션 2종을 신규 추가.

## 1. 데이터 모델

### 기존 재사용 (변경 없음)
- `comm_boards`(contextType="hackathon") + `comm_questions` — 참가 신청·아이디어 보드.

### 신규 컬렉션 2종

**`hackathon_submissions`** — 팀별 산출물 1건 (제출 회원 = 팀 대표 ownerId)

| 필드 | 타입 | 비고 |
|---|---|---|
| id | string | auto |
| contextId | string | `HACKATHON_CONTEXT_ID`(=`hackathon-2026-08-22`) |
| teamName | string | 팀 이름 (필수) |
| title | string | 산출물 제목 (필수, ≤80) |
| description | string | 설명 (필수, ≤600) |
| presentationUrl / demoUrl / repoUrl | string? | 발표자료·데모·저장소 링크 (선택) |
| members | string[] | 팀원 이름 목록 |
| ownerId / ownerName | string | 제출 회원 (수정·삭제 권한 기준) |
| award | "grand"\|"excellence"\|"encouragement"? | 운영진만 지정 |
| published | boolean? | 운영진만 공개 처리 (공개 페이지 수상작 노출) |
| createdAt / updatedAt | ts | |

- 1인(팀 대표) 1제출 — `ownerId` 로 본인 제출 판정, 본인 제출은 수정 가능.

**`hackathon_judgings`** — 심사위원 1명의 산출물 1건 점수 1건

| 필드 | 타입 | 비고 |
|---|---|---|
| id | string | **`${submissionId}_${judgeId}`** (결정적 → 심사위원별 분리·멱등) |
| contextId | string | 회차별 집계 조회용 |
| submissionId | string | |
| judgeId / judgeName | string | 심사위원(운영진) |
| scores | Record<RubricKey, number> | 기준별 0~5 |
| comment | string? | 심사 코멘트 |
| createdAt / updatedAt | ts | |

## 2. 심사 루브릭 (4기준 × 5점 = 20점 만점)

> 운영진 확정 전 **기본값**(계획 §4 외부의존). `src/types/hackathon.ts` `HACKATHON_RUBRIC` 상수에서 조정.

| 키 | 기준 | 설명 |
|---|---|---|
| problem | 문제 정의 | 교육 현장의 문제를 구체적·설득력 있게 정의했는가 |
| edtech | 교육공학적 근거 | 학습·교수 이론/근거에 기반해 해법을 설계했는가 |
| completeness | 구현 완성도 | 프로토타입·데모가 아이디어를 실제로 보여주는가 |
| presentation | 발표 | 문제-해법-가치를 명료하게 전달했는가 |

- 집계: `summarizeHackathonScores()` — 심사위원별 점수의 기준별 평균 + 총점(평균들의 합).

## 3. 화면 흐름

### 공개 페이지 `/hackathon` (기존 확장)
- 히어로(D-day·일정) → **수상작 섹션**(published 없으면 자동 숨김) → **산출물 제출** →
  참가 신청·아이디어 보드 → 타임라인 → FAQ.
- 산출물 제출(`HackathonSubmissions`): 회원 전용(게스트 가입 유도). 제출 폼(팀명·제목·설명·
  3링크·팀원) + 전체 제출 목록(링크·수상 배지). 마감(`HACKATHON_SUBMISSION_DEADLINE` 이후)이면
  폼 잠금·목록만.
- 수상작(`HackathonAwards`): `published && award` 인 제출을 상위 등급순 노출(팀·설명·링크 +
  포트폴리오 연계 안내 문구). 공개 수상작 없으면 `null`.

### 운영 콘솔 `/console/hackathon` (staff+ 신규, console/layout AuthGuard 로 보호)
- 제출 목록 + 심사위원(로그인 운영진)별 루브릭 점수 입력(4기준 0~5 버튼)·코멘트 → 저장(upsert).
- 심사위원 평균 집계·기준별 평균 표시.
- 수상 등급 지정(미수상/대상/최우수/장려) + 공개 토글(수상 등급 지정 후에만 공개 가능).
- 콘솔 좌측 내비 "활동" 그룹에 "해커톤 심사"(Trophy) 링크 추가.

## 4. firestore.rules

**`hackathon_submissions`**
- get: 로그인 회원 || `published==true`(공개 수상작은 누구나 단건 read)
- list: 로그인 회원 (회차 제출 목록 열람)
- create: 로그인 회원 본인 소유(ownerId==uid) + **award 키 불허 + published!=true**(제출자 자기수상 차단)
- update: 제출자 본인(내용만·award/published/ownerId **불변**) **또는** 운영진(수상/공개 지정)
- delete: 제출자 본인 || staff+

**`hackathon_judgings`**
- read/list: staff+ 만
- create/update: staff+ && `judgeId==uid` && `docId == submissionId + '_' + uid`(자기 doc 만)
- delete: staff+(본인 doc) || admin

## 5. 운영(코드) 설정
- 제출 마감 시각: `HACKATHON_SUBMISSION_DEADLINE`(config.ts) — 운영진이 상수만 수정.
- 루브릭/수상 등급 라벨: `HACKATHON_RUBRIC`·`HACKATHON_AWARD_LABELS`(types/hackathon.ts).

## 6. 포트폴리오 연계 (과설계 금지 — 표기만)
- 수상작 섹션 하단에 "마이페이지 › 포트폴리오 수상 이력으로 직접 추가" 안내 문구만 노출
  (`HACKATHON_PORTFOLIO_HINT`). 자동 적재는 미구현(향후 awards 컬렉션 연계 여지).

## 7. 알려진 트레이드오프 / 후속
- **게스트 수상작 열람**: Firestore list 규칙이 쿼리 필터(published)를 검증하지 못해,
  미공개 제출 노출을 막기 위해 list 를 로그인 회원으로 제한. 따라서 수상작 섹션은 로그인
  회원에게 노출된다. 완전 공개가 필요하면 `hackathon_public_winners` 같은 published 전용
  프로젝션 컬렉션으로 확장(현재는 과설계 회피로 미구현).
- 루브릭 기준·수상 정책·심사위원 확정은 운영진 이벤트 기획 의존(§4).

## 8. 변경 파일
- 신규: `src/types/hackathon.ts`, `src/features/hackathon/HackathonSubmissions.tsx`,
  `src/features/hackathon/HackathonAwards.tsx`, `src/app/console/hackathon/page.tsx`
- 수정: `src/types/index.ts`, `src/features/hackathon/config.ts`, `src/lib/bkend.ts`,
  `src/app/hackathon/page.tsx`, `src/app/console/layout.tsx`, `firestore.rules`

## 9. 검증
- `npx tsc --noEmit` → 0 errors
- `npx eslint`(변경 파일) → 0 errors (bkend.ts 기존 warning 3건은 무관·`--quiet` 통과)
- 배포/커밋은 게이트 담당(본 작업 범위 밖). **firestore.rules 배포 필요**(신규 2컬렉션).
