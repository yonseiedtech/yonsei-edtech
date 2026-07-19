# F2 개선: /activities 목록 페이지 ISR 서버 프리패치

**작성일**: 2026-07-20  
**문제**: /activities/studies·projects·external 목록이 클라이언트 전량 로드에만 의존해 Firestore WebChannel이 낀 브라우저 환경에서 무한 스켈레톤 현상 발생  
**해결**: archive/[type]/page.tsx 와 동일한 ISR 서버 프리패치 + 클라 폴백 패턴 적용

---

## 변경 파일

| 파일 | 변경 내용 |
|------|-----------|
| `src/features/activities/ActivityPage.tsx` | Props에 `initialActivities?: Activity[]` 추가; `useQuery`의 `initialData`로 연결 |
| `src/app/activities/studies/page.tsx` | `"use client"` 제거 → async 서버 컴포넌트; `runtime=nodejs`, `revalidate=300`; admin 프리패치 |
| `src/app/activities/projects/page.tsx` | 동일 |
| `src/app/activities/external/page.tsx` | 동일 |

---

## 아키텍처 패턴

```
서버 (ISR revalidate 300)
  └── firebase-admin → activities 컬렉션 where(type == "study"|"project"|"external")
  └── Timestamp → ISO 직렬화
  └── createdAt 내림차순 정렬 (API 동작과 일치)
  └── initialActivities: Activity[] | undefined 전달
        ↓
클라이언트 (ActivityPage)
  └── useQuery({ initialData: initialActivities })
      - initialActivities 있음 → isLoading=false, 즉시 렌더 → 백그라운드 자동 갱신
      - initialActivities 없음 (프리패치 실패) → 기존 클라 로드 경로 유지 (폴백)
```

## 동작 불변 사항

- 필터 탭(전체/예정·진행/완료), 뷰 모드(리스트/갤러리), 카드 UI 완전 동일
- 등록/수정/삭제(staff), 참여신청/취소 — 클라이언트 hydration 후 그대로 동작
- 프리패치 실패(빌드 시 자격증명 없음, Firestore 일시 오류) 시 빈 UI 아닌 기존 클라 스켈레톤→로드 경로로 자동 폴백

## 검증

- `npx tsc --noEmit` — 에러 0
- `npx eslint` — 에러 0 (대상 4파일)
