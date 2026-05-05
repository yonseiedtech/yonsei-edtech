"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { awardsApi, externalActivitiesApi, profilesApi } from "@/lib/bkend";
import { useAuthStore } from "@/features/auth/auth-store";
import ConsolePageHeader from "@/components/admin/ConsolePageHeader";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Award as AwardIcon, Check, X, ExternalLink, Loader2, Inbox } from "lucide-react";
import { toast } from "sonner";
import {
  EXTERNAL_ACTIVITY_TYPE_LABELS,
  type Award,
  type ExternalActivity,
  type User,
} from "@/types";

type Kind = "external_activities" | "awards";

interface VerifyActionsProps {
  kind: Kind;
  itemId: string;
}

function VerifyActions({ kind, itemId }: VerifyActionsProps) {
  const viewer = useAuthStore((s) => s.user);
  const qc = useQueryClient();
  const [reason, setReason] = useState("");
  const [open, setOpen] = useState(false);

  const update = useMutation({
    mutationFn: async (patch: Record<string, unknown>) => {
      if (kind === "external_activities") {
        return externalActivitiesApi.update(itemId, patch);
      }
      return awardsApi.update(itemId, patch);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pf-pending-externals"] });
      qc.invalidateQueries({ queryKey: ["pf-pending-awards"] });
    },
  });

  const approve = () => {
    update.mutate(
      {
        verified: true,
        verifiedBy: viewer?.id,
        verifiedAt: new Date().toISOString(),
        rejectionReason: "",
      },
      {
        onSuccess: () => toast.success("승인되었습니다."),
        onError: (e) => toast.error(`승인 실패: ${e instanceof Error ? e.message : "오류"}`),
      },
    );
  };

  const reject = () => {
    if (!reason.trim()) {
      toast.error("반려 사유를 입력해 주세요.");
      return;
    }
    update.mutate(
      {
        verified: false,
        verifiedBy: viewer?.id,
        verifiedAt: new Date().toISOString(),
        rejectionReason: reason.trim(),
      },
      {
        onSuccess: () => {
          toast.success("반려 처리되었습니다.");
          setOpen(false);
          setReason("");
        },
        onError: (e) => toast.error(`반려 실패: ${e instanceof Error ? e.message : "오류"}`),
      },
    );
  };

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex items-center gap-1.5">
        {update.isPending ? (
          <Loader2 size={14} className="animate-spin text-muted-foreground" />
        ) : (
          <>
            <button
              type="button"
              onClick={approve}
              className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100"
            >
              <Check size={12} /> 승인
            </button>
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="inline-flex items-center gap-1 rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-xs font-medium text-rose-700 hover:bg-rose-100"
            >
              <X size={12} /> 반려
            </button>
          </>
        )}
      </div>
      {open && (
        <div className="w-72 rounded-lg border bg-card p-2 shadow-md">
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="반려 사유를 입력해 주세요"
            className="w-full resize-none rounded border p-1.5 text-xs"
          />
          <div className="mt-1.5 flex justify-end gap-1.5">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setReason("");
              }}
              className="rounded px-2 py-1 text-[11px] text-muted-foreground hover:bg-muted"
            >
              취소
            </button>
            <button
              type="button"
              onClick={reject}
              disabled={update.isPending}
              className="rounded bg-rose-600 px-2 py-1 text-[11px] font-medium text-white hover:bg-rose-700 disabled:opacity-60"
            >
              반려 확정
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function useOwnerLabels(userIds: string[]) {
  return useQuery({
    queryKey: ["pf-owner-labels", userIds.sort().join(",")],
    enabled: userIds.length > 0,
    queryFn: async () => {
      const map = new Map<string, string>();
      const unique = Array.from(new Set(userIds));
      const results = await Promise.allSettled(
        unique.map((uid) => profilesApi.get(uid) as Promise<User>),
      );
      results.forEach((r, i) => {
        if (r.status === "fulfilled" && r.value) {
          const u = r.value;
          map.set(unique[i], `${u.name ?? "(이름 없음)"} (${u.email ?? unique[i]})`);
        } else {
          map.set(unique[i], unique[i]);
        }
      });
      return map;
    },
    staleTime: 60_000,
  });
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="rounded-2xl border border-dashed bg-card p-10 text-center">
      <Inbox size={28} className="mx-auto mb-2 text-muted-foreground" />
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

export default function PortfolioVerificationPage() {
  const externalsQ = useQuery({
    queryKey: ["pf-pending-externals"],
    queryFn: async () => {
      const r = await externalActivitiesApi.listPending();
      return (r.data ?? []) as ExternalActivity[];
    },
    staleTime: 30_000,
  });

  const awardsQ = useQuery({
    queryKey: ["pf-pending-awards"],
    queryFn: async () => {
      const r = await awardsApi.listPending();
      return (r.data ?? []) as Award[];
    },
    staleTime: 30_000,
  });

  const allUserIds = useMemo(
    () => [
      ...(externalsQ.data ?? []).map((x) => x.userId),
      ...(awardsQ.data ?? []).map((x) => x.userId),
    ],
    [externalsQ.data, awardsQ.data],
  );
  const ownersQ = useOwnerLabels(allUserIds);

  const externalCount = externalsQ.data?.length ?? 0;
  const awardCount = awardsQ.data?.length ?? 0;

  return (
    <section className="space-y-6">
      <ConsolePageHeader
        icon={AwardIcon}
        title="포트폴리오 검증"
        description="회원이 등록한 대외 학술활동·수상 내역을 검토하고 승인/반려합니다."
      />

      <Tabs defaultValue="externals" className="w-full">
        <TabsList>
          <TabsTrigger value="externals">
            대외 학술활동
            {externalCount > 0 && (
              <span className="ml-1.5 rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                {externalCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="awards">
            수상
            {awardCount > 0 && (
              <span className="ml-1.5 rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                {awardCount}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="externals" className="mt-4 space-y-2">
          {externalsQ.isLoading && (
            <div className="py-10 text-center text-sm text-muted-foreground">불러오는 중…</div>
          )}
          {!externalsQ.isLoading && externalCount === 0 && (
            <EmptyState label="검증 대기 중인 대외 학술활동이 없습니다." />
          )}
          {(externalsQ.data ?? []).map((x) => {
            const ownerLabel = ownersQ.data?.get(x.userId) ?? x.userId;
            return (
              <article
                key={x.id}
                className="rounded-2xl border bg-card p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                        {EXTERNAL_ACTIVITY_TYPE_LABELS[x.type]}
                      </span>
                      <h3 className="text-sm font-semibold">{x.title}</h3>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      <Link
                        href={`/profile/${x.userId}`}
                        target="_blank"
                        className="text-primary hover:underline"
                      >
                        {ownerLabel}
                      </Link>
                      {" · "}
                      {x.organization && <>{x.organization} · </>}
                      {x.date}
                      {x.endDate && ` ~ ${x.endDate}`}
                    </p>
                    {x.description && (
                      <p className="mt-2 whitespace-pre-wrap text-xs text-slate-700">
                        {x.description}
                      </p>
                    )}
                    {(x.evidenceUrls?.length ?? 0) > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {(x.evidenceUrls ?? []).map((u) => (
                          <a
                            key={u}
                            href={u}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                          >
                            <ExternalLink size={11} /> 증빙
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                  <VerifyActions kind="external_activities" itemId={x.id} />
                </div>
              </article>
            );
          })}
        </TabsContent>

        <TabsContent value="awards" className="mt-4 space-y-2">
          {awardsQ.isLoading && (
            <div className="py-10 text-center text-sm text-muted-foreground">불러오는 중…</div>
          )}
          {!awardsQ.isLoading && awardCount === 0 && (
            <EmptyState label="검증 대기 중인 수상 내역이 없습니다." />
          )}
          {(awardsQ.data ?? []).map((x) => {
            const ownerLabel = ownersQ.data?.get(x.userId) ?? x.userId;
            return (
              <article
                key={x.id}
                className="rounded-2xl border bg-card p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold">{x.title}</h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      <Link
                        href={`/profile/${x.userId}`}
                        target="_blank"
                        className="text-primary hover:underline"
                      >
                        {ownerLabel}
                      </Link>
                      {" · "}
                      {x.organization} · {x.date}
                    </p>
                    {x.description && (
                      <p className="mt-2 whitespace-pre-wrap text-xs text-slate-700">
                        {x.description}
                      </p>
                    )}
                    {(x.evidenceUrls?.length ?? 0) > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {(x.evidenceUrls ?? []).map((u) => (
                          <a
                            key={u}
                            href={u}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                          >
                            <ExternalLink size={11} /> 증빙
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                  <VerifyActions kind="awards" itemId={x.id} />
                </div>
              </article>
            );
          })}
        </TabsContent>
      </Tabs>
    </section>
  );
}
