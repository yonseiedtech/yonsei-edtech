# 집중 코드 리뷰 — 17f680f1..162f883f (2영역 재검토)

- 일자: 2026-07-22 (이전 리뷰 유실분 재검토)
- 범위: ① 해커톤 신기능 런타임 결함 (5d707077·47261730·3f189db7·f6304ddc) ② 색상 마이그레이션 오변환 (c17f105c·6024641e·999b91b1·55b900ac·c23b03e6·b895f86c·75c3921f)
- 방법: git show/diff + HEAD(162f883f) 파일 실읽기 + firestore.rules 대조

**선행 리뷰 참고 (재검토 제외)**: toRecord 무한 재귀(bkend.ts:303)는 별도 발견되어 **f3dc9ea8로 수정 완료**. 리팩토링 4영역(console-research 분리·img→Image·탭 lazy·eslint suppress)은 선행 리뷰에서 **무결 판정**.

---

## ① 두 영역 종합 판정

### 영역 1 — 해커톤 신기능: **조건부 양호 (High 1건 수정 권고)**

- **아이디어 삭제 소유자 확인은 이중으로 지켜짐**: UI는 `myEntry`(=`entries.find(e => e.authorId === user.id)`, HackathonBoard.tsx:140-143)에만 수정/삭제 버튼 노출, 서버측 firestore.rules(comm_questions:1543-1558)도 `resource.data.authorId == request.auth.uid`(+보드 open) 강제. 본인 글만 삭제 가능 ✓. cascade 답변 삭제도 rules의 "부모 질문 작성자" OR절로 통과 ✓.
- **카운터 집계의 비로그인 read 통과 ✓**: comm_boards·comm_questions 모두 `allow read, list: if true`(rules:1524, 1539) — HackathonLiveBanner·HackathonPhaseTimeline의 익명 집계 쿼리 정상 (dataApi = Firestore client SDK 래퍼, 클라이언트측 인증 게이트 없음).
- null/undefined 접근: `boards?.data?.[0]?.id`, `questions?.data?.length ?? 0`, `myEntry.body ?? ""` 등 방어적 — NPE성 결함 미발견.
- 단, **CSV 수식 인젝션 무방비(High)** 와 태그 파싱·SSG D-day·보드 소유권 설계(Medium 3건)가 남음.

### 영역 2 — 색상 마이그레이션: **무결에 가까움 (치명적 의미 뒤바뀜 없음)**

- 표본 14파일(7커밋 전부 커버) 전수 diff 검사 결과 **green→destructive, red→success 류의 상태 의미 역전은 0건**. 상태 시맨틱이 걸린 곳(O/X 정오, 개선/유지, 세미나 취소, draft 배지, ADDIE 장단점)은 모두 올바른 방향으로 매핑됨.
- c17f105c의 design-tokens 14상수는 원본 hue를 1:1 보존(rose→rose, emerald→emerald)하는 리터럴 이동 — 오매핑 없음(academic.ts·research-status.ts 대조 확인).
- **다크모드 소실 없음**: `dark:` variant 제거는 토큰의 다크값 자동 적용 설계이며 globals.css에 success/info/cat-1~6 모두 다크 정의 존재(144-155행) 확인. 단 `text-white` 잔존 케이스는 다크 대비 약화(Low).
- 잔여 이슈는 **카테고리색↔상태색 혼용**(ARCSPanel rose→destructive 1건 Medium, 그 외 Low)과 미세한 대비/호버 소실 수준.

---

## ② Critical / High 목록

### Critical: 0건

### High: 1건

**H-1. CSV 수식 인젝션(Formula Injection) 무방비** — `src/features/hackathon/HackathonDdayConsole.tsx:150-165` (커밋 47261730)

- 문제: `downloadParticipantsCsv()`가 RFC4180 따옴표 이스케이프(`"` → `""`)만 수행. `authorName`·`body`·`presenter`는 회원 입력값인데 셀이 `=`, `+`, `-`, `@`, 탭/CR로 시작할 때의 수식 인젝션 방어가 없음. 운영진이 Excel로 열면(BOM까지 넣어 Excel 호환을 명시한 기능) `=HYPERLINK(...)`·DDE 계열 페이로드가 수식으로 실행될 수 있음 — 아이디어 본문(140자)에 `=` 시작 텍스트를 누구나 심을 수 있고, 소비자가 운영진이라 표적 가치가 있음.
- 권고: escape 함수에서 `/^[=+\-@\t\r]/` 시작 셀에 `'` prefix(또는 zero-width space)를 붙인 뒤 따옴표 이스케이프. 추가로 `\r` 제거(`replace(/\r?\n/g, " ")`).

---

## ③ Medium / Low — 개수 및 대표 항목

### Medium: 4건

| # | 위치 | 문제 | 권고 |
|---|------|------|------|
| M-1 | `src/features/hackathon/HackathonBoard.tsx:57-62, 676-679` (3f189db7) | `extractArea()`는 `"${area}:"`(공백 없음)도 매칭하지만 `displayBody`는 `slice(entryArea.length + 2)` 고정 → 공백 없이 `"고등교육:문제..."`로 입력된 글은 **본문 첫 글자가 잘려 렌더**됨 | 매칭된 prefix의 실제 길이를 반환해 그만큼 slice |
| M-2 | `src/app/hackathon/page.tsx:33, 56-68` (5d707077) | 서버 컴포넌트 + 정적 프리렌더(SSG) 페이지에서 `formatDday()`를 빌드 시점에 계산 → 히어로 D-day 라벨과 ≤3일 destructive/≤7일 warning **색상 임계값이 마지막 배포 시점에 고정**. 배포가 뜸하면 D-day 오표시. `formatDday`가 서버 로컬(UTC) 기준이라 KST 하루 오차도 겹침 | 배지를 client 컴포넌트로 분리(HackathonLiveBanner처럼)하거나 `export const revalidate = 3600` |
| M-3 | `src/features/hackathon/ensure-hackathon-board.ts:17-41` + `firestore.rules:1547-1558` (기존 v6 설계, 47261730의 수정/삭제 기능으로 영향 확대) | 해커톤 보드를 **처음 연 일반 로그인 회원이 board.ownerId가 되고**, rules상 보드 소유자는 모든 comm_questions **update/delete 가능** → 임의 회원 1인이 전체 참가 아이디어에 대한 영구 수정·삭제 권한 보유(UI 미노출이나 API 직접 호출 가능) | 해커톤 보드 ownerId를 운영 계정으로 백필하거나, rules에서 hackathon 컨텍스트 보드의 소유자 권한을 staff로 한정 |
| M-4 | `src/features/mypage/ARCSPanel.tsx:201-214` (6024641e) | ARCS 만족(S) 축의 **카테고리 장식색 rose를 상태색 destructive로 매핑** — "만족" 지표 전체(테두리·배경·아이콘·라벨)가 오류/위험 시맨틱으로 렌더. 같은 커밋의 board/page.tsx는 rose→cat-4로 올바르게 매핑해 컨벤션 불일치 | destructive → cat-4로 교체 |

### Low: 10건 (대표 5건)

- **L-1** `HackathonLiveBanner.tsx:52-56` (5d707077): 참가 0명 + D-8 이상이면 배지 없는 **빈 `<div class="mt-4 ...">` 렌더** — 불필요 여백. 조건을 "표시할 배지 존재"로 수정.
- **L-2** 단위 불일치 (5d707077 vs f6304ddc): 동일 집계를 LiveBanner는 "**N팀** 참가 신청 중", PhaseTimeline은 "**N명** 참가 신청"으로 표기.
- **L-3** `hackathon/page.tsx:62` (5d707077): `bg-warning text-white` — `--warning-foreground` 토큰이 있는데 raw white 사용. 다크 warning(lightness 60%)에서 대비 저하 + 다크 foreground(진한색) 미적용.
- **L-4** `HackathonPhaseTimeline.tsx:192-207` (f6304ddc): 신규 제출 D-day 블록이 기존 countdown의 "hydration 후 노출" 게이트 없이 렌더 중 `Date.now()` 직접 사용 — 빌드/조회 날짜 경계에서 hydration mismatch 가능. (같은 블록의 raw amber 클래스는 후속 2c31c2ed에서 warning 토큰으로 수정 완료 확인.)
- **L-5** `HackathonDdayConsole.tsx` CSV: listByBoard limit 500 초과분 **무경고 절단**.
- 나머지 5건(영역 2): 일요일 요일색 rose→**destructive** 오용(HabitTracker·LearningStreak·NetworkingPoll·gatherings/poll — 장식색을 상태토큰으로, 시각적으론 동일 계열); TopicExplorer 연구접근 배지 질적→success·개발설계→warning(카테고리에 상태토큰, cat-2/cat-3가 정확); `HeroSection.tsx:131` ZOOM 링크 `text-cat-1 hover:text-cat-1`로 **hover 상태 소실**(기존 blue-600→800); poll heat 중간 단계 `bg-cat-1/40 text-cat-1` 동일 hue 텍스트로 대비 저하 + `bg-cat-1 text-white` 다크(62% lightness) 대비 약화; writing-tips 잘못된 예 장문 rose-900(암적색)→destructive(선명한 빨강) 가독성 소폭 저하.

---

## ④ 검사 커버리지

### 영역 1 (4커밋 전량 diff + HEAD 실읽기)
- 5d707077: hackathon/page.tsx, HackathonLiveBanner.tsx(전문)
- 47261730: HackathonBoard.tsx(수정/삭제), HackathonDdayConsole.tsx(CSV)
- 3f189db7: HackathonBoard.tsx(extractArea·필터·배지)
- f6304ddc: HackathonPhaseTimeline.tsx, HackathonTeamView.tsx, console/page.tsx
- 대조 자료: firestore.rules(comm_boards/questions/answers/likes·hackathon_submissions), bkend.ts(commQuestionsApi·commBoardsApi·dataApi), ensure-hackathon-board.ts, dday.ts, auth 연동(myEntry) — 소유자 확인·비로그인 read·cascade 경로 검증 완료.

### 영역 2 (7커밋 전부, 표본 14파일 diff 검사 — 요구 10개 초과)
1. gatherings/poll/[id]/page.tsx (55b900ac) 2. HabitTracker.tsx (55b900ac·c23b03e6) 3. LearningStreak.tsx (c23b03e6) 4. NetworkingPoll.tsx (c23b03e6) 5. InterviewPlayer.tsx (999b91b1) 6. LearningEffectCard.tsx (999b91b1) 7. GraduationChecklistCard.tsx (999b91b1) 8. HeroSection.tsx (b895f86c) 9. TopicExplorer.tsx (b895f86c) 10. archive/writing-tips/[id]/page.tsx (75c3921f) 11. steppingstone/conference/page.tsx (75c3921f) 12. board/page.tsx (6024641e) 13. ARCSPanel.tsx (6024641e) 14. types/academic.ts + collaborative-research/lib/research-status.ts (c17f105c)
- 추가 확인: globals.css 토큰 라이트/다크 정의(success·info·warning·cat-1~6), design-tokens.ts 상수 구조, board/page.tsx `stripColorClass` 신규 토큰 호환(`text-cat-N`→`bg-cat-N` 정상).

### 미검사(범위 외)
- 영역 2의 나머지 대량 마이그레이션 커밋(56e42ca6 90파일, 7c4f8ee6 64파일, 4daa790b, d0f63354 등)은 지정 7커밋 외라 표본 미포함 — 동일 자동 패턴이므로 위 Low 계열(요일 destructive·hover 소실류) 유형이 추가 존재할 수 있음.
- 런타임 실행(QA 스모크)·빌드 검증은 권한 경계(읽기 전용)로 미수행.

---

## 판정 요약

| 영역 | 판정 | Critical | High | Medium | Low |
|------|------|----------|------|--------|-----|
| 1. 해커톤 신기능 | 조건부 양호 | 0 | 1 (CSV 인젝션) | 3 | 5 |
| 2. 색상 마이그레이션 | 의미 역전 0건 | 0 | 0 | 1 (ARCSPanel) | 5 |
| **계** | | **0** | **1** | **4** | **10** |
