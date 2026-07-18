"use client";

/**
 * 선배 논문 참고 패널 (v5-H4, 2026-07-18)
 *
 * 연구 설계 에디터의 연구방법 선택 부근에 삽입되는 소형 접이식 참고 패널.
 * "이 방법을 쓴 졸업생 선배 논문 N편"을 제목·연도·상세 링크로 보여준다.
 * 데이터가 없으면 렌더하지 않는다(미노출). 순수 표시 컴포넌트 — 조회는 상위에서.
 */

import { useState } from "react";
import Link from "next/link";
import { GraduationCap, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AlumniThesis } from "@/types/alumni";

const MAX_VISIBLE = 6;

export function AlumniMethodReferences({
  theses,
  methodName,
}: {
  theses: AlumniThesis[];
  methodName: string;
}) {
  const [open, setOpen] = useState(false);
  if (theses.length === 0) return null;

  return (
    <div className="mt-2.5 overflow-hidden rounded-lg border border-primary/20 bg-primary/5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-1.5 px-3 py-2 text-left"
      >
        <GraduationCap size={13} className="shrink-0 text-primary" aria-hidden />
        <span className="min-w-0 flex-1 text-[12px] font-medium text-foreground">
          &lsquo;{methodName}&rsquo;을(를) 쓴 선배 논문 {theses.length}편 보기
        </span>
        <ChevronDown
          size={13}
          className={cn(
            "shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
          aria-hidden
        />
      </button>
      {open && (
        <ul className="space-y-1 border-t border-primary/15 px-3 py-2">
          {theses.slice(0, MAX_VISIBLE).map((t) => (
            <li key={t.id}>
              <Link
                href={`/alumni/thesis/${t.id}`}
                className="group block rounded-md px-1.5 py-1 transition-colors hover:bg-primary/10"
              >
                <span className="line-clamp-2 text-[12px] font-medium text-foreground group-hover:underline">
                  {t.title}
                </span>
                <span className="mt-0.5 block text-[10px] text-muted-foreground">
                  {[t.authorName, t.awardedYearMonth].filter(Boolean).join(" · ")}
                </span>
              </Link>
            </li>
          ))}
          {theses.length > MAX_VISIBLE && (
            <li className="px-1.5 pt-0.5 text-[10px] text-muted-foreground">
              외 {theses.length - MAX_VISIBLE}편 더 — 아카이브에서 확인하세요.
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
