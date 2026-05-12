import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Bot, Quote } from "lucide-react";
import {
  getDemoMessagesByForumId,
  getDemoTopicById,
} from "@/features/ai-forum/demo-data";
import { AI_PERSONAS } from "@/types/ai-forum";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const topic = getDemoTopicById(id);
  if (!topic) return { title: "AI 포럼 — 연세교육공학회" };
  return {
    title: `${topic.title} — AI 포럼`,
    description: topic.seedPrompt,
    openGraph: {
      title: topic.title,
      description: topic.seedPrompt,
      type: "article",
    },
  };
}

export default async function AIForumDetailPage({ params }: Props) {
  const { id } = await params;
  const topic = getDemoTopicById(id);
  const messages = getDemoMessagesByForumId(id);
  if (!topic) notFound();

  // 라운드별 그룹화
  const rounds = new Map<number, typeof messages>();
  for (const m of messages) {
    if (!rounds.has(m.round)) rounds.set(m.round, []);
    rounds.get(m.round)!.push(m);
  }
  const sortedRounds = Array.from(rounds.entries()).sort((a, b) => a[0] - b[0]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Link
        href="/ai-forum"
        className="mb-6 inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft size={14} />
        AI 포럼 목록
      </Link>

      <header className="mb-8">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
            <Bot size={11} />
            AI 포럼
          </span>
          <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold">
            {topic.category}
          </span>
          <span className="text-xs text-muted-foreground">
            라운드 {topic.currentRound} / {topic.maxRounds}
          </span>
        </div>
        <h1 className="mt-3 text-3xl font-bold tracking-tight">{topic.title}</h1>
        <div className="mt-4 rounded-2xl border bg-muted/30 p-4">
          <div className="flex items-start gap-2">
            <Quote size={14} className="mt-0.5 shrink-0 text-muted-foreground" />
            <p className="text-sm leading-relaxed text-muted-foreground">{topic.seedPrompt}</p>
          </div>
        </div>
      </header>

      <div className="space-y-8">
        {sortedRounds.map(([round, msgs]) => (
          <section key={round}>
            <div className="mb-3 flex items-center gap-2">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                {round}
              </span>
              <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                라운드 {round}
              </h2>
            </div>
            <div className="space-y-3">
              {msgs.map((m) => {
                const persona = AI_PERSONAS[m.persona];
                return (
                  <article
                    key={m.id}
                    className="rounded-2xl border bg-card p-5 shadow-sm transition-shadow hover:shadow-md"
                  >
                    <div className="flex items-start gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-lg">
                        {persona.avatarEmoji}
                      </span>
                      <div className="flex-1">
                        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                          <span className={`text-sm font-bold ${persona.color}`}>
                            {persona.name}
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            {persona.description}
                          </span>
                        </div>
                        <div className="mt-0.5 text-[11px] text-muted-foreground">
                          모델: {m.model}
                          {m.references && m.references.length > 0 && (
                            <> · 인용 {m.references.length}건</>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                      {m.content}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      {topic.summary && (
        <section className="mt-10 rounded-2xl border-2 border-primary/20 bg-primary/5 p-5">
          <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-primary">
            <Bot size={14} />
            최종 잠정 합의 (AI 생성)
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-foreground/90">{topic.summary}</p>
        </section>
      )}

      <p className="mt-12 rounded-2xl border border-dashed border-muted-foreground/20 bg-muted/30 p-4 text-center text-xs text-muted-foreground">
        AI 발언 내용은 운영진의 사전 승인을 거친 주제에 한해 다수 LLM으로 생성된 자동 결과입니다.
        본인 연구·발표에 인용하실 경우 반드시 1차 자료를 별도로 검증해주세요.
      </p>
    </div>
  );
}
