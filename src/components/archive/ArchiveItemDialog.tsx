"use client";

import { useEffect, useState } from "react";
import { Loader2, Save, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  archiveConceptsApi,
  archiveVariablesApi,
  archiveMeasurementsApi,
} from "@/lib/bkend";
import {
  ARCHIVE_ITEM_TYPE_LABELS,
  VARIABLE_TYPE_LABELS,
  type ArchiveItemType,
  type ArchiveConcept,
  type ArchiveVariable,
  type ArchiveMeasurementTool,
  type VariableType,
} from "@/types";
import { toast } from "sonner";

type AnyItem = ArchiveConcept | ArchiveVariable | ArchiveMeasurementTool;

interface DraftCommon {
  name: string;
  description: string;
  altNames: string;
  tags: string;
  references: string;
}

interface DraftVariable extends DraftCommon {
  type: VariableType | "";
}

interface DraftMeasurement extends DraftCommon {
  originalName: string;
  author: string;
  itemCount: string;
  scaleType: string;
  reliability: string;
  validity: string;
  sampleItems: string;
  resourceUrl: string;
}

const VARIABLE_TYPE_OPTIONS: { value: VariableType; label: string }[] = (
  Object.keys(VARIABLE_TYPE_LABELS) as VariableType[]
).map((v) => ({ value: v, label: VARIABLE_TYPE_LABELS[v] }));

function commonFromItem(item: AnyItem | null): DraftCommon {
  return {
    name: item?.name ?? "",
    description: item?.description ?? "",
    altNames: ((item as { altNames?: string[] })?.altNames ?? []).join(", "),
    tags: ((item as { tags?: string[] })?.tags ?? []).join(", "),
    references: ((item as { references?: string[] })?.references ?? []).join("\n"),
  };
}

function buildBasePayload(d: DraftCommon, createdBy?: string) {
  return {
    name: d.name.trim(),
    description: d.description.trim() || undefined,
    altNames: csv(d.altNames),
    tags: csv(d.tags),
    references: lines(d.references),
    ...(createdBy ? { createdBy } : {}),
  };
}

function csv(s: string): string[] | undefined {
  const arr = s
    .split(/[,\n]+/)
    .map((x) => x.trim())
    .filter(Boolean);
  return arr.length > 0 ? arr : undefined;
}

function lines(s: string): string[] | undefined {
  const arr = s
    .split(/\n+/)
    .map((x) => x.trim())
    .filter(Boolean);
  return arr.length > 0 ? arr : undefined;
}

interface Props {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  type: ArchiveItemType;
  item: AnyItem | null;
  userId?: string;
  canDelete?: boolean;
  onSaved: (saved: AnyItem) => void;
  onDeleted?: (id: string) => void;
}

export default function ArchiveItemDialog({
  open,
  onOpenChange,
  type,
  item,
  userId,
  canDelete = false,
  onSaved,
  onDeleted,
}: Props) {
  const isEdit = !!item;

  const [common, setCommon] = useState<DraftCommon>(commonFromItem(null));
  const [vDraft, setVDraft] = useState<{ type: VariableType | "" }>({ type: "" });
  const [mDraft, setMDraft] = useState<Omit<DraftMeasurement, keyof DraftCommon>>({
    originalName: "",
    author: "",
    itemCount: "",
    scaleType: "",
    reliability: "",
    validity: "",
    sampleItems: "",
    resourceUrl: "",
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setCommon(commonFromItem(item));
    if (type === "variable") {
      setVDraft({ type: (item as ArchiveVariable | null)?.type ?? "" });
    } else if (type === "measurement") {
      const m = item as ArchiveMeasurementTool | null;
      setMDraft({
        originalName: m?.originalName ?? "",
        author: m?.author ?? "",
        itemCount: m?.itemCount?.toString() ?? "",
        scaleType: m?.scaleType ?? "",
        reliability: m?.reliability ?? "",
        validity: m?.validity ?? "",
        sampleItems: (m?.sampleItems ?? []).join("\n"),
        resourceUrl: m?.resourceUrl ?? "",
      });
    }
  }, [open, item, type]);

  async function handleSave() {
    if (!common.name.trim()) {
      toast.error("이름은 필수입니다");
      return;
    }
    setSaving(true);
    try {
      const base = buildBasePayload(common, userId);
      let saved: AnyItem;
      if (type === "concept") {
        if (isEdit && item) {
          saved = await archiveConceptsApi.update(item.id, base);
        } else {
          saved = await archiveConceptsApi.create(base as Partial<ArchiveConcept>);
        }
      } else if (type === "variable") {
        const payload = {
          ...base,
          type: vDraft.type || undefined,
        };
        if (isEdit && item) {
          saved = await archiveVariablesApi.update(item.id, payload);
        } else {
          saved = await archiveVariablesApi.create(payload as Partial<ArchiveVariable>);
        }
      } else {
        const itemCountNum = mDraft.itemCount.trim()
          ? Number(mDraft.itemCount.trim())
          : undefined;
        if (mDraft.itemCount.trim() && (Number.isNaN(itemCountNum) || itemCountNum! < 0)) {
          toast.error("문항 수는 0 이상의 숫자여야 합니다");
          setSaving(false);
          return;
        }
        const payload = {
          ...base,
          originalName: mDraft.originalName.trim() || undefined,
          author: mDraft.author.trim() || undefined,
          itemCount: itemCountNum,
          scaleType: mDraft.scaleType.trim() || undefined,
          reliability: mDraft.reliability.trim() || undefined,
          validity: mDraft.validity.trim() || undefined,
          sampleItems: lines(mDraft.sampleItems),
          resourceUrl: mDraft.resourceUrl.trim() || undefined,
        };
        if (isEdit && item) {
          saved = await archiveMeasurementsApi.update(item.id, payload);
        } else {
          saved = await archiveMeasurementsApi.create(
            payload as Partial<ArchiveMeasurementTool>,
          );
        }
      }
      toast.success(isEdit ? "수정되었습니다" : "등록되었습니다");
      onSaved(saved);
      onOpenChange(false);
    } catch (err) {
      console.error("[archive-dialog] save failed", err);
      toast.error(err instanceof Error ? err.message : "저장 실패");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!item) return;
    if (!confirm(`'${item.name}'을(를) 삭제하시겠습니까?`)) return;
    setDeleting(true);
    try {
      if (type === "concept") await archiveConceptsApi.delete(item.id);
      else if (type === "variable") await archiveVariablesApi.delete(item.id);
      else await archiveMeasurementsApi.delete(item.id);
      toast.success("삭제되었습니다");
      onDeleted?.(item.id);
      onOpenChange(false);
    } catch (err) {
      console.error("[archive-dialog] delete failed", err);
      toast.error(err instanceof Error ? err.message : "삭제 실패");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "수정" : "새로 추가"} · {ARCHIVE_ITEM_TYPE_LABELS[type]}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label htmlFor="name" className="text-xs font-medium block mb-1">
              이름 *
            </label>
            <Input
              id="name"
              value={common.name}
              onChange={(e) => setCommon({ ...common, name: e.target.value })}
              placeholder={
                type === "concept"
                  ? "예: 자기효능감"
                  : type === "variable"
                    ? "예: 학업적 자기효능감"
                    : "예: 학업적 자기효능감 척도"
              }
            />
          </div>

          <div>
            <label htmlFor="description" className="text-xs font-medium block mb-1">
              설명
            </label>
            <Textarea
              id="description"
              value={common.description}
              onChange={(e) => setCommon({ ...common, description: e.target.value })}
              rows={4}
              placeholder="개념·변인·측정도구에 대한 정의 또는 설명"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="altNames" className="text-xs font-medium block mb-1">
                별칭 (쉼표로 구분)
              </label>
              <Input
                id="altNames"
                value={common.altNames}
                onChange={(e) => setCommon({ ...common, altNames: e.target.value })}
                placeholder="예: GSE, self-efficacy"
              />
            </div>
            <div>
              <label htmlFor="tags" className="text-xs font-medium block mb-1">
                태그 (쉼표로 구분)
              </label>
              <Input
                id="tags"
                value={common.tags}
                onChange={(e) => setCommon({ ...common, tags: e.target.value })}
                placeholder="예: 동기, 정의적 변인"
              />
            </div>
          </div>

          {type === "variable" && (
            <div>
              <label htmlFor="vtype" className="text-xs font-medium block mb-1">
                변인 유형
              </label>
              <select
                id="vtype"
                value={vDraft.type}
                onChange={(e) =>
                  setVDraft({ type: e.target.value as VariableType | "" })
                }
                className="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">선택 안 함</option>
                {VARIABLE_TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {type === "measurement" && (
            <>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="originalName" className="text-xs font-medium block mb-1">
                    원어 명칭
                  </label>
                  <Input
                    id="originalName"
                    value={mDraft.originalName}
                    onChange={(e) =>
                      setMDraft({ ...mDraft, originalName: e.target.value })
                    }
                    placeholder="예: General Self-Efficacy Scale"
                  />
                </div>
                <div>
                  <label htmlFor="author" className="text-xs font-medium block mb-1">
                    저자/출처
                  </label>
                  <Input
                    id="author"
                    value={mDraft.author}
                    onChange={(e) => setMDraft({ ...mDraft, author: e.target.value })}
                    placeholder="예: Schwarzer (1995)"
                  />
                </div>
                <div>
                  <label htmlFor="itemCount" className="text-xs font-medium block mb-1">
                    문항 수
                  </label>
                  <Input
                    id="itemCount"
                    type="number"
                    min={0}
                    value={mDraft.itemCount}
                    onChange={(e) =>
                      setMDraft({ ...mDraft, itemCount: e.target.value })
                    }
                    placeholder="예: 10"
                  />
                </div>
                <div>
                  <label htmlFor="scaleType" className="text-xs font-medium block mb-1">
                    척도
                  </label>
                  <Input
                    id="scaleType"
                    value={mDraft.scaleType}
                    onChange={(e) =>
                      setMDraft({ ...mDraft, scaleType: e.target.value })
                    }
                    placeholder="예: 5점 Likert"
                  />
                </div>
                <div>
                  <label htmlFor="reliability" className="text-xs font-medium block mb-1">
                    신뢰도
                  </label>
                  <Input
                    id="reliability"
                    value={mDraft.reliability}
                    onChange={(e) =>
                      setMDraft({ ...mDraft, reliability: e.target.value })
                    }
                    placeholder="예: Cronbach α = .87"
                  />
                </div>
                <div>
                  <label htmlFor="validity" className="text-xs font-medium block mb-1">
                    타당도 메모
                  </label>
                  <Input
                    id="validity"
                    value={mDraft.validity}
                    onChange={(e) =>
                      setMDraft({ ...mDraft, validity: e.target.value })
                    }
                    placeholder="예: 확인적 요인분석 통과"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="sampleItems" className="text-xs font-medium block mb-1">
                  문항 예시 (한 줄에 하나씩)
                </label>
                <Textarea
                  id="sampleItems"
                  value={mDraft.sampleItems}
                  onChange={(e) =>
                    setMDraft({ ...mDraft, sampleItems: e.target.value })
                  }
                  rows={3}
                  placeholder={`나는 어려운 일도 노력하면 해낼 수 있다.\n예상치 못한 상황에서도 침착할 수 있다.`}
                />
              </div>
              <div>
                <label htmlFor="resourceUrl" className="text-xs font-medium block mb-1">
                  외부 자료 URL (척도 개발 원 논문 등)
                </label>
                <Input
                  id="resourceUrl"
                  value={mDraft.resourceUrl}
                  onChange={(e) =>
                    setMDraft({ ...mDraft, resourceUrl: e.target.value })
                  }
                  placeholder="https://..."
                />
              </div>
            </>
          )}

          <div>
            <label htmlFor="references" className="text-xs font-medium block mb-1">
              참고문헌 (한 줄에 하나씩)
            </label>
            <Textarea
              id="references"
              value={common.references}
              onChange={(e) => setCommon({ ...common, references: e.target.value })}
              rows={3}
              placeholder={`Bandura, A. (1977). Self-efficacy. Psychological Review.`}
            />
          </div>
        </div>

        <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-between">
          <div>
            {isEdit && canDelete && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleDelete}
                disabled={deleting || saving}
                className="text-destructive hover:bg-destructive/10"
              >
                {deleting ? (
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="mr-1 h-4 w-4" />
                )}
                삭제
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving || deleting}
            >
              취소
            </Button>
            <Button type="button" onClick={handleSave} disabled={saving || deleting}>
              {saving ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-1 h-4 w-4" />
              )}
              {isEdit ? "수정" : "등록"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
