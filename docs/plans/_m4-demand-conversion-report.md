# M4: 개설 이후 참여 전환 집계 — 구현 보고서

## 변경 파일

- `src/app/console/demand/page.tsx` — 단일 파일만 수정

## 구현 내용

### 사용한 API

| 용도 | API | 반환 타입 |
|------|-----|-----------|
| 참여 의사 명단 | `commLikesApi.respondersOf("demand-join", questionId)` | `{userId, userName?}[]` |
| 실참여 명단 | `activityParticipationsApi.listByActivity(activityId).then(r => r.data)` | `ActivityParticipation[]` (`.userId` 필드) |

`activityParticipationsApi`는 `src/lib/bkend.ts` 1988행에 정의된 `activity_participations` 컬렉션 조회 API.

### 전환 계산 로직

```
intendedIds = Set(respondersOf("demand-join", q.id).map(r => r.userId))
actualCount = participations.filter(p => intendedIds.has(p.userId)).length
전환율 = Math.round(actualCount / intendedCount * 100)%
```

"수요에서 참여 의사를 밝힌 회원" ∩ "개설된 활동에 실제 참가한 회원"의 교집합으로 정확한 전환을 계산.

### UI 동작

- `opened` + `linkedActivityId` 있는 스터디 수요가 1건 이상인 경우에만 "개설 후 전환" 카드 렌더링
- 데이터 로딩 중: Loader2 스피너
- N=0(참여 의사 없음): "데이터 부족" 표기, 크래시 없음
- 활동 조회 실패 시 `useQuery` 기본 동작으로 null 유지 → 로딩 상태 표시
- 전환율 ≥ 50%: `text-success`, < 50%: `text-primary` (시맨틱 토큰 전용)
- 개설 수요 수만큼 `Promise.all`로 병렬 조회

## 제약 준수

- **DB/rules 무변경**: 읽기 전용 (`respondersOf`, `listByActivity`)
- **브랜드 시맨틱 토큰만**: raw 팔레트색 0건
- **신규 파일 없음**: `page.tsx` 단일 파일만 수정
- **금지 영역 미접촉**: `mypage/`, `layout/`, `staff/`, `diagnosis/`, `learning-guides/` 미수정

## 검증 결과

| 검증 항목 | 결과 |
|-----------|------|
| `npx tsc --noEmit` | PASS (출력 없음 = 에러 0) |
| `npx eslint src/app/console/demand/page.tsx` | PASS (출력 없음 = 경고·에러 0) |
| `node scripts/check-rawcolor-ratchet.mjs` | PASS (1개 / 상한 1개 — 변동 없음) |

## 커밋/배포

미완료 — 메인이 검증 후 배포 예정.
