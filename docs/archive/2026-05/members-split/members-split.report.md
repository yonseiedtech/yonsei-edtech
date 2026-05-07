# 완료 보고서: /members 컨텍스트 분리 (members-split)

> **작성일**: 2026-05-07
> **PDCA 단계**: Plan + Report 결합 (chore-scale 작업)
> **상태**: ✅ 완료
> **관련 PDCA**: dashboard-quickwins / dashboard-persona-redesign 후속 IA 정리

---

## 1. 배경·요청

기존 `/members` 단일 페이지에 4탭(주임교수 / 운영진 / 재학생 / 졸업생)이 한꺼번에 노출되어, GNB 두 컨텍스트(학회 소개 vs 대학원 생활)에서 같은 페이지로 이동해도 서로 다른 컨텍스트가 섞여 보이는 IA 문제.

요청: "탭으로도 분리되게" → 두 컨텍스트를 별도 페이지로 분리.

---

## 2. 변경

| 페이지 | 컨텍스트 | 탭 |
|--------|----------|-----|
| `/about/leadership` (신규) | 학회 소개 | 주임교수 / 운영진 (OrgChart 포함) |
| `/members` (축소) | 대학원 생활 | 재학생 회원 / 졸업생 회원 |

---

## 3. GNB 링크 갱신

```
학회 소개 → 주요 구성원
├── 주임교수 → /about/leadership?tab=professor
└── 운영진   → /about/leadership?tab=staff

대학원 생활 → 구성원
├── 재학생 회원 → /members?tab=student  (또는 /members)
└── 졸업생 회원 → /members?tab=alumni
```

---

## 4. Legacy URL 호환

- `/members?tab=professor` → 자동 redirect → `/about/leadership?tab=professor`
- `/members?tab=staff` → 자동 redirect → `/about/leadership?tab=staff`

→ 외부 링크·북마크·SEO 영향 없음.

---

## 5. 산출물

| 파일 | 변경 |
|------|------|
| `src/app/about/leadership/page.tsx` | 신규 (2탭 — professor / staff, OrgChart 포함, 검색·기수 필터) |
| `src/app/members/page.tsx` | 축소 (4탭 → 2탭, legacy redirect 추가) |
| `src/components/layout/Header.tsx` | GNB 링크 2개 갱신 (professor/staff → /about/leadership) |

---

## 6. 검증

- `npx tsc --noEmit` + `npm run build` 모두 통과
- 라우트: `/about/leadership` ○, `/members` ○ — 둘 다 static prerendered

---

## 7. Commit·배포

- Commit: `db63dab7`
- 배포: `https://yonsei-edtech.vercel.app` ✅
