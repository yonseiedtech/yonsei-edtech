"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { awardsApi, externalActivitiesApi } from "@/lib/bkend";
import { useAuthStore } from "@/features/auth/auth-store";
import { Check, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

type Kind = "external_activities" | "awards";

interface Props {
  kind: Kind;
  itemId: string;
  ownerId: string;
}

const STAFF_ROLES = ["sysadmin", "admin", "president", "staff"] as const;

export default function PortfolioVerifyButtons({ kind, itemId, ownerId }: Props) {
  const viewer = useAuthStore((s) => s.user);
  const qc = useQueryClient();
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reason, setReason] = useState("");

  const isStaff = !!viewer && STAFF_ROLES.includes(viewer.role as (typeof STAFF_ROLES)[number]);

  const queryKey =
    kind === "external_activities"
      ? ["profile-external-activities", ownerId]
      : ["profile-awards", ownerId];

  const update = useMutation({
    mutationFn: async (patch: Record<string, unknown>) => {
      if (kind === "external_activities") {
        return externalActivitiesApi.update(itemId, patch);
      }
      return awardsApi.update(itemId, patch);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey });
    },
  });

  if (!isStaff) return null;

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
          setRejectOpen(false);
          setReason("");
        },
        onError: (e) => toast.error(`반려 실패: ${e instanceof Error ? e.message : "오류"}`),
      },
    );
  };

  return (
    <div className="ml-auto flex items-center gap-1.5">
      {update.isPending ? (
        <Loader2 size={12} className="animate-spin text-muted-foreground" />
      ) : (
        <>
          <button
            type="button"
            onClick={approve}
            className="inline-flex items-center gap-0.5 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 hover:bg-emerald-100"
          >
            <Check size={10} /> 승인
          </button>
          <button
            type="button"
            onClick={() => setRejectOpen((v) => !v)}
            className="inline-flex items-center gap-0.5 rounded-md border border-rose-200 bg-rose-50 px-2 py-0.5 text-[10px] font-medium text-rose-700 hover:bg-rose-100"
          >
            <X size={10} /> 반려
          </button>
        </>
      )}
      {rejectOpen && (
        <div className="absolute right-3 z-10 mt-8 w-64 rounded-lg border bg-card p-2 shadow-lg">
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
                setRejectOpen(false);
                setReason("");
              }}
              className="rounded px-2 py-0.5 text-[10px] text-muted-foreground hover:bg-muted"
            >
              취소
            </button>
            <button
              type="button"
              onClick={reject}
              disabled={update.isPending}
              className="rounded bg-rose-600 px-2 py-0.5 text-[10px] font-medium text-white hover:bg-rose-700 disabled:opacity-60"
            >
              반려 확정
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
