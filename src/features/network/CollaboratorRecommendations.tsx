"use client";

/**
 * 공동 연구자 추천 섹션 (collaborator-recommendation)
 *
 * /network 페이지 상단에 "함께 연구할 만한 회원" 카드를 노출.
 * 각 추천 회원에 대해 "왜 추천됐는지" 근거(공통 관심 키워드·연구 주제·전공/기수 등)를
 * 칩과 문장으로 명시한다 (사용자 요청 핵심).
 *
 * 프라이버시:
 * - 추천 후보는 buildNetwork 와 동일하게 승인 회원만.
 * - 프로필 비공개(role 무관) 회원도 회원 명부엔 노출되므로, 여기서는
 *   관심분야 섹션 비공개 회원의 "키워드 기반 근거"만 collaborator-match 가 제외.
 * - 본인이 매칭 신호(관심 키워드/주제/연구분야 등)를 전혀 입력하지 않은 경우
 *   추천이 비어 있을 수 있으므로 프로필 보완 안내를 노출.
 */

import { useMemo } from "react";
import Link from "next/link";
import { Sparkles, Users2, ArrowRight, Info } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  recommendCollaborators,
  type CollaboratorMatch,
  type MatchReason,
} from "@/lib/collaborator-match";
import { ROLE_LABELS, type User } from "@/types";
import { cn } from "@/lib/utils";

interface Props {
  me: User;
  users: User[];
  /** 표시할 최대 추천 수 (기본 6) */
  limit?: number;
  className?: string;
}

/** 근거 1건 → 사람이 읽는 한 줄 문장 */
function reasonSentence(r: MatchReason): string {
  if (r.items.length === 0) return r.label;
  const joined = r.items.slice(0, 4).join(" · ");
  const more = r.items.length > 4 ? ` 외 ${r.items.length - 4}개` : "";
  switch (r.kind) {
    case "interest_keyword":
      return `공통 관심 키워드: ${joined}${more}`;
    case "research_topic":
      return `비슷한 연구 주제: ${joined}${more}`;
    case "research_field":
      return `같은 연구분야: ${joined}`;
    case "school_level":
      return `같은 학교급: ${joined}`;
    case "occupation":
      return `같은 신분 유형: ${joined}`;
    case "cohort":
      return `입학 동기: ${joined}`;
    default:
      return `${r.label}: ${joined}`;
  }
}

function RecommendationCard({ match }: { match: CollaboratorMatch }) {
  const { user, reasons } = match;
  return (
    <li className="flex flex-col rounded-2xl border bg-card p-4 shadow-sm transition-colors hover:border-primary/40">
      <div className="flex items-center gap-3">
        <Avatar className="h-11 w-11 shrink-0">
          {user.profileImage && (
            <AvatarImage src={user.profileImage} alt={user.name} />
          )}
          <AvatarFallback>{user.name?.[0] ?? "?"}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{user.name}</p>
          <div className="mt-0.5 flex flex-wrap items-center gap-1">
            {typeof user.generation === "number" && user.generation > 0 && (
              <Badge variant="secondary" className="text-[10px]">
                {user.generation}기
              </Badge>
            )}
            <Badge variant="outline" className="text-[10px]">
              {ROLE_LABELS[user.role]}
            </Badge>
          </div>
        </div>
      </div>

      {/* 추천 근거 — 왜 추천됐는지 (사용자 요청 핵심) */}
      <div className="mt-3 space-y-1.5">
        <p className="flex items-center gap-1 text-[11px] font-semibold text-primary">
          <Sparkles size={11} aria-hidden /> 이 회원을 추천하는 이유
        </p>
        <ul className="space-y-1">
          {reasons.slice(0, 3).map((r) => (
            <li
              key={r.kind}
              className="flex items-start gap-1.5 text-xs leading-relaxed text-muted-foreground"
            >
              <span
                aria-hidden
                className="mt-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60"
              />
              <span className="break-keep">{reasonSentence(r)}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-3 flex justify-end">
        <Link href={`/profile/${user.id}`}>
          <Button size="sm" variant="outline" className="h-8 text-xs">
            프로필 보기
            <ArrowRight size={12} className="ml-1" />
          </Button>
        </Link>
      </div>
    </li>
  );
}

export default function CollaboratorRecommendations({
  me,
  users,
  limit = 6,
  className,
}: Props) {
  const matches = useMemo(
    () => recommendCollaborators(me, users, limit),
    [me, users, limit],
  );

  // 본인이 매칭 가능한 신호를 전혀 안 가진 경우 안내
  const hasOwnSignal =
    (me.interestKeywords?.length ?? 0) > 0 ||
    (me.researchInterests?.length ?? 0) > 0 ||
    (me.researchTopics?.length ?? 0) > 0 ||
    !!me.field;

  return (
    <section
      aria-label="함께 연구할 만한 회원 추천"
      className={cn(
        "rounded-2xl border border-primary/20 bg-primary/[0.03] p-5 dark:bg-primary/[0.06]",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <div
          aria-hidden
          className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"
        >
          <Users2 size={17} />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-bold text-foreground">
            함께 연구할 만한 회원
          </h2>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
            관심 키워드·연구 주제·연구분야·기수 등을 비교해, 협업 가능성이 높은
            회원을 추천합니다. 각 추천에는 근거가 함께 표시됩니다.
          </p>
        </div>
      </div>

      {matches.length > 0 ? (
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {matches.map((m) => (
            <RecommendationCard key={m.user.id} match={m} />
          ))}
        </ul>
      ) : (
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-dashed bg-card/60 p-4 text-sm text-muted-foreground">
          <Info size={15} className="mt-0.5 shrink-0 text-muted-foreground" aria-hidden />
          {hasOwnSignal ? (
            <p className="leading-relaxed">
              아직 관심사가 겹치는 회원을 찾지 못했어요. 다른 회원들이 관심
              키워드·연구 주제를 채우면 추천이 늘어납니다.
            </p>
          ) : (
            <p className="leading-relaxed">
              관심 키워드와 연구 주제를 입력하면 맞춤 추천을 받을 수 있어요.{" "}
              <Link
                href="/mypage"
                className="font-medium text-primary underline-offset-2 hover:underline"
              >
                마이페이지에서 관심사 추가하기
              </Link>
            </p>
          )}
        </div>
      )}
    </section>
  );
}
