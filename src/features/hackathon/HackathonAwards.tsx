"use client";

/**
 * 해커톤 수상작 섹션 (v7-M1 · v8-H6 개선)
 *
 * 단계별 상태 기계로 렌더:
 *  - registration / submission (행사 전) → 수상 발표 예정 안내 플레이스홀더
 *  - judging (심사 중) → 심사 진행 안내
 *  - awards (발표 후) + published 수상작 있음 → 공개 갤러리
 *  - awards + published 없음 → 숨김 (미발표 상태)
 *
 * Firestore list 규칙이 로그인 회원만 허용하므로 갤러리는 로그인 필요.
 * 플레이스홀더·심사 안내는 비로그인 포함 모든 방문자에게 표시.
 */

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Trophy, Award as AwardIcon, Clock } from "lucide-react";
import { useAuthStore } from "@/features/auth/auth-store";
import { hackathonSubmissionsApi } from "@/lib/bkend";
import {
  HACKATHON_AWARD_LABELS,
  HACKATHON_AWARD_ORDER,
  type HackathonSubmission,
} from "@/types";
import {
  HACKATHON_CONTEXT_ID,
  HACKATHON_PORTFOLIO_HINT,
  HACKATHON_AWARDS_ANNOUNCE_DATE,
  getHackathonPhase,
} from "./config";
import { SubmissionLinks } from "./HackathonSubmissions";

export default function HackathonAwards() {
  const user = useAuthStore((s) => s.user);
  const phase = getHackathonPhase();
  const isPostEvent = phase === "judging" || phase === "awards";

  const { data: submissions = [] } = useQuery({
    queryKey: ["hackathon-submissions"],
    // 행사 전에는 불필요한 쿼리 방지 — 행사 후만 활성화
    enabled: !!user && isPostEvent,
    queryFn: async () => {
      const res = await hackathonSubmissionsApi.listByContext(HACKATHON_CONTEXT_ID);
      return res.data as HackathonSubmission[];
    },
  });

  const winners = useMemo(() => {
    const published = submissions.filter((s) => s.published && s.award);
    return published.sort(
      (a, b) =>
        HACKATHON_AWARD_ORDER.indexOf(a.award!) -
        HACKATHON_AWARD_ORDER.indexOf(b.award!),
    );
  }, [submissions]);

  // ── 행사 전: 수상 발표 예정 플레이스홀더 ──
  if (!isPostEvent) {
    const announceLabel = HACKATHON_AWARDS_ANNOUNCE_DATE
      ? HACKATHON_AWARDS_ANNOUNCE_DATE.replace(/-/g, ". ")
      : null;
    return (
      <section className="mt-8 rounded-2xl border border-dashed border-primary/20 bg-primary/5 p-5 text-center">
        <Trophy size={20} className="mx-auto text-primary/50" aria-hidden="true" />
        <p className="mt-2 text-sm font-semibold text-foreground">수상작 발표 예정</p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          행사 후 심사위원단 평가를 거쳐 수상작이 이 곳에 공개됩니다.
          {announceLabel && (
            <span className="ml-1 font-medium text-foreground/70">
              ({announceLabel} 예정)
            </span>
          )}
        </p>
      </section>
    );
  }

  // ── 심사 중: 수상작 미발표 안내 ──
  if (phase === "judging" && winners.length === 0) {
    return (
      <section className="mt-8 rounded-2xl border border-dashed border-muted-foreground/20 bg-muted/30 p-5 text-center">
        <Clock size={20} className="mx-auto text-muted-foreground/50" aria-hidden="true" />
        <p className="mt-2 text-sm font-semibold text-foreground">심사 진행 중</p>
        <p className="mt-1 text-xs text-muted-foreground">
          심사위원단이 산출물을 검토하고 있습니다. 조금만 기다려 주세요.
        </p>
      </section>
    );
  }

  // ── 수상작 없음(awards 단계, 아직 미공개) ── 숨김
  if (!user || winners.length === 0) return null;

  // ── 공개 갤러리 ──
  return (
    <section className="mt-12">
      <h2 className="flex items-center gap-2 text-lg font-bold">
        <Trophy size={18} className="text-primary" />
        수상작
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        심사위원단의 평가를 거쳐 선정된 팀입니다. 축하합니다!
      </p>
      <ul className="mt-4 space-y-3">
        {winners.map((s) => (
          <li
            key={s.id}
            className="rounded-2xl border border-primary/30 bg-primary/5 p-5"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-xs font-bold text-primary-foreground">
                <AwardIcon size={12} />
                {HACKATHON_AWARD_LABELS[s.award!]}
              </span>
              <p className="text-base font-bold text-foreground">{s.title}</p>
            </div>
            <p className="mt-1 text-sm font-medium text-muted-foreground">
              {s.teamName}
              {s.members.length > 0 && (
                <span className="ml-1 text-muted-foreground/80">
                  · {s.members.join(", ")}
                </span>
              )}
            </p>
            <p className="mt-2.5 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
              {s.description}
            </p>
            <SubmissionLinks submission={s} />
          </li>
        ))}
      </ul>
      <p className="mt-4 rounded-xl border border-dashed border-primary/30 bg-primary/5 p-3 text-xs text-muted-foreground">
        {HACKATHON_PORTFOLIO_HINT}
      </p>
    </section>
  );
}
