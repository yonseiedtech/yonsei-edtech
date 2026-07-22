# 축하카드 제작 기능 설계 문서

작성일: 2026-07-22

---

## 개요

운영 콘솔에서 학회 회원을 위한 맞춤 축하카드를 제작하고 PNG로 내보내는 도구.
Firestore 저장 없음(제작·다운로드 전용), 마지막 입력값은 localStorage로 보존.

---

## 파일 구조

```
src/
├── features/celebration-card/
│   ├── types.ts                 — CelebrationCardData 인터페이스, CardType 유니언
│   ├── presets.ts               — 7개 유형별 프리셋 문구 (birth·wedding·graduation·award·admission·birthday·free)
│   ├── CardArt.tsx              — 실제 카드 렌더 컴포넌트 (540×1026px, 인라인 스타일)
│   ├── CardFit.tsx              — ResizeObserver 기반 스케일 미리보기 래퍼
│   ├── download.ts              — html2canvas-pro 2× 내보내기 (1080×2052 PNG)
│   └── CelebrationCardEditor.tsx — 폼(좌) + 미리보기(우) 에디터 클라이언트 컴포넌트
└── app/console/celebration-card/
    └── page.tsx                 — 콘솔 라우트 (ConsolePageHeader + CelebrationCardEditor)
```

수정 파일:
- `src/app/console/layout.tsx` — 콘텐츠 그룹에 "축하카드" 항목 추가 (Gift 아이콘)

---

## 카드 구조 (위→아래, 540×1026px)

1. **네이비 라운드 프레임** — `border: 2px solid #002060`, `border-radius: 18px`, 상단에서 36px 아래 시작
2. **연세 엠블럼** — `/yonsei-emblem.svg` (72×72px), top: 0에서 내려와 테두리 선에 걸쳐 배경색으로 절단면 처리
3. **캘리그래피풍 헤드라인** — Hahmlet (display serif, `--font-hahmlet`), 25px/700, 네이비, 중앙 정렬, pre-line 줄바꿈
4. **얇은 구분선** — `#cfd6e4`, 0.5px
5. **수신자 블록** — 접두 문구(14px, "연세교육공학" 네이비 강조) + 이름(Hahmlet 44px/800, NAVY_DEEP) + 호칭(16px)
6. **얇은 구분선**
7. **본문 문단** — Pretendard 13px/lineHeight 1.82, `**텍스트**` → `<strong>` 변환(볼드+네이비)
8. **맺음 인사 + 보내는 곳** — 우측 정렬, 보내는 곳은 `#003378` 네이비
9. **하단 사진 영역** (162px) — URL 제공 시 커버 이미지; 없으면 `linear-gradient(135deg, #002060 → #0038A8)` + 엠블럼 워터마크(opacity 0.22)
10. **푸터** — `/card-news/brand/logo-society.png` 중앙, 얇은 상단 구분선

---

## 프리셋 목록

| 유형 | 헤드라인 | 기본 사진 |
|------|----------|-----------|
| 출산 | 새 생명의 탄생을 온 마음으로 축하합니다 | 없음 (그라데이션) |
| 결혼 | 두 분의 아름다운 결혼을 축하합니다 | 없음 |
| 졸업 | 학위 취득을 진심으로 축하드립니다 | `/yonsei-campus.jpg` |
| 수상 | 수상을 진심으로 축하드립니다 | 없음 |
| 합격 | 합격을 진심으로 축하드립니다 | 없음 |
| 생일 | 생일을 진심으로 축하드립니다 | 없음 |
| 자유 | 진심을 담아 전합니다 | 없음 |

문구 톤: 정중하고 따뜻한 존댓말, `{이름}` 대신 직접 이름 입력. `**텍스트**`로 핵심어 볼드 강조.

---

## 내보내기 방식

- **라이브러리**: `html2canvas-pro` (package.json 기존 의존성, card-news/download.ts와 동일)
- **해상도**: scale: 2 → 출력 1080×2052 px PNG
- **파일명**: `연세교육공학_{유형}_{이름}.png`
- **외부 이미지 주의**: CORS 제한으로 같은 도메인(`/`) 이미지만 안전하게 렌더. UI에 안내 문구 표시.

---

## 에셋 경로

| 용도 | 경로 |
|------|------|
| 상단 엠블럼 | `/yonsei-emblem.svg` |
| 사진 플레이스홀더 워터마크 | `/yonsei-emblem.svg` (opacity 0.22, filter brightness 10) |
| 푸터 로고 | `/card-news/brand/logo-society.png` |
| 졸업 프리셋 기본 사진 | `/yonsei-campus.jpg` |

---

## 색상 (인라인 스타일 — card-news/art.tsx 동일 팔레트)

| 상수 | 값 | 용도 |
|------|----|------|
| NAVY_DEEP | `#002060` | 테두리, 헤드라인, 이름, 볼드 |
| NAVY_BRAND | `#003378` | 보내는 곳, 인라인 볼드 |
| WHITE | `#ffffff` | 카드 배경, 엠블럼 절단 배경 |
| TEXT_DARK | `#1a1f36` | 본문 텍스트 |
| TEXT_MUTED | `#6b7488` | 접두어, 맺음 인사 |
| RULE_COLOR | `#cfd6e4` | 구분선 |

UI 컴포넌트(에디터)는 시맨틱 CSS 토큰만 사용 (raw 색상 없음).

---

## 타이포그래피

| 역할 | 폰트 | 크기 | 비고 |
|------|------|------|------|
| 헤드라인 | Hahmlet (`--font-hahmlet`) | 25px/700 | pre-line 줄바꿈 지원 |
| 수신자 이름 | Hahmlet | 44px/800 | 카드의 시각적 중심 |
| 본문 | Pretendard | 13px | lineHeight 1.82, keep-all |
| 호칭/접두어 | Pretendard | 14–16px | — |
| 보내는 곳 | Pretendard | 15px/700 | 네이비 |

---

## localStorage 보존

키: `"celebration-card-draft"` — 마지막 입력값 JSON 직렬화. 새로고침 시 자동 복원.

---

## 콘솔 내비게이션

- 위치: 콘텐츠 그룹 › 카드뉴스 바로 아래
- 아이콘: `Gift` (lucide-react)
- 경로: `/console/celebration-card`
- 접근: staff 이상 (콘솔 레이아웃 AuthGuard가 처리)

---

## 규율 준수 확인

- raw Tailwind 팔레트 클래스 0건 (시맨틱 토큰만 사용)
- 카드 렌더 인라인 hex는 card-news/art.tsx 동일 패턴 — ratchet 영향 없음
- 다크모드: 카드 자체는 항상 라이트(white) 유지 (내보내기 일관성)
- `npx tsc --noEmit` 0 errors 목표
- `node scripts/check-rawcolor-ratchet.mjs` PASS (새 파일 raw Tailwind 없음)
- `node scripts/check-eslint-warning-ratchet.mjs` 273 이하 유지
