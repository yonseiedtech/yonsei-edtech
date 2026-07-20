"use client";

/**
 * 해커톤 수상작 섹션 (v7-M1 · v8-H6 개선 · v13-H2 수상→기록 반자동)
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

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Trophy, Award as AwardIcon, Clock, Bookmark, CheckCircle2, ExternalLink, Loader2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useAuthStore } from "@/features/auth/auth-store";
import { hackathonSubmissionsApi, externalActivitiesApi } from "@/lib/bkend";
import {
  HACKATHON_AWARD_LABELS,
  HACKATHON_AWARD_ORDER,
  DEFAULT_EXTERNAL_AFFILIATION,
  type HackathonSubmission,
} from "@/types";
import { isAtLeast } from "@/lib/permissions";
import {
  HACKATHON_CONTEXT_ID,
  HACKATHON_PORTFOLIO_HINT,
  HACKATHON_AWARDS_ANNOUNCE_DATE,
} from "./config";
import { useHackathonOps } from "./useHackathonOps";
import { SubmissionLinks } from "./HackathonSubmissions";

export default function HackathonAwards() {
  const user = useAuthStore((s) => s.user);
  const { phase } = useHackathonOps();
  const isPostEvent = phase === "judging" || phase === "awards";

  // v13-H2: 수상→포트폴리오 반자동 — 세션 내 추가 완료 목록
  const [addedAwards, setAddedAwards] = useState<Set<string>>(new Set());
  const [addingAward, setAddingAward] = useState<string | null>(null);

  // cross-session 멱등: 기존 external_activities 의 hackathon:award:* autoSourceRef 를 시드
  const { data: existingAwardRefs } = useQuery({
    queryKey: ["external-activities-award-refs", user?.id],
    enabled: !!user && isPostEvent,
    queryFn: async () => {
      const res = await externalActivitiesApi.listByUser(user!.id);
      return new Set(
        res.data
          .map((a) => a.autoSourceRef)
          .filter((ref): ref is string => !!ref?.startsWith("hackathon:award:"))
          .map((ref) => ref.slice("hackathon:award:".length)),
      );
    },
  });

  /** 수상작을 external_activities 에 1클릭 적재 (idempotent via autoSourceRef) */
  async function addAwardToPortfolio(s: HackathonSubmission) {
    if (!user) return;
    if (addedAwards.has(s.id) || existingAwardRefs?.has(s.id)) {
      toast.info("이미 포트폴리오에 추가된 수상 이력입니다.");
      return;
    }
    const isOwner = s.ownerId === user.id;
    const autoSourceRef = `hackathon:award:${s.id}`;
    setAddingAward(s.id);
    try {
      await externalActivitiesApi.create({
        userId: user.id,
        title: `[수상] ${s.title}`,
        type: "conference",
        affiliation: DEFAULT_EXTERNAL_AFFILIATION,
        organization: "연세교육공학회",
        role: isOwner ? "팀 대표 (수상)" : "팀원 (수상)",
        date: s.createdAt?.slice(0, 10) || new Date().toISOString().slice(0, 10),
        url: s.presentationUrl || s.demoUrl || s.repoUrl || undefined,
        description: `에듀테크 해커톤 ${HACKATHON_AWARD_LABELS[s.award!]} 수상 — ${s.teamName}`,
        verified: false,
        autoSourceRef,
      });
      setAddedAwards((prev) => new Set(prev).add(s.id));
      toast.success("포트폴리오에 수상 이력을 추가했습니다. 운영진 검증 후 정식 표기됩니다.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "추가 실패 — 잠시 후 다시 시도해주세요.");
    } finally {
      setAddingAward(null);
    }
  }

  /** 운영진 아카이브 등록 딥링크 — writing-tips/new 폼에 제목·URL 프리필 */
  function archiveDeeplink(s: HackathonSubmission): string {
    const title = encodeURIComponent(`[해커톤 수상] ${s.title} (${s.teamName})`);
    const url = encodeURIComponent(s.presentationUrl || s.demoUrl || s.repoUrl || "");
    return `/console/archive/writing-tips/new?title=${title}${url ? `&url=${url}` : ""}`;
  }

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
            {/* v13-H2: 수상→기록 반자동 버튼 */}
            {user && (
              <div className="mt-3 flex flex-wrap gap-2">
                {(s.ownerId === user.id || (s.memberIds ?? []).includes(user.id)) && (
                  addedAwards.has(s.id) || existingAwardRefs?.has(s.id) ? (
                    <span className="inline-flex items-center gap-1 rounded-lg border border-primary/20 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary">
                      <CheckCircle2 size={12} />
                      포트폴리오에 추가됨
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => addAwardToPortfolio(s)}
                      disabled={addingAward === s.id}
                      className="inline-flex items-center gap-1 rounded-lg border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/10 disabled:opacity-50"
                    >
                      {addingAward === s.id ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <Bookmark size={12} />
                      )}
                      포트폴리오에 수상 이력 추가
                    </button>
                  )
                )}
                {isAtLeast(user, "staff") && (
                  <Link
                    href={archiveDeeplink(s)}
                    className="inline-flex items-center gap-1 rounded-lg border border-border bg-muted/30 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted/60"
                  >
                    <ExternalLink size={12} />
                    아카이브 산출물로 등록
                  </Link>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>
      <p className="mt-4 rounded-xl border border-dashed border-primary/30 bg-primary/5 p-3 text-xs text-muted-foreground">
        {HACKATHON_PORTFOLIO_HINT}
      </p>
    </section>
  );
}
