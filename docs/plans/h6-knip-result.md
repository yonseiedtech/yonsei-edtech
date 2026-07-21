# H6 Knip Dead Code Reduction Result

**날짜**: 2026-07-21
**결과**: 39 → 28 (11개 export 제거)

## 제거된 함수/변수 목록

| # | 파일 | 제거된 export | 이유 |
|---|------|--------------|------|
| 1 | `src/lib/permissions.ts` | `canAccessLabs` | labs 기능 미사용, `Lab` 타입 import도 함께 제거 |
| 2 | `src/lib/courseSchedule.ts` | `scheduleIncludesDay` | 미사용 요일 포함 체크 유틸 |
| 3 | `src/app/console/academic/external/[id]/volunteers/volunteer-utils.ts` | `normalizeName` | admin/certificates/page.tsx에 동일 로직 로컬 정의됨 |
| 4 | `src/lib/streak-freeze.ts` | `isWeekFrozen` | 미사용 스트릭 동결 체크 유틸 |
| 5 | `src/lib/denorm-sync.ts` | `enrichCourseReviews` | 미사용 강의 후기 denorm sync 유틸; `courseOfferingsApi`, `CourseReview`, `CourseOffering` import도 함께 제거 |
| 6 | `src/lib/theory-family.ts` | `findTheoryNode` | 미사용 이론 노드 탐색 함수 |
| 7 | `src/features/research/study-timer/useStudySessions.ts` | `useTodaySessions` | 미사용 오늘 세션 훅; `todayYmdLocal` import도 함께 제거 |
| 8 | `src/features/member/useMembers.ts` | `useRejectMember` | 미사용 회원 거절 훅 |
| 9 | `src/lib/aect-terminology.ts` | `findAectTerm` | `searchAectTerms`로 대체 가능; 단건 조회 미사용 |
| 10 | `src/lib/citation-verify.ts` | `fetchDoiMetadata` | 미사용 CrossRef DOI 검증 함수; `normalizeDoi` 내부 헬퍼도 함께 제거 |
| 11 | `src/lib/research-paper-source.ts` | `enrichWithSemanticScholar` | 미사용 Semantic Scholar 보강 함수 |

## 검증 결과

```
[deadcode-ratchet] PASS (28개 / 상한 28개 — 변동 없음)
  분석 완료: export 28 + file 0 + type 0 = 28개
```

- `tsc --noEmit`: 에러 없음 (0 errors)
- `node scripts/check-deadcode-ratchet.mjs`: PASS (28 / ceiling 28)

## 보존한 항목 (삭제 안 한 이유)

- `seedDiagnosticQuestions`: 운영 콘솔에서 수동 실행하는 시드 함수
- `notifyNewNotice`, `notifyNewSeminar`, `notifySeminarReminder`: 알림 시스템 인프라
- `disablePushForCurrentUser`, `onForegroundPush`: 푸시 설정 인프라
- `useCollabSentInvites`, `useCancelCollabInvite`, `useUpdateSelfMemberMeta`: 공동연구 API
- `useChapter`, `useMentionsInbox`, `useMyMilestones`: 공동연구 Phase2 API
- `activityMaterialsApi`, `emailLogsApi`, `thesisReferencesApi`, `thesisClaimsApi`: bkend API (콘솔/관리자 사용 가능)
- `searchAectTerms`: AECT 용어 검색 (찾아보기 페이지 등에서 사용 예정)
- `searchOpenAlexEdTech`: OpenAlex 검색 (연구 리뷰 에이전트 PoC용, `OPENALEX_EDTECH_CONCEPT_ID`·`TRUSTED_VENUE_ISSN` 의존)
