"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Megaphone, Users, Zap } from "lucide-react";
import { profilesApi } from "@/lib/bkend";
import { Button } from "@/components/ui/button";
import { currentSemesterKey } from "@/lib/semester";
import {
  compareSemesterKeyDesc,
  formatSemesterKey,
  getStatusForSemester,
  nextSemesterKey,
  prevSemesterKey,
  type AcademicStatusCampaign,
} from "@/lib/academic-status";
import {
  useAcademicStatusCampaign,
  useUpdateAcademicStatusCampaign,
} from "@/features/site-settings/useAcademicStatusCampaign";
import {
  ACADEMIC_SEMESTER_STATUS_LABELS,
  type AcademicSemesterStatus,
  type AcademicStatusEntry,
  type User,
} from "@/types";

const SELECT_CLASS =
  "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring";
const INPUT_CLASS = SELECT_CLASS;

/** ISO → YYYY-MM-DD (date input value) */
function toDateInput(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

export default function AcademicStatusCampaignSettingsPage() {
  const { campaign, recordId } = useAcademicStatusCampaign();
  const updateMutation = useUpdateAcademicStatusCampaign();

  const [form, setForm] = useState<AcademicStatusCampaign>(campaign);

  // 원격 로드 후 폼 동기화(최초 1회 성격 — recordId 변경 시)
  useEffect(() => {
    setForm(campaign);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recordId]);

  const cur = currentSemesterKey();
  const semesterOptions = useMemo(
    () =>
      Array.from(
        new Set([nextSemesterKey(cur), cur, prevSemesterKey(cur), form.targetSemester]),
      ).sort(compareSemesterKeyDesc),
    [cur, form.targetSemester],
  );

  function patch(next: Partial<AcademicStatusCampaign>) {
    setForm((f) => ({ ...f, ...next }));
  }

  async function save(next: AcademicStatusCampaign) {
    await updateMutation.mutateAsync({ recordId, value: next });
    const { toast } = await import("sonner");
    toast.success("캠페인 설정을 저장했습니다.");
  }

  async function onSave() {
    await save(form);
  }

  /** 운영진 "지금 요청" — 즉시 활성 + 30일 노출 */
  async function onRequestNow() {
    const now = new Date();
    const end = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const next: AcademicStatusCampaign = {
      ...form,
      active: true,
      startsAt: now.toISOString(),
      endsAt: end.toISOString(),
    };
    setForm(next);
    await save(next);
  }

  // ── 응답 현황 (staff 전체 필드 투영) ──
  const { data: members } = useQuery({
    queryKey: ["academic-status-members"],
    queryFn: () => profilesApi.list({ "filter[approved]": true, limit: 1000 }),
    staleTime: 1000 * 60,
  });

  const stats = useMemo(() => {
    const rows = (members?.data ?? []) as User[];
    const total = rows.length;
    let updated = 0;
    const byStatus: Record<AcademicSemesterStatus, number> = {
      enrolled: 0,
      on_leave: 0,
      expected_graduation: 0,
      graduated: 0,
      completed: 0,
    };
    for (const r of rows) {
      const entry = getStatusForSemester(
        r.academicStatusHistory as AcademicStatusEntry[] | undefined,
        form.targetSemester,
      );
      if (entry) {
        updated += 1;
        byStatus[entry.status] += 1;
      }
    }
    return { total, updated, byStatus };
  }, [members, form.targetSemester]);

  return (
    <div className="space-y-6">
      {/* 캠페인 설정 */}
      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <Megaphone size={18} className="text-primary" />
          <h2 className="text-sm font-semibold text-foreground">학사정보 최신화 캠페인</h2>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          활성 기간 중 로그인한 회원에게 학사 정보 최신화 팝업이 노출됩니다. 이미 대상 학기를 갱신한
          회원에게는 노출되지 않습니다.
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">대상 학기</span>
            <select
              className={SELECT_CLASS}
              value={form.targetSemester}
              onChange={(e) => patch({ targetSemester: e.target.value })}
            >
              {semesterOptions.map((key) => (
                <option key={key} value={key}>
                  {formatSemesterKey(key)}
                  {key === cur ? " (현재)" : key === nextSemesterKey(cur) ? " (다음)" : ""}
                </option>
              ))}
            </select>
          </label>

          <label className="flex items-center gap-2 pt-6">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => patch({ active: e.target.checked })}
              className="h-4 w-4 rounded border-input text-primary focus:ring-ring"
            />
            <span className="text-sm text-foreground">캠페인 활성</span>
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">노출 시작일 (선택)</span>
            <input
              type="date"
              className={INPUT_CLASS}
              value={toDateInput(form.startsAt)}
              onChange={(e) =>
                patch({
                  startsAt: e.target.value ? new Date(`${e.target.value}T00:00:00`).toISOString() : "",
                })
              }
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">노출 종료일 (선택)</span>
            <input
              type="date"
              className={INPUT_CLASS}
              value={toDateInput(form.endsAt)}
              onChange={(e) =>
                patch({
                  endsAt: e.target.value ? new Date(`${e.target.value}T23:59:59`).toISOString() : "",
                })
              }
            />
          </label>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onRequestNow}
            disabled={updateMutation.isPending}
          >
            <Zap size={15} />
            지금 요청 (즉시 30일)
          </Button>
          <Button type="button" size="sm" onClick={onSave} disabled={updateMutation.isPending}>
            저장
          </Button>
        </div>
      </section>

      {/* 응답 현황 */}
      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <Users size={18} className="text-primary" />
          <h2 className="text-sm font-semibold text-foreground">
            {formatSemesterKey(form.targetSemester)} 응답 현황
          </h2>
        </div>
        <div className="mt-4 flex items-baseline gap-2">
          <span className="text-2xl font-bold text-foreground">{stats.updated}</span>
          <span className="text-sm text-muted-foreground">/ 승인 회원 {stats.total}명 갱신</span>
          <span className="ml-2 text-xs text-muted-foreground">
            ({stats.total > 0 ? Math.round((stats.updated / stats.total) * 100) : 0}%)
          </span>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {(Object.keys(stats.byStatus) as AcademicSemesterStatus[]).map((s) => (
            <span
              key={s}
              className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground"
            >
              {ACADEMIC_SEMESTER_STATUS_LABELS[s]}
              <span className="font-semibold text-foreground">{stats.byStatus[s]}</span>
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}
