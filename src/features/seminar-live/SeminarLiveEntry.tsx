"use client";

/**
 * 세미나 상세 페이지의 라이브 진입점.
 * - 라이브 진행 중이면 모든 방문자에게 "지금 라이브 참여" 강조 배너.
 * - 운영진(isStaff)에겐 상태와 무관하게 "라이브 콘솔" 링크 노출.
 */

import Link from "next/link";
import { Radio, Presentation, Monitor } from "lucide-react";
import { useLiveSession } from "./useLiveSession";

interface Props {
  seminarId: string;
  isStaff: boolean;
}

export default function SeminarLiveEntry({ seminarId, isStaff }: Props) {
  const { session } = useLiveSession(seminarId);
  const live = session?.status === "live" || session?.status === "paused";

  if (!live && !isStaff) return null;

  return (
    <div className="mt-4 rounded-2xl border bg-card p-4 sm:mt-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {live ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-600 px-2.5 py-1 text-[11px] font-bold text-white">
              <Radio size={12} /> LIVE
            </span>
          ) : (
            <Presentation size={16} className="text-indigo-600" />
          )}
          <div>
            <p className="text-sm font-semibold">
              {live ? "실시간 세션이 진행 중입니다" : "라이브 콘솔"}
            </p>
            <p className="text-xs text-muted-foreground">
              {live
                ? "슬라이드·Q&A·설문에 실시간으로 참여하세요."
                : "장표·강의노트·Q&A·설문을 실시간으로 운영하세요."}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {live && (
            <Link
              href={`/seminars/${seminarId}/live`}
              className="inline-flex items-center gap-1 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700"
            >
              <Radio size={13} /> 지금 참여하기
            </Link>
          )}
          {isStaff && (
            <>
              <Link
                href={`/seminars/${seminarId}/live/host`}
                className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-accent"
              >
                <Presentation size={13} /> 콘솔
              </Link>
              <Link
                href={`/seminars/${seminarId}/present`}
                target="_blank"
                className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-accent"
              >
                <Monitor size={13} /> 스크린
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
