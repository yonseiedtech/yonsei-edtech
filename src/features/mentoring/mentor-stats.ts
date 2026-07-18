// 멘토링 Q&A 응답성/이력 집계 (v6-H4).
// 신규 컬렉션 없이 기존 comm_boards/comm_questions/comm_answers 만으로
// 멘토의 가벼운 이력(답변 수·채택 수)과 내 분야 미해결 질문 수를 계산한다.
// AlumniHomeWidgets 멘토 카드와 /mentoring 화면이 동일 queryKey(["mentor-stats", userId])로 공유.

import { commBoardsApi, commQuestionsApi, commAnswersApi } from "@/lib/bkend";
import type { CommBoard, CommQuestion, CommAnswer } from "@/types";
import { MENTORING_CONTEXT_ID, matchesMentorTopics } from "./topics";

export interface MentorStats {
  /** 멘토 오픈 분야에서 아직 답변을 기다리는(미해결) 질문 수 */
  openInMyTopics: number;
  /** 이 멘토가 멘토링 보드에 남긴 답변 수 */
  answered: number;
  /** 그중 질문 작성자가 채택한 답변 수 */
  accepted: number;
}

const EMPTY: MentorStats = { openInMyTopics: 0, answered: 0, accepted: 0 };

/**
 * 멘토(userId)의 멘토링 보드 이력 + 내 분야 미해결 질문 수 집계.
 * 보드 미프로비저닝(아직 아무도 방문 전)이면 0으로 우아하게 폴백.
 */
export async function loadMentorStats(
  userId: string,
  mentorTopics: readonly string[],
): Promise<MentorStats> {
  const boardsRes = await commBoardsApi.listByContext("mentoring", MENTORING_CONTEXT_ID);
  const board = (boardsRes.data as CommBoard[])[0];
  if (!board) return EMPTY;

  const [qRes, aRes] = await Promise.all([
    commQuestionsApi.listByBoard(board.id),
    commAnswersApi.listByBoard(board.id),
  ]);
  const questions = qRes.data as CommQuestion[];
  const answers = aRes.data as CommAnswer[];

  const openInMyTopics = questions.filter(
    (q) => !q.resolved && matchesMentorTopics(q.presenter, mentorTopics),
  ).length;

  const myAnswerIds = new Set(
    answers.filter((a) => a.authorId === userId).map((a) => a.id),
  );
  const accepted = questions.filter(
    (q) => q.resolvedAnswerId !== undefined && myAnswerIds.has(q.resolvedAnswerId),
  ).length;

  return { openInMyTopics, answered: myAnswerIds.size, accepted };
}
