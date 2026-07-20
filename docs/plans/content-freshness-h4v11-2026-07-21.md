# H4 콘텐츠 신선도 리뷰 루프 구현 — v11 백로그 (2026-07-20)

> 대상: yonsei-edtech (Next.js 16 + Firestore)  
> 트랙: D (신선도) · 계획서: docs/plans/service-enhancement-plan-v11-2026-07-21.md §H4

---

## 1. 문제 및 목표

아카이브 개념·변인·측정도구(3종)와 검수형 4종(연구방법·통계방법·기초용어·학술글쓰기)에
`updatedAt`은 있으나 "마지막 검토일·stale 임계·리뷰 큐"가 없어 운영진이 콘텐츠 노후를 인지할 수 없었음.
정적 가이드 페이지(apa-style·citation-guide·literature-review-guide 등)도 검토일 표기 없음.

**목표**: 신규 cron·컬렉션 없이 기존 `updatedAt` + 신규 `lastReviewedAt` 필드로
노후 감지 → 운영 리뷰 큐 표면화 → 검토 완료 시 타이머 초기화 루프 확보.

---

## 2. 구현 사항

### 2-1. 타입 확장 (`src/types/edutech-archive.ts`)

`ArchiveOperationalMeta`에 `lastReviewedAt?: string` 추가.
- 부재 시 `updatedAt` 기준으로 노후도 산정 (하위호환 유지)
- 검토 확인 시 갱신 → 재노후 타이머 초기화

### 2-2. 콘솔 아카이브 신선도 리뷰 섹션 (`src/app/console/archive/page.tsx`)

`FreshnessReviewSection` 컴포넌트 추가 (파일 내 로컬 컴포넌트):
- **노후 기준**: 180일(≈6개월) 이상 `updatedAt` 또는 `lastReviewedAt` 미갱신
- **대상 컬렉션 (7종)**:
  - 코어 3종(concept·variable·measurement): 부모의 이미 로드된 데이터 재사용
  - 검수형 4종(research-method·statistical-method·foundation-term·writing-tip): 자체 fetch (`researchMethodsApi.list()` 등)
- **표시**: 오래된 순 정렬, 주당 최대 10건 상한 (부담 관리)
- **"확인함" 액션**: 낙관적 UI 숨김 → `api.update(id, { lastReviewedAt: now })` → 성공 toast
  - 실패 시 상태 롤백
- **배치 배지**: 노후 건수 / "모두 최신" 상태 표시
- **편집 딥링크**: 각 항목에서 `/console/archive/{type}/{id}/edit` 바로 이동
- **신규 cron 없음**: 기존 API 재사용, 신규 컬렉션 없음

배치 위치: `ReviewTrendMiniSection` 이후, 시드 경고 이전.

### 2-3. 정적 가이드 최종 검토일 표기

| 파일 | 표기 | 버전 | 개정 이력 |
|---|---|---|---|
| `src/app/archive/apa-style/page.tsx` | 2026-07-20 | v1.1 | 2026-07-12 번역서 인용 형식 추가, 2026-01 최초 게시 |
| `src/app/archive/citation-guide/page.tsx` | 2026-07-20 | v1.2 | 2026-07-12 번역서 인용(재인용) 섹션 추가, 2026-01 최초 게시 |
| `src/app/archive/literature-review-guide/page.tsx` | 2026-07-20 | v1.0 | 2026-01 최초 게시 |

패턴: 가이드 disclaimer 바로 아래 `border-t` 구분선 + `CalendarCheck` 아이콘 + 검토일 + 버전 + 개정 이력.

---

## 3. 설계 원칙 준수

| 원칙 | 준수 내용 |
|---|---|
| 신규 cron 금지 | `FreshnessReviewSection`은 클라이언트 쿼리만 사용, cron 없음 |
| 신규 컬렉션 없음 | 기존 7개 컬렉션의 `updatedAt` 재사용, `lastReviewedAt`만 선택 추가 |
| 하위호환 | `lastReviewedAt` 부재 시 `updatedAt` 기준으로 폴백 |
| 자동 삭제·수정 없음 | 감지·큐 표시만, 판단·편집은 운영진 |
| 최소 diff | 기존 로드된 데이터(코어 3종) 재사용, API 중복 fetch 최소화 |

---

## 4. 향후 확장 (§3 데이터 대기 항목)

H4 배포 후 운영 피드백 ≈1개월 후:
- `updatedAt`/`lastReviewedAt` 분포 관찰 → 임계 조정 (현 180일 → 실운용 후 튜닝)
- 조회 신호(`visit-tracker`) 연계로 "조회 있음 + 오래된" 항목 우선 정렬
- 주간 cron 병합(adoption-snapshot)으로 노후 카운트 이력 집계

---

## 5. 수정 파일 목록

| 파일 | 변경 유형 |
|---|---|
| `src/types/edutech-archive.ts` | `lastReviewedAt` 필드 추가 |
| `src/app/console/archive/page.tsx` | `CalendarCheck` import + `FreshnessReviewSection` 컴포넌트 추가 |
| `src/app/archive/apa-style/page.tsx` | 최종 검토일 표기 추가 |
| `src/app/archive/citation-guide/page.tsx` | 최종 검토일 표기 추가 |
| `src/app/archive/literature-review-guide/page.tsx` | 최종 검토일 표기 추가 |
| `docs/plans/content-freshness-h4v11-2026-07-21.md` | 본 산출물 문서 |
