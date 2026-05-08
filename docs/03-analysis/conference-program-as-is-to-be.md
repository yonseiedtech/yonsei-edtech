# 학술대회 프로그램 페이지 — As-Is / To-Be 정리

> **작성일**: 2026-05-08
> **대상**: `/activities/external/[id]/program` (+ `/qr` `/checkin` `/roundup`)
> **참조**:
> - [Claude designer 단독](./conference-program-uiux-claude.md)
> - [Codex × Claude 통합](./conference-program-synthesis.md)

본 문서는 두 모델의 분석 결과를 **As-Is(현재 상태) / To-Be(개선 후 상태)** 측면에서 14개 영역으로 정리한 것입니다.

---

## A. 보안·권한 (Security)

### A1. QR 발급 페이지 권한
| | As-Is | To-Be |
|---|-------|-------|
| 권한 | **로그인만 요구**, 모든 회원이 QR 보드 접근 가능 | `staff` 이상 운영진만 접근 |
| 위치 | `qr/page.tsx:49` (단순 AuthGuard) | AuthGuard 에 `allowedRoles=["staff","president","admin"]` |
| 위험 | 일반 회원이 QR 캡처·재생산·악용 가능 | 운영진 전용 가드로 차단 |

### A2. 체크인 토큰 보안
| | As-Is | To-Be |
|---|-------|-------|
| 토큰 형식 | `yet-conf:programId:sessionId` **평문** | HMAC 서명 + 만료 timestamp |
| 발급 | 클라이언트에서 `qrcode.react`로 즉시 생성 | 서버 API (`/api/conference/checkin/token`) 가 서명 발급 |
| 검증 | 클라이언트에서 형식만 검사 | 서버에서 서명·만료·세션 일치 검증 |
| 결과 | QR 이미지 캡처·공유로 무한 재사용 | 서명 만료 시 거부, 재발급 필요 |

### A3. 참석(attended) 무결성
| | As-Is | To-Be |
|---|-------|-------|
| 전환 트리거 | **수동 후기 저장 시** 자동 attended 처리 (`View.tsx:258`) | QR 스캔 또는 운영진 확인 only |
| 결과 | 실제 참석 안 해도 attended 기록 가능 | 통계·인증 신뢰성 확보 |
| 후기 작성 | attended 가 아니어도 후기 저장 가능 | attended=true 인 세션만 후기 작성 가능 |

---

## B. 데이터 정합성 (Data Sync)

### B1. 데이터 페칭 패턴
| | As-Is | To-Be |
|---|-------|-------|
| 패턴 | 컴포넌트마다 `useEffect` + `useState` 직접 fetch | React Query `useQuery` 일괄 적용 |
| 캐시 | 없음 — 페이지 이동마다 재요청 | queryKey 표준화, staleTime/gcTime 적용 |
| 무효화 | 수동 setState — 누락 가능 | `queryClient.invalidateQueries` |
| 적용처 | View / Stats / Roundup / MyConferenceSessions 4곳 | 동일 hook 공유 |

### B2. allPlans 즉시 갱신
| | As-Is | To-Be |
|---|-------|-------|
| 동작 | 세션 선택 시 `plans`만 갱신, `allPlans`(타인 포함)은 stale (`View.tsx:195`) | mutation 후 `allPlans` 도 invalidate or upsert |
| 영향 | "함께 참석 N명" 카운트가 본인 추가 직후 틀림 | 즉시 정확한 카운트 |

### B3. URL/State 동기화
| | As-Is | To-Be |
|---|-------|-------|
| day 탭 | local state, 새로고침/공유 시 1일차로 리셋 | `?day=N` searchParam 동기화 |
| view 모드 (일자/발표자) | local state | `?view=day|speaker` |
| 필터 | local state | `?category=&track=` |
| 공유성 | 특정 일자 링크 공유 불가 | URL 만으로 컨텍스트 복원 |

---

## C. 시각 위계·UI (Visual Hierarchy)

### C1. 세션 카드 위계
| | As-Is | To-Be |
|---|-------|-------|
| keynote | 표준 카드 (`Card p-4`) — break 와 동일 외형 | **Primary variant** — 좌측 4px 컬러 바 + 약한 배경 틴트 + `text-lg` 제목 + shadow |
| paper / poster / workshop | 표준 카드 | **Standard variant** (현재와 유사) |
| break / networking | 표준 카드 | **Compact variant** — `py-2` + 텍스트만 |
| 효과 | 모든 세션이 같은 무게 — 시간표 스캔 어려움 | 학회 프로그램북처럼 위계 시각화 |

### C2. 카드 정보 레이아웃
| | As-Is | To-Be |
|---|-------|-------|
| 구조 | 카테고리 배지 + 트랙 배지 + 시간 + 위치 + 상태 + 동행 + 충돌 — `flex-wrap` 한 행에 무순서 | **2행 + 좌측 시간 컬럼** (60-80px font-mono): `[시간] [제목] / [발표자·소속·장소] / [배지: 카테고리|트랙|상태]` |
| 시간 표시 | 배지 안 텍스트로 묻힘 | 좌측 고정 컬럼 → 시간 흐름 시각 리듬 (Sched/Whova 패턴) |
| 모바일 | 배지 2~3행 줄바꿈, 시선 파편화 | 명확한 그리드 |

### C3. 시간 충돌 시각화
| | As-Is | To-Be |
|---|-------|-------|
| 표시 | `AlertTriangle 시간 충돌 N` 작은 배지 1개 | 카드 우측 세로 줄무늬 또는 `ring-2 ring-rose-400/50` 테두리 |
| 상세 | 충돌 세션이 무엇인지 카드 내 표시 안 함 | "충돌: [세션명] [시간]" 형식 클릭 가능 링크 |
| 인지 속도 | 배지 발견 후 다른 카드 찾아야 함 | 즉각 시각 인지 + 1클릭 점프 |

---

## D. 모바일·시간 컨텍스트

### D1. Sticky 헤더
| | As-Is | To-Be |
|---|-------|-------|
| 일자 탭 | 비-sticky, 스크롤 시 사라짐 | `position: sticky; top:0` — 컨텍스트 보존 |
| 모바일 효과 | 스크롤 중 "어느 일자였지?" 혼란 | 항상 "1일차 · 2026-05-09" 표시 |

### D2. Now-line · 진행 중 인디케이터
| | As-Is | To-Be |
|---|-------|-------|
| 현재 시각 표시 | 없음 | 시간축에 가로 라인 (now-line) |
| 진행 중 세션 | 강조 없음 | 초록 점멸 인디케이터 |
| 지난 세션 | 동일 색 | `opacity-60` |

---

## E. 다크 모드·토큰 시스템

### E1. 카테고리 색상
| | As-Is | To-Be |
|---|-------|-------|
| 정의 | `CONFERENCE_SESSION_CATEGORY_COLORS` (`academic.ts:152`) — light only (`bg-purple-100 text-purple-800`) | 각 카테고리에 dark 변형 추가 (`dark:bg-purple-900/40 dark:text-purple-200`) |
| SEMANTIC 연계 | 회의 컴포넌트가 `design-tokens.ts` SEMANTIC 미사용 | 상태 배지는 SEMANTIC.info/warning/danger 활용 |
| 다크 모드 | 명암비 역전 위험 | WCAG AA 대비 보장 |

### E2. QR 코드 색상
| | As-Is | To-Be |
|---|-------|-------|
| `fgColor` | `"#0a2e6c"` 하드코딩 | CSS variable (`--qr-fg`) — 라이트는 어두운 색 / 다크는 밝은 색 |
| 다크 배경 | 어두운 QR + 어두운 배경 → 스캔 불가 위험 | 자동 대비 |

---

## F. 컴포넌트 시스템

### F1. SessionCard 추상화
| | As-Is | To-Be |
|---|-------|-------|
| 위치 | `ConferenceProgramView.tsx` 내부 inline `.map()` | `features/conference/SessionCard.tsx` 신규 |
| 재사용 | View / Stats / Roundup 3곳에 비슷한 패턴 복제 | 단일 컴포넌트 — 변경 1번이면 전체 반영 |
| variant prop | 없음 | `priority="primary" | "standard" | "compact"` (E1과 연계) |

### F2. Stat 헬퍼
| | As-Is | To-Be |
|---|-------|-------|
| 위치 | View 와 Roundup 에 **동일한 함수가 별도 정의** | `features/conference/Stat.tsx` 공유 |
| 변경 비용 | 두 곳 모두 수정 필요 | 한 곳 수정 |

### F3. EmptyState
| | As-Is | To-Be |
|---|-------|-------|
| 적용 | View 의 빈 상태는 직접 작성한 `div + 아이콘 + p` | 기존 `EmptyState` 컴포넌트 통일 |
| 운영진 추가 액션 | 없음 | `actions=[{label:"프로그램 등록", href:"./edit"}]` |

---

## G. UX 흐름

### G1. 세션 선택 마찰
| | As-Is | To-Be |
|---|-------|-------|
| 선택 방식 | 즉시 추가 X — 이유 입력 모달(Dialog) 거침 (`View.tsx:165`) | 1차 클릭 = 즉시 plan 등록 / 이유 입력은 옵션 (별도 편집) |
| 마찰 | 모바일에서 한 번 더 탭 + 입력 | 빠른 추가, 추가 후 inline 편집 가능 |

### G2. 즐겨찾기 vs 참석 계획 분리
| | As-Is | To-Be |
|---|-------|-------|
| 모델 | 단일 `UserSessionPlan` (`planned/attended/skipped`) | `bookmarked` 별도 sub-status 또는 별도 `UserSessionBookmark` 모델 |
| 사용 시나리오 | "관심 있지만 참석 미정" 표현 불가 | 가벼운 마크(찜) ↔ 본격 계획(planned) 구분 |

### G3. QR 체크인 후 후기 prompt
| | As-Is | To-Be |
|---|-------|-------|
| 흐름 | 체크인 성공 → 페이지에 토스트만 → 사용자가 직접 program 페이지 가서 후기 작성 | 체크인 성공 → 즉시 후기 모달 또는 "지금 후기 작성" CTA |

### G4. 라운드업 작성자 노출
| | As-Is | To-Be |
|---|-------|-------|
| 노출 | 작성자 이름 직접 표시 (`Roundup.tsx:218`) | 익명 / 실명 / 회원만 공유 옵션 (`reviewVisibility` 필드) |
| 영향 | 후기 작성 망설임 가능 | 더 솔직한 후기 |

### G5. PDF 비공개 메모
| | As-Is | To-Be |
|---|-------|-------|
| 출력 | 이유·메모·후기 모두 포함 — 경고 없음 | 출력 전 다이얼로그 — "비공개 메모 포함하시겠습니까?" 옵션 |
| 위험 | 인쇄·공유 시 의도치 않은 노출 | 사용자 명시 동의 |

---

## H. 운영 리포팅

### H1. 체크인 피드백
| | As-Is | To-Be |
|---|-------|-------|
| 성공 | 토스트 한 번 | 진동 + 음향 + 큰 시각 피드백 (모바일) |
| 실패 | 토스트만 | 명확한 오류 메시지 + 재시도 버튼 |
| 중복 체크인 | 일반 오류처럼 처리 | "이미 체크인됨" 별도 안내 |

### H2. 조회 오류 surface
| | As-Is | To-Be |
|---|-------|-------|
| 패턴 | `try{...}finally{setLoading(false)}` (`Scanner:56`, `QrBoard:31`) — catch 없음 | error state + 재시도 버튼 |
| 디버깅 | 실패 원인 사라짐 | 원인 표시 + 사용자 행동 가이드 |

### H3. 별점 접근성
| | As-Is | To-Be |
|---|-------|-------|
| ARIA | `aria-label`만 (`View:853`) | `aria-pressed` + `aria-label` |
| 영향 | 키보드/스크린리더에서 선택 상태 불명 | WCAG 준수 |

---

## I. PDF 디자인

### I1. 카테고리 색상 바
| | As-Is | To-Be |
|---|-------|-------|
| 표시 | 텍스트 배지만 (인쇄 시 회색조 가능) | 카드 좌측 1열에 카테고리 컬러 바 |
| 가독성 | 회색조 인쇄에서 카테고리 분간 어려움 | 색상 + 텍스트 이중 인코딩 |

---

## 통합 우선순위 요약

| 영역 | P0 (즉시) | P1 (1주 내) | P2 (1달 내) |
|------|-----------|-------------|-------------|
| **보안** | A1·A2·A3 | — | — |
| **시각 위계** | C1 | C2·C3, F1 | — |
| **데이터 정합** | — | B1·B2·B3 | — |
| **모바일 컨텍스트** | — | D1·D2 | — |
| **다크 모드** | — | E1·E2 | — |
| **컴포넌트 시스템** | — | F2·F3 | — |
| **UX 흐름** | — | G1·G2 | G3·G4·G5 |
| **운영 리포팅** | — | H2 | H1·H3 |
| **PDF** | — | — | I1 |

→ **P0 4건 → ~2일 (Phase 0)**
→ **P1 13건 → ~7일 (Phase 1+2)**
→ **P2 6건 → ~3일 (Phase 3)**

---

## 다음 단계

각 영역의 As-Is → To-Be 매핑이 명확해졌으므로, 사용자가 어느 영역부터 진입할지 결정하면 됩니다.

| 옵션 | 진입 범위 |
|------|-----------|
| **A** | Phase 0 (보안 P0 4건만) — ~2일 |
| **B** | Phase 0 + 1 (보안 + 정합성·컴포넌트·다크모드) — ~5일 |
| **C** | Quick Wins 7건 → Phase 0 — ~1일 + α |
| **D** | 전체 Phase 0~3 — ~15일 |
