# 해커톤 팀 빌딩 사전 설문 구현 보고서 (2026-07-22)

## 1. 실측 요약

### CommQuestion 스키마 (`src/types/comm-board.ts`)
- 기존: `hackathonSurvey` 필드 없음
- 변경: 옵셔널 중첩 객체 추가

```ts
hackathonSurvey?: {
  aiLiteracy?: 1 | 2 | 3 | 4 | 5;        // AI 리터러시 자기평가
  vibeCoding?: "none" | "tried" | "often"; // 바이브코딩 경험
  tools?: string[];                         // ChatGPT·Claude·Cursor·기타(자유 1개)
  strengths?: string[];                     // 기획·연구 / 디자인 / 개발 / 발표
};
```

### Firestore rules — comm_questions (firestore.rules:1538~1559)
- **필드 화이트리스트 없음** — update 규칙의 author/owner/staff 분기에 affectedKeys 제한 없음
- `hackathonSurvey` 추가 시 **rules 수정 불필요**
- count-only 분기(`hasOnly(['likeCount','answerCount','updatedAt'])`)는 별도라 영향 없음
- create 분기도 필드 제한 없음(boardId 접근 권한만 검사)

### HackathonDdayConsole.downloadParticipantsCsv
- 기존 escape 함수 경유 구조 확인 완료
- 수식 인젝션 방어 패턴: `=,+,-,@,탭,CR` 시작 셀에 `'` prefix

---

## 2. 변경 파일 목록

| 파일 | 변경 내용 |
|------|-----------|
| `src/types/comm-board.ts` | `CommQuestion`에 `hackathonSurvey?` 옵셔널 필드 추가 |
| `src/features/hackathon/HackathonBoard.tsx` | 설문 상수·헬퍼·state·UI·handleRegister·handleUpdate 수정 |
| `src/features/hackathon/HackathonDdayConsole.tsx` | CSV 헤더 4열 추가·escape 경유·설문 응답 요약 |
| `docs/plans/hackathon-survey-2026-07-22.md` | 이 보고서 |

---

## 3. HackathonBoard 구현 세부

### 상수 (모듈 레벨)
```ts
SURVEY_AI_LEVELS: Array<1|2|3|4|5>
SURVEY_VIBE_OPTIONS: { value: "none"|"tried"|"often"; label: string }[]
SURVEY_TOOL_PRESETS: string[]           // ChatGPT, Claude, Cursor
SURVEY_STRENGTH_OPTIONS: string[]       // 기획·연구, 디자인, 개발, 발표
VIBE_LABELS: Record<"none"|"tried"|"often", string>
```

### buildHackathonSurvey 헬퍼
- 모든 입력이 미선택이면 `undefined` 반환 → hackathonSurvey 필드 자체 생략
- 한 개라도 선택 시 해당 필드만 포함하는 객체 반환
- otherTool 텍스트는 trim 후 tools 배열 말단에 합산

### 신청 폼 (registration form)
- 팀 희망 아래 border-t 로 시각 분리
- ChevronDown 아이콘 회전으로 열림/닫힘 표시
- 미입력 상태 신청 가능 (button disabled 조건 변경 없음)
- 성공 시 설문 state 전체 초기화

### 수정 폼 (edit form)
- 연필 버튼 클릭 시 기존 hackathonSurvey 값으로 프리필
  - tools: TOOL_PRESETS 해당 항목 → editSurveyTools, 그 외 첫 항목 → editSurveyOtherTool
- collapse 없이 항상 펼쳐진 상태 (소급 입력 경로라 발견성 우선)
- handleUpdate payload에 항상 hackathonSurvey 포함 (undefined면 기존 값 보존)

### 아이디어 카드 칩
- 설문 없으면 렌더 안 함 (`entry.hackathonSurvey &&`)
- vibeCoding 칩 1개 (VIBE_LABELS 매핑)
- strengths 칩 최대 2개, 초과 시 `+N`
- 클래스: `bg-muted text-muted-foreground` (시맨틱 토큰, raw 색상 없음)

---

## 4. HackathonDdayConsole CSV 변경

### 헤더 (기존 → 변경)
```
이름,팀희망,아이디어,공감수,신청일
→
이름,팀희망,아이디어,공감수,신청일,AI리터러시,바이브코딩,도구,강점
```

### 설문 열 처리
- `AI리터러시`: 숫자 그대로, 미응답 시 빈 문자열
- `바이브코딩`: escape 함수 경유 (수식 인젝션 방어)
- `도구`: `join("/")` 후 escape 경유
- `강점`: `join("/")` 후 escape 경유
- 미응답 설문은 모두 빈 문자열

### 설문 응답 요약
- CSV 버튼 좌측에 "설문 응답 N/M" 한 줄 표시

---

## 5. 규율 체크리스트

- [x] raw 색상 미사용 — bg-muted, text-muted-foreground, border-border 등 시맨틱 토큰만
- [x] 신청 한 줄 철학 — 설문은 접이식·선택, 미입력 신청 가능
- [x] D-1 phase 게이트 무변경 — registrationOpen 조건 내에서만 렌더
- [x] 수식 인젝션 escape 함수 경유
- [x] firestore.rules 수정 불필요 (필드 화이트리스트 없음 확인)
- [x] 신규 컬렉션 없음 — comm_questions 기존 문서에 필드 추가만
