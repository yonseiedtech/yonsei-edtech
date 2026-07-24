// 스터디·세미나 수요 조사 보드 자동 프로비저닝 (2026-07-23, 학기 단위화 2026-07-24).
// ensure-hackathon-board 패턴 재사용 — comm_boards(contextType="demand")를
// 학기별 단일 보드로 확보한다. 신규 컬렉션 없음.
//
// 데이터 매핑(comm_questions 재사용):
//  - body        = 희망 주제 한 줄 (≤140자)
//  - presenter   = 유형 ("스터디 희망" | "세미나 희망") — 해커톤 팀 희망 슬롯 관례 재사용
//  - demandPref  = { format, note } 선호 형태·메모 (옵셔널)
//  - likeCount   = "관심있어요" 반응 (commLikesApi.toggle "question")
//  - demand-join = "참여할래요" 반응 (commLikesApi.togglePlain "demand-join", 대상 문서 카운트 미변경)
//  - authorId    = 등록 회원 (1인 다건 허용)
//
// 등록은 로그인 회원만(allowGuest=false). 게스트는 가입 유도.
//
// 학기 단위: contextId 를 현재 학기 키로 산정("demand-{YYYY}-{1|2}").
// 지난 학기 수요와 섞이지 않도록 학기가 바뀌면 새 보드가 자동 생성된다.

import { commBoardsApi } from "@/lib/bkend";
import { currentSemesterKey } from "@/lib/semester";
import type { CommBoard } from "@/types";

/** 현재 학기 키 — "YYYY-1"(전기) | "YYYY-2"(후기). */
export function currentDemandSemesterKey(): string {
  return currentSemesterKey();
}

/** 현재 학기 수요 보드 contextId — 예: "demand-2026-1". */
export function currentDemandContextId(): string {
  return `demand-${currentSemesterKey()}`;
}

/** 현재 학기 표시 라벨 — 예: "2026-1학기". */
export function currentDemandSemesterLabel(): string {
  return `${currentSemesterKey()}학기`;
}

/**
 * @deprecated 하위호환 — 현재 학기 contextId(모듈 로드 시점 기준).
 * 콘솔 집계 등 기존 상수 참조 유지용. 신규 코드는 currentDemandContextId() 사용.
 */
export const DEMAND_CONTEXT_ID = currentDemandContextId();

export async function ensureDemandBoard(
  ownerId: string,
  ownerName: string,
): Promise<CommBoard> {
  const contextId = currentDemandContextId();
  const label = currentDemandSemesterLabel();
  const res = await commBoardsApi.listByContext("demand", contextId);
  const boards = res.data as CommBoard[];
  const existing = boards[0];
  if (existing) return existing;

  const created = (await commBoardsApi.create({
    contextType: "demand",
    contextId,
    title: `스터디·세미나 개설 희망 보드 (${label})`,
    description:
      "듣고 싶은 스터디나 세미나 주제를 등록하고, '관심있어요'·'참여할래요'로 수요를 표현해보세요. 참여 의사가 많은 주제부터 개설을 검토합니다.",
    ownerId,
    ownerName,
    allowGuest: false,
    allowAnonymous: false,
    status: "open",
    defaultSort: "popular",
  })) as CommBoard;
  return created;
}
