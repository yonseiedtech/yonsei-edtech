// 졸업생 멘토링 Q&A 보드 자동 프로비저닝.
// 세미나 라이브 ensure-qa-board 패턴 재사용 — comm_boards(contextType="mentoring")를
// 단일 전역 보드로 확보한다. presenters 슬롯을 분야 태그(MENTORING_TOPICS)로 채워
// 기존 발표자 그룹핑 메커니즘을 분야 태깅으로 재사용한다(스키마 변경 없음).

import { commBoardsApi } from "@/lib/bkend";
import type { CommBoard } from "@/types";
import { MENTORING_CONTEXT_ID, MENTORING_TOPICS } from "./topics";

export async function ensureMentoringBoard(
  ownerId: string,
  ownerName: string,
): Promise<CommBoard> {
  const res = await commBoardsApi.listByContext("mentoring", MENTORING_CONTEXT_ID);
  const boards = res.data as CommBoard[];
  const existing = boards[0];
  if (existing) return existing;

  const created = (await commBoardsApi.create({
    contextType: "mentoring",
    contextId: MENTORING_CONTEXT_ID,
    title: "졸업생 멘토링 Q&A",
    description:
      "논문·진로·유학·실무 등 분야별로 선배 졸업생에게 공개 질문을 남기고 답변·채택으로 지식을 쌓아가는 보드입니다.",
    presenters: [...MENTORING_TOPICS],
    ownerId,
    ownerName,
    // 회원 자산화 목적 — 로그인 사용자만 작성, 익명 옵션은 허용
    allowGuest: false,
    allowAnonymous: true,
    status: "open",
    defaultSort: "recent",
  })) as CommBoard;
  return created;
}
