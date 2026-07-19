# 인쇄용 명함 PDF 개선 — 연락처 입력란·재단선·디자인 정돈 (2026-07-19)

사용자 피드백: "디자인을 조금 더 개선해야겠다. 특히 핸드폰번호랑 이메일 적는 란이 필요하다. 재단선이나 가이드 테두리도 제대로 반영이 안 됐다."

대상 파일(4종):
- `src/features/card/PrintCardSection.tsx` — UI 컨트롤·입력란·PDF 생성
- `src/features/card/PrintBusinessCard.tsx` — 화면 미리보기
- `src/features/card/BusinessCardPrintPdfDocument.tsx` — @react-pdf 문서
- `src/features/card/print-card.ts` — 규격·색값·상수 단일 소스

규격 상수(변경 없음): 재단(trim) 90×50mm · 작업(bleed) 94×54mm(사방 2mm) · 안전(safe) 86×46mm.

---

## 1. 연락처 기입란

### 동작
- `PrintCardSection` 에 전화번호·이메일 **입력 필드** 추가(`<input type="tel">`, `<input type="email">`).
- 초기값: `buildPrintCardLines(user)` 산출값(전화 = `formatPhone(user.phone)`, 이메일 = `user.contactEmail ?? user.email`).
  - SSR/CSR 하이드레이션 일치를 위해 **초기 state 는 프로필 기본값**으로 두고, 마운트 후 `useEffect` 에서 localStorage 값이 있으면 덮어씀.
- 저장: 값 변경 시 `useEffect` 로 `localStorage["yonsei:print-card-contact"]` 에 `{ email, phone }` JSON 저장 → 재방문 시 복원.
- 반영 경로:
  - 미리보기: `PrintBusinessCard` 에 신규 prop `email`/`phone` 전달(편집값 우선, 미지정 시 프로필 기본값).
  - PDF: `fields={{ ...lines, name, email: emailInput, phone: formatPhone(phoneInput) }}` 로 override.
- 기존 "이메일/전화번호 표시" 토글과 정합: `showEmail && value` / `showPhone && value` 조건에서만 표기(토글 off 또는 값 없음 → 미표기).
- 상수 `PRINT_CARD_CONTACT_STORAGE_KEY` 를 `print-card.ts` 로 추출해 단일 소스화.

### 명함 레이아웃(연락처 블록)
- 명함 관행대로 좌측 **하단 정렬**, 작은 사이즈 유지.
- 프리픽스 스타일: `CONTACT_PREFIX = { phone: "M.", email: "E." }` (print-card.ts). 프리픽스는 골드 악센트·볼드, 값은 보조 텍스트 색.

---

## 2. 재단선(crop marks)·가이드

### PDF 재단선 (BusinessCardPrintPdfDocument)
- 신규 prop `showCropMarks: boolean`("재단선(PDF)" 토글, 기본 on).
- **좌표 산식**:
  - `BLEED_MARGIN = ((bleedW - trimW) / 2) * MM_TO_PT = ((94 - 90)/2)mm = 2mm` (작업 가장자리 → 재단 경계까지의 여백 띠).
  - 재단 경계선: `TRIM_L = BLEED_MARGIN`, `TRIM_R = PAGE_W - BLEED_MARGIN`, `TRIM_T = BLEED_MARGIN`, `TRIM_B = PAGE_H - BLEED_MARGIN`.
  - `CROP_STROKE = 0.5pt`.
- **8선(모서리당 수평·수직 각 1)** — 전부 bleed 2mm 띠 안에만 그리고 **재단 사각형 내부로 침범하지 않음**:
  - top-left 수평 `{left:0, top:TRIM_T-CROP_STROKE/2, w:BLEED_MARGIN, h:CROP_STROKE}` / 수직 `{left:TRIM_L-CROP_STROKE/2, top:0, w:CROP_STROKE, h:BLEED_MARGIN}`
  - top-right 수평 `{left:TRIM_R, ...}` / 수직 `{left:TRIM_R-CROP_STROKE/2, top:0, ...}`
  - bottom-left 수평 `{left:0, top:TRIM_B-CROP_STROKE/2, ...}` / 수직 `{left:TRIM_L-CROP_STROKE/2, top:TRIM_B, ...}`
  - bottom-right 수평 `{left:TRIM_R, top:TRIM_B-..., ...}` / 수직 `{left:TRIM_R-CROP_STROKE/2, top:TRIM_B, ...}`
- 구현: `View` 절대배치(`position:"absolute"`, `backgroundColor: colors.cropMark`) 8개. Svg 미사용(런타임 안정성).
- 색: 배경 대비 확보 위해 `PrintCardColors.cropMark` 신규 필드 — 라이트 `#000000`, 네이비 `#ffffff`.
- 앞면·뒷면 페이지 모두에 `renderCropMarks()` 적용.

### 미리보기 가이드 오버레이 (PrintBusinessCard)
- 신규 prop `showGuides`("미리보기 가이드" 토글, 기본 on) — PDF 에는 미포함(미리보기 전용).
- 미리보기 카드는 재단(90×50) 기준이므로:
  - **재단선(실선)**: 카드 가장자리 `inset-0` solid `rgba(229,72,77,0.85)`.
  - **안전영역(점선)**: 재단 기준 사방 2mm 인셋 → 가로 `2/90≈2.22%`, 세로 `2/50=4%`. dashed `rgba(59,130,246,0.9)`.
- 앞·뒷면 컨테이너에 `relative` 추가 + `pointer-events-none` 오버레이.
- `PrintCardSection` 미리보기 하단에 범례(재단선/안전영역) 표시.

---

## 3. 전반 디자인 정돈
- 위계 유지·강화: 엠블럼+학회명(상단) → 이름(대형 볼드)+기수 → 골드 룰 → 직책 → 소속 → 관심분야 태그 → 연락처(하단, M./E. 프리픽스) → QR(우측 정렬).
- 연락처 프리픽스로 명함다운 정돈, 라이트/네이비 두 변형 공통 적용.
- 뒷면: 엠블럼+학회명+슬로건+URL 중앙 정렬 미니멀 유지(변경 없음).

---

## 변경 요약(파일별)
- `print-card.ts`: `PrintCardColors.cropMark` 필드 + 라이트/네이비 값, `CONTACT_PREFIX`, `PRINT_CARD_CONTACT_STORAGE_KEY` 상수.
- `PrintBusinessCard.tsx`: `email`/`phone`/`showGuides` prop, 연락처 프리픽스 렌더, 가이드 오버레이(재단선 실선·안전영역 점선), 컨테이너 `relative`.
- `BusinessCardPrintPdfDocument.tsx`: `showCropMarks` prop, 재단선 8선 좌표·`View` 렌더(앞뒤 페이지), 연락처 프리픽스(`contactTag` 스타일).
- `PrintCardSection.tsx`: 전화/이메일 입력란 + localStorage 복원·저장, "재단선(PDF)"·"미리보기 가이드" 토글, 가이드 범례, PDF/미리보기에 값·토글 전달, 안내문 재단선 문구 추가.

## 검증
- `npx tsc --noEmit` → card 관련 에러 0 (exit 0).
- `npx eslint src/features/card --quiet` → 통과 (exit 0).
- build·commit 미수행(요청 규율).
