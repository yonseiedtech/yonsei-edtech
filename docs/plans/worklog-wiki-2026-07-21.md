# 업무수행철 위키 통합 + 작성 별도 페이지 (2026-07-21)

## 변경 파일 목록

| 파일 | 변경 유형 | 요약 |
|------|----------|------|
| `src/types/operations.ts` | 수정 | `HandoverDocument`에 `roles?: string[]` 추가 |
| `src/features/handover/WorkLogEditor.tsx` | 신규 | 공용 마크다운 에디터 컴포넌트 (new/edit 페이지 공유) |
| `src/features/admin/HandoverSection.tsx` | 수정 | 직책 탭 → 위키 통합 목록 (필터 칩 + 검색 + 복수 직책 배지) |
| `src/features/handover/OverviewView.tsx` | 수정 | `roles[]` 포함 여부로 준비도 집계 갱신 + "노트 작성" 링크 새 페이지로 변경 |
| `src/app/console/handover/worklog/new/page.tsx` | 신규 | 문서 작성 전용 페이지 |
| `src/app/console/handover/worklog/[id]/edit/page.tsx` | 신규 | 문서 수정 전용 페이지 |

---

## 데이터 모델 하위호환

### 신규 필드
```ts
roles?: string[]  // 참고 대상 직책 복수 태그
```

### 읽기 폴백
`roles` 없으면 `[role]` 단일 배열로 해석. 모든 필터·집계가 이 폴백을 사용:
```ts
function docRoles(doc: HandoverDocument): string[] {
  return doc.roles && doc.roles.length > 0 ? doc.roles : [doc.role].filter(Boolean);
}
```

### 쓰기 하위호환
새 문서 저장 시 `roles[]` 배열과 함께 `role: roles[0]` (첫 태그)도 병기.  
기존 문서는 마이그레이션 스크립트 불필요 — 읽기 폴백이 흡수.

---

## 라우트 구조

```
/console/handover                    → 기존 (탭: todo/worklog/overview/transition)
/console/handover?tab=worklog        → HandoverSection (wiki 목록)
/console/handover/worklog/new        → 작성 전용 페이지
/console/handover/worklog/new?role=X → 직책 프리필 작성 페이지
/console/handover/worklog/[id]/edit  → 수정 전용 페이지
```

콘솔 레이아웃(`src/app/console/layout.tsx`)의 `AuthGuard`(staff 이상)가 이 경로들을 자동 보호.

---

## 딥링크 하위호환

- `?role=X&compose=1` → HandoverSection의 useEffect가 `/console/handover/worklog/new?role=X`로 `router.replace` (1회, ref 가드)
- `?role=X` 단독 → selectedRole 필터 프리셋으로 동작 (기존과 동일)
- OverviewView의 "노트 작성 →" 링크 → `/console/handover/worklog/new?role=X` 직결 업데이트

---

## Firestore 규칙 판단

기존 규칙:
```
match /handover_docs/{docId} {
  allow read: if isAuthenticated() && isStaffOrAbove();
  allow write: if isAuthenticated() && isStaffOrAbove();
}
```

`roles` 필드 추가는 `write` 허용 범위 내이며 필드 레벨 검증이 없으므로 **rules 변경 불필요**.

---

## 검증 결과

- `npx tsc --noEmit` → 에러 0
- `npx eslint --quiet` (변경 6파일) → 에러 0
