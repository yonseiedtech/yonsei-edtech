# ProfileSummaryCard UI 개선 (2026-07-20)

파일: `src/features/dashboard/ProfileSummaryCard.tsx`

---

## 개선 배경

사용자 피드백: "입학 시점 표기도 그렇고 가독성이 낮다"

발견된 문제 4가지:
1. **입학 표기 비표준**: `admissionLabel()` 함수가 `enrollmentHalf` 값으로 "전반기/후반기" 를 직접 조합 → 서비스 표준("전기/후기")과 불일치
2. **메타 정보 뒤섞임**: 이름·뱃지·기수·입학·학기·전공이 소형 텍스트+점 구분자 한 덩어리 → 스캔 불가
3. **완성도 블록 조사 어색**: `을(를) 채워보세요.` 문구 + 항목을 `·` 로 이어 붙임
4. **재학 뱃지 border 누락**: `STATUS_CHIP.success` chip 토큰에 border-color 클래스가 포함되어 있으나 `border` 속성 미적용

---

## 변경 전 구조

```
[Avatar] 이름 [재학] [52기]                         [프로필 수정]
         [cap] 2023년 후반기 입학 · 누적 6학기 · [교육공학]
         [clock] 최근 활동 · 아카이브 · 3일 전
─────────────────────────────────────────────────────
[circle] 프로필 완성도 60% (3/5)
[========  ]
프로필 사진 · 한 줄 소개 을(를) 채워보세요.          [프로필 업데이트 →]
```

## 변경 후 구조

```
[Avatar] 이름 [재학✓] [52기]                        [프로필 수정]
         [cap] 2023년 후기 입학   [cal] 6학기째   [book] 교육공학
         [clock] 최근 활동 · 아카이브 · 3일 전
─────────────────────────────────────────────────────
[circle] 프로필 완성도  60%  [=======   ]  3/5   [업데이트 →]
         미완성  [프로필 사진]  [한 줄 소개]
```

---

## 구체 변경 사항

### 1. 입학 표기 수정
- 제거: `admissionLabel()` 함수 (enrollmentHalf → "전반기/후반기" 직접 조합)
- 추가: `semesterLabelFromKey(cohortKeyOf(user))` → "2023년 후기"
- 결과: `"2023년 후기 입학"` — 코호트 배지·명함과 동일한 서비스 표준

### 2. 정보 위계 재구성
- 행 1: 이름(font-bold) + 상태 뱃지 + 기수 칩
- 행 2: 학적 스탯 3개를 **독립 유닛**(아이콘+텍스트) `gap-x-3` 배치. 점 구분자 제거.
  - `GraduationCap` "2023년 후기 입학"
  - `CalendarDays` "6학기째" (기존: "누적 6학기")
  - `BookOpen` user.field
- 행 3: 최근 활동 (기존 유지)

### 3. 완성도 블록
- 퍼센트를 `text-[13px] font-bold` 로 강조 (기존: text-[11px] font-semibold)
- 바(bar)를 `flex-1` 으로 확장해 행 전체 너비 활용
- 분수 `3/5` 를 바 오른쪽에 소형으로 배치
- 업데이트 버튼을 동일 행 끝에 고정
- 미완 항목: `을(를)` 조사 문구 제거 → "미완성" 라벨 + 개별 점선 chip 1개씩

### 4. 시맨틱 토큰
- 재학 뱃지: `border` 클래스 추가 (chip 토큰의 border-color 클래스가 실제 표현되도록)
- 기수 칩: `border border-muted-foreground/20` 추가 (일관성)
- raw 팔레트 클래스 없음 — STATUS_CHIP, bg-muted, text-muted-foreground 계열만 사용

---

## 검증

| 검사 항목 | 결과 |
|---|---|
| `npx tsc --noEmit` | 오류 없음 |
| `npx eslint src/features/dashboard/ProfileSummaryCard.tsx --quiet` | 오류 없음 |
| 수정 금지 파일(api/cron, AdminMemberTab, hackathon) | 미접촉 |
| 기존 링크·데이터 로직(queryKey, semesters calc, completion) | 불변 |
