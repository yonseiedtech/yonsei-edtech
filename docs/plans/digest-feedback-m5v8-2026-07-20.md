# digest 성과 → 발송 타이밍 환류 구현 보고서 (M5·v8, 2026-07-20)

## 구현 범위

v7 M3가 `digest_opens`·`digest_link_clicks` 적재와 `DigestStatsSection` 관찰 표시까지 완료했으나
**타이밍·CTR 환류 없이 관찰에서 멈춘 상태**였음. M5는 기존 데이터를 소비해 인사이트·권장안으로 완결.

### 수정 파일

- `src/features/insights/DigestStatsSection.tsx` (단일 파일, 클라이언트 컴포넌트)

### 신규 컬렉션 없음 — 기존 데이터 소비

| 컬렉션 | 사용 목적 |
|---|---|
| `digest_opens` | 열람 수 + `lastAt`(발송 후 경과 시간 계산) |
| `digest_link_clicks` | 클릭 수 + 주차·경로별 집계 |
| `email_logs` | 수신자 수 → 열람률 % (staff 권한, 실패 시 graceful 생략) |

---

## 구현 내용

### 1. 주차별 추이 테이블 (기존 4-box → 통합 테이블)

| 컬럼 | 설명 |
|---|---|
| 열람 | 주차별 열람 수 + 전주 대비 트렌드 아이콘(▲/▼/—) |
| 클릭 | 주차별 CTA 클릭 합산 + 트렌드 |
| CTR | 클릭 ÷ 열람 × 100 (열람 0이면 "—") |
| 열람률 | 열람 ÷ 수신자 수 × 100 (email_logs 접근 권한 확보 시 자동 표시) |
| 저성과 배지 | 열람 0 → "미열람"(destructive), 열람있지만 클릭 0 → "클릭없음"(warning) |

### 2. 발송 타이밍 인사이트 박스

- 현재 발송 시각 명시: **매주 월요일 09:00 KST** (기본 조용한 시간 22:00–08:00 이후)
- `digest_opens.lastAt` 기반으로 "발송 후 평균 N시간째 마지막 열람 감지" 표시
  - 발송 기준: `weekKey + T00:00:00Z` (월요일 09:00 KST = UTC 00:00)
  - 유효 범위: 0~167h (1주 이내) 이탈값 제외
- 데이터 부족(weeksWithData < 2): "열람 데이터 축적 중 (N주 / 최소 2주 필요)" 빈 상태
- 저성과 플래그: 미열람 주차 목록·열람 후 클릭 없음 주차 목록

### 3. 타이밍 권장안 텍스트 박스 (운영진 읽기 전용)

| avgHoursAfterSend | 권장안 |
|---|---|
| 데이터 < 2주 | 이력 부족, 축적 후 권장안 생성 |
| ≤ 4h | 월요일 오전 발송 적절, 현 일정 유지 권장 |
| ≤ 24h | 당일 내 반응, 현 시각 유지 또는 더 이른 시간 시험 |
| ≤ 72h | 수·목 분산, 화요일 발송 조정 제안 |
| > 72h | 수일 분산, 시각 유지 후 문구 개선 먼저 |

- **vercel.json 자동 변경 금지** 명시: "발송 시각 변경은 `vercel.json` 스케줄을 직접 수정하세요"

---

## 검증 결과

```
npx eslint src/features/insights/DigestStatsSection.tsx --quiet  → 0 errors
npx tsc --noEmit | grep DigestStats                              → 0 errors
```

- 시맨틱 색상 토큰 준수: `text-destructive`, `bg-destructive/10`, `text-warning`, `bg-warning/10`, `text-success`
- `weekly-digest/route.ts` 미수정 (H3 회귀 방지)
- `mentoring/**` 미수정 (다른 트랙 작업 중)
- `vercel.json` 미수정 (cron 스케줄 자동 변경 금지)

---

## 데이터 한계 및 빈 상태 처리

- `digest_opens.lastAt`은 해당 주차 **마지막** 열람 시각 — 개별 열람 분포가 아닌 근사치
- 이메일 클라이언트 이미지 차단 시 픽셀 미기록 — 참고 지표 명시
- `email_logs` 권한 없는 환경: 열람률 컬럼 자체 숨김 (graceful)
- 신규 컬렉션 없음, 추가 Firestore 비용 최소
