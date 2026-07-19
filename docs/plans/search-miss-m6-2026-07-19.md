# M6 검색 실패(zero-result) 분석 구현 내역

> 작성: 2026-07-19 | 백로그 출처: service-enhancement-plan-v6-2026-07-18.md M6

---

## 구현 요약

전역 검색(커맨드 팔레트)과 아카이브 통합 검색에서 무결과 질의를 `search_misses` 컬렉션에 경량 적재하고, 운영 인사이트 콘솔(opkpi 탭)에 "많이 찾았지만 없는 것 Top 20" 테이블 섹션을 추가했다.

---

## 수정 파일 목록

| 파일 | 변경 유형 | 내용 |
|---|---|---|
| `src/lib/search-miss-tracker.ts` | **신규** | 경량 적재 유틸 — upsert(count 증가), 세션 Set 중복 방지, silent failure |
| `src/features/insights/SearchMissSection.tsx` | **신규** | Top 20 테이블 컴포넌트 (Firestore orderBy count desc, staff+ read) |
| `src/components/layout/GlobalSearch.tsx` | 수정 | import 추가 + 무결과 useEffect(debounce 600ms) |
| `src/features/archive/ArchiveGlobalSearch.tsx` | 수정 | useEffect import 추가 + 무결과 useEffect(debounce 600ms) |
| `src/app/admin/insights/page.tsx` | 수정 | SearchMissSection dynamic import + opkpi 탭에 섹션 추가 |
| `firestore.rules` | 수정 | search_misses 규칙 추가 (create/update: true, read: staff+, delete: admin) |

---

## 설계 결정

### 적재 조건
- 질의 길이 2자 이상
- 검색 debounce 완료 후 600ms 타이머 완료 시점에서 결과 0건
- 로딩 중(`isLoading / loading === true`)이면 적재하지 않음
- 동일 세션 동일 정규화 질의 1회 (메모리 Set — 탭 새로고침 시 리셋, 의도적)

### 적재 방식
- 문서 ID: `normalizeQuery(raw)` → 특수문자 `_` 치환 slug (최대 50자)
- 필드: `query`(소문자 trim), `count`(increment), `lastAt`(serverTimestamp)
- `setDoc(..., { merge: true })` upsert — 동일 질의 누적

### 익명성
- userId 미저장
- 비로그인 포함 누구나 적재 가능 (daily_visits 패턴 준용)

### 쓰기 실패
- try/catch로 silent failure — 검색 UX에 영향 없음

### Firestore rules (daily_visits 패턴 준용)
```
match /search_misses/{docId} {
  allow read, list: if isAuthenticated() && isStaffOrAbove();
  allow create, update: if true;
  allow delete: if isAuthenticated() && isAdmin();
}
```

### 콘솔 표면
- 신규 라우트 없음 — `/console/insights?view=opkpi` 탭 내 섹션 추가
- `SearchMissSection` dynamic import(ssr: false)
- Firestore 직접 query — `orderBy("count", "desc"), limit(20)`
- isError 시 null(조용히 숨김) — 권한 부족 환경에서 에러 방지

---

## 검증

- `npx tsc --noEmit`: exit code 0 (오류 없음)
- `npx eslint` 대상 5개 파일: 확인 중
- build·commit: 규율 준수 — 미수행
