# 장기 미방문 라우트 런타임 회귀 감사 — M2 v8 (2026-07-20)

> 감사자: QA Tester (qa-tester 에이전트) · 대상: https://yonsei-edtech.vercel.app  
> 입력: service-enhancement-plan-v8-2026-07-20.md M2항목 + academic-admin-audit-h4v8-2026-07-20.md §4 고아 라우트 후보  
> 방법: curl GET, HTTP 상태코드 + 응답 크기 실측 (rate 배려 0.3s 간격). 수정 없음 — 발견만.

---

## 결과 요약

| 판정 | 건수 |
|---|---|
| 정상 (200, 크기 정상) | 107 |
| 특수 (200, 의도적 최소 응답) | 1 |
| **404** | **1** |
| 500 / 빈 화면 | 0 |
| **합계** | **109** |

**에러(500) 0건 · 404 1건 · 정상 107건 + 특수 1건**

---

## 1. 고아 라우트 후보 (academic-admin-audit §4 입력)

### 1-1. console/* 고아 후보

| 경로 | 상태 | 크기(bytes) | 판정 | 비고 |
|---|---|---|---|---|
| /console/academic/seminars/poster | 200 | 62,719 | 정상 | 권한게이트 후 렌더 정상 추정 |
| /console/academic/seminars/reviews | 200 | 63,159 | 정상 | |
| /console/archive/concepts/new | 200 | 61,367 | 정상 | |
| /console/archive/measurements/new | 200 | 61,375 | 정상 | |
| /console/archive/variables/new | 200 | 61,369 | 정상 | |
| /console/handover/overview | 200 | 59,039 | 정상 | |
| /console/insights/analytics | 200 | 62,414 | 정상 | |
| /console/insights/semester | 200 | 60,903 | 정상 | |
| /console/settings/external | 200 | 60,778 | 정상 | 의도적 redirect 스텁 추정 |
| /console/settings/projects | 200 | 60,778 | 정상 | 의도적 redirect 스텁 추정 |
| /console/settings/studies | 200 | 60,775 | 정상 | 의도적 redirect 스텁 추정 |
| /console/settings/page-headers | 200 | 62,692 | 정상 | |
| /console/transition | 200 | 58,567 | 정상 | |

### 1-2. academic-admin/* 고아 후보

| 경로 | 상태 | 크기(bytes) | 판정 | 비고 |
|---|---|---|---|---|
| /academic-admin | 200 | 60,425 | 정상 | 권한게이트 정상 |
| /academic-admin/seminars | 200 | 62,685 | 정상 | |
| /academic-admin/certificates | 200 | 61,267 | 정상 | |
| /academic-admin/projects | 200 | 60,903 | 정상 | |
| /academic-admin/studies | 200 | 60,901 | 정상 | |
| /academic-admin/external | 200 | 60,903 | 정상 | |
| /academic-admin/seminars/poster | 200 | 62,719 | 정상 | |
| /academic-admin/seminars/report | 200 | 63,513 | 정상 | |
| /academic-admin/seminars/certificate | 200 | 63,965 | 정상 | |
| /academic-admin/seminars/create | 200 | 63,513 | 정상 | |
| /academic-admin/seminars/promotion | 200 | 63,163 | 정상 | |
| /academic-admin/seminars/registrations | 200 | 63,969 | 정상 | |
| /academic-admin/seminars/reviews | 200 | 63,159 | 정상 | |
| /academic-admin/seminars/timeline | 200 | 63,161 | 정상 | |

---

## 2. 장기 미방문 공개 라우트 (activities · board · about · 기타)

### 2-1. about/*

| 경로 | 상태 | 크기(bytes) | 판정 |
|---|---|---|---|
| /about | 200 | 68,728 | 정상 |
| /about/fields | 200 | 62,518 | 정상 |
| /about/greeting | 200 | 60,496 | 정상 |
| /about/history | 200 | 63,449 | 정상 |
| /about/leadership | 200 | 59,595 | 정상 |

### 2-2. activities/*

| 경로 | 상태 | 크기(bytes) | 판정 |
|---|---|---|---|
| /activities | 200 | 73,950 | 정상 |
| /activities/external | 200 | 68,732 | 정상 |
| /activities/projects | 200 | 69,209 | 정상 |
| /activities/studies | 200 | 69,170 | 정상 |

### 2-3. board/*

| 경로 | 상태 | 크기(bytes) | 판정 |
|---|---|---|---|
| /board | 200 | 79,225 | 정상 |
| /board/free | 200 | 68,579 | 정상 |
| /board/interview | 200 | 69,918 | 정상 |
| /board/paper-review | 200 | 70,801 | 정상 |
| /board/resources | 200 | 68,669 | 정상 |
| /board/seminar | 200 | 70,539 | 정상 |
| /board/update | 200 | 68,833 | 정상 |
| /board/staff | 200 | 60,018 | 정상 |
| /board/promotion | 200 | 68,686 | 정상 |

### 2-4. 기타 장기 미방문 공개 라우트

| 경로 | 상태 | 크기(bytes) | 판정 |
|---|---|---|---|
| /calendar | 200 | 75,172 | 정상 |
| /card-news | 200 | 65,574 | 정상 |
| /collab | 200 | 60,578 | 정상 |
| /directory | 200 | 58,027 | 정상 |
| /gallery | 200 | 61,641 | 정상 |
| /gatherings | 200 | 59,190 | 정상 |
| /hackathon | 200 | 109,536 | 정상 |
| /journal | 200 | 61,867 | 정상 |
| /labs | 200 | 58,017 | 정상 |
| /leaderboard | 200 | 58,031 | 정상 |
| /mentoring | 200 | 57,948 | 정상 |
| /network | 200 | 59,209 | 정상 |
| **/networking** | **404** | 61,934 | **404 — 소스 없음** |
| /newsletter | 200 | 65,915 | 정상 |
| /notices | 200 | 63,832 | 정상 |
| /research | 200 | 60,439 | 정상 |
| /seminars | 200 | 68,440 | 정상 |
| /whats-new | 200 | 124,789 | 정상 |
| /alumni/thesis | 200 | 67,633 | 정상 |
| /agents | 200 | 59,771 | 정상 |
| /ai-forum | 200 | 83,914 | 정상 |
| /steppingstone | 200 | 119,782 | 정상 |
| /steppingstone/onboarding | 200 | 72,624 | 정상 |
| /flashcards | 200 | 62,805 | 정상 |
| /diagnosis | 200 | 61,823 | 정상 |
| /members | 200 | 63,101 | 정상 |

---

## 3. archive 서브 라우트

| 경로 | 상태 | 크기(bytes) | 판정 |
|---|---|---|---|
| /archive/apa-style | 200 | 79,536 | 정상 |
| /archive/my | 200 | 68,078 | 정상 |
| /archive/method-finder | 200 | 69,618 | 정상 |
| /archive/research-finder | 200 | 71,279 | 정상 |
| /archive/theory-map | 200 | 119,645 | 정상 |
| /archive/writing-tips | 200 | 78,337 | 정상 |
| /archive/foundation-terms | 200 | 59,683 | 정상 |
| /archive/graph | 200 | 81,425 | 정상 |
| /archive/research-methods | 200 | 59,684 | 정상 |
| /archive/statistical-methods | 200 | 59,689 | 정상 |
| /archive/terminology | 200 | 405,426 | 정상 (186 용어 대용량) |
| /archive/citation-guide | 200 | 86,151 | 정상 |
| /archive/literature-review-guide | 200 | 93,672 | 정상 |
| /archive/paper-guide | 200 | 87,173 | 정상 |

---

## 4. 인증 필요 라우트 (상태코드·크기만)

| 경로 | 상태 | 크기(bytes) | 판정 | 비고 |
|---|---|---|---|---|
| /console | 200 | 59,950 | 정상 | 클라이언트 사이드 auth redirect |
| /dashboard | 200 | 60,479 | 정상 | |
| /mypage | 200 | 61,254 | 정상 | |

---

## 5. 기타 공개 라우트

| 경로 | 상태 | 크기(bytes) | 판정 |
|---|---|---|---|
| /contact | 200 | 68,669 | 정상 |
| /privacy | 200 | 90,340 | 정상 |
| /terms | 200 | 87,959 | 정상 |
| /help | 200 | 93,358 | 정상 |
| /login | 200 | 59,111 | 정상 |
| /signup | 200 | 57,123 | 정상 |
| /consent | 200 | 85,672 | 정상 |
| /offline | 200 | 63,584 | 정상 |
| /steppingstone/conference | 200 | 71,601 | 정상 |
| /steppingstone/current-student | 200 | 74,010 | 정상 |
| /steppingstone/program-development | 200 | 136,713 | 정상 |
| /steppingstone/thesis-defense | 200 | 60,902 | 정상 |
| /progress-meetings | 200 | 58,043 | 정상 |
| /profile/me | 200 | 58,421 | 정상 |
| /courses | 200 | 59,974 | 정상 |
| /research-model | 200 | 59,223 | 정상 |
| /studio | 200 | 58,021 | 정상 |
| /collab/new | 200 | 61,045 | 정상 |
| /seminars/create | 200 | 60,380 | 정상 |
| /r/digest | 200 | 99,658 | 정상 (API route) |
| **/r/digest-open** | **200** | **42** | **특수** — 의도적 1×1 GIF 트래킹 픽셀 (route.ts) |

---

## 6. 발견 상세 — 404 및 특수

### 6-1. ★ /networking → 404

| 항목 | 내용 |
|---|---|
| URL | https://yonsei-edtech.vercel.app/networking |
| HTTP 상태 | 404 |
| 응답 크기 | 61,934 bytes (커스텀 Next.js 404 페이지) |
| 판정 | **404 — 소스 파일 없음** |
| 원인 추정 | `src/app/networking/page.tsx` 미존재. 유사한 라우트로 `/network`(협업 그래프·추천, `page.tsx` 존재)와 `/console/networking`(운영 콘솔)만 있음. `/networking` URL은 링크·북마크에서 잘못 참조될 수 있는 고아 경로. |
| 수정 필요 | `/networking` → `/network` 또는 `/console/networking` 리다이렉트 스텁 검토. 단, 실 트래픽 유입 여부 확인 후 결정 권장. |

### 6-2. /r/digest-open → 200 (42 bytes) — 이상 아님

| 항목 | 내용 |
|---|---|
| URL | https://yonsei-edtech.vercel.app/r/digest-open |
| HTTP 상태 | 200 |
| 응답 크기 | 42 bytes |
| Content-Type | image/gif |
| 판정 | **정상(의도적)** — 1×1 투명 GIF 트래킹 픽셀 |
| 근거 | `src/app/r/digest-open/route.ts` (route handler, page.tsx 아님). `digest_opens` 컬렉션 기록 후 GIF 반환하는 이메일 오픈 트래킹 패턴. M3(v7) 구현 산출물. |

---

## 7. 동적 라우트 감사 제외 목록

아래 동적 라우트는 실 ID 없이 정적 GET 불가하여 이번 감사에서 제외. 별도 데이터 기반 스모크 필요.

- /activities/external/[id]/*
- /academic-admin/external/[id]/*
- /academic-admin/projects/[id]
- /academic-admin/studies/[id]
- /archive/[type]/[id]
- /collab/[researchId]/*
- /gatherings/[id], /gatherings/p/[token]
- /seminars/[id]/*
- /console/academic/external/[id]/*
- /console/academic/seminars/[id]
- 기타 [id] 세그먼트 포함 라우트

---

## 8. 결론

- **500 에러: 0건** — 장기 미방문 라우트에서 런타임 서버 오류 없음.
- **404: 1건** — `/networking` (소스 없음, 인입 링크 검토 필요).
- **빈 화면 의심: 0건** — 비정상 소용량 200 없음 (`/r/digest-open` 42 bytes는 의도적 GIF).
- **고아 후보 13종(console/*) + 14종(academic-admin/*)**: 전량 200 정상. 삭제 전 H4 권고 순서(인바운드 교체→역결합 이관→redirect 스텁→디렉토리 삭제) 준수.
- **8월 유입 전 사이트 신뢰성**: HTTP 레벨에서 이상 없음. `/networking` 404 1건만 핫픽스 대상.
