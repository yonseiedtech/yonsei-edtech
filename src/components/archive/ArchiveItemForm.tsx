"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save, Trash2, ArrowLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import ThesisLinker from "@/components/archive/ThesisLinker";
import {
  archiveConceptsApi,
  archiveVariablesApi,
  archiveMeasurementsApi,
  alumniThesesApi,
} from "@/lib/bkend";
import {
  ARCHIVE_ITEM_TYPE_LABELS,
  VARIABLE_TYPE_LABELS,
  type ArchiveItemType,
  type ArchiveConcept,
  type ArchiveVariable,
  type ArchiveMeasurementTool,
  type AlumniThesis,
  type VariableType,
} from "@/types";
import { toast } from "sonner";
import Link from "next/link";

type AnyItem = ArchiveConcept | ArchiveVariable | ArchiveMeasurementTool;

interface Props {
  type: ArchiveItemType;
  initial: AnyItem | null;
  /** 양방향 동기화를 위해 처음 로드한 졸업생 논문 매핑 */
  initialThesisIds: string[];
  userId?: string;
  canDelete?: boolean;
}

const VARIABLE_TYPE_OPTIONS: { value: VariableType; label: string }[] = (
  Object.keys(VARIABLE_TYPE_LABELS) as VariableType[]
).map((v) => ({ value: v, label: VARIABLE_TYPE_LABELS[v] }));

function csvParse(s: string): string[] | undefined {
  const arr = s
    .split(/[,\n]+/)
    .map((x) => x.trim())
    .filter(Boolean);
  return arr.length > 0 ? arr : undefined;
}

function lineParse(s: string): string[] | undefined {
  const arr = s
    .split(/\n+/)
    .map((x) => x.trim())
    .filter(Boolean);
  return arr.length > 0 ? arr : undefined;
}

export default function ArchiveItemForm({
  type,
  initial,
  initialThesisIds,
  userId,
  canDelete = false,
}: Props) {
  const router = useRouter();
  const isEdit = !!initial;

  // 공통
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [altNames, setAltNames] = useState(
    ((initial as { altNames?: string[] } | null)?.altNames ?? []).join(", "),
  );
  const [tags, setTags] = useState(
    ((initial as { tags?: string[] } | null)?.tags ?? []).join(", "),
  );
  const [references, setReferences] = useState(
    ((initial as { references?: string[] } | null)?.references ?? []).join("\n"),
  );

  // 변인 전용
  const [variableType, setVariableType] = useState<VariableType | "">(
    (initial as ArchiveVariable | null)?.type ?? "",
  );

  // 측정도구 전용
  const m0 = initial as ArchiveMeasurementTool | null;
  const [originalName, setOriginalName] = useState(m0?.originalName ?? "");
  const [author, setAuthor] = useState(m0?.author ?? "");
  const [itemCount, setItemCount] = useState<string>(m0?.itemCount?.toString() ?? "");
  const [scaleType, setScaleType] = useState(m0?.scaleType ?? "");
  const [reliability, setReliability] = useState(m0?.reliability ?? "");
  const [validity, setValidity] = useState(m0?.validity ?? "");
  const [sampleItems, setSampleItems] = useState((m0?.sampleItems ?? []).join("\n"));
  const [resourceUrl, setResourceUrl] = useState(m0?.resourceUrl ?? "");

  // 학위논문 연결
  const [thesisIds, setThesisIds] = useState<string[]>(initialThesisIds);

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  /** 학위논문의 conceptIds/variableIds/measurementIds 양방향 동기화 */
  async function syncTheses(archiveItemId: string) {
    const fieldKey: keyof AlumniThesis =
      type === "concept"
        ? "conceptIds"
        : type === "variable"
          ? "variableIds"
          : "measurementIds";
    const beforeSet = new Set(initialThesisIds);
    const afterSet = new Set(thesisIds);
    const toAdd = thesisIds.filter((id) => !beforeSet.has(id));
    const toRemove = initialThesisIds.filter((id) => !afterSet.has(id));
    if (toAdd.length === 0 && toRemove.length === 0) return;

    const updates: Promise<unknown>[] = [];
    for (const thesisId of toAdd) {
      updates.push(
        (async () => {
          try {
            const t = await alumniThesesApi.get(thesisId);
            const arr = ((t[fieldKey] as string[] | undefined) ?? []).slice();
            if (!arr.includes(archiveItemId)) arr.push(archiveItemId);
            await alumniThesesApi.update(thesisId, { [fieldKey]: arr });
          } catch (err) {
            console.error(`[ArchiveItemForm] sync add ${thesisId} failed`, err);
          }
        })(),
      );
    }
    for (const thesisId of toRemove) {
      updates.push(
        (async () => {
          try {
            const t = await alumniThesesApi.get(thesisId);
            const arr = ((t[fieldKey] as string[] | undefined) ?? []).filter(
              (x) => x !== archiveItemId,
            );
            await alumniThesesApi.update(thesisId, { [fieldKey]: arr });
          } catch (err) {
            console.error(`[ArchiveItemForm] sync remove ${thesisId} failed`, err);
          }
        })(),
      );
    }
    await Promise.all(updates);
  }

  async function handleSave() {
    if (!name.trim()) {
      toast.error("이름은 필수입니다");
      return;
    }
    setSaving(true);
    try {
      const base = {
        name: name.trim(),
        description: description.trim() || undefined,
        altNames: csvParse(altNames),
        tags: csvParse(tags),
        references: lineParse(references),
        ...(userId && !isEdit ? { createdBy: userId } : {}),
      };

      let saved: AnyItem;
      if (type === "concept") {
        if (isEdit && initial) {
          saved = await archiveConceptsApi.update(initial.id, base);
        } else {
          saved = await archiveConceptsApi.create(base as Partial<ArchiveConcept>);
        }
      } else if (type === "variable") {
        const payload = { ...base, type: variableType || undefined };
        if (isEdit && initial) {
          saved = await archiveVariablesApi.update(initial.id, payload);
        } else {
          saved = await archiveVariablesApi.create(payload as Partial<ArchiveVariable>);
        }
      } else {
        const itemCountNum = itemCount.trim() ? Number(itemCount.trim()) : undefined;
        if (itemCount.trim() && (Number.isNaN(itemCountNum) || itemCountNum! < 0)) {
          toast.error("문항 수는 0 이상의 숫자여야 합니다");
          setSaving(false);
          return;
        }
        const payload = {
          ...base,
          originalName: originalName.trim() || undefined,
          author: author.trim() || undefined,
          itemCount: itemCountNum,
          scaleType: scaleType.trim() || undefined,
          reliability: reliability.trim() || undefined,
          validity: validity.trim() || undefined,
          sampleItems: lineParse(sampleItems),
          resourceUrl: resourceUrl.trim() || undefined,
        };
        if (isEdit && initial) {
          saved = await archiveMeasurementsApi.update(initial.id, payload);
        } else {
          saved = await archiveMeasurementsApi.create(
            payload as Partial<ArchiveMeasurementTool>,
          );
        }
      }

      // 학위논문 양방향 동기화
      await syncTheses(saved.id);

      toast.success(isEdit ? "수정되었습니다" : "등록되었습니다");
      router.push(`/archive/${type}/${saved.id}`);
    } catch (err) {
      console.error("[ArchiveItemForm] save failed", err);
      toast.error(err instanceof Error ? err.message : "저장 실패");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!initial) return;
    if (!confirm(`'${initial.name}'을(를) 삭제하시겠습니까?`)) return;
    setDeleting(true);
    try {
      // 양방향 정리: 매핑된 학위논문에서 이 archive item id 제거
      if (initialThesisIds.length > 0) {
        const fieldKey: keyof AlumniThesis =
          type === "concept"
            ? "conceptIds"
            : type === "variable"
              ? "variableIds"
              : "measurementIds";
        await Promise.all(
          initialThesisIds.map(async (thesisId) => {
            try {
              const t = await alumniThesesApi.get(thesisId);
              const arr = ((t[fieldKey] as string[] | undefined) ?? []).filter(
                (x) => x !== initial.id,
              );
              await alumniThesesApi.update(thesisId, { [fieldKey]: arr });
            } catch (err) {
              console.error(`[ArchiveItemForm] cleanup ${thesisId} failed`, err);
            }
          }),
        );
      }

      if (type === "concept") await archiveConceptsApi.delete(initial.id);
      else if (type === "variable") await archiveVariablesApi.delete(initial.id);
      else await archiveMeasurementsApi.delete(initial.id);
      toast.success("삭제되었습니다");
      router.push(`/archive/${type}`);
    } catch (err) {
      console.error("[ArchiveItemForm] delete failed", err);
      toast.error(err instanceof Error ? err.message : "삭제 실패");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-4">
      <Link href={isEdit && initial ? `/archive/${type}/${initial.id}` : `/archive/${type}`}>
        <Button variant="ghost" size="sm">
          <ArrowLeft className="mr-1 h-4 w-4" />
          돌아가기
        </Button>
      </Link>

      <Card>
        <CardContent className="space-y-5 py-6">
          <h2 className="text-xl font-semibold">
            {isEdit ? "수정" : "새로 추가"} · {ARCHIVE_ITEM_TYPE_LABELS[type]}
          </h2>

          <div>
            <label htmlFor="name" className="text-xs font-medium block mb-1">
              이름 *
            </label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
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
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={6}
              placeholder="개념·변인·측정도구에 대한 정의 또는 설명. KCI 등재 논문 인용 권장."
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="altNames" className="text-xs font-medium block mb-1">
                별칭 (쉼표로 구분)
              </label>
              <Input
                id="altNames"
                value={altNames}
                onChange={(e) => setAltNames(e.target.value)}
                placeholder="예: GSE, self-efficacy"
              />
            </div>
            <div>
              <label htmlFor="tags" className="text-xs font-medium block mb-1">
                태그 (쉼표로 구분)
              </label>
              <Input
                id="tags"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
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
                value={variableType}
                onChange={(e) => setVariableType(e.target.value as VariableType | "")}
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
                    value={originalName}
                    onChange={(e) => setOriginalName(e.target.value)}
                    placeholder="예: Academic Self-Efficacy Scale"
                  />
                </div>
                <div>
                  <label htmlFor="author" className="text-xs font-medium block mb-1">
                    저자/출처
                  </label>
                  <Input
                    id="author"
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                    placeholder="예: 김아영 (2007)"
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
                    value={itemCount}
                    onChange={(e) => setItemCount(e.target.value)}
                    placeholder="예: 28"
                  />
                </div>
                <div>
                  <label htmlFor="scaleType" className="text-xs font-medium block mb-1">
                    척도
                  </label>
                  <Input
                    id="scaleType"
                    value={scaleType}
                    onChange={(e) => setScaleType(e.target.value)}
                    placeholder="예: 5점 Likert"
                  />
                </div>
                <div>
                  <label htmlFor="reliability" className="text-xs font-medium block mb-1">
                    신뢰도
                  </label>
                  <Input
                    id="reliability"
                    value={reliability}
                    onChange={(e) => setReliability(e.target.value)}
                    placeholder="예: Cronbach α = .87"
                  />
                </div>
                <div>
                  <label htmlFor="validity" className="text-xs font-medium block mb-1">
                    타당도 메모
                  </label>
                  <Input
                    id="validity"
                    value={validity}
                    onChange={(e) => setValidity(e.target.value)}
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
                  value={sampleItems}
                  onChange={(e) => setSampleItems(e.target.value)}
                  rows={3}
                  placeholder={"나는 어려운 과제도 노력하면 해낼 수 있다.\n새로운 학습 내용도 잘 이해할 수 있다."}
                />
              </div>
              <div>
                <label htmlFor="resourceUrl" className="text-xs font-medium block mb-1">
                  외부 자료 URL (척도 개발 원 논문 등)
                </label>
                <Input
                  id="resourceUrl"
                  value={resourceUrl}
                  onChange={(e) => setResourceUrl(e.target.value)}
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
              value={references}
              onChange={(e) => setReferences(e.target.value)}
              rows={4}
              placeholder={
                "Bandura, A. (1997). Self-efficacy. W.H. Freeman.\n김아영 (2007). 학업적 자기효능감 척도 개발 및 타당화. 교육심리연구, 21(4), 1145-1167."
              }
            />
          </div>

          <div className="border-t pt-5">
            <h3 className="mb-2 text-sm font-semibold">졸업생 학위논문 연결</h3>
            <p className="mb-3 text-xs text-muted-foreground">
              이 {ARCHIVE_ITEM_TYPE_LABELS[type]}을(를) 활용한 선배 졸업생의 학위논문을 선택하면,
              해당 논문 상세 페이지에도 자동으로 본 항목이 연결됩니다 (양방향).
            </p>
            <ThesisLinker selectedIds={thesisIds} onChange={setThesisIds} />
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
        <div>
          {isEdit && canDelete && (
            <Button
              type="button"
              variant="outline"
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
          <Link
            href={isEdit && initial ? `/archive/${type}/${initial.id}` : `/archive/${type}`}
          >
            <Button type="button" variant="outline" disabled={saving || deleting}>
              취소
            </Button>
          </Link>
          <Button type="button" onClick={handleSave} disabled={saving || deleting}>
            {saving ? (
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-1 h-4 w-4" />
            )}
            {isEdit ? "수정 저장" : "등록"}
          </Button>
        </div>
      </div>
    </div>
  );
}
