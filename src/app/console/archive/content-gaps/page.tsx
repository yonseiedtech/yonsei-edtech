"use client";

/**
 * 콘텐츠 갭 대시보드 (v7 H6, 2026-07-20)
 *
 * 분산된 "콘텐츠 갭 신호"를 콘솔 아카이브 하위 한 화면에 모아, 각 항목을 1클릭으로
 * 검수형 컬렉션(archive_foundation_terms)의 draft(published=false, reviewStatus="draft")로
 * 투입한다. 투입된 draft 는 기존 통합 검수 큐(/console/archive/review-queue)가 그대로 집계한다.
 * 신규 컬렉션·발송 로직은 만들지 않는다.
 *
 * H1(SuggestedActionsSection)과의 역할 분리:
 *   - H1 = /console/insights 의 "제안된 운영 액션" — 검색실패 등을 딥링크로 안내.
 *   - H6 = 이 페이지 — 콘텐츠 갭 신호 4종을 통합 집계하고 검수 큐로 직접 draft 를 생성(투입 액션).
 *
 * 신호 소스 (실측):
 *   (a) 검색 실패 Top — search_misses (count desc)                          [실재]
 *   (b) 미연결 개념 언급 — 벤치 H4                                          [소스 없음 · 생략]
 *         concept-matching.ts / ConceptMentionsInMyRecords.tsx 는 per-user 클라이언트
 *         전용 탐지 유틸이며, 콘솔에서 집계할 전역 영속 컬렉션이 없어 이 블록은 생략한다.
 *   (c) 세미나 우수 Q&A — comm_boards(contextType=seminar) + comm_questions  [실재]
 *   (d) 졸업논문 미등록 변인/키워드 — alumni_theses.analysis vs 아카이브 사전 [실재]
 *
 * read/write 권한: staff 이상 (firestore.rules — archive_* create 는 isStaffOrAbove).
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  collection,
  getDocs,
  limit as fbLimit,
  orderBy,
  query as buildQuery,
} from "firebase/firestore";
import {
  PackageSearch,
  Search,
  MessageSquareQuote,
  GraduationCap,
  Send,
  Check,
  Loader2,
  ArrowLeft,
  ClipboardCheck,
  Info,
} from "lucide-react";
import { db } from "@/lib/firebase";
import {
  dataApi,
  foundationTermsApi,
  archiveConceptsApi,
  archiveVariablesApi,
  alumniThesesApi,
  commQuestionsApi,
} from "@/lib/bkend";
import type { FoundationTermCategory } from "@/types/foundation-term";
import type { AlumniThesis } from "@/types/alumni";
import type { CommBoard, CommQuestion } from "@/types/comm-board";
import ConsolePageHeader from "@/components/admin/ConsolePageHeader";
import { useAuthStore } from "@/features/auth/auth-store";
import { isAtLeast } from "@/lib/permissions";
import { useInvalidateArchiveDraftBadge } from "@/features/admin/useArchiveDraftBadge";
import { logAudit } from "@/lib/audit";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ── 튜닝 상수 ────────────────────────────────────────────────────────────────
const SEARCH_MISS_TOP_N = 15;
const SEARCH_MISS_MIN_COUNT = 2;
const SEMINAR_BOARD_SCAN = 25; // 세미나 보드 스캔 상한(읽기 비용 방어)
const SEMINAR_QNA_TOP_N = 12;
const SEMINAR_QNA_MIN_LIKES = 1;
const THESIS_SCAN = 500;
const THESIS_CANDIDATE_TOP_N = 15;

/** draft 로 투입되는 시드 후보의 기본 분류 — 검수 시 운영진이 정정한다. */
const DEFAULT_SEED_CATEGORY: FoundationTermCategory = "learning-theory";

// ── 정규화 (아카이브 사전 대조용) ────────────────────────────────────────────
function norm(s: string): string {
  return s.toLowerCase().replace(/\s+/g, "").trim();
}

// ── (a) 검색 실패 ────────────────────────────────────────────────────────────
interface SearchMissRow {
  id: string;
  query: string;
  count: number;
  lastAt: string;
}

async function fetchSearchMisses(): Promise<SearchMissRow[]> {
  const q = buildQuery(
    collection(db, "search_misses"),
    orderBy("count", "desc"),
    fbLimit(SEARCH_MISS_TOP_N),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data();
    const ts = data.lastAt as { toDate?: () => Date } | null | undefined;
    return {
      id: d.id,
      query: (data.query as string) ?? d.id,
      count: (data.count as number) ?? 0,
      lastAt: ts?.toDate?.()?.toLocaleDateString("ko-KR") ?? "—",
    };
  });
}

// ── (c) 세미나 우수 Q&A ──────────────────────────────────────────────────────
interface SeminarQna {
  id: string;
  body: string;
  likeCount: number;
  answerCount: number;
  resolved: boolean;
  boardTitle: string;
}

async function fetchSeminarQna(): Promise<SeminarQna[]> {
  // 세미나 컨텍스트 보드만 스캔 (comm_questions 에는 contextType 이 없어 보드 우선 조회).
  const boardsRes = await dataApi.list<CommBoard>("comm_boards", {
    "filter[contextType]": "seminar",
    limit: SEMINAR_BOARD_SCAN,
  });
  const boards = boardsRes.data.slice(0, SEMINAR_BOARD_SCAN);
  if (boards.length === 0) return [];

  const perBoard = await Promise.all(
    boards.map(async (b) => {
      try {
        const res = await commQuestionsApi.listByBoard(b.id);
        return res.data.map((q: CommQuestion) => ({ q, boardTitle: b.title }));
      } catch {
        return [] as { q: CommQuestion; boardTitle: string }[];
      }
    }),
  );

  const flat = perBoard.flat();
  // 우수 = 채택(resolved) 되었거나 좋아요가 임계 이상인 질문
  const good = flat.filter(
    ({ q }) => q.resolved || (q.likeCount ?? 0) >= SEMINAR_QNA_MIN_LIKES,
  );
  good.sort(
    (a, b) =>
      Number(b.q.resolved) - Number(a.q.resolved) ||
      (b.q.likeCount ?? 0) - (a.q.likeCount ?? 0) ||
      (b.q.answerCount ?? 0) - (a.q.answerCount ?? 0),
  );
  return good.slice(0, SEMINAR_QNA_TOP_N).map(({ q, boardTitle }) => ({
    id: q.id,
    body: (q.body ?? "").replace(/\s+/g, " ").trim(),
    likeCount: q.likeCount ?? 0,
    answerCount: q.answerCount ?? 0,
    resolved: !!q.resolved,
    boardTitle,
  }));
}

// ── (d) 졸업논문 미등록 변인/키워드 ──────────────────────────────────────────
interface ThesisCandidate {
  term: string;
  freq: number;
}

async function fetchThesisCandidates(): Promise<ThesisCandidate[]> {
  const [thesesRes, conceptsRes, variablesRes, termsRes] = await Promise.all([
    alumniThesesApi.list({ limit: THESIS_SCAN }),
    archiveConceptsApi.list(),
    archiveVariablesApi.list(),
    foundationTermsApi.list(),
  ]);

  // 아카이브에 이미 존재하는 이름 사전 (개념·변인·기초용어 + 별칭/역어)
  const known = new Set<string>();
  for (const c of conceptsRes.data) {
    [c.name, c.purifiedName, c.aectTerm, ...(c.altNames ?? [])].forEach(
      (n) => n && known.add(norm(n)),
    );
  }
  for (const v of variablesRes.data) {
    [v.name, ...(v.altNames ?? [])].forEach((n) => n && known.add(norm(n)));
  }
  for (const t of termsRes.data) {
    [t.term, t.purifiedName, t.aectTerm, t.englishName, t.abbreviation].forEach(
      (n) => n && known.add(norm(n)),
    );
  }

  // 논문 분석 프로필의 변인·키워드 빈도 집계 (독립·종속 변인 + 키워드)
  const freq = new Map<string, { term: string; count: number }>();
  const add = (raw: string) => {
    const term = raw.trim();
    if (term.length < 2) return;
    if (/^\d+$/.test(term)) return; // 순수 숫자 제외
    const key = norm(term);
    if (!key || known.has(key)) return;
    const cur = freq.get(key);
    if (cur) cur.count += 1;
    else freq.set(key, { term, count: 1 });
  };

  for (const th of thesesRes.data as AlumniThesis[]) {
    const a = th.analysis;
    if (a) {
      (a.independent ?? []).forEach(add);
      (a.dependent ?? []).forEach(add);
    }
    (th.keywords ?? []).forEach(add);
  }

  return [...freq.values()]
    .filter((c) => c.count >= 1)
    .sort((a, b) => b.count - a.count || a.term.localeCompare(b.term))
    .slice(0, THESIS_CANDIDATE_TOP_N)
    .map((c) => ({ term: c.term, freq: c.count }));
}

// ── 시드 투입 신호 메타 ──────────────────────────────────────────────────────
type GapSignal = "search_miss" | "seminar_qna" | "thesis_unlinked";

const SIGNAL_LABELS: Record<GapSignal, string> = {
  search_miss: "검색 실패",
  seminar_qna: "세미나 우수 Q&A",
  thesis_unlinked: "졸업논문 미등록 변인",
};

// ── UI ───────────────────────────────────────────────────────────────────────
function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n)}…` : s;
}

interface InjectArgs {
  key: string;
  term: string;
  summary: string;
  category: FoundationTermCategory;
  signal: GapSignal;
}

function SectionCard({
  icon: Icon,
  title,
  hint,
  children,
}: {
  icon: React.ElementType;
  title: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border bg-card p-5">
      <h2 className="mb-1 flex flex-wrap items-center gap-2 text-sm font-bold">
        <Icon size={15} className="text-primary" />
        {title}
        <span className="text-[11px] font-normal text-muted-foreground">— {hint}</span>
      </h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function InjectButton({
  injected,
  busy,
  onClick,
}: {
  injected: boolean;
  busy: boolean;
  onClick: () => void;
}) {
  if (injected) {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs font-semibold text-primary">
        <Check size={12} /> 투입됨
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/10 disabled:opacity-50"
    >
      {busy ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
      검수 큐로 투입
    </button>
  );
}

function EmptyRow({ text }: { text: string }) {
  return (
    <p className="rounded-xl border border-dashed bg-muted/10 py-8 text-center text-sm text-muted-foreground">
      {text}
    </p>
  );
}

function LoadingBlock() {
  return (
    <div className="space-y-2">
      <div className="h-14 animate-pulse rounded-xl border bg-muted/40" />
      <div className="h-14 animate-pulse rounded-xl border bg-muted/40" />
    </div>
  );
}

export default function ConsoleContentGapsPage() {
  const { user } = useAuthStore();
  const allowed = isAtLeast(user, "staff");
  const invalidateBadge = useInvalidateArchiveDraftBadge();

  const [injected, setInjected] = useState<Set<string>>(new Set());
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const searchQ = useQuery({
    queryKey: ["content-gaps", "search-misses"],
    staleTime: 5 * 60_000,
    queryFn: fetchSearchMisses,
    enabled: allowed,
  });
  const qnaQ = useQuery({
    queryKey: ["content-gaps", "seminar-qna"],
    staleTime: 5 * 60_000,
    queryFn: fetchSeminarQna,
    enabled: allowed,
  });
  const thesisQ = useQuery({
    queryKey: ["content-gaps", "thesis-candidates"],
    staleTime: 5 * 60_000,
    queryFn: fetchThesisCandidates,
    enabled: allowed,
  });

  const searchRows = useMemo(
    () => (searchQ.data ?? []).filter((r) => r.count >= SEARCH_MISS_MIN_COUNT),
    [searchQ.data],
  );

  async function inject(args: InjectArgs) {
    if (busyKey || injected.has(args.key)) return;
    setBusyKey(args.key);
    const nowIso = new Date().toISOString();
    try {
      await foundationTermsApi.create({
        term: args.term,
        category: args.category,
        summary: args.summary,
        published: false,
        reviewStatus: "draft",
        // 출처 갭 신호 provenance (검수 시 참고, 스키마 확장 필드)
        contentGapSource: args.signal,
        contentGapNote: args.summary,
        createdBy: user?.id ?? "",
        createdAt: nowIso,
      });
      setInjected((prev) => new Set(prev).add(args.key));
      invalidateBadge();
      logAudit({
        action: "콘텐츠 갭 시드 투입",
        category: "system",
        detail: `${SIGNAL_LABELS[args.signal]} · "${truncate(args.term, 40)}" → 기초용어 draft 생성`,
        targetName: args.term,
        userId: user?.id ?? "",
        userName: user?.name ?? "",
      });
      toast.success(`검수 큐로 투입 — ${truncate(args.term, 24)}`);
    } catch (err) {
      console.error("[content-gaps] inject failed", err);
      toast.error("투입 실패 — 잠시 후 다시 시도하세요");
    } finally {
      setBusyKey(null);
    }
  }

  if (!allowed) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground">접근 권한이 없습니다 (staff 이상).</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ConsolePageHeader
        icon={PackageSearch}
        title="콘텐츠 갭"
        description="분산된 콘텐츠 갭 신호를 한 곳에 모아, 아카이브 시드 후보를 1클릭으로 통합 검수 큐에 투입합니다."
        actions={
          <Link href="/console/archive/review-queue">
            <span className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
              <ClipboardCheck className="h-4 w-4" />
              통합 검수 큐
            </span>
          </Link>
        }
      />

      <p className="flex items-start gap-2 rounded-xl border border-dashed bg-muted/10 p-3 text-xs leading-relaxed text-muted-foreground">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
        <span>
          &ldquo;검수 큐로 투입&rdquo;은 기초 용어(archive_foundation_terms)에{" "}
          <strong className="font-semibold text-foreground">draft(비공개·검수 대기)</strong> 문서를
          만듭니다. 이름과 갭 신호 메모가 프리필되며, 분류·정의는 통합 검수 큐에서 검수·정정 후
          공개하세요. 미연결 개념 언급(벤치 H4)은 개인 기록 전용 기능이라 콘솔 집계 소스가 없어
          생략했습니다.
        </span>
      </p>

      {/* (a) 검색 실패 Top */}
      <SectionCard
        icon={Search}
        title="검색 실패 Top"
        hint="많이 찾았지만 결과가 없던 질의 (search_misses)"
      >
        {searchQ.isLoading ? (
          <LoadingBlock />
        ) : searchQ.isError ? (
          <EmptyRow text="검색 실패 데이터를 불러오지 못했습니다." />
        ) : searchRows.length === 0 ? (
          <EmptyRow text="임계 이상 반복된 검색 실패 질의가 아직 없습니다." />
        ) : (
          <ul className="space-y-2">
            {searchRows.map((row) => {
              const key = `search:${row.id}`;
              const summary = `검색 실패 ${row.count}회 · 아카이브 콘텐츠 갭(자동 제안). 검수 시 분류·정의 작성 필요.`;
              return (
                <li
                  key={key}
                  className="flex flex-col gap-2 rounded-xl border bg-background p-3 sm:flex-row sm:items-center"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{row.query}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {row.count}회 검색 · 최근 {row.lastAt}
                    </p>
                  </div>
                  <div className="sm:ml-auto">
                    <InjectButton
                      injected={injected.has(key)}
                      busy={busyKey === key}
                      onClick={() =>
                        inject({
                          key,
                          term: row.query,
                          summary,
                          category: DEFAULT_SEED_CATEGORY,
                          signal: "search_miss",
                        })
                      }
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </SectionCard>

      {/* (c) 세미나 우수 Q&A */}
      <SectionCard
        icon={MessageSquareQuote}
        title="세미나 우수 Q&A"
        hint="채택·좋아요 상위 질문 (comm_boards · seminar)"
      >
        {qnaQ.isLoading ? (
          <LoadingBlock />
        ) : qnaQ.isError ? (
          <EmptyRow text="세미나 Q&A 데이터를 불러오지 못했습니다." />
        ) : (qnaQ.data ?? []).length === 0 ? (
          <EmptyRow text="채택되거나 좋아요를 받은 세미나 Q&A가 아직 없습니다." />
        ) : (
          <ul className="space-y-2">
            {(qnaQ.data ?? []).map((row) => {
              const key = `qna:${row.id}`;
              const summary = `세미나 우수 Q&A(좋아요 ${row.likeCount}${row.resolved ? " · 채택됨" : ""}) 기반 시드 후보. 검수 시 용어 정제 필요.`;
              return (
                <li
                  key={key}
                  className="flex flex-col gap-2 rounded-xl border bg-background p-3 sm:flex-row sm:items-start"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{truncate(row.body, 90)}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {row.boardTitle} · 좋아요 {row.likeCount} · 답변 {row.answerCount}
                      {row.resolved && " · 채택됨"}
                    </p>
                  </div>
                  <div className="sm:ml-auto">
                    <InjectButton
                      injected={injected.has(key)}
                      busy={busyKey === key}
                      onClick={() =>
                        inject({
                          key,
                          term: truncate(row.body, 50),
                          summary,
                          category: DEFAULT_SEED_CATEGORY,
                          signal: "seminar_qna",
                        })
                      }
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </SectionCard>

      {/* (d) 졸업논문 미등록 변인/키워드 */}
      <SectionCard
        icon={GraduationCap}
        title="졸업논문 미등록 변인·키워드"
        hint="분석 프로필에 있지만 아카이브에 없는 용어 (alumni_theses)"
      >
        {thesisQ.isLoading ? (
          <LoadingBlock />
        ) : thesisQ.isError ? (
          <EmptyRow text="졸업논문 데이터를 불러오지 못했습니다." />
        ) : (thesisQ.data ?? []).length === 0 ? (
          <EmptyRow text="아카이브에 없는 논문 변인·키워드 후보가 없습니다." />
        ) : (
          <ul className="space-y-2">
            {(thesisQ.data ?? []).map((row) => {
              const key = `thesis:${norm(row.term)}`;
              const summary = `졸업논문 ${row.freq}편의 분석 변인/키워드지만 아카이브 미등록(자동 제안). 검수 시 분류·정의 작성 필요.`;
              return (
                <li
                  key={key}
                  className="flex flex-col gap-2 rounded-xl border bg-background p-3 sm:flex-row sm:items-center"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{row.term}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      논문 {row.freq}편에서 언급 · 아카이브 미등록
                    </p>
                  </div>
                  <div className="sm:ml-auto">
                    <InjectButton
                      injected={injected.has(key)}
                      busy={busyKey === key}
                      onClick={() =>
                        inject({
                          key,
                          term: row.term,
                          summary,
                          category: "variables",
                          signal: "thesis_unlinked",
                        })
                      }
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}
