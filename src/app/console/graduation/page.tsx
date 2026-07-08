"use client";

/**
 * 콘솔 — 졸업요건 설정 (2026-07-08)
 * graduation_requirements/default 단일 문서를 staff 이상이 편집.
 * 마이페이지 '졸업요건 체크표'(GraduationChecklistCard)가 이 문서를 읽는다.
 * 문서가 없으면 코드 기본값(DEFAULT_GRADUATION_REQUIREMENT)을 초기값으로 로드.
 */

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { GraduationCap, Plus, Trash2, Save, Lock } from "lucide-react";
import { toast } from "sonner";
import AuthGuard from "@/features/auth/AuthGuard";
import ConsolePageHeader from "@/components/admin/ConsolePageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/features/auth/auth-store";
import { isAtLeast } from "@/lib/permissions";
import { graduationRequirementsApi } from "@/lib/bkend";
import {
  COURSE_CATEGORY_LABELS,
  DEFAULT_GRADUATION_REQUIREMENT,
  type CourseCategory,
  type CreditRule,
  type GraduationMilestone,
  type GraduationRequirement,
} from "@/types";

const ALL_CATEGORIES: CourseCategory[] = [
  "major_required",
  "major_elective",
  "teaching_general",
  "other_major",
  "general",
  "research",
  "other",
];

function newKey(prefix: string, existing: string[]): string {
  let i = 1;
  while (existing.includes(`${prefix}_${i}`)) i += 1;
  return `${prefix}_${i}`;
}

function GraduationConsoleContent() {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const canEdit = isAtLeast(user, "staff");

  const { data: loaded, isLoading } = useQuery({
    queryKey: ["console-graduation-requirement"],
    queryFn: async (): Promise<GraduationRequirement> => {
      const doc = await graduationRequirementsApi.getDefault();
      return doc ?? { id: "default", ...DEFAULT_GRADUATION_REQUIREMENT };
    },
  });

  const [form, setForm] = useState<GraduationRequirement | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (loaded && !form) setForm(loaded);
  }, [loaded, form]);

  if (!canEdit) {
    return (
      <div className="rounded-2xl border bg-card p-8 text-center text-sm text-muted-foreground">
        운영진 이상만 접근할 수 있는 페이지입니다.
      </div>
    );
  }
  if (isLoading || !form) {
    return <Skeleton className="h-64 w-full rounded-2xl" />;
  }

  const set = <K extends keyof GraduationRequirement>(k: K, v: GraduationRequirement[K]) =>
    setForm((p) => (p ? { ...p, [k]: v } : p));

  const setRule = (idx: number, patch: Partial<CreditRule>) =>
    set("creditRules", form.creditRules.map((r, i) => (i === idx ? { ...r, ...patch } : r)));

  const setMilestone = (idx: number, patch: Partial<GraduationMilestone>) =>
    set("milestones", form.milestones.map((m, i) => (i === idx ? { ...m, ...patch } : m)));

  async function save() {
    if (!form) return;
    if (!form.programLabel.trim()) {
      toast.error("과정명은 필수입니다.");
      return;
    }
    if (form.creditRules.some((r) => !r.label.trim() || r.categories.length === 0)) {
      toast.error("학점 규칙에 이름과 카테고리를 모두 지정해주세요.");
      return;
    }
    if (form.milestones.some((m) => !m.label.trim())) {
      toast.error("관문 항목의 이름을 입력해주세요.");
      return;
    }
    setBusy(true);
    try {
      const now = new Date().toISOString();
      await graduationRequirementsApi.upsertDefault({
        programLabel: form.programLabel.trim(),
        totalMinCredits: Number(form.totalMinCredits) || 0,
        creditRules: form.creditRules,
        milestones: form.milestones,
        note: form.note?.trim() || undefined,
        updatedAt: now,
        updatedBy: user?.id,
      });
      toast.success("졸업요건이 저장되었습니다. 마이페이지 체크표에 즉시 반영됩니다.");
      await qc.invalidateQueries({ queryKey: ["console-graduation-requirement"] });
      await qc.invalidateQueries({ queryKey: ["graduation-requirement"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "저장 실패");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* 기본 정보 */}
      <section className="rounded-2xl border bg-card p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-bold">기본 정보</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">과정명</span>
            <Input value={form.programLabel} onChange={(e) => set("programLabel", e.target.value)} placeholder="예: 교육공학전공 석사" />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">총 최소 이수학점</span>
            <Input
              type="number"
              min={0}
              value={form.totalMinCredits}
              onChange={(e) => set("totalMinCredits", Number(e.target.value))}
            />
          </label>
        </div>
        <label className="mt-3 block text-sm">
          <span className="mb-1 block text-xs font-medium text-muted-foreground">하단 안내문 (선택)</span>
          <Textarea
            rows={2}
            value={form.note ?? ""}
            onChange={(e) => set("note", e.target.value)}
            placeholder="예: 정확한 요건은 소속 대학원 학사규정을 우선합니다."
          />
        </label>
      </section>

      {/* 학점 규칙 */}
      <section className="rounded-2xl border bg-card p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold">학점 규칙</h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              set("creditRules", [
                ...form.creditRules,
                { key: newKey("rule", form.creditRules.map((r) => r.key)), label: "", categories: [], minCredits: 3 },
              ])
            }
          >
            <Plus size={14} className="mr-1" /> 규칙 추가
          </Button>
        </div>
        <div className="space-y-3">
          {form.creditRules.map((rule, idx) => (
            <div key={rule.key} className="rounded-xl border p-3">
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  className="w-52"
                  value={rule.label}
                  onChange={(e) => setRule(idx, { label: e.target.value })}
                  placeholder="규칙 이름 (예: 전공필수)"
                />
                <label className="flex items-center gap-1.5 text-sm">
                  <span className="text-xs text-muted-foreground">최소</span>
                  <Input
                    type="number"
                    min={0}
                    className="w-20"
                    value={rule.minCredits}
                    onChange={(e) => setRule(idx, { minCredits: Number(e.target.value) })}
                  />
                  <span className="text-xs text-muted-foreground">학점</span>
                </label>
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-auto text-destructive hover:text-destructive"
                  onClick={() => set("creditRules", form.creditRules.filter((_, i) => i !== idx))}
                >
                  <Trash2 size={14} />
                </Button>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {ALL_CATEGORIES.map((cat) => {
                  const on = rule.categories.includes(cat);
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() =>
                        setRule(idx, {
                          categories: on ? rule.categories.filter((c) => c !== cat) : [...rule.categories, cat],
                        })
                      }
                      className={cn(
                        "rounded-full border px-2.5 py-1 text-xs transition",
                        on
                          ? "border-primary bg-primary/10 font-medium text-primary"
                          : "border-input text-muted-foreground hover:border-primary/40"
                      )}
                    >
                      {COURSE_CATEGORY_LABELS[cat]}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          {form.creditRules.length === 0 && (
            <p className="text-sm text-muted-foreground">학점 규칙이 없습니다. 총 이수학점만 검사합니다.</p>
          )}
        </div>
      </section>

      {/* 관문 요건 */}
      <section className="rounded-2xl border bg-card p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold">관문 요건</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              종합시험(자동 판정) 외 항목은 회원이 마이페이지에서 직접 체크합니다.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              set("milestones", [
                ...form.milestones,
                { key: newKey("milestone", form.milestones.map((m) => m.key)), label: "" },
              ])
            }
          >
            <Plus size={14} className="mr-1" /> 관문 추가
          </Button>
        </div>
        <div className="space-y-2">
          {form.milestones.map((m, idx) => (
            <div key={m.key} className="flex flex-wrap items-center gap-2 rounded-xl border p-3">
              {m.autoSource && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                  <Lock size={10} /> 자동 판정
                </span>
              )}
              <Input
                className="w-56"
                value={m.label}
                onChange={(e) => setMilestone(idx, { label: e.target.value })}
                placeholder="관문 이름 (예: 예심 통과)"
              />
              <Input
                className="min-w-40 flex-1"
                value={m.hint ?? ""}
                onChange={(e) => setMilestone(idx, { hint: e.target.value || undefined })}
                placeholder="설명 (선택)"
              />
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() => set("milestones", form.milestones.filter((_, i) => i !== idx))}
              >
                <Trash2 size={14} />
              </Button>
            </div>
          ))}
        </div>
      </section>

      <div className="flex justify-end">
        <Button onClick={save} disabled={busy}>
          <Save size={15} className="mr-1.5" /> {busy ? "저장 중…" : "저장"}
        </Button>
      </div>
    </div>
  );
}

export default function GraduationConsolePage() {
  return (
    <AuthGuard>
      <ConsolePageHeader
        icon={GraduationCap}
        title="졸업요건 설정"
        description="마이페이지 '졸업요건 체크표'가 참조하는 학점·관문 요건을 편집합니다."
      />
      <GraduationConsoleContent />
    </AuthGuard>
  );
}
