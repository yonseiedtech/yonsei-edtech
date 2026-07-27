# 운영진 역할권한업무 매뉴얼업무수행철 구조 조사

**작성 일자**: 2026-07-27  
**목적**: 26년 후기 운영진 5역할 매뉴얼 초안 작성

## 1. 운영진 역할 정의

### 1.1 User 레벨 역할 (src/types/user.ts:2)
- 2가지만 정의: president (회장) vs staff (일반 운영진)
- 세부 직책은 User.role에 없음 (조직도에서만 관리)

### 1.2 OrgChart 레벨 직책 (src/features/admin/settings/useOrgChart.ts:7-31)
- title: 직책명
- userId: 담당자 ID
- duty: 업무 설명
- handover: 인수인계 메모 (Markdown)

기본 직책 (폴백): 회장, 부회장, 총무, 학술부장, 홍보부장, 대외협력부장, 편집부장

## 2. 회원 역할 데이터 모델

### 2.1 User 프로필
- User.role: 이진 (president/staff) - 권한 게이트용
- User.position: 직업 정보용 (staff 직책과 무관)
- 조직도 연결: OrgPosition.userId -> User.id

### 2.2 권한 체크
- isStaff 훅 없음 - 직접 user.role 체크
- 패턴: ["staff", "president"].includes(m.role)

## 3. 업무 매뉴얼 / 업무수행철 구조

### 3.1 HandoverDocument (src/types/operations.ts:30-48)
- role: 직책명 (단일, 하위호환)
- roles: 복수 직책 (wiki 통합 이후 예약)
- title, content (마크다운)
- workflow: 절차 단계
- todos: TO-DO 체크리스트
- category: routine, project, reference, caution
- priority: high, medium, low
- term: 임기 (2026-1, 2026-2)

### 3.2 저장 위치
- Database: handover_docs 컬렉션
- 조회: HandoverSection에서 role별 필터링

## 4. 운영진 업무 배정

### 4.1 StaffTask (src/features/staff/staff-store.ts)
- id, projectId, title, description
- assigneeId: 담당자 1명
- status: todo/doing/review/done
- dueDate, createdBy

### 4.2 내 할당 업무 위젯 (StaffHomeTab.tsx:78-92)
- 현재 로그인 운영진의 담당 업무 자동 필터
- 마감 지남 > 마감 임박 > 여유 순 정렬

## 5. 처리 대기 큐 (useStaffReviewQueue.ts:36-102)

**4가지 신뢰도 높은 항목**:
1. 회원 승인 대기 (approved=false)
2. 미답변 문의 (status=pending)
3. 아카이브 검수 (unpublished & reviewStatus!="held")
4. 개설 대기 스터디 (comm_board 수요조사)

## 6. 업무수행철 페이지

### 6.1 /console/handover 레이아웃
- 탭 4개: To-Do / 업무수행철 / 인수인계 종합 / 운영진 교체
- 역할별 필터: 조직도 + 기본 직책 + 기존 문서 roles 통합
- ?role=<직책> 딥링크 지원

### 6.2 편집 (WorkLogEditor)
- 경로: /console/handover/worklog/new?role=<직책>
- 마크다운 toolbar + split 모드 지원
- workflow & todos 입력 UI

### 6.3 운영진 교체 (TransitionView)
- User.role만 변경 (president/staff)
- 조직도 직책 재배치는 별도 운영 (조직 설정 페이지)

## 7. 기술 상세

### 7.1 컬렉션/테이블

profiles - User.role
site_settings (org_chart:YYYY-S) - 조직도
handover_docs - 업무수행철
staff_tasks/staff_projects - 운영 업무
admin_todos - 비정형 업무

### 7.2 데이터 흐름

User (president/staff)
  -> OrgPosition (title, userId, duty, handover)
  -> HandoverDocument (role/roles, workflow, todos)
  -> StaffTask (assigneeId)
  -> ReviewQueueItem (처리 대기)

## 8. 설계 제안

강점:
- 조직도(duty, handover)와 업무수행철(role/roles) 통합 가능
- workflow & todos로 절차 체크리스트 명시
- AdminTodo/StaffTask로 업무 추적 분리

개선점:
- User.role은 이진(president/staff) - 세부 직책 위임 없음
- 조직도/업무수행철 느슨하게 연결
- 권한 세분화 없음 (duty는 UI 표시용)

## 9. 26년 후기 매뉴얼 작성 활용 경로

1. 직책별 매뉴얼 작성: /console/handover/worklog/new?role=<직책>
2. 할당 업무 확인: /staff (내 업무 위젯)
3. 조직도 업무 설명: /console/settings/history (OrgChart.duty)

## 10. 현황 요약

조직도(OrgChart):
- id, title, level, userId, department
- duty: 업무 설명
- handover: 인수인계 메모
- role: OrgRole (advisor/professor/president/vice_president/direct_aide/team_member)
- team: 팀명

업무수행철(HandoverDocument):
- role (단일, 하위호환)
- roles (복수, wiki 통합 이후)
- content (마크다운)
- workflow/todos (절차/체크리스트)

권한 게이트:
- User.role 이진 (president/staff)
- isStaff 훅 없음
- 직접 role 체크

구조:
- 권한 레벨: User.role (president/staff)
- 조직 레벨: OrgChart.title (직책명)
- 매뉴얼 레벨: HandoverDocument.role/roles (업무 내용)
