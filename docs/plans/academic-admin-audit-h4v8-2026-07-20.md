
## 2. 데이터 정합 위험 · 링크 고아 · 권한 게이트

### 데이터 정합(스키마 divergence) 위험
- 전체 낮음: 대부분 라우트가 동일 공유 컴포넌트 렌더 → 같은 컬렉션을 같은 스키마 가정으로 접근, 한쪽만 갱신 회귀가 구조적으로 억제됨.
- ★유일한 실 divergence: external/[id]/program — academic-admin 구 편집기 vs console 신 편집기(ConsolePageHeader 독립 구현). 같은 conferencePrograms 컬렉션을 서로 다른 UI/필드 가정으로 사용 가능 → 병행 유지 시 실제 회귀 위험. 정리 1순위.
- certificates 는 양쪽 모두 admin/certificates 재export → 소스 단일, 위험 없음.

### 링크 고아 / 도달성
- academic-admin 실 외부 인바운드 = 2곳:
  1. src/app/activities/external/[id]/program/page.tsx:66 — 공개 활동 페이지 Link 가 academic-admin/external/[id]/program(구 편집기)로 유입. console 신 편집기로 교체 필요.
  2. src/app/api/cron/seminar-status/route.ts:175,195 — 알림 생성 link 가 academic-admin/seminars/certificate 로 유도(신규 발송 알림). console 경로로 교체 필요.
- 링크 아닌 참조(부수 정리): robots.ts:13 Disallow 등록, BottomNav.tsx:162 해당 경로 BottomNav 숨김 가드.
- 네비/사이드바 메뉴에는 academic-admin 진입점 없음 — console/layout.tsx·command-routes.ts 전부 /console/academic/* 사용. 계획의 "링크 18곳"은 대부분 academic-admin 자기 내부 self-link(seminars/layout 탭·상세 backHref) 과대 계상. 메뉴 수렴은 사실상 완료 상태.

### 권한 게이트 차이
- 차이 없음. academic-admin/layout.tsx·console/layout.tsx 모두 AuthGuard allowedRoles=staff/president/admin/sysadmin. (academic-admin 은 2026-06-16 AuthGuard 추가로 무가드 crash 경로 이미 차단.)

## 3. 통합 권고안 (이행 순서 · 위험도)

목표 상태: /console/academic/* 단일 정본, src/app/academic-admin/* 디렉토리 제거. 파괴적 삭제는 최후.

1. 인바운드 링크 교체 (위험 LOW)
   - activities/external/[id]/program/page.tsx:66 Link → /console/academic/external/[id]/program.
   - api/cron/seminar-status/route.ts:175,195 알림 link → /console/academic/seminars/certificate.
   - 기존 발송 알림 backfill 은 선택(신규만 교체해도 유입 차단).
2. 역결합 5건 구현 이관 (위험 MEDIUM) — 재export 방향 역전: academic-admin 실제 구현을 console 페이지(또는 공유 feature 컴포넌트)로 이동, console 이 더는 academic-admin 의존 안 하게. 대상: manage(Dashboard)·workbook·seminars(reviews·promotion·certificate). 각 이관 후 화면 런타임 스모크(수료증·워크북·후기·홍보·대시보드) 필수.
3. redirect 스텁 배치 (위험 LOW) — academic-admin/* 각 라우트를 redirect(/console/academic/...) 얇은 스텁으로 축소(북마크·잔존 알림 흡수). 구 divergence 편집기(external/[id]/program)는 이 단계에서 신 편집기로 즉시 리다이렉트되어 회귀 위험 제거.
4. 디렉토리 삭제 (위험 LOW, 3 유예 후) — src/app/academic-admin/** 제거. 동반 정리: robots.ts:13 Disallow, BottomNav.tsx:162 가드 조건, academic-admin/seminars/layout.tsx.

삭제 판정 근거: (a) 19개 전 라우트 console 대응 존재, (b) 대다수 동일 공유 컴포넌트로 기능 손실 없음, (c) console 최신(2026-07-18)·상위기능(applications·manage·seminars/[id]·speakers·volunteers·session-analytics) 보유, (d) academic-admin 2026-07-04 정지·메뉴 미노출로 트래픽 신호 없음. 단 5건(재export)·2건(인바운드)·1건(program divergence)은 삭제 전 선행조치 필수 — 순서 1→2→3→4 준수 시 파괴적 회귀 없음.

## 4. 부산물(M2): 고아 라우트 후보

전 src/app 312 라우트 자동 탐지(정적 경로가 자기 파일 밖 어디에서도 미참조). 크루드 휴리스틱 — 동적/템플릿 링크는 누락될 수 있어 후보로만, 수동 확인 필요.

academic-admin 외 고아 후보(M2에서 스모크·정리):
- /console/academic/seminars/poster — console 세미나 layout 탭·seminars/[id] 서브메뉴 미노출(양쪽 트리 공통 고아).
- /console/academic/seminars/reviews — 재export, seminars 네비·seminars/[id] 링크 없음 → 진입 불명확.
- /console/archive/concepts/new, /console/archive/measurements/new, /console/archive/variables/new — 생성 페이지, 목록 "새로 만들기" 동적 링크 가능성 높아 오탐 가능.
- /console/handover/overview — handover 허브 진입 여부 확인.
- /console/insights/analytics, /console/insights/semester — insights 허브 탭/링크 여부 확인(오탐 가능).
- /console/settings/external, /console/settings/projects, /console/settings/studies — 의도적 redirect 스텁(각 /console/academic/*). 유지/정리 판단 대상.
- /console/settings/page-headers — settings 메뉴 노출 확인.
- /console/transition — 진입점 확인.

academic-admin 계열 고아(§1·3에서 이미 삭제 판정): /academic-admin/certificates, /academic-admin/projects, /academic-admin/projects/[id], /academic-admin/seminars/poster, /academic-admin/seminars/report, /academic-admin/studies, /academic-admin/studies/[id].

주의: 자동탐지는 동적/템플릿 링크를 놓칠 수 있음 — M2 스모크에서 각 후보 실접속·인바운드 재확인 후 삭제/유지 확정.
