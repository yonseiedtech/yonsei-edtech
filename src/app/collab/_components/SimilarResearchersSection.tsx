"use client";

/**
 * "나와 비슷한 주제 연구자" 상시 진입점 섹션 (/collab 랜딩)
 *
 * 공동연구를 아직 시작하지 않은 회원도 관심사 기반으로 잠재 협업자를
 * 상시 발견할 수 있도록, 로그인 회원의 관심 주제(interestKeywords·
 * researchInterests·researchTopics)를 기반으로 상위 협업 후보를 노출한다.
 *
 * 추천 계산은 기존 매칭 알고리즘(recommendCollaborators, src/lib/collaborator-match)
 * 을 그대로 재사용한다. 회원 수가 소규모이므로 이미 로드된 승인 회원 목록으로
 * 순수 클라이언트 계산한다(신규 컬렉션·네트워크 호출 없음).
 *
 * 각 후보 카드에는 관심 주제 교집합을 칩으로 표시하고,
 * "프로필 보기"·"쪽지로 제안하기"(기존 쪽지 프리필 딥링크) 액션을 제공한다.
 * 관심 주제 미입력 시 프로필 입력 유도 카드로 대체한다.
 */

import { useMemo } from "react";
import Link from "next/link";
import { Sparkles, Users2, ArrowRight, MessageSquarePlus, Info } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useMembers } from "@/features/member/useMembers";
import {
  recommendCollaborators,
  type CollaboratorMatch,
} from "@/lib/collaborator-match";
import { ROLE_LABELS, type User } from "@/types";

interface Props {
  me: User;
  /** 표시할 최대 추천 수 (기본 4) */
  limit?: number;
}

/** 추천 근거 중 관심 주제 교집합(키워드·연구 주제) 항목만 모은다 */
function overlapItems(match: CollaboratorMatch): string[] {
  const items = match.reasons
    .filter((r) => r.kind === "interest_keyword" || r.kind === "research_topic")
    .flatMap((r) => r.items);
  // 중복 제거 (표기 유지)
  const seen = new Set<string>();
  const out: string[] = [];
  for (const it of items) {
    const key = it.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(it.trim());
  }
  return out;
}

/** 공동연구 제안 쪽지 프리필 문구 생성 */
function proposalMessage(me: User, other: User, overlap: string[]): string {
  const topics = overlap.slice(0, 4).join(", ");
  const topicPart = topics
    ? `${topics} 등 관심 주제가 비슷해 `
    : "관심 주제가 비슷해 ";
  return `안녕하세요 ${other.name}님, ${me.name}입니다. ${topicPart}공동연구를 함께 하면 좋을 것 같아 제안드립니다. 편하실 때 이야기 나눠요.`;
}

function CandidateCard({ me, match }: { me: User; match: CollaboratorMatch }) {
  const { user } = match;
  const overlap = overlapItems(match);
  const composeHref = `/mypage/messages?compose=${user.id}&prefill=${encodeURIComponent(
    proposalMessage(me, user, overlap),
  )}`;

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

      {/* 관심 주제 교집합 */}
      {overlap.length > 0 && (
        <div className="mt-3">
          <p className="flex items-center gap-1 text-[11px] font-semibold text-primary">
            <Sparkles size={11} aria-hidden /> 관심 주제 교집합
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1">
            {overlap.slice(0, 5).map((item) => (
              <Badge
                key={item}
                variant="secondary"
                className="text-[10px] font-normal"
              >
                {item}
              </Badge>
            ))}
            {overlap.length > 5 && (
              <span className="text-[10px] text-muted-foreground">
                외 {overlap.length - 5}개
              </span>
            )}
          </div>
        </div>
      )}

      <div className="mt-3 flex items-center justify-end gap-2">
        <Link href={`/profile/${user.id}`}>
          <Button size="sm" variant="outline" className="h-8 text-xs">
            프로필 보기
            <ArrowRight size={12} className="ml-1" />
          </Button>
        </Link>
        <Link href={composeHref}>
          <Button size="sm" className="h-8 text-xs">
            <MessageSquarePlus size={12} className="mr-1" />
            쪽지로 제안하기
          </Button>
        </Link>
      </div>
    </li>
  );
}

export default function SimilarResearchersSection({ me, limit = 4 }: Props) {
  const { members, isLoading } = useMembers();

  const matches = useMemo(
    () => recommendCollaborators(me, members, limit),
    [me, members, limit],
  );

  // 본인이 매칭 가능한 관심 신호를 전혀 안 가진 경우 → 프로필 입력 유도
  const hasOwnSignal =
    (me.interestKeywords?.length ?? 0) > 0 ||
    (me.researchInterests?.length ?? 0) > 0 ||
    (me.researchTopics?.length ?? 0) > 0 ||
    !!me.field;

  return (
    <section
      aria-label="나와 비슷한 주제 연구자 추천"
      className="rounded-2xl border border-primary/20 bg-primary/[0.03] p-5 dark:bg-primary/[0.06]"
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
            나와 비슷한 주제 연구자
          </h2>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
            관심 키워드·연구 주제를 비교해 함께 연구하면 좋을 회원을 추천합니다.
            프로필을 보고 바로 공동연구를 제안해보세요.
          </p>
        </div>
      </div>

      {!hasOwnSignal ? (
        // 관심 주제 미입력 → 프로필 입력 유도 카드
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-dashed bg-card/60 p-4 text-sm text-muted-foreground">
          <Info size={15} className="mt-0.5 shrink-0" aria-hidden />
          <p className="leading-relaxed">
            관심 키워드와 연구 주제를 입력하면 나와 잘 맞는 연구자를 추천받을 수
            있어요.{" "}
            <Link
              href="/mypage"
              className="font-medium text-primary underline-offset-2 hover:underline"
            >
              마이페이지에서 관심사 추가하기
            </Link>
          </p>
        </div>
      ) : isLoading ? (
        <p className="mt-4 py-6 text-center text-sm text-muted-foreground">
          추천 회원을 불러오는 중...
        </p>
      ) : matches.length > 0 ? (
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {matches.map((m) => (
            <CandidateCard key={m.user.id} me={me} match={m} />
          ))}
        </ul>
      ) : (
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-dashed bg-card/60 p-4 text-sm text-muted-foreground">
          <Info size={15} className="mt-0.5 shrink-0" aria-hidden />
          <p className="leading-relaxed">
            아직 관심사가 겹치는 회원을 찾지 못했어요. 다른 회원들이 관심
            키워드·연구 주제를 채우면 추천이 늘어납니다.
          </p>
        </div>
      )}

      {/* F6: 관계망 Map 크로스링크 — 추천 엔진 ↔ 관계망 시각화 상호 연결 */}
      <div className="mt-4 flex justify-end">
        <Link href="/network" className="text-xs text-primary hover:underline">
          관계망 Map에서 연결망 보기 →
        </Link>
      </div>
    </section>
  );
}
