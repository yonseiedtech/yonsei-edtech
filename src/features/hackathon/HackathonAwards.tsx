"use client";

/**
 * 해커톤 수상작 섹션 (v7-M1)
 *
 * 운영진이 심사 후 award 등급을 지정하고 published=true 로 공개 처리한 산출물만
 * 상위 등급 순으로 노출한다. 공개된 수상작이 없으면(행사 전·심사 중) 아무것도
 * 렌더하지 않아 섹션이 자연히 숨겨진다.
 *
 * 열람은 hackathon_submissions list 규칙(로그인 회원)을 따르므로 비로그인 시
 * 렌더하지 않는다. (게스트 공개는 published 프로젝션 컬렉션으로 향후 확장 가능)
 */

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Trophy, Award as AwardIcon } from "lucide-react";
import { useAuthStore } from "@/features/auth/auth-store";
import { hackathonSubmissionsApi } from "@/lib/bkend";
import {
  HACKATHON_AWARD_LABELS,
  HACKATHON_AWARD_ORDER,
  type HackathonSubmission,
} from "@/types";
import { HACKATHON_CONTEXT_ID, HACKATHON_PORTFOLIO_HINT } from "./config";
import { SubmissionLinks } from "./HackathonSubmissions";

export default function HackathonAwards() {
  const user = useAuthStore((s) => s.user);

  const { data: submissions = [] } = useQuery({
    queryKey: ["hackathon-submissions"],
    enabled: !!user,
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

  if (!user || winners.length === 0) return null;

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
