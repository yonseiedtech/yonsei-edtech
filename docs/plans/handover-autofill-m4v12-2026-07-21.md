# handover report 자동 채움 심화 (v12-M4) — 구현 보고서

- 일자: 2026-07-21
- 파일: `src/app/console/handover/report/page.tsx`
- 유형: 기존 리포트 구조 확장 (신규 컬렉션 0 · 신규 API 엔드포인트 0)

---

## 1. 구현 전 현황 (실측)

`handover/report/page.tsx` (239줄) 기존 자동 채움 범위:
- Section 1: 직책별 인수인계 메모 — `OrgPosition.handover` 필드 렌더
- Section 2: 직책별 업무수행 문서 — `handover_docs` 컬렉션 term 필터 렌더
- **미자동**: 임기 활동 요약(업무 문서 통계·직책 커버리지) 없음
- **미자동**: 공백 직책에 "첫 주 필요 사항"(duty·콘솔 화면·cron 의존) 자동 채움 없음

---

## 2. 추가한 섹션 (2개)

### M4-A: 임기 활동 요약 (자동 채움)

위치: `header` 다음, 기존 섹션 앞에 삽입

자동 집계 소스 — 기존 쿼리 재사용(신규 없음):
- `termDocs` (이미 로드된 `handover_docs` term 필터)
- `positions` (이미 로드된 `useOrgChart`)

표시 내용:
| 항목 | 내용 |
|---|---|
| 이 학기 업무 문서 합계 | `termDocs.length` |
| 카테고리 분포 | 주의사항·정기업무·진행프로젝트·참고자료 건수 배지 |
| 직책 커버리지 | 배정 N직책 중 M직책 업무 문서 있음 |
| 공백 직책 수 | 인수 메모·업무노트 모두 없는 배정 직책 (→ 온보딩 안내 참조) |

### M4-B: 직책 온보딩 안내 (자동 채움 — 첫 주 참고)

위치: M4-A 바로 뒤, 기존 "직책별 인수인계 메모" 앞

대상: 배정된 직책 중 `role`에 콘솔 화면 또는 cron 목록이 있거나 `duty` 필드가 있는 직책
(= 감사가 지목한 공백 직책 6유형 포함, level·order로 계층 정렬)

직책별 자동 병합 4가지:

| 슬롯 | 데이터 소스 |
|---|---|
| 담당 업무 | `OrgPosition.duty` (조직도 duty 필드) |
| 이 학기 업무노트 건수 | `docsByRole.get(p.title)` (termDocs 재사용) |
| 담당 콘솔 화면 목록 | `ROLE_CONSOLE_SCREENS` 정적 매핑 (role 기반) |
| 반복 cron 의존 | `ROLE_CRON_DEPS` 정적 매핑 (role 기반) |

공백 직책(`gapTitleSet` 멤버)은 카드 테두리 `border-destructive/20` + "업무노트 없음" 경고 배지로 강조.

#### 역할별 콘솔 화면 매핑 (ROLE_CONSOLE_SCREENS)

| OrgRole | 화면 목록 |
|---|---|
| president | 운영 콘솔 홈·회원 관리·게시글 관리·콘텐츠 초안·운영진 설정(조직도)·업무노트 |
| vice_president | 운영 콘솔 홈·학술활동 관리·업무노트·운영진 설정(조직도) |
| direct_aide | 학술활동 관리·업무노트 |
| team_member | 업무노트 |

#### 역할별 cron 의존 매핑 (ROLE_CRON_DEPS)

| OrgRole | 자동 실행 cron |
|---|---|
| president | 신입 활성화 시퀀스·주간 다이제스트·학기 이월 조직도 복사·cron 연속실패 감시 |
| vice_president | 멘토링 넛지·세미나·스터디 리마인더·학기 이월 조직도 복사 |
| direct_aide | 세미나·과제 리마인더·스터디 리마인더 |
| team_member | 세미나·스터디 리마인더 |

---

## 3. 감사 §6-D 대응 정합

| 감사 §6-D 요구 | 구현 여부 |
|---|---|
| 임기 중 활동 요약 자동 슬롯 추가 | M4-A (termDocs 통계) |
| 직책별 duty 자동 병합 | M4-B (OrgPosition.duty) |
| 담당 콘솔 화면 목록 자동 병합 | M4-B (ROLE_CONSOLE_SCREENS) |
| 반복 cron 의존 자동 병합 | M4-B (ROLE_CRON_DEPS) |
| 연결 업무노트 건수 표시 | M4-B (docsByRole termDoc count) |
| 기존 구조 확장 (신규 컬렉션 없음) | 준수 |

M4 범위 밖(이월 안 됨): §6-A 직책명 표준화·§6-B 권한게이트 자동화·§6-C 넛지 cron·§6-E term 필터 — 구조 항목, 외부 의존 포함.

---

## 4. 검증

- `npx tsc --noEmit`: 에러 0
- `npx eslint src/app/console/handover/report/page.tsx --quiet`: 경고 0
- raw 색상: 없음 (semantic 토큰만 사용)
- 수정 금지 파일: `app/console/page.tsx`·`features/mypage`·`components/mypage` 미수정

---

## 5. 최종 파일 상태

`src/app/console/handover/report/page.tsx`: 239줄 → 318줄
추가 import: `Link` (next/link)·`OrgRole` (useOrgChart)·`BarChart2·Monitor·RefreshCw·AlertTriangle` (lucide-react)
추가 상수: `ROLE_CONSOLE_SCREENS`·`ROLE_CRON_DEPS`·`CATEGORY_DISPLAY`
추가 섹션: M4-A(임기 활동 요약)·M4-B(직책 온보딩 안내)
