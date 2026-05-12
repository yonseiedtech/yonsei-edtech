import { NextRequest } from "next/server";
import { generateText } from "ai";
import { getAdminDb } from "@/lib/firebase-admin";
import { verifyCronAuth } from "@/lib/cron-auth";
import { models } from "@/lib/ai";
import { AI_PERSONAS, type AIPersonaKey } from "@/types/ai-forum";

export const maxDuration = 60;

/**
 * AI Forum Tick Cron (Sprint 67-AR Phase 2)
 *
 * 매 cron 주기마다 진행 중(status="in_progress") 인 가장 오래된 토론 1건을 골라
 * 다음 페르소나의 발언을 생성하여 ai_forum_messages 에 append.
 * 한 라운드 내 모든 페르소나 발언이 끝나면 currentRound++. maxRounds 도달 시 종료 + 요약.
 *
 * 비용 통제: forum.costUsd 가 MAX_FORUM_COST_USD 초과 시 자동 stop.
 * 환경변수 필수: CRON_SECRET, GOOGLE_GENERATIVE_AI_API_KEY.
 */

const MAX_FORUM_COST_USD = 0.5; // 토론당 비용 상한
const MAX_OUTPUT_TOKENS = 450;
const PRIOR_MESSAGES_CONTEXT = 6; // 직전 N개 메시지를 컨텍스트로 제공

// Gemini 2.5 Flash 비용 (대략) — 입력 $0.075/1M, 출력 $0.30/1M
const COST_PER_TOKEN_IN_USD = 0.000000075;
const COST_PER_TOKEN_OUT_USD = 0.0000003;

interface ForumDoc {
  id: string;
  title: string;
  seedPrompt: string;
  participants: AIPersonaKey[];
  currentRound: number;
  maxRounds: number;
  status: string;
  approved: boolean;
  messageCount?: number;
  costUsd?: number;
  summary?: string;
}

interface MessageDoc {
  id: string;
  forumId: string;
  round: number;
  persona: AIPersonaKey;
  model: string;
  content: string;
  tokensIn?: number;
  tokensOut?: number;
  createdAt: string;
}

function buildSystemPrompt(persona: AIPersonaKey, topic: ForumDoc): string {
  const p = AI_PERSONAS[persona];
  return [
    `당신은 "${p.name}" 입니다.`,
    `역할: ${p.description}`,
    "",
    "[토론 주제]",
    topic.title,
    "",
    "[배경 및 논점]",
    topic.seedPrompt,
    "",
    "[규칙]",
    "- 200~400자로 발언해주세요.",
    "- 본인 페르소나의 관점을 일관되게 유지하세요.",
    "- 이전 발언자를 참고할 때는 \"[화자]가 지적한 바와 같이\" 형식을 사용하세요.",
    "- 학술적이고 절제된 어조를 유지하되 단정적이지 않게 표현하세요.",
    "- 한국어로 답변해주세요.",
    "- 가능하면 실제 학술 자료(저자, 연도)를 자연스럽게 인용하세요.",
  ].join("\n");
}

function buildUserPrompt(
  priorMessages: MessageDoc[],
  currentRound: number,
): string {
  const lines: string[] = [];
  if (priorMessages.length > 0) {
    lines.push("[이전 발언 (요약)]");
    for (const m of priorMessages) {
      const p = AI_PERSONAS[m.persona];
      lines.push(`라운드 ${m.round} · ${p.name}: ${m.content.slice(0, 280)}`);
      lines.push("");
    }
  }
  lines.push(`[당신의 차례 — 라운드 ${currentRound}]`);
  lines.push("위 흐름을 받아 당신의 페르소나로서 발언해주세요.");
  return lines.join("\n");
}

export async function GET(req: NextRequest) {
  if (!verifyCronAuth(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = getAdminDb();

    // 1. in_progress + approved 토론 전체 fetch 후 클라이언트에서 createdAt asc 정렬
    //    (composite index 회피 — 프로젝트 컨벤션)
    const inProgress = await db
      .collection("ai_forums")
      .where("status", "==", "in_progress")
      .where("approved", "==", true)
      .get();

    if (inProgress.empty) {
      return Response.json({ ok: true, message: "진행 중인 토론 없음", processed: 0 });
    }

    const sortedForums = inProgress.docs.sort((a, b) => {
      const ac = (a.data() as { createdAt?: string }).createdAt ?? "";
      const bc = (b.data() as { createdAt?: string }).createdAt ?? "";
      return ac.localeCompare(bc);
    });
    const forumSnap = sortedForums[0];
    const forumId = forumSnap.id;
    const forum = { id: forumId, ...forumSnap.data() } as ForumDoc;

    // 2. 비용 상한 체크
    if ((forum.costUsd ?? 0) >= MAX_FORUM_COST_USD) {
      await forumSnap.ref.update({
        status: "completed",
        completedAt: new Date().toISOString(),
        autoStopReason: "max_cost_exceeded",
      });
      return Response.json({
        ok: true,
        message: "비용 상한 초과로 자동 종료",
        forumId,
      });
    }

    // 3. 라운드 + 다음 발언자 결정
    const currentRound = Math.max(1, forum.currentRound || 1);
    if (currentRound > forum.maxRounds) {
      await forumSnap.ref.update({
        status: "completed",
        completedAt: new Date().toISOString(),
      });
      return Response.json({ ok: true, message: "이미 maxRounds 도달", forumId });
    }

    // 4~5. forum의 모든 메시지 fetch 후 클라이언트에서 라운드 필터 + 컨텍스트 추출
    //      (composite index 회피)
    const allMsgsSnap = await db
      .collection("ai_forum_messages")
      .where("forumId", "==", forumId)
      .get();
    const allMessages: MessageDoc[] = [];
    for (const d of allMsgsSnap.docs) {
      allMessages.push({ id: d.id, ...d.data() } as MessageDoc);
    }
    allMessages.sort((a, b) => {
      if (a.round !== b.round) return a.round - b.round;
      return (a.createdAt ?? "").localeCompare(b.createdAt ?? "");
    });

    const spokenInRound = new Set<AIPersonaKey>(
      allMessages.filter((m) => m.round === currentRound).map((m) => m.persona),
    );
    const nextPersona = forum.participants.find((p) => !spokenInRound.has(p));

    // 직전 N개 메시지를 컨텍스트로 (오래된→최신)
    const priorMessages = allMessages.slice(-PRIOR_MESSAGES_CONTEXT);

    // 6a. 라운드 내 모든 페르소나가 발언 완료 → 다음 라운드로 이동
    if (!nextPersona) {
      const nextRound = currentRound + 1;
      if (nextRound > forum.maxRounds) {
        // 7. 종료 + 자동 요약 생성
        const summaryPrompt =
          "다음은 AI 포럼의 전체 발언 흐름입니다. 합의된 사항과 미해결 과제를 각 3줄 이내로 정리해주세요. 한국어로.";
        const summaryContext = priorMessages
          .map((m) => `${AI_PERSONAS[m.persona].name}: ${m.content.slice(0, 200)}`)
          .join("\n");
        try {
          const summaryResult = await generateText({
            model: models.fast,
            system: summaryPrompt,
            prompt: summaryContext,
            // @ts-expect-error - maxTokens may differ across @ai-sdk versions
            maxTokens: 600,
          });
          await forumSnap.ref.update({
            status: "completed",
            completedAt: new Date().toISOString(),
            summary: summaryResult.text,
          });
        } catch {
          await forumSnap.ref.update({
            status: "completed",
            completedAt: new Date().toISOString(),
          });
        }
        return Response.json({ ok: true, message: "토론 완료 + 요약 생성", forumId });
      }
      await forumSnap.ref.update({ currentRound: nextRound });
      return Response.json({
        ok: true,
        message: `라운드 ${currentRound} 완료, 라운드 ${nextRound}로 진행`,
        forumId,
      });
    }

    // 6b. 다음 페르소나 발언 생성
    const systemPrompt = buildSystemPrompt(nextPersona, forum);
    const userPrompt = buildUserPrompt(priorMessages, currentRound);

    const result = await generateText({
      model: models.fast,
      system: systemPrompt,
      prompt: userPrompt,
      // @ts-expect-error - maxTokens may differ across @ai-sdk versions
      maxTokens: MAX_OUTPUT_TOKENS,
    });

    // usage 정보 추출 (가능한 경우)
    type Usage = { promptTokens?: number; completionTokens?: number; inputTokens?: number; outputTokens?: number };
    const usage = ((result as unknown as { usage?: Usage }).usage ?? {}) as Usage;
    const tokensIn = usage.promptTokens ?? usage.inputTokens ?? 0;
    const tokensOut = usage.completionTokens ?? usage.outputTokens ?? 0;
    const cost = tokensIn * COST_PER_TOKEN_IN_USD + tokensOut * COST_PER_TOKEN_OUT_USD;

    // 7. 메시지 append
    const messageRef = db.collection("ai_forum_messages").doc();
    await messageRef.set({
      forumId,
      round: currentRound,
      persona: nextPersona,
      model: "gemini-2.5-flash",
      content: result.text,
      tokensIn,
      tokensOut,
      costUsd: cost,
      createdAt: new Date().toISOString(),
    });

    // 8. forum 메타 업데이트
    await forumSnap.ref.update({
      messageCount: (forum.messageCount ?? 0) + 1,
      costUsd: (forum.costUsd ?? 0) + cost,
    });

    return Response.json({
      ok: true,
      forumId,
      round: currentRound,
      persona: nextPersona,
      tokensIn,
      tokensOut,
      cost,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown error";
    return Response.json({ error: msg }, { status: 500 });
  }
}
