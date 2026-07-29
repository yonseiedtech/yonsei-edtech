# B2 — 게스트 이력 미리보기 → 가입 전환 강화 (구현 기록)

> 근거: `docs/plans/service-enhancement-plan-v19-acquisition.md` §B2
> 범위: `src/features/auth/signup-steps/GuestHistoryPreviewDialog.tsx` 단일 파일만 수정. 다른 executor와 병렬 작업이라 `next build` 미실행(지시에 따름).

## 변경 사항

### `src/features/auth/signup-steps/GuestHistoryPreviewDialog.tsx`

1. **가치 제안 박스 재프레이밍** (기존 `bg-primary/5` 안내문 → 강조 박스)
   - Before: "회원가입을 완료하시면 이 이력이 자동으로 회원 활동에 연동됩니다." (수동적 안내)
   - After: `ShieldCheck` 아이콘 + **"가입하면 이 {count}건이 그대로 지켜집니다."** 강조 문구 + "지금 입력하신 학번·이메일과 일치하는 기록이라, 남은 단계를 마치고 가입을 완료하면 위 이력이 자동으로 마이페이지 활동에 연동돼요." 부연.
   - 미리보기로 이미 보여준 이력 건수(`count`)를 "가입하면 지켜지는 것"으로 프레이밍(§B2 지시 반영).
   - `border-primary/20` 테두리 추가로 시각적 강조, 시맨틱 토큰만 사용(`bg-primary/5`, `text-primary`, `text-foreground`, `text-muted-foreground` — 신규 raw color 없음).

2. **전환 CTA 강화** (`DialogFooter` 버튼)
   - Before: `확인하고 계속` (모호한 확인 버튼 — 가치 제안 없음)
   - After: `UserPlus` 아이콘(기존 `StepNavigation.tsx`의 가입 완료 버튼과 동일 아이콘·스타일 패턴 재사용) + **"이 활동 저장하고 가입 이어가기"** — 활동 이력을 지키는 행동으로 CTA를 프레이밍. 모바일에서 `w-full`로 눈에 띄게 배치.
   - 버튼의 실제 동작(`onOpenChange(false)`)은 변경하지 않음 — 다이얼로그를 닫고 기존 가입 플로우(Step 3~4)를 그대로 이어간다. 무회귀.

3. **정확성 검증(중요 수정)**: 최초 초안에서 "여기서 닫으면 비회원 이력이 연결되지 않을 수 있습니다"라는 긴급성 문구를 넣었으나, `runSignupFlow.ts`(L152-183)·`guestLinker.ts`를 확인한 결과 **이력 연동은 다이얼로그 상호작용과 무관하게 최종 가입 제출 시 학번/이메일 매칭으로 자동 수행**됨을 확인. 사실과 다른 긴급성(다크패턴)을 만들 뻔해 제거하고, "학번·이메일 일치 → 가입 완료 시 자동 연동"이라는 사실 기반 문구로 교체했다.

4. **a11y**: `ShieldCheck` 아이콘에 `aria-hidden="true"` 추가(장식용, 텍스트가 의미를 전달). 기존 `DialogTitle`/`DialogDescription` 구조·포커스 트랩(Dialog 프리미티브)은 변경 없음.

5. **Date 순수성**: 이 컴포넌트는 `Date`를 직접 호출하지 않음(변경 전/후 동일, `formatDate`는 문자열 슬라이스만 수행). 렌더 경로에 신규 `Date` 호출 없음 — warning 래칫 영향 없음.

## 측정(계측) — 구현하지 않음, 제안만 기록

지시에 따라 **기존 로깅/audit 유틸이 이 용도에 적합하지 않으면 신규 인프라를 만들지 않고 제안만 남긴다.**

- `src/lib/audit.ts`(`logAudit`)를 확인함. 이 유틸은 `AuditLog` 타입(`userId`/`userName`이 **인증된 운영진 행위자**를 가리킴, `action`/`category`가 "member"/"role"/"settings" 등 운영 액션 전용)이며, 실제 사용처 전부가 `AdminMemberTab`·`console/*` 등 **로그인된 운영진의 관리 액션**이다. `guest-history-preview`는 **비인증 게스트**가 호출하는 API이므로 이 유틸을 재사용하면 (a) 의미상 오용(행위자가 없는데 관리 로그로 기록), (b) Firestore/bkend 쓰기 규칙이 운영진 전용일 가능성이 높아 실패 가능성, (c) 학번/이메일이 포함된 게스트 식별 정보를 감사 로그에 남기는 개인정보 확대 우려가 있어 **재사용하지 않았다.**
- 신규 이벤트 로깅 컬렉션 신설도 하지 않았다(정책 의존 — 태스크 지시의 "신규 로깅 인프라 도입 금지"를 준수).

### 제안하는 측정 방식 (정책 확정 후 별도 트랙에서 검토)

1. **노출**: 다이얼로그가 열릴 때(`checkGuestHistory` 성공 후 `setGuestHistoryOpen(true)` 호출 시점)를 계측 포인트로 삼되, 별도 write 없이 **"상태 도달" 방식**(v18 M3 선례)을 우선 고려 — 예: 가입 완료 시 `runAllGuestLinkers`의 `linked` 건수를 신규 가입 레코드에 경량 필드로 남겨(`profiles` 또는 `applicants` 기존 스키마 확장) "노출된 이력이 실제 연동으로 이어졌는가"를 사후 집계.
2. **클릭(다이얼로그 CTA)**: 정밀 클릭률이 필요하면 §외부 의존 ⚠️X2(클릭 이벤트 로깅 정책) 확정 후 경량 이벤트(익명, PII 미포함 — studentId/email 해시 또는 카운터만)를 검토. 정책 확정 전에는 도입하지 않는다.
3. **가입 전환**: 이미 `runSignupFlow.ts`가 게스트 이력 매칭 결과(`totalLinked`)를 계산하고 있으므로, 이 값을 기존 `console/insights`(v18 M3 코호트 퍼널 확장, §C3)에 읽기 집계로 편입하는 것이 가장 안전 — 신규 쓰기 없이 "게스트 이력 보유 상태로 가입한 사용자 수/비율"을 파생할 수 있다.
4. **카피 A/B**: 별도 이벤트 인프라 없이도, `GuestHistoryPreviewDialog`의 CTA 문구를 상수로 분리해두면(현재는 인라인 문자열) 추후 실험 도입 시 변경 지점이 명확해진다 — 이번 라운드에서는 단일 문구만 배포하고 상수화는 범위 밖(YAGNI)으로 보류했다.

## 검증 결과

- `npx tsc --noEmit` → **0 errors** (전체 프로젝트, EXITCODE=0)
- `npx eslint src/features/auth/signup-steps/GuestHistoryPreviewDialog.tsx` → **0 errors / 0 warnings** (출력 없음)
- `next build` → 지시에 따라 미실행(병렬 executor와 `.next` lock 충돌 회피)
- 무회귀 확인: `SignupMultiStep.tsx`(호출부, L211-217)의 props(`open`/`onOpenChange`/`name`/`count`/`records`) 및 버튼 클릭 시 `onOpenChange(false)` 동작은 변경하지 않음 — 기존 가입 플로우(Step1 통과 후 `checkGuestHistory` → 다이얼로그 → Step 2~4 계속) 그대로 유지.
