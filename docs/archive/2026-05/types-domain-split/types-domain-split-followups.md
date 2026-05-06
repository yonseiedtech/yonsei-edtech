# types-domain-split 후속작업 트래킹

> **작성일**: 2026-05-06
> **상태**: 후속작업 트래킹 (별도 PDCA 진입 전)
> **참조**: [Plan](./types-domain-split.plan.md), [Report](../../04-report/types-domain-split.report.md)

---

## 1. 진행 완료

### ✅ FU-3: ESLint 회귀 방지 룰 추가
**Commit**: 본 변경 (eslint.config.mjs)

`src/types/*.ts` (단, `index.ts` 제외) 에 `no-restricted-imports` 룰 적용:
- `./index` 직접 import 금지
- `@/types`, `@/types/*` 우회 import 금지
- 도메인 sub 파일은 반드시 `./<domain>` 직접 경로만 허용

이유: 분리된 도메인이 `./index` 를 통해 자기 자신을 다시 import 하는 ESM circular re-export 회귀를 방지. 기존 코드는 이미 모두 `./<domain>` 직접 경로를 쓰므로 즉시 위반 없음 (안전망 역할).

---

## 2. 연기 (별도 sprint/PDCA 권장)

### ⏸ FU-1: v2/v3 legacy 마이그레이션 코드 정리
**현황**: 도메인 분해 시 모두 그대로 이동 (Plan §Q2-A 결정).

**연기 사유**: 마커가 단순 주석이 아니라 **실제 데이터 호환 코드와 결합**되어 있음.

| 위치 | 마커 | 결합 영역 |
|------|------|----------|
| `board.ts` | `"press"` legacy category, `_legacyCategory` | Firestore posts 컬렉션의 구 보도자료 글들이 여전히 `category: "press"` 로 저장됨 → 읽기 호환 유지 필요. 일괄 마이그레이션 스크립트 + 운영 점검 동반해야 함. |
| `seminar.ts` | Speaker `@deprecated` 단일 필드 (speaker, speakerBio 등) | `speakers[]` 배열로 전환됐으나 구 데이터(다중연사 도입 전)는 단일 필드를 참조 중. 전체 세미나 문서 마이그레이션 후 제거 가능. |
| `research-report.ts` | v2/v3 sprint 마커 (Sprint 57·58·66 등) | 문제 정의·이론 카드·measurement 트랙 — 모두 활성 필드. 마커는 sprint 도입 시점 문서화 용도이며 제거해도 무해하나 **데이터 마이그레이션과 한 번에** 묶어 처리하는 편이 안전. |
| `alumni.ts` | `(V2+)` (hasEmbedding) | 마일스톤 표기. 임베딩 DB 전환 완료 시 제거. |
| `steppingstone.ts` | `comprehensive_exam` (legacy key) | 트랙 키 union 멤버 — Firestore 문서에 그대로 사용 중. 키 변경 시 문서 마이그레이션 필요. |

**권장 진입 시점**:
- board "press" → 다음 운영 정리 sprint (DB 마이그레이션 포함)
- seminar Speaker 단일 필드 → 모든 세미나 문서가 `speakers[]` 사용으로 전환 확인 후 별도 PR
- research-report sprint 마커 → 자유롭게 제거 가능 (데이터 영향 없음, 가독성 chore PR 1건으로 묶기)

---

### ⏸ FU-2: 도메인별 zod 정합 테스트
**현황**: 현재 zod 사용은 `src/lib/api-validators.ts` (API 입력 검증) + `src/lib/ai-tools.ts` (AI tool 인자 검증) 2건만 존재. 도메인 타입과 zod 스키마는 별개로 관리됨.

**연기 사유**:
- 도메인 50+ 인터페이스 전부에 대해 zod 스키마 신규 작성 필요 → 추정 5h+
- 일부 도메인은 Firestore 문서로만 검증되며 (서버사이드 강타입), 입력 검증과 도메인 타입 정합은 **별도 layer**.
- 단위 테스트 인프라 (vitest)는 이미 마련됨 (`api-validators.test.ts`, `legal.test.ts`).

**권장 접근**:
1. 빈도 높은 도메인 우선 (User, Post, ResearchPaper, Seminar) — Firestore Adapter / API 라우트의 입력 검증에서 가치가 큼.
2. 각 도메인별 `<domain>.schema.ts` 작성 → `<domain>.test.ts` 에서 type↔schema 일치 (`z.infer<typeof X>` 가 도메인 타입과 동일해야 함) 검증.
3. 별도 PDCA `types-zod-schema` 로 진입 권장.

---

## 3. 정책 체크리스트

`/types/<domain>.ts` 신규 추가 시:

- [ ] `index.ts` 의 `export * from "./<domain>";` 추가 (단일 진입점 보존)
- [ ] 다른 도메인 의존 시 **반드시 `./<other-domain>` 직접 경로** import (`./index`, `@/types` 우회 금지 — ESLint 룰이 차단함)
- [ ] `import type { X }` 사용 (런타임 import 회피, ESM 순환 안전)
- [ ] `npx tsc --noEmit` + `npm run build` 통과 확인 후 commit
