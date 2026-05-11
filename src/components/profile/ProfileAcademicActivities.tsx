"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { activitiesApi, attendeeReviewsApi, attendeesApi, seminarsApi } from "@/lib/bkend";
import { useAuthStore } from "@/features/auth/auth-store";
import { EXTERNAL_PARTICIPANT_TYPE_LABELS, EXTERNAL_PARTICIPANT_TYPE_COLORS } from "@/types";
import type { Activity, ExternalParticipantType, Seminar, SeminarAttendee, User } from "@/types";
import { Badge } from "@/components/ui/badge";
import { BookOpen, ChevronRight, Crown, FolderKanban, Globe, Mic, Sparkles, Tag, CalendarRange, HandHeart, MessageSquare, Users } from "lucide-react";
import { formatDate, cn } from "@/lib/utils";
import { formatSemester, inferCurrentSemester, type Semester } from "@/lib/semester";

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
  // 대외학술대회는 신청만으로 참여로 간주(rejected 제외) — 별도 승인 절차 없음
  const isApplicant = a.applicants?.some((ap) =>
    ap.userId === owner.id &&
    (a.type === "external" ? ap.status !== "rejected" : ap.status === "approved"),
  );
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
  // 3) 대외활동 신청 시 선택한 참석 유형 — 미지정 시 일반 참석으로 폴백
  if (a.type === "external") {
    const ap = a.applicants?.find(
      (x) =>
        (x.userId === owner.id || x.email?.toLowerCase() === owner.email?.toLowerCase()) &&
        x.status !== "rejected",
    );
    const t = (ap?.participantType as ExternalParticipantType | undefined) ?? "attendee";
    return { label: EXTERNAL_PARTICIPANT_TYPE_LABELS[t], kind: "external", type: t };
  }
  return null;
}

export default function ProfileAcademicActivities({ owner }: Props) {
  const [tab, setTab] = useState<SubTab>("seminar");
  const [visible, setVisible] = useState<number>(PAGE_SIZE);
  // Sprint 67-AA: 후기 작성 직후 redirect 받은 reviewedActivityId 강조 + NEW 애니메이션
  const searchParams = useSearchParams();
  const reviewedActivityId = searchParams?.get("reviewedActivityId") ?? null;
  const initialSubTab = (searchParams?.get("subTab") ?? "") as SubTab | "";
  const { user: currentUser } = useAuthStore();
  const isOwner = !!currentUser && currentUser.id === owner.id;
  const newCardRef = useRef<HTMLLIElement | null>(null);
  const [showNewBadge, setShowNewBadge] = useState<boolean>(!!reviewedActivityId);

  // 초기 subTab 자동 적용 (후기 작성 redirect 시 'external' 자동 선택)
  useEffect(() => {
    if (initialSubTab && (["seminar", "study", "project", "external"] as const).includes(initialSubTab as SubTab)) {
      setTab(initialSubTab as SubTab);
    }
  }, [initialSubTab]);

  // NEW 강조된 카드로 자동 scroll + 6초 후 NEW 배지 fade out
  useEffect(() => {
    if (!reviewedActivityId) return;
    const t1 = setTimeout(() => {
      newCardRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
    const t2 = setTimeout(() => setShowNewBadge(false), 6000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [reviewedActivityId]);

  // 본인 프로필일 때 — 후기 작성한 활동 IDs fetch
  const { data: myReviews = [] } = useQuery({
    queryKey: ["profile-attendee-reviews", owner.id],
    queryFn: async () => {
      const res = await attendeeReviewsApi.listByUser(owner.id);
      return res.data ?? [];
    },
    enabled: isOwner && !!owner.id,
  });
  const reviewedActivityIds = useMemo(
    () => new Set(myReviews.map((r) => r.activityId)),
    [myReviews],
  );

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

  // 세미나에서 본인이 연사인지 판단 — speakers[] 배열 + 하위호환 단일 speaker 필드 모두 검사.
  // 매칭 키: userId(가장 정확) > studentId > 이름 일치.
  function isSpeaker(s: Seminar): boolean {
    if (s.speakers && s.speakers.length > 0) {
      return s.speakers.some(
        (sp) =>
          (sp.userId && sp.userId === owner.id) ||
          (sp.studentId && owner.studentId && sp.studentId === owner.studentId) ||
          (sp.type === "member" && sp.name && sp.name.trim() === owner.name?.trim()),
      );
    }
    // 하위호환: 단일 speaker 필드 — 회원 매칭이 어려워 이름만 비교
    if (s.speakerType === "member" && s.speaker?.trim() === owner.name?.trim()) return true;
    return false;
  }

  const mySeminars = useMemo(() => {
    const attendedIds = new Set(userAttendeeRecords.map((a) => a.seminarId));
    // 참여자(attendees)이거나 연사인 세미나 모두 포함. 중복은 id 기준 dedup.
    const collected = allSeminars.filter((s) => attendedIds.has(s.id) || isSpeaker(s));
    const seen = new Set<string>();
    return collected.filter((s) => {
      if (seen.has(s.id)) return false;
      seen.add(s.id);
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allSeminars, userAttendeeRecords, owner.id, owner.studentId, owner.name]);

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

  // 학기 키 도출: 연도+학기. 없으면 date에서 추론, 둘 다 없으면 null(=기타).
  function semesterKeyOf(item: Seminar | Activity): { year: number; semester: Semester } | null {
    if (tab !== "seminar") {
      const a = item as Activity;
      if (a.year && (a.semester === "first" || a.semester === "second")) {
        return { year: a.year, semester: a.semester as Semester };
      }
      if (a.date) {
        const d = new Date(a.date);
        if (!isNaN(d.getTime())) return inferCurrentSemester(d);
      }
      return null;
    }
    const s = item as Seminar;
    if (s.date) {
      const d = new Date(s.date);
      if (!isNaN(d.getTime())) return inferCurrentSemester(d);
    }
    return null;
  }

  // 학기별 그룹핑 + 정렬(연도 desc, 후기→전기 desc, 기타는 최하단).
  const groups = useMemo(() => {
    const buckets = new Map<string, { year: number | null; semester: Semester | null; items: (Seminar | Activity)[] }>();
    for (const item of filtered) {
      const key = semesterKeyOf(item);
      const k = key ? `${key.year}-${key.semester}` : "__other__";
      if (!buckets.has(k)) {
        buckets.set(k, { year: key?.year ?? null, semester: key?.semester ?? null, items: [] });
      }
      buckets.get(k)!.items.push(item);
    }
    const arr = Array.from(buckets.values());
    arr.sort((a, b) => {
      if (a.year === null) return 1;
      if (b.year === null) return -1;
      if (a.year !== b.year) return b.year - a.year;
      // 후기(second)가 전기(first)보다 먼저
      const av = a.semester === "second" ? 1 : 0;
      const bv = b.semester === "second" ? 1 : 0;
      return bv - av;
    });
    // 그룹 내 항목은 날짜 desc
    for (const g of arr) {
      g.items.sort((x, y) => {
        const dx = (x as { date?: string }).date ?? "";
        const dy = (y as { date?: string }).date ?? "";
        return dy.localeCompare(dx);
      });
    }
    return arr;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered, tab]);

  // visible 개수만큼 그룹 순회하며 슬라이스
  const visibleGroups = useMemo(() => {
    const result: { year: number | null; semester: Semester | null; items: (Seminar | Activity)[] }[] = [];
    let remaining = visible;
    for (const g of groups) {
      if (remaining <= 0) break;
      const take = g.items.slice(0, remaining);
      if (take.length > 0) {
        result.push({ year: g.year, semester: g.semester, items: take });
        remaining -= take.length;
      }
    }
    return result;
  }, [groups, visible]);

  const totalCount = filtered.length;
  const hasMore = totalCount > visible;
  const isLoading = loadingActs || loadingSeminars;

  function semesterLabel(year: number | null, semester: Semester | null): string {
    if (year === null || semester === null) return "기타 / 미분류";
    return formatSemester(year, semester);
  }

  function changeTab(next: SubTab) {
    setTab(next);
    setVisible(PAGE_SIZE);
  }

  return (
    <section className="rounded-2xl border bg-card p-5 shadow-sm">
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
        <div className="space-y-5">
          {visibleGroups.map((group) => {
            const headerKey = group.year === null ? "other" : `${group.year}-${group.semester}`;
            const isOther = group.year === null;
            return (
              <section key={headerKey}>
                <div
                  className={cn(
                    "sticky top-0 z-10 mb-2 -mx-1 flex items-center gap-2 bg-card/95 px-1 py-1 backdrop-blur-sm",
                  )}
                >
                  <div
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold",
                      isOther
                        ? "border-slate-200 bg-slate-50 text-slate-600"
                        : group.semester === "first"
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "border-amber-200 bg-amber-50 text-amber-700",
                    )}
                  >
                    <CalendarRange size={11} />
                    {semesterLabel(group.year, group.semester)}
                  </div>
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-[10px] font-medium text-muted-foreground">{group.items.length}건</span>
                </div>
                <ul className="space-y-2">
                  {group.items.map((item) => {
                    if (tab === "seminar") {
                      const s = item as Seminar;
                      const speaker = isSpeaker(s);
                      return (
                        <li
                          key={s.id}
                          className={cn(
                            "rounded-xl border px-4 py-3 transition-colors",
                            speaker
                              ? "border-rose-200 bg-rose-50/40 hover:border-rose-300"
                              : "hover:border-primary/40",
                          )}
                        >
                          <Link href={`/seminars/${s.id}`} className="flex items-center justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-1.5">
                                {speaker && (
                                  <Badge
                                    variant="secondary"
                                    className="gap-0.5 bg-rose-100 text-[10px] font-semibold text-rose-700"
                                  >
                                    <Mic size={9} /> 연사
                                  </Badge>
                                )}
                              </div>
                              <p className={cn("truncate text-sm", speaker ? "font-semibold text-rose-900" : "font-medium")}>
                                {s.title}
                              </p>
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
                    // Sprint 67-AA: 후기 작성 강조 (NEW 애니메이션 + ✓ 배지)
                    const isNewlyReviewed = a.id === reviewedActivityId;
                    const hasReview = isOwner && reviewedActivityIds.has(a.id);
                    return (
                      <li
                        key={a.id}
                        ref={isNewlyReviewed ? newCardRef : undefined}
                        className={cn(
                          "rounded-xl border px-4 py-3 transition-all",
                          isNewlyReviewed && showNewBadge &&
                            "relative overflow-hidden border-primary/60 bg-primary/5 shadow-lg ring-2 ring-primary/40 animate-in slide-in-from-bottom-4 fade-in duration-700",
                          hasReview && !isNewlyReviewed && "border-emerald-200 bg-emerald-50/30 dark:border-emerald-900 dark:bg-emerald-950/10",
                        )}
                      >
                        {/* NEW sparkle 효과 */}
                        {isNewlyReviewed && showNewBadge && (
                          <>
                            <Sparkles className="absolute right-2 top-2 h-4 w-4 animate-pulse text-amber-400" />
                            <Sparkles className="absolute right-8 top-3 h-3 w-3 animate-pulse text-amber-400 [animation-delay:0.3s]" />
                          </>
                        )}
                        <div className="min-w-0 relative">
                          <div className="flex flex-wrap items-center gap-1.5">
                            {isNewlyReviewed && showNewBadge && (
                              <Badge className="gap-0.5 bg-amber-500 text-white text-[10px] font-bold animate-in zoom-in duration-500">
                                <Sparkles size={9} /> NEW
                              </Badge>
                            )}
                            {/* Sprint 67-AK: '후기 작성' 영구 배지 제거 (사용자 요청) */}
                            {a.status && (
                              <Badge variant="outline" className="text-[10px]">
                                {a.status === "upcoming" ? "예정" : a.status === "ongoing" ? "진행중" : "완료"}
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
                                {role.kind === "leader" ? (
                                  <Crown size={9} />
                                ) : role.kind === "external" && role.type === "speaker" ? (
                                  <Mic size={9} />
                                ) : role.kind === "external" && role.type === "volunteer" ? (
                                  <HandHeart size={9} />
                                ) : role.kind === "external" && role.type === "attendee" ? (
                                  <Users size={9} />
                                ) : (
                                  <Tag size={9} />
                                )}
                                {role.label}
                              </Badge>
                            )}
                          </div>
                          <p className="mt-1 truncate text-sm font-medium">{a.title}</p>
                          <p className="mt-0.5 text-[11px] text-muted-foreground">
                            {a.date ? formatDate(a.date) : ""}{a.location ? ` · ${a.location}` : ""}
                          </p>
                          {/* Sprint 67-AB/AK: 후기 미작성 안내 박스 — 본인 + external + 미래(오늘 이후) 학회 만 */}
                          {isOwner && !hasReview && a.type === "external" && (() => {
                            // 학회 종료일/시작일 기준 — 오늘 이전이면 안내 박스 숨김
                            const today = new Date().toISOString().slice(0, 10);
                            const eventDate = a.endDate ?? a.date;
                            const isPast = eventDate ? eventDate < today : false;
                            return !isPast;
                          })() && (
                            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-md border border-amber-200/80 bg-amber-50/70 px-2.5 py-1.5 dark:border-amber-900 dark:bg-amber-950/20">
                              <p className="flex-1 text-[11px] leading-snug text-amber-900 dark:text-amber-200">
                                ✨ 후기 작성으로 대외활동 참여 경험을 등록하세요
                              </p>
                              <Link
                                href={`/activities/external/${a.id}/review`}
                                className="inline-flex items-center gap-1 rounded-md border border-amber-300 bg-card px-2 py-1 text-[11px] font-medium text-amber-900 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100 dark:hover:bg-amber-900/40"
                              >
                                <MessageSquare size={11} /> 후기 작성
                              </Link>
                            </div>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
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
