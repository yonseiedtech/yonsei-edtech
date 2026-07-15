// 세미나 라이브 Q&A 보드 자동 프로비저닝.
// 라이브 콘솔은 comm-board(contextType="seminar")를 재사용한다. 세미나당 하나의
// 게스트 허용 보드를 확보하여 session.qaBoardId 로 연결한다.

import { commBoardsApi } from "@/lib/bkend";
import type { CommBoard } from "@/types";

export async function ensureSeminarQaBoard(
  seminarId: string,
  ownerId: string,
  ownerName: string,
  title = "세미나 실시간 Q&A",
): Promise<string> {
  const res = await commBoardsApi.listByContext("seminar", seminarId);
  const boards = res.data as CommBoard[];
  const existing = boards.find((b) => b.allowGuest) ?? boards[0];
  if (existing) return existing.id;

  const board = await commBoardsApi.create({
    contextType: "seminar",
    contextId: seminarId,
    title,
    ownerId,
    ownerName,
    allowGuest: true,
    allowAnonymous: true,
    status: "open",
    defaultSort: "popular",
  });
  return board.id;
}
