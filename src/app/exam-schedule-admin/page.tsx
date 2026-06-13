"use client";

/**
 * 종합시험 일정 관리 (운영진 전용, 사이클 95)
 *
 * 운영진이 학기별 실제 종합시험 일정(examDate)을 입력. 입력하면 회원 대시보드의
 * ComprehensiveExamCountdown 위젯이 본인 응시 학기와 매칭해 정확한 D-day 를 표시한다.
 *
 * 콘솔(/console)이 eb.filter 로 다운 중이라 우선 독립 라우트로 제공(연구 모형 패턴).
 * 콘솔 복구 후 /console 사이드바에 통합 예정.
 */

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarClock, Plus, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import AuthGuard from "@/features/auth/AuthGuard";
import { useAuthStore } from "@/features/auth/auth-store";
import { comprehensiveExamSchedulesApi } from "@/lib/comprehensive-exam-schedules-api";
import {
  examScheduleId,
  type ComprehensiveExamSchedule,
} from "@/types/comprehensive-exam-schedule";
import { SEMESTER_TERM_LABELS, type SemesterTerm } from "@/types";
import PageContainer from "@/components/ui/page-container";
import PageHeader from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import SkeletonWidget from "@/components/ui/skeleton-widget";

const TERMS: SemesterTerm[] = ["spring", "summer", "fall", "winter"];

function ExamScheduleAdminContent() {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const nowYear = new Date().getFullYear();

  const [form, setForm] = useState({
    year: nowYear,
    term: "spring" as SemesterTerm,
    examDate: "",
    location: "",
    applicationEnd: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);

  const { data: schedules = [], isLoading } = useQuery({
    queryKey: ["comp-exam-schedules"],
    queryFn: async () =>
      (await comprehensiveExamSchedulesApi.list())
        .data as ComprehensiveExamSchedule[],
    enabled: !!user,
  });

  if (!user) return null;

  async function handleSave() {
    if (!form.examDate) {
      toast.error("시험일(examDate)을 입력해주세요.");
      return;
    }
    setSaving(true);
    try {
      const id = examScheduleId(form.year, form.term);
      await comprehensiveExamSchedulesApi.upsert(id, {
        year: Number(form.year),
        term: form.term,
        examDate: form.examDate,
        location: form.location || undefined,
        applicationEnd: form.applicationEnd || undefined,
        notes: form.notes || undefined,
        createdBy: user!.id,
      });
      toast.success(`${form.year}년 ${SEMESTER_TERM_LABELS[form.term]} 일정을 저장했습니다.`);
      setForm((p) => ({ ...p, examDate: "", location: "", applicationEnd: "", notes: "" }));
      qc.invalidateQueries({ queryKey: ["comp-exam-schedules"] });
    } catch {
      toast.error("저장에 실패했습니다. 권한(운영진) 또는 네트워크를 확인해주세요.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("이 일정을 삭제할까요?")) return;
    try {
      await comprehensiveExamSchedulesApi.delete(id);
      toast.success("삭제했습니다.");
      qc.invalidateQueries({ queryKey: ["comp-exam-schedules"] });
    } catch {
      toast.error("삭제에 실패했습니다.");
    }
  }

  const inputCls =
    "w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40";

  return (
    <PageContainer width="default">
      <PageHeader
        icon={CalendarClock}
        title="종합시험 일정 관리"
        description="학기별 실제 종합시험 시행일을 입력하세요. 입력하면 해당 학기 응시 예정 회원의 대시보드에 정확한 D-day 가 표시되고, 미입력 시에는 노출되지 않습니다. (운영진 전용 · 콘솔 복구 후 운영 콘솔에 통합 예정)"
      />

      {/* 입력 폼 */}
      <div className="mt-6 rounded-2xl border bg-card p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-bold">일정 등록 / 수정</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="text-xs font-medium text-muted-foreground">
            연도
            <input
              type="number"
              value={form.year}
              onChange={(e) => setForm((p) => ({ ...p, year: Number(e.target.value) }))}
              className={`mt-1 ${inputCls}`}
            />
          </label>
          <label className="text-xs font-medium text-muted-foreground">
            학기
            <select
              value={form.term}
              onChange={(e) => setForm((p) => ({ ...p, term: e.target.value as SemesterTerm }))}
              className={`mt-1 ${inputCls}`}
            >
              {TERMS.map((t) => (
                <option key={t} value={t}>
                  {SEMESTER_TERM_LABELS[t]}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-medium text-muted-foreground">
            시험일 *
            <input
              type="date"
              value={form.examDate}
              onChange={(e) => setForm((p) => ({ ...p, examDate: e.target.value }))}
              className={`mt-1 ${inputCls}`}
            />
          </label>
          <label className="text-xs font-medium text-muted-foreground">
            장소
            <input
              type="text"
              value={form.location}
              onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))}
              placeholder="예: 위당관 201호"
              className={`mt-1 ${inputCls}`}
            />
          </label>
          <label className="text-xs font-medium text-muted-foreground">
            신청 마감일
            <input
              type="date"
              value={form.applicationEnd}
              onChange={(e) => setForm((p) => ({ ...p, applicationEnd: e.target.value }))}
              className={`mt-1 ${inputCls}`}
            />
          </label>
          <label className="text-xs font-medium text-muted-foreground sm:col-span-2 lg:col-span-3">
            안내 / 유의사항
            <input
              type="text"
              value={form.notes}
              onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
              placeholder="예: 응시 영역 2과목 선택, 준비물 등"
              className={`mt-1 ${inputCls}`}
            />
          </label>
        </div>
        <div className="mt-3 flex justify-end">
          <Button onClick={handleSave} disabled={saving} className="gap-1.5">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            {saving ? "저장 중…" : "일정 저장"}
          </Button>
        </div>
      </div>

      {/* 등록된 일정 목록 */}
      <div className="mt-6">
        <h2 className="mb-3 text-sm font-bold">등록된 일정</h2>
        {isLoading ? (
          <SkeletonWidget rows={3} />
        ) : schedules.length === 0 ? (
          <p className="rounded-xl border border-dashed bg-muted/20 p-6 text-center text-sm text-muted-foreground">
            아직 등록된 종합시험 일정이 없습니다. 위에서 추가하세요.
          </p>
        ) : (
          <ul className="space-y-2">
            {schedules.map((s) => (
              <li
                key={s.id}
                className="flex items-center justify-between gap-3 rounded-xl border bg-card p-3 shadow-sm"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold">
                    {s.year}년 {SEMESTER_TERM_LABELS[s.term]} ·{" "}
                    <span className="text-primary">{s.examDate}</span>
                  </p>
                  <p className="mt-0.5 flex flex-wrap gap-x-3 text-[11px] text-muted-foreground">
                    {s.location && <span>장소 {s.location}</span>}
                    {s.applicationEnd && <span>신청마감 {s.applicationEnd}</span>}
                    {s.notes && <span className="truncate">{s.notes}</span>}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(s.id)}
                  className="inline-flex shrink-0 items-center gap-1 rounded-md border border-input px-2 py-1 text-[11px] font-medium text-rose-600 hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-950/40"
                >
                  <Trash2 size={12} />
                  삭제
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </PageContainer>
  );
}

export default function ExamScheduleAdminPage() {
  return (
    <AuthGuard allowedRoles={["staff", "president", "admin", "sysadmin"]}>
      <ExamScheduleAdminContent />
    </AuthGuard>
  );
}
