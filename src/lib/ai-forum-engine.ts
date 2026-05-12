/**
 * AI Forum Engine (Sprint 67-AR Phase 2)
 *
 * 토론 라운드 1 step 진행 핵심 로직 — Vercel cron 과 운영진 수동 advance 양쪽에서 호출.
 * 단일 책임: 진행 중인 토론 1건을 1 step 만큼 진행.
 *
 * 한 번 호출 시 동작:
 * - 라운드 내 미발언 페르소나가 있으면 1명 발언 생성 + append
 * - 라운드 내 모든 발언 완료면 currentRound++
 * - maxRounds 도달 시 종료 + 요약 자동 생성
 */

import { generateText } from "ai";
import type { Firestore } from "firebase-admin/firestore";
import { models } from "@/lib/ai";
import { AI_PERSONAS, type AIPersonaKey } from "@/types/ai-forum";

export const MAX_FORUM_COST_USD = 0.5;
export const MAX_OUTPUT_TOKENS = 450;
export const PRIOR_MESSAGES_CONTEXT = 6;

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
  createdAt?: string;
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

export interface TickResult {
  ok: boolean;
  message?: string;
  forumId?: string;
  round?: number;
  persona?: AIPersonaKey;
  tokensIn?: number;
  tokensOut?: number;
  cost?: number;
  error?: string;
  status?: number;
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

function buildUserPrompt(priorMessages: MessageDoc[], currentRound: number): string {
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

/**
 * 한 토론을 1 step 만큼 진행.
 * forumId 지정 시 해당 토론만, 미지정 시 in_progress 중 가장 오래된 것 자동 선택.
 */
export async function processOneTick(
  db: Firestore,
  forumId?: string,
): Promise<TickResult> {
  // 1. 대상 토론 결정
  let forumSnap: FirebaseFirestore.QueryDocumentSnapshot<FirebaseFirestore.DocumentData> | FirebaseFirestore.DocumentSnapshot<FirebaseFirestore.DocumentData>;

  if (forumId) {
    const snap = await db.collection("ai_forums").doc(forumId).get();
    if (!snap.exists) return { ok: false, error: "토론을 찾을 수 없음", status: 404 };
    const data = snap.data() as { status?: string; approved?: boolean };
    if (data.status !== "in_progress" || !data.approved) {
      return {
        ok: false,
        error: "진행 중·승인된 토론만 advance 가능",
        status: 400,
      };
    }
    forumSnap = snap;
  } else {
    const inProgress = await db
      .collection("ai_forums")
      .where("status", "==", "in_progress")
      .where("approved", "==", true)
      .get();
    if (inProgress.empty) {
      return { ok: true, message: "진행 중인 토론 없음" };
    }
    const sorted = inProgress.docs.sort((a, b) => {
      const ac = (a.data() as { createdAt?: string }).createdAt ?? "";
      const bc = (b.data() as { createdAt?: string }).createdAt ?? "";
      return ac.localeCompare(bc);
    });
    forumSnap = sorted[0];
  }

  const fid = forumSnap.id;
  const forum = { id: fid, ...forumSnap.data() } as ForumDoc;

  // 2. 비용 상한
  if ((forum.costUsd ?? 0) >= MAX_FORUM_COST_USD) {
    await forumSnap.ref.update({
      status: "completed",
      completedAt: new Date().toISOString(),
      autoStopReason: "max_cost_exceeded",
    });
    return { ok: true, message: "비용 상한 초과로 자동 종료", forumId: fid };
  }

  // 3. 라운드
  const currentRound = Math.max(1, forum.currentRound || 1);
  if (currentRound > forum.maxRounds) {
    await forumSnap.ref.update({
      status: "completed",
      completedAt: new Date().toISOString(),
    });
    return { ok: true, message: "이미 maxRounds 도달", forumId: fid };
  }

  // 4~5. 메시지 fetch + 정렬
  const allMsgsSnap = await db
    .collection("ai_forum_messages")
    .where("forumId", "==", fid)
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
  const priorMessages = allMessages.slice(-PRIOR_MESSAGES_CONTEXT);

  // 6a. 라운드 완료
  if (!nextPersona) {
    const nextRound = currentRound + 1;
    if (nextRound > forum.maxRounds) {
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

        // Sprint 67-AR: 자동 자유게시판 게시 — 회원 발견성 강화
        // 자연 완료(maxRounds 도달) 시에만 발행. max_cost_exceeded 같은 비정상 종료는 제외.
        try {
          const postRef = db.collection("posts").doc();
          // ** 등 강조 마크다운 제거 + AI 명시 푸터 자동 부착
          const cleanedSummary = summaryResult.text.replace(/\*\*/g, "");
          const postBody = [
            cleanedSummary,
            "",
            `AI 페르소나 ${forum.participants.length}명이 ${forum.maxRounds}라운드에 걸쳐 자율 토론한 결과입니다.`,
            "",
            `[전체 토론 보기 →](/ai-forum/${fid})`,
            "",
            "---",
            "",
            "본 게시물은 AI 에이전트에 의해 작성된 게시물입니다. 운영진의 검토를 거쳐 게시되며, 잘못된 정보를 발견하시면 [문의 게시판](/contact)으로 알려주세요.",
          ].join("\n");
          const nowIso = new Date().toISOString();
          await postRef.set({
            title: `[AI 포럼 결과] ${forum.title}`,
            content: postBody,
            category: "free",
            authorId: "system:ai-forum",
            authorName: "연세교육공학회 AI 포럼",
            viewCount: 0,
            createdAt: nowIso,
            updatedAt: nowIso,
          });
        } catch (publishErr) {
          // 게시 실패는 토론 종료를 막지 않음 — 로그만 남김
          console.error(
            "[ai-forum-engine] 자유게시판 자동 게시 실패:",
            publishErr instanceof Error ? publishErr.message : publishErr,
          );
        }
      } catch {
        await forumSnap.ref.update({
          status: "completed",
          completedAt: new Date().toISOString(),
        });
      }
      return { ok: true, message: "토론 완료 + 요약 생성 + 자유게시판 게시", forumId: fid };
    }
    await forumSnap.ref.update({ currentRound: nextRound });
    return {
      ok: true,
      message: `라운드 ${currentRound} 완료, 라운드 ${nextRound}로 진행`,
      forumId: fid,
    };
  }

  // 6b. 발언 생성
  const result = await generateText({
    model: models.fast,
    system: buildSystemPrompt(nextPersona, forum),
    prompt: buildUserPrompt(priorMessages, currentRound),
    // @ts-expect-error - maxTokens may differ across @ai-sdk versions
    maxTokens: MAX_OUTPUT_TOKENS,
  });

  type Usage = {
    promptTokens?: number;
    completionTokens?: number;
    inputTokens?: number;
    outputTokens?: number;
  };
  const usage = ((result as unknown as { usage?: Usage }).usage ?? {}) as Usage;
  const tokensIn = usage.promptTokens ?? usage.inputTokens ?? 0;
  const tokensOut = usage.completionTokens ?? usage.outputTokens ?? 0;
  const cost = tokensIn * COST_PER_TOKEN_IN_USD + tokensOut * COST_PER_TOKEN_OUT_USD;

  // 메시지 append
  const messageRef = db.collection("ai_forum_messages").doc();
  await messageRef.set({
    forumId: fid,
    round: currentRound,
    persona: nextPersona,
    model: "gemini-2.5-flash",
    content: result.text,
    tokensIn,
    tokensOut,
    costUsd: cost,
    createdAt: new Date().toISOString(),
  });

  await forumSnap.ref.update({
    messageCount: (forum.messageCount ?? 0) + 1,
    costUsd: (forum.costUsd ?? 0) + cost,
  });

  return {
    ok: true,
    forumId: fid,
    round: currentRound,
    persona: nextPersona,
    tokensIn,
    tokensOut,
    cost,
  };
}
