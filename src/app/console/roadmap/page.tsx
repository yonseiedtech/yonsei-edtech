"use client";

/**
 * 학기별 로드맵 운영진 콘솔 (Sprint 67-AR — CMS)
 *
 * 운영진이 로드맵 stage 를 CRUD. 정적 코드 수정 없이 즉시 반영.
 * 색상은 프리셋 6종 중 선택. matchSemester 로 본인 학기 매칭 제어.
 */

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Plus,
  Save,
  Trash2,
  Map as MapIcon,
} from "lucide-react";
import AuthGuard from "@/features/auth/AuthGuard";
import ConsolePageHeader from "@/components/admin/ConsolePageHeader";
import EmptyState from "@/components/ui/empty-state";
import { useAuthStore } from "@/features/auth/auth-store";
import { roadmapStagesApi } from "@/lib/bkend";
import { isAtLeast } from "@/lib/permissions";
import { auth as firebaseAuth } from "@/lib/firebase";
import {
  ROADMAP_COLOR_PRESETS,
  type RoadmapColorPreset,
  type RoadmapStage,
} from "@/types/steppingstone";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

interface StageDraft {
  id?: string;
  order: number;
  matchSemester: number;
  title: string;
  shortTag: string;
  items: string[];
  colorPreset: RoadmapColorPreset;
  isAlumni: boolean;
  published: boolean;
}

const COLOR_KEYS: RoadmapColorPreset[] = ["blue", "emerald", "amber", "rose", "purple", "slate"];

function newDraft(order: number): StageDraft {
  return {
    order,
    matchSemester: order,
    title: "",
    shortTag: "",
    items: [""],
    colorPreset: "blue",
    isAlumni: false,
    published: false,
  };
}

function stageToDraft(s: RoadmapStage): StageDraft {
  return {
    id: s.id,
    order: s.order,
    matchSemester: s.matchSemester,
    title: s.title,
    shortTag: s.shortTag,
    items: [...s.items],
    colorPreset: s.colorPreset,
    isAlumni: s.isAlumni,
    published: s.published,
  };
}

function AdminContent() {
  const { user } = useAuthStore();
  const canManage = useMemo(() => isAtLeast(user, "staff"), [user]);
  const [stages, setStages] = useState<RoadmapStage[]>([]);
  const [drafts, setDrafts] = useState<Record<string, StageDraft>>({});
  const [newStage, setNewStage] = useState<StageDraft | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await roadmapStagesApi.list();
      const sorted = [...(res.data ?? [])].sort((a, b) => a.order - b.order);
      setStages(sorted);
      const map: Record<string, StageDraft> = {};
      for (const s of sorted) map[s.id] = stageToDraft(s);
      setDrafts(map);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "목록 불러오기 실패");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function updateDraft(id: string, patch: Partial<StageDraft>) {
    setDrafts((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  }

  async function handleSave(stageId: string) {
    const draft = drafts[stageId];
    if (!draft) return;
    if (!draft.title.trim()) return toast.error("제목을 입력해주세요");
    if (draft.items.filter((i) => i.trim()).length === 0)
      return toast.error("항목을 최소 1개 입력해주세요");
    setBusyId(stageId);
    try {
      const now = new Date().toISOString();
      await roadmapStagesApi.update(stageId, {
        order: draft.order,
        matchSemester: draft.matchSemester,
        title: draft.title.trim(),
        shortTag: draft.shortTag.trim(),
        items: draft.items.filter((i) => i.trim()).map((i) => i.trim()),
        colorPreset: draft.colorPreset,
        isAlumni: draft.isAlumni,
        published: draft.published,
        updatedAt: now,
      });
      toast.success("저장됨");
      void load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "저장 실패");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(stageId: string) {
    if (!confirm("이 단계를 삭제합니다. 되돌릴 수 없습니다. 계속할까요?")) return;
    setBusyId(stageId);
    try {
      await roadmapStagesApi.delete(stageId);
      toast.success("삭제됨");
      void load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "삭제 실패");
    } finally {
      setBusyId(null);
    }
  }

  async function handleCreate() {
    if (!newStage) return;
    if (!newStage.title.trim()) return toast.error("제목을 입력해주세요");
    if (newStage.items.filter((i) => i.trim()).length === 0)
      return toast.error("항목을 최소 1개 입력해주세요");
    setBusyId("__new__");
    try {
      const now = new Date().toISOString();
      await roadmapStagesApi.create({
        order: newStage.order,
        matchSemester: newStage.matchSemester,
        title: newStage.title.trim(),
        shortTag: newStage.shortTag.trim(),
        items: newStage.items.filter((i) => i.trim()).map((i) => i.trim()),
        colorPreset: newStage.colorPreset,
        isAlumni: newStage.isAlumni,
        published: newStage.published,
        createdAt: now,
        updatedAt: now,
      });
      toast.success("신규 단계 등록됨");
      setNewStage(null);
      void load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "등록 실패");
    } finally {
      setBusyId(null);
    }
  }

  async function handleSeedDefaults() {
    if (!confirm("기본 6단계 (1학기차 ~ 졸업 후)를 1-click 으로 등록합니다. 이미 등록된 단계는 건너뜁니다. 계속할까요?")) return;
    setBusyId("__seed__");
    try {
      const token = await firebaseAuth.currentUser?.getIdToken();
      const res = await fetch("/api/admin/roadmap/seed", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? `HTTP ${res.status}`);
      toast.success(data.message ?? `${data.created ?? 0}개 단계 등록됨`);
      void load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "시드 등록 실패");
    } finally {
      setBusyId(null);
    }
  }

  async function handleReorder(stageId: string, direction: "up" | "down") {
    const idx = stages.findIndex((s) => s.id === stageId);
    if (idx === -1) return;
    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= stages.length) return;
    const a = stages[idx];
    const b = stages[targetIdx];
    setBusyId(stageId);
    try {
      await Promise.all([
        roadmapStagesApi.update(a.id, { order: b.order }),
        roadmapStagesApi.update(b.id, { order: a.order }),
      ]);
      void load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "순서 변경 실패");
    } finally {
      setBusyId(null);
    }
  }

  if (!canManage) {
    return (
      <div className="py-12 text-center">
        <div className="rounded-2xl border-2 border-amber-200 bg-amber-50/50 p-6 text-center dark:border-amber-900 dark:bg-amber-950/20">
          <AlertTriangle size={28} className="mx-auto mb-2 text-amber-600" />
          <h2 className="text-lg font-bold">접근 권한 없음</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            학기별 로드맵 관리는 학회 운영진(staff 이상)만 가능합니다.
          </p>
        </div>
      </div>
    );
  }

  function StageEditor({
    draft,
    onChange,
    onSave,
    onDelete,
    onMoveUp,
    onMoveDown,
    canMoveUp,
    canMoveDown,
    busy,
    isNew,
  }: {
    draft: StageDraft;
    onChange: (patch: Partial<StageDraft>) => void;
    onSave: () => void;
    onDelete?: () => void;
    onMoveUp?: () => void;
    onMoveDown?: () => void;
    canMoveUp?: boolean;
    canMoveDown?: boolean;
    busy: boolean;
    isNew?: boolean;
  }) {
    return (
      <article className="rounded-2xl border bg-card p-5 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">순서 {draft.order}</Badge>
          <Badge variant="outline">매칭 학기 {draft.matchSemester}</Badge>
          {draft.isAlumni && <Badge>졸업 후</Badge>}
          {draft.published ? (
            <Badge className="bg-emerald-100 text-emerald-700">공개</Badge>
          ) : (
            <Badge variant="outline" className="text-muted-foreground">비공개</Badge>
          )}
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <label className="text-xs font-semibold">제목</label>
            <Input
              value={draft.title}
              onChange={(e) => onChange({ title: e.target.value })}
              placeholder="예: 1학기차 — 적응과 시작"
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-xs font-semibold">짧은 태그</label>
            <Input
              value={draft.shortTag}
              onChange={(e) => onChange({ shortTag: e.target.value })}
              placeholder="예: 정착"
              className="mt-1"
            />
          </div>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <div>
            <label className="text-xs font-semibold">표시 순서</label>
            <Input
              type="number"
              min={1}
              value={draft.order}
              onChange={(e) => onChange({ order: Number(e.target.value) || 1 })}
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-xs font-semibold">매칭 학기</label>
            <Input
              type="number"
              min={1}
              value={draft.matchSemester}
              onChange={(e) => onChange({ matchSemester: Number(e.target.value) || 1 })}
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-xs font-semibold">색상</label>
            <select
              value={draft.colorPreset}
              onChange={(e) => onChange({ colorPreset: e.target.value as RoadmapColorPreset })}
              className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm"
            >
              {COLOR_KEYS.map((k) => (
                <option key={k} value={k}>
                  {ROADMAP_COLOR_PRESETS[k].label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-3">
          <label className="text-xs font-semibold">체크리스트 항목 (한 줄에 하나)</label>
          <Textarea
            value={draft.items.join("\n")}
            onChange={(e) => onChange({ items: e.target.value.split("\n") })}
            placeholder="신입생 OT 참여 + 학회 가입 신청"
            className="mt-1 min-h-[120px]"
          />
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <label className="inline-flex items-center gap-1.5 text-sm">
            <input
              type="checkbox"
              checked={draft.isAlumni}
              onChange={(e) => onChange({ isAlumni: e.target.checked })}
            />
            졸업 후 단계 (alumni 사용자 매칭)
          </label>
          <label className="inline-flex items-center gap-1.5 text-sm">
            <input
              type="checkbox"
              checked={draft.published}
              onChange={(e) => onChange({ published: e.target.checked })}
            />
            공개 (회원에게 노출)
          </label>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {onMoveUp && (
            <Button size="sm" variant="outline" onClick={onMoveUp} disabled={!canMoveUp || busy}>
              <ArrowUp size={12} />
            </Button>
          )}
          {onMoveDown && (
            <Button size="sm" variant="outline" onClick={onMoveDown} disabled={!canMoveDown || busy}>
              <ArrowDown size={12} />
            </Button>
          )}
          <Button size="sm" onClick={onSave} disabled={busy} className="gap-1 ml-auto">
            {busy ? <Loader2 size={12} className="animate-spin" /> : isNew ? <Plus size={12} /> : <Save size={12} />}
            {isNew ? "등록" : "저장"}
          </Button>
          {onDelete && (
            <Button
              size="sm"
              variant="outline"
              onClick={onDelete}
              disabled={busy}
              className="text-destructive"
            >
              <Trash2 size={12} />
            </Button>
          )}
        </div>
      </article>
    );
  }

  return (
    <div className="space-y-6">
      <ConsolePageHeader
        icon={MapIcon}
        title="학기별 로드맵 관리"
        description="디딤판 메인의 학기별 로드맵 카드를 코드 수정 없이 즉시 편집할 수 있습니다."
        actions={
          !newStage ? (
            <Button onClick={() => setNewStage(newDraft((stages[stages.length - 1]?.order ?? 0) + 1))} className="gap-1">
              <Plus size={14} />
              새 단계 추가
            </Button>
          ) : undefined
        }
      />

      {newStage && (
        <section className="mb-6">
          <div className="mb-2 flex items-center gap-2 text-sm font-bold text-primary">
            <Plus size={14} />
            신규 단계
          </div>
          <StageEditor
            draft={newStage}
            onChange={(patch) => setNewStage({ ...newStage, ...patch })}
            onSave={handleCreate}
            onDelete={() => setNewStage(null)}
            busy={busyId === "__new__"}
            isNew
          />
        </section>
      )}

      {loading ? (
        <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
          <Loader2 size={16} className="mr-2 animate-spin" />
          불러오는 중…
        </div>
      ) : stages.length === 0 ? (
        <div className="space-y-3">
          <EmptyState
            icon={Eye}
            title="아직 Firestore에 단계가 없습니다"
            description="현재 정적 fallback 6단계가 회원에게 노출 중입니다. 한 번 클릭으로 기본 6단계를 모두 등록할 수 있습니다."
            actions={[
              {
                label: busyId === "__seed__" ? "등록 중…" : "기본 6단계 1-click 등록",
                onClick: handleSeedDefaults,
                variant: "default",
              },
              {
                label: "직접 새 단계 추가",
                onClick: () => setNewStage(newDraft(1)),
                variant: "outline",
              },
            ]}
          />
        </div>
      ) : (
        <div className="space-y-4">
          {stages.map((s, i) => (
            <StageEditor
              key={s.id}
              draft={drafts[s.id] ?? stageToDraft(s)}
              onChange={(patch) => updateDraft(s.id, patch)}
              onSave={() => handleSave(s.id)}
              onDelete={() => handleDelete(s.id)}
              onMoveUp={() => handleReorder(s.id, "up")}
              onMoveDown={() => handleReorder(s.id, "down")}
              canMoveUp={i > 0}
              canMoveDown={i < stages.length - 1}
              busy={busyId === s.id}
            />
          ))}
        </div>
      )}

      <div className="mt-10 rounded-2xl border border-dashed border-muted-foreground/30 bg-muted/30 p-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <EyeOff size={12} />
          <strong>매칭 규칙</strong>
        </div>
        <p className="mt-1">
          본인 학기 카드 강조: (a) 정확 일치 (matchSemester == 누적 학기차) 우선, (b) 사용자 학기 이하 stage 중 가장 큰 것,
          (c) alumni 사용자는 isAlumni=true stage 매칭. Firestore 가 비어있으면 코드 fallback 의 6단계가 노출됩니다.
        </p>
        <CheckCircle2 className="mt-2 inline" size={10} /> 한 번 등록하면 Firestore 가 우선합니다.
      </div>
    </div>
  );
}

export default function RoadmapAdminPage() {
  return (
    <AuthGuard>
      <AdminContent />
    </AuthGuard>
  );
}
