# M7 다이제스트 열람·CTA 클릭 추적 구현 (2026-07-20)

> 배경: service-enhancement-plan-v6-2026-07-18.md M7항목  
> 목표: `weekly-digest` 발송 후 열람률·CTA 클릭을 집계해 알림 효과를 증명한다.

---

## 구현 파일

### 신규

| 파일 | 역할 |
|---|---|
| `src/app/r/digest/route.ts` | CTA 클릭 카운터 리다이렉트 (GET /r/digest?to=&c=) |
| `src/app/r/digest-open/route.ts` | 열람 픽셀 1×1 GIF (GET /r/digest-open?c=) |
| `src/features/insights/DigestStatsSection.tsx` | 운영 KPI 탭 "다이제스트 성과" 소섹션 |

### 수정

| 파일 | 변경 내용 |
|---|---|
| `src/app/api/cron/weekly-digest/route.ts` | `wrapCtaUrl` 헬퍼 추가, `buildHtml`에 `weekKey` 파라미터 추가 후 주요 CTA 래핑, 본문 말미 열람 픽셀 삽입 |
| `src/app/admin/insights/page.tsx` | opkpi 탭에 `DigestStatsSection` dynamic import + 삽입 |
| `firestore.rules` | `digest_link_clicks` · `digest_opens` staff+ read, client write false |

---

## 설계 결정

### /r/digest 오픈 리다이렉트 방지
- `to` 파라미터가 `/`로 시작하고 `//`·`/http`·`/scheme:` 패턴 아닌 경우만 허용
- 위반 시 `/`로 대체(무해한 홈으로)

### Firestore 문서 ID 설계
- `digest_link_clicks/{weekKey}_{slug(path)}` — slug는 path의 `/`·특수문자를 `_`로 변환 후 80자 truncate
- `digest_opens/{weekKey}` — 주차 단위 count 집계

### 열람 픽셀 한계
- 이메일 클라이언트(Gmail 이미지 프록시 등)가 캐시·차단하면 미집계
- 코드 주석에 "참고 지표" 명시, 완전한 열람률 측정이 아님을 운영진에 표시

### Admin SDK 비차단 패턴
- 두 라우트 모두 try/catch — 적재 실패 시 console.error 후 리다이렉트/GIF 응답은 항상 수행

### weekly-digest 래핑 범위
- 세미나·게시글·활동·소통보드 질문 링크 + "대시보드 가기" CTA 버튼
- 수신거부 링크(`/mypage`)는 추적 제외(unsubscribe 경로는 래핑 대상 아님)

---

## 검증

- `npx tsc --noEmit`: 에러 0
- `npx eslint src/app/r/digest/route.ts src/app/r/digest-open/route.ts src/features/insights/DigestStatsSection.tsx src/app/api/cron/weekly-digest/route.ts src/app/admin/insights/page.tsx --quiet`: 에러 0
