"use client";

/**
 * 다회성 모임 상세 — /gatherings/groups/[id]
 *
 * - 소개·그룹장·주기·장소·상태
 * - 멤버 목록 + 가입/탈퇴 버튼 (정원 초과 시 마감 표시)
 * - 회차 일정 목록 (다가오는 / 지난)
 * - 그룹장: 회차 추가·수정·삭제, 그룹 정보 수정
 */

import { useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Users,
  MapPin,
  Clock,
  Calendar,
  Plus,
  Pencil,
  Trash2,
  CalendarX2,
  CheckCheck,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import PageContainer from "@/components/ui/page-container";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuthStore } from "@/features/auth/auth-store";
import { isStaffOrAbove } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import {
  ACTIVITY_GROUP_CATEGORIES,
  ACTIVITY_GROUP_STATUS_LABELS,
  type ActivityGroup,
  type ActivityGroupCategory,
  type ActivityGroupSession,
  type ActivityGroupStatus,
} from "@/types";
import {
  activityGroupsApi,
  activityGroupMembersApi,
  activityGroupSessionsApi,
} from "@/features/activity-groups/api";

// ── 상태별 badge 스타일 (시맨틱 토큰) ──
const STATUS_BADGE_CLASS: Record<ActivityGroupStatus, string> = {
  recruiting: "bg-primary/10 text-primary",
  active: "bg-secondary text-secondary-foreground",
  closed: "bg-muted text-muted-foreground",
};

const COVER_EMOJI_OPTIONS = ["📚", "🍷", "🎸", "⚽", "🎨", "🏃", "🎬", "🍳", "🌿", "✏️"];

export default function ActivityGroupDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const router = useRouter();

  const [sessionFormOpen, setSessionFormOpen] = useState(false);
  const [editSessionTarget, setEditSessionTarget] = useState<ActivityGroupSession | null>(null);
  const [groupEditOpen, setGroupEditOpen] = useState(false);

  // ── 그룹 조회 ──
  const { data: group, isLoading: groupLoading } = useQuery({
    queryKey: ["activity-group", id],
    queryFn: () => activityGroupsApi.get(id),
    enabled: !!id,
    staleTime: 30_000,
  });

  // ── 멤버 목록 ──
  const { data: members = [], isLoading: membersLoading } = useQuery({
    queryKey: ["activity-group-members", id],
    queryFn: async () => (await activityGroupMembersApi.listByGroup(id)).data,
    enabled: !!id,
    staleTime: 30_000,
  });

  // ── 회차 목록 ──
  const { data: sessions = [], isLoading: sessionsLoading } = useQuery({
    queryKey: ["activity-group-sessions", id],
    queryFn: async () => (await activityGroupSessionsApi.listByGroup(id)).data,
    enabled: !!id,
    staleTime: 30_000,
  });

  const isLeader = !!(user && group && group.leaderId === user.id);
  const canManage = isLeader || isStaffOrAbove(user);
  const isMember = !!(user && members.some((m) => m.userId === user.id));
  const memberCount = members.length;
  const atLimit = !!(group?.memberLimit && memberCount >= group.memberLimit);
  const nowIso = new Date().toISOString();

  const { upcoming, past } = useMemo(() => {
    const sorted = [...sessions].sort((a, b) => a.date.localeCompare(b.date));
    return {
      upcoming: sorted.filter((s) => s.date >= nowIso.slice(0, 10)),
      past: sorted.filter((s) => s.date < nowIso.slice(0, 10)).reverse(),
    };
  }, [sessions, nowIso]);

  // ── 가입 mutation ──
  const joinMut = useMutation({
    mutationFn: () =>
      activityGroupMembersApi.join(id, user!.id, user!.name, "member"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["activity-group-members", id] });
      qc.invalidateQueries({ queryKey: ["activity-group-members-me", user?.id] });
      toast.success("모임에 가입했습니다!");
    },
    onError: () => toast.error("가입에 실패했습니다. 다시 시도해주세요."),
  });

  // ── 탈퇴 mutation ──
  const leaveMut = useMutation({
    mutationFn: () => activityGroupMembersApi.leave(id, user!.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["activity-group-members", id] });
      qc.invalidateQueries({ queryKey: ["activity-group-members-me", user?.id] });
      toast.success("모임에서 탈퇴했습니다.");
    },
    onError: () => toast.error("탈퇴에 실패했습니다. 다시 시도해주세요."),
  });

  if (groupLoading) {
    return (
      <PageContainer width="default">
        <Skeleton className="mt-6 h-48 w-full rounded-2xl" />
      </PageContainer>
    );
  }

  if (!group) {
    return (
      <PageContainer width="default">
        <div className="mt-12 text-center">
          <p className="text-muted-foreground">모임을 찾을 수 없습니다.</p>
          <Button variant="outline" className="mt-4" onClick={() => router.back()}>
            돌아가기
          </Button>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer width="default">
      {/* 뒤로 가기 */}
      <Link
        href="/gatherings/groups"
        className="mb-4 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft size={13} /> 다회성 모임 목록
      </Link>

      {/* ── 그룹 헤더 ── */}
      <div className="rounded-2xl border bg-card p-5 shadow-sm">
        <div className="flex items-start gap-4">
          {/* 이모지 */}
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-muted text-3xl">
            {group.coverEmoji ?? "🏷️"}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-bold text-foreground leading-snug">{group.name}</h1>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[10px] font-medium",
                  STATUS_BADGE_CLASS[group.status],
                )}
              >
                {ACTIVITY_GROUP_STATUS_LABELS[group.status]}
              </span>
              <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                {group.category}
              </span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{group.description}</p>
          </div>

          {/* 그룹 정보 수정 (그룹장·staff) */}
          {canManage && (
            <Button
              size="sm"
              variant="outline"
              className="shrink-0"
              onClick={() => setGroupEditOpen(true)}
            >
              <Pencil size={13} className="mr-1" /> 수정
            </Button>
          )}
        </div>

        {/* 메타 정보 */}
        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Users size={12} />
            그룹장 <span className="font-medium text-foreground">{group.leaderName}</span>
          </span>
          <span className="flex items-center gap-1">
            <Users size={12} />
            멤버{" "}
            <span className="font-medium text-foreground">
              {membersLoading ? "…" : memberCount}
            </span>
            {group.memberLimit ? `/${group.memberLimit}명` : "명"}
          </span>
          {group.cadence && (
            <span className="flex items-center gap-1">
              <Clock size={12} />
              {group.cadence}
            </span>
          )}
          {group.place && (
            <span className="flex items-center gap-1">
              <MapPin size={12} />
              {group.place}
            </span>
          )}
        </div>

        {/* 가입 / 탈퇴 버튼 */}
        {user && !isLeader && (
          <div className="mt-4">
            {isMember ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => leaveMut.mutate()}
                disabled={leaveMut.isPending}
              >
                {leaveMut.isPending ? "처리 중..." : "탈퇴하기"}
              </Button>
            ) : group.status === "closed" || atLimit ? (
              <Button size="sm" variant="secondary" disabled>
                {group.status === "closed" ? "마감된 모임" : "정원 마감"}
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={() => joinMut.mutate()}
                disabled={joinMut.isPending}
              >
                {joinMut.isPending ? "가입 중..." : "가입하기"}
              </Button>
            )}
          </div>
        )}
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-3">
        {/* ── 회차 일정 (2/3) ── */}
        <div className="space-y-6 md:col-span-2">
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-muted-foreground">다가오는 회차</h2>
              {canManage && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setEditSessionTarget(null);
                    setSessionFormOpen(true);
                  }}
                >
                  <Plus size={13} className="mr-1" /> 회차 추가
                </Button>
              )}
            </div>

            {sessionsLoading ? (
              <Skeleton className="h-24 w-full rounded-xl" />
            ) : upcoming.length === 0 ? (
              <div className="rounded-xl border bg-muted/20 px-4 py-6 text-center">
                <CalendarX2 size={22} className="mx-auto mb-2 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">예정된 회차가 없습니다.</p>
                {canManage && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-3"
                    onClick={() => {
                      setEditSessionTarget(null);
                      setSessionFormOpen(true);
                    }}
                  >
                    첫 회차 추가
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {upcoming.map((s) => (
                  <SessionCard
                    key={s.id}
                    session={s}
                    canManage={canManage}
                    onEdit={() => {
                      setEditSessionTarget(s);
                      setSessionFormOpen(true);
                    }}
                    onDelete={() => handleDeleteSession(s.id)}
                  />
                ))}
              </div>
            )}
          </section>

          {past.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-semibold text-muted-foreground">지난 회차</h2>
              <div className="space-y-2 opacity-70">
                {past.map((s) => (
                  <SessionCard
                    key={s.id}
                    session={s}
                    canManage={canManage}
                    past
                    onEdit={() => {
                      setEditSessionTarget(s);
                      setSessionFormOpen(true);
                    }}
                    onDelete={() => handleDeleteSession(s.id)}
                  />
                ))}
              </div>
            </section>
          )}
        </div>

        {/* ── 멤버 목록 (1/3) ── */}
        <div>
          <h2 className="mb-3 text-sm font-semibold text-muted-foreground">
            멤버 {membersLoading ? "" : `(${memberCount}명)`}
          </h2>
          {membersLoading ? (
            <Skeleton className="h-32 w-full rounded-xl" />
          ) : members.length === 0 ? (
            <p className="text-xs text-muted-foreground">아직 멤버가 없습니다.</p>
          ) : (
            <ul className="space-y-1.5">
              {members.map((m) => (
                <li
                  key={m.id}
                  className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm"
                >
                  <span className="font-medium text-foreground">{m.userName}</span>
                  {m.role === "leader" && (
                    <span className="ml-auto rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                      그룹장
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* ── 회차 추가·수정 다이얼로그 ── */}
      <Dialog open={sessionFormOpen} onOpenChange={setSessionFormOpen}>
        <DialogContent showCloseButton={false} className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editSessionTarget ? "회차 수정" : "회차 추가"}
            </DialogTitle>
          </DialogHeader>
          <SessionForm
            groupId={id}
            initial={editSessionTarget}
            createdBy={user?.id ?? ""}
            onClose={() => setSessionFormOpen(false)}
            onSaved={() => {
              qc.invalidateQueries({ queryKey: ["activity-group-sessions", id] });
              setSessionFormOpen(false);
              setEditSessionTarget(null);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* ── 그룹 정보 수정 다이얼로그 ── */}
      <Dialog open={groupEditOpen} onOpenChange={setGroupEditOpen}>
        <DialogContent showCloseButton={false} className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>모임 정보 수정</DialogTitle>
          </DialogHeader>
          <GroupEditForm
            group={group}
            onClose={() => setGroupEditOpen(false)}
            onSaved={() => {
              qc.invalidateQueries({ queryKey: ["activity-group", id] });
              qc.invalidateQueries({ queryKey: ["activity-groups"] });
              setGroupEditOpen(false);
            }}
          />
        </DialogContent>
      </Dialog>
    </PageContainer>
  );

  async function handleDeleteSession(sessionId: string) {
    if (!confirm("이 회차를 삭제할까요?")) return;
    try {
      await activityGroupSessionsApi.delete(sessionId);
      qc.invalidateQueries({ queryKey: ["activity-group-sessions", id] });
      toast.success("회차가 삭제되었습니다.");
    } catch {
      toast.error("회차 삭제에 실패했습니다.");
    }
  }
}

// ─── 회차 카드 ──────────────────────────────────────────────

function SessionCard({
  session,
  canManage,
  past = false,
  onEdit,
  onDelete,
}: {
  session: ActivityGroupSession;
  canManage: boolean;
  past?: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const dateLabel = session.date
    ? new Date(session.date + "T00:00:00").toLocaleDateString("ko-KR", {
        year: "numeric",
        month: "long",
        day: "numeric",
        weekday: "short",
      })
    : "";

  return (
    <div className="flex items-start gap-3 rounded-xl border bg-card px-4 py-3">
      <div className="mt-0.5 shrink-0 text-muted-foreground">
        {past ? <CheckCheck size={15} /> : <Calendar size={15} />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">{session.title}</p>
        <div className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
          {dateLabel && <span>{dateLabel}</span>}
          {session.place && (
            <span className="flex items-center gap-0.5">
              <MapPin size={10} />
              {session.place}
            </span>
          )}
        </div>
        {session.note && (
          <p className="mt-1 text-xs text-muted-foreground">{session.note}</p>
        )}
      </div>
      {canManage && (
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={onEdit}
            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="수정"
          >
            <Pencil size={13} />
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            aria-label="삭제"
          >
            <Trash2 size={13} />
          </button>
        </div>
      )}
    </div>
  );
}

// ─── 회차 추가·수정 폼 ──────────────────────────────────────

function SessionForm({
  groupId,
  initial,
  createdBy,
  onClose,
  onSaved,
}: {
  groupId: string;
  initial: ActivityGroupSession | null;
  createdBy: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [date, setDate] = useState(initial?.date ?? "");
  const [place, setPlace] = useState(initial?.place ?? "");
  const [note, setNote] = useState(initial?.note ?? "");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !date) {
      toast.error("제목과 날짜를 입력해주세요.");
      return;
    }
    setSubmitting(true);
    try {
      if (initial) {
        await activityGroupSessionsApi.update(initial.id, {
          title: title.trim(),
          date,
          place: place.trim() || undefined,
          note: note.trim() || undefined,
          groupId,
        });
        toast.success("회차가 수정되었습니다.");
      } else {
        await activityGroupSessionsApi.create({
          groupId,
          title: title.trim(),
          date,
          place: place.trim() || undefined,
          note: note.trim() || undefined,
          createdBy,
        });
        toast.success("회차가 추가되었습니다.");
      }
      onSaved();
    } catch {
      toast.error("저장에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="sess-title">회차 제목 *</Label>
        <Input
          id="sess-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="예: 3회차 — 『교육공학의 이해』 3장"
          maxLength={60}
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="sess-date">날짜 *</Label>
          <Input
            id="sess-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="sess-place">장소</Label>
          <Input
            id="sess-place"
            value={place}
            onChange={(e) => setPlace(e.target.value)}
            placeholder="예: 신촌 스터디카페"
            maxLength={40}
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="sess-note">메모</Label>
        <Textarea
          id="sess-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="준비 사항, 안내 등 (선택)"
          maxLength={200}
          rows={2}
        />
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
          취소
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? "저장 중..." : initial ? "수정 완료" : "추가"}
        </Button>
      </div>
    </form>
  );
}

// ─── 그룹 정보 수정 폼 ──────────────────────────────────────

function GroupEditForm({
  group,
  onClose,
  onSaved,
}: {
  group: ActivityGroup;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(group.name);
  const [description, setDescription] = useState(group.description);
  const [category, setCategory] = useState<ActivityGroupCategory>(group.category);
  const [coverEmoji, setCoverEmoji] = useState(group.coverEmoji ?? "📚");
  const [cadence, setCadence] = useState(group.cadence ?? "");
  const [place, setPlace] = useState(group.place ?? "");
  const [memberLimit, setMemberLimit] = useState(
    group.memberLimit ? String(group.memberLimit) : "",
  );
  const [status, setStatus] = useState<ActivityGroupStatus>(group.status);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !description.trim()) {
      toast.error("이름과 설명을 입력해주세요.");
      return;
    }
    setSubmitting(true);
    try {
      await activityGroupsApi.update(group.id, {
        name: name.trim(),
        description: description.trim(),
        category,
        coverEmoji,
        cadence: cadence.trim() || undefined,
        place: place.trim() || undefined,
        memberLimit: memberLimit ? Number(memberLimit) : undefined,
        status,
      });
      toast.success("모임 정보가 수정되었습니다.");
      onSaved();
    } catch {
      toast.error("수정에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* 이모지 선택 */}
      <div className="space-y-1.5">
        <Label>아이콘</Label>
        <div className="flex flex-wrap gap-2">
          {COVER_EMOJI_OPTIONS.map((em) => (
            <button
              key={em}
              type="button"
              onClick={() => setCoverEmoji(em)}
              className={`rounded-lg border px-2.5 py-1.5 text-xl transition-colors ${
                coverEmoji === em
                  ? "border-primary bg-primary/10"
                  : "border-border hover:border-primary/40"
              }`}
            >
              {em}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="eg-name">모임 이름</Label>
        <Input
          id="eg-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={40}
          required
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="eg-desc">설명</Label>
        <Textarea
          id="eg-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={300}
          rows={3}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="eg-category">카테고리</Label>
          <select
            id="eg-category"
            value={category}
            onChange={(e) => setCategory(e.target.value as ActivityGroupCategory)}
            className="w-full rounded-lg border bg-background px-2 py-1.5 text-sm"
          >
            {ACTIVITY_GROUP_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="eg-status">상태</Label>
          <select
            id="eg-status"
            value={status}
            onChange={(e) => setStatus(e.target.value as ActivityGroupStatus)}
            className="w-full rounded-lg border bg-background px-2 py-1.5 text-sm"
          >
            {(["recruiting", "active", "closed"] as ActivityGroupStatus[]).map((s) => (
              <option key={s} value={s}>{ACTIVITY_GROUP_STATUS_LABELS[s]}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="eg-cadence">모임 주기</Label>
          <Input
            id="eg-cadence"
            value={cadence}
            onChange={(e) => setCadence(e.target.value)}
            placeholder="예: 격주 목요일 19시"
            maxLength={40}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="eg-place">장소</Label>
          <Input
            id="eg-place"
            value={place}
            onChange={(e) => setPlace(e.target.value)}
            maxLength={40}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="eg-limit">정원 (빈칸=무제한)</Label>
        <Input
          id="eg-limit"
          type="number"
          min={2}
          max={100}
          value={memberLimit}
          onChange={(e) => setMemberLimit(e.target.value)}
        />
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
          취소
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? "저장 중..." : "저장"}
        </Button>
      </div>
    </form>
  );
}
