"use client";

import { useEffect, useMemo, useState } from "react";
import { Library, Plus, Pencil, Trash2, Search, Sparkles, Loader2 } from "lucide-react";
import { importArchiveSeed } from "@/lib/archive-seed";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import ConsolePageHeader from "@/components/admin/ConsolePageHeader";
import { useAuthStore } from "@/features/auth/auth-store";
import { isAtLeast } from "@/lib/permissions";
import {
  archiveConceptsApi,
  archiveVariablesApi,
  archiveMeasurementsApi,
} from "@/lib/bkend";
import {
  ARCHIVE_ITEM_TYPE_LABELS,
  VARIABLE_TYPE_LABELS,
  type ArchiveConcept,
  type ArchiveVariable,
  type ArchiveMeasurementTool,
  type ArchiveItemType,
  type VariableType,
} from "@/types";
import { toast } from "sonner";

type AnyItem = ArchiveConcept | ArchiveVariable | ArchiveMeasurementTool;

export default function ConsoleArchivePage() {
  const { user } = useAuthStore();
  const [tab, setTab] = useState<ArchiveItemType>("concept");
  const [q, setQ] = useState("");
  const [concepts, setConcepts] = useState<ArchiveConcept[]>([]);
  const [variables, setVariables] = useState<ArchiveVariable[]>([]);
  const [measurements, setMeasurements] = useState<ArchiveMeasurementTool[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<{ type: ArchiveItemType; item?: AnyItem } | null>(null);
  const [seeding, setSeeding] = useState(false);

  const allowed = isAtLeast(user, "staff");

  const handleSeed = async () => {
    if (!user) return;
    if (
      !confirm(
        "KCI 등재 논문 기준 기본 시드(개념 8 · 변인 8 · 측정도구 7)를 불러오시겠습니까?\n동일 이름의 항목은 건너뜁니다.",
      )
    )
      return;
    setSeeding(true);
    try {
      const r = await importArchiveSeed(user.id);
      toast.success(
        `시드 적재 완료 — 개념 +${r.concepts.created}/스킵 ${r.concepts.skipped}, ` +
          `변인 +${r.variables.created}/스킵 ${r.variables.skipped}, ` +
          `측정도구 +${r.measurements.created}/스킵 ${r.measurements.skipped}`,
      );
      load();
    } catch (err) {
      console.error("[console-archive] seed import failed", err);
      toast.error(err instanceof Error ? err.message : "시드 적재 실패");
    } finally {
      setSeeding(false);
    }
  };

  const load = async () => {
    setLoading(true);
    try {
      const [c, v, m] = await Promise.all([
        archiveConceptsApi.list(),
        archiveVariablesApi.list(),
        archiveMeasurementsApi.list(),
      ]);
      setConcepts(c.data);
      setVariables(v.data);
      setMeasurements(m.data);
    } catch (err) {
      console.error("[console-archive] load failed", err);
      toast.error("로드 실패");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (allowed) load();
  }, [allowed]);

  const handleDelete = async (type: ArchiveItemType, item: AnyItem) => {
    if (!confirm(`"${item.name}"을 삭제하시겠습니까?`)) return;
    try {
      if (type === "concept") await archiveConceptsApi.delete(item.id);
      else if (type === "variable") await archiveVariablesApi.delete(item.id);
      else await archiveMeasurementsApi.delete(item.id);
      toast.success("삭제 완료");
      load();
    } catch (err) {
      console.error("[console-archive] delete failed", err);
      toast.error("삭제 실패");
    }
  };

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    const f = <T extends AnyItem>(items: T[]) =>
      !term ? items : items.filter((it) => it.name.toLowerCase().includes(term));
    return {
      concept: f(concepts),
      variable: f(variables),
      measurement: f(measurements),
    };
  }, [q, concepts, variables, measurements]);

  if (!allowed) {
    return (
      <div className="container mx-auto max-w-4xl py-12 text-center">
        <p className="text-muted-foreground">접근 권한이 없습니다 (staff 이상).</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-6xl py-8">
      <ConsolePageHeader
        icon={Library}
        title="교육공학 아카이브 관리"
        description="개념·변인·측정도구 CRUD"
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSeed}
              disabled={seeding}
              title="KCI 등재 논문 기준 대표 개념·변인·측정도구를 일괄 적재"
            >
              {seeding ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-1 h-4 w-4" />
              )}
              기본 시드 불러오기
            </Button>
            <Button onClick={() => setEditing({ type: tab })} size="sm">
              <Plus className="mr-1 h-4 w-4" />새 {ARCHIVE_ITEM_TYPE_LABELS[tab]}
            </Button>
          </div>
        }
      />

      <div className="mt-6 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="이름으로 검색"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="pl-9"
        />
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as ArchiveItemType)} className="mt-4">
        <TabsList>
          <TabsTrigger value="concept">개념 ({concepts.length})</TabsTrigger>
          <TabsTrigger value="variable">변인 ({variables.length})</TabsTrigger>
          <TabsTrigger value="measurement">측정도구 ({measurements.length})</TabsTrigger>
        </TabsList>

        {(["concept", "variable", "measurement"] as ArchiveItemType[]).map((t) => (
          <TabsContent key={t} value={t}>
            <AdminList
              type={t}
              items={filtered[t]}
              loading={loading}
              onEdit={(item) => setEditing({ type: t, item })}
              onDelete={(item) => handleDelete(t, item)}
            />
          </TabsContent>
        ))}
      </Tabs>

      {editing && (
        <EditDialog
          type={editing.type}
          item={editing.item}
          concepts={concepts}
          variables={variables}
          measurements={measurements}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      )}
    </div>
  );
}

function AdminList({
  type,
  items,
  loading,
  onEdit,
  onDelete,
}: {
  type: ArchiveItemType;
  items: AnyItem[];
  loading: boolean;
  onEdit: (item: AnyItem) => void;
  onDelete: (item: AnyItem) => void;
}) {
  if (loading) {
    return (
      <div className="mt-4 space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }
  if (items.length === 0) {
    return (
      <div className="mt-8 rounded-lg border border-dashed p-12 text-center text-sm text-muted-foreground">
        등록된 항목이 없습니다.
      </div>
    );
  }
  return (
    <div className="mt-4 space-y-2">
      {items.map((item) => {
        const meta =
          type === "concept"
            ? `변인 ${(item as ArchiveConcept).variableIds?.length ?? 0}`
            : type === "variable"
              ? `측정도구 ${(item as ArchiveVariable).measurementIds?.length ?? 0}`
              : (item as ArchiveMeasurementTool).author ?? "";
        return (
          <Card key={item.id}>
            <CardContent className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium truncate">{item.name}</span>
                  {meta && <Badge variant="outline" className="text-[10px]">{meta}</Badge>}
                </div>
                {item.description && (
                  <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">
                    {item.description}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" onClick={() => onEdit(item)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete(item)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function csv(arr?: string[]): string {
  return (arr ?? []).join(", ");
}
function fromCsv(s: string): string[] {
  return s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

function EditDialog({
  type,
  item,
  concepts,
  variables,
  measurements,
  onClose,
  onSaved,
}: {
  type: ArchiveItemType;
  item?: AnyItem;
  concepts: ArchiveConcept[];
  variables: ArchiveVariable[];
  measurements: ArchiveMeasurementTool[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(item?.name ?? "");
  const [description, setDescription] = useState(item?.description ?? "");
  const [altNames, setAltNames] = useState(csv((item as { altNames?: string[] })?.altNames));
  const [tags, setTags] = useState(csv((item as { tags?: string[] })?.tags));
  const [references, setReferences] = useState(csv((item as { references?: string[] })?.references));
  // type-specific
  const [variableIds, setVariableIds] = useState<string[]>(
    (item as ArchiveConcept | ArchiveMeasurementTool)?.variableIds ?? [],
  );
  const [conceptIds, setConceptIds] = useState<string[]>(
    (item as ArchiveVariable)?.conceptIds ?? [],
  );
  const [measurementIds, setMeasurementIds] = useState<string[]>(
    (item as ArchiveVariable)?.measurementIds ?? [],
  );
  const [varType, setVarType] = useState<VariableType | "">(
    (item as ArchiveVariable)?.type ?? "",
  );
  const [originalName, setOriginalName] = useState(
    (item as ArchiveMeasurementTool)?.originalName ?? "",
  );
  const [author, setAuthor] = useState((item as ArchiveMeasurementTool)?.author ?? "");
  const [itemCount, setItemCount] = useState<string>(
    String((item as ArchiveMeasurementTool)?.itemCount ?? ""),
  );
  const [scaleType, setScaleType] = useState((item as ArchiveMeasurementTool)?.scaleType ?? "");
  const [reliability, setReliability] = useState(
    (item as ArchiveMeasurementTool)?.reliability ?? "",
  );
  const [validity, setValidity] = useState((item as ArchiveMeasurementTool)?.validity ?? "");
  const [sampleItems, setSampleItems] = useState(
    csv((item as ArchiveMeasurementTool)?.sampleItems),
  );
  const [resourceUrl, setResourceUrl] = useState(
    (item as ArchiveMeasurementTool)?.resourceUrl ?? "",
  );

  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("이름은 필수입니다");
      return;
    }
    setSaving(true);
    try {
      const base: Record<string, unknown> = {
        name: name.trim(),
        description: description.trim() || undefined,
        altNames: fromCsv(altNames),
        tags: fromCsv(tags),
        references: fromCsv(references),
      };
      if (type === "concept") {
        Object.assign(base, { variableIds });
        if (item) await archiveConceptsApi.update(item.id, base);
        else await archiveConceptsApi.create(base);
      } else if (type === "variable") {
        Object.assign(base, {
          type: varType || undefined,
          conceptIds,
          measurementIds,
        });
        if (item) await archiveVariablesApi.update(item.id, base);
        else await archiveVariablesApi.create(base);
      } else {
        Object.assign(base, {
          originalName: originalName.trim() || undefined,
          author: author.trim() || undefined,
          itemCount: itemCount ? Number(itemCount) : undefined,
          scaleType: scaleType.trim() || undefined,
          reliability: reliability.trim() || undefined,
          validity: validity.trim() || undefined,
          sampleItems: fromCsv(sampleItems),
          resourceUrl: resourceUrl.trim() || undefined,
          variableIds,
        });
        if (item) await archiveMeasurementsApi.update(item.id, base);
        else await archiveMeasurementsApi.create(base);
      }
      toast.success("저장 완료");
      onSaved();
    } catch (err) {
      console.error("[archive-edit] save failed", err);
      toast.error("저장 실패");
    } finally {
      setSaving(false);
    }
  };

  const togglePicker = (
    list: string[],
    setList: (v: string[]) => void,
    id: string,
  ) => {
    setList(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {item ? "수정" : "새"} {ARCHIVE_ITEM_TYPE_LABELS[type]}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <Field label="이름 *">
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="설명">
            <Textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </Field>
          <Field label="별칭/영문 (쉼표 구분)">
            <Input value={altNames} onChange={(e) => setAltNames(e.target.value)} />
          </Field>
          <Field label="태그 (쉼표 구분)">
            <Input value={tags} onChange={(e) => setTags(e.target.value)} />
          </Field>

          {type === "variable" && (
            <Field label="변인 유형">
              <select
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={varType}
                onChange={(e) => setVarType(e.target.value as VariableType | "")}
              >
                <option value="">선택 안 함</option>
                {(Object.keys(VARIABLE_TYPE_LABELS) as VariableType[]).map((t) => (
                  <option key={t} value={t}>
                    {VARIABLE_TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
            </Field>
          )}

          {type === "measurement" && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Field label="원어명">
                  <Input
                    value={originalName}
                    onChange={(e) => setOriginalName(e.target.value)}
                  />
                </Field>
                <Field label="저자">
                  <Input value={author} onChange={(e) => setAuthor(e.target.value)} />
                </Field>
                <Field label="문항 수">
                  <Input
                    type="number"
                    value={itemCount}
                    onChange={(e) => setItemCount(e.target.value)}
                  />
                </Field>
                <Field label="척도 타입">
                  <Input
                    placeholder="예: 5점 Likert"
                    value={scaleType}
                    onChange={(e) => setScaleType(e.target.value)}
                  />
                </Field>
              </div>
              <Field label="신뢰도">
                <Input
                  placeholder="예: Cronbach α = .89"
                  value={reliability}
                  onChange={(e) => setReliability(e.target.value)}
                />
              </Field>
              <Field label="타당도">
                <Textarea
                  rows={2}
                  value={validity}
                  onChange={(e) => setValidity(e.target.value)}
                />
              </Field>
              <Field label="문항 예시 (쉼표 구분)">
                <Textarea
                  rows={2}
                  value={sampleItems}
                  onChange={(e) => setSampleItems(e.target.value)}
                />
              </Field>
              <Field label="외부 자료 URL">
                <Input value={resourceUrl} onChange={(e) => setResourceUrl(e.target.value)} />
              </Field>
            </>
          )}

          {/* 연결 선택 */}
          {type === "concept" && (
            <Field label="연결 변인">
              <Picker
                items={variables.map((v) => ({ id: v.id, name: v.name }))}
                selected={variableIds}
                onToggle={(id) => togglePicker(variableIds, setVariableIds, id)}
              />
            </Field>
          )}
          {type === "variable" && (
            <>
              <Field label="연결 개념 (역참조)">
                <Picker
                  items={concepts.map((c) => ({ id: c.id, name: c.name }))}
                  selected={conceptIds}
                  onToggle={(id) => togglePicker(conceptIds, setConceptIds, id)}
                />
              </Field>
              <Field label="연결 측정도구">
                <Picker
                  items={measurements.map((m) => ({ id: m.id, name: m.name }))}
                  selected={measurementIds}
                  onToggle={(id) =>
                    togglePicker(measurementIds, setMeasurementIds, id)
                  }
                />
              </Field>
            </>
          )}
          {type === "measurement" && (
            <Field label="측정 가능 변인">
              <Picker
                items={variables.map((v) => ({ id: v.id, name: v.name }))}
                selected={variableIds}
                onToggle={(id) => togglePicker(variableIds, setVariableIds, id)}
              />
            </Field>
          )}

          <Field label="참고문헌 (쉼표 구분)">
            <Textarea
              rows={2}
              value={references}
              onChange={(e) => setReferences(e.target.value)}
            />
          </Field>
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

function Picker({
  items,
  selected,
  onToggle,
}: {
  items: { id: string; name: string }[];
  selected: string[];
  onToggle: (id: string) => void;
}) {
  if (items.length === 0) {
    return <p className="text-xs text-muted-foreground">선택할 항목이 없습니다.</p>;
  }
  return (
    <div className="max-h-40 overflow-y-auto rounded-md border p-2 flex flex-wrap gap-1">
      {items.map((it) => {
        const isOn = selected.includes(it.id);
        return (
          <button
            key={it.id}
            type="button"
            onClick={() => onToggle(it.id)}
            className={`rounded-full border px-2.5 py-0.5 text-xs transition-colors ${
              isOn
                ? "bg-blue-100 border-blue-300 text-blue-800"
                : "bg-background hover:bg-muted"
            }`}
          >
            {it.name}
          </button>
        );
      })}
    </div>
  );
}
