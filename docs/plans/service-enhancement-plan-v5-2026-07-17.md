# 연세교육공학회 차기 라운드 고도화 백로그 v5 (2026-07-17)

> 작성: 수석 서비스 플래너 (자율 분석) · 대상: yonsei-edtech (Next.js 16 + Firestore, LIVE)
> 전제: **오늘(2026-07-17) 대규모 UX 스프린트 6배포 완료분은 재제안하지 않는다.**
> 실측 근거: `git log --since=2026-07-17` 6커밋(스프린트1~3 + M4·M5 + 콘솔 통합), 변경 파일 실독.

---

## 0. 오늘 반영분 요약 (재제안 금지선 — 실측)

| 커밋 | 반영 내용 |
|---|---|
| `9b7182b5` 스프린트1 | 아카이브 랜딩 재편·스티키 서브내비(`ArchiveSubNav`)·크로스링크(`archive-reverse-link`)·`/archive/my` 허브·리스트 툴바(`ArchiveListToolbar`)·전역검색 고도화·최근열람 스트립·사전 비교 |
| `592f1f0a` 스프린트2 | 설계→논문 import(`WritingPaperEditor`)·진단 약점 위젯 확장(`DiagnosticWeakConceptPath`)·암기카드 전 타입(변인·측정) 확장 |
| `bedcf078` 스프린트2후반 | `weekly-digest` 학습 제안 블록·세미나 후기→지도노트 환류 |
| `914c54c5` 스프린트3 | 온보딩 통합+폴백·개인화 QuickLinks(`member-stage`)·졸업생 멘토 채널 토글·아카이브 통합 검수 큐(`console/archive/review-queue`) |
| `51a23179` M4·M5 | 잔디 비활성 코칭(`inactivity-coaching`)·공동연구 진입 상시화(`SimilarResearchersSection`) |
| `3a730049` M6·L3·L4 | `academic-admin→console` 리다이렉트·리더보드/진도미팅 내비 편입·발견성 소품 |

이 6배포가 **새로 만든 루프의 "다음 단계"** 를 아래에서 기획한다. 각 항목은 오늘 만든 골격을 심화하거나, 그 골격이 노출한 신규 부채(데이터 정합·성능·신뢰)를 다룬다.

---

## 1. 관점별 문제 진단 (렌즈 5종)

### 렌즈 ① 오늘 만든 루프의 심화 (골격→깊이)
- **검수 큐가 이진(published)뿐** — `review-queue/page.tsx` 주석: "보류 = rejected 플래그 없음 → 세션 내 클라이언트 dismiss, DB는 draft 유지". 보류 사유·재검수 이력·처리 지표가 남지 않는다.
- **비활성 코칭이 1채널 단발** — `inactivity-coaching.ts`는 "멈춘 습관 1건"만 제안. 주간 목표 설정·달성 추적 루프가 없어 코칭→행동 전환이 측정 불가.
- **멘토 채널이 토글+조언요청뿐** — 졸업생 멘토 on/off와 단발 요청만 존재. 구조화된 Q&A·후기·매칭 이력이 없음.

### 렌즈 ② 데이터 품질·정합
- **크로스링크 단방향 저장** — `archive-reverse-link.ts` 주석: "저장 시점엔 한쪽만 갱신(Form 모두 단방향)". 상세는 read-time 병합으로 가리지만, **리스트/랜딩의 연결 개수 역집계**는 병합 로직을 못 타면 실제보다 적게 표시될 위험.
- **졸업논문 analysis 프로필 저활용** — `alumni/thesis`에 양적/질적/혼합·연구방법·변인·측정 프로필이 쌓이나, 진단·설계·검색에서 이를 근거로 되먹임하는 경로가 약함.

### 렌즈 ③ 성능·기술 기반 (★가장 큰 부채)
- **전 컬렉션 클라이언트 통 fetch** — `bkend.ts` `dataApi.list`는 `constraints`에 limit이 없으면 컬렉션 전체를 읽고 `{ total: data.length }` 반환. **서버 프리패치/ISR/커서 페이지네이션 전무.** 아카이브 리스트(개념·변인·측정·방법)는 방문마다 전체를 클라이언트에서 로드.
- **Firestore 읽기 비용 선형 증가** — 컬렉션이 커질수록 매 방문 = 전체 문서 읽기. `networking_rsvps limit:2000`, `list:200~500` 등 상한만 있고 캐시·증분이 없음.

### 렌즈 ④ 신뢰·운영
- **감사 로그 실패 silent + 커버리지 편차** — `audit.ts` `logAudit`는 실패 시 `console.warn`만. 어떤 콘솔 액션이 로깅되는지 일관 기준이 없어 사후 추적 사각.
- **권한 게이트 산발** — `isAtLeast` 클라이언트 체크 위주. 검수 승인·삭제 등 파괴적 액션의 서버측 재검증 일관성 점검 필요.
- **백업/복구 전략 부재** — Firestore 정기 export·롤백 문서 없음.

### 렌즈 ⑤ 미답 영역
- **학기 캘린더 미연동** — `semester.ts` `inferCurrentSemester`(전기/후기 추정)는 존재하나 회원 대시보드·마감·디제스트에 학사일정 맥락이 연결 안 됨(콘솔 `academic-calendar`만 존재).
- **세미나 라이브 활용 협소** — 라이브 콘솔은 세미나 당일에만. 다시보기·아카이브·Q&A 재활용 경로 부재.
- **PWA/오프라인 고아** — `public/manifest.json` 없음, 서비스워커 없음, `src/app/offline/page.tsx`는 존재하나 트리거할 SW가 없어 도달 불가. 모바일 설치·홈화면·오프라인 폴백 미작동.

---

## 2. 고도화 백로그 (14+ 항목)

> 형식: **[문제(근거 파일·라우트) → 제안 → 기대효과 → 난이도 S(<1주)/M(1~2주)/L(3주+)]**

### High (즉시 착수 · ROI 높음 · 외부의존 없음)

**H1. 아카이브 리스트 서버 프리패치 + 커서 페이지네이션 (성능 기반)**
- 문제: `src/lib/bkend.ts` `dataApi.list`가 limit 미지정 시 컬렉션 전체를 클라이언트 fetch(`total: data.length`, 서버 페이지네이션 없음). `src/app/archive/[type]/page.tsx` 등이 방문마다 전량 로드 → Firestore 읽기 선형 증가·초기 렌더 지연.
- 제안: (1) 아카이브 리스트를 Server Component + `generateStaticParams`/ISR(revalidate)로 초기 N건 서버 프리패치, (2) 클라이언트는 `startAfter` 커서 기반 "더 보기" 증분 로드, (3) `dataApi.list`에 `cursor`/`pageSize` 파라미터 추가로 공통화.
- 기대효과: 초기 로드 체감 개선, Firestore 읽기 비용 절감(첫 화면 = N건만), 대형 컬렉션 확장성 확보.
- 난이도: **L**

**H2. 검수 큐 영속 상태 모델 + 품질 지표 (루프 심화)**
- 문제: `src/app/console/archive/review-queue/page.tsx` — 보류가 세션 내 클라이언트 dismiss뿐, 사유·재검수 이력·처리량이 DB에 안 남음(주석 명시).
- 제안: `reviewStatus`(draft/approved/held/rejected) + `reviewNote`·`reviewedAt` 필드를 `ArchiveOperationalMeta`에 추가. 콘솔에 "이번 주 처리 N건·평균 대기시간·보류 사유 분포" 미니 지표 카드.
- 기대효과: 검수 누락 방지, 운영진 인수인계 시 상태 승계, 품질 운영 가시화.
- 난이도: **M**

**H3. 크로스링크 write-time 양방향 denorm 동기화 (데이터 정합)**
- 문제: `src/lib/archive-reverse-link.ts` 주석 — 양방향 모델이나 Form이 단방향 저장, 상세만 read-time 병합. 리스트/랜딩 연결 개수 역집계가 실제보다 적게 표시될 위험.
- 제안: `src/lib/denorm-sync.ts` 패턴을 확장해 연구방법↔통계방법 저장 시 상대 문서의 역참조 배열도 갱신(또는 일회성 백필 스크립트 + 저장 훅). 리스트 카운트는 denorm 필드 사용.
- 기대효과: 연결 개수 정확도 100%, read-time 병합 비용 제거, 검색/추천 근거 신뢰.
- 난이도: **M**

**H4. 졸업논문 analysis 프로필 → 진단·설계 되먹임 (데이터 활용)**
- 문제: `alumni/thesis`의 연구방법·변인·측정 프로필이 축적되나 회원 여정에 환류 안 됨.
- 제안: 진단 약점·설계 단계에서 "같은 방법/변인을 쓴 졸업논문 N편" 크로스링크 제시(이미 있는 `DiagnosticWeakConceptPath`·`WritingPaperEditor`에 슬롯 추가). 검색에도 analysis 패싯 필터.
- 기대효과: 아카이브 자산의 학습 전환율↑, 졸업논문 열람 유입, 설계 근거 강화.
- 난이도: **M**

**H5. PWA 매니페스트 + 서비스워커 활성화 (미답 영역·모바일)**
- 문제: `public/manifest.json`·서비스워커 부재, `src/app/offline/page.tsx`가 고아(트리거 불가). 모바일 홈설치·오프라인 폴백 미작동.
- 제안: `manifest.webmanifest`(이름·아이콘·테마색 — 브랜드 네이비/씨앗엠블럼) + `next.config` PWA(또는 최소 SW로 정적 셸·`/offline` 폴백 캐시). `layout.tsx`에 manifest 메타 연결.
- 기대효과: 모바일 재방문 리텐션(홈 아이콘), 오프라인 최소 열람, 설치형 앱 인식.
- 난이도: **M**

### Medium (1~2 스프린트)

**M1. 비활성 코칭 → 주간 목표 설정·달성 루프 (루프 심화)**
- 문제: `src/lib/inactivity-coaching.ts`는 단발 제안 1건뿐, 목표·달성 추적 없음.
- 제안: 코칭 카드에서 "이번 주 목표(예: 논문 2편 읽기)" 설정 → 잔디 집계로 자동 달성 판정 → 주말 회고. `weekly-digest`에 달성률 리포트.
- 기대효과: 코칭→행동 전환 측정, 습관 형성 강화.
- 난이도: **M**

**M2. 멘토 채널 → 구조화 Q&A + 후기 (루프 심화)**
- 문제: 졸업생 멘토가 토글+단발 조언요청뿐(`AlumniHomeWidgets`·프로필 토글). 이력·평판·재활용 없음.
- 제안: 멘토 Q&A 스레드(질문→답변→채택, 기존 `comm_boards` 패턴 재사용) + 상담 후기. 프로필에 멘토링 이력·분야 태그.
- 기대효과: 졸업생 참여 지속 동기, 재학생 질문 자산화, 매칭 근거.
- 난이도: **M**

**M3. 학기 캘린더 회원 대시보드 연동 (미답 영역)**
- 문제: `src/lib/semester.ts` 학기 추정은 있으나 회원 UI에 학사맥락 없음(콘솔 `academic-calendar`만).
- 제안: 대시보드에 "이번 학기 주요 일정(수강신청·종합시험·논문심사·방학)" 위젯 + D-day. 진도미팅·마감을 학기 프레임에 배치.
- 기대효과: 시기별 행동 유도, 논문학기 여정 정렬.
- 난이도: **M**

**M4. Firestore 읽기 캐시 계층 (React Query staleTime/증분) (성능)**
- 문제: 리스트가 방문마다 재fetch(`query-provider` 존재하나 아카이브 상당수 `useState+useEffect` 직접 fetch — `[type]/page.tsx`).
- 제안: 아카이브·멤버·세미나 목록을 React Query로 이관, `staleTime`·`select`·구조공유로 재방문 무읽기. 자주 안 바뀌는 컬렉션은 긴 staleTime.
- 기대효과: Firestore 읽기 비용 절감, 탭 전환 즉시성.
- 난이도: **M**

**M5. 감사 로그 커버리지 표준화 + 알림 (신뢰·운영)**
- 문제: `src/lib/audit.ts` 실패 silent, 어떤 파괴적 액션이 로깅되는지 일관 기준 없음.
- 제안: 승인·삭제·권한변경·검수처리 등 파괴적 액션에 `logAudit` 일괄 배치(체크리스트) + 실패 시 콘솔 배지/재시도 큐. `console/audit-log` 필터(액션·행위자·기간).
- 기대효과: 사후 추적성, 운영 사고 원인 규명, 신뢰.
- 난이도: **S~M**

**M6. 세미나 라이브 → 다시보기·아카이브 재활용 (미답 영역)**
- 문제: 라이브 콘솔이 세미나 당일에만 유효, 장표·Q&A·설문이 종료 후 사장.
- 제안: 세미나 상세에 "라이브 다시보기"(장표+Q&A 아카이브) 탭 + 후기와 연결. 우수 Q&A를 아카이브 개념/방법에 크로스링크.
- 기대효과: 콘텐츠 수명 연장, 불참자 열람, 지식 자산화.
- 난이도: **M**

**M7. 파괴적 액션 서버측 권한 재검증 감사 (신뢰·보안)**
- 문제: `isAtLeast` 클라이언트 게이트 위주, 승인/삭제 API의 서버 권한 재검증 일관성 미확인.
- 제안: `src/app/api/**`의 mutation 엔드포인트를 `api-auth`로 서버 권한 재검증 일괄 점검·보강(체크리스트 + codex 교차검증).
- 기대효과: 권한 우회 차단, 보안 신뢰.
- 난이도: **M**

**M8. 아카이브 검색 인덱스 사전계산 (성능·발견성)**
- 문제: `archive-search.ts` 전역검색이 클라이언트 전량 로드 후 필터 추정 → 컬렉션 성장 시 저하.
- 제안: 빌드/크론 시 경량 검색 인덱스(id·title·altNames·type) 사전 생성(JSON 또는 별도 컬렉션), 검색은 인덱스만 로드.
- 기대효과: 검색 즉시성, 전량 로드 제거.
- 난이도: **M~L**

### Low (여유 시 · carryover)

**L1. Firestore 정기 백업/복구 런북 (신뢰)**
- 문제: export/롤백 문서·자동화 부재.
- 제안: 스케줄 export(GCS) + 복구 절차 문서. 난이도: **S** (외부 GCP 설정 일부 의존 — §3 참조).

**L2. 검수 큐 개념/변인/측정 확장 (루프 심화)**
- 문제: 현재 큐는 published 게이트 있는 4컬렉션만(개념·변인·측정은 등록 즉시 공개, 큐 제외).
- 제안: 등록 즉시 공개 항목에 "사후 검수 플래그"(품질 리뷰 대기) 도입 여부 검토. 난이도: **M**

**L3. 대시보드 위젯 데이터 배치 fetch 통합 (성능)**
- 문제: 대시보드 다수 위젯이 각자 fetch(`dashboard/page.tsx` 위젯 다수).
- 제안: 상위에서 병렬 배치 로드 후 prop 분배, 중복 읽기 제거. 난이도: **M**

**L4. 접근성 정밀화 라운드 (신뢰·품질)**
- 문제: 신규 컴포넌트(`ArchiveSubNav`·검수 큐·코칭 카드) a11y 미검증.
- 제안: 포커스 순서·aria-live·키보드 내비 스모크 + 자동 검사. 난이도: **S**

---

## 3. 외부 의존 항목 (운영진 결정·인프라·콘텐츠 필요 — 코드만으로 불가)

| 항목 | 의존 |
|---|---|
| Firestore 정기 export(L1) | GCP 스케줄러/GCS 버킷·권한(운영진 승인) |
| 세미나 라이브 다시보기(M6) | 장표 원본 보관 정책·저작권 동의(연사) |
| PWA 푸시 알림 확장 | 푸시 발송 정책·발송 주체 합의 |
| 멘토링 후기 공개 범위(M2) | 졸업생 동의·공개 정책 |
| 학기 캘린더 원천(M3) | 대학원 공식 학사일정 데이터 소스·갱신 담당 |

---

## 4. 즉시 착수 Top 5 (권장 순서)

1. **H3 크로스링크 write-time 동기화(M)** — 오늘 만든 아카이브 개편의 데이터 정확도를 즉시 보증. 저위험·고신뢰.
2. **H2 검수 큐 영속 상태 + 지표(M)** — 오늘 만든 검수 큐의 명시적 부채(세션 dismiss) 해소. 운영 즉효.
3. **H1 아카이브 리스트 서버 프리패치/페이지네이션(L)** — 최대 성능 부채. 컬렉션 성장 전 선제 처리.
4. **H5 PWA 매니페스트/SW(M)** — 고아 `/offline` 활성화 + 모바일 리텐션. 독립 영역·병렬 가능.
5. **H4 졸업논문 analysis 되먹임(M)** — 축적 자산의 학습 전환. 오늘 만든 위젯 슬롯 재사용.

> 병렬 편성: H3·H2(콘솔/아카이브) ‖ H1(성능 기반) ‖ H5(PWA·독립). 파일 영역이 겹치지 않아 3트랙 동시 진행 가능.

---

## 참고 파일 (절대경로 · 실측)
- `C:\work\yonsei-edtech\src\lib\bkend.ts` (dataApi.list — 전량 fetch·페이지네이션 없음)
- `C:\work\yonsei-edtech\src\lib\archive-reverse-link.ts` (단방향 저장·read-time 병합)
- `C:\work\yonsei-edtech\src\app\console\archive\review-queue\page.tsx` (이진 published·세션 dismiss)
- `C:\work\yonsei-edtech\src\lib\inactivity-coaching.ts` (단발 코칭)
- `C:\work\yonsei-edtech\src\lib\member-stage.ts` (단계 판정)
- `C:\work\yonsei-edtech\src\lib\audit.ts` (실패 silent)
- `C:\work\yonsei-edtech\src\lib\semester.ts` (학기 추정 — 미연동)
- `C:\work\yonsei-edtech\src\app\offline\page.tsx` (SW 부재로 고아)
- `C:\work\yonsei-edtech\src\app\archive\[type]\page.tsx` (클라이언트 전량 로드)
- `C:\work\yonsei-edtech\src\app\api\cron\weekly-digest\route.ts` (학습 제안 블록)
