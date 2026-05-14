"use client";

/**
 * 대학원 생활 활동 이력 — 학술활동 위에 표시되는 섹션 (Sprint 33).
 *
 * 표시 항목: 전공대표 / 조교 / 학회장 / 학회 부회장 / 학회 운영진
 * 기준: 학기 단위 (yyyy년 전기·후기)
 *
 * 데이터: grad_life_positions 컬렉션
 * 입력: 운영진이 /console/grad-life/positions 에서 추가
 * 가시성: sectionVisibility.gradLife (canViewSection이 호출 측에서 처리)
 */

import { useMemo } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { gradLifePositionsApi } from "@/lib/bkend";
import {
  GRAD_LIFE_ROLE_LABELS,
  GRAD_LIFE_ROLE_COLORS,
  GRAD_LIFE_SEMESTER_LABELS,
  type GradLifePosition,
  type GradLifeRole,
  type User,
} from "@/types";
import { Badge } from "@/components/ui/badge";
import { GraduationCap, Crown, Briefcase, UserCog, Star, ShieldCheck, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  owner: User;
  /** 운영진 이상 여부 — true면 빈 상태/헤더에 빠른 진입 링크 노출 */
  isStaff?: boolean;
}

const ROLE_ICONS: Record<GradLifeRole, typeof GraduationCap> = {
  major_rep: Star,
  ta: Briefcase,
  society_president: Crown,
  society_vice_president: Crown,
  society_staff: UserCog,
  student_advisor: ShieldCheck,
};

const ROLE_ORDER: GradLifeRole[] = [
  "society_president",
  "society_vice_president",
  "major_rep",
  "student_advisor",
  "ta",
  "society_staff",
];

function formatRange(p: GradLifePosition): string {
  const start = `${p.startYear}년 ${GRAD_LIFE_SEMESTER_LABELS[p.startSemester]}`;
  if (!p.endYear || !p.endSemester) return `${start} ~ 진행중`;
  if (p.startYear === p.endYear && p.startSemester === p.endSemester) return start;
  const end = `${p.endYear}년 ${GRAD_LIFE_SEMESTER_LABELS[p.endSemester]}`;
  return `${start} ~ ${end}`;
}

function isOngoing(p: GradLifePosition): boolean {
  return !p.endYear || !p.endSemester;
}

export default function ProfileGradLife({ owner, isStaff = false }: Props) {
  const { data: res, isLoading } = useQuery({
    queryKey: ["grad-life-positions", owner.id],
    queryFn: () => gradLifePositionsApi.listByUser(owner.id),
    staleTime: 60_000,
  });

  const positions = useMemo(() => {
    const list = (res?.data ?? []) as GradLifePosition[];
    return [...list].sort((a, b) => {
      // 진행중 먼저
      const aOn = isOngoing(a);
      const bOn = isOngoing(b);
      if (aOn !== bOn) return aOn ? -1 : 1;
      // 시작 학기 내림차순
      if (a.startYear !== b.startYear) return b.startYear - a.startYear;
      return (b.startSemester === "second" ? 1 : 0) - (a.startSemester === "second" ? 1 : 0);
    });
  }, [res]);

  const grouped = useMemo(() => {
    const map = new Map<GradLifeRole, GradLifePosition[]>();
    for (const p of positions) {
      if (!map.has(p.role)) map.set(p.role, []);
      map.get(p.role)!.push(p);
    }
    return ROLE_ORDER.filter((r) => map.has(r)).map((r) => ({ role: r, items: map.get(r)! }));
  }, [positions]);

  if (isLoading) {
    return (
      <section className="rounded-2xl border bg-card p-5 shadow-sm">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <GraduationCap size={16} className="text-violet-600" />
          대학원 생활
        </div>
        <p className="mt-3 text-xs text-muted-foreground">불러오는 중…</p>
      </section>
    );
  }

  if (positions.length === 0) {
    return (
      <section className="rounded-2xl border bg-card p-5 shadow-sm">
        <header className="mb-3 flex items-center gap-2">
          <GraduationCap size={16} className="text-violet-600" />
          <h2 className="text-sm font-semibold text-foreground">대학원 생활</h2>
          {isStaff && (
            <Link
              href="/console/grad-life/positions"
              className="ml-auto inline-flex items-center gap-1 rounded-md border border-violet-200 bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-violet-700 hover:bg-violet-100"
            >
              <Plus size={10} /> 활동 추가
            </Link>
          )}
        </header>
        <p className="rounded-lg border border-dashed bg-muted/20 px-3 py-4 text-center text-xs text-muted-foreground">
          등록된 활동 이력이 없습니다.
          <br />
          <span className="text-[11px] text-muted-foreground/70">
            전공대표·조교·학회·재학생 자문위원 등 학기 단위 활동 이력이 추가되면 이 영역에 표시됩니다.
          </span>
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border bg-card p-5 shadow-sm">
      <header className="mb-4 flex items-center gap-2">
        <GraduationCap size={16} className="text-violet-600" />
        <h2 className="text-sm font-semibold text-foreground">대학원 생활</h2>
        <span className="text-[11px] text-muted-foreground">
          ({positions.length}건)
        </span>
        {isStaff && (
          <Link
            href="/console/grad-life/positions"
            className="ml-auto inline-flex items-center gap-1 rounded-md border border-violet-200 bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-violet-700 hover:bg-violet-100"
          >
            <Plus size={10} /> 추가
          </Link>
        )}
      </header>

      <div className="space-y-4">
        {grouped.map(({ role, items }) => {
          const Icon = ROLE_ICONS[role];
          return (
            <div key={role}>
              <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                <Icon size={12} />
                {GRAD_LIFE_ROLE_LABELS[role]}
                <span className="text-[10px] font-normal text-muted-foreground/70">
                  ({items.length})
                </span>
              </div>
              <ul className="space-y-2">
                {items.map((p) => (
                  <li
                    key={p.id}
                    className={cn(
                      "rounded-2xl border bg-muted/20 px-3 py-2.5 text-sm",
                      isOngoing(p) && "border-l-4 border-l-violet-400 bg-violet-50/30",
                    )}
                  >
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge
                        variant="outline"
                        className={cn("text-[10px]", GRAD_LIFE_ROLE_COLORS[role])}
                      >
                        {GRAD_LIFE_ROLE_LABELS[role]}
                      </Badge>
                      {isOngoing(p) && (
                        <Badge variant="secondary" className="bg-violet-100 text-violet-800 text-[10px]">
                          진행중
                        </Badge>
                      )}
                      {p.detail && (
                        <span className="text-sm font-medium text-foreground">{p.detail}</span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{formatRange(p)}</p>
                    {p.notes && (
                      <p className="mt-1 whitespace-pre-wrap text-[11.5px] text-muted-foreground">
                        {p.notes}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}
