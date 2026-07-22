import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase-admin";
import { checkRateLimit } from "@/lib/rate-limit";
import { HACKATHON_CONTEXT_ID, HACKATHON_TEAM_PREFS } from "@/features/hackathon/config";

const MAX_LEN = 140;

/**
 * POST /api/hackathon/guest-apply — 비회원 해커톤 참가 신청.
 *
 * 인증 불필요. Admin SDK 로 comm_questions 에 직접 기록.
 * 게스트 마커: authorId 없음, guestName + (선택) guestEmail 필드.
 * guestEmail 이 있으면 가입 시 linkGuestHackathonApps 가 authorId 를 자동 채워 연결한다.
 *
 * 스팸 방어: IP 기반 rate-limit (5회/5분) + body 140자 + guestName 필수.
 */
export async function POST(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rateLimited = checkRateLimit(`hackathon_guest_apply_${ip}`, {
    limit: 5,
    windowSec: 300,
  });
  if (rateLimited) return rateLimited;

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const guestName = String(body.guestName ?? "").trim();
  const guestEmail = String(body.guestEmail ?? "")
    .trim()
    .toLowerCase();
  const questionBody = String(body.body ?? "").trim();
  const boardId = String(body.boardId ?? "").trim();
  const presenter = String(
    body.presenter ?? HACKATHON_TEAM_PREFS.undecided,
  ).trim();

  // proposal 필드 정제 — proposal 모드 신청 시 포함
  let proposal: { title: string; topic: string; design: string } | undefined;
  if (body.proposal && typeof body.proposal === "object") {
    const p = body.proposal as Record<string, unknown>;
    const pTitle = String(p.title ?? "").trim().slice(0, 100);
    if (pTitle) {
      proposal = {
        title: pTitle,
        topic: String(p.topic ?? "").trim().slice(0, 300),
        design: String(p.design ?? "").trim().slice(0, 500),
      };
    }
  }

  if (!guestName) {
    return NextResponse.json({ error: "이름이 필요합니다." }, { status: 400 });
  }
  // proposal 모드: body는 제목에서 파생(≤100자), hackathon 모드: body 직접 검증(≤140자)
  if (proposal) {
    if (!questionBody) {
      return NextResponse.json(
        { error: "연구 제목이 필요합니다." },
        { status: 400 },
      );
    }
  } else if (!questionBody || questionBody.length > MAX_LEN) {
    return NextResponse.json(
      { error: "문제 입력(1~140자)이 필요합니다." },
      { status: 400 },
    );
  }
  if (!boardId) {
    return NextResponse.json(
      { error: "보드 ID가 필요합니다." },
      { status: 400 },
    );
  }

  const db = getAdminDb();

  // 보드 존재·open 여부 검증
  let contextId = "";
  try {
    const boardSnap = await db.collection("comm_boards").doc(boardId).get();
    if (!boardSnap.exists) {
      return NextResponse.json(
        { error: "보드를 찾을 수 없습니다." },
        { status: 404 },
      );
    }
    const boardData = boardSnap.data() as Record<string, unknown>;
    if (boardData.status !== "open") {
      return NextResponse.json(
        { error: "참가 신청이 마감되었습니다." },
        { status: 403 },
      );
    }
    contextId = String(boardData.contextId ?? "");
    if (contextId !== HACKATHON_CONTEXT_ID) {
      return NextResponse.json(
        { error: "잘못된 보드입니다." },
        { status: 400 },
      );
    }
  } catch (err) {
    console.error("[/api/hackathon/guest-apply] board check error:", err);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 },
    );
  }

  // 설문 정제 — 허용된 필드만 포함
  let hackathonSurvey: Record<string, unknown> | undefined;
  if (body.hackathonSurvey && typeof body.hackathonSurvey === "object") {
    const s = body.hackathonSurvey as Record<string, unknown>;
    const aiLiteracy = typeof s.aiLiteracy === "number" ? s.aiLiteracy : undefined;
    const vibeCoding =
      typeof s.vibeCoding === "string" &&
      ["none", "tried", "often"].includes(s.vibeCoding)
        ? s.vibeCoding
        : undefined;
    const tools = Array.isArray(s.tools)
      ? (s.tools as unknown[])
          .filter((t) => typeof t === "string")
          .slice(0, 10)
          .map(String)
      : undefined;
    const strengths = Array.isArray(s.strengths)
      ? (s.strengths as unknown[])
          .filter((t) => typeof t === "string")
          .slice(0, 10)
          .map(String)
      : undefined;
    const hasAny =
      aiLiteracy !== undefined ||
      vibeCoding !== undefined ||
      (tools && tools.length > 0) ||
      (strengths && strengths.length > 0);
    if (hasAny) {
      hackathonSurvey = {
        ...(aiLiteracy !== undefined ? { aiLiteracy } : {}),
        ...(vibeCoding !== undefined ? { vibeCoding } : {}),
        ...(tools && tools.length > 0 ? { tools } : {}),
        ...(strengths && strengths.length > 0 ? { strengths } : {}),
      };
    }
  }

  const docData: Record<string, unknown> = {
    boardId,
    contextId,
    authorName: guestName,
    guestName,
    ...(guestEmail ? { guestEmail } : {}),
    anonymous: false,
    resolved: false,
    likeCount: 0,
    answerCount: 0,
    body: questionBody,
    presenter,
    ...(proposal ? { proposal } : {}),
    ...(hackathonSurvey ? { hackathonSurvey } : {}),
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };

  try {
    const ref = await db.collection("comm_questions").add(docData);
    return NextResponse.json({ id: ref.id });
  } catch (err) {
    console.error("[/api/hackathon/guest-apply] write error:", err);
    return NextResponse.json(
      { error: "신청 저장에 실패했습니다." },
      { status: 500 },
    );
  }
}
