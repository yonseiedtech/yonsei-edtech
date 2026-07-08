# G3 — 포트폴리오 자동 적재 + 내보내기 구현 리포트

**대상 백로그:** `docs/plans/service-enhancement-plan-v3-2026-06-16.md` High **G3**
**작성:** 2026-07-08 / executor

## 1. 요약

회원이 쌓아온 활동 신호(세미나 발표·대표 논문)를 **자동 수집**해 후보 목록으로 보여주고,
회원이 선택한 항목을 기존 `external_activities`(대외활동) 포트폴리오로 **멱등 적재**하는 기능을 추가했다.
내보내기(PDF)는 이미 존재하는 `/api/profile/[id]/certificate` + `ProfileCertificatePdfDocument`
+ `ProfileCertificateDownloadButton` 파이프라인이 완비되어 있어 **재사용**했다(신규 구현 없음).

기존에 완료돼 있던 G3 자동 집계(연구 진행도·진단 준비도·수료증·학습 잔디 → PDF 통계 카드)는
그대로 두고, 이번에 **누락돼 있던 "수집→미리보기→선택 적재" 입력 흐름**만 채웠다.

## 2. 변경 파일

| 파일 | 종류 | 내용 |
|---|---|---|
| `src/types/portfolio.ts` | 수정 | `ExternalActivity`에 `autoSourceRef?: string` 추가 — 자동 적재 멱등 키 |
| `src/lib/portfolio-autofill.ts` | 신규 | 순수 정규화·중복제거 함수(`buildPortfolioCandidates`, `candidateToExternalPayload`) |
| `src/components/profile/PortfolioAutofillDialog.tsx` | 신규 | "내 활동 자동 불러오기" 다이얼로그(체크박스 미리보기 → 일괄 적재) |
| `src/app/mypage/portfolio/page.tsx` | 수정 | 헤더에 자동 불러오기 버튼 배치, 적재분 로컬 상태 반영 |

기존 재사용(변경 없음): `src/features/profile/ProfileCertificatePdfDocument.tsx`,
`src/features/profile/portfolio-aggregate.ts`, `src/app/api/profile/[id]/certificate/route.tsx`,
`src/components/profile/ProfileCertificateDownloadButton.tsx`.

## 3. 수집 소스 매핑표

| 소스 | 조회 | 대상 컬렉션 | type | role | 날짜 | 출처 링크 | sourceRef(멱등키) |
|---|---|---|---|---|---|---|---|
| 세미나 발표 | `seminarsApi.list` → `isSeminarHost(userId)` 필터 | `external_activities` | `conference` | 발표자 | `seminar.date` | `/seminars/{id}` | `seminar:{id}` |
| 연구 논문(대표) | `user.recentPapers` | `external_activities` | `publication` | 저자 | `{year}-01-01` | `paper.url` | `paper:{정규화제목}` |

- 대상 컬렉션을 `external_activities` 하나로 통일한 이유: 후보 스키마(유형·제목·역할·날짜·출처링크·검증)가
  `ExternalActivity` 필드와 정확히 일치하고, 운영진 검증 큐(`/console/portfolio-verification`)를
  그대로 재사용할 수 있어 신규 컬렉션·신규 rules가 필요 없다.
- 적재 항목은 `verified:false`로 생성 — 수동 등록과 동일하게 운영진 검증 후 정식 표기(과대표기 방지).

### 후보에서 제외한 소스(의도적)

| 소스 | 제외 사유 |
|---|---|
| 활동 참여 이력(`activity_participations`) | 세미나 체크인·참여 확정 시 이미 `recordAuto`로 자동 적재되고 PDF 1·2섹션에 표시됨(중복 방지) |
| 수료증(`certificates`) | 이미 PDF "연구·활동 요약" 통계 카드로 집계 노출. 라인아이템화하면 이중 표기 + `certificatesApi`(비-포트폴리오 API) 신규 조회 필요 → 제약상 보류 |
| 심사 연습(`defense_practice_sets`) | 대외 제출용 성취가 아닌 내부 준비 자료 — 포트폴리오 라인아이템 부적합 |

## 4. 중복 제거(멱등) 규칙

`buildPortfolioCandidates`는 기존 `external_activities`로 인덱스를 만들어 각 후보에 `alreadyAdded`를 계산한다.

1. **1차(출처 id):** 기존 항목의 `autoSourceRef`와 후보 `sourceRef`가 일치하면 `alreadyAdded=true`.
   → 자동 불러오기를 여러 번 눌러도 같은 소스가 재적재되지 않음(멱등).
2. **2차(제목+날짜):** 정규화 제목(`trim`·공백단일화·소문자) + `YYYY-MM-DD`가 동일한 기존 항목이 있으면
   `alreadyAdded=true`. → 수동으로 먼저 등록한 항목과의 충돌 방지.

`alreadyAdded=true` 후보는 UI에서 "추가됨" 배지 + 체크박스 비활성으로 표시되어 선택 자체가 불가능하다.
적재 페이로드는 `undefined` 필드를 생략해 Firestore write에 `undefined`가 들어가지 않게 한다.

## 5. UI 흐름

1. `/mypage/portfolio` 헤더의 **"내 활동 자동 불러오기"** 버튼 → 다이얼로그 오픈.
2. 세미나 목록 조회 + 대표 논문 + 기존 대외활동으로 후보 계산 → 소스별 라벨·체크박스 목록 표시.
   미적재 항목은 기본 선택, 이미 적재분은 "추가됨"으로 잠금.
3. **"선택 N건 적재"** → 각 후보를 `external_activities`로 생성, 부모 목록(`externals` state)에 반영,
   토스트 안내 후 닫기. 목록의 적재분은 즉시 "추가됨"으로 갱신.

## 6. firestore.rules 제안 (수정하지 않음)

`awards`/`external_activities`/`content_creations` 규칙은 **필드 셋 검증(`hasOnly`)이 없고 `userId`
소유권만 확인**하므로, `autoSourceRef` 신규 필드 추가에 **rules 변경이 불필요**하다(현행 규칙과 호환).

참고 — 기존 `external_activities` update 규칙은 `request.resource.data.verificationStatus`를 참조하나
타입/데이터는 `verified` 필드를 사용한다(기존 불일치). 이번 기능은 **create만** 수행하므로 영향 없음.
차후 정리 시 `verificationStatus` → `verified`로 규칙을 맞추는 것을 별도 제안한다(본 과업 범위 밖, 미수정).

## 7. 후속 고려(범위 밖)

- 대표 논문(`recentPapers`)은 PDF 6섹션에도 표시되므로, 적재 시 PDF에서 4섹션(대외활동)·6섹션(연구활동)에
  동시 노출될 수 있다. 프로필 카드 노출 가치가 있어 허용했으나, 원치 않으면 PDF에서 `autoSourceRef`가 있는
  `publication` 항목을 6섹션과 중복 제거하는 후처리를 추가할 수 있다.
- 수료증·활동 리드 이력을 라인아이템으로 추가하려면 `certificatesApi.listByRecipient` 등 조회 API 신설이 필요.
