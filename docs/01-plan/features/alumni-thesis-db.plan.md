# alumni-thesis-db

> Track 4 of `site-enhancement-master-plan-v2.md` — 졸업생 학위논문 DB + 매칭 추천

## 시드 데이터

`연세대_교육공학과_학위논문_134건.csv` (사용자 제공, 2026-04-18)

| 컬럼 | 매핑 필드 | 비고 |
|---|---|---|
| 번호 | (사용 안 함) | autoId 사용 |
| 학위수여년월 | `awardedYearMonth` (`YYYY-MM`) | 원본 "2000. 8" → "2000-08" 정규화 |
| 논문저자 | `authorName` | 매칭 회원 ID는 별도 컬럼 |
| 논문제목 | `title` | 한국어 + 영문 부제 합본 가능 |
| 지도교수 | `advisorName` | 18건 누락 — 운영진 보강 큐 |
| 주제(키워드) | `keywords` | "/" 구분 자유 텍스트 → 배열 normalize, 17건 누락 |
| 실제URI | `dcollectionUrl` | dCollection 직링크 |
| 초록/요약 | `abstract` | 키워드 추출·임베딩 소스 |
| 목차 | `toc` | 향후 섹션별 검색용 |

134건 일괄 적재용 마이그레이션 스크립트: `scripts/import-thesis-csv.ts` (Node + papaparse + bkend client).

## 데이터 모델

```ts
export type GraduationType = "thesis" | "research_report";

export const GRADUATION_TYPE_LABELS: Record<GraduationType, string> = {
  thesis: "논문",
  research_report: "연구보고서",
};

/** 학위논문/연구보고서 메타데이터 — 회원 미매핑 상태로도 적재 가능 */
export interface AlumniThesis {
  id: string;
  /** 졸업유형 — 논문 졸업 vs 연구보고서 졸업 */
  graduationType: GraduationType;
  /** 학위수여년월 YYYY-MM */
  awardedYearMonth: string;
  authorName: string;
  /** 회원 매핑 — 운영진 검증 후 채워짐 (동명이인 위험으로 자동 매핑 X) */
  authorUserId?: string;
  authorMappingStatus: "unmapped" | "candidate" | "verified" | "ambiguous";
  authorMappingCandidates?: string[]; // 후보 userId
  title: string;
  titleEn?: string;
  advisorName?: string;
  /** 학회 회원으로 매핑된 지도교수 ID (선택) */
  advisorUserId?: string;
  keywords: string[];
  /** 한국어 자유 텍스트 (이/조사 포함) — 검색용으로 normalize 별도 필드 */
  keywordsRaw?: string;
  abstract?: string;
  toc?: string;
  dcollectionUrl?: string;
  /** PDF 직접 링크 (있을 때) */
  pdfUrl?: string;
  /** 시드 출처 — 일괄 import 추적 */
  source: "csv_seed_2026_04" | "manual" | "self_claim";
  /** 후순위 PDF 파싱·임베딩이 끝난 항목인지 */
  hasReferenceList: boolean;
  referenceCount?: number;
  hasEmbedding: boolean;
  createdAt: string;
  updatedAt: string;
}

/** 학위논문에서 추출한 참고문헌 1건 (V1.5+) */
export interface ThesisReference {
  id: string;
  thesisId: string;
  rawCitation: string;
  doi?: string;
  /** Crossref/OpenAlex 정규화 후 채움 */
  normalizedTitle?: string;
  normalizedAuthors?: string[];
  year?: number;
  source: "manual" | "grobid" | "crossref" | "openalex";
  createdAt: string;
}

/** 본인이 "이거 내 논문이다" 라고 클레임한 기록 — 운영진 검증 큐 */
export interface ThesisClaim {
  id: string;
  thesisId: string;
  userId: string;
  status: "pending" | "approved" | "rejected";
  evidence?: string;
  createdAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
  rejectionReason?: string;
}
```

## Firestore 컬렉션 + 인덱스

| 컬렉션 | 인덱스 |
|---|---|
| `alumni_theses` | `authorMappingStatus`, `awardedYearMonth`, `advisorName`, `keywords` (array-contains) |
| `thesis_references` | `thesisId`, `doi` |
| `thesis_claims` | `status`, `userId`, `thesisId` |

## V1 (1주) — 적재 + 검색

- [ ] 타입 추가 (`src/types/index.ts`)
- [ ] `scripts/import-thesis-csv.ts`: papaparse → 정규화 → bkend `alumni_theses` create. dry-run 옵션.
- [ ] `/alumni/thesis` 페이지 — 검색(키워드/저자/지도교수/연도), 카드 그리드, dCollection 외부 링크
- [ ] `/alumni/thesis/[id]` 상세 — 초록·키워드·매칭된 회원(있으면)·같은 지도교수 논문
- [ ] `/console/alumni-mapping` — 미매핑 저자 큐, 후보 회원 자동 추천 (이름 일치) + 수동 매핑/모호 표시
- [ ] firestore.rules: 읽기 공개 / 쓰기 staff 전용

## V1.5 (1주) — Self-claim + 추천

- [ ] 회원 마이페이지에서 "내 학위논문 클레임" → `thesis_claims` 생성
- [ ] 운영진 검증 콘솔
- [ ] 개인 상세 페이지의 "연구활동" 섹션에 매핑된 졸업논문 자동 표시
- [ ] 키워드 자카드 매칭 추천 (재학생 관심 키워드 ↔ 논문 키워드)
- [ ] 같은 지도교수·같은 연도·관련 키워드 사이드바

## V2 (3주) — 임베딩 + 참고문헌

- [ ] Cloud Run에 Grobid 배포 (또는 운영진이 PDF 업로드 → 비동기 큐)
- [ ] 초록 임베딩 (Cohere multilingual / OpenAI text-embedding-3-small / KR-SBERT 중 선택, 비용 검토)
- [ ] Pinecone Free 또는 Firestore vector 인덱스
- [ ] 참고문헌 정규화: Crossref API → `thesis_references` 채움
- [ ] 자카드 + 임베딩 결합 추천

## 검증

- [ ] CSV 134건 import 후 검색 작동
- [ ] 미매핑 큐에 모든 저자 노출
- [ ] 매핑 후 회원 프로필 → 졸업논문 표시
- [ ] `npm run build` 통과
