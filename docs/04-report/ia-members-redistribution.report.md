# Report: ia-members-redistribution

> **완료일**: 2026-05-05
> **PDCA 단계**: Report
> **Match Rate**: 100%

## 요약
GNB 7개 → 6개로 축소. 구성원 그룹을 제거하고 학회소개와 대학원 생활로 분산. 청자(외부 방문자/회원)에 따라 sub-section 시각 분리.

## 산출물

| 단계 | 산출물 |
|------|--------|
| Plan | `docs/01-plan/features/ia-members-redistribution.plan.md` |
| Design | (생략 — 단순 IA 변경) |
| Do | `src/components/layout/Header.tsx` 단일 파일 (NavGroup 타입 확장 + PUBLIC_NAV 재구성) |
| Check | `docs/03-analysis/ia-members-redistribution.analysis.md` (100%) |

## 핵심 변경

### GNB 구조
```
Before:
  학회소개 │ 구성원 │ 대학원 생활 │ 연구 활동 │ 학술 활동 │ 커뮤니티 │ 문의

After:
  학회소개* │ 대학원 생활* │ 연구 활동 │ 학술 활동 │ 커뮤니티 │ 문의
  (*sub-section 적용)
```

### 학회소개 (sub-section)
- 인사말 / 학회 소개 / 활동 분야 / 연혁
- ─── 주요 구성원 ───
- 주임교수 / 운영진

### 대학원 생활 (sub-section)
- ─── 학사 도구 ───
- 인지디딤판 / 내 수강과목 / 캘린더
- ─── 구성원 ───
- 재학생 회원 / 졸업생 회원

## 기술 변경
- NavGroup 타입에 `sections?: NavSection[]` 옵셔널 추가 (기존 `items?: NavLink[]` 와 양립)
- `getSections() / getAllLinks()` 헬퍼로 두 구조 정규화
- NavDropdown(데스크톱) + MobileNavGroup(모바일) 모두 sub-section 헤더 렌더 지원
- 라우트 `/members?tab=*` 그대로 유지 → 북마크/SEO/운영콘솔 회귀 없음

## 사용자 추가 결정
- "회원 명단" → "구성원" 라벨 변경 (구성원 GNB 메뉴 자체는 제거됐지만 sub-section 헤더로 의미 재사용 — 부드러운 톤)

## 운영 효과
- GNB 단순화 → 외부 방문자 인지 부담 감소
- 청자 구분 명확 (학회 정보 vs 사람, 학사 도구 vs 구성원)

## Commit 이력
- (이번 세션 단일 commit)

## Production
https://yonsei-edtech.vercel.app/
