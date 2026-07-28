# 운영콘솔 메뉴 개편 — Phase 1+2 구현 기록

> 작성일: 2026-07-28 · 대상: `src/app/console/layout.tsx` (단일 파일)
> 근거: `_console-menu-redesign-SYNTHESIS.md` D절 추천 통합안(7그룹)
> **URL href 무변경**(재배치·라벨만). 커밋/배포 없음 — 메인 게이트 대기.

## 1. 변경 요약

- 기존 9그룹(~51링크) → **7그룹**으로 재배치. URL(href) 전부 그대로 유지.
- **인사이트**(/console/insights) → (구)모니터링에서 **홈 그룹**으로 이동.
- **모니터링 그룹 소멸**: 인사이트→홈, 감사로그·Cron→시스템, AI포럼→AI&자동화로 전부 재배치.
- **온보딩 그룹 소멸**: 신규 회원 체크리스트→회원 그룹으로 병합.
- **회원/문의 과밀(11개) 분리**: 상시 항목 7개 + [접기 "관리 도구"] 5개.
- **학사↔활동 경계 재정리**: 학술 활동(academic/* 중심 9개), 학사(수강·졸업·연구·논문심사 등 8개 + [접기 "관리 도구"] 2개).
- **콘텐츠·아카이브 1그룹 통합**: 서브섹션 라벨 헤더 2개(콘텐츠 8 / 아카이브 8) + [접기 "콘텐츠 갭"] 1개.
- **AI & 자동화 독립 그룹**: AI포럼·챗봇설정·AI에이전트관리·워크플로우·작업보드 5개.
- **시스템**(presidentOnly): 사이트설정·학사일정·감사로그·Cron이력[adminOnly]·실험실.

## 2. 7그룹 최종 매핑 (href → 그룹/서브섹션)

### 1. 홈
| 라벨 | href | 플래그 |
|---|---|---|
| 홈 | /console | |
| 업무노트 | /console/handover | |
| 인사이트 | /console/insights | ← (구)모니터링 |

### 2. 회원
| 라벨 | href | 플래그 |
|---|---|---|
| 회원관리 | /console/members | adminOnly, badge=pendingCount |
| 문의 답변 | /console/inquiries | badge=unansweredCount |
| 피드백 | /console/feedback | badge=feedbackNewCount |
| 잠재회원 | /console/potential-members | |
| 연락망 | /console/directory | |
| 신규 회원 체크리스트 | /console/onboarding-checklist | ← (구)온보딩 |
| 운영진 설정 | /console/org | |
| **[접기 "관리 도구"]** 회원 검증 | /console/members/audit | |
| 〃 포트폴리오 검증 | /console/portfolio-verification | |
| 〃 졸업논문 매핑 | /console/alumni-mapping | |
| 〃 신청자 학번 연동 | /console/applicant-link-by-studentid | adminOnly |
| 〃 교사 소속 분리 | /console/members/migrate-teacher-affiliation | adminOnly |

### 3. 학술 활동
| 라벨 | href | 플래그 |
|---|---|---|
| 활동 총괄 | /console/academic/manage | |
| 세미나 | /console/academic/seminars | |
| 프로젝트 | /console/academic/projects | |
| 스터디 | /console/academic/studies | |
| 대외 학술대회 | /console/academic/external | |
| 모임·네트워킹 | /console/networking | |
| 해커톤 운영 | /console/hackathon | |
| 수요 조사 집계 | /console/demand | |
| 활동 신청 승인 | /console/academic/applications | adminOnly |

### 4. 학사
| 라벨 | href | 플래그 |
|---|---|---|
| 수강과목 마스터 | /console/courses | |
| 졸업요건 | /console/graduation | |
| 연구활동 | /console/research | |
| 학회비 | /console/fees | |
| 발급 문서 | /console/academic/certificates | |
| 인지디딤판 | /console/steppingstone | |
| 학기별 로드맵 | /console/roadmap | |
| 논문 심사 연습 | /console/grad-life/thesis-defense | |
| **[접기 "관리 도구"]** 심사 질문 템플릿 | /console/grad-life/thesis-defense-templates | adminOnly |
| 〃 활동 이력 | /console/grad-life/positions | |

### 5. 콘텐츠·아카이브 (그룹 상시항목 없음 · 서브섹션만)
| 서브섹션 | 라벨 | href |
|---|---|---|
| [콘텐츠] | 게시글 | /console/posts |
| 〃 | 학회보 | /console/newsletter |
| 〃 | 학회지 운영 | /console/journal |
| 〃 | 카드뉴스 | /console/card-news |
| 〃 | 축하카드 | /console/celebration-card |
| 〃 | 콘텐츠 초안함 (badge=contentDraftCount) | /console/content-drafts |
| 〃 | 러닝 가이드 | /console/learning-guides |
| 〃 | 팝업 공지 | /console/popups |
| [아카이브] | 아카이브 홈 | /console/archive |
| 〃 | 연구방법 가이드 | /console/archive/research-methods |
| 〃 | 통계방법 가이드 | /console/archive/statistical-methods |
| 〃 | 기초 용어 가이드 | /console/archive/foundation-terms |
| 〃 | 학술 글쓰기 가이드 | /console/archive/writing-tips |
| 〃 | 핵심 개념 | /console/archive/concepts |
| 〃 | 연구 변인 | /console/archive/variables |
| 〃 | 측정 도구 | /console/archive/measurements |
| **[접기 "콘텐츠 갭"]** | 콘텐츠 갭 | /console/archive/content-gaps |

### 6. AI & 자동화
| 라벨 | href |
|---|---|
| AI 포럼 운영 | /console/ai-forum |
| 챗봇 설정 | /console/ai |
| AI 에이전트 관리 | /console/agents |
| 에이전트 워크플로우 | /console/agent-workflows |
| 에이전트 작업 보드 | /console/agent-board |

### 7. 시스템 (presidentOnly)
| 라벨 | href | 플래그 |
|---|---|---|
| 사이트 설정 | /console/settings | |
| 학사일정 | /console/academic-calendar | |
| 감사로그 | /console/audit-log | |
| Cron 이력 | /console/cron-logs | adminOnly |
| 실험실 | /console/labs | |

## 3. 라벨 수정 반영
- "회원/문의" → **"회원"**
- "학술활동 대시보드" → **"활동 총괄"**
- "신청 승인 대시보드" → **"활동 신청 승인"**
- "교사 affiliation 분리" → **"교사 소속 분리"**
- "활동 이력 (전공대표·조교·학회)" → **"활동 이력"**
- "Cron 실행 이력" → **"Cron 이력"**
- "인지디딤판" 유지.

## 4. SidebarGroup 확장 내역

- **타입**: `NavGroup`에 `subsections?: NavSubsection[]` 추가. `NavSubsection = { label; items: NavItem[]; collapsed?: boolean }` (스펙 지정 형태 준수).
  - `collapsed: true` → 파선 border(`border border-dashed`) + `bg-muted/30` 접기 영역, **기본 접힘**. URL이 서브섹션 항목과 일치하면 자동 펼침.
  - `collapsed` 미지정 → 라벨 구분 헤더(항상 펼침, 접기 토글 없음). 콘텐츠/아카이브 2개 구분에 사용.
- **`NavItemLink` 컴포넌트 신설**: 그룹·서브섹션 공통 링크 렌더(active 하이라이트·badge 로직 단일화, 기존 스타일 그대로 이관).
- **`SidebarSubsection` 컴포넌트 신설**: collapsed 여부에 따라 접기 박스 / 라벨 헤더 분기. 빈 항목이면 `null` 반환(방어 가드).
- **`SidebarGroup` 수정**: 그룹 open 판정(`isAnyActive`)을 상시항목 + 모든 서브섹션 항목을 합친 `allItems` 기준으로 계산 → 서브섹션 항목이 활성일 때 **그룹도 자동 열림**. 상시항목/서브섹션 각각 렌더.
- **필터 로직**: 기존 adminOnly/presidentOnly 플래그 유지. 서브섹션 항목에도 adminOnly 필터 적용, **빈 서브섹션 숨김**. 그룹 표시 조건을 `items.length>0 || subsections.length>0`으로 확장(상시항목 없는 콘텐츠·아카이브 그룹 표시 보장).
- **모바일 탭바**: flatMap 로직을 `[...g.items, ...subsections.flatMap(items)]`로 확장 — 서브섹션 항목도 flat 하게 포함.
- **보존**: 배지(pendingCount·unansweredCount·feedbackNewCount·contentDraftCount)·ReviewQueueBanner·검수큐(archiveDraftCount·isPendingReview held 제외) 로직 전부 무변경. 기존 아코디언 open/close 동작 패턴 동일 유지.
- **raw color 미도입**: 기존 토큰(`muted-foreground`, `bg-muted/30`, `border` 기본색, `primary`, `destructive`)만 사용.

## 5. tsc / eslint 결과

```
cd C:\work\yonsei-edtech
npx tsc --noEmit          → EXIT 0 (에러 0)
npx eslint src/app/console/layout.tsx → EXIT 0 (에러/경고 0)
```

- next build 미실행(.next/lock 회피, 지시대로).
- 커밋/배포 없음 — 메인 게이트에서 최종 검증 후 진행.
