# 전 페이지 QA 전수 감사 v2 (2026-07-03) — 10개 영역 병렬 감사 + Hotfix

감사 방식: 영역별 QA/UX/보안 에이전트 10개 병렬 코드 감사 → Critical/High 교차 검증 → 즉시 수정·배포.
범위: 논문 에디터 코어·신규 패널, 연구 여정·매트릭스·모형, 보고서·계획서, 아카이브·파인더, 대시보드·시간표, 커뮤니티·행사·연락망, 디자인 스튜디오, 전역 UX, 데이터·보안·룰즈.

## ✅ 이번에 수정·배포된 항목 (심각도순)

### Critical
| # | 위치 | 결함 | 조치 |
|---|---|---|---|
| C1 | firestore.rules (research_journal_articles) | `allow list: if true` — 비로그인 무필터 쿼리로 draft/private 논문 원문·심사 코멘트 전량 덤프 | list 를 read 와 동일 게이트로 재작성 + 클라이언트 목록 쿼리에 reviewStatus 서버 필터 추가(orderBy 제거로 인덱스 회피, JS 정렬). **룰즈 배포 완료** |

### High
| # | 위치 | 결함 | 조치 |
|---|---|---|---|
| H1 | WritingPaperEditor 저장 | 저장 중 타이핑분이 payload에 빠진 채 dirty=false — 무경고 유실 | dirty 세대 토큰: 저장 시작 이후 입력이 있으면 dirty 유지 + 안내 토스트 |
| H2 | WritingPaperEditor | SPA 내부 링크 이동 시 미저장분 무경고 소실(beforeunload 무력) | dirty 상태에서 내부 링크 클릭 capture 가로채기 + confirm |
| H3 | insertHypotheses | 가설 편집·삭제 후 재삽입 시 H번호 중복·꼬임 | 기존 `H#.` 문단을 새 목록으로 교체(sync) + 교체 confirm |
| H4 | 캐시 키 이원화 | `research_papers` vs `research-papers` 병존 — 매트릭스 편집·완독이 여정/대시보드에 미반영 | 전 소스 `research_papers` 로 통일, 뮤테이션 무효화 prefix 수렴 |
| H5 | research-model 페이지 | 저장 직후 dirty=false → effect 가 옛 캐시로 캔버스 롤백 | 1회 hydration ref + 저장 성공 시 setQueryData/invalidate (보고서·계획서 동기화 패널 stale 도 해소) |
| H6 | ModelWizard | 조절변인 y=-60 — 기본 뷰포트 밖(안 보임) | 전체 배치 +120 하향, 조절변인 y=30 |
| H7 | ResearchJourneyGuide | readOnly 미소비 — 콘솔 열람 중 클릭 시 내 마이페이지로 이탈 + 지도노트 rules 거부 에러 | readOnly 시 네비 no-op + feedback 쿼리 `enabled: !readOnly` |
| H8 | 보고서/계획서 에디터 | readOnly 우회(인터뷰 모드 진입 가능) + 실패에도 "임시 저장되었습니다" | readOnly 시 인터뷰 토글 숨김, handleSave boolean 반환·성공 시에만 토스트 |
| H9 | StudioEditor | Delete 키 stale closure — 잠금 직후 요소 삭제됨 | docRef(항상 최신)로 잠금 판정 |
| H10 | StudioEditor | 탭 간 무조건 last-writer-wins 덮어쓰기 | lastSavedAt 기준선 + 30초 스로틀 충돌 감지 → 저장 중단·배너 |
| H11 | upload.ts | 고밀도 PNG 재인코딩 후 용량 미검증 — 2장이면 저장 봉쇄 | dataURL 350KB 초과 시 JPEG 폴백(0.8→0.7) + 용량 가드를 바이트(TextEncoder) 기준으로 |
| H12 | CommentForm | 한글 IME 조합 중 Enter 로 멘션 오삽입 | isComposing/keyCode 229 가드 |
| H13 | methodFinder | 반복측정(1집단) 설계에서 공변량 질문 → ANCOVA(집단 비교) 오라우팅 | 공변량 질문을 집단 간 설계로 한정, 반복측정 경로 정규성 질문 유지 |
| H14 | DashboardCommandCenter | `startAt.slice(0,10)` UTC — KST 자정~9시 D-day/카운트 하루 오차 | isoToKstYmd/todayYmdKst 로 교체 |
| H15 | courses 페이지 | 1~2월에 존재하지 않는 "올해 2학기" 기본값 — 필터·수강계획 어긋남 | inferCurrentSemester 로 단일화 |
| H16 | DailyGrid/WeeklyGrid | 동시간대 일정이 서로를 완전히 가림 | 겹침 클러스터 레인 분할(computeLanes) — 폭 1/n 배치 |
| H17 | firestore.rules (received_business_cards) | 무필터 list 로 타인 명함(연락처) 전량 노출 | blanket list 삭제 (read 규칙 증명으로 위임) |
| H18 | firestore.rules (seminar_registrations) | 비스태프 호스트가 신청자 명단 조회 불가(rules 거부 반복) | hostUserIds 기반 호스트 read 분기 추가 |
| H19 | 전역 UX — 논문 에디터 탭 8개 | 모바일(375px)에서 한 줄 압착·라벨 잘림 | (백로그 → 이번엔 스티키 저장 바 전 탭 노출만; 탭 스크롤화는 UX-1 참조) |

### Medium (수정 완료분)
- 참고문헌 생성: await 이후 stale confirm 으로 입력 소실 가능 → confirm 선행 + 생성 중 textarea 잠금
- 혼합연구: 절차 프리셋 1회만 적용 가능 → mixed 는 프리셋 상시 노출
- 버전 스냅샷: 참고문헌·초록·연구문제·윤리·측정도구·절차 미포함 → payload 포함 + 구버전 스냅샷 선택 복원
- 계획서/보고서 listByUser 비결정적 [0] 선택 → updatedAt desc 정렬
- LiteratureMatrix: 실패 시 draft 소실·저장 중 옛 값 깜빡임·복사 경합 → 성공 시에만 draft 제거 + 낙관적 캐시 + 복사 시 draft 병합
- notifications rules: 전 회원 read → 본인/staff 로 축소
- networking_reviews rules: rating 1~5 정수 서버 강제
- api-auth: users 문서 없는 Auth 계정 통과 → 화이트리스트 거부
- 디렉토리 CSV 수식 인젝션(선행 =+-@) 중화
- insertTable: 절 없음 → 거짓 성공 토스트 → 선검사 + 에러 안내, 삽입 토스트 문구 분기
- 목차: 본문 표 참조 문장(`<표 Ⅳ-1>과 같이…`)이 표 목차에 수집 → 캡션 패턴 판별
- TableBuilder: 셀 내 `|` 가 열 구분 파괴 → 전각 치환
- 통계방법 목록: 미지 카테고리 문서 무음 드롭 → other 폴백
- research-finder combines 라벨 raw seedKey 노출 → RF_SEEDKEY_LABEL 폴백
- 통합 검색 글쓰기 팁 목록 링크 → 상세 딥링크
- 스티키 저장 바: 본문 탭 전용 → 초록·부록·참고문헌 탭 공통
- SECTION_GUIDES: 기본 절 "이론적 배경 N" 가이드 미매칭 → "이론적 배경" 키워드 추가
- ThesisJourney 5학기 "지도 노트" 링크 오연결(tab=thesis→tab=feedback)
- StudioEditor: 용량 가드 UTF-16 과소 측정 → 바이트 기준

### 오탐/확인 결과 문제없음
- 질적·혼합 연구방법 8종 draft 라우팅(High 보고) → **운영 DB 확인 결과 이미 전부 published** (시드 스크립트 상수만 보고 판단한 오탐)
- 파인더 seedKey↔slug 매핑 누락 0건, 로마자 배열 4곳 정합, 신규 필드 저장/로드 왕복 완전, 옵트인 명단 기본 비공개, 게시판 XSS 안전, cron 인증 견고

## 📋 백로그 (미수정 — 우선순위순)

**P1 (보안·구조)**
1. **users 컬렉션 `get: if true`** — 공개 QR 프로필이 의존하나, uid 만 알면 비로그인으로 전화·이메일 열람 가능. `public_profiles` 투영 컬렉션(이름·역할 등 비민감 필드만) 또는 서버 API 로 이전 필요. `list: isAuthenticated` 도 멘션 기능이 의존 — 같은 리팩터에서 함께 해소.
2. study_session_reflections blanket list — listByProgress/listByActivity(리더·회차 공유)가 의존해 룰만 조이면 기능 파손. isPrivate 서버 필터 API 로 이전 필요.
3. user_session_plans / collaborative_research 3종 blanket list — 동일 패턴, 쿼리 재설계 필요.
4. activity_participations 등 `read: if true` 3종 — users 투영 이후 함께 상향.
5. 게스트 RSVP public create 무검증(스팸·마감 후 제출) — 서버 API + rate-limit.
6. agent-server/.env 실키 로테이션 권고.

**P2 (신뢰성)**
7. 보고서 인터뷰 "자동 저장" 문구 허위 + 슬라이드 이동 자동저장 부재(계획서와 비일관), 완료 버튼 저장 미await.
8. 보고서→계획서 전체 form 덮어쓰기(last-write-wins) — diff-patch 또는 충돌 감지.
9. "모형으로 보내기"가 모형 전용 노드 삭제를 confirm 없이 수행 + 툴팁 문구 부정확.
10. 보고서 PaperSelector readOnly 미적용(로컬 편집 가능해 보임).
11. legacy 필드 영구 잔존 + 글자수 이중 계산(보고서), ResearchPaperDialog 필드 비우기 미영속(stripUndefined↔deleteField).
12. 윤리 문형 증분 삽입 중복, R5 표 재삽입 중복(교체 confirm), 접근 전환 시 α 데이터 은닉 안내.
13. 학사일정 UTC 진행도·breakEnd 미입력 시 phase 잔류·개강일 해제 no-op·리마인더 3/1 하드코딩·회고 프롬프트 UTC — KST/폴백 일괄 정비.
14. 스튜디오: 제목 편집 undo 오염, 멀티터치 pointerId, 모바일 텍스트 편집 진입, 용량 초과 시 편집 잠금/로컬 백업, conference kind 매핑.
15. 매트릭스↔여정 나머지 stale(무효화 후 즉시 반영 확인), savingId Set 화.

**UX-1 (일관성 배치 후보)**
- 논문 에디터 탭 8개 모바일 스크롤화(overflow-x-auto + shrink-0), tablist 시맨틱(aria-selected)
- 9px 폼 라벨 승격(11px), 터치 타깃 44px(히트영역 확장), 접이식 셰브런 패턴 통일(①ChevronRight rotate-90), native confirm → AlertDialog, 색상 시맨틱(가이드=amber) 재정렬, "섹션/절"·"목차/차례" 용어 통일
- 보고서/계획서에도 sticky 저장 바 공용화, 파인더 진행바 공식·포커스 관리, ?q= 딥링크 soft-nav 대응(useSearchParams), 파인더 로드 실패 안내, "장 요약" 헤딩 하이잭, unusedTemplates 유사 헤딩 중복 칩, 내보내기에 초록·부록 포함, 방학 안내 주간/월간 뷰 노출, 이모지 헤딩 정리

## 검증
- 타입체크: 변경 파일 24종 tsc 통과 (styled-jsx 기존 오탐 제외)
- 테스트: 36 파일 592건 전부 통과
- Firestore rules 배포 완료, 질적·혼합 8종 공개 상태 재확인(dry-run)
