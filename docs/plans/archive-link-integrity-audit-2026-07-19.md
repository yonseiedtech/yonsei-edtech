# 아카이브 개념↔변인↔측정도구 연결관계 전수 정합 감사

- 작성일: 2026-07-19
- 범위: `archive_concepts` · `archive_variables` · `archive_measurements` 3축 크로스링크 정합성 (읽기 전용 감사, 코드 미수정)
- LIVE 데이터 출처: 공개 Firestore REST (`projects/yonsei-edtech`, 2026-07-19 조회, pageSize=300, nextPageToken 없음 = 전량)
- 결론 요약: **연결 데이터는 현재 완전 정합**(비대칭 0 · 고아 0 · 시드 누락 0). 단, 이 축은 write-time 양방향 가드도 read-time 병합 안전망도 없이 "시드/크론이 유일 writer"라는 우연에 의해 정합이 유지되고 있음 → 향후 편집 UI 추가 시 잠재 리스크.

---

## 1. 데이터 모델 실측

### 1.1 링크 저장 필드 (양방향 쌍 2개)
| 쌍 | Forward | Reverse |
|----|---------|---------|
| 개념 ↔ 변인 | `archive_concepts.variableIds` | `archive_variables.conceptIds` |
| 변인 ↔ 측정도구 | `archive_variables.measurementIds` | `archive_measurements.variableIds` |

- 타입 정의: `src/types/edutech-archive.ts` (`ArchiveConcept.variableIds`, `ArchiveVariable.conceptIds`/`measurementIds`, `ArchiveMeasurementTool.variableIds`). reverse 필드에 "역참조(denorm)" 주석 명시.
- 참고: `alumni_theses`의 `conceptIds`/`variableIds`/`measurementIds`(논문→아카이브)와 `CollabResearchMetaForm`의 `conceptIds`는 **별개 단방향 denorm**으로, 본 3축 크로스링크와 무관.

### 1.2 링크 writer (3경로 — 전부 양방향 저장)
1. **시드 임포터** `importArchiveSeed()` (`src/lib/archive-seed.ts:1937~2072`) — 콘솔 "기본 시드 불러오기" 버튼. `SEED_CONCEPT_VARIABLE_LINKS`·`SEED_VARIABLE_MEASUREMENT_LINKS`를 이름→ID로 해소해 forward 갱신 + accumulator로 reverse 필드까지 일괄 갱신(양방향).
2. **크론 동기화** `GET /api/cron/archive-seed-sync` (`route.ts:140~213`) — admin/server. 위와 동일 로직으로 forward+reverse 모두 `arrayUnion` 성격의 union 갱신(양방향). 상시 정합 유지 경로.
3. **편집 Form** `ArchiveItemForm.tsx` — **이 축 링크 필드를 아예 편집하지 않음**. state(`name`/`purifiedName`/`aectTerm`/`description`/`altNames`/`tags`/`references`/`variableType`/측정 메타)에 `variableIds`/`conceptIds`/`measurementIds` 없음, 저장 payload(`handleSave` 163~230)에도 없음. Form이 양방향 동기화하는 것은 오직 `alumni_theses` 링크(`syncTheses`)뿐.

### 1.3 핵심 판정 — "연구방법↔통계처럼 단방향 저장 문제"가 있는가?
- **없음.** 연구방법↔통계는 각 Form이 forward만 저장해 write-time 비대칭이 발생했고(H3), 이를 `archive-crosslink-sync.ts`(write-time)+`archive-reverse-link.ts`(read-time 병합)로 보정했다.
- 개념/변인/측정 축은 **Form이 링크를 편집하지 않으므로** 단방향 저장 버그가 원천적으로 발생하지 않는다. 대신 링크 관리를 시드/크론에만 의존하므로 **운영진이 콘솔 UI로 임의 링크를 추가·수정할 수 없다**(구조적 제약).

---

## 2. LIVE 데이터 정합 통계

전량: **개념 96 · 변인 27 · 측정도구 22**. 총 링크: 개념→변인 **75**, 변인→측정 **27**.

### 2.1 비대칭 · 고아 (핵심 표)
| 검사 항목 | 쌍1(개념↔변인) | 쌍2(변인↔측정) |
|-----------|:---:|:---:|
| ① 비대칭 A→B 존재 & B→A 역참조 없음 (forward 기준) | **0** | **0** |
| ① 비대칭 (reverse 기준) | **0** | **0** |
| ② 고아 참조(존재하지 않는 id 지목) forward | **0** | **0** |
| ② 고아 참조 reverse | **0** | **0** |
| ④ 시드 정의 링크가 LIVE에 누락 | **0** | **0** |
| 시드 이름 해소 실패(개념/변인/측정명 불일치) | **0** | **0** |

→ **양방향 완전 대칭. 고아 참조 0. 시드 100% 반영.** 현 시점 백필 불필요.

### 2.2 고립(링크 0) 항목
| 대상 | 고립 수 | 비고 |
|------|:---:|------|
| 개념 (variableIds 0개) | **60 / 96** | 대부분 이론·메타 개념(행동주의·구성주의·조작적 조건화·ADDIE·TPACK 등) — 시드가 의도적으로 변인 미매핑. 설계상 정상. |
| 변인 (개념·측정 모두 0) | **2 / 27** | `학습 흥미`, `지식 파지` — 완전 고립. |
| 측정도구 (variableIds 0개) | **0 / 22** | 모든 측정도구가 변인에 연결됨. |

### 2.3 "반쪽 연결" 변인 (그래프/흐름 서사에서 진입점 결손)
- **개념 역참조 0인 변인(측정만 연결)**: `비판적 사고`(→CCTDI), `창의성`(→TTCT), `학습 불안`(→TAI), `지식 파지`, `학습 흥미` (5개)
  → "개념→변인→측정도구" 흐름에서 **개념 진입점이 없어** 랜딩/그래프상 상위 노드와 단절.
- **측정도구 0인 변인**: `학업성취도`(성취도는 척도보다 시험점수 — 정당), `상호작용`, `문제해결력`, `지식 파지`, `학습 흥미` (5개)

### 2.4 시드 드리프트(부수 관찰)
- LIVE에는 `SEED_VARIABLE_MEASUREMENT_LINKS`에 **없는** 변인→측정 링크가 존재: `비판적 사고→CCTDI`, `창의성→TTCT`, `학습 불안→TAI`, `메타인지(변인)→MAI`, `컴퓨팅 사고력(변인)→CTt`.
  → 과거 시드 버전 또는 별도 경로로 적재된 것으로, union 특성상 재시드 시 보존되나 **현재 시드 맵이 LIVE의 완전한 정의가 아님**을 의미. 코드 시드는 add-only 소스이지 single source of truth 아님.

---

## 3. UI 표면 점검 (데이터 소비 방식)

| 화면 | 소비 필드 | 비대칭 노출 방식 |
|------|-----------|------------------|
| 상세 `/archive/[type]/[id]` (`page.tsx:80~145`) | 저장된 denorm 필드 **직접** 사용. 개념→`variableIds`(forward)→변인의 `measurementIds`로 전이 측정도구; 관련개념=변인 `conceptIds` 역참조 ∪ 태그. 변인→`conceptIds`/`measurementIds`. 측정→`variableIds`→개념 전이. | **read-time 역스캔 병합 없음.** 한쪽 필드가 비면 그쪽 상세 페이지에서 해당 관계가 통째로 누락됨. (research↔stat의 `archive-reverse-link.ts` 같은 안전망 부재) |
| 그래프 `/archive/graph` (`archive-graph-data.ts:156~198`) | 엣지를 **reverse 필드만**으로 생성: `variable.conceptIds`, `measurement.variableIds`. forward `concept.variableIds`는 미사용. | forward-only 비대칭이 생기면 **엣지가 조용히 누락**되어 그래프에서 사라짐. |
| 랜딩/개요 `EduTechOverview` 등 | 동일 denorm 필드 집계 | 비대칭 시 연결 개수 과소 표시 |

→ 현재는 완전 대칭이라 모든 화면이 온전히 렌더. 그러나 **이 축은 안전망이 전혀 없어**, 향후 비대칭이 발생하면 그래프는 무증상 엣지 소실, 상세는 한쪽 방향 관계 소실로 나타난다.

---

## 4. 개선 권고

### 4.1 (예방) write-time 가드 — 조건부, 우선순위 中
- 지금 당장은 불필요(Form이 링크 미편집). 단 **운영진 링크 편집 UI를 추가한다면**, 반드시 저장 시점 양방향 동기화를 함께 넣을 것. 기존 `archive-crosslink-sync.ts`의 `CrosslinkPair` 패턴을 그대로 확장 가능:
  - `CONCEPT_TO_VARIABLE = { self: archive_concepts/variableIds, target: archive_variables/conceptIds }`
  - `VARIABLE_TO_MEASUREMENT = { self: archive_variables/measurementIds, target: archive_measurements/variableIds }`
- 대안: 상세 페이지에 `archive-reverse-link.ts`식 read-time 병합 도입(그래프도 forward+reverse 합집합으로 엣지 생성). 방어적 안전망.

### 4.2 (안전망) 백필 라우트 확장 — 우선순위 中
- 현 `POST /api/admin/archive-crosslink-backfill`는 연구방법↔통계 전용. 동일한 **무방향 union·비파괴** 로직을 개념↔변인, 변인↔측정 2쌍에도 추가하면, 향후 어떤 경로로 비대칭이 생겨도 1회 실행으로 정합화 가능. (현재 dry-run 결과는 0건이 될 것 — 유지보수용 상비 도구로 가치.)

### 4.3 (콘텐츠) 고립·반쪽 항목 링크 보강 — 도메인 제안 상위 10건
모든 끝점이 **이미 LIVE에 존재**하는 개념·변인이라 시드 맵 2줄 추가로 반영 가능(코드 변경은 사용자 승인 후 별건).

개념→변인 (반쪽/고립 변인에 개념 진입점 부여):
1. `문제 기반 학습` → `비판적 사고`  (측정 CCTDI 이미 연결 → 흐름 완성)
2. `탐구 기반 학습` → `비판적 사고`
3. `발견학습` → `창의성`  (측정 TTCT 이미 연결 → 흐름 완성)
4. `프로젝트 기반 학습` → `창의성`
5. `디지털 게임 기반 학습` → `학습 흥미`  (완전 고립 해소)
6. `게이미피케이션` → `학습 흥미`
7. `정보처리이론` → `지식 파지`  (완전 고립 해소)
8. `기억술` → `지식 파지`
9. `원격교육`(또는 `테크놀로지 수용`) → `학습 불안`  (측정 TAI 이미 연결 → 흐름 완성)

메타 개념 60개 중 경험적 변인이 자연스러운 것 일부 연결(선택):
10. `피드백` → `학업성취도`, `완전학습` → `학업성취도`, `시뮬레이션` → `학습몰입`, `개별화 수업` → `학업성취도`

신규 측정도구가 필요해 이번 범위 밖(제안만): `문제해결력`·`상호작용`용 척도(문제해결력 검사, 상호작용 분석/사회연결망) 신설 시 해당 변인 M=0 해소.

---

## 5. 종합 판정
- **정합성: 통과(A).** 96/27/22 전량에서 비대칭·고아·시드누락 전부 0.
- **구조적 취약점: 中.** write-time 가드·read-time 병합이 둘 다 없고, 그래프는 reverse 필드 단일 의존 → 편집 UI 도입 시 무증상 소실 위험. §4.1/§4.2 예방 조치 권고.
- **콘텐츠 완성도: 中.** 완전 고립 변인 2개·반쪽 연결 변인 5개가 "개념→변인→측정" 서사의 진입점을 결손 → §4.3 링크 10건으로 대부분 해소 가능.
