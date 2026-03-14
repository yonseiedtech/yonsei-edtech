# Plan: 세미나 출석 체크인 (seminar-checkin)

## 1. 개요

세미나 참석 신청자의 실제 출석을 QR 코드 기반으로 확인하는 체크인 시스템.
기존 `C:\work\yonsei_checkin` 프로젝트의 QR 스캔 패턴을 yonsei-edtech Next.js 앱에 통합.

## 2. 목표

- 세미나별 고유 QR 코드 생성 (참석자당 1개)
- 운영진(staff+)이 모바일 카메라로 QR 스캔하여 출석 처리
- 실시간 출석 현황 대시보드
- 중복 체크인 방지 및 출석 통계

## 3. 사용자 스토리

| 역할 | 스토리 | 우선순위 |
|------|--------|----------|
| 참석자(member) | 세미나 신청 후 마이페이지/대시보드에서 내 QR 코드를 확인할 수 있다 | P0 |
| 참석자(member) | 체크인 완료 시 상태가 실시간으로 반영된다 | P1 |
| 운영진(staff+) | 세미나 상세에서 "출석 체크" 버튼으로 QR 스캐너를 열 수 있다 | P0 |
| 운영진(staff+) | QR 스캔 시 참석자 이름/기수가 표시되고 출석이 기록된다 | P0 |
| 운영진(staff+) | 중복 스캔 시 "이미 체크인됨" 안내가 표시된다 | P0 |
| 운영진(staff+) | 실시간 출석 현황(전체/출석/미출석)을 확인할 수 있다 | P1 |
| 관리자(admin) | 세미나별 출석 기록을 관리자 페이지에서 조회할 수 있다 | P2 |

## 4. 기능 범위

### In Scope (MVP)
- **QR 토큰 생성**: 세미나 신청 시 UUID 토큰 자동 발급
- **QR 코드 표시**: 참석자 마이페이지/대시보드에서 QR 코드 렌더링
- **QR 스캐너**: jsQR 라이브러리 기반 카메라 스캔 (yonsei_checkin 패턴 차용)
- **체크인 처리**: 토큰 검증 → 출석 기록 → 결과 표시 (성공/중복/미등록)
- **출석 현황**: 세미나별 출석 통계 + 참석자 목록
- **중복 방지**: 클라이언트 쿨다운(3초) + 서버 중복 검증

### Out of Scope (추후)
- 오프라인 체크인 (네트워크 없는 환경)
- GPS 기반 위치 확인
- 체크인 시간 제한 (세미나 시작 전후 N분)
- 출석 통계 CSV 내보내기

## 5. 기술 설계 개요

### 5.1 데이터 모델 변경

```
SeminarAttendee (기존 attendeeIds 배열 → 개별 레코드)
  - id: string
  - seminarId: string
  - userId: string
  - qrToken: string (UUID v4)
  - checkedIn: boolean
  - checkedInAt: string | null
  - checkedInBy: string | null  // 스캔한 운영진 ID
  - createdAt: string

→ 현재 Mock 단계에서는 Zustand store에 추가
→ bkend 연동 시 seminar_attendees 테이블 활용
```

### 5.2 핵심 컴포넌트

| 컴포넌트 | 위치 | 역할 |
|----------|------|------|
| `QrCodeDisplay` | `src/features/seminar/QrCodeDisplay.tsx` | 참석자 QR 코드 표시 |
| `QrScanner` | `src/features/seminar/QrScanner.tsx` | jsQR 기반 카메라 스캐너 |
| `CheckinDashboard` | `src/features/seminar/CheckinDashboard.tsx` | 출석 현황 대시보드 |
| `AttendeeList` | `src/features/seminar/AttendeeList.tsx` | 참석자 목록 + 출석 상태 |

### 5.3 yonsei_checkin 참고 패턴

| 패턴 | 원본 | 적용 방식 |
|------|------|-----------|
| QR 렌더링 | qrserver.com 외부 API | `qrcode.react` 라이브러리 (npm, 자체 렌더링) |
| QR 인식 | jsQR + canvas + requestAnimationFrame | 동일 패턴 React 컴포넌트화 |
| 중복 방지 | SCAN_COOLDOWN 3초 + CHECKEDIN_COOLDOWN 5분 | 동일 로직 |
| 동시성 제어 | LockService (Google Apps Script) | Mock: optimistic update / bkend: 서버 측 처리 |
| 실시간 상태 | 4초 폴링 | Zustand subscribe 또는 polling |

### 5.4 라우팅

| 경로 | 용도 |
|------|------|
| `/seminars/[id]` (기존) | 세미나 상세 + 출석 체크 버튼 추가 |
| `/seminars/[id]/checkin` (신규) | QR 스캐너 페이지 (staff+ 전용) |

## 6. 의존성

- `qrcode.react` — QR 코드 렌더링 (npm)
- `jsqr` — QR 코드 인식 (npm)
- 기존 seminar-store 리팩터링 (attendeeIds → attendees 레코드)

## 7. 리스크

| 리스크 | 대응 |
|--------|------|
| 카메라 권한 거부 | 안내 메시지 + 수동 체크인 폴백 |
| HTTPS 필수 (카메라 API) | Vercel 배포 시 자동 HTTPS |
| 저사양 기기 스캔 성능 | 해상도 조절 (640x480 폴백) |
| Mock 단계 동시성 | Zustand 단일 스토어로 충돌 없음 |

## 8. 예상 작업량

- **S (Small)** — Zustand store 확장 + QR 표시: 1세션
- **M (Medium)** — QR 스캐너 + 체크인 로직: 1세션
- **S (Small)** — 출석 현황 UI: 1세션
- **총 예상**: 2~3세션
