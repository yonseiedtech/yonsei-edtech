"use client";

/**
 * /console/onboarding-checklist — 시작하기 체크리스트 운영진 편집 + 통계.
 *
 * 기존 NewMemberChecklistWidget 하드코딩 5항목을 Firestore onboarding_checklist 컬렉션으로
 * 분리하여 운영진이 항목 추가/삭제/순서/라벨/링크/완료조건/노출여부 를 콘솔에서 편집.
 *
 * 2-탭 구조:
 *  - "항목 편집" (default) — 기존 CRUD UI
 *  - "통계"          — 회원×항목 완료율 매트릭스 (회원·항목·전체)
 *
 * AuthGuard: ConsoleLayout 에서 이미 staff+ 게이트 적용 — 별도 가드 불필요.
 */

import { useMemo, useState } from "react";
import { useQueries, useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ListChecks,
  Plus,
  Pencil,
  Trash2,
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff,
  Sparkles,
  Loader2,
  BarChart3,
  Users as UsersIcon,
  Download,
} from "lucide-react";
import ConsolePageHeader from "@/components/admin/ConsolePageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  onboardingChecklistApi,
  profilesApi,
  researchReportsApi,
  courseReviewsApi,
  dataApi,
} from "@/lib/bkend";
import { importOnboardingChecklistSeed } from "@/lib/onboarding-checklist-seed";
import { useAuthStore } from "@/features/auth/auth-store";
import {
  CHECKLIST_COMPLETION_LABELS,
  CHECKLIST_ICONS,
  CHECKLIST_PRIORITIES,
  CHECKLIST_PRIORITY_LABELS,
  type ChecklistCompletionType,
  type ChecklistIcon,
  type ChecklistPriority,
  type OnboardingChecklistItem,
  type SeminarAttendee,
  type ArchiveFavorite,
  type ActivityParticipation,
  type ResearchReport,
  type CourseReview,
  type User,
} from "@/types";
import {
  evalCompletionForUser,
  groupByUserId,
  groupBy,
  type OnboardingEvalContext,
} from "@/lib/onboarding-evaluator";
import { toast } from "sonner";

const COMPLETION_TYPES = Object.keys(
  CHECKLIST_COMPLETION_LABELS,
) as ChecklistCompletionType[];

interface FormState {
  label: string;
  href: string;
  icon: ChecklistIcon;
  completionType: ChecklistCompletionType;
  enabled: boolean;
  priority: ChecklistPriority;
}

function blankForm(): FormState {
  return {
    label: "",
    href: "/",
    icon: "Sparkles",
    completionType: "profile.bio",
    enabled: true,
    priority: "medium",
  };
}

export default function OnboardingChecklistConsolePage() {
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const [editing, setEditing] = useState<OnboardingChecklistItem | "new" | null>(
    null,
  );
  const [seeding, setSeeding] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["onboarding_checklist", "all"],
    queryFn: () => onboardingChecklistApi.list(),
  });

  const items = data?.data ?? [];

  const updateMutation = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Record<string, unknown> }) =>
      onboardingChecklistApi.update(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["onboarding_checklist"] }),
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "수정에 실패했습니다."),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => onboardingChecklistApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["onboarding_checklist"] });
      toast.success("삭제되었습니다.");
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "삭제에 실패했습니다."),
  });

  async function handleSwap(idx: number, dir: -1 | 1) {
    const a = items[idx];
    const b = items[idx + dir];
    if (!a || !b) return;
    try {
      await Promise.all([
        onboardingChecklistApi.update(a.id, {
          order: b.order,
          updatedBy: user?.id,
        }),
        onboardingChecklistApi.update(b.id, {
          order: a.order,
          updatedBy: user?.id,
        }),
      ]);
      qc.invalidateQueries({ queryKey: ["onboarding_checklist"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "순서 변경에 실패했습니다.");
    }
  }

  async function handleSeed() {
    if (!user) return;
    if (
      !confirm(
        "기본 시드 5항목(자기소개·관심분야·학술활동·세미나·즐겨찾기)을 추가하시겠습니까?\n동일 라벨 항목은 건너뜁니다.",
      )
    )
      return;
    setSeeding(true);
    try {
      const r = await importOnboardingChecklistSeed(user.id);
      toast.success(
        `시드 적용 완료 — ${r.created}건 신규 / ${r.skipped}건 스킵 / ${r.total}건 전체`,
      );
      qc.invalidateQueries({ queryKey: ["onboarding_checklist"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "시드 적용에 실패했습니다.");
    } finally {
      setSeeding(false);
    }
  }

  return (
    <div className="space-y-6">
      <ConsolePageHeader
        icon={ListChecks}
        title="시작하기 체크리스트 관리"
        description="대시보드 'NewMemberChecklistWidget' 가 fetch 하는 항목 — 추가/삭제/순서/라벨/링크/완료조건 편집"
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSeed}
              disabled={seeding}
              title="기본 5항목 일괄 추가 (동일 라벨 skip)"
            >
              {seeding ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-1 h-4 w-4" />
              )}
              기본 시드 추가
            </Button>
            <Button size="sm" onClick={() => setEditing("new")}>
              <Plus size={14} className="mr-1" /> 새 항목
            </Button>
          </div>
        }
      />

      <Tabs defaultValue="edit" className="gap-4">
        <TabsList className="w-fit">
          <TabsTrigger value="edit" className="gap-1.5">
            <ListChecks size={14} /> 항목 편집
          </TabsTrigger>
          <TabsTrigger value="stats" className="gap-1.5">
            <BarChart3 size={14} /> 통계
          </TabsTrigger>
        </TabsList>

        <TabsContent value="edit" className="space-y-4">
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs leading-relaxed text-blue-900 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-200">
            <p>
              <strong>위젯 노출 조건:</strong> <code>enabled=true</code> 항목만 위젯에 표시되며,
              {" "}<code>order</code> asc 순으로 정렬됩니다. 항목이 0개면 위젯은 자동으로 숨겨집니다.
            </p>
            <p className="mt-1">
              <strong>완료조건(completionType):</strong> 위젯이 사용자별 데이터를 fetch 해서
              항목별 완료 여부를 평가합니다. (예: <code>attended.seminar</code> →
              seminar_attendees 1건+)
            </p>
          </div>

          {isLoading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">불러오는 중...</p>
          ) : items.length === 0 ? (
            <div className="rounded-2xl border border-dashed py-16 text-center">
              <ListChecks size={32} className="mx-auto text-muted-foreground/40" />
              <p className="mt-3 text-sm text-muted-foreground">
                아직 등록된 체크리스트 항목이 없습니다.
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                기본 5항목으로 빠르게 시작하거나, 직접 항목을 추가해 보세요.
              </p>
              <div className="mt-4 flex justify-center gap-2">
                <Button variant="outline" onClick={handleSeed} disabled={seeding}>
                  {seeding ? (
                    <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="mr-1 h-4 w-4" />
                  )}
                  기본 시드 추가
                </Button>
                <Button onClick={() => setEditing("new")}>
                  <Plus size={14} className="mr-1" /> 첫 항목 만들기
                </Button>
              </div>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border bg-card">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">순서</th>
                    <th className="px-3 py-2 text-left font-medium">라벨 / 링크</th>
                    <th className="px-3 py-2 text-left font-medium">아이콘</th>
                    <th className="px-3 py-2 text-left font-medium">완료조건</th>
                    <th className="px-3 py-2 text-left font-medium">우선순위</th>
                    <th className="px-3 py-2 text-center font-medium">노출</th>
                    <th className="px-3 py-2 text-right font-medium">액션</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {items.map((it, idx) => (
                    <tr key={it.id} className="hover:bg-muted/20">
                      <td className="px-3 py-2.5 align-middle">
                        <div className="flex items-center gap-1">
                          <span className="w-6 text-center text-xs font-semibold tabular-nums">
                            {it.order}
                          </span>
                          <div className="flex flex-col gap-0.5">
                            <button
                              type="button"
                              onClick={() => handleSwap(idx, -1)}
                              disabled={idx === 0}
                              title="위로"
                              className="rounded p-0.5 text-muted-foreground hover:bg-muted disabled:opacity-30"
                            >
                              <ArrowUp size={12} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSwap(idx, 1)}
                              disabled={idx === items.length - 1}
                              title="아래로"
                              className="rounded p-0.5 text-muted-foreground hover:bg-muted disabled:opacity-30"
                            >
                              <ArrowDown size={12} />
                            </button>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="font-medium">{it.label}</div>
                        <div className="mt-0.5 truncate text-xs text-muted-foreground">
                          {it.href}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-xs">
                        <code className="rounded bg-muted px-1.5 py-0.5">{it.icon}</code>
                      </td>
                      <td className="px-3 py-2.5 text-xs text-muted-foreground">
                        {CHECKLIST_COMPLETION_LABELS[it.completionType] ?? it.completionType}
                        <br />
                        <code className="text-[10px]">{it.completionType}</code>
                      </td>
                      <td className="px-3 py-2.5 text-xs">
                        <PriorityBadge priority={it.priority ?? "medium"} />
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <button
                          type="button"
                          onClick={() =>
                            updateMutation.mutate({
                              id: it.id,
                              patch: { enabled: !it.enabled, updatedBy: user?.id },
                            })
                          }
                          title={it.enabled ? "비활성화" : "활성화"}
                          className="rounded-md p-1.5 hover:bg-muted"
                        >
                          {it.enabled ? (
                            <Eye size={14} />
                          ) : (
                            <EyeOff size={14} className="text-muted-foreground" />
                          )}
                        </button>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => setEditing(it)}
                            title="편집"
                            className="rounded-md p-1.5 hover:bg-muted"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`"${it.label}" 항목을 삭제할까요?`))
                                deleteMutation.mutate(it.id);
                            }}
                            title="삭제"
                            className="rounded-md p-1.5 text-red-500 hover:bg-red-50"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="stats">
          <ChecklistStatsTab />
        </TabsContent>
      </Tabs>

      {editing && (
        <EditDialog
          item={editing === "new" ? null : editing}
          existingItems={items}
          onClose={() => setEditing(null)}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ["onboarding_checklist"] });
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// ChecklistStatsTab — 회원×항목 완료율 매트릭스
// ────────────────────────────────────────────────────────────

type StatsSort = "completion_asc" | "completion_desc" | "created_desc";

const STATS_LIMIT = 5000;
const STATS_STALE_MS = 5 * 60_000;
const ROW_PAGE_SIZE = 50;

function ChecklistStatsTab() {
  const [sort, setSort] = useState<StatsSort>("completion_asc");
  const [visibleCount, setVisibleCount] = useState(ROW_PAGE_SIZE);

  function handleDownloadCsv(
    allUsers: User[],
    items: OnboardingChecklistItem[],
    ctx: OnboardingEvalContext,
  ) {
    const csv = buildChecklistStatsCsv(allUsers, items, ctx);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const today = new Date().toISOString().slice(0, 10);
    a.download = `onboarding-checklist-stats-${today}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("CSV 다운로드 완료");
  }

  // 6개 fetch 병렬 — staleTime 5분, 운영진(staff+) 만 진입하므로 권한 통과 가정
  const queries = useQueries({
    queries: [
      {
        queryKey: ["onboarding_stats", "users"],
        queryFn: () => profilesApi.list({ limit: 1000 }),
        staleTime: STATS_STALE_MS,
      },
      {
        queryKey: ["onboarding_stats", "checklist_enabled"],
        queryFn: () => onboardingChecklistApi.listEnabled(),
        staleTime: STATS_STALE_MS,
      },
      {
        queryKey: ["onboarding_stats", "attendees"],
        queryFn: () =>
          dataApi.list<SeminarAttendee>("seminar_attendees", { limit: STATS_LIMIT }),
        staleTime: STATS_STALE_MS,
      },
      {
        queryKey: ["onboarding_stats", "favorites"],
        queryFn: () =>
          dataApi.list<ArchiveFavorite>("archive_favorites", { limit: STATS_LIMIT }),
        staleTime: STATS_STALE_MS,
      },
      {
        queryKey: ["onboarding_stats", "participations"],
        queryFn: () =>
          dataApi.list<ActivityParticipation>("activity_participations", {
            limit: STATS_LIMIT,
          }),
        staleTime: STATS_STALE_MS,
      },
      {
        queryKey: ["onboarding_stats", "reports"],
        queryFn: () => researchReportsApi.listAll(STATS_LIMIT),
        staleTime: STATS_STALE_MS,
      },
      {
        queryKey: ["onboarding_stats", "reviews"],
        queryFn: () => courseReviewsApi.list({ limit: STATS_LIMIT }),
        staleTime: STATS_STALE_MS,
      },
    ],
  });

  const [
    usersQ,
    checklistQ,
    attendeesQ,
    favoritesQ,
    participationsQ,
    reportsQ,
    reviewsQ,
  ] = queries;

  const isLoading = queries.some((q) => q.isLoading);
  const hasError = queries.some((q) => q.isError);

  // ?? [] 는 매 렌더마다 새 배열을 만들어 useMemo 의존성을 무효화하므로 각각 useMemo 로 안정화.
  const users = useMemo(
    () => (usersQ.data?.data ?? []) as User[],
    [usersQ.data],
  );
  const enabledItems = useMemo(
    () => (checklistQ.data?.data ?? []) as OnboardingChecklistItem[],
    [checklistQ.data],
  );
  const attendees = useMemo(
    () => (attendeesQ.data?.data ?? []) as SeminarAttendee[],
    [attendeesQ.data],
  );
  const favorites = useMemo(
    () => (favoritesQ.data?.data ?? []) as ArchiveFavorite[],
    [favoritesQ.data],
  );
  const participations = useMemo(
    () => (participationsQ.data?.data ?? []) as ActivityParticipation[],
    [participationsQ.data],
  );
  const reports = useMemo(
    () => (reportsQ.data?.data ?? []) as ResearchReport[],
    [reportsQ.data],
  );
  const reviews = useMemo(
    () => (reviewsQ.data?.data ?? []) as CourseReview[],
    [reviewsQ.data],
  );

  // 그룹핑 — 1회만
  const ctx: OnboardingEvalContext = useMemo(
    () => ({
      attendeesByUser: groupByUserId(attendees),
      favoritesByUser: groupByUserId(favorites),
      participationsByUser: groupByUserId(participations),
      reportsByUser: groupByUserId(reports),
      reviewsByUser: groupBy(reviews, (r) => r.authorId),
    }),
    [attendees, favorites, participations, reports, reviews],
  );

  // 회원×항목 매트릭스 + 통계
  const stats = useMemo(() => {
    if (enabledItems.length === 0 || users.length === 0) {
      return {
        rows: [] as Array<{
          user: User;
          completed: number;
          total: number;
          ratio: number;
        }>,
        perItem: enabledItems.map((it) => ({ item: it, completed: 0 })),
        avg: 0,
        full: 0,
        zero: 0,
      };
    }
    const perItemCount = new Map<string, number>();
    enabledItems.forEach((it) => perItemCount.set(it.id, 0));

    const rows = users.map((u) => {
      let completed = 0;
      for (const it of enabledItems) {
        if (evalCompletionForUser(u, it.completionType, ctx)) {
          completed += 1;
          perItemCount.set(it.id, (perItemCount.get(it.id) ?? 0) + 1);
        }
      }
      const total = enabledItems.length;
      return { user: u, completed, total, ratio: total > 0 ? completed / total : 0 };
    });

    const sumRatio = rows.reduce((s, r) => s + r.ratio, 0);
    const avg = rows.length > 0 ? sumRatio / rows.length : 0;
    const full = rows.filter((r) => r.completed === r.total && r.total > 0).length;
    const zero = rows.filter((r) => r.completed === 0).length;

    return {
      rows,
      perItem: enabledItems.map((it) => ({
        item: it,
        completed: perItemCount.get(it.id) ?? 0,
      })),
      avg,
      full,
      zero,
    };
  }, [users, enabledItems, ctx]);

  // 정렬된 회원 행
  const sortedRows = useMemo(() => {
    const copy = [...stats.rows];
    switch (sort) {
      case "completion_asc":
        copy.sort((a, b) => a.ratio - b.ratio);
        break;
      case "completion_desc":
        copy.sort((a, b) => b.ratio - a.ratio);
        break;
      case "created_desc":
        copy.sort((a, b) => {
          const ta = new Date(a.user.createdAt ?? 0).getTime();
          const tb = new Date(b.user.createdAt ?? 0).getTime();
          return tb - ta;
        });
        break;
    }
    return copy;
  }, [stats.rows, sort]);

  const visibleRows = sortedRows.slice(0, visibleCount);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        통계 데이터를 불러오는 중...
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="rounded-2xl border border-dashed border-red-200 bg-red-50/40 p-8 text-center text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200">
        통계 데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.
      </div>
    );
  }

  if (enabledItems.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed py-16 text-center">
        <BarChart3 size={32} className="mx-auto text-muted-foreground/40" />
        <p className="mt-3 text-sm text-muted-foreground">
          활성화된 체크리스트 항목이 없습니다.
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          항목 편집 탭에서 항목을 추가하거나 활성화한 뒤 통계를 확인하세요.
        </p>
      </div>
    );
  }

  const avgPct = Math.round(stats.avg * 100);
  const totalUsers = stats.rows.length;

  return (
    <div className="space-y-6">
      {/* CSV 다운로드 버튼 */}
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleDownloadCsv(users, enabledItems, ctx)}
          disabled={isLoading || stats.rows.length === 0}
          title={stats.rows.length === 0 ? "다운로드할 데이터 없음" : "CSV 파일로 내보내기"}
        >
          <Download className="mr-1.5 h-4 w-4" />
          CSV 내보내기
        </Button>
      </div>

      {/* 상단 4 통계 카드 */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label="전체 회원"
          value={`${totalUsers.toLocaleString()}명`}
          icon={UsersIcon}
        />
        <StatCard label="평균 완료율" value={`${avgPct}%`} icon={BarChart3} />
        <StatCard label="100% 완료" value={`${stats.full}명`} accent="emerald" />
        <StatCard label="0% 완료" value={`${stats.zero}명`} accent="rose" />
      </div>

      {/* 항목별 막대 그래프 */}
      <div className="overflow-hidden rounded-2xl border bg-card">
        <div className="border-b px-4 py-3">
          <h3 className="text-sm font-semibold">항목별 완료 현황</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            활성화된 항목({enabledItems.length}개) 기준 — visited.* 항목은 운영진이 직접 알 수
            없어 0건으로 표시됩니다.
          </p>
        </div>
        <ul className="divide-y">
          {stats.perItem.map(({ item, completed }) => {
            const pct = totalUsers > 0 ? Math.round((completed / totalUsers) * 100) : 0;
            return (
              <li key={item.id} className="px-4 py-3">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="truncate font-medium">{item.label}</span>
                  <span className="tabular-nums text-xs text-muted-foreground">
                    {completed}/{totalUsers} 완료 ({pct}%)
                  </span>
                </div>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted/40">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="mt-1 text-[11px] text-muted-foreground">
                  <code>{item.completionType}</code>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {/* 회원별 테이블 */}
      <div className="overflow-hidden rounded-2xl border bg-card">
        <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
          <div>
            <h3 className="text-sm font-semibold">회원별 완료 현황</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              총 {totalUsers.toLocaleString()}명 — 최대 {ROW_PAGE_SIZE}명씩 표시
            </p>
          </div>
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            정렬
            <select
              value={sort}
              onChange={(e) => {
                setSort(e.target.value as StatsSort);
                setVisibleCount(ROW_PAGE_SIZE);
              }}
              className="rounded-md border bg-background px-2 py-1 text-xs"
            >
              <option value="completion_asc">완료율 낮은 순</option>
              <option value="completion_desc">완료율 높은 순</option>
              <option value="created_desc">가입일 최신 순</option>
            </select>
          </label>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left font-medium">이름</th>
                <th className="px-3 py-2 text-left font-medium">학번</th>
                <th className="px-3 py-2 text-left font-medium">완료율</th>
                <th className="px-3 py-2 text-left font-medium">완료</th>
                <th className="px-3 py-2 text-left font-medium">가입일</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {visibleRows.map((r) => {
                const pct = Math.round(r.ratio * 100);
                return (
                  <tr key={r.user.id} className="hover:bg-muted/20">
                    <td className="px-3 py-2 align-middle font-medium">
                      {r.user.name}
                    </td>
                    <td className="px-3 py-2 align-middle text-xs text-muted-foreground">
                      {r.user.studentId ?? "—"}
                    </td>
                    <td className="px-3 py-2 align-middle">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted/40">
                          <div
                            className="h-full rounded-full bg-primary"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="tabular-nums text-xs">{pct}%</span>
                      </div>
                    </td>
                    <td className="px-3 py-2 align-middle text-xs tabular-nums text-muted-foreground">
                      {r.completed}/{r.total}
                    </td>
                    <td className="px-3 py-2 align-middle text-xs text-muted-foreground">
                      {formatYmd(r.user.createdAt)}
                    </td>
                  </tr>
                );
              })}
              {visibleRows.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-3 py-6 text-center text-xs text-muted-foreground"
                  >
                    표시할 회원이 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {sortedRows.length > visibleCount && (
          <div className="flex justify-center border-t px-4 py-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setVisibleCount((c) => c + ROW_PAGE_SIZE)}
            >
              더 보기 ({sortedRows.length - visibleCount}명 남음)
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string;
  icon?: typeof BarChart3;
  accent?: "emerald" | "rose";
}) {
  const accentClass =
    accent === "emerald"
      ? "text-emerald-600 dark:text-emerald-300"
      : accent === "rose"
        ? "text-rose-600 dark:text-rose-300"
        : "text-foreground";
  return (
    <div className="rounded-2xl border bg-card p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {Icon && <Icon size={14} />}
        <span>{label}</span>
      </div>
      <div className={`mt-2 text-2xl font-semibold tabular-nums ${accentClass}`}>
        {value}
      </div>
    </div>
  );
}

function formatYmd(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatDateOrEmpty(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function escapeCsvField(v: string): string {
  if (v.includes(",") || v.includes('"') || v.includes("\n")) {
    return `"${v.replace(/"/g, '""')}"`;
  }
  return v;
}

function buildChecklistStatsCsv(
  users: User[],
  items: OnboardingChecklistItem[],
  ctx: OnboardingEvalContext,
): string {
  const headers = [
    "이름",
    "학번",
    "역할",
    "가입일",
    "완료율(%)",
    "완료 항목 수/전체",
    ...items.map((it) => it.label),
  ];

  const rows = users.map((u) => {
    const completions = items.map((it) =>
      evalCompletionForUser(u, it.completionType, ctx),
    );
    const completedCount = completions.filter(Boolean).length;
    const total = items.length;
    const pct = total > 0 ? Math.round((completedCount / total) * 100) : 0;
    return [
      escapeCsvField(u.name ?? ""),
      escapeCsvField(u.studentId ?? ""),
      escapeCsvField(u.role ?? ""),
      escapeCsvField(formatDateOrEmpty(u.createdAt)),
      String(pct),
      `${completedCount}/${total}`,
      ...completions.map((c) => (c ? "Y" : "N")),
    ];
  });

  // BOM + CSV (엑셀 한글 호환)
  return "﻿" + [headers, ...rows].map((row) => row.join(",")).join("\n");
}

// ────────────────────────────────────────────────────────────
// EditDialog — 기존 그대로
// ────────────────────────────────────────────────────────────

function EditDialog({
  item,
  existingItems,
  onClose,
  onSaved,
}: {
  item: OnboardingChecklistItem | null;
  existingItems: OnboardingChecklistItem[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { user } = useAuthStore();
  const [form, setForm] = useState<FormState>(() =>
    item
      ? {
          label: item.label,
          href: item.href,
          icon: item.icon,
          completionType: item.completionType,
          enabled: item.enabled,
          priority: item.priority ?? "medium",
        }
      : blankForm(),
  );
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!form.label.trim()) {
      toast.error("라벨을 입력해 주세요.");
      return;
    }
    if (!form.href.trim()) {
      toast.error("링크를 입력해 주세요.");
      return;
    }
    setSaving(true);
    try {
      if (item) {
        await onboardingChecklistApi.update(item.id, {
          label: form.label.trim(),
          href: form.href.trim(),
          icon: form.icon,
          completionType: form.completionType,
          enabled: form.enabled,
          priority: form.priority,
          updatedBy: user?.id,
        });
      } else {
        const maxOrder = existingItems.reduce(
          (m, it) => (typeof it.order === "number" && it.order > m ? it.order : m),
          -1,
        );
        await onboardingChecklistApi.create({
          order: maxOrder + 1,
          label: form.label.trim(),
          href: form.href.trim(),
          icon: form.icon,
          completionType: form.completionType,
          enabled: form.enabled,
          priority: form.priority,
          createdBy: user?.id,
        });
      }
      toast.success("저장되었습니다.");
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{item ? "항목 수정" : "새 항목"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <Field label="라벨 *">
            <Input
              value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
              placeholder="예: 자기소개 작성"
            />
          </Field>
          <Field label="링크 (href) *">
            <Input
              value={form.href}
              onChange={(e) => setForm({ ...form, href: e.target.value })}
              placeholder="예: /mypage/edit"
            />
          </Field>
          <Field label="아이콘">
            <select
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={form.icon}
              onChange={(e) =>
                setForm({ ...form, icon: e.target.value as ChecklistIcon })
              }
            >
              {CHECKLIST_ICONS.map((ic) => (
                <option key={ic} value={ic}>
                  {ic}
                </option>
              ))}
            </select>
          </Field>
          <Field label="완료조건 (completionType)">
            <select
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={form.completionType}
              onChange={(e) =>
                setForm({
                  ...form,
                  completionType: e.target.value as ChecklistCompletionType,
                })
              }
            >
              {COMPLETION_TYPES.map((t) => (
                <option key={t} value={t}>
                  {CHECKLIST_COMPLETION_LABELS[t]} ({t})
                </option>
              ))}
            </select>
            <p className="mt-1 text-[11px] text-muted-foreground">
              위젯이 사용자별 데이터를 평가해 완료 여부를 판정합니다.
            </p>
          </Field>
          <Field label="우선순위 (priority)">
            <select
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={form.priority}
              onChange={(e) =>
                setForm({ ...form, priority: e.target.value as ChecklistPriority })
              }
            >
              {CHECKLIST_PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {CHECKLIST_PRIORITY_LABELS[p]} ({p})
                </option>
              ))}
            </select>
            <p className="mt-1 text-[11px] text-muted-foreground">
              high 항목은 위젯 상단에 강조 표시(분홍 배경+벨 아이콘)되며, 미완료 시 우선 노출됩니다.
            </p>
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.enabled}
              onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
              className="h-4 w-4 rounded border"
            />
            <span>위젯에 노출 (enabled)</span>
          </label>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            취소
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "저장중..." : "저장"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}

function PriorityBadge({ priority }: { priority: ChecklistPriority }) {
  const cls =
    priority === "high"
      ? "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-200"
      : priority === "low"
        ? "bg-muted text-muted-foreground"
        : "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-200";
  return (
    <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-medium ${cls}`}>
      {CHECKLIST_PRIORITY_LABELS[priority]}
    </span>
  );
}
