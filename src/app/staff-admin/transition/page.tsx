"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { profilesApi } from "@/lib/bkend";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  ArrowRightLeft, AlertTriangle, Shield, Loader2,
} from "lucide-react";
import { toast } from "sonner";
import type { User } from "@/types";

const STAFF_ROLES = ["회장", "부회장", "총무", "학술부장", "홍보부장", "대외협력부장", "편집부장"];

export default function StaffTransitionPage() {
  const queryClient = useQueryClient();
  const [showTransitionDialog, setShowTransitionDialog] = useState(false);
  const [transitionPlan, setTransitionPlan] = useState<{ userId: string; newRole: string }[]>([]);

  const { data: members = [] } = useQuery({
    queryKey: ["admin", "all-members-transition"],
    queryFn: async () => {
      const res = await profilesApi.list({ "filter[approved]": "true", limit: 500 });
      return res.data as unknown as User[];
    },
  });

  const staffMembers = members.filter((m) =>
    ["staff", "president"].includes(m.role),
  );

  const transitionMutation = useMutation({
    mutationFn: async (plan: { userId: string; newRole: string }[]) => {
      const currentStaff = staffMembers.filter(
        (m) => !plan.some((p) => p.userId === m.id),
      );
      for (const s of currentStaff) {
        if (s.role === "staff" || s.role === "president") {
          await profilesApi.update(s.id, { role: "alumni" });
        }
      }
      for (const p of plan) {
        const newRole = p.newRole === "회장" ? "president" : "staff";
        await profilesApi.update(p.userId, { role: newRole });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin"] });
      queryClient.invalidateQueries({ queryKey: ["staff-members"] });
      setShowTransitionDialog(false);
      setTransitionPlan([]);
      toast.success("운영진 교체가 완료되었습니다.");
    },
  });

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
        <div className="flex items-start gap-2">
          <AlertTriangle size={16} className="mt-0.5 text-amber-600" />
          <div>
            <p className="text-sm font-medium text-amber-800">운영진 교체 안내</p>
            <p className="mt-1 text-xs text-amber-700">
              이 기능은 임기 변경 시 운영진 역할을 일괄 교체합니다.
              기존 운영진은 졸업생(alumni)으로 변경되고, 선택한 회원에게 새 역할이 부여됩니다.
              교체 전 업무수행철 작성을 완료해 주세요.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-lg border bg-white p-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold mb-3">
          <Shield size={16} className="text-primary" />
          현재 운영진
        </h3>
        {staffMembers.length === 0 ? (
          <p className="text-sm text-muted-foreground">운영진이 없습니다.</p>
        ) : (
          <div className="space-y-2">
            {staffMembers.map((m) => (
              <div key={m.id} className="flex items-center justify-between rounded-lg border px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{m.name}</span>
                  <Badge variant="secondary" className="text-xs">
                    {m.role === "president" ? "회장" : "운영진"}
                  </Badge>
                </div>
                <span className="text-xs text-muted-foreground">{m.email}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <Button onClick={() => { setTransitionPlan([]); setShowTransitionDialog(true); }} className="w-full">
        <ArrowRightLeft size={16} className="mr-2" />
        운영진 교체 시작
      </Button>

      <Dialog open={showTransitionDialog} onOpenChange={setShowTransitionDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>운영진 교체</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground mb-3">
            새 임기 운영진을 선택하세요. 기존 운영진은 졸업생으로 변경됩니다.
          </p>
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {STAFF_ROLES.map((role) => {
              const entry = transitionPlan.find((p) => p.newRole === role);
              return (
                <div key={role} className="rounded-lg border p-3">
                  <label className="mb-1 block text-sm font-medium">{role}</label>
                  <select
                    value={entry?.userId ?? ""}
                    onChange={(e) => {
                      const uid = e.target.value;
                      setTransitionPlan((prev) => {
                        const next = prev.filter((p) => p.newRole !== role);
                        if (uid) next.push({ userId: uid, newRole: role });
                        return next;
                      });
                    }}
                    className="w-full rounded-lg border px-3 py-2 text-sm"
                  >
                    <option value="">선택 안함</option>
                    {members
                      .filter((m) => m.approved)
                      .map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} ({m.email})
                        </option>
                      ))}
                  </select>
                </div>
              );
            })}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTransitionDialog(false)}>취소</Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (transitionPlan.length === 0) { toast.error("최소 1명의 운영진을 지정해 주세요."); return; }
                if (!confirm("운영진을 교체하시겠습니까? 기존 운영진은 졸업생으로 변경됩니다.")) return;
                transitionMutation.mutate(transitionPlan);
              }}
              disabled={transitionMutation.isPending}
            >
              {transitionMutation.isPending && <Loader2 size={14} className="mr-1 animate-spin" />}
              교체 실행
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
