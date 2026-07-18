"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, GraduationCap, Save, Trash2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/features/auth/auth-store";
import { profilesApi } from "@/lib/bkend";
import { Button } from "@/components/ui/button";
import PageContainer from "@/components/ui/page-container";
import { currentSemesterKey } from "@/lib/semester";
import {
  ACADEMIC_STATUS_COPY,
  compareSemesterKeyDesc,
  formatSemesterKey,
  getStatusForSemester,
  nextSemesterKey,
  prevSemesterKey,
  upsertStatusEntry,
} from "@/lib/academic-status";
import {
  ACADEMIC_SEMESTER_STATUS_LABELS,
  type AcademicSemesterStatus,
  type AcademicStatusEntry,
  type User,
} from "@/types";

const STATUS_ORDER: AcademicSemesterStatus[] = [
  "enrolled",
  "on_leave",
  "expected_graduation",
  "completed",
  "graduated",
];

const SELECT_CLASS =
  "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring";

export default function AcademicStatusView({ userId }: { userId: string }) {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const qc = useQueryClient();

  const cur = currentSemesterKey();
  const history = useMemo<AcademicStatusEntry[]>(
    () =>
      [...((user?.academicStatusHistory as AcademicStatusEntry[] | undefined) ?? [])].sort((a, b) =>
        compareSemesterKeyDesc(a.semester, b.semester),
      ),
    [user],
  );

  // 선택 가능한 학기: 다음/현재/직전 + 이력에 있는 학기
  const semesterOptions = useMemo(() => {
    const base = [nextSemesterKey(cur), cur, prevSemesterKey(cur)];
    const fromHistory = history.map((h) => h.semester);
    return Array.from(new Set([...base, ...fromHistory])).sort(compareSemesterKeyDesc);
  }, [cur, history]);

  const [semester, setSemester] = useState<string>(nextSemesterKey(cur));
  const [status, setStatus] = useState<AcademicSemesterStatus>(
    () => getStatusForSemester(history, nextSemesterKey(cur))?.status ?? "enrolled",
  );
  const [saving, setSaving] = useState(false);

  const existing = getStatusForSemester(history, semester);

  function onSelectSemester(next: string) {
    setSemester(next);
    setStatus(getStatusForSemester(history, next)?.status ?? "enrolled");
  }

  async function persist(nextHistory: AcademicStatusEntry[], successMsg: string) {
    if (!user) return;
    setSaving(true);
    try {
      await profilesApi.update(userId, { academicStatusHistory: nextHistory });
      setUser({ ...(user as User), academicStatusHistory: nextHistory });
      qc.invalidateQueries({ queryKey: ["mypage-user", userId] });
      const { toast } = await import("sonner");
      toast.success(successMsg);
    } catch (e) {
      const { toast } = await import("sonner");
      toast.error(`저장 실패: ${(e as Error).message}`);
    } finally {
      setSaving(false);
    }
  }

  async function onSubmit() {
    const entry: AcademicStatusEntry = {
      semester,
      status,
      updatedAt: new Date().toISOString(),
    };
    await persist(
      upsertStatusEntry(history, entry),
      `${formatSemesterKey(semester)} 학사 상태를 저장했습니다.`,
    );
  }

  async function onDelete(target: string) {
    await persist(
      history.filter((e) => e.semester !== target),
      `${formatSemesterKey(target)} 이력을 삭제했습니다.`,
    );
  }

  if (!user) return null;

  return (
    <PageContainer>
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <Link
            href="/mypage"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft size={15} /> 마이페이지
          </Link>
          <div className="mt-3 flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <GraduationCap size={20} />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">{ACADEMIC_STATUS_COPY.pageTitle}</h1>
              <p className="text-xs text-muted-foreground">{ACADEMIC_STATUS_COPY.pageDescription}</p>
            </div>
          </div>
        </div>

        {/* 등록·수정 폼 */}
        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-foreground">학기별 재학정보 등록·수정</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            학기를 선택하고 해당 학기의 학사 상태를 등록하세요. 학기당 1건이 유지됩니다.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">학기</span>
              <select
                className={SELECT_CLASS}
                value={semester}
                onChange={(e) => onSelectSemester(e.target.value)}
              >
                {semesterOptions.map((key) => (
                  <option key={key} value={key}>
                    {formatSemesterKey(key)}
                    {key === cur ? " (현재)" : key === nextSemesterKey(cur) ? " (다음)" : ""}
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">학사 상태</span>
              <select
                className={SELECT_CLASS}
                value={status}
                onChange={(e) => setStatus(e.target.value as AcademicSemesterStatus)}
              >
                {STATUS_ORDER.map((s) => (
                  <option key={s} value={s}>
                    {ACADEMIC_SEMESTER_STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="mt-4 flex items-center justify-end gap-2">
            <Button type="button" size="sm" onClick={onSubmit} disabled={saving}>
              <Save size={15} />
              {existing ? "수정 저장" : "등록"}
            </Button>
          </div>
        </section>

        {/* 이력 목록 */}
        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-foreground">학기별 이력</h2>
          {history.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              아직 등록된 학사 상태가 없습니다. 위에서 학기를 선택해 등록해주세요.
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-border">
              {history.map((entry) => (
                <li key={entry.semester} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      {formatSemesterKey(entry.semester)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {ACADEMIC_SEMESTER_STATUS_LABELS[entry.status]}
                      {" · "}
                      {new Date(entry.updatedAt).toLocaleDateString("ko-KR")} 갱신
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => onSelectSemester(entry.semester)}
                    >
                      수정
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => onDelete(entry.semester)}
                      disabled={saving}
                      aria-label={`${formatSemesterKey(entry.semester)} 삭제`}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 size={15} />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </PageContainer>
  );
}
