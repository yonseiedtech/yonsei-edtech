# 교육공학 아카이브 고도화 — Codex Second Opinion

## TL;DR — 가장 큰 3가지 권장

1. **측정도구 컬렉션 명칭을 먼저 표준화한다.** 요청 범위와 도메인 명칭은 `archive_measurement_tools`에 가깝지만, 실제 구현은 `src/lib/bkend.ts`의 `archiveMeasurementsApi`와 `firestore.rules`에서 `archive_measurements`를 사용하고, URL은 `/archive/measurement`를 사용한다. 이 상태에서는 새 API·인덱스·문서·운영 가이드가 계속 다른 이름으로 증식할 가능성이 크다. 즉시 할 일: `archive_measurements`를 유지할지 `archive_measurement_tools`로 마이그레이션할지 결정하고, `src/types/edutech-archive.ts`, `src/lib/bkend.ts`, `firestore.rules`, `src/lib/archive-seed.ts`, `src/app/api/cron/archive-seed-sync/route.ts`에 컬렉션 명칭 표준을 명시한다.
2. **“발견성” 문제를 글로벌 검색 하나로만 보지 말고, 타입별 목록의 필터 UX를 공통화한다.** Claude는 8개 컬렉션 통합 검색을 P0로 봤고 동의한다. 다만 실제 코드를 보면 `src/app/archive/[type]/page.tsx`에는 검색·태그·즐겨찾기·정렬이 있지만, `src/app/archive/research-methods/page.tsx`, `src/app/archive/statistical-methods/page.tsx`, `src/app/archive/foundation-terms/page.tsx`에는 카테고리 그룹 표시만 있고 검색 입력이 없다. `src/app/archive/writing-tips/page.tsx`는 탭만 있다. 즉시 할 일: 먼저 공통 `ArchiveSearchBar`/`ArchiveFacetPanel`을 만들어 연구방법·통계방법·기초용어·글쓰기까지 동일한 검색/필터 경험을 적용하고, 그 다음 통합 검색으로 확장한다.
3. **공개 검수 게이트의 일관성을 정리한다.** `archive_research_methods`, `archive_statistical_methods`, `archive_foundation_terms`, `archive_writing_tips`는 `published` 기반 공개 게이트가 `firestore.rules`와 `src/lib/bkend.ts`의 `listPublished()`에 있다. 반면 `archive_concepts`, `archive_variables`, `archive_measurements`는 `firestore.rules`에서 `allow read: if true`이고 타입에도 `published`가 없다. 즉시 할 일: 세 컬렉션에 공개/검수 상태가 필요 없는 운영 정책인지 명문화하고, 필요하다면 `src/types/edutech-archive.ts`에 `published`, `curatedBy`를 추가해 7개 동적 컬렉션의 노출 정책을 맞춘다.

## 1. Claude 분석과의 차이·동의 포인트

Claude 리뷰(`docs/proposals/archive-enhancement-claude-review.md`)의 핵심인 **통합 검색 부재**, **양방향 매핑 비대칭 위험**, **`archive_concepts`와 `archive_foundation_terms` 경계 모호성**에는 대체로 동의한다. 실제로 `src/app/archive/page.tsx`는 8개 진입점을 카드형으로 제공하지만, `/archive` 전체에서 한 번에 검색하는 입력은 없다. 또한 `src/types/research-method.ts`의 `statisticalMethodIds`와 `src/types/statistical-method.ts`의 `relatedResearchMethodIds`는 수동 배열이며, `src/components/archive/ResearchMethodForm.tsx`와 `src/components/archive/StatisticalMethodForm.tsx`에서 양쪽 자동 동기화가 확인되지 않는다.

다만 Codex 관점에서 우선순위는 조금 다르다. Claude는 “글로벌 검색”을 가장 큰 P0로 보았지만, 현재 코드의 더 직접적인 리스크는 **동일 기능이 컬렉션별로 다른 수준으로 구현된 상태**다. `src/app/archive/[type]/page.tsx`는 검색·태그·정렬·즐겨찾기 필터를 이미 갖췄지만, `src/app/archive/research-methods/page.tsx`, `src/app/archive/statistical-methods/page.tsx`, `src/app/archive/foundation-terms/page.tsx`는 검색 없이 카테고리별 목록만 제공한다. 따라서 먼저 목록 UX 패턴을 공통화해야 통합 검색도 유지보수 가능하다.

두 번째 차이는 컬렉션 명명이다. Claude 문서는 8개 컬렉션 중 하나를 `archive_measurement_tools`로 표현하지만, 실제 코드에서 확인된 컬렉션은 `archive_measurements`다. 근거는 `src/lib/bkend.ts`의 `archiveMeasurementsApi`, `firestore.rules`의 `match /archive_measurements/{docId}`, `src/app/api/cron/archive-seed-sync/route.ts`의 `db.collection("archive_measurements")`다. 이는 단순 문서 용어 차이가 아니라 향후 Firestore 인덱스, 마이그레이션, 운영 콘솔 안내에서 혼선을 만들 수 있는 구조 이슈다.

세 번째 차이는 즐겨찾기 평가다. Claude는 “즐겨찾기 통합”을 P1로 적었지만, 실제 `archive_favorites` 컬렉션과 `archiveFavoritesApi`는 `ArchiveItemType = "concept" | "variable" | "measurement"`에만 묶여 있다. `src/types/edutech-archive.ts`와 `src/lib/bkend.ts` 기준으로 연구방법·통계방법·기초용어·글쓰기 팁은 관심 저장 대상이 아니다. 따라서 “모든 archive 타입 즐겨찾기 통합”은 단순 UI 확장이 아니라 타입 모델 확장 작업이다.

## 2. 구조·정보 아키텍처 이슈

`/archive` 랜딩의 그룹화는 이미 개선 방향이 반영되어 있다. `src/app/archive/page.tsx`는 “용어집 · 입문 가이드”와 “이론 · 연구 자료” 섹션을 나누고, `archive_foundation_terms`, `archive_concepts`, `archive_variables`, `archive_measurements`, `archive_research_methods`, `archive_statistical_methods`, `archive_writing_tips`, `/archive/apa-style`을 각각 진입점으로 둔다. 따라서 다음 개선은 카드 재배치가 아니라 **사용자 과업 기반 진입**이어야 한다. 예: “논문 주제를 정하는 중”은 `archive_concepts`와 `archive_variables`, “방법론을 정하는 중”은 `archive_research_methods`와 `archive_statistical_methods`, “문장 다듬는 중”은 `archive_writing_tips`와 `/archive/apa-style`로 묶는 짧은 과업 필터를 `src/app/archive/page.tsx` 상단에 추가한다.

`archive_concepts`와 `archive_foundation_terms`의 경계는 실제 타입에서 더 명확히 드러난다. `src/types/edutech-archive.ts`의 `ArchiveConcept`는 `name`, `description`, `altNames`, `variableIds` 중심이고, `src/types/foundation-term.ts`의 `FoundationTerm`은 `term`, `englishName`, `category`, `summary`, `definition`, `confusedWith`, `relatedConceptIds` 중심이다. 즉 구조상 `archive_foundation_terms`는 “용어 사전/혼동 방지”, `archive_concepts`는 “연구 구인/변인 연결”로 분리되어 있다. 즉시 할 일: `src/components/archive/FoundationTermForm.tsx`의 “관련 개념 (archive_concepts, 단방향)” 영역 옆에 운영자 안내 문구를 넣어 같은 항목을 중복 생성하지 말고 `relatedConceptIds`로 연결하도록 유도한다.

측정도구 명칭은 IA와 데이터 계층 양쪽에서 정리가 필요하다. URL 타입은 `ArchiveItemType`의 `"measurement"`이고, 라벨은 `ARCHIVE_ITEM_TYPE_LABELS.measurement = "측정도구"`이며, Firestore 컬렉션은 `archive_measurements`다. 사용자가 요구한 `archive_measurement_tools`와 실제 `ArchiveMeasurementTool` 타입명이 다르므로, `docs` 또는 운영 콘솔에서 “측정도구 컬렉션의 실제 Firestore 이름은 `archive_measurements`”라고 명시하지 않으면 후속 개발자가 잘못된 컬렉션을 만들 가능성이 있다.

APA 7판 페이지는 `/archive/apa-style` 정적 페이지로 구현되어 있고(`src/app/archive/apa-style/page.tsx`), Firestore 컬렉션이 아니다. 이 점은 랜딩에서 다른 7개 동적 컬렉션과 같은 카드로 노출될 때 운영 관점에서 혼동될 수 있다. 즉시 할 일: `/archive` 카드나 설명에 “정적 가이드” 배지를 추가해 `archive_writing_tips` 같은 관리형 콘텐츠와 구분한다.

## 3. UX·UI 개선

가장 먼저 목록 검색 경험을 맞춘다. `src/app/archive/[type]/page.tsx`는 이름·설명·태그 검색, 태그 AND 필터, 즐겨찾기만 보기, 정렬을 제공한다. 그러나 `src/app/archive/research-methods/page.tsx`, `src/app/archive/statistical-methods/page.tsx`, `src/app/archive/foundation-terms/page.tsx`에는 검색 입력이 없고, 사용자는 카테고리 그룹을 스크롤해야 한다. 즉시 할 일: 세 페이지에 공통 검색 입력을 추가하고 검색 대상은 각각 `name/summary/accessibleSummary/description`, `name/summary/whenToUse`, `term/englishName/summary/definition`으로 둔다.

`src/app/archive/writing-tips/page.tsx`는 탭으로 카테고리를 전환하지만, “피동”, “시제”, “인용” 같은 실제 문제 단어로 찾는 검색이 없다. `WritingTip` 타입에는 `tags`가 있으므로(`src/types/writing-tip.ts`), 탭 옆에 `title`, `wrongExample`, `correctExample`, `explanation`, `tags`를 대상으로 하는 검색 입력을 추가한다. 이 작업은 `archive_writing_tips` 컬렉션의 기존 필드를 그대로 사용하므로 데이터 마이그레이션 없이 가능하다.

상세 페이지의 긴 콘텐츠에는 목차가 필요하다. `src/app/archive/statistical-methods/[id]/page.tsx`는 쉽게 이해하기, 언제 사용하는가, 가정 테이블, 절차, 도구 구문, 해석 포인트, 대안 방법, 비교표, 연구방법, 졸업생 논문, 참고 자료까지 섹션이 많다. 모바일에서는 아래로 길게 내려가야 하므로, 섹션 존재 여부를 기준으로 생성되는 sticky 또는 접이식 목차를 추가한다. 같은 패턴은 `src/app/archive/research-methods/[id]/page.tsx`와 `src/app/archive/foundation-terms/[id]/page.tsx`에도 적용할 수 있다.

관리자 액션의 위치가 타입별로 다르다. 개념·변인·측정도구는 `src/app/archive/[type]/[id]/page.tsx`에서 `/archive/{type}/{id}/edit`로 이동하지만, 연구방법·통계방법·기초용어·글쓰기 팁은 `/console/archive/.../edit`로 이동한다. 즉시 할 일: 모든 공개 상세 페이지에서 “편집” 버튼은 콘솔 편집으로 통일하거나, 반대로 모든 타입에 공개 경로 편집을 제공한다. 현재처럼 섞이면 운영자가 어느 화면에서 어떤 권한 흐름을 타는지 예측하기 어렵다.

시각적 강조는 학습자에게 유용하지만 이모지와 색상 대비가 과하다. `src/app/archive/writing-tips/page.tsx`와 `[id]/page.tsx`는 ❌/✅를 텍스트 안에 직접 사용하고, `src/app/archive/foundation-terms/[id]/page.tsx`도 “📝 연구에서는 이렇게 쓰입니다”를 사용한다. 기능상 문제는 아니지만, 디자인 시스템 관점에서는 `lucide-react` 아이콘과 텍스트 라벨로 통일하면 접근성과 일관성이 좋아진다.

## 4. 데이터·연계 개선

개념→변인→측정도구 연결은 시드 경로에서는 양방향 보정이 잘 되어 있다. `src/lib/archive-seed.ts`와 `src/app/api/cron/archive-seed-sync/route.ts`는 `SEED_CONCEPT_VARIABLE_LINKS`, `SEED_VARIABLE_MEASUREMENT_LINKS`를 이용해 `variableIds`, `conceptIds`, `measurementIds`, `variableIds`를 상호 갱신한다. 그러나 운영자가 `src/components/archive/ArchiveItemForm.tsx`에서 개념·변인·측정도구를 편집할 때는 학위논문 연결(`alumni_theses`)만 동기화하고, 개념-변인-측정도구 관계 자체를 편집하는 UI가 없다. 즉시 할 일: `ArchiveItemForm`에 관련 개념/변인/측정도구 선택기를 추가하거나, 관계 전용 “연결 관리” 화면을 `/console/archive`에 둔다.

연구방법↔통계방법은 양방향 모델이 있지만 동기화 책임이 불분명하다. `src/types/research-method.ts`의 `statisticalMethodIds`와 `src/types/statistical-method.ts`의 `relatedResearchMethodIds`가 각각 존재하고, 상세 페이지들은 상대 컬렉션을 조회해 표시한다. 그러나 `src/components/archive/ResearchMethodForm.tsx`에서 통계방법을 고르면 `archive_research_methods`만 저장되고, `archive_statistical_methods`의 `relatedResearchMethodIds`를 갱신하는 코드가 보이지 않는다. 즉시 할 일: 저장 시 양쪽 갱신을 하거나, 상세 페이지에서 “내가 참조한 것 + 나를 참조한 것”을 합쳐 보여주는 역방향 조회 유틸을 만든다.

졸업생 논문 연계도 컬렉션별 방식이 다르다. `src/components/archive/ArchiveItemForm.tsx`는 `alumni_theses`의 `conceptIds`, `variableIds`, `measurementIds`를 실제로 양방향 동기화한다. 반면 연구방법·통계방법 폼은 `alumniThesisIds` 배열을 해당 아카이브 문서 안에 저장하는 방식이다(`src/types/research-method.ts`, `src/types/statistical-method.ts`). 즉시 할 일: 논문 상세(`src/app/alumni/thesis/[id]/page.tsx`)에서 이미 `researchMethodIds`, `statisticalMethodIds`를 링크로 보여주므로, `alumni_theses`를 중심으로 한 정규화 방향과 아카이브 문서 내 `alumniThesisIds` 방향 중 하나를 공식 소스로 정한다.

즐겨찾기는 현재 세 타입만 지원한다. `src/types/edutech-archive.ts`의 `ArchiveFavorite.itemType`은 `ArchiveItemType`에 종속되어 `concept`, `variable`, `measurement`만 허용한다. `/archive` 랜딩의 관심 저장 목록도 `/archive/${f.itemType}/${f.itemId}`로만 링크한다. 즉시 할 일: `ArchiveFavorite.itemType`을 `"concept" | "variable" | "measurement" | "research-method" | "statistical-method" | "foundation-term" | "writing-tip" | "apa-style"` 같은 별도 타입으로 분리하고, 정적 페이지인 `/archive/apa-style`은 `itemId` 없이 처리할지 정책을 정한다.

Firestore 인덱스에는 아카이브용 복합 인덱스가 없다(`firestore.indexes.json`). 현재 `listPublished()`는 `filter[published]`만 쓰고 클라이언트에서 정렬하므로 큰 문제는 아니지만, 검색·정렬·카테고리 필터를 서버 쿼리로 옮기면 `archive_statistical_methods`의 `published + category`, `archive_foundation_terms`의 `published + category`, `archive_writing_tips`의 `published + category` 인덱스가 필요할 수 있다. 이는 추정이므로, 실제 `dataApi.list`의 Firestore 쿼리 생성 방식을 확인한 뒤 인덱스를 추가한다.

## 5. 콘텐츠 운영

검수 상태가 있는 컬렉션과 없는 컬렉션을 운영 정책으로 분리해야 한다. `archive_research_methods`, `archive_statistical_methods`, `archive_foundation_terms`, `archive_writing_tips`는 `published`, `curatedBy`, `createdBy`를 갖는다. 반면 `archive_concepts`, `archive_variables`, `archive_measurements`는 `src/types/edutech-archive.ts` 기준 `published`가 없다. 즉시 할 일: “개념·변인·측정도구는 등록 즉시 공개”가 의도라면 `/console/archive`에 명시하고, 의도가 아니라면 세 타입에도 draft/published를 도입한다.

시드 데이터의 신뢰도 경고는 이미 좋다. `src/lib/archive-seed.ts` 상단에는 한국어 학술 인용의 할루시네이션 가능성과 RISS/국립중앙도서관 검증 필요성이 명시되어 있다. 다만 이 경고는 코드 주석이라 운영 콘솔 사용자에게 보이지 않을 수 있다. 즉시 할 일: `src/app/console/archive/page.tsx`의 “기본 시드 불러오기” 영역에 같은 경고를 노출하고, `refreshArchiveSeedReferences` 실행 전 확인 체크박스를 둔다.

자동 시드 cron은 중복 기준이 이름이다. `src/app/api/cron/archive-seed-sync/route.ts`의 `syncCollection`은 기존 문서의 `name`만 Set으로 모아 새 항목을 만든다. 이름 변경·띄어쓰기 변경·영문명 변경이 있으면 중복 생성될 수 있다. 즉시 할 일: `src/lib/archive-seed.ts`의 각 seed 항목에 안정적인 `seedKey`를 추가하고, Firestore 문서에 `seedKey`를 저장해 이름이 바뀌어도 같은 항목으로 갱신되게 한다.

운영 콘솔은 컬렉션별로 분리되어 있으나, 전체 검수 큐가 없다. `src/app/console/archive/page.tsx`는 개념·변인·측정도구 시드와 일부 관리 링크를 제공하고, `src/app/console/archive/research-methods/page.tsx`, `statistical-methods/page.tsx`, `foundation-terms/page.tsx`는 별도 목록이다. 즉시 할 일: `/console/archive`에 `published=false` 항목을 `archive_research_methods`, `archive_statistical_methods`, `archive_foundation_terms`, `archive_writing_tips`에서 모아 보여주는 “검수 대기” 섹션을 추가한다.

변경 이력은 현재 코드에서 확인되지 않는다. `dataApi.update`를 통해 문서가 덮어써지고, 별도 `archive_audit_logs` 같은 컬렉션은 검색되지 않았다. 이는 추정이 아니라 현재 확인 범위의 부재다. 즉시 할 일: 우선 `updatedBy`, `updatedAt`, `reviewedAt`, `reviewedBy`를 각 검수형 컬렉션에 추가하고, 이후 필요하면 `archive_audit_logs` 컬렉션으로 확장한다.

## 6. 추가하면 좋을 기능 (우선순위 표)

| 우선순위 | 기능 | 근거 파일·컬렉션 | 즉시 실행 단위 |
|---|---|---|---|
| P0 | 측정도구 컬렉션 명칭 표준화 | `archive_measurements`, `src/lib/bkend.ts`, `firestore.rules`, 요청 범위의 `archive_measurement_tools` | 표준명 결정 문서화 후 타입/API/rules/seed 주석 일괄 정리 |
| P0 | 타입별 목록 검색 공통화 | `src/app/archive/[type]/page.tsx`, `src/app/archive/research-methods/page.tsx`, `src/app/archive/statistical-methods/page.tsx`, `src/app/archive/foundation-terms/page.tsx`, `src/app/archive/writing-tips/page.tsx` | 공통 검색 컴포넌트와 `searchText` 유틸 추가 |
| P0 | 공개 게이트 정책 통일 | `archive_concepts`, `archive_variables`, `archive_measurements`, `archive_research_methods`, `archive_statistical_methods`, `archive_foundation_terms`, `archive_writing_tips` | `published` 도입 여부 결정 및 rules/API 반영 |
| P1 | 모든 아카이브 타입 즐겨찾기 | `archive_favorites`, `src/types/edutech-archive.ts`, `src/app/archive/page.tsx` | `ArchiveFavoriteItemType` 별도 정의 및 7개 동적 타입 지원 |
| P1 | 연구방법↔통계방법 역방향 표시 또는 자동 동기화 | `src/types/research-method.ts`, `src/types/statistical-method.ts`, `ResearchMethodForm.tsx`, `StatisticalMethodForm.tsx` | 저장 시 반대편 배열 갱신 또는 read-time 역참조 병합 |
| P1 | 상세 페이지 섹션 목차 | `src/app/archive/statistical-methods/[id]/page.tsx`, `research-methods/[id]/page.tsx`, `foundation-terms/[id]/page.tsx` | 존재하는 섹션 배열 기반 sticky/accordion 목차 |
| P1 | 검수 대기 통합 큐 | `src/app/console/archive/page.tsx`, `archive_research_methods`, `archive_statistical_methods`, `archive_foundation_terms`, `archive_writing_tips` | `published=false` 항목 집계 카드 추가 |
| P2 | seedKey 기반 시드 멱등성 | `src/lib/archive-seed.ts`, `src/app/api/cron/archive-seed-sync/route.ts` | seed 항목에 `seedKey` 추가 후 이름 대신 key로 upsert |
| P2 | 관계 전용 관리 화면 | `ArchiveItemForm.tsx`, `archive_concepts`, `archive_variables`, `archive_measurements` | 개념-변인-측정도구 연결만 편집하는 콘솔 화면 |
| P2 | APA 정적 가이드와 글쓰기 팁 연결 | `/archive/apa-style`, `archive_writing_tips` | APA 페이지 하단에 관련 writing tip 링크 수동 배열 또는 정적 매핑 |
| P3 | 관계 그래프 시각화 | `archive_concepts`, `archive_variables`, `archive_measurements`, `archive_research_methods`, `archive_statistical_methods` | 상세 페이지 하단에 1-hop 그래프부터 시작 |

## 7. 기술 부채 정리 (Claude 와 다른 추상화 제안 가능)

Claude는 `createArchiveCollectionApi(name)`, `ArchiveCRUDPage<T>`, `ArchiveDetailLayout` 같은 큰 추상화를 제안했다. Codex 관점에서는 바로 범용 CRUD 추상화로 가기보다, **검색·검수·관계 조회라는 작고 안정적인 축부터 추상화**하는 편이 낫다. 이유는 `ArchiveConcept`, `ResearchMethod`, `StatisticalMethod`, `FoundationTerm`, `WritingTip`의 필드 구조가 상당히 다르기 때문이다.

첫 번째 추상화는 `archiveRegistry`다. `src/types/edutech-archive.ts`의 세 타입 메타와 `src/app/archive/page.tsx`의 카드 메타, `src/lib/bkend.ts`의 API 객체가 따로 흩어져 있다. `archiveRegistry`에 `routeSegment`, `collectionName`, `label`, `kind`, `supportsPublished`, `supportsFavorite`, `searchFields`를 선언하면 `/archive`, 검색, 즐겨찾기, 콘솔 링크가 같은 기준을 공유할 수 있다. 이때 `/archive/apa-style`은 `kind: "static"`으로 분리한다.

두 번째 추상화는 `getPublishedArchiveItems`보다 `applyVisibilityGate`다. 현재 `listPublished()`가 있는 컬렉션도 있고 없는 컬렉션도 있다. `src/app/archive/research-methods/page.tsx`, `statistical-methods/page.tsx`, `foundation-terms/page.tsx`, `writing-tips/page.tsx`는 모두 `canManage ? list() : listPublished()` 패턴을 반복한다. `supportsPublished`가 true인 타입만 이 패턴을 적용하는 helper를 만들면 공개 정책이 한곳에 모인다.

세 번째 추상화는 `ArchiveRelationResolver`다. `src/app/archive/[type]/[id]/page.tsx`는 개념·변인·측정도구 관계를 직접 로드하고, `src/app/archive/research-methods/[id]/page.tsx`와 `statistical-methods/[id]/page.tsx`는 각자 `Promise.allSettled`로 상대 엔티티를 가져온다. 관계 조회는 UI보다 데이터 규칙이 중요하므로, “ID 배열을 받아 공개 게이트를 적용해 상대 문서를 반환”하는 유틸을 먼저 만들고, 그 다음 공통 UI를 붙인다.

네 번째 기술 부채는 클라이언트 과다 조회다. `src/app/archive/[type]/[id]/page.tsx`는 한 항목을 보여주기 위해 연결 대상 전체 목록을 가져온 뒤 클라이언트에서 필터링한다. `archiveConceptsApi.list()`, `archiveVariablesApi.list()`, `archiveMeasurementsApi.list()`가 각각 limit 500이라 지금은 괜찮지만, 데이터가 늘면 비용이 커진다. 즉시 할 일: ID 배열이 있을 때 `getMany` 형태를 추가하거나, Firestore `where documentId in [...]` 제약에 맞춰 10개 단위 배치 조회를 `dataApi`에 추가한다.

다섯 번째 부채는 콘솔과 공개 편집 흐름의 혼재다. `src/components/archive/ArchiveItemForm.tsx`는 공개 `/archive/{type}/new`와 `/archive/{type}/{id}/edit`에서 쓰이고, 다른 네 컬렉션은 `/console/archive/...`에서 폼을 쓴다. 권한은 `isAtLeast(user, "staff")`로 막지만, 정보 구조상 운영 기능이 공개 경로에 섞인다. 즉시 할 일: 개념·변인·측정도구도 `/console/archive/concepts`, `/console/archive/variables`, `/console/archive/measurements`로 옮기고, 공개 페이지에서는 보기·즐겨찾기만 남긴다.

## 8. 권장 로드맵

**Phase 0 — 1~2일: 명칭·정책 고정.** `archive_measurements` vs `archive_measurement_tools` 표준명을 결정하고, `src/lib/bkend.ts`, `firestore.rules`, `src/types/edutech-archive.ts`, `src/lib/archive-seed.ts`, `src/app/api/cron/archive-seed-sync/route.ts`에 같은 용어를 사용한다. 동시에 `archive_concepts`, `archive_variables`, `archive_measurements`에 `published`를 둘지 운영 정책을 확정한다.

**Phase 1 — 3~5일: 목록 발견성 개선.** `src/app/archive/[type]/page.tsx`의 검색·태그·정렬 패턴을 참고해 `archive_research_methods`, `archive_statistical_methods`, `archive_foundation_terms`, `archive_writing_tips` 목록에 검색을 추가한다. 이 단계에서는 서버 검색보다 클라이언트 필터로 시작해도 충분하다. 결과: 사용자는 “ANCOVA”, “신뢰도”, “피동” 같은 단어로 해당 목록 안에서 즉시 찾을 수 있다.

**Phase 2 — 1주: 관계와 즐겨찾기 확장.** `archive_favorites`의 `itemType`을 모든 아카이브 타입으로 확장하고, `src/app/archive/page.tsx`의 내 관심 저장 목록이 연구방법·통계방법·기초용어·글쓰기 팁까지 링크하도록 바꾼다. 이어서 연구방법↔통계방법의 양방향 동기화 또는 역방향 표시를 구현한다.

**Phase 3 — 1주: 운영 콘솔 정리.** `/console/archive`에 검수 대기 큐를 추가하고, 시드 데이터 검증 경고를 UI에 노출한다. 개념·변인·측정도구 편집 경로를 공개 `/archive/{type}/edit`에서 콘솔로 옮기는 계획을 세운다. 이 단계에서 `updatedBy`, `reviewedBy`, `reviewedAt` 같은 최소 운영 메타도 추가한다.

**Phase 4 — 1~2주: 통합 검색과 상세 목차.** 7개 동적 컬렉션과 `/archive/apa-style` 정적 페이지를 포함하는 `/archive` 통합 검색을 추가한다. 검색 결과는 타입 배지, 요약, 출처 컬렉션, 공개 상태를 함께 보여준다. 동시에 `src/app/archive/statistical-methods/[id]/page.tsx`, `research-methods/[id]/page.tsx`, `foundation-terms/[id]/page.tsx`에 섹션 목차를 넣어 긴 상세 페이지 탐색 비용을 줄인다.

**Phase 5 — 장기: 관계 그래프와 시드 품질 자동화.** `archive_concepts`→`archive_variables`→`archive_measurements`, `archive_research_methods`↔`archive_statistical_methods`, `archive_foundation_terms.relatedConceptIds`를 1-hop 그래프로 시각화한다. `src/lib/archive-seed.ts`에는 `seedKey`와 검증 상태 필드를 추가해 자동 시드가 이름 중복에 의존하지 않도록 바꾼다.
