# 운영진 페이지 고도화 기획 (2026-07-27)

## 현황
`/staff` = 3탭(운영진 공지 · 프로젝트 운영 · 콘솔 바로가기). 데이터 모델(staff_notices/projects/tasks)은 탄탄하나, **랜딩에 "지금 뭘 해야 하는지"를 모아주는 대시보드가 없음** — 매번 탭을 뒤져야 함. 탭 간 단절.

## 갭
1. 진입 시 내 할당 업무·팀 진척·주요 공지가 한눈에 안 보임
2. 프로젝트 탭에 들어가야만 task 확인 가능 (담당자 관점 부재)
3. 팀 전체 진행률·마감 임박 신호 없음

## 개선 — "운영 홈(대시보드)" 탭 신설 (첫 탭)
DB/rules 무변경. 기존 store(useStaffProjects·useAllStaffTasks·useStaffNotices) 집계만 조합.

1. **내 할당 업무** — assigneeId==나 인 task, 마감 임박(≤3일)·지남 강조, 상태 배지, 프로젝트로 딥링크
2. **팀 스냅샷** — 프로젝트 수·진행중, 전체 task 완료율(도넛/바), 마감 임박 task 수
3. **고정 공지** — pinned 공지 인라인(제목+본문 미리보기) → 공지 탭 연결
4. **빠른 이동** — 처리 대기(검수 큐·문의)는 콘솔 바로가기 상위 노출로 연결

## 구현
- 신규: `src/features/staff/StaffHomeTab.tsx`
- 수정: `src/app/staff/page.tsx` (홈 탭 추가, defaultValue="home")
- 제약: 브랜드 시맨틱 토큰만, 신규 경고 0, 다크모드, DB/rules 무변경

## 검증
tsc·eslint·rawcolor(CEILING 1)·warning ratchet(263)·build → 배포 → QA 스모크
