# Agent Workflow — 에이전트 워크플로우 관리 시스템

## 1. 개요

연세교육공학회 관리자 페이지에 **AI 에이전트 워크플로우 관리 콘솔**을 추가한다.
AI 학회장 외에 AI 콘텐츠 에디터, AI 사무총장 등 다수의 전문 에이전트를 등록하고,
웹 UI에서 업무를 할당·모니터링·결과 확인할 수 있는 풀 관리 시스템을 구축한다.

**핵심 아키텍처**: 웹사이트(Vercel) → 로컬 Python 서버(FastAPI) → 에이전트 실행
- 에이전트 로직은 사용자 PC의 로컬 Python 서버에서 실행
- API 비용만 발생 (Vercel 10초 제한 회피, 장시간 작업 가능)
- 웹 관리자 페이지에서 에이전트 상태 확인, 업무 할당, 결과 조회

## 2. 목표

- 관리자 페이지에 "에이전트" 탭 추가 (풀 관리 콘솔)
- 에이전트 CRUD: 추가/수정/삭제, 프롬프트 편집
- 워크플로우 빌더: 에이전트 간 시각적 업무 연결
- 작업(Task) 할당 및 실행 모니터링
- 실행 로그 및 결과물 확인
- 로컬 Python 서버와의 안전한 통신

## 3. 에이전트 정의

### 3.1 기본 에이전트 (프리셋)

| 에이전트 | 역할 | 주요 업무 |
|----------|------|-----------|
| **AI 학회장** | 총괄 오케스트레이터 | 학회 운영 질의응답, 업무 분배, 의사결정 지원 |
| **AI 콘텐츠 에디터** | 콘텐츠 생성/편집 | 보도자료, SNS 포스팅, 뉴스레터 초안, 세미나 요약 |
| **AI 사무총장** | 행정/자동화 | 문의 분류·답변, 회원 승인 알림, 세미나 리마인더, 회의록 정리 |
| **AI 데이터 분석관** | 데이터 분석 | 회원 통계, 세미나 참석률 분석, 문의 트렌드 리포트 |

### 3.2 에이전트 데이터 모델

```typescript
interface Agent {
  id: string;
  name: string;
  role: string;           // 역할 설명
  avatar: string;         // 아이콘/이모지
  systemPrompt: string;   // 시스템 프롬프트
  tools: string[];        // 사용 가능한 도구 목록
  model: "fast" | "quality";  // 모델 선택
  status: "idle" | "running" | "error";
  isPreset: boolean;      // 프리셋 여부 (삭제 불가)
  createdAt: string;
  updatedAt: string;
}
```

## 4. 작업(Task) 시스템

### 4.1 작업 데이터 모델

```typescript
interface AgentTask {
  id: string;
  agentId: string;
  title: string;
  description: string;    // 상세 지시사항
  type: "content" | "analysis" | "automation" | "document";
  status: "pending" | "running" | "completed" | "failed";
  input: Record<string, unknown>;   // 입력 데이터 (세미나ID 등)
  output?: string;        // 결과물 (마크다운)
  error?: string;         // 에러 메시지
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
}
```

### 4.2 작업 유형별 예시

| 유형 | 에이전트 | 작업 예시 |
|------|---------|----------|
| content | 콘텐츠 에디터 | "3월 세미나 보도자료 작성해줘" |
| content | 콘텐츠 에디터 | "이번 달 뉴스레터 초안 만들어줘" |
| analysis | 데이터 분석관 | "2026년 1분기 세미나 참석률 분석" |
| analysis | 데이터 분석관 | "미답변 문의 트렌드 리포트" |
| automation | 사무총장 | "대기 중인 문의 3건 자동 답변" |
| automation | 사무총장 | "다음 주 세미나 참석자에게 리마인더 발송" |
| document | 사무총장 | "3월 운영회의 회의록 정리" |

## 5. 아키텍처

### 5.1 전체 구조

```
┌─────────────────────────┐     HTTP/SSE      ┌──────────────────────┐
│  Vercel (웹사이트)        │  ◄──────────────► │  로컬 Python 서버     │
│                          │                    │  (FastAPI)            │
│  관리자 페이지             │   POST /tasks     │                      │
│  ├─ 에이전트 목록          │  ──────────────►  │  에이전트 실행 엔진    │
│  ├─ 작업 할당 UI          │                    │  ├─ Gemini API       │
│  ├─ 실행 모니터링         │   SSE /stream     │  ├─ Firestore 접근    │
│  └─ 결과 확인            │  ◄──────────────── │  └─ 도구 실행         │
└─────────────────────────┘                    └──────────────────────┘
```

### 5.2 통신 방식

1. **웹 → 로컬 서버**: 관리자가 로컬 서버 URL을 설정 (기본 `http://localhost:8400`)
2. **인증**: 공유 시크릿 토큰 (`.env.local`에 저장, 서버 시작 시 표시)
3. **작업 할당**: `POST /api/tasks` → 로컬 서버가 에이전트 실행
4. **실시간 모니터링**: SSE(Server-Sent Events)로 실행 상태 스트리밍
5. **결과 저장**: 로컬 서버가 Firestore에 직접 저장 (Admin SDK)

### 5.3 로컬 서버 불가 시 폴백

로컬 서버 연결 실패 시 → 기존 AI 학회장 채팅으로 안내
("로컬 에이전트 서버가 꺼져 있습니다. AI 학회장 채팅을 이용해주세요.")

## 6. 관리자 UI 구성

### 6.1 에이전트 탭 (AdminAgentTab)

```
┌─────────────────────────────────────────────┐
│ 🤖 에이전트                    [+ 에이전트 추가] │
│                                              │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐      │
│ │ 🎓 학회장  │ │ ✍️ 에디터  │ │ 📋 사무총장 │      │
│ │ ● 대기 중  │ │ ● 실행 중  │ │ ● 대기 중   │      │
│ │ 작업 3건  │ │ 작업 1건   │ │ 작업 5건    │      │
│ └──────────┘ └──────────┘ └──────────┘      │
│                                              │
│ ─── 최근 작업 ──────────────────────────────  │
│ ✅ [콘텐츠 에디터] 3월 세미나 보도자료    2분 전  │
│ 🔄 [사무총장] 미답변 문의 자동 답변     실행 중   │
│ ✅ [데이터 분석관] 1분기 참석률 분석    1시간 전  │
│                                              │
│ ─── 새 작업 할당 ───────────────────────────  │
│ 에이전트: [콘텐츠 에디터 ▼]                      │
│ 작업: [                                    ] │
│ [세미나 선택 ▼]           [작업 할당 →]         │
└─────────────────────────────────────────────┘
```

### 6.2 에이전트 상세/편집 다이얼로그

- 이름, 역할, 아바타 수정
- 시스템 프롬프트 편집 (textarea)
- 사용 가능 도구 토글
- 모델 선택 (fast/quality)
- 작업 이력 목록
- 삭제 (프리셋은 비활성)

### 6.3 작업 결과 다이얼로그

- 작업 제목/설명
- 실행 시간
- 결과물 (마크다운 렌더링)
- 복사 버튼
- Firestore 저장 여부

### 6.4 워크플로우 빌더 (Phase 2)

복수 에이전트 순차/병렬 실행을 시각적으로 구성하는 기능.
Phase 1에서는 단일 에이전트 작업 할당만 지원하고,
워크플로우 빌더는 후속 단계에서 추가한다.

## 7. 로컬 Python 서버

### 7.1 기술 스택

- **FastAPI** + **uvicorn** (비동기 HTTP 서버)
- **google-genai** (Gemini API)
- **firebase-admin** (Firestore 접근)
- **SSE**: `sse-starlette` (실시간 스트리밍)

### 7.2 API 엔드포인트

| Method | Path | 설명 |
|--------|------|------|
| GET | `/health` | 서버 상태 확인 |
| GET | `/agents` | 에이전트 목록 |
| POST | `/agents` | 에이전트 추가 |
| PUT | `/agents/{id}` | 에이전트 수정 |
| DELETE | `/agents/{id}` | 에이전트 삭제 |
| POST | `/tasks` | 작업 할당 (에이전트 실행) |
| GET | `/tasks` | 작업 목록 |
| GET | `/tasks/{id}` | 작업 상세 (결과 포함) |
| GET | `/tasks/{id}/stream` | SSE 실행 스트리밍 |

### 7.3 디렉토리 구조

```
agent-server/
├── main.py              # FastAPI 앱 + 라우터
├── agents/
│   ├── base.py          # BaseAgent 클래스
│   ├── content.py       # 콘텐츠 에디터
│   ├── secretary.py     # 사무총장
│   └── analyst.py       # 데이터 분석관
├── tools/
│   ├── firestore.py     # Firestore 조회/저장 도구
│   ├── content.py       # 콘텐츠 생성 도구
│   └── notification.py  # 알림 발송 도구
├── config.py            # 설정 (API 키, 모델 등)
├── requirements.txt
└── README.md            # 설치/실행 가이드
```

### 7.4 실행 방법

```bash
cd agent-server
pip install -r requirements.txt
# .env에 GOOGLE_GENERATIVE_AI_API_KEY, FIREBASE_SERVICE_ACCOUNT_KEY 설정
uvicorn main:app --port 8400
```

## 8. 구현 순서 (Phase 1)

| 단계 | 작업 | 예상 파일 |
|------|------|----------|
| 1 | 로컬 Python 서버 기본 구조 | `agent-server/` 전체 |
| 2 | 에이전트 CRUD API | `agent-server/main.py` |
| 3 | 작업 실행 엔진 (단일 에이전트) | `agent-server/agents/base.py` |
| 4 | 프리셋 에이전트 3종 구현 | `agent-server/agents/*.py` |
| 5 | 관리자 에이전트 탭 UI | `src/features/admin/AdminAgentTab.tsx` |
| 6 | 에이전트 목록/상태 카드 | `src/features/agent/AgentCard.tsx` |
| 7 | 작업 할당 UI | `src/features/agent/TaskAssignForm.tsx` |
| 8 | SSE 실시간 모니터링 | `src/features/agent/useAgentStream.ts` |
| 9 | 작업 결과 다이얼로그 | `src/features/agent/TaskResultDialog.tsx` |
| 10 | 에이전트 편집 다이얼로그 | `src/features/agent/AgentEditDialog.tsx` |
| 11 | 관리자 페이지 탭 추가 | `src/app/admin/page.tsx` 수정 |
| 12 | 로컬 서버 연결 설정 UI | `src/features/agent/ServerConnectionCard.tsx` |

## 9. Phase 2 (후속)

- 워크플로우 빌더 (에이전트 간 순차/병렬 실행 시각적 구성)
- 스케줄러 (크론 기반 자동 실행)
- 에이전트 간 컨텍스트 공유
- 실행 통계 대시보드
- 에이전트 마켓플레이스 (커뮤니티 공유)

## 10. 제약 사항

- 로컬 서버는 관리자 PC에서만 실행 → 관리자가 PC를 켜놓아야 함
- Gemini API 비용 발생 (Flash 모델 기본)
- Firestore 쓰기 작업은 신중하게 (자동화 에이전트의 실수 방지를 위한 확인 단계 필요)
- 보안: 로컬 서버 접근은 공유 시크릿 토큰으로 보호, localhost 외 접근 차단

## 11. 검증 기준

1. 관리자 페이지에서 에이전트 탭 접근 가능
2. 로컬 서버 연결 상태 표시 (연결됨/끊어짐)
3. 에이전트에 작업 할당 → 실행 → 결과 확인 가능
4. SSE로 실행 중 실시간 상태 업데이트
5. 에이전트 추가/수정/삭제 가능
6. 프리셋 에이전트 프롬프트 편집 가능
7. 로컬 서버 미연결 시 graceful fallback
