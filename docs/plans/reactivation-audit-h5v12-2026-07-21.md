# H5(v12) 개강 시즌 회원 재활성화 동선 감사 — 방학→개강 전환기 여정 검증 (2026-07-21)

> 감사 유형: **무코드 워크스루 (읽기 전용 · 코드 무수정)** · 기준 시점: 2026-07-21 (2026 후기 개강 09-01 D-42)
> 대상 여정: **방학 중 이탈했던 재학생이 9/1 전후 돌아오는 실경로** — 재진입 접점 5종 + 갭 4항목(방학 모드 자동 해제·복귀 첫 화면·휴학→복학 전환·학기 필터 기본값)
> 근거: 소스 직접 실측 (파일:라인 명기). 계획 원문: `docs/plans/service-enhancement-plan-v12-2026-07-21.md` §H5

---

## 0. 요약 판정

| 심각도 | 건수 |
|---|---|
| **A (여정 단절·데이터 오염)** | **1** |
| **B (재활성 기회 손실·오도)** | **4** |
| C (마모·불일치·사소) | 6 |
| 정합 확인(문제 없음) | 6 |

---

## 1. 재진입 접점 실측 (발동 조건 · 시점 · 문구 · 착지)

### 1-1. 개강 리마인더 cron — `src/app/api/cron/semester-start-reminder/route.ts`
- **발동**: 매일 09:00 KST. `academic_calendar`의 실제 개강일 우선, 관례일(3/1·9/1) 폴백(`:31~44`). D-2~7을 d7 버킷으로 보정해 cron 1회 실패에도 유실 방지(`:46~57`), `refId`(학기키_d값) 사용자 단위 중복 가드(`:64~75`). **견고 ✓**
- **채널**: 인앱 알림 + 웹푸시 병행(`:102~117` — "이탈자는 인앱을 못 본다" 반영 ✓)
- **문구**: D-7 "수강 과목과 시간표를 미리 확인해 보세요" / D-1 "내일 개강 — 시간표를 확인하세요"
- **착지**: `/courses?tab=mine`
- **대상**: `approved==true` 전원(`:74`) — **역할 무필터** (→ 발견 B-1)
- **신입 분기(M1)**: `cohortKeyOf === 이번 학기` 신입에게 온보딩 체크리스트 별도 안내(`:119~181`, 착지 `/steppingstone/onboarding`) ✓ — 단 cohort 폴백 누락 개연(→ C-5)

### 1-2. 개강 재활성 배너 — `src/features/dashboard/SemesterKickoffBanner.tsx` (dashboard/page.tsx:635 마운트)
- **발동**: 개강 **관례일(3/1·9/1) 하드코딩** 기준 D-7~D+14(`:18~35`) — cron과 달리 `academic_calendar` 미참조(→ C-1)
- **대상**: alumni·graduated 제외(`:43`), 휴학(on_leave) 미제외(→ C-3)
- **문구**: "🎓 다시 시작해볼까요?" + "방학 동안 논문 도구가 크게 업그레이드됐어요"(`:78` — 2026-07-04 작성 하드코딩 클레임, whats-new 실데이터 무연동 → C-2)
- **착지**: `/courses`(수강 등록) · `/whats-new`(새 기능) · `/seminars` — 3-CTA 구성 자체는 적절 ✓. 단 D-7~8/31 구간 `/courses` 기본 학기 문제(→ B-2)
- **dismiss**: localStorage per-학기·per-user(`:45`) — 기기별 재노출은 재활성 목적상 수용 가능

### 1-3. 재참여 넛지(inactivity) — `InactivityCoachingCard.tsx` + `lib/inactivity-coaching.ts`
- **발동**: 대시보드 접속 시, 최근 14일 멈춘 연구 습관(읽기·집필·복습·진단) 1건만 제안. 과거 기록 있는 채널만("잔소리 금지") ✓. 신입(가입 60일↓) 미노출 ✓
- **개강 전환기 정합**: 방학 장기 이탈 후 **복귀 첫 접속 시 자연 발화** — 14일 창이므로 복귀 시점에 확실히 노출 ✓ (복귀자에겐 잘 작동)
- **한계**: **인앱 전용 — 미접속 이탈자에게 도달 불가**(→ C-4). 이탈자 회수 아웃바운드는 1-1 푸시 2회 + 1-5 이메일뿐

### 1-4. 학사정보 최신화 캠페인 — `AcademicStatusCampaignGate.tsx`(layout.tsx:175 전역) + `lib/academic-status.ts` + `features/academic-status/AcademicStatusView.tsx`
- **발동**: 운영진이 콘솔에서 **수동으로 active 토글**(`isCampaignLive` — active+기간)한 동안, 대상 학기(`targetSemester`, 기본 다음 학기) 이력 미등록 회원에게 모달 팝업. 세션당 dismiss
- **착지**: `/mypage/academic-status` — 학기별 재학/휴학/수료/졸업 등록 폼 ✓
- **갭**: 개강 시즌 자동 발동 없음 + 저장이 `academicStatusHistory`에만 기록(→ **A-1, B-3**)

### 1-5. 주간 다이제스트 — `src/app/api/cron/weekly-digest/route.ts`
- **발동**: 매주 월요일 09:00 KST, 이메일(Resend)+인앱. 락으로 중복 방지 ✓, quiet-hours 존중 ✓
- **재유입 콘텐츠**: "나의 한 주" 개인 블록 + M3 재유입 제안(진단 never/stale·연구설계 미착수·지난주 목표 회고) — 이탈 위험군(미읽음 알림만 있는 회원) 개인 발송 포함(`:782` QA-v3) ✓
- **갭**: 세미나·게시글·활동·질문 **4종 모두 0건이면 발송 전체 스킵**(`:957~960`) — 방학 저콘텐츠기에 개인 재유입 블록까지 침묵(→ B-4). 개강 임박 특화 블록(D-day·신학기 안내) 없음(→ C-6과 M6 상보)

---

## 2. 갭 검증 4항목

| 검증 항목 | 판정 | 근거 |
|---|---|---|
| **방학 모드가 개강 후 자동 해제되는가** | **✓ 정합** | `DailyClassTimelineWidget.tsx:89` `inferCurrentSemester(selectedDate)` — 9/1(월 기준)에 학기 컨텍스트가 2026-2로 자동 전환 → 구학기 enrollments가 필터아웃되어 `isVacation`(`:311~317`, "등록 과목 있음+전부 종강") 자동 false. 방학 카드 자동 소멸 |
| **복귀 첫 화면이 "무엇부터"를 안내하는가** | **△ 부분 정합** | 개강 윈도(D-7~D+14): KickoffBanner 3-CTA + 시간표 빈 상태 "수강과목 등록하러 가기" CTA(`DailyClassTimelineWidget.tsx:1052~1075`) + InactivityCoaching(복귀 시 발화) — 안내 존재 ✓. 단 **D-15 이후(9/16~) 복귀자는 배너 소멸 후 일반 화면**뿐이고, 개강 전 CTA 착지가 구학기 뷰(B-2) |
| **휴학→복학 상태 전환 처리** | **✗ 갭 (A-1)** | 회원용 전환 UI는 학사정보 최신화(`AcademicStatusView`)뿐인데 `academicStatusHistory`에만 기록 — 시스템이 실제 참조하는 `enrollmentStatus`(semester-advance cron·배너·위젯 가시성)와 **비동기**. 복학해도 학기차 동결 지속, 휴학 신고해도 학기차 +1 지속 |
| **학기 필터 기본값이 신학기로 넘어가는가** | **✓ 정합** | 전 표면이 날짜 기반 `inferCurrentSemester`/`currentSemesterKey`(9월=후기, `lib/semester.ts:14~39`, 테스트 존재): courses(`:90~97`)·calendar(`:337`)·gatherings(`:117`)·OrgChart(`:333`)·SeminarForm·MyResearchView·wrapped·cron 일괄. 수동 site_settings 학기 스위치 의존 없음. **단 전환일이 9/1 고정**이라 9/1 이전엔 구학기(B-2의 원인이자, 9/1 이후엔 자동 정합) |

---

## 3. 발견 목록 [접점 → 문제 → 심각도 → 보정안]

### A급 (여정 단절·데이터 오염)

**A-1. 학사정보 최신화 → `academicStatusHistory`·`enrollmentStatus` 이원화 — 휴학→복학 전환이 시스템에 반영되지 않음**
- 접점: 학사정보 최신화 캠페인(1-4) × semester-advance cron × 대시보드 가시성
- 문제: `AcademicStatusView.tsx:77`은 **`academicStatusHistory` 배열만 갱신**하고 `enrollmentStatus` 필드는 불변. 그런데 시스템 판정은 전부 `enrollmentStatus` 기준 — ① `semester-advance/route.ts:155~167`(on_leave면 학기차 동결, 아니면 +1) ② `SemesterKickoffBanner.tsx:43`(graduated 제외) ③ `widget-visibility.ts:79`(alumni 판정). `academicStatusHistory` 소비처는 캠페인 게이트(중복 노출 방지)와 콘솔 응답 현황뿐 — **둘 사이 동기화 코드가 어디에도 없음**(grep 전수 확인).
- 결과: (a) 방학 중 휴학 신고("2026-2 휴학" 등록) 회원도 9월 semester-advance에서 **학기차 +1 오염**, (b) 복학 회원("2026-2 재학" 등록)은 `enrollmentStatus=on_leave`가 남아 **학기차 동결 지속** — ProfileEditor(`:199`)에서 신분 유형을 별도로 또 고쳐야 하는데 그 안내가 어디에도 없음. 개강 전환기(캠페인 시즌)에 정확히 터지는 갭.
- 심각도: **A**
- 보정안(경량): 학사정보 저장 시 대상 학기가 현재 학기면 `enrollmentStatus`를 매핑 동기화(enrolled→enrolled, on_leave→on_leave, graduated→graduated) — `AcademicStatusView.persist` 한 곳 수정. 또는 최소한 semester-advance가 `academicStatusHistory`의 해당 학기 항목을 `enrollmentStatus`보다 우선 참조. (임기·정책 판단 불요 — 코드만으로 완결 가능)

### B급 (재활성 기회 손실·오도)

**B-1. 개강 리마인더가 졸업생·전 역할에게 "시간표 확인" 푸시 발송**
- 접점: semester-start-reminder cron
- 문제: 수신 대상이 `approved==true` **전원**(`route.ts:74`) — 역할·재학 상태 무필터. 반면 같은 목적의 KickoffBanner는 alumni/graduated 제외(`:43`). 졸업생·게스트 승인 계정에 "수강 과목과 시간표를 미리 확인해 보세요" 웹푸시 — 무관 알림은 푸시 차단(전 채널 이탈)의 대표 원인.
- 심각도: **B**
- 보정안: usersSnap 필터에 `role !== "alumni" && enrollmentStatus !== "graduated"` 추가(배너와 동일 기준). 졸업생에게는 발송 자체를 생략하거나 세미나 중심 문구로 분리.

**B-2. 개강 전(D-7~8/31) 리마인더·배너의 착지 `/courses` 기본 학기 = 구학기(2026-1)**
- 접점: semester-start-reminder 착지 + KickoffBanner "수강과목 등록" CTA + 시간표 빈 상태 CTA
- 문제: 학기 전환은 월 기준 9/1(`inferCurrentSemester`: 3~8월=전기). 리마인더 D-7(8/25)·D-1(8/31)과 배너 D-7~D-1 구간은 **아직 전기** — `/courses?tab=mine`의 기본 연도·학기(`courses/page.tsx:90~97`)가 **종강한 2026-1**로 열려, "미리 확인/등록하라"는 안내와 착지 화면이 어긋남(신학기 과목을 보려면 수동 학기 전환 필요). 재활성 핵심 CTA의 첫인상이 "종강한 옛 시간표".
- 심각도: **B**
- 보정안: courses 페이지에서 개강 D-N 윈도(예: D-14~D-1)엔 기본 학기를 다음 학기로 승격(또는 `?sem=next` 쿼리 지원 후 리마인더·배너 링크에 부여). 순수 표현/기본값 계층.

**B-3. 학사정보 최신화 캠페인이 운영진 수동 토글 전적 의존 — 개강 시즌 자동 발동·자동 종료 없음 (+ 졸업생 반복 팝업)**
- 접점: AcademicStatusCampaignGate + console/settings/academic-status
- 문제: `isCampaignLive`는 운영진이 콘솔에서 active를 켜야만 참(`lib/academic-status.ts:95~104`) — **개강 전 활성화를 잊으면 신학기 재학/휴학 데이터가 통째로 미수집**(A-1의 유일한 입력 경로가 침묵). 반대로 끄는 것을 잊으면 무기한 노출. 또한 게이트에 역할 필터가 없어 **졸업생도 대상 학기 이력을 등록하기 전까지 세션마다 팝업**(`AcademicStatusCampaignGate.tsx:58~72` — dismiss가 sessionStorage라 브라우저 재시작마다 재노출).
- 심각도: **B**
- 보정안: ① 개강 윈도(D-14~D+14) 자동 라이브 폴백(수동 설정이 있으면 수동 우선) 또는 콘솔 pending 큐에 "캠페인 미활성" 경고 배지, ② 게이트에서 graduated/alumni 제외(또는 이력 최신 항목이 graduated면 영구 미노출). 발송 정책 판단이 필요한 부분은 §4 외부의존으로 분리하되 팝업 필터는 코드만으로 가능.

**B-4. weekly-digest 공통 콘텐츠 4종 0건이면 개인 재유입 블록까지 전체 미발송**
- 접점: weekly-digest cron
- 문제: `route.ts:957~960` — 세미나·인기글·활동·미답변 질문이 모두 0이면 `sendDigest` 조기 반환. 방학 중하순(8월)은 정확히 이 4종이 비는 시기인데, 이때 **개인화 재유입 제안(진단 stale·연구설계·목표 회고)과 미읽음 알림 카운트까지 함께 침묵** — 이탈자 대상 유일한 정기 이메일이 방학에 멈추는 역설. (B5 수정으로 목표 "기록"은 발송과 분리됐으나 "발송"은 여전히 공통 콘텐츠에 종속)
- 심각도: **B**
- 보정안: 스킵 조건을 "공통 4종 0건 **그리고** 개인 블록 보유 수신자 0명"으로 완화 — 개인 콘텐츠 보유자에겐 개인 블록만으로도 발송.

### C급 (마모·불일치·사소)

**C-1. 개강일 기준 불일치 — cron은 `academic_calendar` 실개강일, 배너·방학카드는 관례일 하드코딩**
- `semester-start-reminder/route.ts:31~44`(실개강일 우선) vs `SemesterKickoffBanner.tsx:22~24`·`VacationModeCard.tsx:53`(3/1·9/1 고정). 실제 개강이 9/2 이후면 알림 날짜와 배너 윈도·D-day 카운트가 어긋남. → 배너·카드도 `useAcademicCalendar` 개강일 참조(폴백 관례일).
**C-2. KickoffBanner 문구 하드코딩 — "방학 동안 논문 도구가 크게 업그레이드됐어요"**
- `:78` 2026-07-04 시점 클레임 고정. whats-new 실데이터(v11-M6 자동 최신성)와 무연동 — 다음 방학에 업데이트가 없으면 허위가 됨. → whats-new 최근 N건 유무로 문구 분기(v12-M6에서 흡수 권장).
**C-3. KickoffBanner가 휴학(on_leave) 회원에게도 "수강과목 등록" 유도**
- `:43` alumni/graduated만 제외. 휴학자에겐 "복학 안내·학사정보 최신화" 문구가 정합. → on_leave 분기 문구(A-1 보정과 연동 시 효과).
**C-4. 미접속 이탈자 대상 아웃바운드 재참여 넛지 부재**
- InactivityCoaching은 인앱 전용, 이탈자 도달 채널은 개강 푸시 2회+월요 이메일뿐. 휴면 리마인더(빈도·문구)는 **§4 외부의존(푸시 정책)** — 코드 감사 범위에서는 기록만.
**C-5. `cohortKeyOf` createdAt 폴백 시 8월 가입 신입이 온보딩 리마인드 분기 누락**
- `lib/semester.ts:61~71` — enrollmentYear/Half 미입력 신입은 8월 가입 createdAt→"2026-1"로 산정되어 9/1 개강 온보딩 분기(`semester-start-reminder:134~144`)에서 제외. 가입폼이 입학시점을 받으므로 실빈도 낮음. → 폴백 시 "다음 학기 시작 30일 전 가입이면 다음 학기 코호트" 보정 고려.
**C-6. 다이제스트·복귀 표면에 개강 임박 신호 부재 (기계획 중복 기록)**
- 개강 D-day·신학기 안내 블록 없음(M6·H1 상보), wrapped 학기말 게이트로 8~9월 성장 서사 부재(**v12-H4로 기계획** — 재제안 아님, 감사 확인만).

### 정합 확인 (문제 없음 — 증거)

1. **방학 모드 자동 해제** — 날짜 기반 학기 전환으로 9/1 자동 해제 (§2)
2. **학기 필터 기본값 일괄 자동 전환** — 수동 스위치 의존 0 (§2)
3. **개강 리마인더 견고성** — D-7 버킷 보정·refId 멱등·실개강일 반영·푸시 병행 (1-1)
4. **복귀자 인앱 코칭** — 14일 창 판정이라 복귀 첫 접속에 확실 발화, 신입 가드 ✓ (1-3)
5. **시간표 빈 상태 CTA** — 신학기 미등록 시 "수강과목 등록하러 가기" + 타 학기 기록 안내 (`DailyClassTimelineWidget.tsx:1052~1075`)
6. **semester-advance 멱등·조직도 이월** — asOf 앵커 멱등, 신학기 조직도 비파괴 이월+운영진 알림 (R3)

---

## 4. 핫픽스 우선순위 제안 (코드 수정은 본 감사 범위 밖 — 목록만)

| 순위 | 대상 | 크기 | 파일 |
|---|---|---|---|
| 1 | A-1 학사정보↔enrollmentStatus 동기화 | S | `features/academic-status/AcademicStatusView.tsx` (persist 1곳) |
| 2 | B-1 리마인더 수신 역할 필터 | S | `api/cron/semester-start-reminder/route.ts` (1줄 필터) |
| 3 | B-2 개강 윈도 courses 기본 학기 승격 | S | `app/courses/page.tsx` (기본값 계층) |
| 4 | B-3 캠페인 자동 폴백 + 졸업생 팝업 제외 | S~M | `AcademicStatusCampaignGate.tsx`·콘솔 경고 배지 |
| 5 | B-4 다이제스트 스킵 조건 완화 | S | `api/cron/weekly-digest/route.ts` (조기반환 조건) |
| 6 | C-1~C-3 배너 정합(개강일·문구·휴학 분기) | S | `SemesterKickoffBanner.tsx`·`VacationModeCard.tsx` (M6과 묶음 처리 권장) |

> 외부 의존 분리: C-4(휴면 넛지 발송 빈도·문구)는 §4 "개강 재활성 넛지 발송" 정책 확정 후. 나머지는 전량 코드만으로 완결 가능.
