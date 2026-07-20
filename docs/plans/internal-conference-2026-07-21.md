# 대내 학술대회(미니 학술대회) 일반화 — 설계·마이그레이션·URL 정책

작성일: 2026-07-21 · 대상: yonsei-edtech
관련: `src/features/hackathon/**`, `src/app/hackathon/**`, `src/app/activities/**`, `src/app/console/hackathon/**`, `src/app/api/cron/hackathon-submission-reminder/**`

## 1. 배경·목표

현재 "에듀테크 해커톤 2026-08-22" 는 `src/features/hackathon/config.ts` 의 하드코딩 상수(제목·날짜·단계 일정·마감·FAQ) + 단일 `HACKATHON_CONTEXT_ID = "hackathon-2026-08-22"` 로 구현되어 있다. 모든 인프라(참가/아이디어 보드 `comm_boards`, 산출물 `hackathon_submissions`, 심사 `hackathon_judgings`, kudos, 제출 리마인더 cron)가 이 contextId 로 키잉된다.

목표: 해커톤을 **학회 "대내 학술대회(미니 학술대회)"** 의 한 유형으로 일반화하여
1. 학술활동 하위에 `/activities/internal` 목록 표면을 만들고 네비게이션(Header·BottomNav·활동 소개 카드)에 편입한다. 첫 행사로 해커톤이 나타난다.
2. 운영진이 새 미니 학술대회를 여러 개 운영할 수 있게 **행사 기반 모델**로 확장한다.
3. 기존 8/22 해커톤 데이터를 **무손실** 로 유지한다.
4. 당일 운영·심사 콘솔은 행사 선택 드롭다운을 갖는다(행사 1개면 자동 선택).

## 2. 핵심 결정 — contextId 보존 = 무손실

무손실의 관건은 **contextId 유지**다. 기존 데이터(참가 신청 `comm_questions`, 팀 합류 `hackathon_team_joins`, 산출물, 심사, kudos, push_logs)는 모두 `contextId = "hackathon-2026-08-22"` 로 저장돼 있다. 새 행사 모델의 첫 행사가 이 contextId 를 그대로 재사용하면 **데이터 이동(마이그레이션 코드)이 전혀 필요 없다.**

- 레지스트리 첫 행사 `slug = "hackathon-2026-08-22"`, `contextId = HACKATHON_CONTEXT_ID`(불변).
- `/hackathon` URL 및 cron, 콘솔, 8/22 홍보 링크가 계속 동작한다.

## 3. 데이터 모델

### 3.1 이번 증분(구현됨) — 코드 레지스트리

`src/features/internal-conference/conferences.ts` 에 타입 + `INTERNAL_CONFERENCES` 배열을 둔다. 첫 행사는 기존 `hackathon/config.ts` 상수를 **참조**(값 중복 없음)한다.

```ts
interface InternalConference {
  slug: string;          // URL·목록 식별자 (예: "hackathon-2026-08-22")
  contextId: string;     // 인프라 공유 키 — 무손실 매핑의 핵심
  kind: "hackathon" | "symposium";
  title, tagline, description: string;
  date: string;          // YYYY-MM-DD (D-day·정렬)
  dayLabel?, timeLabel?, place?: string;
  awardsAnnounceDate?: string;
  features: { ideaBoard; teams; submissions; judging; awards };  // 기능 토글
  hubHref: string;       // 허브 페이지 (레거시 8/22 = "/hackathon")
  status?: "upcoming" | "ongoing" | "completed";  // 미지정 시 date 로 자동 계산
}
```

헬퍼: `getConferenceBySlug`, `getConferenceByContextId`, `getCurrentConference(now)`(가장 가까운 예정 → 없으면 최근).

목록 `/activities/internal` 은 이 레지스트리를 렌더한다. **activities 컬렉션을 읽지 않는다** — 해커톤은 activities 문서가 아니므로 문서 기반으로 하면 빈 목록이 되어 요구(첫 행사로 해커톤 노출)를 위반한다.

### 3.2 다음 증분(계획) — 문서 기반 운영진 생성

운영진 UI 로 새 행사를 만들려면 Firestore 문서가 필요하다. 권장: **기존 `activities` 컬렉션 재사용, `type: "internal_conference"`**.

근거:
- `ActivityType` 에 `"internal_conference"` 추가 → `/api/activities`·ISR 프리패치·CRUD·목록 정렬 로직을 그대로 재사용.
- 대외(external)와 대칭: `/activities/external` 는 `type == "external"` 문서 목록, `/activities/internal` 은 `type == "internal_conference"` 문서 목록.

`activities` 문서에 대내 학술대회 전용 필드를 확장한다(모두 optional — 기존 문서 무영향):
```
contextId: string           // 미지정 시 slug 로 파생. 8/22 시드는 "hackathon-2026-08-22"
conferenceKind: "hackathon" | "symposium"
phaseSchedule: { registration; submission; judging; awards }  // 각 YYYY-MM-DD (startDate)
submissionDeadline: string  // ISO(KST) "YYYY-MM-DDTHH:mm"
features: { ideaBoard; teams; submissions; judging; awards }
awardsAnnounceDate: string
faq, timeline, highlights, interestAreas: 배열
```
현재 `config.ts` 의 `HACKATHON_PHASE_TIMELINE`·`HACKATHON_SUBMISSION_DEADLINE`·`HACKATHON_TIMELINE`·`HACKATHON_FAQ`·`HACKATHON_INTEREST_AREAS` 가 문서 필드로 승격된다. `resolveHackathonPhase*`·`isHackathonSubmissionClosed` 는 상수 대신 문서 필드를 인자로 받도록 시그니처를 확장(순수 함수 유지).

전용 심사 컬렉션(`hackathon_submissions`, `hackathon_judgings`, `hackathon_team_joins`)은 **그대로 유지**하고 `contextId` 로 행사별 확장한다(이미 스키마에 `contextId` 존재). 신규 컬렉션 불필요.

당일 운영 오버라이드(`site_settings` key `hackathon_ops`)는 **행사별 키**로 확장: `hackathon_ops__{contextId}`. 미존재 시 자동(날짜) 폴백.

### 3.3 마이그레이션 (문서 기반 전환 시)

무손실 절차:
1. `activities` 에 8/22 행사 문서 1건 시드(seed) — `type: "internal_conference"`, `contextId: "hackathon-2026-08-22"`, 나머지 필드는 현재 `config.ts` 값 복사. **기존 comm_boards/submissions/judgings/kudos 는 이미 이 contextId 라 이동 불필요.**
2. 해커톤 컴포넌트를 `contextId` 인자화(현재 상수 직접 참조 → props/route param). 첫 행사 contextId 가 동일하므로 렌더 결과 불변.
3. cron 을 행사 문서 순회로 일반화(아래 4.3). 8/22 만 있으면 동작 동일.
4. 검증 후 `config.ts` 상수는 시드 값의 원본으로만 남기거나 제거.

데이터 이동 SQL/스크립트: **없음**(contextId 보존이 전제).

## 4. URL 정책

| 경로 | 정책 |
| --- | --- |
| `/hackathon` | **유지**. 8/22 홍보 링크·cron `relatedLink`·알림 딥링크 보존. 현재(가장 가까운) 대내 행사 허브로 동작. 문서 기반 전환 시 `getCurrentConference().hubHref` 로 리다이렉트 또는 현행 페이지가 행사 문서를 읽도록 전환. |
| `/activities/internal` | 신규. 대내 학술대회 목록(레지스트리 → 향후 문서). 대외 `/activities/external` 미러. |
| `/activities/internal/[slug]` | **계획**. 행사별 허브. 8/22 은 `hubHref="/hackathon"` 로 매핑(중복 URL 회피). 신규 행사는 이 동적 경로 사용. |
| `/console/hackathon` | 유지. 행사 선택 드롭다운 추가(행사 1개면 자동). 문서 기반 전환 시 `/console/internal-conference` 로 리네이밍 검토. |

## 5. 콘솔

- **당일 운영·심사 콘솔**(`/console/hackathon`): 행사 선택 드롭다운. `INTERNAL_CONFERENCES.length <= 1` 이면 드롭다운 숨김(자동 선택). 선택된 `contextId` 로 산출물·심사 조회 키를 구성한다.
- 금지 영역 준수: `console/settings/**`·`admin/settings/**`·`console/layout.tsx` 사이드바 그룹 정의는 **미수정**. 대내 학술대회 메뉴 편입은 Header/BottomNav·활동 그룹 쪽만.

## 6. Cron 일반화 (계획)

`hackathon-submission-reminder` 는 현재 단일 `HACKATHON_CONTEXT_ID` 고정. 문서 기반 전환 시:
- `activities` 에서 `type == "internal_conference"` 이고 `features.submissions == true` 인 행사를 순회.
- 각 행사의 `submissionDeadline`·`awardsAnnounceDate` 기준으로 D-3/D-1/D-0 제출 리마인더 + 심사 정체 넛지를 발동.
- dedup 키에 contextId 포함(이미 `hackathon_submission_reminder_{userId}_{dayKey}` → `..._{contextId}_{userId}_{dayKey}` 로 확장).
- 이번 증분에서는 미변경(8/22 단일 행사로 정상 동작, contextId = 레지스트리 첫 행사와 동일).

## 7. 이번 증분 범위 (구현)

구현:
- `src/features/internal-conference/conferences.ts` — 레지스트리 + 타입 + 헬퍼(신규)
- `src/app/activities/internal/page.tsx` — 목록 표면(신규)
- `src/app/activities/page.tsx` — "대내 학술대회" 활동 카드 추가
- `src/components/layout/Header.tsx` — 학술 활동 그룹에 "대내 학술대회" 링크
- `src/components/layout/BottomNav.tsx` — 더보기에 "대내 학술대회"
- `src/app/console/hackathon/page.tsx` — 행사 선택 드롭다운(1개면 자동)

미변경(무손실·계획으로 이월): 해커톤 허브 컴포넌트·cron·types·config 상수·당일 운영 오버라이드 모델. 8/22 데이터·URL·알림 전부 보존.

향후(문서 기반): 3.2/3.3/4/6 항목 — activities `internal_conference` 문서화, 컴포넌트 contextId 인자화, `/activities/internal/[slug]`, cron 순회, ops 행사별 키.
