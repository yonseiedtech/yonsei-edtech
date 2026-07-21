"use client";

/**
 * /console/feedback — 사용자 피드백 목록 (staff+)
 *
 * - 카테고리·영역·상태 필터
 * - 상태 변경 (new → reviewed → in-progress → resolved)
 * - CSV 다운로드
 */

import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  MessageSquare,
  RefreshCw,
  Download,
  Filter,
} from "lucide-react";
import { toast } from "sonner";
import { notificationsApi, userFeedbackApi } from "@/lib/bkend";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/features/auth/auth-store";
import { isStaffOrAbove } from "@/lib/permissions";
import PageHeader from "@/components/ui/page-header";
import PageContainer from "@/components/ui/page-container";
import type { UserFeedback, FeedbackCategory, FeedbackArea } from "@/types";

// ── label maps ──────────────────────────────────────────────

const CATEGORY_LABELS: Record<FeedbackCategory, string> = {
  bug: "버그",
  ui: "UI",
  "feature-request": "기능요청",
  performance: "성능",
  other: "기타",
};

const AREA_LABELS: Record<FeedbackArea, string> = {
  dashboard: "대시보드",
  checklist: "체크리스트",
  archive: "아카이브",
  activities: "학술활동",
  seminars: "세미나",
  courses: "수강과목",
  notifications: "알림",
  settings: "설정",
  general: "전체",
};

const STATUS_META: Record<
  NonNullable<UserFeedback["status"]>,
  { label: string; color: string }
> = {
  new: { label: "신규", color: "bg-info/5 text-info" },
  reviewed: { label: "검토됨", color: "bg-cat-5/5 text-cat-5" },
  "in-progress": { label: "처리중", color: "bg-warning/5 text-warning" },
  resolved: { label: "완료", color: "bg-success/5 text-success" },
};

const CATEGORY_COLORS: Record<FeedbackCategory, string> = {
  bug: "bg-destructive/5 text-destructive",
  ui: "bg-info/5 text-info",
  "feature-request": "bg-cat-5/5 text-cat-5",
  performance: "bg-warning/5 text-warning",
  other: "bg-muted/50 text-muted-foreground",
};

const STATUS_OPTIONS = ["all", "new", "reviewed", "in-progress", "resolved"] as const;
type StatusFilter = (typeof STATUS_OPTIONS)[number];

// ── CSV helper ───────────────────────────────────────────────

function downloadCsv(rows: UserFeedback[]) {
  const header = ["id", "카테고리", "영역", "제목", "내용", "이메일", "작성자", "상태", "제출일시"];
  const lines = rows.map((r) =>
    [
      r.id,
      CATEGORY_LABELS[r.category] ?? r.category,
      AREA_LABELS[r.area] ?? r.area,
      `"${r.title.replace(/"/g, '""')}"`,
      `"${r.body.replace(/"/g, '""')}"`,
      r.email ?? "",
      r.userName ?? "(익명)",
      r.status ?? "new",
      r.createdAt,
    ].join(","),
  );
  const csv = [header.join(","), ...lines].join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `feedback_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Page ─────────────────────────────────────────────────────

export default function ConsoleFeedbackPage() {
  const { user } = useAuthStore();
  const isStaff = isStaffOrAbove(user);
  const qc = useQueryClient();

  const [categoryFilter, setCategoryFilter] = useState<FeedbackCategory | "all">("all");
  const [areaFilter, setAreaFilter] = useState<FeedbackArea | "all">("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const {
    data: feedbacks = [],
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ["console", "user-feedback"],
    enabled: isStaff,
    queryFn: async () => {
      const res = await userFeedbackApi.list();
      return (res.data as UserFeedback[]) ?? [];
    },
    staleTime: 60_000,
  });

  const { mutate: changeStatus } = useMutation({
    mutationFn: async ({
      id,
      status,
      userId,
    }: {
      id: string;
      status: NonNullable<UserFeedback["status"]>;
      /** 제출자 id — 익명(undefined)이면 알림 스킵 */
      userId?: string;
    }) => {
      await userFeedbackApi.update(id, { status });
      // 제출자 인앱 알림 — in-progress/resolved 전환 시만, 익명 제출 스킵
      if (userId && (status === "in-progress" || status === "resolved")) {
        await notificationsApi
          .create({
            userId,
            type: "admin_nudge",
            title: status === "resolved" ? "피드백이 반영되었습니다" : "피드백이 처리 중입니다",
            message:
              status === "resolved"
                ? "남겨주신 피드백이 반영되었습니다. 감사합니다."
                : "남겨주신 피드백을 처리 중입니다. 완료되면 다시 알려드립니다.",
            read: false,
            createdAt: new Date().toISOString(),
          })
          .catch(() => {
            // 알림 실패는 메인 기능을 블로킹하지 않음
          });
      }
    },
    onSuccess: () => {
      toast.success("상태가 변경되었습니다.");
      qc.invalidateQueries({ queryKey: ["console", "user-feedback"] });
    },
    onError: () => toast.error("상태 변경에 실패했습니다."),
  });

  const filtered = useMemo(() => {
    return feedbacks.filter((f) => {
      if (categoryFilter !== "all" && f.category !== categoryFilter) return false;
      if (areaFilter !== "all" && f.area !== areaFilter) return false;
      if (statusFilter !== "all" && (f.status ?? "new") !== statusFilter) return false;
      return true;
    });
  }, [feedbacks, categoryFilter, areaFilter, statusFilter]);

  if (!isStaff) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 text-center text-sm text-muted-foreground">
        운영진(staff) 이상만 접근 가능합니다.
      </div>
    );
  }

  return (
    <PageContainer width="wide">
      <PageHeader
        icon={<MessageSquare size={20} />}
        title="사용자 피드백"
        description={`총 ${feedbacks.length}건`}
        variant="console"
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isRefetching}
            >
              <RefreshCw size={14} className={cn("mr-1.5", isRefetching && "animate-spin")} />
              새로고침
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => downloadCsv(filtered)}
              disabled={filtered.length === 0}
            >
              <Download size={14} className="mr-1.5" />
              CSV
            </Button>
          </div>
        }
      />

      {/* 필터 */}
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Filter size={14} className="shrink-0 text-muted-foreground" />

        {/* 카테고리 */}
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value as FeedbackCategory | "all")}
          className="rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="all">카테고리 전체</option>
          {(Object.keys(CATEGORY_LABELS) as FeedbackCategory[]).map((k) => (
            <option key={k} value={k}>
              {CATEGORY_LABELS[k]}
            </option>
          ))}
        </select>

        {/* 영역 */}
        <select
          value={areaFilter}
          onChange={(e) => setAreaFilter(e.target.value as FeedbackArea | "all")}
          className="rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="all">영역 전체</option>
          {(Object.keys(AREA_LABELS) as FeedbackArea[]).map((k) => (
            <option key={k} value={k}>
              {AREA_LABELS[k]}
            </option>
          ))}
        </select>

        {/* 상태 */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          className="rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s === "all" ? "상태 전체" : STATUS_META[s].label}
            </option>
          ))}
        </select>

        <span className="ml-auto text-sm text-muted-foreground">
          {filtered.length}건 표시
        </span>
      </div>

      {/* 목록 */}
      {isLoading ? (
        <div className="mt-10 text-center text-sm text-muted-foreground">불러오는 중...</div>
      ) : filtered.length === 0 ? (
        <div className="mt-10 text-center text-sm text-muted-foreground">피드백이 없습니다.</div>
      ) : (
        <div className="mt-4 space-y-3">
          {filtered.map((fb) => {
            const status = fb.status ?? "new";
            const statusInfo = STATUS_META[status];
            const nextStatuses = (
              Object.keys(STATUS_META) as NonNullable<UserFeedback["status"]>[]
            ).filter((s) => s !== status);

            return (
              <div
                key={fb.id}
                className="rounded-xl border bg-card p-4 shadow-xs transition hover:shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  {/* 배지 줄 */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-xs font-medium",
                        CATEGORY_COLORS[fb.category],
                      )}
                    >
                      {CATEGORY_LABELS[fb.category] ?? fb.category}
                    </span>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                      {AREA_LABELS[fb.area] ?? fb.area}
                    </span>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-xs font-medium",
                        statusInfo.color,
                      )}
                    >
                      {statusInfo.label}
                    </span>
                  </div>

                  {/* 상태 변경 */}
                  <select
                    value={status}
                    onChange={(e) =>
                      changeStatus({
                        id: fb.id,
                        status: e.target.value as NonNullable<UserFeedback["status"]>,
                        userId: fb.userId,
                      })
                    }
                    className="rounded-md border border-input bg-background px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                    aria-label="상태 변경"
                  >
                    <option value={status}>{statusInfo.label}</option>
                    {nextStatuses.map((s) => (
                      <option key={s} value={s}>
                        → {STATUS_META[s].label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 제목 */}
                <p className="mt-2 font-semibold leading-snug">{fb.title}</p>

                {/* 본문 */}
                <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                  {fb.body}
                </p>

                {/* 메타 */}
                <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <span>{fb.userName ?? "(익명)"}</span>
                  {fb.email && (
                    <a
                      href={`mailto:${fb.email}`}
                      className="underline underline-offset-2 hover:text-foreground"
                    >
                      {fb.email}
                    </a>
                  )}
                  <span>{new Date(fb.createdAt).toLocaleString("ko-KR")}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 페이지 하단 여백 */}
      <div className="h-10" />
    </PageContainer>
  );
}
