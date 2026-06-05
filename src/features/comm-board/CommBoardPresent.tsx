"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";
import { CheckCircle2, ThumbsUp } from "lucide-react";
import { commBoardsApi, commQuestionsApi } from "@/lib/bkend";
import type { CommQuestion } from "@/types";
import { sortQuestions } from "./comm-helpers";

interface Props {
  boardId: string;
}

export default function CommBoardPresent({ boardId }: Props) {
  const [hideResolved, setHideResolved] = useState(false);

  const { data: board } = useQuery({
    queryKey: ["comm-board", boardId],
    queryFn: () => commBoardsApi.get(boardId),
    retry: false,
  });

  const { data: questions = [] } = useQuery({
    queryKey: ["comm-questions", boardId],
    queryFn: async () => (await commQuestionsApi.listByBoard(boardId)).data as CommQuestion[],
    refetchInterval: 5000, // 발표 중 실시간 갱신
  });

  const boardUrl = useMemo(
    () => (typeof window !== "undefined" ? `${window.location.origin}/boards/${boardId}` : ""),
    [boardId],
  );

  const visible = sortQuestions(
    hideResolved ? questions.filter((q) => !q.resolved) : questions,
    "popular",
  );

  return (
    <div className="min-h-screen bg-slate-950 p-6 text-slate-50">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">{board?.title ?? "소통 보드"}</h1>
          {board?.description && <p className="mt-1 text-slate-300">{board.description}</p>}
          <button
            onClick={() => setHideResolved((v) => !v)}
            className="mt-3 rounded border border-slate-600 px-3 py-1 text-sm text-slate-300 hover:bg-slate-800"
          >
            {hideResolved ? "해결된 질문 표시" : "해결된 질문 숨기기"}
          </button>
        </div>
        {boardUrl && (
          <div className="flex flex-col items-center rounded-lg bg-white p-3">
            <QRCodeSVG value={boardUrl} size={120} />
            <span className="mt-1 text-[10px] font-medium text-slate-700">QR로 질문 참여</span>
          </div>
        )}
      </div>

      {visible.length === 0 ? (
        <p className="mt-20 text-center text-xl text-slate-400">아직 질문이 없습니다.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((q) => (
            <div
              key={q.id}
              className={`rounded-xl border p-5 ${q.resolved ? "border-emerald-600 bg-emerald-950/40" : "border-slate-700 bg-slate-900"}`}
            >
              <p className="whitespace-pre-wrap text-lg leading-relaxed">{q.body}</p>
              <div className="mt-3 flex items-center gap-4 text-sm text-slate-400">
                <span className="flex items-center gap-1">
                  <ThumbsUp size={15} /> {q.likeCount}
                </span>
                <span>답변 {q.answerCount}</span>
                {q.resolved && (
                  <span className="flex items-center gap-1 text-emerald-400">
                    <CheckCircle2 size={15} /> 해결됨
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
