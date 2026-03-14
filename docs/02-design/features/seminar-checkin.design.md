# Design: 세미나 출석 체크인 (seminar-checkin)

## 1. 구현 순서

```
1. npm install qrcode.react jsqr
2. seminar-store 리팩터링: attendeeIds[] → attendees[] 레코드 (qrToken, checkedIn 포함)
3. QrCodeDisplay 컴포넌트 (참석자 QR 표시)
4. QrScanner 컴포넌트 (운영진 카메라 스캔)
5. CheckinDashboard 컴포넌트 (출석 현황)
6. /seminars/[id] 페이지에 체크인 버튼 추가
7. /seminars/[id]/checkin 스캔 페이지 생성
8. /dashboard + /mypage에 QR 코드 표시 연동
```

## 2. 데이터 모델

### 2.1 SeminarAttendee 타입 (`src/types/index.ts` 추가)

```typescript
interface SeminarAttendee {
  id: string;
  seminarId: string;
  userId: string;
  userName: string;
  userGeneration: number;
  qrToken: string;        // UUID v4, QR에 인코딩
  checkedIn: boolean;
  checkedInAt: string | null;
  checkedInBy: string | null;  // 스캔한 운영진 userId
  createdAt: string;
}
```

### 2.2 Seminar 타입 변경

```typescript
// 기존
interface Seminar {
  attendeeIds: string[];
  // ...
}

// 변경
interface Seminar {
  attendees: SeminarAttendee[];  // attendeeIds 대체
  // ...
}
```

### 2.3 seminar-store 변경 사항

```typescript
// 신규 액션
interface SeminarState {
  // 기존 유지
  toggleAttendance: (seminarId: string, userId: string, userName: string, generation: number) => void;
  // 체크인 신규
  checkinByToken: (token: string, staffUserId: string) => CheckinResult;
  getAttendee: (seminarId: string, userId: string) => SeminarAttendee | undefined;
  getCheckinStats: (seminarId: string) => { total: number; checkedIn: number; remaining: number };
}

type CheckinResult =
  | { success: true; attendee: SeminarAttendee }
  | { success: false; alreadyCheckedIn: true; attendee: SeminarAttendee }
  | { success: false; message: string };
```

## 3. 컴포넌트 상세 설계

### 3.1 `src/features/seminar/QrCodeDisplay.tsx`

참석자가 자신의 QR 코드를 확인하는 컴포넌트.

```
Props:
  - token: string        // QR에 인코딩할 UUID
  - size?: number        // QR 크기 (기본 200)
  - userName?: string    // 이름 표시 (선택)

구현:
  - qrcode.react의 QRCodeSVG 사용
  - 색상: #0a2e6c (연세 블루)
  - 하단에 "세미나 출석 QR" 라벨
  - 체크인 완료 시 오버레이: "출석 완료 ✓"

사용처:
  - /mypage → 신청 세미나 카드 내 QR 표시
  - /dashboard → 내 신청 세미나 섹션
  - /seminars/[id] → 참석 신청 후 QR 표시
```

### 3.2 `src/features/seminar/QrScanner.tsx`

운영진이 카메라로 QR을 스캔하는 컴포넌트. yonsei_checkin의 scanLoop 패턴 차용.

```
Props:
  - onScan: (token: string) => void
  - enabled?: boolean

상태:
  - scannerStream: MediaStream | null
  - lastScannedToken: string
  - lastScanTime: number

핵심 로직:
  1. getUserMedia({ video: { facingMode: "environment" } })
  2. requestAnimationFrame 루프
  3. canvas에 비디오 프레임 그리기
  4. jsQR로 디코딩
  5. 중복 방지: SCAN_COOLDOWN 3초
  6. 토큰 발견 시 onScan(token) 호출
  7. 진동 피드백: navigator.vibrate(200)
  8. cleanup: stream.getTracks().forEach(t => t.stop())

UI:
  - 카메라 뷰 (aspect-square, rounded-2xl)
  - 스캔 가이드 오버레이 (중앙 사각형 프레임)
  - 하단: "QR 코드를 카메라에 비추세요" 안내
```

### 3.3 `src/features/seminar/CheckinDashboard.tsx`

세미나별 출석 현황 대시보드.

```
Props:
  - seminarId: string

UI 구성:
  1. 상단 StatCard 3열: 전체 / 출석 / 미출석
  2. 프로그레스 바: checkedIn / total
  3. 참석자 목록 테이블:
     - 이름, 기수, 출석 상태(Badge), 체크인 시각
     - 정렬: 미출석 우선 → 이름 순
  4. 수동 체크인 버튼 (운영진 권한): 이름 옆 체크 버튼
```

### 3.4 `src/features/seminar/CheckinResult.tsx`

스캔 결과 표시 컴포넌트 (스캐너 페이지에서 사용).

```
Props:
  - result: CheckinResult
  - onDismiss: () => void

UI:
  - 성공: 초록 배경 + 이름 + 기수 + "출석 완료"
  - 중복: 노랑 배경 + "이미 체크인됨" + 체크인 시각
  - 실패: 빨강 배경 + 에러 메시지
  - 3초 후 자동 dismiss
```

## 4. 페이지 설계

### 4.1 `/seminars/[id]/checkin/page.tsx` (신규)

```
AuthGuard allowedRoles={["staff", "president", "admin"]}

레이아웃:
  ┌──────────────────────────┐
  │ ← 세미나명               │
  │                          │
  │  ┌────────────────────┐  │
  │  │   QrScanner         │  │
  │  │   (카메라 뷰)       │  │
  │  └────────────────────┘  │
  │                          │
  │  [CheckinResult]         │
  │                          │
  │  ── 출석 현황 ──         │
  │  전체: 15  출석: 8       │
  │  미출석: 7               │
  │                          │
  │  [최근 체크인 로그]      │
  └──────────────────────────┘

로직:
  1. QrScanner onScan → seminarStore.checkinByToken(token, user.id)
  2. 결과 표시 (CheckinResult)
  3. 출석 현황 자동 갱신
```

### 4.2 `/seminars/[id]/page.tsx` (기존 수정)

```
추가 사항:
  - 참석 신청 완료 시 → QrCodeDisplay 표시
  - staff+ 사용자에게 "출석 체크" 버튼 추가
    → /seminars/[id]/checkin으로 이동
  - 하단에 간단한 출석 현황 표시 (total/checkedIn)
```

## 5. yonsei_checkin 패턴 대응표

| yonsei_checkin | yonsei-edtech | 비고 |
|----------------|---------------|------|
| Google Sheets | Zustand store (Mock) → bkend | 데이터 저장소 |
| `Utilities.getUuid()` | `crypto.randomUUID()` | QR 토큰 생성 |
| qrserver.com API | `qrcode.react` (QRCodeSVG) | QR 렌더링 |
| jsQR@1.4.0 | jsqr (npm) | QR 인식 |
| LockService | N/A (단일 클라이언트) | 동시성 |
| 4초 폴링 | Zustand subscribe | 실시간 상태 |
| sessionStorage | useAuthStore | 사용자 세션 |
| SCAN_COOLDOWN 3초 | 동일 | 중복 스캔 방지 |
| CHECKEDIN_COOLDOWN 5분 | 동일 | 체크인 토큰 쿨다운 |

## 6. 의존성 설치

```bash
npm install qrcode.react jsqr
npm install -D @types/jsqr
```

## 7. 구현 체크리스트

- [ ] `npm install qrcode.react jsqr`
- [ ] `SeminarAttendee` 타입 추가 (types/index.ts)
- [ ] `Seminar.attendeeIds` → `Seminar.attendees` 마이그레이션
- [ ] seminar-store: `checkinByToken`, `getCheckinStats` 액션 추가
- [ ] `QrCodeDisplay.tsx` 컴포넌트
- [ ] `QrScanner.tsx` 컴포넌트 (카메라 + jsQR + scanLoop)
- [ ] `CheckinResult.tsx` 컴포넌트
- [ ] `CheckinDashboard.tsx` 컴포넌트
- [ ] `/seminars/[id]/checkin/page.tsx` 스캔 페이지
- [ ] `/seminars/[id]/page.tsx` 체크인 버튼 + QR 표시
- [ ] 대시보드/마이페이지에 QR 연동
- [ ] MOCK_SEMINARS에 attendees 데이터 추가
