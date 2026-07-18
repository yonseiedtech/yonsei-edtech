// 에듀테크 해커톤 참가 신청·아이디어 보드 자동 프로비저닝 (v6-H6).
// 멘토링 보드(ensure-mentoring-board) 패턴 재사용 — comm_boards(contextType="hackathon")를
// 단일 전역 보드로 확보한다. 신규 컬렉션 없음.
//
// 데이터 매핑(comm_questions 재사용):
//  - body       = 참가자가 풀고 싶은 "교육 현장의 문제" 한 줄 (= 참가 신청 = 아이디어)
//  - presenter  = 팀 참여 희망 여부 (HACKATHON_TEAM_PREFS)
//  - likeCount  = "공감"(commLikesApi.toggle)
//  - authorId   = 신청 회원 (1인 1신청 판정 기준)
//
// 등록(신청)은 로그인 회원만(allowGuest=false). 게스트는 가입 유도.

import { commBoardsApi } from "@/lib/bkend";
import type { CommBoard } from "@/types";
import { HACKATHON_CONTEXT_ID, HACKATHON_EVENT, HACKATHON_TEAM_PREF_LIST } from "./config";

export async function ensureHackathonBoard(
  ownerId: string,
  ownerName: string,
): Promise<CommBoard> {
  const res = await commBoardsApi.listByContext("hackathon", HACKATHON_CONTEXT_ID);
  const boards = res.data as CommBoard[];
  const existing = boards[0];
  if (existing) return existing;

  const created = (await commBoardsApi.create({
    contextType: "hackathon",
    contextId: HACKATHON_CONTEXT_ID,
    title: `${HACKATHON_EVENT.title} — 참가 신청·아이디어 보드`,
    description:
      "풀고 싶은 교육 현장의 문제를 한 줄로 남기면 참가 신청이 됩니다. 서로의 문제에 공감하며 팀을 찾아보세요.",
    presenters: [...HACKATHON_TEAM_PREF_LIST],
    ownerId,
    ownerName,
    // 신청은 로그인 회원 전용 — 게스트는 가입 유도
    allowGuest: false,
    allowAnonymous: false,
    status: "open",
    defaultSort: "recent",
  })) as CommBoard;
  return created;
}
