"use client";

/**
 * 해커톤 참가 신청 + 아이디어 보드 (v6-H6, 2026-07-18)
 * M6-v9 (2026-07-20): 팀 합류 희망 액션 + 합류자 칩 + 팀 확정 프리필 연결
 *
 * 기존 소통 보드(comm_boards, contextType="hackathon") 인프라를 재사용 — 신규 컬렉션 최소화.
 *  - 참가 신청 = "풀고 싶은 교육 현장의 문제" 한 줄 등록 (= comm_question)
 *  - 팀 참여 희망 여부 = question.presenter 슬롯 (HACKATHON_TEAM_PREFS)
 *  - 공감 = commLikesApi.toggle (question 좋아요)
 *  - 합류 희망 = hackathon_team_joins (결정적 docId: `${questionId}_${userId}`)
 *  - 팀 확정 = sessionStorage + CustomEvent 로 HackathonSubmissions 프리필 연결
 *  - 1인 1신청 — 본인(authorId) 질문 존재 여부로 판정
 * 게스트는 가입 유도(로그인 CTA).
 */

import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Lightbulb,
  Loader2,
  Heart,
  Users,
  CheckCircle2,
  Send,
  LogIn,
  UserPlus,
  UserCheck,
  ArrowRight,
  X,
  Pencil,
  Trash2,
  Save,
  Pin,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import EmptyState from "@/components/ui/empty-state";
import { useAuthStore } from "@/features/auth/auth-store";
import { commQuestionsApi, commLikesApi, hackathonTeamJoinsApi } from "@/lib/bkend";
import type { CommBoard, CommQuestion, HackathonTeamJoin } from "@/types";
import { ensureHackathonBoard } from "./ensure-hackathon-board";
import {
  HACKATHON_INTEREST_AREAS,
  HACKATHON_TEAM_PREFS,
  HACKATHON_TEAM_PREF_LIST,
  HACKATHON_CONTEXT_ID,
  type HackathonTeamPref,
} from "./config";

const MAX_LEN = 140;

/** body 앞에 붙은 관심 영역 태그 추출 (예: "K-12 학교 현장: 본문" → "K-12 학교 현장") */
function extractArea(body: string): string | null {
  for (const area of HACKATHON_INTEREST_AREAS) {
    if (body.startsWith(`${area}: `) || body.startsWith(`${area}:`)) return area;
  }
  return null;
}

export default function HackathonBoard() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  const [problem, setProblem] = useState("");
  const [teamPref, setTeamPref] = useState<HackathonTeamPref>(
    HACKATHON_TEAM_PREFS.undecided,
  );
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<string>("all");
  const [onboardingDismissed, setOnboardingDismissed] = useState(false);
  // v14-H3: 내 아이디어 수정
  const [editingEntry, setEditingEntry] = useState(false);
  const [editBody, setEditBody] = useState("");
  const [editTeamPref, setEditTeamPref] = useState<HackathonTeamPref>(HACKATHON_TEAM_PREFS.undecided);
  // H1: 관심 영역 태그 (신청 폼 선택)
  const [areaTag, setAreaTag] = useState<string | null>(null);

  useEffect(() => {
    setOnboardingDismissed(localStorage.getItem("hackathon_onboarding_dismissed") === "1");
  }, []);

  // 보드 프로비저닝 — 로그인 사용자만 (rules: create 는 ownerId==auth.uid)
  const { data: board, isLoading: boardLoading } = useQuery<CommBoard | null>({
    queryKey: ["hackathon-board"],
    queryFn: () =>
      user ? ensureHackathonBoard(user.id, user.name) : Promise.resolve(null),
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  const { data: entries = [] } = useQuery({
    queryKey: ["hackathon-entries", board?.id ?? ""],
    enabled: !!board,
    queryFn: async () => {
      const res = await commQuestionsApi.listByBoard(board!.id);
      return res.data as CommQuestion[];
    },
  });

  const { data: likedSet = new Set<string>() } = useQuery({
    queryKey: ["hackathon-likes", user?.id ?? "anon"],
    enabled: !!user,
    queryFn: () => commLikesApi.listMineSet(user!.id),
  });

  // ── 합류 희망 전체 로딩 (N+1 회피 — contextId 기준 일괄) ──
  const { data: allJoins = [] } = useQuery({
    queryKey: ["hackathon-joins", HACKATHON_CONTEXT_ID],
    enabled: !!user,
    queryFn: async () => {
      const res = await hackathonTeamJoinsApi.listByContext(HACKATHON_CONTEXT_ID);
      return res.data as HackathonTeamJoin[];
    },
    staleTime: 30 * 1000,
  });

  /** questionId → 합류 희망자 목록 */
  const joinsByQuestion = useMemo(() => {
    const map = new Map<string, HackathonTeamJoin[]>();
    for (const j of allJoins) {
      const list = map.get(j.questionId) ?? [];
      list.push(j);
      map.set(j.questionId, list);
    }
    return map;
  }, [allJoins]);

  /** 내가 합류 희망을 표시한 questionId 집합 */
  const myJoinedSet = useMemo(() => {
    if (!user) return new Set<string>();
    return new Set(allJoins.filter((j) => j.userId === user.id).map((j) => j.questionId));
  }, [allJoins, user]);

  const myEntry = useMemo(
    () => (user ? entries.find((e) => e.authorId === user.id) : undefined),
    [entries, user],
  );

  const sorted = useMemo(
    () =>
      [...entries].sort((a, b) =>
        (b.createdAt ?? "").localeCompare(a.createdAt ?? ""),
      ),
    [entries],
  );

  const visible = useMemo(() => {
    if (filter === "all") return sorted;
    // 팀 참여 희망 필터
    if ((HACKATHON_TEAM_PREF_LIST as readonly string[]).includes(filter)) {
      return sorted.filter((e) => (e.presenter ?? "") === filter);
    }
    // 관심 영역 필터 (H1)
    return sorted.filter((e) => extractArea(e.body) === filter);
  }, [sorted, filter]);

  const prefCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of entries) {
      const p = e.presenter ?? "";
      if (p) map.set(p, (map.get(p) ?? 0) + 1);
    }
    return map;
  }, [entries]);

  // H1: 관심 영역 집계
  const areaCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of entries) {
      const area = extractArea(e.body);
      if (area) map.set(area, (map.get(area) ?? 0) + 1);
    }
    return map;
  }, [entries]);

  function refresh() {
    if (board)
      queryClient.invalidateQueries({
        queryKey: ["hackathon-entries", board.id],
      });
    queryClient.invalidateQueries({
      queryKey: ["hackathon-likes", user?.id ?? "anon"],
    });
  }

  function refreshJoins() {
    queryClient.invalidateQueries({
      queryKey: ["hackathon-joins", HACKATHON_CONTEXT_ID],
    });
  }

  function handleDismissOnboarding() {
    localStorage.setItem("hackathon_onboarding_dismissed", "1");
    setOnboardingDismissed(true);
  }

  async function handleRegister() {
    if (!board || !user) return;
    const body = problem.trim();
    if (!body) {
      toast.error("풀고 싶은 문제를 한 줄 입력하세요.");
      return;
    }
    setSaving(true);
    try {
      await commQuestionsApi.create({
        boardId: board.id,
        contextId: board.contextId,
        authorId: user.id,
        authorName: user.name,
        anonymous: false,
        presenter: teamPref,
        body,
      });
      setProblem("");
      setAreaTag(null);
      refresh();
      toast.success("참가 신청이 완료되었습니다. 현장에서 만나요!");
    } catch (e) {
      console.error("[hackathon/register]", e);
      toast.error("신청 실패 — 잠시 후 다시 시도해주세요.");
    } finally {
      setSaving(false);
    }
  }

  /** v14-H3: 내 아이디어 수정 */
  async function handleUpdate() {
    if (!myEntry) return;
    const body = editBody.trim();
    if (!body) {
      toast.error("풀고 싶은 문제를 입력하세요.");
      return;
    }
    setSaving(true);
    try {
      await commQuestionsApi.update(myEntry.id, { body, presenter: editTeamPref });
      setEditingEntry(false);
      refresh();
      toast.success("아이디어를 수정했습니다.");
    } catch (e) {
      console.error("[hackathon/update]", e);
      toast.error("수정 실패 — 잠시 후 다시 시도해주세요.");
    } finally {
      setSaving(false);
    }
  }

  /** v14-H3: 내 아이디어 삭제 (참가 취소) */
  async function handleDelete() {
    if (!myEntry) return;
    if (!window.confirm("참가 신청을 취소하면 내 아이디어와 합류 희망 정보가 삭제됩니다. 계속할까요?")) return;
    setSaving(true);
    try {
      await commQuestionsApi.delete(myEntry.id);
      refresh();
      toast.success("참가 신청을 취소했습니다.");
    } catch (e) {
      console.error("[hackathon/delete]", e);
      toast.error("삭제 실패 — 잠시 후 다시 시도해주세요.");
    } finally {
      setSaving(false);
    }
  }

  async function handleLike(entry: CommQuestion) {
    if (!user) return;
    try {
      await commLikesApi.toggle(user.id, "question", entry.id);
      refresh();
    } catch (e) {
      console.error("[hackathon/like]", e);
      toast.error("공감 처리 실패 — 잠시 후 다시 시도해주세요.");
    }
  }

  /** 합류 희망 토글 — "팀원 찾는 중" 카드에서만 노출 */
  async function handleJoinToggle(entry: CommQuestion) {
    if (!user) return;
    const joined = myJoinedSet.has(entry.id);
    try {
      if (joined) {
        await hackathonTeamJoinsApi.delete(entry.id, user.id);
        toast.success("합류 희망을 취소했습니다.");
      } else {
        await hackathonTeamJoinsApi.upsert(entry.id, user.id, {
          questionId: entry.id,
          userId: user.id,
          userName: user.name,
          contextId: HACKATHON_CONTEXT_ID,
        });
        toast.success("합류 희망을 표시했습니다. 아이디어 작성자가 확인할 거예요!");
      }
      refreshJoins();
    } catch (e) {
      console.error("[hackathon/join-toggle]", e);
      toast.error("처리 실패 — 잠시 후 다시 시도해주세요.");
    }
  }

  /**
   * 팀 확정 — 내 아이디어 카드에 합류 희망자 + 본인을 포함해
   * sessionStorage + CustomEvent 로 HackathonSubmissions 제출 폼을 프리필한다.
   */
  function handleTeamConfirm() {
    if (!myEntry || !user) return;
    const joiners = joinsByQuestion.get(myEntry.id) ?? [];
    const members = [user.name, ...joiners.map((j) => j.userName)].join(", ");
    const prefill = { teamName: "", members };
    sessionStorage.setItem("hackathon_prefill", JSON.stringify(prefill));
    window.dispatchEvent(
      new CustomEvent("hackathon:prefill", { detail: prefill }),
    );
    document.getElementById("hackathon-submission")?.scrollIntoView({
      behavior: "smooth",
    });
    toast.success(
      "제출 폼에 팀원 목록을 입력했습니다. 팀 이름을 추가하고 제출하세요.",
      { duration: 4000 },
    );
  }

  // ── 비로그인: 가입 유도 ──
  if (!user) {
    return (
      <EmptyState
        icon={LogIn}
        title="로그인하고 참가 신청하기"
        description="참가 신청과 아이디어 등록은 회원 전용입니다. 로그인하면 풀고 싶은 문제를 남기고 팀원을 찾을 수 있어요."
        actions={[
          { label: "로그인", href: "/login" },
          { label: "회원가입", href: "/signup", variant: "outline" },
        ]}
      />
    );
  }

  if (boardLoading || !board) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-28 w-full rounded-2xl" />
        <Skeleton className="h-20 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── 핀 공지 — 운영진이 pinned:true 로 설정한 comm_boards hackathon 항목 ── */}
      {entries.filter((e) => e.pinned).length > 0 && (
        <section className="space-y-2">
          {entries
            .filter((e) => e.pinned)
            .map((notice) => (
              <div
                key={notice.id}
                className="flex items-start gap-2 rounded-2xl border border-primary/30 bg-primary/5 p-4"
              >
                <Pin size={14} className="mt-0.5 shrink-0 text-primary" />
                <p className="text-sm leading-relaxed text-foreground">
                  {notice.body}
                </p>
              </div>
            ))}
        </section>
      )}

      {/* ── 팀 형성 흐름 안내 (첫 방문 1회 · localStorage dismiss) ── */}
      {!onboardingDismissed && (
        <div className="relative rounded-2xl border bg-card p-4">
          <button
            aria-label="안내 닫기"
            className="absolute right-3 top-3 rounded-full p-0.5 text-muted-foreground hover:text-foreground transition-colors"
            onClick={handleDismissOnboarding}
          >
            <X size={14} />
          </button>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            해커톤 팀 형성 3단계
          </p>
          <ol className="flex flex-wrap gap-2">
            {[
              { step: "1", label: "아이디어 등록", desc: "풀고 싶은 문제를 한 줄 남기면 참가 신청이 됩니다." },
              { step: "2", label: "팀 합류", desc: "관심 있는 아이디어에 합류 희망을 표시하세요." },
              { step: "3", label: "팀 확정·제출", desc: "합류자를 확인 후 팀을 확정하고 산출물을 제출하세요." },
            ].map(({ step, label, desc }) => (
              <li
                key={step}
                className="flex min-w-[9rem] flex-1 items-start gap-2 rounded-xl bg-muted/50 px-3 py-2"
              >
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
                  {step}
                </span>
                <div>
                  <p className="text-xs font-semibold">{label}</p>
                  <p className="text-[11px] text-muted-foreground">{desc}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* ── 참가 신청 / 신청 완료 ── */}
      {myEntry ? (
        <section className="rounded-2xl border border-primary/30 bg-primary/5 p-4">
          <div className="flex items-start justify-between gap-2">
            <h3 className="flex items-center gap-1.5 text-sm font-bold text-primary">
              <CheckCircle2 size={16} />
              참가 신청 완료
            </h3>
            {/* v14-H3: 수정·삭제 버튼 */}
            {!editingEntry && (
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setEditBody(myEntry.body ?? "");
                    setEditTeamPref((myEntry.presenter as HackathonTeamPref) ?? HACKATHON_TEAM_PREFS.undecided);
                    setEditingEntry(true);
                  }}
                  className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  title="수정"
                >
                  <Pencil size={13} />
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={saving}
                  className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-destructive"
                  title="참가 취소"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            )}
          </div>

          {editingEntry ? (
            /* ── 수정 폼 ── */
            <div className="mt-3 space-y-3">
              <textarea
                value={editBody}
                onChange={(e) => setEditBody(e.target.value.slice(0, MAX_LEN))}
                rows={2}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
              />
              <div className="text-right text-[11px] text-muted-foreground">
                {editBody.length}/{MAX_LEN}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {HACKATHON_TEAM_PREF_LIST.map((pref) => (
                  <button
                    key={pref}
                    type="button"
                    onClick={() => setEditTeamPref(pref)}
                    aria-pressed={editTeamPref === pref}
                    className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
                      editTeamPref === pref
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border text-muted-foreground hover:bg-accent"
                    }`}
                  >
                    {pref}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleUpdate} disabled={saving || !editBody.trim()}>
                  {saving ? <Loader2 size={13} className="mr-1 animate-spin" /> : <Save size={13} className="mr-1" />}
                  저장
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setEditingEntry(false)} disabled={saving}>
                  취소
                </Button>
              </div>
            </div>
          ) : (
            <>
              <p className="mt-2 text-sm text-foreground">
                <span className="font-medium">내가 남긴 문제 </span>
                {myEntry.body}
              </p>
              <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5">
                  <Users size={11} /> {myEntry.presenter}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Heart size={11} /> 공감 {myEntry.likeCount}
                </span>
              </div>
            </>
          )}

          {/* ── 합류 희망자 목록 + 팀 확정 (편집 중에는 숨김) ── */}
          {!editingEntry && myEntry.presenter === HACKATHON_TEAM_PREFS.wantTeam && (
            <div className="mt-3 border-t border-primary/15 pt-3">
              <p className="mb-1.5 text-xs font-medium text-muted-foreground">
                합류 희망자
              </p>
              {(joinsByQuestion.get(myEntry.id) ?? []).length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  아직 없습니다 — 아이디어 보드에서 관심이 모이면 여기에 표시됩니다.
                </p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {(joinsByQuestion.get(myEntry.id) ?? []).map((j) => (
                    <span
                      key={j.id}
                      className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary"
                    >
                      <UserCheck size={11} />
                      {j.userName}
                    </span>
                  ))}
                </div>
              )}
              <Button
                size="sm"
                variant="outline"
                className="mt-3"
                onClick={handleTeamConfirm}
              >
                <ArrowRight size={13} className="mr-1" />
                팀 확정 → 제출 폼 이동
              </Button>
            </div>
          )}
        </section>
      ) : (
        <section className="rounded-2xl border bg-card p-4">
          <h3 className="flex items-center gap-1.5 text-sm font-bold">
            <Lightbulb size={16} className="text-primary" />
            참가 신청 — 풀고 싶은 교육 현장의 문제 한 줄
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            거창하지 않아도 좋아요. 평소 궁금했던 교육 현장의 문제를 한 줄로 남기면 신청이 됩니다.
          </p>

          {/* H1: 관심 영역 태그 선택 (토글) */}
          <div className="mt-3 flex flex-wrap gap-1.5">
            {HACKATHON_INTEREST_AREAS.map((area) => (
              <button
                key={area}
                type="button"
                aria-pressed={areaTag === area}
                onClick={() =>
                  setAreaTag((prev) => {
                    const next = prev === area ? null : area;
                    if (next) setProblem((p) => (p.trim() ? p : `${next}: `));
                    return next;
                  })
                }
                className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
                  areaTag === area
                    ? "border-primary bg-primary/10 font-medium text-primary"
                    : "border-border text-muted-foreground hover:bg-accent"
                }`}
              >
                {area}
              </button>
            ))}
          </div>

          <textarea
            value={problem}
            onChange={(e) => setProblem(e.target.value.slice(0, MAX_LEN))}
            rows={2}
            placeholder="예: 학생마다 이해 속도가 다른데 한 명의 교사가 모두를 챙기기 어렵다"
            className="mt-3 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
          />
          <div className="mt-0.5 text-right text-[11px] text-muted-foreground">
            {problem.length}/{MAX_LEN}
          </div>

          {/* 팀 참여 희망 여부 */}
          <div className="mt-2">
            <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
              팀 참여 희망
            </span>
            <div className="flex flex-wrap gap-1.5">
              {HACKATHON_TEAM_PREF_LIST.map((pref) => (
                <button
                  key={pref}
                  type="button"
                  onClick={() => setTeamPref(pref)}
                  aria-pressed={teamPref === pref}
                  className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
                    teamPref === pref
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border text-muted-foreground hover:bg-accent"
                  }`}
                >
                  {pref}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-3 flex justify-end">
            <Button
              size="sm"
              onClick={handleRegister}
              disabled={saving || !problem.trim()}
            >
              {saving ? (
                <Loader2 size={14} className="mr-1 animate-spin" />
              ) : (
                <Send size={14} className="mr-1" />
              )}
              참가 신청하기
            </Button>
          </div>
        </section>
      )}

      {/* ── 아이디어 보드 ── */}
      <section>
        <div className="mb-3 flex flex-wrap items-center gap-1.5">
          <h3 className="mr-1 flex items-center gap-1.5 text-sm font-bold">
            <Lightbulb size={15} className="text-primary" />
            아이디어 보드
          </h3>
          <button
            type="button"
            onClick={() => setFilter("all")}
            aria-pressed={filter === "all"}
            className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
              filter === "all"
                ? "border-primary bg-primary/10 font-medium text-primary"
                : "border-border text-muted-foreground hover:bg-accent"
            }`}
          >
            전체 {entries.length}
          </button>
          {HACKATHON_TEAM_PREF_LIST.filter(
            (p) => (prefCounts.get(p) ?? 0) > 0,
          ).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setFilter(p)}
              aria-pressed={filter === p}
              className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
                filter === p
                  ? "border-primary bg-primary/10 font-medium text-primary"
                  : "border-border text-muted-foreground hover:bg-accent"
              }`}
            >
              {p} {prefCounts.get(p)}
            </button>
          ))}
          {/* H1: 관심 영역 필터 탭 */}
          {HACKATHON_INTEREST_AREAS.filter(
            (area) => (areaCounts.get(area) ?? 0) > 0,
          ).map((area) => (
            <button
              key={area}
              type="button"
              onClick={() => setFilter(area)}
              aria-pressed={filter === area}
              className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
                filter === area
                  ? "border-primary bg-primary/10 font-medium text-primary"
                  : "border-border text-muted-foreground hover:bg-accent"
              }`}
            >
              {area} {areaCounts.get(area)}
            </button>
          ))}
        </div>

        <p className="sr-only" aria-live="polite">
          {filter === "all" ? "전체" : filter} {visible.length}건
        </p>

        {visible.length === 0 ? (
          <EmptyState
            icon={Lightbulb}
            title="아직 등록된 문제가 없습니다"
            description="첫 참가자가 되어 풀고 싶은 교육 현장의 문제를 남겨보세요."
          />
        ) : (
          <ul className="space-y-2.5">
            {visible.map((entry) => {
              const liked = likedSet.has(`question__${entry.id}`);
              const mine = entry.authorId === user.id;
              const isWantTeam =
                entry.presenter === HACKATHON_TEAM_PREFS.wantTeam;
              const joiners = joinsByQuestion.get(entry.id) ?? [];
              const iJoined = myJoinedSet.has(entry.id);
              // H1: 관심 영역 태그 파싱
              const entryArea = extractArea(entry.body);
              const displayBody = entryArea
                ? entry.body.slice(entryArea.length + 2).trim() || entry.body
                : entry.body;
              return (
                <li
                  key={entry.id}
                  className="rounded-2xl border bg-card p-4 transition-shadow hover:shadow-sm"
                >
                  {entryArea && (
                    <span className="mb-1.5 inline-flex items-center rounded-full bg-primary/8 px-2 py-0.5 text-[11px] font-medium text-primary">
                      {entryArea}
                    </span>
                  )}
                  <p className="text-sm leading-relaxed text-foreground">
                    {displayBody}
                  </p>
                  <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">
                      {entry.authorName ?? "회원"}
                      {mine && (
                        <span className="ml-1 text-primary">· 나</span>
                      )}
                    </span>
                    {entry.presenter && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5">
                        <Users size={11} /> {entry.presenter}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => handleLike(entry)}
                      disabled={mine}
                      aria-pressed={liked}
                      title={mine ? "본인 아이디어에는 공감할 수 없습니다" : "공감하기"}
                      className={`ml-auto inline-flex items-center gap-1 rounded-full border px-2.5 py-1 transition-colors ${
                        liked
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border hover:bg-accent"
                      } ${mine ? "cursor-not-allowed opacity-50" : ""}`}
                    >
                      <Heart
                        size={12}
                        className={liked ? "fill-current" : ""}
                      />
                      공감 {entry.likeCount}
                    </button>
                  </div>

                  {/* ── 합류자 칩 ── */}
                  {joiners.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {joiners.map((j) => (
                        <span
                          key={j.id}
                          className="inline-flex items-center gap-0.5 rounded-full bg-primary/8 px-2 py-0.5 text-[11px] text-primary"
                        >
                          <UserCheck size={10} />
                          {j.userName}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* ── 합류 희망 버튼 — "팀원 찾는 중"이고 본인 카드가 아닐 때 ── */}
                  {isWantTeam && !mine && (
                    <div className="mt-2.5">
                      <button
                        type="button"
                        onClick={() => handleJoinToggle(entry)}
                        aria-pressed={iJoined}
                        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                          iJoined
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border text-muted-foreground hover:bg-accent"
                        }`}
                      >
                        {iJoined ? (
                          <>
                            <UserCheck size={12} />
                            합류 희망 표시 중
                          </>
                        ) : (
                          <>
                            <UserPlus size={12} />
                            합류 희망
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
