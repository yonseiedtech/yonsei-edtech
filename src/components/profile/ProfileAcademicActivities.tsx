"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { activitiesApi, seminarsApi, attendeesApi } from "@/lib/bkend";
import { EXTERNAL_PARTICIPANT_TYPE_LABELS, EXTERNAL_PARTICIPANT_TYPE_COLORS } from "@/types";
import type { Activity, ExternalParticipantType, Seminar, SeminarAttendee, User } from "@/types";
import { Badge } from "@/components/ui/badge";
import { BookOpen, ChevronRight, Crown, FolderKanban, Globe, Mic, Tag } from "lucide-react";
import { formatDate, cn } from "@/lib/utils";
import { formatSemester } from "@/lib/semester";

interface Props {
  owner: User;
}

type SubTab = "seminar" | "study" | "project" | "external";

const SUB_TABS: { key: SubTab; label: string; icon: typeof BookOpen }[] = [
  { key: "seminar", label: "세미나", icon: Mic },
  { key: "study", label: "스터디", icon: BookOpen },
  { key: "project", label: "프로젝트", icon: FolderKanban },
  { key: "external", label: "대외 학술대회", icon: Globe },
];

const PAGE_SIZE = 30;

function isMember(a: Activity, owner: User): boolean {
  const inMembers = a.members?.includes(owner.id) || a.members?.includes(owner.name);
  const inParticipants = a.participants?.includes(owner.id) || a.participants?.includes(owner.name);
  const isLeader = a.leader === owner.id || a.leader === owner.name || a.leaderId === owner.id;
  const isApplicant = a.applicants?.some((ap) => ap.userId === owner.id && ap.status === "approved");
  return !!(inMembers || inParticipants || isLeader || isApplicant);
}

interface RoleInfo {
  label: string;
  kind: "leader" | "role" | "external";
  type?: ExternalParticipantType;
}

function roleOf(a: Activity, owner: User): RoleInfo | null {
  // 1) 모임장
  if (a.leaderId === owner.id || a.leader === owner.id || a.leader === owner.name) {
    return { label: a.type === "study" ? "스터디장" : a.type === "project" ? "팀장" : "리더", kind: "leader" };
  }
  // 2) 운영진이 부여한 활동 내 역할 (participantRoles)
  const role = a.participantRoles?.[owner.id] ?? a.participantRoles?.[owner.name];
  if (role && role.trim()) {
    return { label: role, kind: "role" };
  }
  // 3) 대외활동 신청 시 선택한 참석 유형
  if (a.type === "external") {
    const ap = a.applicants?.find(
      (x) => (x.userId === owner.id || x.email?.toLowerCase() === owner.email?.toLowerCase()) && x.status === "approved",
    );
    const t = ap?.participantType as ExternalParticipantType | undefined;
    if (t) return { label: EXTERNAL_PARTICIPANT_TYPE_LABELS[t], kind: "external", type: t };
  }
  return null;
}

export default function ProfileAcademicActivities({ owner }: Props) {
  const [tab, setTab] = useState<SubTab>("seminar");
  const [visible, setVisible] = useState<number>(PAGE_SIZE);

  const { data: allActivities = [], isLoading: loadingActs } = useQuery({
    queryKey: ["profile-activities-all"],
    queryFn: async () => {
      const res = await activitiesApi.list();
      return res.data as unknown as Activity[];
    },
  });

  const { data: allSeminars = [], isLoading: loadingSeminars } = useQuery({
    queryKey: ["profile-seminars-all"],
    queryFn: async () => {
      const res = await seminarsApi.list();
      return res.data as unknown as Seminar[];
    },
  });

  const { data: userAttendeeRecords = [] } = useQuery({
    queryKey: ["profile-user-attendees", owner.id],
    queryFn: async () => {
      const res = await attendeesApi.listByUser(owner.id);
      return res.data as unknown as SeminarAttendee[];
    },
    enabled: !!owner.id,
  });

  const myActivities = useMemo(
    () => allActivities.filter((a) => isMember(a, owner)),
    [allActivities, owner],
  );
  const mySeminars = useMemo(() => {
    const attendedIds = new Set(userAttendeeRecords.map((a) => a.seminarId));
    return allSeminars.filter((s) => attendedIds.has(s.id));
  }, [allSeminars, userAttendeeRecords]);

  const filtered = useMemo(() => {
    if (tab === "seminar") return mySeminars;
    return myActivities.filter((a) => a.type === tab);
  }, [tab, myActivities, mySeminars]);

  const counts = useMemo<Record<SubTab, number>>(
    () => ({
      seminar: mySeminars.length,
      study: myActivities.filter((a) => a.type === "study").length,
      project: myActivities.filter((a) => a.type === "project").length,
      external: myActivities.filter((a) => a.type === "external").length,
    }),
    [mySeminars, myActivities],
  );

  const totalCount = filtered.length;
  const sliced = filtered.slice(0, visible);
  const hasMore = totalCount > visible;
  const isLoading = loadingActs || loadingSeminars;

  function changeTab(next: SubTab) {
    setTab(next);
    setVisible(PAGE_SIZE);
  }

  return (
    <section className="rounded-2xl border bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">학술활동</h2>
        <span className="text-[11px] text-muted-foreground">총 {totalCount}건</span>
      </div>

      <nav className="mb-3 flex flex-wrap gap-1 border-b">
        {SUB_TABS.map((t) => {
          const active = tab === t.key;
          const c = counts[t.key];
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => changeTab(t.key)}
              className={`flex items-center gap-1 border-b-2 px-2.5 py-1.5 text-xs font-medium transition-colors ${
                active ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <t.icon size={12} />
              {t.label}
              <span
                className={`ml-1 inline-flex min-w-[1.25rem] items-center justify-center rounded-full px-1.5 text-[10px] font-semibold ${
                  active
                    ? "bg-primary/10 text-primary"
                    : c > 0
                      ? "bg-slate-100 text-slate-600"
                      : "bg-transparent text-muted-foreground/50"
                }`}
              >
                {c}
              </span>
            </button>
          );
        })}
      </nav>

      {isLoading ? (
        <p className="py-6 text-center text-xs text-muted-foreground">불러오는 중…</p>
      ) : totalCount === 0 ? (
        <p className="py-6 text-center text-xs text-muted-foreground">표시할 항목이 없습니다.</p>
      ) : (
        <ul className="space-y-2">
          {sliced.map((item) => {
            if (tab === "seminar") {
              const s = item as Seminar;
              return (
                <li key={s.id} className="rounded-xl border px-4 py-3 hover:border-primary/40">
                  <Link href={`/seminars/${s.id}`} className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{s.title}</p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        {formatDate(s.date)}{s.time ? ` · ${s.time}` : ""}{s.location ? ` · ${s.location}` : ""}
                      </p>
                    </div>
                    <ChevronRight size={14} className="shrink-0 text-muted-foreground" />
                  </Link>
                </li>
              );
            }
            const a = item as Activity;
            const role = roleOf(a, owner);
            return (
              <li key={a.id} className="rounded-xl border px-4 py-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {a.status && (
                      <Badge variant="outline" className="text-[10px]">
                        {a.status === "upcoming" ? "예정" : a.status === "ongoing" ? "진행중" : "완료"}
                      </Badge>
                    )}
                    {(a.year || a.semester) && (
                      <Badge variant="secondary" className="bg-blue-50 text-[10px] text-blue-700">
                        {formatSemester(a.year, a.semester)}
                      </Badge>
                    )}
                    {role && (
                      <Badge
                        variant="secondary"
                        className={cn(
                          "gap-0.5 text-[10px] font-medium",
                          role.kind === "leader" && "bg-amber-50 text-amber-700",
                          role.kind === "role" && "bg-violet-50 text-violet-700",
                          role.kind === "external" && role.type && EXTERNAL_PARTICIPANT_TYPE_COLORS[role.type],
                        )}
                      >
                        {role.kind === "leader" ? <Crown size={9} /> : <Tag size={9} />}
                        {role.label}
                      </Badge>
                    )}
                  </div>
                  <p className="mt-1 truncate text-sm font-medium">{a.title}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {a.date ? formatDate(a.date) : ""}{a.location ? ` · ${a.location}` : ""}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {hasMore && (
        <div className="mt-3 text-center">
          <button
            type="button"
            onClick={() => setVisible((v) => v + PAGE_SIZE)}
            className="rounded-lg border px-3 py-1.5 text-xs text-muted-foreground hover:border-primary/40 hover:text-foreground"
          >
            더 보기 ({totalCount - visible}건 남음)
          </button>
        </div>
      )}
    </section>
  );
}
