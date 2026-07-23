"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, Check, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  archiveConceptsApi,
  archiveVariablesApi,
  archiveMeasurementsApi,
} from "@/lib/bkend";
import {
  ARCHIVE_ITEM_TYPE_LABELS,
  ARCHIVE_ITEM_TYPE_COLORS,
  type ArchiveItemType,
} from "@/types";
import { cn } from "@/lib/utils";

interface ArchiveEntry {
  id: string;
  name: string;
  type: ArchiveItemType;
}

interface Props {
  selectedIds: string[];
  onChange: (next: string[]) => void;
  /** 현재 편집 중인 항목 ID — 자기 자신을 목록에서 제외 */
  excludeId?: string;
}

export default function ArchiveRelatedLinker({
  selectedIds,
  onChange,
  excludeId,
}: Props) {
  const [items, setItems] = useState<ArchiveEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [cRes, vRes, mRes] = await Promise.all([
          archiveConceptsApi.list(),
          archiveVariablesApi.list(),
          archiveMeasurementsApi.list(),
        ]);
        if (cancelled) return;
        const all: ArchiveEntry[] = [
          ...cRes.data.map((c) => ({
            id: c.id,
            name: c.name,
            type: "concept" as ArchiveItemType,
          })),
          ...vRes.data.map((v) => ({
            id: v.id,
            name: v.name,
            type: "variable" as ArchiveItemType,
          })),
          ...mRes.data.map((m) => ({
            id: m.id,
            name: m.name,
            type: "measurement" as ArchiveItemType,
          })),
        ];
        const filtered = excludeId ? all.filter((x) => x.id !== excludeId) : all;
        // 타입 순서(concept→variable→measurement) + 이름 가나다 정렬
        filtered.sort((a, b) => {
          const typeOrder: Record<ArchiveItemType, number> = {
            concept: 0,
            variable: 1,
            measurement: 2,
          };
          const td = typeOrder[a.type] - typeOrder[b.type];
          if (td !== 0) return td;
          return a.name.localeCompare(b.name, "ko");
        });
        setItems(filtered);
      } catch (err) {
        console.error("[ArchiveRelatedLinker] load failed", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [excludeId]);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return items;
    return items.filter((it) => it.name.toLowerCase().includes(term));
  }, [items, q]);

  const toggle = (id: string) => {
    onChange(
      selectedIds.includes(id)
        ? selectedIds.filter((x) => x !== id)
        : [...selectedIds, id],
    );
  };

  const removeOne = (id: string) => onChange(selectedIds.filter((x) => x !== id));

  const selectedItems = items.filter((it) => selectedSet.has(it.id));

  return (
    <div className="space-y-2">
      {selectedItems.length > 0 && (
        <div className="rounded-md border bg-muted/30 p-2">
          <p className="mb-1.5 text-[11px] font-medium text-muted-foreground">
            선택된 관련 항목 ({selectedItems.length}개)
          </p>
          <div className="flex flex-wrap gap-1.5">
            {selectedItems.map((it) => (
              <Badge
                key={it.id}
                variant="outline"
                className={cn(
                  "gap-1 pr-1 cursor-default",
                  ARCHIVE_ITEM_TYPE_COLORS[it.type],
                )}
              >
                <span className="text-[10px] opacity-70">
                  {ARCHIVE_ITEM_TYPE_LABELS[it.type]}
                </span>
                <span className="max-w-[16ch] truncate">{it.name}</span>
                <button
                  type="button"
                  onClick={() => removeOne(it.id)}
                  className="ml-0.5 rounded-full p-0.5 hover:bg-foreground/10"
                  aria-label="제거"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="이름으로 검색 (개념·변인·측정도구)"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="max-h-64 overflow-y-auto rounded-md border">
        {loading ? (
          <div className="space-y-2 p-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted-foreground">
            {q ? "검색 결과가 없습니다." : "등록된 아카이브 항목이 없습니다."}
          </div>
        ) : (
          <ul className="divide-y">
            {filtered.slice(0, 100).map((it) => {
              const isOn = selectedSet.has(it.id);
              return (
                <li key={it.id}>
                  <button
                    type="button"
                    onClick={() => toggle(it.id)}
                    className={cn(
                      "flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs transition-colors",
                      isOn ? "bg-primary/5 hover:bg-primary/10" : "hover:bg-muted/50",
                    )}
                  >
                    <div
                      className={cn(
                        "flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                        isOn
                          ? "bg-primary border-primary text-primary-foreground"
                          : "border-input",
                      )}
                    >
                      {isOn && <Check className="h-3 w-3" />}
                    </div>
                    <Badge
                      variant="outline"
                      className={cn(
                        "px-1.5 py-0 text-[10px] shrink-0",
                        ARCHIVE_ITEM_TYPE_COLORS[it.type],
                      )}
                    >
                      {ARCHIVE_ITEM_TYPE_LABELS[it.type]}
                    </Badge>
                    <span className="min-w-0 flex-1 truncate font-medium text-foreground">
                      {it.name}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {filtered.length > 100 && (
        <p className="text-[11px] text-muted-foreground">
          상위 100개만 표시됩니다. 검색어로 좁혀주세요.
        </p>
      )}
      {selectedIds.length > 0 && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onChange([])}
          className="text-xs text-muted-foreground"
        >
          전체 선택 해제
        </Button>
      )}
    </div>
  );
}
