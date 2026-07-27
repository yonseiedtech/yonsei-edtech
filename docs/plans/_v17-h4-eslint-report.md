# v17 H4 — ESLint Warning 상환 리포트

**작업**: ESLint warning 212 → 170 이하 추가 상환 (기능 무변경 순수 리팩터)
**측정 기준일**: 2026-07-27
**담당**: executor (Opus)

## 결과 요약

| 항목 | 값 |
|------|-----|
| 수정 전 총 warning | **212** |
| 수정 후 총 warning | **167** |
| 순 감축 | **45건** (목표 42건+ 달성, 170 이하 도달) |
| tsc --noEmit | **0 에러** (통과) |

감축은 전량 `@typescript-eslint/no-unused-vars` (49 → 4) 에서 발생. 억제 주석·베이스라인 조작 없이 실제 미사용 코드 제거·구조 보존 리팩터만 사용. 총계가 정확히 45 감소(49→4와 일치)하여 **새 경고를 유발하지 않았음이 확인됨**(orphan import는 즉시 함께 제거).

### 룰별 변화 (수정 전 → 후)
```
react-hooks/set-state-in-effect            66 → 66  (미손댐)
@typescript-eslint/no-unused-vars          49 →  4  ★ -45
react-hooks/exhaustive-deps                42 → 42  (의도적 1회 실행 — 미손댐)
@next/next/no-img-element                  18 → 18  (data URL/PDF/동적 — 미손댐)
react-hooks/purity                         15 → 15
react-hooks/preserve-manual-memoization     8 →  8
no-console                                  6 →  6  (여유분이라 미손댐)
그 외                                        동일
```

## 수정 파일별 제거 내역 (규칙: 전량 no-unused-vars)

| 파일 | 제거 내용 | 건수 |
|------|-----------|------|
| `src/app/admin/fees/page.tsx` | `showSettings` getter→`,` 분해, 미사용 `memoDialog`/`setMemoDialog` 라인 삭제 | 3 |
| `src/app/api/ai/chat/route.ts` | 미사용 상수 `DEFAULT_GREETING` 삭제 | 1 |
| `src/app/api/ai/semester-report/route.ts` | 누적만 되고 안 읽히는 `fullText` 선언+`+= chunk` 삭제 (스트림 enqueue 유지) | 1 |
| `src/features/collaborative-research/lib/research-status.ts` | 미사용 타입 import 3종(`CollabInviteStatus`,`HypothesisType`,`HypothesisStatus`) | 3 |
| `src/app/collab/[researchId]/publish/[articleId]/page.tsx` | 미사용 `useState` import + 미호출 `handlePublish` 함수 + 그로 인해 orphan 된 `canTransitionReviewStatus` import | 2 |
| `src/app/console/academic/external/[id]/workbook/page.tsx` | `TaskSubmissions` 미사용 prop `activityId` 분해에서 제거(타입 유지) | 1 |
| `src/app/console/research/journal/page.tsx` | 미사용 `queue`/`issues` 분해 제거 — **fetch 동작 보존 위해 bare 호출**(`useReviewQueue(); useAllIssues();`)로 변환 | 2 |
| `src/app/courses/page.tsx` | 미사용 상수 `ELECTIVE_CATS` 삭제 | 1 |
| `src/app/diagnosis/page.tsx` | 미사용 상수 `TOTAL_QUESTIONS_ALL` 삭제 | 1 |
| `src/app/research-model/page.tsx` | `dirty` getter→`,` 분해 | 1 |
| `src/app/seminars/[id]/live/host/page.tsx` | 미사용 `loading` 분해 제거(hook 호출 유지) | 1 |
| `src/app/seminars/[id]/live/page.tsx` | 미사용 파생값 `live` 라인 삭제 | 1 |
| `src/app/seminars/[id]/page.tsx` | 미사용 `router`+orphan `useRouter` import 삭제 | 1 |
| `src/app/seminars/[id]/review/page.tsx` | `isGuest` getter→`,` 분해 | 1 |
| `src/components/ui/avatar.tsx` | 미export·미사용 데드 컴포넌트 3종(`AvatarBadge`,`AvatarGroup`,`AvatarGroupCount`) 삭제 | 3 |
| `src/components/ui/card.tsx` | 미export·미사용 데드 컴포넌트 3종(`CardDescription`,`CardAction`,`CardFooter`) 삭제 | 3 |
| `src/components/ui/alert-dialog.tsx` | 미export·미사용 `AlertDialogMedia` 삭제 | 1 |
| `src/components/ui/dialog.tsx` | 미export·미사용 `DialogClose` 삭제 | 1 |
| `src/features/activities/ActivityPage.tsx` | 미사용 prop `color` 분해 제거(타입 유지) | 1 |
| `src/features/activities/StudySessionPreClassCard.tsx` | 미사용 prop `participantIds` 분해 제거(타입 유지) | 1 |
| `src/features/agent/ServerConnectionCard.tsx` | 미사용 `data: testResult` 분해 제거 | 1 |
| `src/features/auth/useSessionTimer.ts` | 미사용 셀렉터 `logoutStore` 삭제 | 1 |
| `src/features/card/print-card.ts` | 미사용 헬퍼 `mm` 삭제(`MM_TO_PT` export 유지) | 1 |
| `src/features/dashboard/ActivityFeed.tsx` | 미사용 map index `idx` 제거 | 1 |
| `src/features/journal/components/JournalArticleView.tsx` | 미사용 prop `currentUserId` 분해 제거(타입 유지) | 1 |
| `src/features/journal/components/JournalConsentPanel.tsx` | 미사용 prop `userMap` 분해 제거(타입 유지) | 1 |
| `src/features/research/LiteratureMatrix.tsx` | `const {[k]:_omit,...rest}` 2곳 → `const rest={...d}; delete rest[k]` (동치, lint-safe) | 2 |
| `src/features/research/WritingPaperEditor.tsx` | 미사용 map index `pi` 제거 | 1 |
| `src/features/seminar-admin/ReportTab.tsx` | 미사용 `qc`+orphan `useQueryClient` import 삭제 | 1 |
| `src/features/seminar-live/LivePollRespond.tsx` | `AggregationView` 미사용 파라미터 `q` 분해 제거(타입 유지) | 1 |
| `src/features/seminar/SeminarForm.tsx` | 미사용 `_updateSeminar`+orphan `useUpdateSeminar` import 삭제 | 1 |
| `src/features/studio/StudioEditor.tsx` | `historyTick` getter→`,` 분해(setter만 리렌더 트리거로 사용) | 1 |
| `src/lib/bkend.ts` | 미사용 파라미터 `_token`(me)·`_refreshToken`(refresh) 제거 (tsc로 시그니처 호환 확인) | 2 |
| **합계** | | **45** |

## 건너뛴 파일 및 사유 (위험 판단 — 억지 수정 금지)

| 파일 | 미수정 warning | 사유 |
|------|----------------|------|
| `src/app/api/reviews/route.ts` | `recommendedTopics`, `recommendedSpeakers` (2, no-unused-vars) | **보안 omit 패턴**. `const { recommendedTopics, recommendedSpeakers, ...rest } = r;` 는 운영진 전용 필드를 공개 응답 `rest`에서 **의도적으로 제거**하는 코드. 무심코 지우면 민감 필드 유출 → 기능·보안 변경. 건너뜀. |
| `src/lib/ai.ts` | `_geminiFastModel` (1, no-unused-vars) | "Gemini cap 복구 시 사용" 목적으로 의도 보존된 참고 코드. 제거 시 `google` import가 orphan 될 가능성 있어 연쇄 수정 위험. 안전 여유분이 충분해 건너뜀. |
| `src/features/activities/ActivityPage.tsx` | `joinMutation` (1, no-unused-vars) | 20+행 useMutation 블록. 미호출이지만 참여신청 로직 배선 미완일 가능성. 대량 삭제는 회귀 위험이 상대적으로 커서 목표 초과 달성분으로 대체, 건너뜀. |
| exhaustive-deps 42건 전체 | 42 | 지시대로 **손대지 않음**. deps 무분별 추가는 무한 리페치·리셋 등 런타임 버그 유발. 의도적 1회 실행 지점으로 판단, 보존. |
| no-img-element 18건 전체 | 18 | data URL·PDF·외부 동적 URL 컨텍스트가 섞여 있어 확실 안전 판별이 어려움 + L1 항목과 중복. 목표를 no-unused-vars만으로 달성해 건너뜀. |
| no-console 6건 | 6 | 목표 초과 달성으로 불필요. 로그 레벨 변경(log→warn)은 미세하나마 동작 변경 소지가 있어 보존. |

## 안전성 검증

1. **tsc --noEmit → 0 에러**. bkend.ts 파라미터 제거·prop 분해 변경 등 타입 무결성 전량 확인.
2. **총계 정합**: 212 → 167 (정확히 -45), no-unused-vars 49→4 (-45)와 완전 일치 → **새 경고 무발생** 확정. orphan 된 import(`canTransitionReviewStatus`, `useRouter`, `useQueryClient`, `useUpdateSeminar`)는 즉시 함께 제거해 신규 warning 방지.
3. **동작 보존 원칙 준수**:
   - journal 페이지: 미사용이어도 fetch 부수효과 보존 위해 hook을 bare 호출로 유지(제거 아님).
   - LiteratureMatrix: `delete` 패턴은 dynamic-key omit과 동치 — 렌더·상태 불변.
   - 데드 UI 컴포넌트: **미export·미참조** 확인 후 제거 → import 어디에서도 사용 불가하므로 런타임 무영향.

## 미배포 안내
- 코드 변경만 완료. **베이스라인 재생성(CEILING 212→170 이하)·build·배포는 메인이 게이트에서 직접 수행** (지시대로 build/베이스라인/ratchet 파일 미수정).
