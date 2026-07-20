# 신규 기능 자동화 완성도 감사 — 8월 실전 3종 수동 단계 전수 목록 (H6-v11, 2026-07-21)

> 성격: **읽기 전용 감사** (코드 무수정) · 근거: 코드 실측만 (`src/features/hackathon`, `src/app/api/cron/*`, `src/features/admin`, `src/lib/semester*.ts` 등)
> 계획 원문: `docs/plans/service-enhancement-plan-v11-2026-07-21.md` §H6
> 표 형식: **[단계 → 현재 방식(자동/수동) → 방치 시 리스크 → 자동화 제안(난이도 S/M/L)]**
> 분류 라벨: `자동` = 무인 동작 · `수동` = 사람 클릭/입력 필요 · `수동(폴백有)` = 수동 우선이나 자동 날짜 폴백 존재(의도적 설계) · `수동(필수)` = 본질적으로 사람 판단이어야 함 · `반자동` = 규칙은 자동이나 실행 트리거가 사람

---

## 요약 (정량 지도)

| 영역 | 전체 단계 | 자동 | 수동 | 그중 자동 폴백 보유 | 그중 필수-사람 | 고위험 |
|---|---|---|---|---|---|---|
| ① 해커톤 (8/22) | 21 | 6 | **15** | 4 | 2 | 1 |
| ② 신입 유입 (8월) | 10 | 6 | **4** (반자동 1 포함) | 0 | 1 | 2 |
| ③ 학기 전환 (9/1) | 10 | 5 | **5** (조건부 1 포함) | 0 | 1 | 1 |
| **합계** | **41** | **17** | **24** | **4** | **4** | **4** |

**고위험 4건** (방치 시 8~9월 실전 사고 가능):
- **R1** 가입 자동 승인이 **클라이언트 사이드** — 운영진이 `/console/members`를 열어야 실행됨 (②-2)
- **R2** 승인 지연 시 신입 D+N 시퀀스 **앞 단계 영구 미발송** — dayOffset 정확 일치 + `approved==true` 필터 (②-8)
- **R3** 9/1 조직도 **학기 키 전환 공백** — `org_chart:2026-2` 문서 부재 시 레거시/기본 시드로 표시 회귀 (③-5)
- **R4** 심사 정체 무감지 + 8/29 **수상 발표 단계 자동 전환 vs 수상작 공개 수동**의 불일치 — 심사 미완인 채 "수상 발표" 단계 노출 가능 (①-16·19)

---

## ① 해커톤 (8/22) — 접수→팀→제출→심사→수상 공개

근거 파일(절대경로):
- `C:\work\yonsei-edtech\src\features\hackathon\config.ts` (행사 메타·단계 타임라인·마감 상수·수동 오버라이드 `hackathon_ops`)
- `C:\work\yonsei-edtech\src\features\hackathon\HackathonDdayConsole.tsx` (단계 전환 체크리스트 — 수동 우선·confirm)
- `C:\work\yonsei-edtech\src\features\hackathon\HackathonSubmissions.tsx` (제출 폼 — teamName·members 수기)
- `C:\work\yonsei-edtech\src\features\hackathon\HackathonTeamView.tsx`·`ensure-hackathon-board.ts`
- `C:\work\yonsei-edtech\src\app\console\hackathon\page.tsx` (심사 루브릭 4×5·수상 지정·published 토글)
- `C:\work\yonsei-edtech\src\app\api\cron\hackathon-submission-reminder\route.ts` (D-3/1/0 cron, LIVE)

| # | 단계 | 현재 방식 | 방치 시 리스크 | 자동화 제안 (난이도) |
|---|---|---|---|---|
| 1 | 보드·허브 프로비저닝 | **자동** (`ensure-hackathon-board` 첫 접근 시 생성) | — | 불요 |
| 2 | 행사 메타 확정 반영 (장소·타임라인·제출마감시각·수상발표일) | **수동 + 개발자** — `config.ts` 상수라 **코드 수정+배포** 필요 | 장소 "추후 공지" 방치, 당일 임박 변경 시 배포 의존 (단 제출마감 자체는 콘솔 오버라이드 가능해 완화) | 메타를 `site_settings` 오버라이드로 이관, 콘솔 편집 (S~M) |
| 3 | 참가 접수 (아이디어 보드 등록) | **자동** (회원 셀프 — comm_questions) | — | 불요 |
| 4 | 접수·팀·제출·심사 현황 파악 | **자동** (DdayConsole 현황 위젯) | — | 불요 |
| 5 | 참가 독려·홍보 발송 | **수동** (알림·콘텐츠 발송 장치 없음, content-draft는 초안만) | D-33 시점 접수 저조 무감지 | 접수 D-14/D-7 미참가 회원 1회 넛지 cron (S) — 발송 정책 합의 필요(외부의존) |
| 6 | 팀원 모집·합류 | **자동** (셀프 — `hackathon_team_joins` + 당일 현장 팀빌딩) | — | 불요 |
| 7 | 팀 확정 (팀명·팀원 명단) | **수동(회원)** — 별도 "팀 확정" 개념 없음. 제출 폼에 팀 대표가 **members 자유 텍스트** 입력, 회원 계정과 미연결 | 팀원 표기 누락·오타, kudos/포트폴리오 연계 불가, "팀 확정 수" 통계가 제출 발생 전 0으로 표시 | team_joins 합류자 → 제출 폼 members **자동 프리필** (S) |
| 8 | 접수 마감 → 제출 오픈 전환 | **수동(폴백有)** — 콘솔 클릭, 8/22 날짜 자동 폴백 | 낮음 (양쪽 어긋나도 폴백 존재) | 의도적 수동 — 유지 |
| 9 | 제출 마감 리마인더 (D-3/1/0) | **자동** (cron, dedup·마감 후 자동 비활성) | — | 불요 |
| 10 | 산출물 제출 | **자동** (회원 셀프, 마감 시각 지나면 폼 자동 잠금) | — | 불요 |
| 11 | 제출 마감 전환 | **수동(폴백有)** — 콘솔 confirm, 21:30 자동 폴백 | 낮음 | 의도적 수동 — 유지 |
| 12 | 당일 체크인·출석 확인 | **수동(전면)** — 기능 부재 (v11 §4 외부의존: 체크인 정책 미확정) | 당일 참석자 파악을 종이/구두로, 참석 기록 미적재 | 정책 확정 후 QR 체크인 (M) — **외부의존** |
| 13 | 심사위원 배정 | **수동(전면)** — 배정 개념 없음, staff+ 전원이 심사 입력 가능 (v11 §4 외부의존: 배정 규칙 미확정) | 누가 몇 건 심사할지 불명, 중복/누락 심사 | 배정 규칙 확정 후 submission별 담당 지정 (M) — **외부의존** |
| 14 | 심사 단계 전환 | **수동(폴백有)** — 콘솔 confirm, 8/23 자동 폴백 | 낮음 | 의도적 수동 — 유지 |
| 15 | 심사 점수 입력 (루브릭 4기준×5점) | **수동(필수)** — 사람 판단 | — (본질적 수동) | 자동화 부적합 |
| 16 | 심사 진행 독촉 | **수동** — 콘솔에 진행률 % 가시화만, 심사위원 넛지 없음 | **[고위험 R4 일부]** 심사 기간(8/23~28) 정체 무감지 → 8/29 자동 awards 전환 시점에 심사 미완 | 심사 미완 시 D-2/D-1 심사위원(staff+) 넛지 cron 또는 기존 콘솔 처리대기 큐(H3-v11)에 편입 (S) |
| 17 | 수상 등급 지정 | **수동(필수)** — 사람 판단 (평균 점수는 자동 집계·표시) | — | 점수순 추천 배지 정도만 (S, 선택) |
| 18 | 수상작 공개 (published 토글) | **수동** — 제출 **건별 개별 토글** (award 미지정 시 공개 불가 가드는 있음) | 일부 수상작만 공개되는 누락 | "수상 지정분 일괄 공개" 버튼 (S) |
| 19 | 수상 발표 단계 전환 (8/29) | **수동(폴백有)** — 8/29 **날짜 자동 폴백** | **[고위험 R4 일부]** 심사·공개가 늦어도 공개 페이지는 자동으로 "수상 발표" 단계 표시 → 수상작 0건의 빈 발표 화면 | awards 자동 전환 조건에 "published ≥ 1" 가드 추가 또는 16번 넛지로 선행 해소 (S) |
| 20 | 수상팀 포트폴리오 등재 | **수동(회원)** — `HACKATHON_PORTFOLIO_HINT` 안내 문구만, 본인이 직접 추가 | 수상 이력 미등재로 유실 | published 시 수상팀 멤버에게 포트폴리오 자동 적재 제안 알림 (M — G3 포트폴리오 자동적재 인프라 재사용, 단 7번 members 계정 미연결이 선결) |
| 21 | 결과물 아카이브 큐레이션 | **수동(운영진)** — FAQ "원하는 팀에 한해 아카이브로 정리" | 결과물 방치·산실 | 제출→아카이브 후보 큐 자동 생성 (M) |

**소계**: 수동 15 (그중 자동 폴백 보유 4 = #8·11·14·19, 필수-사람 2 = #15·17, 외부의존 2 = #12·13). 순수 코드만으로 회수 가능한 저위험 자동화 타깃: **#7 프리필(S)·#16 심사 넛지(S)·#18 일괄 공개(S)·#19 가드(S)**.

---

## ② 신입 유입 (8월) — 가입→승인→첫 2주 시퀀스

근거 파일:
- `C:\work\yonsei-edtech\src\lib\auth\approval-rules.ts` (자동 승인 규칙: yonsei.ac.kr + 학번 + 중복 없음)
- `C:\work\yonsei-edtech\src\features\admin\AdminMemberTab.tsx` (자동 승인 useEffect — **클라이언트 실행**, localStorage 토글 기본 ON)
- `C:\work\yonsei-edtech\src\app\api\cron\pending-signup-nudge\route.ts` (미처리 승인 운영진 넛지, 3일 초과 별도 집계, LIVE)
- `C:\work\yonsei-edtech\src\app\api\cron\newcomer-activation-sequence\route.ts` (D+1/3/7/10/14, 스킵조건·dedup, LIVE)
- `C:\work\yonsei-edtech\src\lib\newcomer-sequence.ts` (경계 보정 A3 — 가입 14일 폴백·다음 학기 코호트 포함)
- `C:\work\yonsei-edtech\src\app\api\cron\semester-start-reminder\route.ts` (D-7/D-1 개강 + 신입 온보딩 분기)

| # | 단계 | 현재 방식 | 방치 시 리스크 | 자동화 제안 (난이도) |
|---|---|---|---|---|
| 1 | 가입 신청 (약관→계정→학적→선택 4단계) | **자동** (셀프, `approved:false`로 생성) | — | 불요 |
| 2 | 자격자 승인 (규칙 통과자) | **반자동** — 규칙 평가·일괄 승인 로직은 자동이나, 실행이 `AdminMemberTab`의 **클라이언트 useEffect**: 운영진(admin/sysadmin)이 `/console/members`를 **브라우저로 열어야** 발동. 토글도 localStorage(운영진 개인 브라우저별) | **[고위험 R1]** 8월 유입 피크에 아무도 콘솔을 안 열면 자격자도 무기한 대기. "자동 승인 ON"이라는 인지와 실제 동작의 괴리 | 승인 평가를 서버로 이관 — 가입 API 직후 평가 or pending-signup-nudge cron에 자동 승인 실행 병합, 토글은 site_settings로 (S~M). **운영진 승인(어느 단계 자동화할지) 필요** — v11 §4 |
| 3 | 비자격자 검토·승인/거절 (타 도메인·학번 누락·중복) | **수동(필수)** — 신원 판단 | 승인 지연 → 8번 시퀀스 유실로 전이 | 자동화 부적합. 완화: risk 사유가 콘솔에 표기됨(이미 구현) |
| 4 | 승인 지연 감지·운영진 독촉 | **자동** (pending-signup-nudge cron 일 1회, 3일 초과 건수 명시, 인앱) | — (알림뿐 승인은 안 함 — 2번과 결합 시 해소) | 2번 제안에 흡수 |
| 5 | 승인 완료 알림 (신입에게) | **자동** (`notifyMemberApproved` — 승인 액션에 부수) | — | 불요 |
| 6 | 학번 매핑·잠재회원·졸업생 매핑 큐 | **수동** — `console/applicant-link-by-studentid`·`potential-members`·`alumni-mapping` 3종 콘솔 큐 (cron·알림 없음) | 침묵 백로그 (v11-H3 "처리 대기 통합 큐" 대상과 동일) | H3-v11 통합 큐 편입 (M — 이미 백로그) |
| 7 | 역할·학적 정정 (재학생/졸업생 구분 등) | **수동** — AdminMemberTab 역할 부여 | 낮음 (기본 member로 동작) | 유지 |
| 8 | 첫 2주 활성화 시퀀스 (D+1/3/7/10/14 넛지) | **자동** (cron 매일, 스킵조건 4종·push_logs dedup·코호트 경계 보정 완료) | **[고위험 R2]** 단 **createdAt(가입일) 기준 + `approved==true` 필터 + dayOffset 정확 일치** → 승인이 D+2에 나면 D+1 넛지 영구 미발송, D+5에 나면 D+1·D+3 모두 유실. **승인 지연 폴백 없음** | dayOffset을 "미발송이면 다음 실행에서 최근 단계로 보정"(semester-start-reminder의 버킷 보정 패턴 재사용) 또는 기준일을 max(가입일, 승인일)로 (S) |
| 9 | 개강 신입 온보딩 리마인더 (D-7/D-1) | **자동** (semester-start-reminder 신입 분기, 관례일 폴백·실패 보정 버킷) | — | 불요 |
| 10 | 신입 진행 위젯·온보딩 체크리스트 노출 | **자동** (`isNewcomerWindow` 파생 — 코호트/14일 창) | — | 불요 |

**소계**: 수동 4 (반자동 1 = #2, 필수-사람 1 = #3). 고위험 R1(#2)·R2(#8).

---

## ③ 학기 전환 (9/1) — 학기 키 의존 기능 실측

근거 파일:
- `C:\work\yonsei-edtech\src\lib\semester.ts` (`currentSemesterKey` — KST, 9월 1일부터 `2026-2` 자동)
- `C:\work\yonsei-edtech\src\app\api\cron\semester-advance\route.ts` (매일 실행·학기 경계에서만 변동·멱등 앵커 `accumulatedSemestersAsOf`·휴학/졸업 동결·admin POST 백필, vercel.json 등록 확인)
- `C:\work\yonsei-edtech\src\features\admin\settings\useOrgChart.ts` (`org_chart:{semesterKey}` 학기별 문서 · 현재 학기만 레거시 `org_chart` 폴백 · **직전 학기 폴백 없음**)
- `C:\work\yonsei-edtech\src\features\handover\TransitionView.tsx` (운영진 교체 — 역할 일괄 전환, 전면 수동)
- `C:\work\yonsei-edtech\src\features\site-settings\useAcademicCalendar.ts` (`pickActiveEntry` — 미등록 시 최근/미래 학기 폴백) · `src\app\console\academic-calendar\page.tsx`
- `C:\work\yonsei-edtech\src\lib\semesterWeeks.ts` (`inferSemesterStartDate` — 9월 첫 수업요일 자동 추론 폴백)

| # | 단계 | 현재 방식 | 방치 시 리스크 | 자동화 제안 (난이도) |
|---|---|---|---|---|
| 1 | 학기 키 전환 (`2026-1`→`2026-2`) | **자동** — `currentSemesterKey()` KST 순수 함수, 9/1 00:00 KST부터 전 화면·cron 일관 | — | 불요 |
| 2 | 재학생 누적학기 +1 (semester-advance cron) | **자동** — 매일 실행, `accumulatedSemestersAsOf` 멱등(학기당 1회), 휴학·졸업·alumni 동결, 배치 450 청크. vercel.json 00:00 UTC 등록 실측 | 낮음. 단 `accumulatedSemesters` 미설정 회원은 **영구 skip** — 초기값은 수동(프로필/백필) | 미설정 회원 잔존 수를 콘솔 인사이트에 집계 노출 (S, 선택) |
| 2b | (조건부) 누적학기 최초 백필 | **수동** — admin POST `/api/cron/semester-advance` 수동 실행 경로 존재 | 신규 합류 회원 학기차 미표시 | 유지 (1회성) |
| 3 | 코호트·신입 판정 전환 (kudos peers·신입 위젯·시퀀스) | **자동** — `cohortKeyOf` 파생(저장값 아님), 9/1부터 2026-2 입학자가 신입 코호트로 자동 인정 (다음 학기 포함 + 가입 14일 폴백으로 8월 선가입도 커버 — A3 수정 확인) | — | 불요 |
| 4 | 모임·행사 semesterKey | **자동** — `semesterKeyOf(startAt)` 일시로부터 유도(백필 불요) | — | 불요 |
| 5 | 새 학기 조직도 생성 | **수동** — 조직도는 **학기별 문서** `org_chart:2026-2`. 9/1에 이 문서가 없으면 `loadOrgForSemester`가 레거시 단일 키 `org_chart`로 폴백, 그것도 없으면 **DEFAULT 시드(공석 조직도)**. **직전 학기(`org_chart:2026-1`) 폴백은 없다** | **[고위험 R3]** 2026-1 조직도가 학기 키로 저장돼 있다면 9/1 아침부터 공개 조직도(`/member` OrgChart)가 레거시(구버전)나 기본 시드로 **표시 회귀**. 운영진이 새 학기 조직도를 저장하기 전까지 지속 | (a) 새 학기 문서 부재 시 **직전 학기 문서 read 폴백** + "지난 학기 조직도 표시 중" 배지 (S), (b) 운영진 교체(TransitionView) 실행 시 새 학기 키로 자동 복제 (S~M). **9/1 전 레거시 `org_chart` 문서 실데이터 확인 권장** |
| 6 | 운영진 교체 (회장·부장단 역할 일괄 전환) | **수동(필수)** — 인사 결정. TransitionView가 기존 staff→alumni 강등 + 신규 부여를 일괄 처리(반복 클릭은 이미 제거됨) | 미실행 시 구 운영진 권한 잔존 | 자동화 부적합. 완화: 학기 전환 후 미실행 시 콘솔 배너 리마인드 (S, 선택) |
| 7 | 2026-2 학사일정 등록 (개강·중간·기말·종강) | **수동** — `console/academic-calendar` 입력. 미등록 시 `pickActiveEntry`가 최근 과거/미래 학기로 폴백해 위젯이 **지난 학기 날짜**를 계속 표시 | D-day 위젯·시험 리마인더가 낡은 학기 기준으로 안내 (중위험) | 새 학기 키 미등록 감지 시 콘솔 배너 + 관례일 프리필 생성 버튼 (S) |
| 8 | 개강 리마인더 (D-7=8/25·D-1=8/31) | **자동** — cron, academic_calendar 실제 개강일 우선 + 관례일 9/1 폴백 + cron 실패 시 버킷 보정 | — (7번 미등록이어도 관례일로 발송됨) | 불요 |
| 9 | 새 학기 과목 개설 (CourseOffering fall) | **수동** — 과목·시간표 등록은 사람 입력. 주차 계산은 `inferSemesterStartDate`(9월 첫 수업요일) 자동 폴백 | 수강 위젯·주차 기능 빈 상태 (중위험 — 콘텐츠성 수동) | 자동화 부적합(원천 데이터가 외부). 지난 학기 과목 "복제 개설" 버튼 (S, 선택) |
| 10 | 신입 시퀀스·kudos 등 파생 기능 경계 동작 | **자동** — 전부 `currentSemesterKey`/`cohortKeyOf` 파생이라 9/1 동시 전환. 별도 마이그레이션 없음 | — | 불요 |

**소계**: 수동 5 (조건부 1 = #2b, 필수-사람 1 = #6). 고위험 R3(#5).

---

## 결론 — 저위험 자동화 타깃 (운영진 승인 대상, v11 §4 연계)

**8월 전 착수 권장 (전부 S 난이도·기존 패턴 재사용·신규 컬렉션 없음):**
1. **R1 해소**: 가입 자동 승인 서버 이관 (pending-signup-nudge cron에 실행 병합) — 승인 정책은 운영진 확인 필요
2. **R2 해소**: 신입 시퀀스 dayOffset 버킷 보정 (semester-start-reminder 패턴 이식)
3. **R3 해소**: 조직도 직전 학기 read 폴백 + 운영진 교체 시 자동 복제
4. **R4 해소**: 심사 미완 넛지 cron + awards 자동 전환 가드 (또는 H3-v11 통합 큐 편입)
5. 해커톤 팀원 프리필(①-7)·수상작 일괄 공개(①-18) — 당일 운영 클릭 수 감축

**의도적 수동 유지 (자동 폴백 보유)**: 해커톤 단계 전환 4종(①-8·11·14·19 — v10-H3 설계 의도), 운영진 교체(③-6), 비자격 가입 검토(②-3), 심사·수상 판단(①-15·17).

**외부 의존 재확인 (코드만으로 불가 — v11 §4와 일치)**: 당일 체크인 정책(①-12), 심사위원 배정 규칙(①-13), 넛지 발송 정책(①-5), 자동 승인 범위 확정(②-2).
