# Plan — `handover-editor-report`

- **Date**: 2026-04-18
- **Stage**: 3 P1 묶음 4/4 (master plan `bright-sparking-cerf.md`)
- **Author**: auto-mode
- **Estimated**: 0.5일 (master plan 1주 추정 대비 대폭 축소 — 기존 인프라 발견)

## 1. 목표

운영자가 임기말에 차기 임원에게 인수인계 자료를 전달하기 위해, **기수(학기) 단위로 모든 인수인계 문서를 한 화면에서 인쇄/PDF로 출력**할 수 있게 한다. 또한 인수인계 에디터에 간단한 마크다운 도우미(굵게, 목록, 헤딩 빠른 삽입)를 추가하여 작성 부담을 줄인다.

## 2. 기존 인프라 (재사용)

| 기능 | 위치 | 비고 |
|---|---|---|
| `HandoverDocument` 스키마 | `src/types/index.ts` L1029-1041 | role/title/content/category/priority/term + authorName |
| `HANDOVER_CATEGORY_LABELS` | `src/types/index.ts` L1043 | routine/project/reference 등 |
| 인수인계 에디터 (다이얼로그) | `src/features/admin/HandoverSection.tsx` | 직책/분류/우선순위/제목/내용 입력 + 작성/수정/삭제 |
| 직책별 인수인계 메모 (조직도) | `src/features/handover/OverviewView.tsx` + `OrgPosition.handover` | `window.print()` PDF 지원 |
| `/console/handover` 4탭 라우팅 | `src/app/console/handover/page.tsx` | todo / worklog / overview / transition |
| `useOrgChart` | `src/features/admin/settings/useOrgChart.ts` | 조직도 + handover 필드 |
| `dataApi.list("handover_docs")` | bkend | term 기준 필터 가능 |

**모두 그대로 재사용한다. 신규 의존성 없이 진행.**

## 3. Gap (신규 작업)

### 3a. 기수 종합 리포트 페이지 (신규)

**경로**: `/console/handover/report?term=2026-1`

**구성**:
- 헤더: 기수 선택 셀렉터 (현재 term + 직전 4개) + "인쇄/PDF" 버튼 (`window.print()`)
- 본문 1: 조직도 직책별 인수인계 메모 (`OrgPosition.handover` 사용 — `OverviewView` 패턴 차용)
- 본문 2: 해당 term의 `HandoverDocument` 전체를 직책 → 우선순위 순으로 그룹화 표시
- 푸터: 작성일 + 학회명

**Print CSS**: A4 세로, 페이지 분리 hint, 카테고리 배지/우선순위 색상 유지.

### 3b. HandoverSection 에디터 마크다운 툴바 (소규모 개선)

다이얼로그 textarea 위에 4개 버튼 추가:
- `# 헤딩` — 줄 시작에 `## ` 삽입
- `**굵게**` — 선택 텍스트 감싸기
- `- 목록` — 줄 시작에 `- ` 삽입
- `[]` 체크박스 — 줄 시작에 `- [ ] ` 삽입

textarea ref + `setSelectionRange` 활용. 라이브러리 없이 vanilla.

### 3c. 작성 가이드 placeholder 강화

기존 placeholder: "업무 내용, 절차, 주의사항 등을 작성하세요..." → 마크다운 예시 포함:
```
## 정기 업무
- 매주 월요일 회의 운영
- 회비 입금 확인 (#재무 슬랙)

## 주의사항
**중요**: ...
```

### 3d. HandoverSection에 "기수 리포트" 버튼 추가

상단 우측에 outline Button 추가 → `/console/handover/report?term={CURRENT_TERM}` 이동.

## 4. Out of scope (본 사이클 제외)

- 본격적인 마크다운 렌더러 (react-markdown 도입) — content를 `<pre>` whitespace-pre-wrap으로 유지 (목록/헤딩이 시각적으로 그대로 표시됨)
- 직책별 인수인계 워크플로우 자동 알림 (임기말 자동 prompts)
- Activity/Newsletter PDF 통합 리포트 (별도 트랙)
- AI 인수인계 요약/검토 (LLM 비용 검토 별도)
- 직접 다운로드 (서버 PDF 생성) — 운영자 브라우저 print-to-PDF로 충분

## 5. Validation

- [ ] `npx tsc --noEmit` + `npm run build` 통과
- [ ] `/console/handover/report` 진입 → 기수 선택 정상 동작
- [ ] 조직도 인수인계 + handover_docs 모두 표시
- [ ] "인쇄/PDF" 버튼 → `window.print()` 동작 (Chrome PDF 저장)
- [ ] HandoverSection 에디터 마크다운 툴바 4개 버튼 동작
- [ ] HandoverSection 상단 "기수 리포트" 버튼 → `/console/handover/report` 이동
- [ ] 기존 4탭(todo/worklog/overview/transition) 회귀 없음

## 6. Files to touch

- `src/app/console/handover/report/page.tsx` (신규, 약 150 lines) — 기수 리포트 페이지
- `src/features/admin/HandoverSection.tsx` (수정, +50 lines) — 마크다운 툴바 + 리포트 버튼
- (없음) — 신규 의존성/타입/API 변경 없음

## 7. Deployment

CLAUDE.md 규칙대로 단일 `git push` + 단일 `npx vercel --prod`.
