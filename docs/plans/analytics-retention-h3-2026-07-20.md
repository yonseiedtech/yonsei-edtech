# 적재 컬렉션 보존 정책 cron — v7-H3 구현 산출물 (2026-07-20)

## 개요

`api/cron/analytics-retention` 신설 — 로그성 대용량 컬렉션의 오래된 문서를 주 1회 배치 삭제해 Firestore 읽기/저장 비용을 방어한다.

## 대상 컬렉션 · 보존 기간 · 삭제 상한

| 컬렉션 | 기준 필드 | 보존 기간 | 회당 삭제 상한 | 비고 |
|---|---|---|---|---|
| `user_activity_logs` | `createdAt` (ISO string) | **180일** | 2,000건 | `visit-tracker.ts` `trackUserActivity` 적재 |
| `daily_visits` | `date` (YYYY-MM-DD) | **180일** | 2,000건 | 1일 1문서 구조 — 실제 삭제 최대 180건 수준 |
| `search_misses` | `lastAt` (Firestore Timestamp) | **365일** | 2,000건 | count 누적 컬렉션, 저빈도·오래된 항목 정리 |

## 절대 삭제 금지 컬렉션 (명시)

- `weekly_goal_records` — 주간목표 판정·회고 기록
- `adoption_history` / `adoption_snapshots` — 채택률 시계열
- `loyalty_snapshots` — 로열티 시계열
- `paper_reading_logs` — 논문 읽기 기록
- `notifications` — 별도 `notifications-cleanup` cron 관리
- 그 외 회원 프로파일·기록성·콘텐츠 컬렉션 전체

## 실행 방식

- **스케줄**: `0 2 * * 1` (월요일 02:00 UTC = 11:00 KST)
  - 기존 loyalty-snapshot `0 0 * * 1`, adoption-snapshot `0 1 * * 1` 와 시간 분산
- **타임아웃 방어**: BATCH_LIMIT=2000건 상한 — 초과분은 다음 주기에 처리
- **배치 삭제**: CHUNK=500건 단위 (Firestore writeBatch 상한)
- **dry-run**: `GET /api/cron/analytics-retention?dryRun=true` — 삭제 예정 건수만 JSON 반환, 실제 삭제 없음

## 응답 예시

```json
{ "ok": true, "dryRun": false, "deleted": { "user_activity_logs": 312, "daily_visits": 45, "search_misses": 7 } }
```

## 구현 파일

- `src/app/api/cron/analytics-retention/route.ts` — 신규 생성
- `vercel.json` — crons 배열에 항목 추가 (`"0 2 * * 1"`)
