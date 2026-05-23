# 교육공학 아카이브 — 컬렉션명 표준 & 공개 정책

> 본 문서는 `/archive` 도메인에서 사용하는 **Firestore 컬렉션명**, **URL 경로**, **UI 라벨**, **공개(검수) 정책**의 단일 출처(SoT)다.
> 새 컬렉션 추가·이름 변경·문서/주석 작성 시 이 매트릭스를 우선 참조한다.

## 1. 컬렉션명 매트릭스 (8개)

| Firestore 컬렉션명 | URL 경로 | UI 라벨 | 종류 | 공개 정책 |
|---|---|---|---|---|
| `archive_concepts` | `/archive/concept` | 개념 | 동적 (Firestore) | **상시 공개** (published 없음) |
| `archive_variables` | `/archive/variable` | 변인 | 동적 (Firestore) | **상시 공개** (published 없음) |
| `archive_measurements` | `/archive/measurement` | 측정도구 | 동적 (Firestore) | **상시 공개** (published 없음) |
| `archive_research_methods` | `/archive/research-methods` | 연구방법 | 동적 (Firestore) | **검수형** (`published` 게이트) |
| `archive_statistical_methods` | `/archive/statistical-methods` | 통계방법 | 동적 (Firestore) | **검수형** (`published` 게이트) |
| `archive_foundation_terms` | `/archive/foundation-terms` | 기초 용어 | 동적 (Firestore) | **검수형** (`published` 게이트) |
| `archive_writing_tips` | `/archive/writing-tips` | 학술 글쓰기 | 동적 (Firestore) | **검수형** (`published` 게이트) |
| — (정적 페이지) | `/archive/apa-style` | APA 7판 | 정적 (코드) | **상시 공개** (코드 변경으로만 갱신) |

### 명명 일관성 메모
- 사용자 요청·일부 문서 초안에서는 `archive_measurement_tools`라는 이름이 등장하지만, **실제 코드 표준은 `archive_measurements`** 다. (근거: `src/lib/bkend.ts`의 `archiveMeasurementsApi`, `firestore.rules`의 `match /archive_measurements/{docId}`, `src/app/api/cron/archive-seed-sync/route.ts`의 `db.collection("archive_measurements")`.)
- 마이그레이션 비용(인덱스·룰·API·시드·즐겨찾기 denorm)을 회피하기 위해 `archive_measurements`를 유지한다.
- TS 타입은 `ArchiveMeasurementTool`(단수형, 도메인 친화) 그대로 두고, **Firestore 컬렉션·rules·API·URL·라벨만 표준명**을 따른다.

## 2. 공개(검수) 정책

### 2-A. 상시 공개 (published 미사용)
- `archive_concepts`, `archive_variables`, `archive_measurements`
- `firestore.rules`: `allow read: if true`
- 타입 정의(`src/types/edutech-archive.ts`)에 `published` 필드 없음
- **운영 원칙**: 등록 즉시 공개됨. 운영자(staff+)는 신뢰할 수 있는 시드·검증된 데이터만 등록한다.
- 마이그레이션 비용(타입·rules·API·시드 동시 변경)을 회피하기 위해 의도적으로 `published`를 도입하지 않는다.

### 2-B. 검수형 (published 게이트)
- `archive_research_methods`, `archive_statistical_methods`, `archive_foundation_terms`, `archive_writing_tips`
- `firestore.rules`: `allow read: if isAuthed() && (resource.data.published == true || isAtLeastStaff());`
- 타입에 `published: boolean`, `curatedBy?: string` 보유
- API 객체에 `listPublished()` 헬퍼 제공 (`src/lib/bkend.ts`)
- **운영 원칙**: `published=false`(draft)로 작성 후 운영진(staff+)이 검수 → `published=true`로 공개

### 2-C. 정적 가이드
- `/archive/apa-style` — Firestore 컬렉션 없음, 코드(`src/app/archive/apa-style/page.tsx`)로만 갱신
- 검수 큐·즐겨찾기·통합 검색 대상에서 별도 취급한다 (`kind: "static"` 권장)

## 3. 운영자 / 개발자 안내

### 운영자 (staff+)
- **개념·변인·측정도구**: 입력 직후 모든 회원에게 노출된다. 출처(KCI/RISS) 검증 후 등록한다.
- **연구방법·통계방법·기초 용어·학술 글쓰기**: draft로 저장한 뒤 검수 → publish 한다.
- `/console/archive` 랜딩에 위 정책이 안내 박스로 표시된다.

### 개발자
- 새 아카이브 컬렉션 추가 시:
  1. 본 문서에 매트릭스 행 추가
  2. `archive_*` 접두어 사용
  3. 검수형이면 `published`/`curatedBy` 필수, 상시 공개이면 명시적으로 결정 문서화
  4. URL 경로는 카멜케이스가 아닌 케밥케이스(`research-methods`) 또는 단수형(`concept`) 중 기존 규약을 따른다
- 컬렉션명 변경(마이그레이션)이 필요한 경우:
  - `src/lib/bkend.ts`, `firestore.rules`, `firestore.indexes.json`, `src/lib/archive-seed.ts`, `src/app/api/cron/archive-seed-sync/route.ts`, 본 문서를 **동시 갱신**한다.
  - 기존 데이터는 백필 스크립트(`scripts/migrate-archive-*.ts`) 작성 후 prod 적용 — 본 작업은 별도 PR.

## 4. 졸업생 학위논문(`alumni_theses`) ↔ 아카이브 동기화 정책

> Phase 2 작업 범위에서는 단방향 chip 만 유지한다. 양방향 자동 동기화는 추후 Phase 3 검수 큐와 함께 보강 예정.

### 현재 상태 (2026-05-23 기준)
- `archive_concepts` / `archive_variables` / `archive_measurements` ↔ `alumni_theses`
  - `ArchiveItemForm` 이 저장 시 양쪽(`conceptIds`/`variableIds`/`measurementIds`) 모두 동기화.
- `archive_research_methods` / `archive_statistical_methods` ↔ `alumni_theses`
  - 아카이브 문서 안의 `alumniThesisIds` 배열로 단방향 매핑.
  - `alumni_theses` 의 `researchMethodIds`/`statisticalMethodIds` 와의 양방향 자동 동기화는 **미구현**.
  - 운영자가 양쪽을 모두 관리해야 일관성이 유지된다 (수동 큐레이션 정책).
- `archive_foundation_terms` 의 `relatedConceptIds` / `relatedResearchMethodIds` / `relatedStatisticalMethodIds`
  - 단방향 chip. 상대 컬렉션은 갱신되지 않는다.

### 정책 결정 (Phase 2)
- **단방향 chip 은 운영자 수동 큐레이션 정책으로 유지**한다.
- 양방향 자동 동기화는 검수 큐(Phase 3)와 함께 일괄 정리한다 (`updatedBy`·`reviewedAt` 메타 추가 시점).
- 연구방법 ↔ 통계방법은 **read-time 역방향 병합** 으로 우선 해결 (저장은 단방향, 표시는 양방향).
  - 헬퍼: `src/lib/archive-reverse-link.ts` — `findStatMethodsLinkingToResearch`, `findResearchMethodsLinkingToStat`, `mergeById`.
  - 적용 위치: `src/app/archive/research-methods/[id]/page.tsx`, `src/app/archive/statistical-methods/[id]/page.tsx`.
  - 검수 게이트는 forward·reverse 모두 동일하게 적용한다 (`canManage` 면 draft 도, 아니면 published 만).

## 5. 변경 이력
- 2026-05-23 — 최초 작성. `archive_measurements` 표준명 유지 결정, 3개 컬렉션 상시 공개 정책 명문화. (Phase 0)
- 2026-05-23 — Phase 2: 졸업생 학위논문 ↔ 아카이브 단방향 chip 정책 명문화. 연구방법 ↔ 통계방법 read-time 역방향 병합 도입 (`archive-reverse-link.ts`).
