"use client";

/**
 * WallBoard — Padlet 스타일 실시간 담벼락 공용 컴포넌트 (2026-06-11)
 *
 * /boards/[id]/wall (수강생 화면)과 /boards/[id]/present (프로젝터 화면)가
 * 동일한 인터랙션을 공유한다 — present 도 질문/답변 추가·수정·삭제 전부 가능.
 *
 *  - 실시간: comm_questions onSnapshot — 새 노트 즉시 등장
 *  - 게스트 닉네임: 비로그인 입장자 대상 1회 설정(localStorage) → 작성기 기본값 공유
 *  - 발표자 그룹핑: board.presenters 기준 섹션 접기/펼치기 + 작성 시 발표자 태깅
 *  - 질문: 추가(작성기)·인라인 수정·삭제(회원 작성자/보드 소유자/운영진)
 *  - 해결 상태: 질문 작성자(회원)·보드 소유자/운영진이 직접 토글 (답변 채택과 별개)
 *  - 답변: 항상 펼침(AnswerThread) — 추가·수정·삭제, 게스트 답변 지원
 */

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { collection, onSnapshot, query, where, Timestamp } from "firebase/firestore";
import { QRCodeSVG } from "qrcode.react";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronDown,
  Download,
  Link as LinkIcon,
  List,
  Lock,
  MessageCircle,
  Pencil,
  QrCode,
  ThumbsUp,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { db } from "@/lib/firebase";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthStore } from "@/features/auth/auth-store";
import { commBoardsApi, commLikesApi, commQuestionsApi } from "@/lib/bkend";
import { sortQuestions, canManageBoard, canDeletePost } from "./comm-helpers";
import { getGuestNickname, setGuestNickname } from "./guest-name";
import QuestionComposer from "./QuestionComposer";
import AnswerThread from "./AnswerThread";
import type { CommAnswer, CommBoard, CommQuestion, CommSortMode, User } from "@/types";
import EmptyState from "@/components/ui/empty-state";

const PALETTE = [
  "border-warning/20 bg-warning/5",
  "border-info/20 bg-info/5",
  "border-destructive/20 bg-destructive/5",
  "border-success/20 bg-success/5",
  "border-cat-5/20 bg-cat-5/5",
  "border-warning/20 bg-warning/5",
];

function paletteOf(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h + id.charCodeAt(i)) % 997;
  return PALETTE[h % PALETTE.length];
}

function timeAgo(iso?: string): string {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "방금";
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  return new Date(iso).toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
}

function authorLabel(q: CommQuestion): string {
  if (q.anonymous) return "익명";
  return q.authorName ?? q.guestName ?? "게스트";
}

/**
 * QA P1: onSnapshot 원시 데이터의 createdAt/updatedAt 이 Firestore Timestamp 객체로
 * 들어오면 sortQuestions(localeCompare)·timeAgo 에서 크래시 — ISO 문자열로 정규화.
 */
function normalizeIso(v: unknown): string | undefined {
  if (typeof v === "string") return v;
  if (v instanceof Timestamp) return v.toDate().toISOString();
  return undefined;
}

const COMMON_KEY = "__common__";

interface Props {
  boardId: string;
  variant: "wall" | "present";
}

export default function WallBoard({ boardId, variant }: Props) {
  const isPresent = variant === "present";
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  // ── 보드 메타 ──
  const { data: board, isLoading: boardLoading } = useQuery({
    queryKey: ["comm-board", boardId],
    queryFn: async () => (await commBoardsApi.get(boardId)) as CommBoard,
  });

  // ── 질문 실시간 구독 ──
  const [questions, setQuestions] = useState<CommQuestion[]>([]);
  const [qLoading, setQLoading] = useState(true);
  useEffect(() => {
    const qy = query(collection(db, "comm_questions"), where("boardId", "==", boardId));
    const unsub = onSnapshot(
      qy,
      (snap) => {
        setQuestions(
          snap.docs.map((d) => {
            const raw = d.data() as Omit<CommQuestion, "id"> & { createdAt?: unknown; updatedAt?: unknown };
            return {
              ...raw,
              id: d.id,
              createdAt: normalizeIso(raw.createdAt),
              updatedAt: normalizeIso(raw.updatedAt),
            } as CommQuestion;
          }),
        );
        setQLoading(false);
      },
      (err) => {
        console.error("[wall-board]", err);
        setQLoading(false);
      },
    );
    return () => unsub();
  }, [boardId]);

  // ── 답변 실시간 구독 (보드 단위 1회) ──
  // QA P2: 질문당 AnswerThread 개별 쿼리(N+1) 해소 — 노트 50개 = 50쿼리 → 1구독.
  // 보너스: 답변도 질문처럼 실시간 반영.
  const [answersByQuestion, setAnswersByQuestion] = useState<Map<string, CommAnswer[]>>(new Map());
  useEffect(() => {
    const qy = query(collection(db, "comm_answers"), where("boardId", "==", boardId));
    const unsub = onSnapshot(
      qy,
      (snap) => {
        const map = new Map<string, CommAnswer[]>();
        snap.docs.forEach((d) => {
          const raw = d.data() as Omit<CommAnswer, "id"> & { createdAt?: unknown };
          const a = { ...raw, id: d.id, createdAt: normalizeIso(raw.createdAt) } as CommAnswer;
          const list = map.get(a.questionId) ?? [];
          list.push(a);
          map.set(a.questionId, list);
        });
        map.forEach((list) =>
          list.sort((x, y) => (x.createdAt ?? "").localeCompare(y.createdAt ?? "")),
        );
        setAnswersByQuestion(map);
      },
      (err) => console.error("[wall-board answers]", err),
    );
    return () => unsub();
  }, [boardId]);

  // ── 내 좋아요 집합 (회원) ──
  const { data: likedSet = new Set<string>() } = useQuery({
    queryKey: ["comm-likes-mine", user?.id ?? "guest"],
    enabled: !!user,
    queryFn: () => commLikesApi.listMineSet(user!.id),
  });

  const [sort, setSort] = useState<CommSortMode>("recent");
  useEffect(() => {
    if (board?.defaultSort) setSort(board.defaultSort);
  }, [board?.defaultSort]);

  const sorted = useMemo(() => sortQuestions(questions, sort), [questions, sort]);

  // ── 발표자 그룹핑 ──
  const presenters = useMemo(
    () => (board?.presenters ?? []).map((p) => p.trim()).filter(Boolean),
    [board?.presenters],
  );
  const hasPresenters = presenters.length > 0;
  const groups = useMemo(() => {
    if (!hasPresenters) return [{ key: COMMON_KEY, label: null as string | null, items: sorted }];
    const byPresenter = presenters.map((p) => ({
      key: p,
      label: p as string | null,
      items: sorted.filter((q) => q.presenter === p),
    }));
    const common = sorted.filter((q) => !q.presenter || !presenters.includes(q.presenter));
    return [...byPresenter, { key: COMMON_KEY, label: "공통 질문", items: common }];
  }, [hasPresenters, presenters, sorted]);

  // 그룹 접기/펼치기 (기본 모두 펼침)
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  function toggleGroup(key: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  // 작성 대상 발표자 (작성기 태깅)
  const [composerPresenter, setComposerPresenter] = useState<string>("");
  // present(프로젝터) 화면에서는 작성기 기본 접힘 — 발표 열람이 주 목적
  const [presentComposerOpen, setPresentComposerOpen] = useState(false);

  // ── 게스트 닉네임 입장 게이트 ──
  const [nickname, setNickname] = useState("");
  const [nickInput, setNickInput] = useState("");
  const [nickDismissed, setNickDismissed] = useState(false);
  useEffect(() => {
    setNickname(getGuestNickname());
  }, []);
  const showNickGate =
    !user && !!board?.allowGuest && board.status === "open" && !nickname && !nickDismissed;

  function handleNickSave() {
    const v = nickInput.trim();
    if (!v) {
      toast.error("닉네임을 입력하거나 '익명으로 참여'를 선택하세요.");
      return;
    }
    setGuestNickname(v);
    setNickname(v);
    toast.success(`${v}님, 환영합니다! 질문과 답글에 이름이 자동으로 들어갑니다.`);
  }

  // ── 새 노트 등장 애니메이션 ──
  // QA P2: useMemo 안에서 ref 를 바꾸면 렌더 단계 side effect — StrictMode 이중 호출/
  // 폐기 렌더에서 신규 노트 애니메이션이 누락됨 → useEffect + state 로 이동
  const prevIdsRef = useRef<Set<string>>(new Set());
  const [newIds, setNewIds] = useState<Set<string>>(new Set());
  useEffect(() => {
    const prev = prevIdsRef.current;
    const fresh = new Set(questions.filter((q) => !prev.has(q.id)).map((q) => q.id));
    prevIdsRef.current = new Set(questions.map((q) => q.id));
    if (prev.size > 0 && fresh.size > 0) setNewIds(fresh);
  }, [questions]);

  // ── 질문 수정/삭제/해결 ──
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  // QA P2: closed 보드 = 읽기 전용 (UI 게이트 — rules 에도 동일 게이트 적용됨)
  const isClosed = board?.status === "closed";
  // QA P2: 좋아요 더블클릭 경합 — 대상별 in-flight 가드
  const likeBusyRef = useRef<Set<string>>(new Set());

  async function handleLike(q: CommQuestion) {
    if (!user) {
      toast.error("좋아요는 로그인 회원만 가능합니다. 질문·답글은 그대로 참여하실 수 있어요!");
      return;
    }
    if (isClosed) {
      toast.error("닫힌 보드입니다 (읽기 전용).");
      return;
    }
    if (likeBusyRef.current.has(q.id)) return;
    likeBusyRef.current.add(q.id);
    try {
      await commLikesApi.toggle(user.id, "question", q.id);
      await queryClient.invalidateQueries({ queryKey: ["comm-likes-mine", user.id] });
    } catch {
      toast.error("좋아요 처리에 실패했습니다.");
    } finally {
      likeBusyRef.current.delete(q.id);
    }
  }

  function handleEditStart(q: CommQuestion) {
    setEditingId(q.id);
    setEditText(q.body);
  }

  async function handleQuestionEditSave(q: CommQuestion) {
    if (!editText.trim()) {
      toast.error("내용을 입력하세요.");
      return;
    }
    try {
      await commQuestionsApi.update(q.id, { body: editText.trim() });
      setEditingId(null);
      toast.success("질문이 수정되었습니다.");
    } catch {
      toast.error("수정 실패 — 권한을 확인하세요.");
    }
  }

  async function handleQuestionDelete(q: CommQuestion) {
    if (!confirm("이 질문을 삭제하시겠습니까? 달린 답변도 함께 삭제됩니다.")) return;
    try {
      await commQuestionsApi.delete(q.id);
      toast.success("삭제되었습니다.");
    } catch {
      toast.error("삭제 실패 — 권한을 확인하세요.");
    }
  }

  async function handleToggleResolved(q: CommQuestion) {
    try {
      await commQuestionsApi.setResolved(q.id, !q.resolved, q.resolvedAnswerId ?? null);
      toast.success(!q.resolved ? "해결됨으로 표시했습니다." : "해결 표시를 해제했습니다.");
    } catch {
      toast.error("처리 실패 — 권한을 확인하세요.");
    }
  }

  function copyLink() {
    const url = `${window.location.origin}/boards/${boardId}/wall`;
    void navigator.clipboard
      .writeText(url)
      .then(() => toast.success("공유 링크가 복사되었습니다."))
      .catch(() => toast.error("복사에 실패했습니다."));
  }

  /** 수업 종료 후 정리본 — 발표자 그룹별 질문·답변을 마크다운으로 (추가 쿼리 없음) */
  function handleExportDigest() {
    if (!board) return;
    const lines: string[] = [];
    lines.push(`# ${board.title} — Q&A 정리본`);
    if (board.description) lines.push(`> ${board.description}`);
    lines.push(`생성: ${new Date().toLocaleString("ko-KR")} · 질문 ${questions.length}개`);
    for (const g of groups) {
      if (g.items.length === 0) continue;
      lines.push(`\n## ${g.label ? (g.key === COMMON_KEY ? "💬 공통 질문" : `🎤 ${g.label}`) : "질문"} (${g.items.length})`);
      g.items.forEach((q, i) => {
        lines.push(`\n### Q${i + 1}. ${q.body.replace(/\s*\n+\s*/g, " ")}${q.resolved ? " ✅해결" : ""}`);
        lines.push(`- 작성: ${authorLabel(q)} · 👍 ${q.likeCount}`);
        for (const a of answersByQuestion.get(q.id) ?? []) {
          const name = a.anonymous ? "익명" : a.authorName ?? a.guestName ?? "게스트";
          const accepted = q.resolvedAnswerId === a.id ? " ✅채택" : "";
          lines.push(`  - 💬 ${name}: ${a.body.replace(/\s*\n+\s*/g, " ")}${accepted}`);
        }
      });
    }
    const md = lines.join("\n");
    void navigator.clipboard
      .writeText(md)
      .then(() => toast.success("정리본이 클립보드에 복사되고 파일로 저장됩니다."))
      .catch(() => { /* 다운로드는 계속 */ });
    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const el = document.createElement("a");
    el.href = url;
    el.download = `${board.title.replace(/[\\/:*?"<>|]/g, "_")}_QA정리본.md`;
    document.body.appendChild(el);
    el.click();
    el.remove();
    URL.revokeObjectURL(url);
  }

  if (boardLoading || !board) {
    return (
      <div className="mx-auto max-w-5xl space-y-4 p-4">
        <Skeleton className="h-16 w-full rounded-2xl" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-40 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
        </div>
      </div>
    );
  }

  const boardUrl = typeof window !== "undefined" ? `${window.location.origin}/boards/${boardId}/wall` : "";

  // NoteGrid(모듈 스코프) 공유 props — board 는 위 가드로 non-null 확정
  const noteGridShared = {
    board,
    user,
    likedSet,
    answersByQuestion,
    newIds,
    isPresent,
    isClosed,
    editingId,
    editText,
    guestNickname: nickname,
    onEditStart: handleEditStart,
    onEditCancel: () => setEditingId(null),
    onEditTextChange: setEditText,
    onEditSave: handleQuestionEditSave,
    onDelete: handleQuestionDelete,
    onToggleResolved: handleToggleResolved,
    onLike: handleLike,
  };

  return (
    <div className={cn("min-h-screen bg-gradient-to-b from-primary/[0.04] to-background", isPresent && "from-primary/[0.06]")}>
      <div className={cn("mx-auto p-4", isPresent ? "max-w-7xl" : "max-w-5xl")}>
        {/* ── 헤더 ── */}
        {isPresent ? (
          /* 프로젝터용: 큰 제목 + QR — 그대로 모든 인터랙션 가능 */
          <div className="flex flex-wrap items-center gap-4 rounded-3xl border-2 border-primary/20 bg-card p-5">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-primary">LIVE Q&A</p>
              <h1 className="mt-1 flex items-center gap-2 text-2xl font-bold tracking-tight sm:text-3xl">
                {board.status === "closed" && <Lock size={22} className="shrink-0 text-muted-foreground" />}
                <span className="truncate">{board.title}</span>
              </h1>
              {board.description && (
                <p className="mt-1 text-sm text-muted-foreground">{board.description}</p>
              )}
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {board.allowGuest && <Badge variant="outline" className="text-[10px]">로그인 없이 참여 가능</Badge>}
                <button type="button" onClick={copyLink} className="flex items-center gap-1 rounded border px-2 py-0.5 text-[11px] hover:bg-accent">
                  <LinkIcon size={11} /> 링크 복사
                </button>
                <button
                  type="button"
                  onClick={handleExportDigest}
                  title="질문·답변 마크다운 정리본 (클립보드+파일)"
                  className="flex items-center gap-1 rounded border px-2 py-0.5 text-[11px] hover:bg-accent"
                >
                  <Download size={11} /> 정리본
                </button>
                <Link href={`/boards/${boardId}`} className="flex items-center gap-1 rounded border px-2 py-0.5 text-[11px] hover:bg-accent">
                  <List size={11} /> 스레드
                </Link>
              </div>
            </div>
            {boardUrl && (
              <div className="flex shrink-0 flex-col items-center gap-1 rounded-2xl border bg-white p-3">
                <QRCodeSVG value={boardUrl} size={110} fgColor="#0a2e6c" />
                <span className="text-[10px] text-muted-foreground">QR 스캔으로 참여</span>
              </div>
            )}
          </div>
        ) : (
          /* 수강생용: sticky 툴바 */
          <div className="sticky top-0 z-20 -mx-4 border-b bg-background/90 px-4 py-3 backdrop-blur">
            <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-2">
              <Link href={`/boards/${boardId}`} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                <ArrowLeft size={13} />
                <List size={13} />
                <span className="hidden sm:inline">스레드 보기</span>
              </Link>
              <h1 className="flex min-w-0 flex-1 items-center gap-1.5 text-sm font-bold sm:text-base">
                {board.status === "closed" && <Lock size={14} className="shrink-0 text-muted-foreground" />}
                <span className="truncate">{board.title}</span>
                {board.allowGuest && <Badge variant="outline" className="shrink-0 text-[9px]">게스트 참여 가능</Badge>}
              </h1>
              <div className="flex shrink-0 items-center gap-1.5">
                <div className="flex rounded-lg border bg-muted/40 p-0.5 text-[11px]">
                  {(["recent", "popular"] as CommSortMode[]).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setSort(m)}
                      className={cn(
                        "rounded-md px-2 py-1 font-medium transition-colors",
                        sort === m ? "bg-background shadow-sm" : "text-muted-foreground",
                      )}
                    >
                      {m === "recent" ? "최신" : "인기"}
                    </button>
                  ))}
                </div>
                <button type="button" onClick={copyLink} className="flex items-center gap-1 rounded-lg border px-2 py-1.5 text-[11px] hover:bg-accent">
                  <LinkIcon size={12} />
                  <span className="hidden sm:inline">링크 복사</span>
                </button>
                <button
                  type="button"
                  onClick={handleExportDigest}
                  title="질문·답변 마크다운 정리본 (클립보드+파일)"
                  className="flex items-center gap-1 rounded-lg border px-2 py-1.5 text-[11px] hover:bg-accent"
                >
                  <Download size={12} />
                  <span className="hidden sm:inline">정리본</span>
                </button>
                <Link href={`/boards/${boardId}/present`} className="flex items-center gap-1 rounded-lg border px-2 py-1.5 text-[11px] hover:bg-accent">
                  <QrCode size={12} />
                  <span className="hidden sm:inline">발표 QR</span>
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* ── 게스트 닉네임 입장 게이트 ── */}
        {showNickGate && (
          <div className="mt-4 rounded-2xl border-2 border-primary/30 bg-primary/5 p-4">
            <p className="flex items-center gap-1.5 text-sm font-bold">
              <UserRound size={15} className="text-primary" />
              참여 닉네임을 설정해주세요
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              로그인 없이 참여 중입니다. 닉네임은 이 기기에 저장되어 질문·답글에 자동으로 사용됩니다.
            </p>
            <div className="mt-2.5 flex gap-2">
              <Input
                className="h-9 text-sm"
                placeholder="예: 김연세"
                value={nickInput}
                onChange={(e) => setNickInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleNickSave()}
              />
              <Button size="sm" className="h-9 shrink-0" onClick={handleNickSave}>
                시작하기
              </Button>
              <Button variant="outline" size="sm" className="h-9 shrink-0" onClick={() => setNickDismissed(true)}>
                익명으로 참여
              </Button>
            </div>
          </div>
        )}
        {!user && nickname && (
          <p className="mt-3 flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <UserRound size={12} />
            <span className="font-medium text-foreground">{nickname}</span>(으)로 참여 중
            <button
              type="button"
              className="text-primary hover:underline"
              onClick={() => {
                setGuestNickname("");
                setNickname("");
                setNickInput("");
                setNickDismissed(false);
              }}
            >
              변경
            </button>
          </p>
        )}

        {/* ── 작성기 (발표자 태깅) — present(프로젝터)에서는 기본 접힘 (사용성 평가 반영) ── */}
        {isPresent && !presentComposerOpen ? (
          board.status === "open" && (
            <button
              type="button"
              onClick={() => setPresentComposerOpen(true)}
              className="mt-3 inline-flex items-center gap-1.5 rounded-xl border border-dashed px-4 py-2 text-sm font-medium text-muted-foreground hover:border-primary/40 hover:text-primary"
            >
              + 질문 추가 (발표자용)
            </button>
          )
        ) : (
          <div className="mt-3">
            {board.description && !isPresent && (
              <p className="mb-2 text-sm text-muted-foreground">{board.description}</p>
            )}
            {hasPresenters && board.status === "open" && (
              <div className="mb-2 flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-medium text-muted-foreground">질문 대상:</span>
                <button
                  type="button"
                  onClick={() => setComposerPresenter("")}
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
                    composerPresenter === "" ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted",
                  )}
                >
                  공통
                </button>
                {presenters.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setComposerPresenter(p)}
                    className={cn(
                      "rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
                      composerPresenter === p ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted",
                    )}
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}
            <QuestionComposer
              board={board}
              user={user}
              guestNickname={nickname}
              presenter={composerPresenter || undefined}
              onCreated={() => { /* onSnapshot 실시간 반영 */ }}
            />
          </div>
        )}

        {/* ── 담벼락 (발표자 그룹) ── */}
        <div className="mt-5 space-y-6 pb-16">
          {qLoading ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Skeleton className="h-36 rounded-2xl" />
              <Skeleton className="h-28 rounded-2xl" />
              <Skeleton className="h-44 rounded-2xl" />
            </div>
          ) : sorted.length === 0 ? (
            <EmptyState
              icon={MessageCircle}
              title="아직 노트가 없습니다"
              description="첫 질문을 남겨보세요!"
            />
          ) : (
            groups.map((g) => {
              // 발표자 그룹이 없으면(단일 그룹) 헤더 없이 그리드만
              if (!g.label) {
                return <NoteGrid key={g.key} items={g.items} {...noteGridShared} />;
              }
              if (g.key === COMMON_KEY && g.items.length === 0) return null;
              const isCollapsed = collapsed.has(g.key);
              return (
                <section key={g.key}>
                  <button
                    type="button"
                    onClick={() => toggleGroup(g.key)}
                    aria-expanded={!isCollapsed}
                    className="flex w-full items-center gap-2 rounded-xl border bg-card px-4 py-2.5 text-left transition-colors hover:bg-muted/50"
                  >
                    <ChevronDown
                      size={15}
                      className={cn("shrink-0 text-muted-foreground transition-transform", isCollapsed && "-rotate-90")}
                    />
                    <span className={cn("font-bold", isPresent ? "text-lg" : "text-sm")}>
                      {g.key === COMMON_KEY ? "💬 공통 질문" : `🎤 ${g.label}`}
                    </span>
                    <Badge variant="secondary" className="text-[10px]">{g.items.length}</Badge>
                  </button>
                  {!isCollapsed && (
                    <div className="mt-3">
                      {g.items.length === 0 ? (
                        <EmptyState compact title={`아직 ${g.label} 발표자에 대한 질문이 없습니다`} />
                      ) : (
                        <NoteGrid items={g.items} {...noteGridShared} />
                      )}
                    </div>
                  )}
                </section>
              );
            })
          )}
        </div>

        {/* ── 라이브 인디케이터 ── */}
        <div className="fixed bottom-4 right-4 z-20 flex items-center gap-1.5 rounded-full border bg-card/90 px-3 py-1.5 text-[11px] text-muted-foreground shadow-md backdrop-blur">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
          </span>
          실시간 · 노트 {questions.length}
        </div>
      </div>
    </div>
  );

}

// ── 노트 그리드 (마소너리) — QA P1: 컴포넌트 내부 정의 시 매 렌더 remount 되어
// 답변 드래프트 소실·수정 textarea 포커스 이탈 발생 → 모듈 스코프로 추출해 element type 안정화.
interface NoteGridProps {
  items: CommQuestion[];
  board: CommBoard;
  user: User | null;
  likedSet: Set<string>;
  answersByQuestion: Map<string, CommAnswer[]>;
  newIds: Set<string>;
  isPresent: boolean;
  isClosed: boolean;
  editingId: string | null;
  editText: string;
  guestNickname: string;
  onEditStart: (q: CommQuestion) => void;
  onEditCancel: () => void;
  onEditTextChange: (t: string) => void;
  onEditSave: (q: CommQuestion) => void;
  onDelete: (q: CommQuestion) => void;
  onToggleResolved: (q: CommQuestion) => void;
  onLike: (q: CommQuestion) => void;
}

function NoteGrid({
  items,
  board,
  user,
  likedSet,
  answersByQuestion,
  newIds,
  isPresent,
  isClosed,
  editingId,
  editText,
  guestNickname,
  onEditStart,
  onEditCancel,
  onEditTextChange,
  onEditSave,
  onDelete,
  onToggleResolved,
  onLike,
}: NoteGridProps) {
  return (
    <div className="columns-1 gap-3 space-y-3 sm:columns-2 lg:columns-3">
      {items.map((q) => {
        const liked = likedSet.has(`question__${q.id}`);
        const canEdit = !isClosed && canDeletePost(user, q, board);
        const canResolve = !isClosed && !!user && (q.authorId === user.id || canManageBoard(user, board));
        const isEditing = editingId === q.id;
        return (
          <div
            key={q.id}
            className={cn(
              "break-inside-avoid rounded-2xl border-2 p-3.5 shadow-sm transition-shadow hover:shadow-md",
              paletteOf(q.id),
              newIds.has(q.id) && "animate-in zoom-in-95 fade-in duration-500",
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <span className={cn("font-semibold text-foreground/70", isPresent ? "text-xs" : "text-[11px]")}>
                {authorLabel(q)}
                {q.presenter && (
                  <Badge variant="outline" className="ml-1.5 text-[9px]">🎤 {q.presenter}</Badge>
                )}
              </span>
              <span className="flex shrink-0 items-center gap-1">
                <span className="text-[10px] text-muted-foreground">{timeAgo(q.createdAt)}</span>
                {canEdit && !isEditing && (
                  <>
                    <button
                      type="button"
                      title="질문 수정"
                      onClick={() => onEditStart(q)}
                      className="rounded p-0.5 text-muted-foreground hover:text-foreground"
                    >
                      <Pencil size={11} />
                    </button>
                    <button
                      type="button"
                      title="질문 삭제"
                      onClick={() => onDelete(q)}
                      className="rounded p-0.5 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 size={11} />
                    </button>
                  </>
                )}
              </span>
            </div>

            {isEditing ? (
              <div className="mt-1.5 space-y-1.5">
                <textarea
                  value={editText}
                  onChange={(e) => onEditTextChange(e.target.value)}
                  rows={3}
                  className="w-full rounded-md border bg-background px-2 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                />
                <div className="flex justify-end gap-1">
                  <button
                    type="button"
                    onClick={onEditCancel}
                    className="flex items-center gap-0.5 rounded border px-2 py-1 text-[10px] text-muted-foreground hover:bg-muted"
                  >
                    <X size={10} /> 취소
                  </button>
                  <button
                    type="button"
                    onClick={() => onEditSave(q)}
                    className="flex items-center gap-0.5 rounded bg-primary px-2 py-1 text-[10px] text-primary-foreground hover:bg-primary/90"
                  >
                    <Check size={10} /> 저장
                  </button>
                </div>
              </div>
            ) : (
              <p className={cn("mt-1.5 whitespace-pre-wrap leading-relaxed", isPresent ? "text-base" : "text-sm")}>
                {q.body}
              </p>
            )}

            <div className="mt-2.5 flex items-center gap-2 border-t border-foreground/5 pt-2">
              {q.resolved ? (
                <button
                  type="button"
                  disabled={!canResolve}
                  onClick={() => canResolve && onToggleResolved(q)}
                  title={canResolve ? "해결 표시 해제" : undefined}
                  className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-semibold text-success"
                >
                  <CheckCircle2 size={10} /> 해결됨
                </button>
              ) : (
                canResolve && (
                  <button
                    type="button"
                    onClick={() => onToggleResolved(q)}
                    className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] text-muted-foreground hover:border-success/40 hover:text-success"
                  >
                    <CheckCircle2 size={10} /> 해결로 표시
                  </button>
                )
              )}
              <button
                type="button"
                onClick={() => onLike(q)}
                aria-label="좋아요"
                className={cn(
                  "ml-auto flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] transition-colors",
                  liked ? "font-semibold text-primary" : "text-muted-foreground hover:text-foreground",
                  (!user || isClosed) && "opacity-60",
                )}
              >
                <ThumbsUp size={12} />
                {q.likeCount}
              </button>
              <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <MessageCircle size={12} />
                {q.answerCount}
              </span>
            </div>

            {/* 답변 — 항상 펼침 (작성·수정·삭제 가능, 게스트 지원) */}
            <div className="mt-1">
              <AnswerThread
                board={board}
                question={q}
                user={user}
                likedSet={likedSet}
                preloadedAnswers={answersByQuestion.get(q.id) ?? []}
                guestNickname={guestNickname}
                canAccept={!isClosed && !!user && (q.authorId === user.id || canManageBoard(user, board))}
                onChanged={() => { /* onSnapshot 실시간 반영 */ }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
