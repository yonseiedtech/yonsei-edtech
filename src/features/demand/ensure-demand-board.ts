// 스터디·세미나 수요 조사 보드 자동 프로비저닝 (2026-07-23).
// ensure-hackathon-board 패턴 재사용 — comm_boards(contextType="demand")를
// 단일 전역 보드로 확보한다. 신규 컬렉션 없음.
//
// 데이터 매핑(comm_questions 재사용):
//  - body        = 희망 주제 한 줄 (≤140자)
//  - presenter   = 유형 ("스터디 희망" | "세미나 희망") — 해커톤 팀 희망 슬롯 관례 재사용
//  - demandPref  = { format, note } 선호 형태·메모 (옵셔널)
//  - likeCount   = "저도 원해요" 공감 (commLikesApi.toggle)
//  - authorId    = 등록 회원 (1인 다건 허용)
//
// 등록은 로그인 회원만(allowGuest=false). 게스트는 가입 유도.

import { commBoardsApi } from "@/lib/bkend";
import type { CommBoard } from "@/types";

export const DEMAND_CONTEXT_ID = "demand-2026-2";

export async function ensureDemandBoard(
  ownerId: string,
  ownerName: string,
): Promise<CommBoard> {
  const res = await commBoardsApi.listByContext("demand", DEMAND_CONTEXT_ID);
  const boards = res.data as CommBoard[];
  const existing = boards[0];
  if (existing) return existing;

  const created = (await commBoardsApi.create({
    contextType: "demand",
    contextId: DEMAND_CONTEXT_ID,
    title: "스터디·세미나 개설 희망 보드 (2026-2학기)",
    description:
      "듣고 싶은 스터디나 세미나 주제를 등록하고, '저도 원해요'로 수요를 표현해보세요. 공감이 많은 주제부터 개설을 검토합니다.",
    ownerId,
    ownerName,
    allowGuest: false,
    allowAnonymous: false,
    status: "open",
    defaultSort: "popular",
  })) as CommBoard;
  return created;
}
