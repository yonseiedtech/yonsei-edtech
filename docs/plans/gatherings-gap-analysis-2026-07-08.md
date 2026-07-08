# 모임(gatherings/networking) 기능 전면 갭 분석 — 2026-07-08

- 분석 범위: 오늘까지 배포된 모임 기능 전체 (코드 실측 기반, 읽기 전용)
- LIVE: https://yonsei-edtech.vercel.app/gatherings
- 분석자: 서비스 분석가(planner/UX)
- 방법: `src/app/gatherings/**`, `src/features/networking/**`, `src/app/api/networking/**`, `src/app/api/cron/networking-reminder`, `src/types/networking.ts`, `firestore.rules` networking 블록, 오늘자 보고서 6종 정독

---

## 1. 현황 지도 — 기능 인벤토리

| 영역 | 기능 | 구현 위치 | 상태 |
|---|---|---|---|
| 목록 | 다가오는/지난 모임 분리, 미확정 poll 상단 고정, private 필터(staff만 노출) | `src/app/gatherings/page.tsx:66-99` | ✅ |
| 생성 | staff+ 즉시 생성 다이얼로그 / 콘솔 생성·수정 | `gatherings/page.tsx:120-137`, `console/networking/page.tsx:62-72` | ✅ |
| 이벤트 유형 | 개강/종강총회·정기·수시·MT·기타 | `types/networking.ts:6-15` | ✅ |
| 일정 결정 | fixed(고정 일시) / poll(가능일 투표) 토글 | `EventEditorForm.tsx:248-296` | ✅ |
| 일정 투표 | 캘린더 히트맵, 날짜→시간대 팝업, 실시간 7초 집계, 최다일 TOP3 | `NetworkingPoll.tsx` | ✅ |
| 투표 확정 | 운영진 수동(manual) / cron 자동(auto, 마감 후 bestSlots) | `NetworkingPoll.tsx:233-252`, `cron:195-228` | ✅ |
| 투표 공유 | 공개 poll 종합 페이지(비로그인 열람, OG 카드), navigator.share | `gatherings/poll/[id]/page.tsx`, `GatheringEventCard.tsx:98-116` | ✅ |
| RSVP(회원) | 참석/불참/미정, 서버 검증(마감·정원·중복) 트랜잭션 | `GatheringEventCard.tsx:118-142`, `api/networking/rsvp/route.ts` | ✅ |
| RSVP(게스트) | 이름+연락처 신청, IP rate-limit 5/h, 서버 마감·정원·중복 검사 | `GatheringEventCard.tsx:144-179`, `api/networking/rsvp-guest/route.ts` | ✅ |
| 정원 | capacity 설정 시 초과 거부(동반 포함 합산) | `rsvp/route.ts:47-55`, `rsvp-guest/route.ts:66-79` | ⚠️ 입력 UI 없음(3-1) |
| 참석자 명단 | 옵트인 공개, 참석자끼리, 서버 필터 프로필·쪽지 팔로업 | `AttendeeRoster.tsx`, `api/networking/roster/route.ts` | ✅ |
| 후기 | 지난 행사 별점 1~5+한줄, 1인1건 upsert, 평균 표시 | `EventReviews.tsx` | ✅ |
| 세부 프로그램 | 시간표(시간·제목·발표자·설명) 추가·정렬·삭제 | `NetworkingProgramManager.tsx` | ✅ |
| 회비 | 참석자 회비항목 일괄 생성, 납부/미납/면제 수동 체크, 정산 요약, CSV | `console/networking/page.tsx:153-219` | ⚠️ 운영 수동(5-1) |
| 비공개 모임 | 토큰 매핑 컬렉션 분리, 공유 링크, 초대 알림+중복가드 | `gatherings/p/[token]`, `networking_event_tokens`, `EventEditorForm.tsx:201-212` | ✅ |
| 리마인더 | D-1/당일, RSVP마감 D-1, 후기요청 D+1, poll마감 D-1, 자동확정 알림 | `cron/networking-reminder/route.ts` | ✅ |
| 잔디 연동 | 당일 참석자 streak +5점 멱등 적립 | `cron:114-131` | ⚠️ 실참석 미검증(4-1) |
| 캘린더 | /calendar 에 networking 카테고리로 표시 | `app/calendar/page.tsx:117-153` | ✅ |
| 갤러리 연동 | 행사↔앨범 역링크 "행사 사진 보기" | `GatheringEventCard.tsx:237-246` | ✅ |

---

## 2. 갭 목록 (심각도 · 근거 · 기대효과 · 규모)

심각도: **P0 치명** / **P1 높음** / **P2 중간** / **P3 낮음**. 규모: S(수시간) / M(1~2일) / L(3일+)

### 2-1. 라이프사이클 결측 고리

**[P1] G1. 취소·연기 커뮤니케이션 전무 — 알림 미발송** · 규모 M
- 근거: 상태를 `cancelled`로 바꾸거나 `startAt`(일시)을 변경해도 참석 신청자에게 알림이 가지 않는다. cron(`networking-reminder`)은 리마인더·확정만 처리하고 취소/변경 분기가 없음(`cron:90-229` 전체에 cancelled 처리 없음). UI는 취소 배지만 표시(`GatheringEventCard.tsx:199-201`).
- 기대효과: attending 회원이 취소를 모르고 현장에 가는 사고 방지. 신뢰도 직결.
- 처리: 이벤트 update 시 status→cancelled 또는 startAt 변경 감지 → attending/undecided 대상 인앱 알림. (client 저장 경로 `EventEditorForm.save`에 훅 추가 또는 cron에 변경 감지 분기)

**[P1] G2. 정원 초과 대기자(waitlist) 없음 — 하드 거부** · 규모 M
- 근거: 정원 마감 시 `"정원이 가득 찼습니다"` 409로 즉시 거부(`rsvp/route.ts:54`, `rsvp-guest/route.ts:77`). 대기 순번·자동 승격 없음. 취소자 발생 시 빈자리 채우는 흐름 부재.
- 기대효과: 인기 모임(MT 등)에서 이탈 최소화, 취소→대기자 승격 자동화로 운영 손 줄임.
- 처리: RSVP status에 `waitlisted` 추가 + 취소 시 대기 1순위 승격 알림. (타입·API·UI 손댐)

**[P2] G3. 당일 체크인 / 노쇼 트래킹 없음** · 규모 M
- 근거: 당일 attending RSVP 회원 전원에게 streak +5점을 무조건 적립(`cron:114-131`) — 실제 참석 여부와 무관. 노쇼(신청 후 불참) 기록·경고 수단 없음. 현장 출석 확인 UI 없음.
- 기대효과: 잔디/포인트 어뷰징 차단, 반복 노쇼자 파악, 정산 정확도(실참 기준).
- 처리: 콘솔 명단에 체크인 토글(attended 플래그) + streak를 attended 기준으로 전환.

**[P2] G4. 반복 모임(recurring) 미지원** · 규모 M
- 근거: "정기모임" 유형이 있으나(`types:11`) 개별 이벤트를 매번 수동 생성해야 함. 반복 규칙·복제 기능 없음.
- 기대효과: 격주 스터디·월례회 등 반복 운영 부담 절감.
- 처리: "이 모임 복제" 버튼(최소) → 반복 규칙(주/월)(확장).

**[P2] G5. 회비 미납 독촉·자기확인 흐름 없음** · 규모 M
- 근거: cron 리마인더에 회비 미납 알림 분기 없음(`cron` 전체). 회원은 due 레코드를 staff가 생성해야만 "내 회비: 미납"을 봄(`GatheringEventCard.tsx:249-261`); staff가 회비항목을 만들지 않으면 본인이 낼 돈이 있는지조차 모름. 여러 모임의 미납 합계를 보는 마이페이지 뷰 없음.
- 기대효과: 미납 회수율↑, 총무 수기 독촉 부담↓.
- 처리: 미납 due 대상 D-day 알림 + 마이페이지 "내 미납 회비" 집계.

### 2-2. 역할별 여정 마찰

**[P1] G6. `companions`(동반인) 입력 UI 부재 — 유령 필드** · 규모 S
- 근거: `companions`가 정원 합산(`rsvp/route.ts:53`, `rsvp-guest:73`)·정산 인원(`networking-helpers.ts:41`)·CSV·콘솔 표시(`console:208,290`)에 **쓰이지만**, 회원 RSVP(`setMemberRsvp`, body에 status만)·게스트 신청(`submitGuest`, name+contact만) 어디에도 companions를 **입력·전송하는 UI가 없다**. 항상 0으로 계산됨.
- 기대효과: 예상 수입·정원 계산이 구조적으로 과소 집계되는 버그 해소. 값이 낮은데 효과 큼 → Quick Win.
- 처리: RSVP/게스트 폼에 동반인 수 입력 추가, 서버 API가 값 반영.

**[P2] G7. 게스트 신청 취소·상태변경 불가 + 항상 참석 고정** · 규모 M
- 근거: 게스트는 `status: "attending"` 고정 저장(`rsvp-guest/route.ts:87`), 불참/미정 선택 불가. 신청 후 본인이 조회·취소할 경로 없음(연락처 기반 조회 API 없음). 잘못 신청 시 총무에게 연락해야 함.
- 기대효과: 게스트 자율 정정, 총무 수동 처리 감소.
- 처리: 게스트 신청 확인 링크(토큰) 또는 연락처+이름 조회 취소 API.

**[P3] G8. 회원 RSVP 완전 철회(withdraw) 없음** · 규모 S
- 근거: 3버튼 토글만 존재(`GatheringEventCard.tsx:284-303`), 신청 자체를 지우는 경로 없음. not_attending 레코드가 남아 명단·정산에 잔존(정산은 attending만 세므로 실피해는 적음).
- 기대효과: 명단 정확도·심리적 부담↓.

**[P3] G9. 게스트→회원 전환 퍼널 (진행 중)** · 규모 L
- 근거: 게스트 RSVP가 이름·연락처를 수집하지만(`rsvp-guest`) 잠재회원으로 연결·가입 유도하는 경로 없음. `grep` 결과 networking 영역에 prospective/전환 로직 없음.
- 상태: **진행 중** — "비로그인 투표+잠재회원 연계" 별도 트랙에서 구현 중. 본 분석은 표기만.

### 2-3. 일정 투표 엣지·정합

**[P1] G10. 투표 마감 후 확정 전 "림보" 구간** · 규모 M
- 근거: `pollClosed`(마감)면 UI 투표는 비활성(`NetworkingPoll.tsx:161,197`)되지만, auto 자동확정은 cron이 **매일 09:00에만** 실행(`cron:195`). 마감~다음 cron 사이(최대 ~24h) 이벤트는 startAt이 없어 `isPollPending`=true로 "일정 조율 중" 상태에 머물며 RSVP도 불가. manual 모드는 staff가 확정할 때까지 무기한 림보.
- 기대효과: 확정 지연으로 인한 혼란 제거. 마감 즉시 확정(또는 명확한 "확정 대기" 안내).
- 처리: 마감 시 UI에 "곧 확정됩니다" 안내 + auto는 마감 감지 즉시 확정(cron 주기 단축 또는 접속 시 확정 트리거).

**[P2] G11. pollDeadline 미설정 poll 은 영구 미확정** · 규모 S
- 근거: `pollDeadline`은 선택값(`EventEditorForm.tsx:285` 필수 아님). cron 자동확정·리마인더 둘 다 `ev.pollDeadline` 존재를 전제(`cron:164`). 마감 없이 auto로 만들면 자동확정이 절대 안 걸리고, staff가 수동 확정 안 하면 영원히 poll 상태.
- 기대효과: "만들었는데 확정이 안 됨" 지원요청 방지.
- 처리: auto 선택 시 pollDeadline 필수화, 또는 마감 없는 poll 경고.

**[P2] G12. 자유 텍스트 시간대 → 무음 18:00 확정** · 규모 S
- 근거: 시간대에 "저녁"·"오후" 자유 입력 허용(`EventEditorForm.tsx:282`, placeholder 안내). 확정 시 `resolveSlotStartAt`이 HH:MM 아니면 조용히 18:00로 폴백(`networking-utils.ts:91-95`). "저녁" 투표가 18:00로 확정돼도 사용자에게 경고 없음.
- 기대효과: 의도와 다른 시각 확정 방지.
- 처리: 확정 전 폴백 발생 시 운영진에게 시각 확인 프롬프트, 또는 시간대 입력을 HH:MM로 제약.

**[P3] G13. 확정 후 재투표·되돌리기 경로 없음** · 규모 S
- 근거: 확정은 startAt 지정+fixed 전환 단방향(`NetworkingPoll.tsx:238-242`). 잘못 확정 시 콘솔 수정 폼에서 다시 poll로 바꿔야 하며(수동), 기존 응답·안내와의 정합 흐름 없음.

**[P3] G14. 새 투표 개시 알림 없음** · 규모 S
- 근거: cron은 마감 임박에만 넛지(`cron:170`). poll을 새로 열어도 회원에게 "투표 시작" 알림이 없어, 접속하지 않는 회원은 존재를 모름. (비공개는 초대 알림 있음)
- 기대효과: 초기 응답률↑.

### 2-4. 비공개 모임 남은 구멍 (보고서 잔여 리스크 재평가)

**[P2] G15. 비공개 이벤트 메타데이터 공개 read 잔존** · 규모 M
- 근거: `networking_events` `allow read: if true`(`firestore.rules:227`). 토큰은 별도 컬렉션으로 분리됐으나(High-1), 제목·장소·설명·`invitedUserIds`(회원 id 목록)는 SDK 직접 쿼리로 여전히 열람 가능. private-token-security-fix 보고서 잔여리스크 #1, h2 보고서에서도 명시.
- 재평가: 토큰 게이트는 유지되어 "접근"은 막히나 "메타데이터 열거"는 열림. invitedUserIds 노출은 프라이버시 측면 재고 필요(누가 초대됐는지 제3자가 알 수 있음).
- 처리: 비공개 이벤트 본문을 별도 컬렉션/서버 조회로 분리(설계 변경 L) 또는 invitedUserIds만 분리(M).

**[P3] G16. 레거시 shareToken 미이관 문서 열거 가능** · 규모 S
- 근거: lazy 마이그레이션이라 재저장 전 레거시 private 이벤트 문서에 shareToken 잔존→열거 가능(보고서 잔여리스크 #2). 백필 스크립트 없음.
- 처리: 운영진이 기존 private 이벤트 1회 재저장, 또는 일회성 백필.

**[P3] G17. 비공개 poll 종합 공유 미지원** · 규모 M
- 근거: `/gatherings/poll/[id]`는 public만 허용(`poll/[id]/page.tsx:39`), private는 404. 종합 공유 버튼도 `!isPrivate`로만 노출(`GatheringEventCard.tsx:267`). 비공개 모임은 투표 현황을 외부 공유 불가(poll-popup-share 보고서 제안사항).

### 2-5. 데이터·운영·통계

**[P1] G18. 운영 통계·대시보드 부재** · 규모 M
- 근거: 콘솔은 이벤트별 정산 요약만(`console:245-257`). 참석률 추이, 반복 참석자, 유형별 참여, 회비 회수율, 노쇼율 등 집계 화면 없음. 운영 의사결정 데이터 없음.
- 기대효과: 기획 환류(어떤 모임이 잘 되는지), 예산·일정 근거.

**[P2] G19. 회비 운영 전 과정 수동** · 규모 M
- 근거: staff가 이벤트마다 "회비 항목 생성" 클릭(`console:154-185`) → 개인별 납부 버튼 수동 클릭(`console:187-200`). "전원 납부" 일괄 없음, 참석 확정 시 자동 due 생성 없음, 결제 연동 없음(오프라인 수동은 설계 결정 — `types:3`).
- 기대효과: 총무 반복 클릭 대폭 감소.
- 처리: attending 확정 시 due 자동 생성 옵션 + 일괄 상태변경.

**[P3] G20. 게스트 정원 검사 비트랜잭션 경쟁** · 규모 S
- 근거: 회원 RSVP는 트랜잭션(`rsvp/route.ts:35`)이나 게스트는 plain get 후 add(`rsvp-guest/route.ts:42-91`) — 동시 다발 게스트 신청 시 정원 초과 가능. rate-limit(5/h)이 완화하나 완전차단 아님.

**[P3] G21. poll 다중 카드 7초 폴러 중첩** · 규모 S
- 근거: 목록에 미확정 poll이 여럿이면 각 `NetworkingPoll`이 7초 refetch(`NetworkingPoll.tsx:112`)를 독립 실행 → 폴러 N개. 규모 작을 땐 무해하나 확장 시 부하.

---

## 3. Quick Win 3선 (효과 대비 저비용)

1. **G6 동반인 입력 UI** (S) — 정산·정원의 구조적 과소집계 버그를 폼 필드 하나로 해소. 이미 계산 로직·저장 필드·콘솔 표시가 다 있고 **입력구만 없음**. 최고 ROI.
2. **G1 취소 알림** (M, 최소구현 S) — status→cancelled 저장 시 attending 대상 인앱 알림 1건. 신뢰도 직결 사고 방지. 알림 인프라(`notify.ts`·`networking_reminder` 타입) 재사용.
3. **G10/G11 투표 확정 정합 안내** (S) — 마감 후 "확정 대기 중" 문구 + auto인데 pollDeadline 없으면 폼 경고. 코드 수정 소량, "왜 확정이 안 되지" 혼란 제거.

---

## 4. 우선순위 로드맵

**라운드 1 — 신뢰·정확성(즉시)**
- G6 동반인 입력 (S)
- G1 취소·연기 알림 (M)
- G10/G11/G12 투표 확정 엣지 정합·안내 (S~M)

**라운드 2 — 모집·참여 완결성**
- G2 대기자(waitlist) + 취소→승격 (M)
- G3 체크인/노쇼 + streak 실참 기준 (M)
- G5 회비 미납 알림 + 마이페이지 집계 (M)
- G14 새 투표 개시 알림 (S)

**라운드 3 — 운영 효율·인사이트**
- G18 운영 통계 대시보드 (M)
- G19 회비 자동 due·일괄 처리 (M)
- G4 반복 모임 복제 (M)
- G7/G8 게스트·회원 RSVP 정정·철회 (M)

**라운드 4 — 프라이버시·확장**
- G15 비공개 메타데이터/invitedUserIds 분리 (M~L)
- G16 레거시 shareToken 백필 (S)
- G17 비공개 poll 종합 공유 (M)
- G9 게스트→회원 전환 퍼널 — **진행 중 트랙과 합류**

**외부 의존/결정 대기**
- 결제 연동(현재 오프라인 수동은 명시적 설계 결정 — 전환은 운영진 승인 필요)
- G15 비공개 메타 분리는 rules·공개목록 증명 결합 재설계라 아키텍처 결정 선행

---

## 부록 — 라이프사이클 커버리지 요약

| 단계 | 커버 | 결측 |
|---|---|---|
| 기획(투표) | 캘린더 투표·집계·확정·공유 ✅ | 개시 알림(G14), 마감無 poll(G11), 확정 림보(G10) |
| 확정 | 수동·자동 확정 ✅ | 재투표(G13), 자유텍스트 시각(G12) |
| 모집(RSVP·정원) | 회원·게스트·정원·중복 ✅ | 동반인 입력(G6), 대기자(G2), 게스트 정정(G7) |
| 리마인더 | D-1/당일·마감·후기·투표 ✅ | 취소 알림(G1), 회비 독촉(G5) |
| 당일 | streak 적립 ✅ | 체크인·노쇼(G3) |
| 사후 | 후기·사진·정산·CSV ✅ | 통계(G18), 회비 자동화(G19) |
