"use client";

/**
 * /console/onboarding-checklist — 시작하기 체크리스트 운영진 편집
 *
 * 기존 NewMemberChecklistWidget 하드코딩 5항목을 Firestore onboarding_checklist 컬렉션으로
 * 분리하여 운영진이 항목 추가/삭제/순서/라벨/링크/완료조건/노출여부 를 콘솔에서 편집.
 *
 * AuthGuard: ConsoleLayout 에서 이미 staff+ 게이트 적용 — 별도 가드 불필요.
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ListChecks,
  Plus,
  Pencil,
  Trash2,
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff,
  Sparkles,
  Loader2,
} from "lucide-react";
import ConsolePageHeader from "@/components/admin/ConsolePageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { onboardingChecklistApi } from "@/lib/bkend";
import { importOnboardingChecklistSeed } from "@/lib/onboarding-checklist-seed";
import { useAuthStore } from "@/features/auth/auth-store";
import {
  CHECKLIST_COMPLETION_LABELS,
  CHECKLIST_ICONS,
  type ChecklistCompletionType,
  type ChecklistIcon,
  type OnboardingChecklistItem,
} from "@/types";
import { toast } from "sonner";

const COMPLETION_TYPES = Object.keys(
  CHECKLIST_COMPLETION_LABELS,
) as ChecklistCompletionType[];

interface FormState {
  label: string;
  href: string;
  icon: ChecklistIcon;
  completionType: ChecklistCompletionType;
  enabled: boolean;
}

function blankForm(): FormState {
  return {
    label: "",
    href: "/",
    icon: "Sparkles",
    completionType: "profile.bio",
    enabled: true,
  };
}

export default function OnboardingChecklistConsolePage() {
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const [editing, setEditing] = useState<OnboardingChecklistItem | "new" | null>(
    null,
  );
  const [seeding, setSeeding] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["onboarding_checklist", "all"],
    queryFn: () => onboardingChecklistApi.list(),
  });

  const items = data?.data ?? [];

  const updateMutation = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Record<string, unknown> }) =>
      onboardingChecklistApi.update(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["onboarding_checklist"] }),
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "수정에 실패했습니다."),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => onboardingChecklistApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["onboarding_checklist"] });
      toast.success("삭제되었습니다.");
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "삭제에 실패했습니다."),
  });

  async function handleSwap(idx: number, dir: -1 | 1) {
    const a = items[idx];
    const b = items[idx + dir];
    if (!a || !b) return;
    try {
      await Promise.all([
        onboardingChecklistApi.update(a.id, {
          order: b.order,
          updatedBy: user?.id,
        }),
        onboardingChecklistApi.update(b.id, {
          order: a.order,
          updatedBy: user?.id,
        }),
      ]);
      qc.invalidateQueries({ queryKey: ["onboarding_checklist"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "순서 변경에 실패했습니다.");
    }
  }

  async function handleSeed() {
    if (!user) return;
    if (
      !confirm(
        "기본 시드 5항목(자기소개·관심분야·학술활동·세미나·즐겨찾기)을 추가하시겠습니까?\n동일 라벨 항목은 건너뜁니다.",
      )
    )
      return;
    setSeeding(true);
    try {
      const r = await importOnboardingChecklistSeed(user.id);
      toast.success(
        `시드 적용 완료 — ${r.created}건 신규 / ${r.skipped}건 스킵 / ${r.total}건 전체`,
      );
      qc.invalidateQueries({ queryKey: ["onboarding_checklist"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "시드 적용에 실패했습니다.");
    } finally {
      setSeeding(false);
    }
  }

  return (
    <div className="space-y-6">
      <ConsolePageHeader
        icon={ListChecks}
        title="시작하기 체크리스트 관리"
        description="대시보드 'NewMemberChecklistWidget' 가 fetch 하는 항목 — 추가/삭제/순서/라벨/링크/완료조건 편집"
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSeed}
              disabled={seeding}
              title="기본 5항목 일괄 추가 (동일 라벨 skip)"
            >
              {seeding ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-1 h-4 w-4" />
              )}
              기본 시드 추가
            </Button>
            <Button size="sm" onClick={() => setEditing("new")}>
              <Plus size={14} className="mr-1" /> 새 항목
            </Button>
          </div>
        }
      />

      <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs leading-relaxed text-blue-900 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-200">
        <p>
          <strong>위젯 노출 조건:</strong> <code>enabled=true</code> 항목만 위젯에 표시되며,
          {" "}<code>order</code> asc 순으로 정렬됩니다. 항목이 0개면 위젯은 자동으로 숨겨집니다.
        </p>
        <p className="mt-1">
          <strong>완료조건(completionType):</strong> 위젯이 사용자별 데이터를 fetch 해서
          항목별 완료 여부를 평가합니다. (예: <code>attended.seminar</code> →
          seminar_attendees 1건+)
        </p>
      </div>

      {isLoading ? (
        <p className="py-8 text-center text-sm text-muted-foreground">불러오는 중...</p>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed py-16 text-center">
          <ListChecks size={32} className="mx-auto text-muted-foreground/40" />
          <p className="mt-3 text-sm text-muted-foreground">
            아직 등록된 체크리스트 항목이 없습니다.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            기본 5항목으로 빠르게 시작하거나, 직접 항목을 추가해 보세요.
          </p>
          <div className="mt-4 flex justify-center gap-2">
            <Button variant="outline" onClick={handleSeed} disabled={seeding}>
              {seeding ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-1 h-4 w-4" />
              )}
              기본 시드 추가
            </Button>
            <Button onClick={() => setEditing("new")}>
              <Plus size={14} className="mr-1" /> 첫 항목 만들기
            </Button>
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left font-medium">순서</th>
                <th className="px-3 py-2 text-left font-medium">라벨 / 링크</th>
                <th className="px-3 py-2 text-left font-medium">아이콘</th>
                <th className="px-3 py-2 text-left font-medium">완료조건</th>
                <th className="px-3 py-2 text-center font-medium">노출</th>
                <th className="px-3 py-2 text-right font-medium">액션</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {items.map((it, idx) => (
                <tr key={it.id} className="hover:bg-muted/20">
                  <td className="px-3 py-2.5 align-middle">
                    <div className="flex items-center gap-1">
                      <span className="w-6 text-center text-xs font-semibold tabular-nums">
                        {it.order}
                      </span>
                      <div className="flex flex-col gap-0.5">
                        <button
                          type="button"
                          onClick={() => handleSwap(idx, -1)}
                          disabled={idx === 0}
                          title="위로"
                          className="rounded p-0.5 text-muted-foreground hover:bg-muted disabled:opacity-30"
                        >
                          <ArrowUp size={12} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSwap(idx, 1)}
                          disabled={idx === items.length - 1}
                          title="아래로"
                          className="rounded p-0.5 text-muted-foreground hover:bg-muted disabled:opacity-30"
                        >
                          <ArrowDown size={12} />
                        </button>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="font-medium">{it.label}</div>
                    <div className="mt-0.5 truncate text-xs text-muted-foreground">
                      {it.href}
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-xs">
                    <code className="rounded bg-muted px-1.5 py-0.5">{it.icon}</code>
                  </td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground">
                    {CHECKLIST_COMPLETION_LABELS[it.completionType] ?? it.completionType}
                    <br />
                    <code className="text-[10px]">{it.completionType}</code>
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <button
                      type="button"
                      onClick={() =>
                        updateMutation.mutate({
                          id: it.id,
                          patch: { enabled: !it.enabled, updatedBy: user?.id },
                        })
                      }
                      title={it.enabled ? "비활성화" : "활성화"}
                      className="rounded-md p-1.5 hover:bg-muted"
                    >
                      {it.enabled ? (
                        <Eye size={14} />
                      ) : (
                        <EyeOff size={14} className="text-muted-foreground" />
                      )}
                    </button>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => setEditing(it)}
                        title="편집"
                        className="rounded-md p-1.5 hover:bg-muted"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`"${it.label}" 항목을 삭제할까요?`))
                            deleteMutation.mutate(it.id);
                        }}
                        title="삭제"
                        className="rounded-md p-1.5 text-red-500 hover:bg-red-50"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <EditDialog
          item={editing === "new" ? null : editing}
          existingItems={items}
          onClose={() => setEditing(null)}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ["onboarding_checklist"] });
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function EditDialog({
  item,
  existingItems,
  onClose,
  onSaved,
}: {
  item: OnboardingChecklistItem | null;
  existingItems: OnboardingChecklistItem[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { user } = useAuthStore();
  const [form, setForm] = useState<FormState>(() =>
    item
      ? {
          label: item.label,
          href: item.href,
          icon: item.icon,
          completionType: item.completionType,
          enabled: item.enabled,
        }
      : blankForm(),
  );
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!form.label.trim()) {
      toast.error("라벨을 입력해 주세요.");
      return;
    }
    if (!form.href.trim()) {
      toast.error("링크를 입력해 주세요.");
      return;
    }
    setSaving(true);
    try {
      if (item) {
        await onboardingChecklistApi.update(item.id, {
          label: form.label.trim(),
          href: form.href.trim(),
          icon: form.icon,
          completionType: form.completionType,
          enabled: form.enabled,
          updatedBy: user?.id,
        });
      } else {
        const maxOrder = existingItems.reduce(
          (m, it) => (typeof it.order === "number" && it.order > m ? it.order : m),
          -1,
        );
        await onboardingChecklistApi.create({
          order: maxOrder + 1,
          label: form.label.trim(),
          href: form.href.trim(),
          icon: form.icon,
          completionType: form.completionType,
          enabled: form.enabled,
          createdBy: user?.id,
        });
      }
      toast.success("저장되었습니다.");
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{item ? "항목 수정" : "새 항목"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <Field label="라벨 *">
            <Input
              value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
              placeholder="예: 자기소개 작성"
            />
          </Field>
          <Field label="링크 (href) *">
            <Input
              value={form.href}
              onChange={(e) => setForm({ ...form, href: e.target.value })}
              placeholder="예: /mypage/edit"
            />
          </Field>
          <Field label="아이콘">
            <select
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={form.icon}
              onChange={(e) =>
                setForm({ ...form, icon: e.target.value as ChecklistIcon })
              }
            >
              {CHECKLIST_ICONS.map((ic) => (
                <option key={ic} value={ic}>
                  {ic}
                </option>
              ))}
            </select>
          </Field>
          <Field label="완료조건 (completionType)">
            <select
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={form.completionType}
              onChange={(e) =>
                setForm({
                  ...form,
                  completionType: e.target.value as ChecklistCompletionType,
                })
              }
            >
              {COMPLETION_TYPES.map((t) => (
                <option key={t} value={t}>
                  {CHECKLIST_COMPLETION_LABELS[t]} ({t})
                </option>
              ))}
            </select>
            <p className="mt-1 text-[11px] text-muted-foreground">
              위젯이 사용자별 데이터를 평가해 완료 여부를 판정합니다.
            </p>
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.enabled}
              onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
              className="h-4 w-4 rounded border"
            />
            <span>위젯에 노출 (enabled)</span>
          </label>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            취소
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "저장중..." : "저장"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}
