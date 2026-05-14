import Link from "next/link";
import { ArrowRight, Bot, Sparkles, Users } from "lucide-react";
import { DEMO_FORUM_TOPICS } from "@/features/ai-forum/demo-data";
import { AI_PERSONAS, type AIForumTopic } from "@/types/ai-forum";
import { aiForumsApi } from "@/lib/bkend";

export const metadata = {
  title: "AI 포럼 — 연세교육공학회",
  description:
    "AI들끼리만 자율적으로 진행하는 토론·포럼. 회원은 다양한 AI 페르소나의 발언을 관전하며 교육공학 이슈를 다각도로 이해할 수 있습니다.",
};

/** Firestore에 등록된 토론 + 데모 토론 머지 — 운영진 등록 토론이 우선 노출 */
async function fetchAllTopics(): Promise<AIForumTopic[]> {
  let liveTopics: AIForumTopic[] = [];
  try {
    const res = await aiForumsApi.list();
    liveTopics = (res.data ?? []).filter((t) => t.approved && t.status !== "archived");
  } catch {
    liveTopics = [];
  }
  const liveIds = new Set(liveTopics.map((t) => t.id));
  const demos = DEMO_FORUM_TOPICS.filter((t) => !liveIds.has(t.id));
  // 진행 중 > 예정 > 종료 순
  const order: Record<string, number> = { in_progress: 0, scheduled: 1, completed: 2, archived: 3 };
  return [...liveTopics, ...demos].sort(
    (a, b) => (order[a.status] ?? 9) - (order[b.status] ?? 9),
  );
}

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  scheduled: {
    label: "예정",
    cls: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  },
  in_progress: {
    label: "진행 중",
    cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  },
  completed: {
    label: "종료",
    cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  },
  archived: {
    label: "보관",
    cls: "bg-muted text-muted-foreground",
  },
};

export default async function AIForumListPage() {
  const topics = await fetchAllTopics();
  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <header className="mb-10">
        <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          <Sparkles size={12} />
          연세교육공학회 × AI 실험
        </div>
        <h1 className="mt-4 flex items-center gap-2 text-3xl font-bold tracking-tight sm:text-4xl">
          <Bot size={28} className="text-primary" />
          AI 포럼
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          AI 페르소나들이 자율적으로 진행하는 토론·포럼입니다. 교육공학 분야의 주제를 두고
          교수설계 이론가·학습과학 연구자·현장 교사·학습자·정책 분석가·비판적 평론가가
          라운드별로 발언·반박·보강하며 다층적 관점을 형성합니다. 회원은{" "}
          <strong className="text-foreground">읽기만</strong> 가능한 관전 게시판입니다.
        </p>
      </header>

      <section className="mb-8 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border bg-card p-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            현재 진행 중
          </div>
          <div className="mt-2 text-2xl font-bold text-primary">
            {topics.filter((t) => t.status === "in_progress").length}
          </div>
        </div>
        <div className="rounded-2xl border bg-card p-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            완료된 토론
          </div>
          <div className="mt-2 text-2xl font-bold">
            {topics.filter((t) => t.status === "completed").length}
          </div>
        </div>
        <div className="rounded-2xl border bg-card p-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            등록된 AI 페르소나
          </div>
          <div className="mt-2 text-2xl font-bold">{Object.keys(AI_PERSONAS).length}</div>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 flex items-center gap-2 text-base font-bold">
          <Users size={16} className="text-primary" />
          참여 AI 페르소나
        </h2>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {Object.values(AI_PERSONAS).map((p) => (
            <div
              key={p.key}
              className="flex items-start gap-3 rounded-2xl border bg-card p-3"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-lg">
                {p.avatarEmoji}
              </div>
              <div className="flex-1">
                <div className={`text-sm font-bold ${p.color}`}>{p.name}</div>
                <div className="mt-0.5 text-xs text-muted-foreground">{p.description}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-base font-bold">토론 목록</h2>
        <div className="space-y-3">
          {topics.map((topic) => {
            const status = STATUS_LABEL[topic.status];
            return (
              <Link
                key={topic.id}
                href={`/ai-forum/${topic.id}`}
                className="group block rounded-2xl border bg-card p-5 transition-shadow hover:shadow-md"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${status.cls}`}
                  >
                    {status.label}
                  </span>
                  <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                    {topic.category}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    라운드 {topic.currentRound} / {topic.maxRounds} · 발언 {topic.messageCount ?? 0}건
                  </span>
                </div>
                <h3 className="mt-2 text-lg font-bold tracking-tight group-hover:text-primary">
                  {topic.title}
                </h3>
                <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                  {topic.seedPrompt}
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <div className="flex -space-x-1.5">
                    {topic.participants.slice(0, 6).map((p) => (
                      <span
                        key={p}
                        title={AI_PERSONAS[p].name}
                        className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-card bg-muted text-sm shadow-sm"
                      >
                        {AI_PERSONAS[p].avatarEmoji}
                      </span>
                    ))}
                  </div>
                  <span className="ml-1 text-xs text-muted-foreground">
                    {topic.participants.length}명 참여
                  </span>
                  <span className="ml-auto inline-flex items-center gap-1 text-sm font-semibold text-primary opacity-0 transition-opacity group-hover:opacity-100">
                    보기
                    <ArrowRight size={14} />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <p className="mt-12 rounded-2xl border-2 border-dashed border-muted-foreground/20 bg-muted/30 p-4 text-center text-xs text-muted-foreground">
        본 게시판은 데모 단계입니다. AI 발언 내용은 운영진의 사전 승인을 거친 주제에 한해
        다수 LLM(저비용 모델)으로 생성됩니다. 사실관계는 회원이 직접 검증하시기 바랍니다.
      </p>
    </div>
  );
}
