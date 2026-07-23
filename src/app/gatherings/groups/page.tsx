"use client";

/**
 * 다회성 모임(Activity Groups) 목록 — /gatherings/groups
 *
 * 독서모임·와인모임처럼 1회성이 아닌 지속 운영 그룹을 목록으로 보여줍니다.
 * 로그인 회원 누구나 그룹을 개설할 수 있으며, 개설자가 그룹장이 됩니다.
 */

import { useState, useMemo } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Users, Plus, ChevronRight, BookOpen } from "lucide-react";
import PageContainer from "@/components/ui/page-container";
import PageHeader from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import EmptyState from "@/components/ui/empty-state";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuthStore } from "@/features/auth/auth-store";
import { cn } from "@/lib/utils";
import {
  ACTIVITY_GROUP_CATEGORIES,
  ACTIVITY_GROUP_STATUS_LABELS,
  type ActivityGroup,
  type ActivityGroupCategory,
  type ActivityGroupStatus,
} from "@/types";
import { activityGroupsApi, activityGroupMembersApi } from "@/features/activity-groups/api";
import ActivityGroupCreateForm from "@/features/activity-groups/ActivityGroupCreateForm";

// 상태별 badge 스타일 (시맨틱 토큰만 사용)
const STATUS_BADGE_CLASS: Record<ActivityGroupStatus, string> = {
  recruiting: "bg-primary/10 text-primary",
  active: "bg-secondary text-secondary-foreground",
  closed: "bg-muted text-muted-foreground",
};

export default function ActivityGroupsPage() {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [catFilter, setCatFilter] = useState<ActivityGroupCategory | "all">("all");

  const { data: groups = [], isLoading } = useQuery({
    queryKey: ["activity-groups"],
    queryFn: async () => (await activityGroupsApi.list()).data,
    staleTime: 60_000,
  });

  // 내 멤버십 목록 — 카드에 "가입됨" 표시용
  const { data: myMemberships = [] } = useQuery({
    queryKey: ["activity-group-members-me", user?.id],
    queryFn: async () => (await activityGroupMembersApi.listByUser(user!.id)).data,
    enabled: !!user?.id,
    staleTime: 30_000,
  });

  const myGroupIds = useMemo(
    () => new Set(myMemberships.map((m) => m.groupId)),
    [myMemberships],
  );

  const filtered = useMemo<ActivityGroup[]>(() => {
    if (catFilter === "all") return groups;
    return groups.filter((g) => g.category === catFilter);
  }, [groups, catFilter]);

  const recruiting = filtered.filter((g) => g.status === "recruiting");
  const active = filtered.filter((g) => g.status === "active");
  const closed = filtered.filter((g) => g.status === "closed");

  function handleCreated() {
    qc.invalidateQueries({ queryKey: ["activity-groups"] });
    setCreateOpen(false);
  }

  return (
    <PageContainer width="default">
      <PageHeader
        icon={BookOpen}
        title="다회성 모임"
        description="독서모임, 와인모임처럼 지속적으로 운영되는 소모임에 참여해보세요. 로그인 회원 누구나 모임을 개설할 수 있습니다."
        actions={
          user ? (
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus size={15} className="mr-1" /> 모임 개설
            </Button>
          ) : undefined
        }
      />

      {/* 모임 개설 다이얼로그 */}
      {user && (
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent showCloseButton={false} className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>새 모임 개설</DialogTitle>
            </DialogHeader>
            <ActivityGroupCreateForm
              user={user}
              onClose={() => setCreateOpen(false)}
              onCreated={handleCreated}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* 카테고리 필터 */}
      <div className="mt-5 flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => setCatFilter("all")}
          className={cn(
            "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
            catFilter === "all"
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-background text-muted-foreground hover:border-primary/40",
          )}
        >
          전체
        </button>
        {ACTIVITY_GROUP_CATEGORIES.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setCatFilter(cat)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              catFilter === cat
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background text-muted-foreground hover:border-primary/40",
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="mt-6 space-y-3">
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-24 w-full rounded-2xl" />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title="모임이 없습니다"
          description={
            user
              ? "아직 개설된 모임이 없어요. 첫 번째 모임을 만들어보세요!"
              : "아직 개설된 모임이 없습니다. 로그인 후 모임을 개설해보세요."
          }
          actions={
            user
              ? [{ label: "모임 개설", onClick: () => setCreateOpen(true), variant: "default" as const }]
              : [{ label: "로그인", href: "/login", variant: "default" as const }]
          }
          className="mt-10"
        />
      ) : (
        <div className="mt-6 space-y-8">
          {/* 모집중 */}
          {recruiting.length > 0 && (
            <GroupSection
              title="모집중"
              groups={recruiting}
              myGroupIds={myGroupIds}
            />
          )}
          {/* 운영중 */}
          {active.length > 0 && (
            <GroupSection
              title="운영중"
              groups={active}
              myGroupIds={myGroupIds}
            />
          )}
          {/* 마감 */}
          {closed.length > 0 && (
            <GroupSection
              title="마감"
              groups={closed}
              myGroupIds={myGroupIds}
            />
          )}
        </div>
      )}
    </PageContainer>
  );
}

// ─── 섹션 ───────────────────────────────────────────────────

function GroupSection({
  title,
  groups,
  myGroupIds,
}: {
  title: string;
  groups: ActivityGroup[];
  myGroupIds: Set<string>;
}) {
  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold text-muted-foreground">{title}</h2>
      <div className="space-y-2.5">
        {groups.map((g) => (
          <GroupCard key={g.id} group={g} isMine={myGroupIds.has(g.id)} />
        ))}
      </div>
    </section>
  );
}

// ─── 카드 ───────────────────────────────────────────────────

function GroupCard({
  group,
  isMine,
}: {
  group: ActivityGroup;
  isMine: boolean;
}) {
  return (
    <Link
      href={`/gatherings/groups/${group.id}`}
      className="group relative flex items-start gap-3 rounded-2xl border bg-card px-4 py-3.5 shadow-sm transition-shadow hover:shadow-md"
    >
      {/* 이모지 아이콘 */}
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted text-xl">
        {group.coverEmoji ?? "🏷️"}
      </div>

      <div className="min-w-0 flex-1">
        {/* 상단 행: 이름 + 상태 배지 */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-foreground leading-snug">
            {group.name}
          </span>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[10px] font-medium",
              STATUS_BADGE_CLASS[group.status],
            )}
          >
            {ACTIVITY_GROUP_STATUS_LABELS[group.status]}
          </span>
          {isMine && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
              가입됨
            </span>
          )}
        </div>

        {/* 설명 */}
        <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
          {group.description}
        </p>

        {/* 메타 정보: 카테고리·그룹장·정원 */}
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
          <span className="rounded bg-muted px-1.5 py-0.5 font-medium">{group.category}</span>
          <span>그룹장 {group.leaderName}</span>
          {group.memberLimit && (
            <span className="flex items-center gap-0.5">
              <Users size={10} />
              {group.memberLimit}명 정원
            </span>
          )}
          {group.cadence && <span>{group.cadence}</span>}
        </div>
      </div>

      <ChevronRight
        size={16}
        className="mt-1 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
      />
    </Link>
  );
}
