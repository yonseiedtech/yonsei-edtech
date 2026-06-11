# 2026-06-12 오케스트라 자율 세션 — 사이클 5~15

> 운영 모드: 사용자 부재 중 오케스트라 AI 자율 진행 (기존 기능 고도화 + 신규 기능).
> 게이트: 매 사이클 `npx tsc --noEmit` → 전체 vitest → CI worktree(`C:\work\yonsei-edtech-ci`) `BUILD_EXIT=0` → 묶음 push 1회 + `npm run deploy:vercel` 1회.

## 배포 1차 — 사이클 5~11 + 리뷰 반영 (7e1df8b2..18f99655, ✓ Ready)

| # | 커밋 | 내용 |
|---|---|---|
| 5 | 2d393120 | 온보딩 체크리스트 신기능 판정 2종 — `set.thesisJourneyStage` / `participated.commBoard` (commQuestions/commAnswers `existsByAuthor` limit 1 게이트). 콘솔 select는 라벨 레코드 기반 자동 노출. **운영진이 콘솔에서 항목 추가해야 위젯 표시** |
| 6 | 221d8faf | 보안질문 PBKDF2-SHA256+per-user salt 마이그레이션 — `pbkdf2$310000$salt$hash`, 레거시 무염 SHA-256은 검증 성공 시 자동 업그레이드(fire-and-forget). timingSafeEqual, 변조 포맷 거부. Web Crypto(가입)↔Node(검증) 호환 테스트 16건. `src/lib/security-answer.ts` 신규 |
| 7 | fd26d8b7 | 에디터 버전 비교 — 복원 전 현재 편집본 대비 장별 글자수 before→after(+delta 색상). 줄어드는 장 경고 문구 |
| 8 | d24ef8a4 | 논문 여정 단계별 추천 아카이브 개념 칩(`JOURNEY_STAGES.archiveTopics`, 시드 실존 개념명) → `/archive/concept?q=` 자동 검색 진입. `[type]` 페이지 `?q=` 초기 검색어 지원 |
| 9 | 181756cc | 대시보드 여정 인사 헤더에 미반영 지도(amber) 칩 → `/mypage/research?tab=feedback` (딥링크 동작 검증 완료) |
| 10 | e03cc88c | 에디터 단락 순서 이동 ↑↓ (`moveParagraph` 불변 스왑, 경계 disabled) |
| 11 | d23dd340·7c54edb6 | 콘솔 인사이트(회원 보고서) 논문 여정 단계 분포 — `MemberMetricsRow.thesisJourneyStage` 패스스루 + 미설정 포함 6행 막대 + 테스트 |
| R | 18f99655 | 리뷰 반영 — 불필요 `as` 캐스트 2곳 제거, 테스트 필수 입력 보강(tsc 전수 통과) |

### 배포 전 검증 패스
- opus code-reviewer 에이전트 2회 모두 transcript 0바이트 유실(기존 stall 패턴) → **중점 8항목 직접 검증으로 대체**:
  PBKDF2 다운그레이드 불가(포맷 분기·신규 가입 항상 pbkdf2) · timingSafeEqual 길이 보장 · `existsByAuthor`는 comm rules `read, list: if true`로 통과 · 단일 where+limit은 자동 인덱스 충분 · moveParagraph 불변성 · compareId 자연 소멸 · queryKey 공유는 의도적(에디터와 동일 데이터) · 업그레이드 update는 admin SDK 비차단.

## 배포 2차 — 사이클 12~14 (18f99655..e49c7076, ✓ Ready)

| # | 커밋 | 내용 |
|---|---|---|
| 12 | 6c7b39a5 | 에디터 섹션 순서 이동 ↑↓ (단락 이동과 한 쌍, `moveSection`) |
| 13 | 70d85bbc | 아카이브 개념 상세에 논문 여정 역링크 배지 — `archiveTopics` 역매칭 "여정 N학기·단계 추천 개념" 칩. 여정→아카이브(8)와 양방향 완성 |
| 14 | e49c7076 | 복원 전 자동 백업 일괄 정리 — `AUTO_BACKUP_PREFIX` 상수화(생성·매칭 단일 소스), 2개 이상일 때 정리 버튼(confirm+부분 실패 집계) |

## 배포 3차 준비 — 사이클 15 (3b8b1242, CI 진행 중)

| # | 커밋 | 내용 |
|---|---|---|
| 15 | 3b8b1242 | **전역 검색 Ctrl/Cmd+K** — 아카이브 3종·세미나·학술활동·졸업생 논문 + 바로가기 8종 통합. cmdk 의존성 없이 Dialog+Input 자체 구현, 열릴 때 1회 병렬 로드(5분 캐시), 그룹당 5개, ↑↓/Enter/Esc 키보드 네비+활성 스크롤 추적, 헤더 데스크톱·모바일 양쪽 |

## 배포 4차 준비 — 사이클 16~17

| # | 커밋 | 내용 |
|---|---|---|
| 16 | 589978c0 | 전역 검색에 공지 소스 추가 — `postsApi.list(category=notice, sort:"")` (public read 한정, useBoard 인덱스 회피 패턴) |
| 17 | e8e1aeb5 | 검색 발견성 — 데스크톱 헤더를 아이콘 → "검색 Ctrl K" pill 로 확장 (모바일은 아이콘 유지) |

## 배포 5차 — 사이클 18 (e8e1aeb5..2b2aa459, ✓ Ready)

| # | 커밋 | 내용 |
|---|---|---|
| 18 | 2b2aa459 | 검색 최근 선택 기록 — localStorage(global-search.recent) 최대 5, 빈 쿼리 시 "최근" 선두 그룹, stale 키 자동 무시·하위 그룹 중복 제외 |

## 배포 6차 — 사이클 19 게시판 rules 버그 수정 (2b2aa459..b771a8cb, ✓ Ready)

잠재 이슈로 기록했던 건을 **비인증 Firestore REST runQuery 로 실증 → 확정 → 수정**:
- 실증: 카테고리 무필터 posts list = PERMISSION_DENIED (PeerActivityFeed·홈 ActivityCards·게시판 "전체" 탭이 조용히 깨져 있었음) / category=update read = PERMISSION_DENIED (`/board/update` 깨짐 — rules enum 에 'update' 누락, Sprint 67-AL 카테고리 추가 시 rules 미동기화)
- rules: postCategoryReadable/Writable enum 에 'update' 추가 → **배포 후 REST 재검증으로 read 복구 확인**
- indexes: posts(category asc, createdAt desc) 복합 인덱스 추가 → 빌드 완료 후 in+orderBy 쿼리 통과 확인
- 코드: `PUBLIC_POST_CATEGORIES`(rules 와 동기화 주석) + `postsApi.listReadable`(공개 enum in + orderBy + limit) — 피드·홈카드 전환, useBoard 전체 탭은 권한별(includeResources=로그인, includeStaff=staff+) + 캐시 키에 권한 포함
- 교훈: **클라이언트 공개 API key 로 비인증 REST runQuery 프로브 = rules 동작 실증 진단법** (코드 추측 → 확정 전환). 카테고리 enum 추가 시 rules postCategoryReadable/Writable 동기화 필수

## 상태
- 테스트: 581 → **598** (PBKDF2 16 + 패스스루 1)
- 보안 백로그 해결: PBKDF2 마이그레이션(코드 L8 TODO 이행), resolve-email은 기방어 확인 완료
- 운영 액션 필요: 콘솔 온보딩 체크리스트에 신규 항목 2종 추가(라벨: "논문 여정 단계 설정" / "소통 보드 질문/답변 1건")
- 보류(사용자 결정): 회원 자동 승인 cron화(1시간 가드와 정책 상호작용), 대시보드↔마이페이지 통계 중복 정리, 헤더/푸터 메뉴 개편
