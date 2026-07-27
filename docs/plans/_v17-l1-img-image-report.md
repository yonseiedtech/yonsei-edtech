# v17 L1 — img→Image 잔여 전환 보고서

작업일: 2026-07-27 · 담당: executor · 목적: LCP 개선(안전 최우선)

## 요약

`@next/next/no-img-element` 위반(억제 잔여 포함) 전수 재측정 결과, **런타임 안전하게 `next/image`로 전환 가능한 것은 정적 로컬 자산 히어로 1건뿐**이었다.
나머지 대부분은 **Firestore 저장 data URL(base64)** 이거나 **html2canvas/PDF 캡처 대상**, **자유 입력 외부 URL(미등록 호스트)** 로, next/image 전환 시 이득이 없거나 런타임 에러 위험이 있어 **억제 유지 + 사유 주석**으로 처리했다.

핵심 근거(코드 확인):
- `src/lib/upload.ts` `uploadImage()` 는 이미지를 **Base64 Data URL** 로 변환해 Firestore 문서에 직접 저장한다 → `coverUrl`·`photoUrl`·`imageUrls`·포스터 프리뷰 등 업로드 이미지 대다수가 **data URL**. next/image 는 data URL 을 최적화하지 못하며(이미 인라인 base64) 전환 이득이 없다.
- `src/features/seminar/detail/EditDialogs.tsx` — 세미나 `posterUrl` 은 운영진 **자유 입력 URL 필드**(`placeholder="https://..."`). 임의 외부 호스트 가능 → next/image 미등록 호스트 런타임 에러 위험.
- `CertificateGenerator.tsx`(html2canvas), `speaker-review`·`CardArt`·`card-news/art`(crossOrigin 캡처) 등은 **캔버스/PDF 캡처 대상** → next/image 래퍼(srcset·lazy·wrapper)는 캡처를 깨뜨림.

## (3) next.config 이미지 도메인 확인 결과

`next.config.ts` `images.remotePatterns`:
- `firebasestorage.googleapis.com`
- `*.googleusercontent.com`

등록된 외부 호스트는 위 2개뿐. 그런데 실제 업로드 파이프라인이 Firebase Storage 가 아니라 **data URL(Firestore 저장)** 방식이므로, 동적 이미지들은 애초에 remotePattern 매칭 대상이 아니라 data URL(전환 비대상)이다. 자유 입력 `posterUrl` 은 미등록 호스트가 될 수 있어 전환 금지.
→ **로컬/public 정적 자산만 안전 전환** 결론.

## (1) 전환한 파일·이미지

| 파일 | 이미지 | 처리 | 방식 |
|---|---|---|---|
| `src/app/newsletter/[id]/page.tsx:137` | `/yonsei-campus.jpg` (회보 표지 히어로, 정적 로컬) | **`next/image` 전환** | `<Image fill priority sizes="(max-width:640px) 100vw, 768px" className="object-cover">`, 부모 `relative h-48 sm:h-64 w-full overflow-hidden` 유지 |

전환 안전성 근거: 100% 정적 로컬 자산(`/public/yonsei-campus.jpg`). 이 페이지의 PDF 다운로드는 `@react-pdf/renderer`(데이터 기반 프로그램 생성)이라 DOM 캡처가 아님 → Image 전환이 PDF에 영향 없음. LCP 상단 표지 이미지라 `priority` 부여.

(참고: `HeroSection.tsx` 도 fallback 이 같은 로컬 자산이지만, primary `src` 가 자유 입력 `posterUrl` 이라 전환 불가 → 보류.)

## (2) 보류(억제 유지 + 사유 주석)한 img 목록

### 신규 사유 주석 추가(기존 미억제 → 경고였던 것, 이번에 억제+사유 명시)

| 파일:라인 | src 컨텍스트 | 보류 사유 |
|---|---|---|
| `src/app/gallery/page.tsx:270` | `album.coverUrl` | 업로드 data URL(base64) — 최적화 비대상 |
| `src/app/gallery/page.tsx:567` | `photo.url` (그리드) | 업로드 data URL |
| `src/app/gallery/page.tsx:665` | `photo.url` (라이트박스) | data URL·object-contain 전체화면 |
| `src/features/seminar/detail/HeroSection.tsx:46` | `posterUrl` | 자유 입력 외부 URL(미등록 호스트 가능) — 런타임 에러 위험 |
| `src/features/seminar/detail/SpeakerCard.tsx:32` | `s.photoUrl` | 연사 업로드 data URL |
| `src/features/seminar/SeminarForm.tsx:285` | `s.photoUrl` | 연사 업로드 data URL |
| `src/features/seminar-admin/PosterGenerator.tsx:178` | `imageUrl` | AI 생성 포스터 data URL(동적) |
| `src/features/seminar-admin/CertificateGenerator.tsx:1047` | `/cert-emblem.png` | html2canvas 수료증 캡처 대상 |
| `src/features/seminar-admin/CertificateGenerator.tsx:1125` | `/cert-emblem.png` | html2canvas 캡처 대상 |
| `src/features/seminar-admin/CertificateGenerator.tsx:1160` | `/cert-seal.jpeg` | html2canvas 캡처 대상 |
| `src/features/board/InterviewPlayer.tsx:360` | `/yonsei-emblem.svg` | 정적 SVG 소형 로고 — next/image SVG 최적화 비대상, LCP 영향 미미 |
| `src/features/board/InterviewPlayer.tsx:418` | `/yonsei-emblem.svg` | 정적 SVG 엠블럼 — 상동 |
| `src/features/board/InterviewPlayer.tsx:809` | `url` | 업로드 첨부 data URL |
| `src/features/board/InterviewCertificate.tsx:89` | `/yonsei-emblem.svg` | html2canvas 캡처(crossOrigin)·정적 SVG |
| `src/features/board/InterviewResponses.tsx:305` | `u` | 업로드 첨부 data URL |
| `src/features/board/MyInterviewAnswersDialog.tsx:214` | `u` | 업로드 첨부 data URL |
| `src/features/board/PostForm.tsx:475` | `url` | 업로드 미리보기 data URL |

### 기존 억제 유지(이미 `eslint-disable` 존재 — 사유 카테고리 확인, 변경 없음)

| 파일 | 컨텍스트 | 사유 |
|---|---|---|
| `src/components/ui/file-uploader.tsx:90` | `f.url` 업로드 프리뷰 | 동적 업로드 URL/data URL |
| `src/features/studio/PageCanvas.tsx:50,131` | 스튜디오 캔버스 `crossOrigin` | 캔버스 캡처 대상 |
| `src/app/seminars/[id]/speaker-review/page.tsx:133,151,161,741,804` | cert-emblem/seal·seminar photo, `crossOrigin` | PDF/캡처 대상·data URL |
| `src/app/activities/external/[id]/workbook/page.tsx:310` | `submission.photoUrl` | 업로드 data URL |
| `src/features/celebration-card/CardArt.tsx:117,273,299,328` | 엠블럼·사진, `crossOrigin` | OG/캔버스 캡처 대상 |
| `src/features/card-news/art.tsx:62,69,82,339` | 브랜드 로고·스크린샷, `crossOrigin` | 캔버스 캡처 대상 |
| `src/features/card/ReceivedCardsSection.tsx:136,292` | `photoUrl` | 명함 업로드 data URL |
| `src/features/networking/GatheringDetail.tsx:408` | `ev.posterUrl` | 업로드 data URL |
| `src/features/networking/EventEditorForm.tsx:655` | `form.posterUrl` | 업로드 프리뷰 data URL |

### 전환·억제 대상 아님(경고 미발생 — 참고)

- `src/app/board/[id]/page.tsx:54`, `src/features/board/PostForm.tsx:227`, `src/app/api/cron/weekly-digest/route.ts` — `<img>` 가 **문자열 리터럴**(dangerouslySetInnerHTML·이메일 HTML)이라 JSX 아님 → `no-img-element` 규칙 비대상. 조치 없음.

### 영역 충돌 회피로 건너뛴 파일(L3/기타 점유 — 지시)

`DemandInterestCard`, `ContinueReadingCard`, `DiagnosisGuideBridge`, `JourneyStepperWidget`, `WeaveKpiSection`, `GuideCompletionCard`, `DemandRetroSection`, `GuideRelated`, `NetworkingPoll`, `StaffMeetingPollTab` — 이번 img 목록에 해당 파일의 위반은 없었고, 지시대로 수정하지 않음.

## (4) 검증 결과

| 항목 | 명령 | 결과 |
|---|---|---|
| 타입체크 | `npx tsc --noEmit` | **PASS (exit 0, 0 errors)** |
| 린트(수정 파일 12개) | `npx eslint <수정파일들>` | **no-img-element 0건**, 신규 error/경고 0, **unused-directive 경고 0** (전환분 경고 제거·억제분 정확히 활성 경고에 부착 확인). 잔존 1건 `PostForm.tsx:623 react-hooks/refs` 는 **기존 경고**(img 무관) |
| raw color 래칫 | `node scripts/check-rawcolor-ratchet.mjs` | **PASS (1개 / 상한 1개)** |

### 경고 순증가 여부
- 전환 1건(newsletter) → no-img-element 경고 -1
- 억제+사유 주석 17건(기존 미억제 경고였던 것) → no-img-element 경고 -17
- **총 no-img-element 경고 약 -18 (순감소)**. ESLint 총 경고 순증가 없음(ratchet CEILING=167 영향 없음). raw hex 미사용(시맨틱 토큰/기존 클래스 유지).

## 수정 파일 목록(절대경로)

1. `C:\work\yonsei-edtech\src\app\newsletter\[id]\page.tsx` — Image 전환 + import
2. `C:\work\yonsei-edtech\src\app\gallery\page.tsx` — 억제 주석 3
3. `C:\work\yonsei-edtech\src\features\seminar\detail\HeroSection.tsx` — 억제 주석 1
4. `C:\work\yonsei-edtech\src\features\seminar\detail\SpeakerCard.tsx` — 억제 주석 1
5. `C:\work\yonsei-edtech\src\features\seminar\SeminarForm.tsx` — 억제 주석 1
6. `C:\work\yonsei-edtech\src\features\seminar-admin\PosterGenerator.tsx` — 억제 주석 1
7. `C:\work\yonsei-edtech\src\features\seminar-admin\CertificateGenerator.tsx` — 억제 주석 3
8. `C:\work\yonsei-edtech\src\features\board\InterviewPlayer.tsx` — 억제 주석 3
9. `C:\work\yonsei-edtech\src\features\board\InterviewCertificate.tsx` — 억제 주석 1
10. `C:\work\yonsei-edtech\src\features\board\InterviewResponses.tsx` — 억제 주석 1
11. `C:\work\yonsei-edtech\src\features\board\MyInterviewAnswersDialog.tsx` — 억제 주석 1
12. `C:\work\yonsei-edtech\src\features\board\PostForm.tsx` — 억제 주석 1

## 후속 제안(선택)

- 업로드 파이프라인을 Firebase Storage(등록 호스트)로 이관하면 갤러리 커버·연사 사진 등 **카드 썸네일을 next/image 로 전환** 가능해져 실질 LCP/대역폭 이득이 생긴다(현재는 data URL이라 불가). v18 후보.
- `posterUrl` 자유 입력을 Storage 업로드로 바꾸면 세미나 히어로도 전환 가능.
