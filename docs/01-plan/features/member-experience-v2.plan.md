# Plan: 일반 회원 경험 고도화 (member-experience-v2)

> **작성일**: 2026-03-14
> **기반**: 일반 회원(학회원) 관점 QA 테스트 제안서
> **테스트 환경**: 데스크탑(1045px) + 모바일(579px), 계정 아무아이디/test123

---

## 1. 현황 분석

### 1.1 이전 작업(Phase 1-2)에서 이미 해결된 항목

| # | 항목 | 상태 | 해결 방법 |
|---|------|------|----------|
| ② | 마이페이지 직접 URL 무한 로딩 | **해결됨** | AuthGuard: `useAuthStore()` → `useAuth()` + 5초 타임아웃 |
| ③ | 관리자 페이지 권한 없는 접근 무한 로딩 | **부분 해결** | AuthGuard 수정으로 로딩은 해결, 403 안내 미구현 |
| ⑤ | 비밀번호 변경 기능 없음 | **해결됨** | PasswordChangeForm.tsx 신규 생성, 마이페이지 배치 |
| ⑨ | 게시글 검색 기능 없음 | **해결됨** | usePosts에 search/page 파라미터 + 게시판 페이지네이션 |

### 1.2 해결이 필요한 항목 분류

#### Critical (즉시 수정)
| # | 버그 | 영향도 |
|---|------|--------|
| ① | 댓글 등록 버튼 미작동 | 커뮤니티 핵심 기능 차단 |
| ③+ | 권한 없는 페이지 접근 시 403 안내 없음 | UX 혼란 |

#### High (단기 구현)
| # | 기능 | 우선순위 근거 |
|---|------|-------------|
| ④ | 마이페이지 세미나 신청 내역 | 참여 기록 조회 불가 |
| ⑧ | 글쓰기 카테고리 제한 안내 | 회원 혼란 방지 |
| ⑱ | 모바일 멤버 카드 레이아웃 | 텍스트 잘림 (lg:4열 → sm:2열은 있으나 모바일 확인 필요) |

#### Medium (중기 구현)
| # | 기능 |
|---|------|
| ⑥ | 프로필 이미지 업로드 |
| ⑩ | 리치 에디터 (Markdown/TipTap) |
| ⑪ | 게시글 파일 첨부 |
| ⑫ | 게시글 좋아요/공감 |
| ⑬ | 세미나 캘린더 뷰 |
| ⑭ | 완료 세미나 발표 자료 |
| ⑮ | 세미나 신청 확인 토스트 |
| ⑯ | 멤버 카드 상세 모달 |
| ⑰ | 멤버 검색/필터 |

#### Low (장기 구현)
| # | 기능 |
|---|------|
| 4.1 | 활동 포트폴리오 |
| 4.2 | 스터디 그룹 모집 |
| 4.3 | 학회보 PDF 뷰어 |
| 4.4 | 알림 시스템 |
| 4.5 | 프로젝트 쇼케이스 |

---

## 2. Phase 3 구현 계획 — Critical + High

### Bug ①: 댓글 등록 버그 수정

**원인 분석**: `CommentForm.tsx`는 `useState` + `onChange`로 정상 구현되어 있음. 실제 원인은 `useCreateComment` mutation이 bkend API 호출에 실패하고, mock fallback이 없어서 에러가 발생하지만 catch에서 toast.error만 표시하고 로컬 상태를 업데이트하지 않기 때문.

**수정 방향**:
- `useBoard.ts`의 `useCreateComment`: API 실패 시 mock 댓글을 로컬에 추가하는 fallback 구현
- `MOCK_COMMENTS` 배열에 동적으로 추가 + queryClient 캐시 직접 업데이트
- 파일: `src/features/board/useBoard.ts`

### Bug ③+: 권한 없는 페이지 403 안내

**수정 방향**:
- `AuthGuard.tsx`: 권한 불일치 시 `router.push("/")` 대신 toast.error("접근 권한이 없습니다") + 리다이렉트
- 파일: `src/features/auth/AuthGuard.tsx`

### Feature ④: 마이페이지 세미나 신청 내역

**구현 방향**:
- `src/features/seminar/seminar-store.ts`에서 `user.id`로 `attendeeIds` 필터
- `src/app/mypage/page.tsx`에 "신청한 세미나" 섹션 추가
- 세미나명, 일시, 참석 취소 버튼 포함
- 파일: `src/app/mypage/page.tsx`, `src/features/seminar/useSeminar.ts`

### Feature ⑧: 글쓰기 카테고리 제한 안내

**구현 방향**:
- `PostForm.tsx`의 카테고리 선택 영역 아래에 안내 텍스트 추가
- `isAtLeast(user, "staff")`가 false일 때만 표시
- 파일: `src/features/board/PostForm.tsx`

### Feature ⑮: 세미나 참석 신청 완료 토스트

**구현 방향**:
- 세미나 참석 신청/취소 핸들러에 `toast.success()` 추가
- 파일: 세미나 상세 페이지 또는 `SeminarList.tsx` 내 참석 버튼 핸들러

---

## 3. 구현 순서

```
1. [Bug ①] 댓글 등록 mock fallback → 커뮤니티 핵심
2. [Bug ③+] AuthGuard 403 토스트 + 리다이렉트
3. [Feature ④] 마이페이지 세미나 신청 내역
4. [Feature ⑧] 글쓰기 카테고리 제한 안내 텍스트
5. [Feature ⑮] 세미나 신청 확인 토스트
6. 빌드 검증
```

---

## 4. 검증 기준

- `npm run build` 성공
- 댓글 등록 → 즉시 목록에 반영 (mock 모드)
- 일반 회원이 /admin 접근 → 토스트 + 홈 리다이렉트
- 마이페이지에서 신청한 세미나 확인 가능
- 글쓰기에서 카테고리 제한 안내 표시
