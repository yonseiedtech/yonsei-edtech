# 명함 디자인 인쇄용 통합 (2026-08-02, 사용자 요청)

## 배경
명함 기능에 디자인이 2종 공존 → 사용자 "인쇄용으로 디자인을 통합" 요청.
- ① 화면용 세로 모바일 명함 `BusinessCard`(9:16, 6종 테마) — /mypage 내 명함 + /directory/[id]/card
- ② 인쇄소 제출용 가로 명함 `PrintBusinessCard`(90×50mm, light/navy) — PrintCardSection 내 PDF

## 통합 방향
**인쇄용 가로 명함(`PrintBusinessCard`)을 유일한 명함 디자인으로 통일.** 세로 `BusinessCard` 제거.
화면 미리보기·공유·이미지 저장·인쇄 PDF·상대방 명함 보기 전부 동일 컴포넌트/디자인 사용.

## 변경 파일
| 파일 | 변경 |
|---|---|
| `features/card/print-card.ts` | `cardThemeToVariant()` 추가 — user.cardTheme(신규 "light"/"navy" 또는 레거시 6종)→ variant 정규화(navy·slate→navy, 그 외 light) |
| `features/card/PrintCardSection.tsx` | 통합 명함 관리 UI 로 승격. 앞/뒷면 미리보기 + **공유/이미지저장(JPG)/vCard 액션** + variant 선택(선택 즉시 `user.cardTheme` 저장→상대방 보기 반영) + 표시필드 토글 + 연락처 편집 + 인쇄 PDF. `qrUrl` prop 추가. 앞면 ref 로 html-to-image JPG 캡처. 미리보기 가이드 기본 off |
| `features/card/CardSection.tsx` | 세로 `BusinessCard`·6종 테마 피커·기존 공유/JPG/vCard 행 제거. 프로필 사진 업로드(크롭)는 유지(사이트 프로필용, 인쇄 명함엔 미표시 안내). `PrintCardSection` 렌더 |
| `app/directory/[id]/card/page.tsx` | 상대 명함 표시를 `BusinessCard`→`PrintBusinessCard`(front, owner.cardTheme variant, email·field on/phone off, QR=공개프로필) |
| `types/cards.ts` | `CardThemeKey`·`CARD_THEME_KEYS`·`CARD_THEME_LABELS` 제거(주석만 남김). `cardTheme` 필드는 User `[key:string]` 로 유지 |
| 삭제 | `features/card/BusinessCard.tsx`, `features/card/card-themes.ts` (dead) |

## 데이터 호환
- `user.cardTheme`: 기존 값("default"/"emerald"/…)은 read 시 `cardThemeToVariant`로 light/navy 매핑. 이후 선택 시 "light"/"navy" 저장. 마이그레이션 불필요.

## 결정 사항
- 프로필 사진: 인쇄 명함은 사진 미표시 디자인 → 카드 탭의 사진 업로드는 **회귀 방지 위해 유지**하되 "회원 명부·프로필용" 명시.
- 상대 명함 QR: 기존 `/directory/[id]/card` → 통합 카드와 일관되게 `/profile/[id]`.

## 검증
- TSC 0 / ESLint(변경 5파일) 0 / rawcolor 래칫 1(상한 1) / eslint-warning 래칫 146(상한 146, 변동 없음) / next build 0.
- QA: /mypage 내 명함(미리보기·variant 전환·공유·JPG·PDF), /directory/[id]/card 상대 명함 렌더.
