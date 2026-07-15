// ── 세미나 라이브 콘솔 도메인 ──
// 실시간 장표(PDF) 동기화 · 강의노트 · Q&A 연계 · 실시간 설문의 상태 모델.
// 실시간 전송은 Firebase Firestore onSnapshot 리스너를 사용한다 (comm-board 동일 패턴).

export type LiveStatus = "idle" | "live" | "paused" | "ended";

/**
 * 라이브 세션 제어 문서 — 세미나당 1개(id = seminarId).
 * 발표자가 write, 참가자는 onSnapshot 으로 read 하여 화면을 동기화한다.
 */
export interface SeminarLiveSession {
  id: string; // = seminarId (1:1)
  seminarId: string;
  status: LiveStatus;
  presenterId: string;
  presenterName: string;
  /** 현재 발표 중인 장표 덱 id */
  deckId?: string;
  /** 발표자가 넘기는 현재 페이지 (0-based) */
  currentSlide: number;
  totalSlides: number;
  /** 지금 띄운 설문/투표 id — 없으면 참가자 화면에 설문 미표시 */
  activePollId?: string;
  /** 연결된 comm-board id (contextType="seminar") */
  qaBoardId?: string;
  allowGuest: boolean;
  /** 6자리 참여 코드 (QR/수기 입장) */
  joinCode: string;
  /** 라이브 접속자 수 (presence 집계) */
  participantCount?: number;
  startedAt?: string;
  endedAt?: string;
  updatedAt: string;
}

/**
 * 업로드된 장표 덱 + 발표자 강의노트.
 * PDF 는 업로드 시점에 발표자 브라우저에서 페이지별 PNG 로 래스터화(pdfjs)하여
 * Firebase Storage 에 올린다 → 라이브 열람은 img 교체(초경량).
 */
export interface SeminarSlideDeck {
  id: string;
  seminarId: string;
  title: string;
  /** 원본 PDF (Storage) — "원본 다운로드"용 */
  sourcePdfUrl: string;
  /** 페이지별 PNG (Storage), index = 슬라이드 번호 */
  pageImageUrls: string[];
  pageCount: number;
  /** slide index → 발표자 강의노트(마크다운) */
  lectureNotes: Record<number, string>;
  uploadedBy: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * 참가자 개인 노트(비공개) — 슬라이드에 앵커링.
 * ownerId 는 로그인 userId 또는 게스트 로컬 id. Firestore rules 로 소유자 외 접근 차단.
 */
export interface SeminarNoteEntry {
  id: string;
  seminarId: string;
  ownerId: string;
  slide: number;
  body: string;
  createdAt: string;
  updatedAt: string;
}

/** 6자리 영숫자 참여 코드 생성 (혼동 문자 제외: 0/O/1/I/L) */
export function generateJoinCode(seed: string): string {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  let out = "";
  for (let i = 0; i < 6; i++) {
    out += alphabet[hash % alphabet.length];
    hash = Math.floor(hash / alphabet.length) + (hash % 7) + i;
  }
  return out;
}
