# PDCA Report — `handover-editor-report`

- **Stage**: 3 P1 묶음 4/4
- **Match Rate**: 95%
- **Estimated**: 1주 → **실제**: 약 35분 (기존 인프라 재활용)
- **Deployment**: https://yonsei-edtech.vercel.app

## Summary

운영자가 임기말에 차기 임원에게 인계할 때 (1) 직책별 인수인계 메모와 (2) HandoverDocument를 한 페이지에서 기수 단위로 인쇄/PDF 저장할 수 있게 했다. 부수적으로 인수인계 에디터에 마크다운 빠른 입력 툴바(헤딩/굵게/목록/체크박스)와 작성 가이드 placeholder를 강화하여, 학회보처럼 별도 PDF 합성 인프라 없이 브라우저 print만으로 충분한 결과물을 얻도록 했다.

## PDCA

### Plan
- grep으로 기존 인프라 확인: `HandoverDocument` 스키마, `useOrgChart`, `OrgPosition.handover`, `dataApi.list("handover_docs")`, HandoverSection 다이얼로그 모두 존재
- 진짜 gap = "기수 종합 페이지 + 마크다운 툴바 + 리포트 진입 버튼"
- scope 0.5일로 축소 (master plan 1주 → 35분)

### Do
- `src/app/console/handover/report/page.tsx` 신규 (243 lines)
  - `buildTermOptions()` 5분기 셀렉터, URL term 동기화
  - `useOrgChart` + `dataApi.list("handover_docs")` 병렬 조회
  - `docsByRole` Map + `PRIORITY_ORDER` 정렬
  - A4 print CSS + footer 인쇄 고정
- `src/features/admin/HandoverSection.tsx` 수정 (+50 lines)
  - `applyMarkdown()` 함수 + textarea ref + 4 버튼 (Heading2 / Bold / List / CheckSquare)
  - placeholder에 마크다운 예시 (`## 정기 업무` 등) 포함
  - 상단 우측 "기수 리포트" Link 버튼

### Check
- TypeScript clean (`npx tsc --noEmit` exit 0)
- Next.js build 통과
- 12/12 plan items, 0 real gaps, 95% match
- 부수: Firestore Security Rules 누락 보강(`research_proposals`, `study_sessions`) — 사용자 보고 권한 오류 해결

## Implementation Highlights

| Aspect | Approach |
|---|---|
| 신규 코드 | 약 290 lines |
| 신규 의존성 | 없음 |
| API 변경 | 없음 (기존 `dataApi.list`/`useOrgChart` 재사용) |
| 마크다운 파서 | 미도입 (whitespace-pre-wrap + 문법은 사람이 읽음) |
| 인쇄 출력 | `window.print()` + `@page A4` (별도 PDF 라이브러리 X) |
| 회귀 방지 | HandoverSection 다이얼로그 폼 동작/상태 무수정 |

## Bonus Track — Firestore Rules + 연구 타이머 통계

이 사이클 중 사용자가 실시간으로 보고:
1. `/research/proposal` — `Missing or insufficient permissions` 에러
2. 논문 작성/읽기 시작 시 `타이머 시작에 실패했습니다` 에러

**원인**: `firestore.rules`에 `research_proposals`, `study_sessions` 컬렉션 룰 누락.

**조치**:
- `research_proposals`, `study_sessions` 룰 추가 (research_papers와 동일 패턴, userId 본인 한정)
- `firebase deploy --only firestore:rules` 적용 (released to cloud.firestore)
- 추가로 `src/features/research/study-timer/StudyTimerStats.tsx` 신규 작성:
  - 오늘/이번주/이번 학기 누적 학습 시간 카드
  - 평균 집중도 (focusScore avg)
  - 최근 7일 일별 막대 차트
  - 가장 많이 학습한 논문/자료 Top 3
- `MyResearchView` 작성 탭의 "연구 현황" 섹션에 위젯 주입 (본인 한정 `isSelf` 가드)

## Lessons Learned

1. **마스터 플랜 ROI 4연속 검증**: certificate-pdf-bulk-email (1.5주→1시간), member-bulk-approval (3일→30분), fees-excel-reconcile (1주→40분), handover-editor-report (1주→35분). 매 사이클마다 grep 선행 → 기존 인프라 발견 → scope 자동 축소.
2. **Print CSS는 PDF 라이브러리의 80% 대체**: 운영자가 차기 임원에게 종이/PDF로 전달하는 인수인계 자료는 브라우저 print-to-PDF로 충분. `@react-pdf/renderer` 등 별도 의존성을 도입하지 않은 의사결정은 정답.
3. **권한 룰 누락은 코드 grep으로 사전 차단**: 사용자가 신규 컬렉션을 추가할 때 firestore.rules에 매칭 룰을 동시 추가하지 않으면 production에서 권한 오류로 노출됨. PDCA do 단계에 "rules 동기화" 체크 항목을 표준화할 가치 있음.
4. **사용자 실시간 피드백 흡수**: 인수인계 작업 중 다른 트랙(연구 계획서/타이머) 권한 이슈를 즉시 흡수하여 같은 deploy에 묶음 처리. 작은 push를 여러 번 하지 않고 단일 vercel --prod에 집약 (CLAUDE.md 규칙 준수).

## Next Steps

Stage 3 P1 묶음 4/4 완료 → Stage 4 (academic-activities-v2) 또는 Stage 5 (org-structure-v2)로 이행. 사용자 우선순위 확인 후 진입.

연구 타이머 통계 후속 후보:
- 잔디(heatmap) 통합 (writing-history와 동일 시각화)
- 집중 시간대 분석 (시간대별 평균 집중도)
- 목표 시간 설정 + 진행률 표시
