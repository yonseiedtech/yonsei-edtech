# H5(v11) 커뮤니티·피어 동선 통합 감사 — 흩어진 관계 표면 잇기 (2026-07-21)

> 성격: **읽기 전용 워크스루 감사** (코드 무수정 · 발견만) · 대상: yonsei-edtech LIVE
> 근거: 2026-07-21 소스 직접 정독 (파일·라인 명시). v11 계획서 H5 항목 수행 산출물.
> 상보: v11-H2(kudos 관계 확장 — **이미 구현 확인됨**: `KudosContext` 4종 + `KudosSendBlock`/`KudosInlineButton` 삽입 완료). 본 감사는 그 위의 "다음 관계 행동" 링크 단절을 전수한다.

---

## 1. 관계·상호작용 표면 전수 지도 (11종 — 진입점 · outbound 링크 실측)

| # | 표면 | 라우트/컴포넌트 | 진입점 (실측) | 다른 관계 표면으로의 outbound 링크 |
|---|---|---|---|---|
| 1 | **kudos 응원** (cohort·mentoring·study·hackathon 4맥락) | `src/features/kudos/*` (9파일) | 발신: 온보딩 `CohortSection`, 대시보드 `KudosWidget`, 스터디 회차 완료 `ActivityWeekDetailPage:580`, 해커톤 팀 `HackathonTeamView:144`, 멘토링 채택 답변 `AnswerThread:293` / 수신: `KudosWidget`, 마이페이지 `ReceivedKudosHistory`, 인앱 알림 | **0건** — 발신자/수신자 이름 전부 plain text, 프로필·답례 경로 없음 |
| 2 | **멘토링 Q&A** | `/mentoring` (`app/mentoring/page.tsx`) | 회원 명부 `MemberCard:118` 배지, 프로필 `ProfileDetailView:191`, 졸업생 홈 `AlumniHomeWidgets:373`, weekly-digest 이메일. **Header nav 0 · BottomNav 0 · 커맨드팔레트 0** | 답변 채택 시 kudos(`KudosInlineButton`)만. 답변자(멘토)·질문자 이름 → 프로필 링크 **없음** |
| 3 | **피어러닝·소통 보드** (comm-board) | `CommBoardSection` — 세미나 상세 `seminars/[id]:605`, 스터디 회차 `ActivityWeekDetailPage:756`, 전역 `/boards/[boardId]` | 세미나·스터디 컨텍스트 내부 | 작성자 이름 plain text (`QuestionItem:27`, `AnswerThread:189`) — 프로필 링크 **없음** |
| 4 | **코호트 동기 명단** | 온보딩 `CohortSection` (`features/onboarding`) | `/steppingstone/onboarding` | 동기·버디 → `/profile/[id]` ✅ · kudos ✅ · **/network(코호트 엣지 시각화) 링크 없음** |
| 5 | **공동연구자 추천 ①** | `CollaboratorRecommendations` (`features/network`) | **`/network` 상단에만** 마운트 | → `/profile/[id]` ✅만. **→ `/collab`(공동 연구 개설) 링크 없음** |
| 6 | **공동연구자 추천 ②** | `SimilarResearchersSection` (`app/collab/_components`) | `/collab` 랜딩 `:47` | → `/profile/[id]` ✅만. **→ `/network` 링크 없음** (①과 상호 무인지 — 엔진도 별개) |
| 7 | **회원 관계망 Map** | `/network` | Header **더보기** `:196`, 마이페이지 `ConnectivismPanel:80`, 팔레트 `r:network` | 노드 클릭 `MemberMiniDialog:119` → `/profile` ✅만. 멘토 오픈 노드에 멘토링 CTA **없음**, kudos **없음** |
| 8 | **연락망** | `/directory` | **커맨드팔레트 `r:directory`만** (Header 0 · BottomNav 0) | 이름 셀 plain text (`directory/page.tsx:422`) — `/profile` 링크 **없음**. tel/mailto만 |
| 9 | **회원 명부** | `/members` | Header "대학원 생활>구성원·네트워크" `:118~119`, BottomNav 더보기 `:80`, 팔레트 | `MemberCard` → `/profile` ✅ + 멘토링 프리필 ✅. **/network·/directory 크로스링크 0** |
| 10 | **모임·행사** | `/gatherings` | Header 구성원·네트워크 `:117`, `MyActivityHub:364`, 팔레트 | `AttendeeRoster:114` → `/profile` ✅. 참석자→관계망/응원 없음 |
| 11 | **프로필 (관계 허브)** | `/profile/[id]` (`ProfileDetailView`) | 위 표면 대부분의 종착점 | **멘토 오픈 졸업생일 때만** 쪽지+멘토링 CTA(`:158~207`). **그 외 회원 프로필 = 관계 행동 0건** (응원·공동연구·관계망·같은 활동 어느 것도 없음) |
| 보조 | 해커톤 팀 | `HackathonTeamView` | `/hackathon` 내부 | kudos ✅. 확정 팀 `s.members` = **이름 문자열(userId 없음)** `:178~185` → 프로필 연결 구조적으로 불가 |
| 보조 | 리더보드 | `/leaderboard` | BottomNav 더보기·팔레트 | 프로필 링크 0 — 단 익명·비교 회피 규율일 수 있어 **현상 유지 판정** (결함 아님) |

**요약**: 대부분의 표면이 `/profile`로 **들어가는** 링크는 갖췄으나, (a) 프로필에서 **나가는** 관계 행동이 멘토 케이스 하나뿐이고, (b) 텍스트로만 사람이 등장하는 곳(멘토링 답변·kudos 이력·연락망 테이블)이 프로필로 이어지지 않으며, (c) "사람 찾기" 3표면(members/network/directory)과 "추천" 2표면(network/collab)이 서로를 모른다.

---

## 2. 동선 단절 지점 전수 (16건)

형식: **[표면 A→표면 B 단절 → 추가할 크로스링크 → 효과 → 난이도]**

### 2-1. 소규모 핫픽스 후보 — S급 8건 (링크 1~2줄 수준 · 로직 무변경)

| # | 단절 (A→B) | 추가할 크로스링크 | 효과 | 난이도 |
|---|---|---|---|---|
| **F1** | 멘토링 답변한 멘토 → 멘토 프로필: `AnswerThread:189`·`QuestionItem:27` 작성자 이름 plain text | 익명 아님 && `authorId` 존재 시 이름을 `<Link href={/profile/${authorId}}>` 로 (게스트·익명 제외 조건 그대로) | 답변 보고 "이 선배 누구지" → 프로필 → 쪽지·추가 질문·팔로업의 핵심 동선 개통 | **S** |
| **F2** | 어디서든 → /mentoring: 커맨드팔레트(`command-routes.ts`)에 멘토링 라우트 **0건** (members·directory·network는 "커뮤니티" 그룹에 있음) | `{ key: "r:mentoring", group: "커뮤니티", label: "졸업생 멘토링 Q&A", href: "/mentoring", … }` 1항목 | 8월 신입·재학생의 멘토링 발견성 즉시 확보 — nav 재구성(외부의존) 없이 가능한 최소 개입 | **S** |
| **F3** | 연락망 → 프로필: `/directory` 테이블 이름 셀(`page.tsx:422`) 비링크 | 이름 셀을 `/profile/[id]` Link 로 (console variant 포함 양쪽 혜택) | 연락망이 "전화번호 표"에서 관계 진입점으로 승격 | **S** |
| **F4** | 받은 응원 → 보낸 사람: `ReceivedKudosHistory` 발신자 비링크 + **context 미소비** — mentoring/study/hackathon 응원도 "M월 D일 주 학습 활동"으로 표기(`:46~48`, `Kudos.context` 필드 존재하나 무시) | (a) `fromUserId` → `/profile` Link (b) context별 라벨 분기("멘토링 감사"/"스터디 동료"/"해커톤 팀원") | v11-H2 확장의 수신 측 완결 — 표기 부정확 해소 + 답례 동선(프로필 경유) 개통 | **S** |
| **F5** | 대시보드 응원 위젯 → 이력/발신자: `KudosWidget:44~48` 발신자 이름 나열만, "받은 응원 전체 보기" 링크 없음 | 하단에 `/mypage/activities`(ReceivedKudosHistory 위치) 1줄 링크 + 발신자 프리뷰는 현행 유지 가능 | 응원 수신의 소비 심화·마이페이지 이력 발견 | **S** |
| **F6** | 공동연구자 추천 ↔ 공동 연구 개설: `/network`의 `CollaboratorRecommendations` → `/collab` 링크 0, `/collab`의 `SimilarResearchersSection` → `/network` 링크 0 | 각 섹션 푸터에 상호 1줄: "마음 맞는 회원을 찾았다면 → 공동 연구 시작(/collab/new)" / "관계망 Map에서 연결망 보기(/network)" | 추천→실행(공동연구 개설) 퍼널 연결 — 추천이 '구경'에서 끝나지 않게 | **S** |
| **F7** | 코호트 동기 명단 → 관계망: `CohortSection:171~196` 동기 칩이 프로필로만 — /network(코호트 엣지가 기본 필터 `enabledKinds`에 포함됨)로의 링크 없음 | 동기 명단 하단 "관계망 Map에서 우리 기수 연결 보기 → /network" 1줄 | 온보딩 시점에 관계망 표면 첫 노출 — Connectivism 서사와도 부합 | **S** |
| **F8** | 사람 찾기 3표면 상호 고립: `/members` ↔ `/network` ↔ `/directory` 크로스링크 **0** (Header에서도 각각 다른 그룹: members=대학원생활, network=더보기, directory=nav 부재) | 각 페이지 헤더 근처에 나머지 2표면 칩 링크(예: members 상단 "관계망 Map · 연락망") | 같은 과업("사람 찾기")의 3섬 연결 — 재구조화 없이 링크만으로 회수 | **S** |

### 2-2. S~M — 소규모지만 데이터·시그니처 확인 필요 (4건)

| # | 단절 (A→B) | 제안 | 효과 | 난이도 |
|---|---|---|---|---|
| F9 | kudos(study) 알림 → 해당 스터디: `notifyKudos` study 링크가 광역 `/activities` 고정(`notify.ts:340`) | `notifyKudos`에 link override(또는 contextId) 선택 파라미터 — 발신 지점(`ActivityWeekDetailPage`)은 activityId 보유 | 응원 받은 사람이 맥락 화면으로 직행 → 상호 응원 루프 | **S~M** |
| F10 | 관계망 노드 → 멘토링: `MemberMiniDialog` — 노드가 멘토 오픈 졸업생이어도 CTA 없음(프로필 버튼만) | `NetworkNode`에 `mentorOpen`/`mentorTopics` 포함 여부 확인(`build-network.ts`) 후 MemberCard와 동일한 멘토링 프리필 배지 | 관계망 탐색 중 멘토 발견 → 즉시 질문 | **S~M** |
| F11 | 스터디 상세 참여자 → 프로필: `ActivityDetail` 전체에 `/profile` 링크 **0건** (참여자 탭 존재, 명단 비링크) | 참여자 명단 렌더에 조건부 프로필 Link (운영 편집 UI와 충돌 없는 위치 확인 필요) | 함께 스터디하는 동료의 관심사·연구 확인 → kudos·공동연구로 연쇄 | **S~M** |
| F12 | BottomNav 더보기 시트: `MORE_ITEMS`에 members만 — gatherings·mentoring·network 부재 | 모바일 더보기에 모임·멘토링 추가(그리드 공간·우선순위 판단 필요) | 모바일 관계 표면 도달성 | **S~M** |

### 2-3. 구조 제안 — M급 (링크 추가로 해결 불가 · 별도 항목화 권고, 4건)

| # | 단절 | 구조 제안 | 난이도 |
|---|---|---|---|
| G1 | **프로필(비멘토 회원) = 관계 행동 0**: `ProfileDetailView`는 멘토 오픈 졸업생에만 CTA(`:158`). 일반 회원 프로필에서 응원·공동연구·관계망 어느 행동도 불가 — "다음 관계 행동" 관점의 최대 공백 | 프로필에 경량 "관계 행동 행" 신설: (a) 나와의 공통점 요약(collaborator-match 근거 재사용) (b) 관계망에서 보기 (c) 맥락 있으면 응원 보내기. v11-H2 인프라(`KudosInlineButton`) 재사용 가능하나 "어떤 context로 보낼 수 있는가" 판정 로직 필요 | **M** |
| G2 | 해커톤 **확정 팀 멤버가 이름 문자열**(`hackathon_submissions.members: string[]`) — 프로필·kudos 연결 구조적 불가(코드 주석 `HackathonTeamView:92~93`도 인지) | 제출 스키마에 memberIds 병행 저장(하위호환: 문자열 fallback). D-33 해커톤 전 적용 시 이후 팀 데이터부터 연결 가능 | **M** |
| G3 | **추천 엔진 2종 병립**: `collaborator-match.ts`(network) vs `SimilarResearchersSection` 자체 로직(collab) — 같은 목적, 다른 근거·다른 표면, 상호 무인지 | 중기적으로 collaborator-match로 일원화 후 표면별 프레젠테이션만 분리 (F6 크로스링크는 그 전 임시 다리) | **M** |
| G4 | **Header IA 불일치**: Header "커뮤니티" = 게시판+콘텐츠만(`:163~186`) vs 커맨드팔레트 "커뮤니티" 그룹 = members·directory·network 포함 — 두 IA가 서로 다른 커뮤니티 정의. 멘토링·모임은 어디에도/다른 그룹에 산재 | 커뮤니티 nav에 "사람" 섹션(멘토링·회원·관계망·모임) 편입 — **§4 외부 의존(운영진 정보구조 승인) 대상, 본 감사는 기록만** | M(승인 필요) |

---

## 3. 잘 연결되어 있는 것 (재작업 불요 — 오탐 방지 기록)

- `MemberCard` → 프로필 + 멘토링 프리필 배지 (모범 패턴 — F1·F10의 참조 구현)
- `ProfileDetailView` 멘토 오픈 케이스의 이중 CTA(쪽지+공개 질문) — H5가 요구하는 "다음 관계 행동"의 유일한 기존 정답
- `CohortSection` 동기·버디 → 프로필, `AttendeeRoster`(모임) → 프로필, `OrgChart`·`ElectiveReviewsByName`·`alumni/thesis` 저자 → 프로필
- v11-H2 kudos 발신 4맥락 삽입 완료 (온보딩·대시보드·스터디 회차·해커톤 팀·멘토링 채택) — **발신 측은 완결, 수신 측 소비(F4·F5)만 미완**
- 리더보드 무프로필링크 — 익명·비교회피 규율로 판단, 현상 유지

## 4. 권고 실행 순서 (H5 핫픽스 라운드 편성안)

1. **1차 (순수 링크·즉시)**: F1·F3·F4·F5·F6·F7·F8 + F2(팔레트 1항목) — 파일 영역 비중복, 일괄 1배포 가능
2. **2차 (확인 후)**: F9(notify 시그니처)·F10(NetworkNode 필드)·F11(참여자 렌더)·F12(모바일 공간)
3. **백로그 승격 제안**: G1(프로필 관계 행동 행 — v12 후보로 가장 ROI 높음)·G2(해커톤 D-33 전 스키마)·G3(추천 일원화)
4. **외부 의존 대기**: G4(커뮤니티 nav 재구성 — 운영진 승인, v11 계획서 §4 기재와 일치)

---
*감사 방법: Header/BottomNav/command-routes 전수 + 표면 11종 소스 정독 + href 크로스링크 grep 전수. 코드 수정 0.*
