# H6 콘텐츠 갭 대시보드 + 시드 후보 자동 제안 — 구현 보고 (2026-07-20)

> v7 백로그 H6 구현. 계획 원문: `docs/plans/service-enhancement-plan-v7-2026-07-20.md` §3 High H6.
> H1(`SuggestedActionsSection`, `/console/insights`)과 역할 분리 — H6은 **콘솔 아카이브 하위 통합 작업 뷰**.

## 1. 산출물

| 파일 | 성격 | 내용 |
|---|---|---|
| `src/app/console/archive/content-gaps/page.tsx` | 신규 | 콘텐츠 갭 통합 뷰 + 1클릭 검수 큐 투입 (staff+) |
| `src/app/console/layout.tsx` | 수정(2줄) | 아카이브 그룹에 "콘텐츠 갭" 메뉴 추가(홈 다음), `PackageSearch` 아이콘 import |

## 2. H1과의 역할 분리 (중복 회피)

- **H1** = `/console/insights` 의 "제안된 운영 액션" 카드. 검색실패·퍼널·비활성 코호트를 규칙 판정해 **딥링크로 안내**(넛지 패널·아카이브). 실제 draft 를 만들지 않음.
- **H6** = `/console/archive/content-gaps`. 콘텐츠 갭 신호 4종을 **통합 집계**하고, 각 항목을 **직접 draft 로 검수 큐에 투입**(생성 액션). 콘솔 아카이브 하위에 위치.

## 3. 신호 소스 실측 표

| 블록 | 소스 | 실측 근거 | 채택 |
|---|---|---|---|
| (a) 검색 실패 Top | `search_misses` (count desc) | `SearchMissSection.tsx`·`SuggestedActionsSection.tsx` 동일 컬렉션 실사용. 필드 `query·count·lastAt` | **실재 → 구현** |
| (b) 미연결 개념 언급 (벤치 H4) | `concept-matching.ts` / `ConceptMentionsInMyRecords.tsx` | **순수 클라이언트 텍스트 매칭 유틸**(`findConceptMention`)로 per-user "내 기록 속 이 개념" 역참조 전용. 전역 영속 컬렉션·집계 소스 **부재** | **소스 없음 → 생략** (아래 §5) |
| (c) 세미나 우수 Q&A | `comm_boards`(contextType=`seminar`) + `comm_questions` | `types/comm-board.ts` — `CommContextType`에 `seminar` 존재. `CommQuestion.likeCount·answerCount·resolved·resolvedAnswerId` 실측 | **실재 → 구현** |
| (d) 졸업논문 미등록 변인/키워드 | `alumni_theses.analysis`(independent·dependent) + `keywords` vs 아카이브 사전 | `types/alumni.ts` — `ThesisAnalysisProfile{independent,dependent,subjects,...}`·`keywords[]` 실측. 아카이브 대조 = `archive_concepts.name/altNames`·`archive_variables.name/altNames`·`archive_foundation_terms.term/englishName/...` | **실재 → 구현** |

### 블록별 집계 로직 (실측 가능 범위)
- **(a)**: `search_misses` count 내림차순 상위 15건, `count >= 2` 필터.
- **(c)**: 세미나 보드 최대 25개 스캔 → 보드별 질문 조회(N+1, 읽기 비용 상한) → `resolved || likeCount>=1` 인 질문을 (채택·좋아요·답변수) 순 정렬, 상위 12건.
- **(d)**: 논문 최대 500편의 `analysis.independent + analysis.dependent + keywords` 를 정규화(소문자·공백 제거) 후 빈도 집계, 아카이브 3개 사전(개념·변인·기초용어)에 **없는** 용어만 빈도순 상위 15건. `subjects`(연구대상/모집단)는 "개념·변인" 대상이 아니므로 제외.

## 4. 투입 스키마 (기존 검수 큐 준수)

"검수 큐로 투입" → `foundationTermsApi.create(...)` 로 `archive_foundation_terms` 에 draft 생성:

```ts
{
  term: <프리필 이름>,          // (a) 질의 / (c) 질문 본문 50자 / (d) 후보 용어
  category: <기본 분류>,         // (a)(c) "learning-theory"(잠정) / (d) "variables"
  summary: <갭 신호 메모>,       // 출처·빈도 명시. 검수 큐 getSummary 가 이 값을 노출
  published: false,
  reviewStatus: "draft",         // ← 통합 검수 큐 pending 탭 집계 키
  contentGapSource: <신호>,      // provenance: search_miss | seminar_qna | thesis_unlinked
  contentGapNote: <갭 신호 메모>,
  createdBy: <user.id>,
  createdAt: <ISO>,
}
```

- **기존 스키마 준수 근거**: `review-queue/page.tsx` 는 4개 검수형 컬렉션을 `list()` 후 `resolveStatus(row)` 로 `reviewStatus === "draft"` 인 항목을 pending 탭에 자동 집계한다. `published:false + reviewStatus:"draft"` 만 맞추면 별도 배선 없이 큐에 나타난다.
- **사이드바 배지 동기화**: 투입 성공 시 `useInvalidateArchiveDraftBadge()` 호출 → 콘솔 사이드바 "아카이브 미검수" 배지·검수 큐 즉시 반영.
- **감사 로그**: `logAudit({ action:"콘텐츠 갭 시드 투입", category:"system", ... })`.
- **provenance 필드**(`contentGapSource`/`contentGapNote`)는 스키마 확장 필드. firestore.rules `archive_foundation_terms` create 는 `isAuthenticated() && isStaffOrAbove()` 만 요구(필드 제약 없음)하므로 추가 필드 저장에 문제 없음.
- **분류(category) 잠정 처리**: (a)(c)는 질의/질문에서 분류를 확정할 수 없어 `learning-theory` 로 잠정 세팅하고, summary 에 "검수 시 분류·정의 작성 필요"를 명시했다. (d)는 변인이 명확하므로 `variables`. 검수 큐 편집 화면에서 정정한다.

## 5. content-draft-generator cron 연계 (연계만 · 수정 금지)

`api/cron/content-draft-generator/route.ts` 는 **종료된 세미나 → `content_drafts`(카드뉴스·학회보)** 만 소비한다. 아카이브 term draft(`archive_foundation_terms`)를 소비하는 구조는 **없다**. 따라서 H6 시드 후보는 cron 이 아니라 **기존 통합 검수 큐(`ReviewQueueSection`)가 소비**하는 규약을 준수했다. cron 은 수정하지 않았다(규율 준수). 시드 후보의 실제 집필·발행은 §4 외부의존(운영진/기자).

## 6. 생략된 소스와 사유

- **(b) 미연결 개념 언급(벤치 H4)**: `concept-matching.ts`의 `findConceptMention`은 **개인 기록 텍스트에 대한 클라이언트 사이드 탐지 유틸**이고, `ConceptMentionsInMyRecords.tsx`는 로그인 사용자 본인 기록에서만 동작한다. 커뮤니티 전역의 "미연결 언급"을 집계·영속하는 Firestore 컬렉션이 존재하지 않아, 콘솔 통합 뷰에서 실측 집계할 소스가 없다. → **블록 생략**. UI 상단 안내 문구와 본 보고서에 사유를 명시했다.

## 7. 규율 준수

- **수정 금지 파일 미변경**: `SuggestedActionsSection`·`FunnelSection`·`SearchMissSection`(읽기 패턴만 참고, 파일 미수정), `console/archive/page.tsx`(미변경), cron 전체(미변경). 검수 큐 로직은 스키마만 준수(코드 미수정).
- **색상 부채 회귀 방지**: 신규 파일은 시맨틱 토큰만 사용(`bg-card`·`text-muted-foreground`·`text-primary`·`bg-primary/5` 등). raw color 미사용 → `eslint-rawcolor-baseline` 미추가.

## 8. 검증 결과

| 항목 | 명령 | 결과 |
|---|---|---|
| 타입체크(내 파일) | `npx tsc --noEmit` → `content-gaps`·`console/layout` 필터 | **0건** |
| 타입체크(전체) | `npx tsc --noEmit` | 사전존재 3건(`mypage/notifications/page.tsx`·`NotificationBell.tsx` — `NotificationType.newcomer_sequence` 라벨맵 누락, **타 트랙 M2 소관·내 변경 무관**) |
| 린트(내 파일) | `npx eslint <2 files>` | **exit 0** |
| 린트(전체) | `npx eslint src --quiet` | **exit 0** |

빌드·커밋은 규율에 따라 수행하지 않음.
