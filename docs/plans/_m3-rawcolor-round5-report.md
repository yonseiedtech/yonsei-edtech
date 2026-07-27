# Raw Color Round 5 — board · leaderboard · networking

## 스캔 결과

### 스캔 대상
- `src/app/board/**` — raw 색상 없음
- `src/app/leaderboard/**` — raw 색상 없음
- `src/features/networking/**` — raw 색상 없음
- `src/features/board/**` — **raw 색상 발견** (Interview* 파일군)
- `src/features/leaderboard/**` — 디렉토리 없음 (leaderboard는 app 계층만)

### 발견된 raw 색상

| 파일 | 색상 | 용도 |
|------|------|------|
| `InterviewCertificate.tsx:46` | `#003876` (style prop) | html-to-image API backgroundColor |
| `InterviewCertificate.tsx:79` | `#003876`, `#00275c`, `#001a3d` (gradient) | 인증카드 브랜드 그라디언트 |
| `InterviewCertificate.tsx:83` | `#1a5fa0` | 장식 blur blob |
| `InterviewCertificate.tsx:88` | `#003876` (text) | 카드 뱃지 텍스트 |
| `InterviewPlayer.tsx:63` | `#003876` (className), `#1a5fa0` (focus) | 빈칸채우기 input |
| `InterviewPlayer.tsx:399` | `#003876`, `#1a5fa0` (gradient) | 진행바 그라디언트 |
| `InterviewPlayer.tsx:423~778` | `#003876` (className, style prop) | 선택지 UI, 라디오·체크박스 |
| `InterviewResponseComments.tsx:150` | `#003876` (bg) | 인터뷰이 배지 배경 |
| `InterviewResponses.tsx:142,254,275` | `#003876` | 빈칸·질문번호·멀티텍스트 태그 |
| `MyInterviewAnswersDialog.tsx:102,169,188` | `#003876` | 동일 패턴 |

**`#003876`** = `--primary: 214 100% 23%` (CSS 변수로 정확히 정의됨)

---

## 치환 결과

### 치환 완료 (브랜드 primary → `text-primary` / `border-primary` / `bg-primary` / `hsl(var(--primary))`)

| 파일 | 변경 수 | 내용 |
|------|---------|------|
| `InterviewCertificate.tsx` | 1 | L88 `text-[#003876]` → `text-primary` |
| `InterviewResponseComments.tsx` | 1 | L150 `bg-[#003876]` → `bg-primary` |
| `InterviewResponses.tsx` | 3 | L142 border+text, L254 text, L275 bg/10+text |
| `MyInterviewAnswersDialog.tsx` | 3 | L102 border+text, L169 text, L188 bg/10+text |
| `InterviewPlayer.tsx` | 17 | 선택지 className 8종 + style prop `hsl(var(--primary))` 변환 |

**총 치환: 25건** (모두 `#003876` → primary 토큰)

### 판단 필요 목록 (보존)

| 위치 | 값 | 보존 이유 |
|------|----|-----------|
| `InterviewCertificate.tsx:46` | `backgroundColor: "#003876"` | `html-to-image` API는 CSS 변수 미인식 — raw hex 필수 |
| `InterviewCertificate.tsx:79` | `from-[#003876] via-[#00275c] to-[#001a3d]` | 인증카드 PNG 익스포트용 브랜딩 그라디언트. `#00275c`·`#001a3d` 대응 토큰 없음. 다크모드 primary(밝은 파랑)로 치환 시 시각 회귀 |
| `InterviewCertificate.tsx:83` | `bg-[#1a5fa0]/30` | 장식 blur, 대응 토큰 없음 |
| `InterviewPlayer.tsx:63` | `focus:border-[#1a5fa0]` | 더 밝은 네이비 포커스 색, 대응 토큰 없음 |
| `InterviewPlayer.tsx:399` | `from-[#003876] to-[#1a5fa0]` | 진행바 그라디언트 쌍. `#1a5fa0` 대응 토큰 없어 `from-primary to-[#1a5fa0]` 혼용은 부자연스러움 |
| `InterviewPlayer.tsx:545,573,637,665` | `"#cbd5e1"` | 라디오·체크박스 미선택 테두리(slate-300). `--border` 토큰과 농도 차이 있어 시각 확인 후 치환 권장 |

---

## 검증 결과

```
npx tsc --noEmit       → 0 errors
npx eslint (수정 파일) → 0 errors, 6 warnings (기존 <img> 태그 경고, 변경 무관)
node scripts/check-rawcolor-ratchet.mjs → PASS (1개 / 상한 1개)
node scripts/check-eslint-warning-ratchet.mjs → PASS (263건 / 상한 263건 — 변동 없음)
```

## 비고
- board/leaderboard/networking 중 `app/` 계층과 `features/networking/` 에는 raw 색상 없음
- 실제 raw 색상은 모두 `features/board/Interview*` 파일군에 집중 (인터뷰 기능)
- `#003876` = 연세 브랜드 네이비 = `--primary` (CSS 변수)로 25건 치환 완료
- rawcolor ratchet은 Tailwind 팔레트만 감지하므로 hex/rgb 치환은 ratchet 수치에 영향 없음
