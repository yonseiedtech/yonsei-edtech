import { notFound } from "next/navigation";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, BookOpen, Bot, CheckCircle2, ExternalLink, MessageSquare, Quote } from "lucide-react";
import {
  getDemoMessagesByForumId,
  getDemoTopicById,
} from "@/features/ai-forum/demo-data";
import {
  AI_PERSONAS,
  type AIForumMessage,
  type AIForumTopic,
  type APACitation,
} from "@/types/ai-forum";
import { citationLinkUrl, formatAPA7Reference } from "@/features/ai-forum/apa";
import { aiForumMessagesApi, aiForumsApi } from "@/lib/bkend";

async function fetchTopic(id: string): Promise<AIForumTopic | undefined> {
  try {
    const live = (await aiForumsApi.get(id)) as unknown as AIForumTopic;
    if (live && live.approved && live.status !== "archived") return live;
  } catch {
    // ignore - fallback to demo
  }
  return getDemoTopicById(id);
}

async function fetchMessages(id: string): Promise<AIForumMessage[]> {
  try {
    const live = await aiForumMessagesApi.listByForum(id);
    if (live.data && live.data.length > 0) {
      return [...live.data].sort((a, b) => {
        if (a.round !== b.round) return a.round - b.round;
        const at = typeof a.createdAt === "string" ? a.createdAt : "";
        const bt = typeof b.createdAt === "string" ? b.createdAt : "";
        return at.localeCompare(bt);
      });
    }
  } catch {
    // ignore - fallback to demo
  }
  return getDemoMessagesByForumId(id);
}

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const topic = await fetchTopic(id);
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
  const topic = await fetchTopic(id);
  const messages = await fetchMessages(id);
  if (!topic) notFound();

  // 라운드별 그룹화
  const rounds = new Map<number, typeof messages>();
  for (const m of messages) {
    if (!rounds.has(m.round)) rounds.set(m.round, []);
    rounds.get(m.round)!.push(m);
  }
  const sortedRounds = Array.from(rounds.entries()).sort((a, b) => a[0] - b[0]);

  // 전체 참고문헌 통합 (중복 제거 — id 기준)
  const allCitations = new Map<string, APACitation>();
  for (const m of messages) {
    for (const c of m.citations ?? []) {
      if (!allCitations.has(c.id)) allCitations.set(c.id, c);
    }
  }
  const sortedCitations = Array.from(allCitations.values()).sort((a, b) => {
    const aFirst = a.authors[0] ?? "";
    const bFirst = b.authors[0] ?? "";
    return aFirst.localeCompare(bFirst, undefined, { sensitivity: "base" });
  });

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

                    {m.citations && m.citations.length > 0 && (
                      <details className="mt-3 rounded-xl border bg-muted/30 p-3">
                        <summary className="cursor-pointer text-xs font-semibold text-muted-foreground">
                          참고문헌 {m.citations.length}건 (APA 7) — Human-in-the-loop 검증
                        </summary>
                        <ul className="mt-2 space-y-2">
                          {m.citations.map((c) => {
                            const link = citationLinkUrl(c);
                            return (
                              <li key={c.id} className="text-[12px] leading-relaxed text-foreground/80">
                                {c.verified ? (
                                  <CheckCircle2
                                    size={11}
                                    className="mr-1 inline shrink-0 text-emerald-600"
                                    aria-label="운영진 검증 완료"
                                  />
                                ) : (
                                  <AlertTriangle
                                    size={11}
                                    className="mr-1 inline shrink-0 text-amber-600"
                                    aria-label="AI 자동 생성 — 1차 자료 검증 필요"
                                  />
                                )}
                                <span>{formatAPA7Reference(c)}</span>
                                {link && (
                                  <a
                                    href={link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="ml-1 inline-flex items-center gap-0.5 text-primary underline-offset-2 hover:underline"
                                  >
                                    <ExternalLink size={10} />
                                    <span className="sr-only">외부 링크</span>
                                  </a>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      </details>
                    )}
                  </article>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      {sortedCitations.length > 0 && (
        <section className="mt-10 rounded-2xl border bg-card p-5 shadow-sm">
          <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-foreground">
            <BookOpen size={14} className="text-primary" />
            전체 참고문헌 (APA 7) · {sortedCitations.length}건
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            AI 페르소나들이 본 토론에서 인용한 학술 자료입니다.{" "}
            <CheckCircle2 size={10} className="inline text-emerald-600" /> 운영진 검증 완료,{" "}
            <AlertTriangle size={10} className="inline text-amber-600" /> AI 자동 생성 (1차 자료 직접 확인 필요).
          </p>
          <ol className="mt-4 space-y-3 text-sm leading-relaxed text-foreground/85">
            {sortedCitations.map((c, i) => {
              const link = citationLinkUrl(c);
              return (
                <li key={c.id} className="flex gap-2">
                  <span className="shrink-0 text-muted-foreground">[{i + 1}]</span>
                  <span className="flex-1">
                    {c.verified ? (
                      <CheckCircle2
                        size={12}
                        className="mr-1 inline shrink-0 text-emerald-600"
                        aria-label="운영진 검증 완료"
                      />
                    ) : (
                      <AlertTriangle
                        size={12}
                        className="mr-1 inline shrink-0 text-amber-600"
                        aria-label="AI 자동 생성 — 1차 자료 검증 필요"
                      />
                    )}
                    {formatAPA7Reference(c)}
                    {link && (
                      <a
                        href={link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-1 inline-flex items-center gap-0.5 text-primary underline-offset-2 hover:underline"
                      >
                        <ExternalLink size={11} />
                        링크
                      </a>
                    )}
                  </span>
                </li>
              );
            })}
          </ol>
        </section>
      )}

      {topic.summary && (
        <section className="mt-10 rounded-2xl border-2 border-primary/20 bg-primary/5 p-5">
          <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-primary">
            <Bot size={14} />
            최종 잠정 합의 (AI 생성)
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-foreground/90">{topic.summary}</p>
        </section>
      )}

      <section className="mt-10 rounded-2xl border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-sky-500/5 p-6 text-center">
        <MessageSquare size={24} className="mx-auto mb-2 text-primary" />
        <h3 className="text-base font-bold">이 토론에 대한 본인 의견은 어떠신가요?</h3>
        <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
          AI 발언에 동의·반박·보완 의견이 있다면 자유게시판에서 회원 토론을 이어가주세요.
          학회 활성도와 학문적 깊이를 함께 만들어갑니다.
        </p>
        <Link
          href={`/board/write?category=free&title=${encodeURIComponent(`[AI 포럼 후속] ${topic.title}`)}`}
          className="mt-4 inline-flex items-center gap-1 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
        >
          자유게시판에 의견 작성
          <ExternalLink size={12} />
        </Link>
      </section>

      <p className="mt-10 rounded-2xl border border-dashed border-muted-foreground/20 bg-muted/30 p-4 text-center text-xs text-muted-foreground">
        AI 발언 내용은 운영진의 사전 승인을 거친 주제에 한해 다수 LLM으로 생성된 자동 결과입니다.
        본인 연구·발표에 인용하실 경우 반드시 1차 자료를 별도로 검증해주세요.
      </p>
    </div>
  );
}
