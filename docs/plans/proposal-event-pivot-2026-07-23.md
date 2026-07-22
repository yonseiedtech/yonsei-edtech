# 연구 계획 발표회 전환 설계 (2026-07-23)

> **8/22 행사**: 에듀테크 해커톤 → 연구 계획 발표회 (`eventMode: "proposal"`) 전환  
> **원칙**: 기존 hackathon 코드 경로 100% 보존, `eventMode` 스위치로 분기

---

## 1. 변경 파일 목록

| 파일 | 변경 내용 |
|---|---|
| `src/types/comm-board.ts` | `CommQuestion.proposal?: { title, topic, design }` 필드 추가 |
| `src/features/hackathon/config.ts` | `EventMode` 타입, `HACKATHON_DEFAULT_EVENT_MODE`, `PROPOSAL_EVENT`, `PROPOSAL_PHASE_LABELS/DESCRIPTIONS`, `getPhaseLabel/Description()` 추가 |
| `src/features/internal-conference/conferences.ts` | `HackathonSettings.eventMode?: EventMode` 추가, 레지스트리 첫 행사 → proposal 기본값 |
| `src/features/hackathon/useHackathonEvent.ts` | `ResolvedHackathonEvent.eventMode` 추가, CONFIG_DEFAULTS proposal 조건부 |
| `src/features/hackathon/HackathonPhaseTimeline.tsx` | `getPhaseLabel/Description()` 사용, `useHackathonEvent` 연결 |
| `src/features/hackathon/HackathonBoard.tsx` | proposal 3필드 폼, 연구 보드 제목, 팀 필터 숨김, 카드 제목/주제 레이아웃, 합류 버튼 숨김, 비회원 폼 proposal 분기 |
| `src/app/api/hackathon/guest-apply/route.ts` | `proposal` 필드 파싱·저장, 검증 분기 |
| `src/app/console/hackathon/page.tsx` | `EventSettingsForm.eventMode`, `buildEventSettingsForm`, `handleSave`, 행사 모드 선택 UI |

---

## 2. EventMode 해상 순서 (폴백 체인)

```
Firestore site_settings.hackathonSettings.eventMode
  → HACKATHON_DEFAULT_EVENT_MODE (현재: "proposal")
```

- Firestore 레코드가 이미 존재하고 `eventMode` 필드가 없으면 → `"proposal"` 폴백 즉시 적용
- 운영진이 콘솔 행사 설정 탭 → [연구 계획 발표회] 선택 → 저장 → Firestore 레코드 확정

---

## 3. 행사 모드별 동작 차이

| 항목 | hackathon | proposal |
|---|---|---|
| 신청 폼 | 문제 텍스트(140자) + 팀 참여 희망 + 관심영역 | 연구 제목(100자) + 주제·배경(300자) + 설계·방법(500자) |
| 비회원 폼 | 동일 hackathon 구조 | 동일 proposal 구조 |
| 보드 제목 | 아이디어 보드 | 연구 보드 |
| 필터 탭 | 팀 희망 + 영역 | 영역 없음 (전체만) |
| 카드 레이아웃 | body 텍스트 + 설문 칩 | title bold + topic 2-line clamp |
| 팀 희망 칩 | 표시 | 숨김 |
| 합류 희망/신청 버튼 | 표시 | 숨김 |
| 합류자 칩 | 표시 | 숨김 |
| 팀 확정 섹션 | 표시 | 숨김 |
| 온보딩 안내 | 표시 | 숨김 |
| 단계 레이블 | 참가 접수/산출물 제출/심사/수상 발표 | 참가 접수/프로포절 제출/심사(피드백)/우수 발표 |

---

## 4. CommQuestion 저장 구조 (proposal 모드)

```ts
{
  body: "${propTitle}",             // body는 필터 호환 유지
  proposal: {
    title: "연구 제목 ≤100자",
    topic: "주제·배경 ≤300자",
    design: "설계·방법 ≤500자",
  }
}
```

- `body` 는 역호환: 카드에서 `entry.proposal?.title ?? displayBody` 순으로 표시
- area tag는 proposal 모드에서 게스트 폼에서 미노출 → areaTag null → body = rawTitle

---

## 5. Firestore rules 수정안

기존 `comm_questions` 도큐먼트 write 규칙에서 `proposal` 필드를 허용해야 합니다.
현재 rules에 특정 필드 제한이 없다면 추가 수정 불필요.
만약 field-level 허용 목록이 있다면 아래 필드를 추가:

```firestore
// comm_questions create/update 규칙에 proposal 필드 허용
allow create: if request.resource.data.keys().hasOnly([
  ...,
  "proposal"   // ← 추가
]);
```

> 직접 확인 후 `firestore.rules` 적용 필요. 이 파일에서는 수정하지 않음.

---

## 6. 콘솔 운영 절차

1. `/console/hackathon` → **행사 설정** 탭 이동
2. **행사 모드** 섹션에서 [연구 계획 발표회] 버튼 선택
3. 필요 시 제목·소개 문구도 수정
4. **저장** 클릭 → Firestore site_settings 갱신
5. 공개 페이지 새로고침 → proposal 모드 즉시 반영

---

## 7. 제약 조건 준수 확인

- git add/commit/push: 미실행 (메인이 게이트)
- firestore.rules 직접 수정: 미실행 (수정안만 §5에 기록)
- 신규 컬렉션 추가: 없음 (comm_questions 재사용)
- raw color: 없음 (Tailwind semantic token만 사용)
- eslint 경고 273 유지: 신규 코드는 기존 패턴 준수
- tsc 0 에러: 검증 중

---

_작성: executor (2026-07-23)_
