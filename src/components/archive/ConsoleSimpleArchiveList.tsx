"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  type ArchiveConcept,
  type ArchiveVariable,
  type ArchiveMeasurementTool,
  type ArchiveItemType,
  type ArchiveOperationalMeta,
} from "@/types";
import { toast } from "sonner";
import type { LucideIcon } from "lucide-react";

// Phase 3.5 — concept/variable/measurement 콘솔 목록 공통 컴포넌트.
// 검색·삭제·운영 메타 표시 (최종 수정: {updatedBy} · 검수: {reviewedBy} ({reviewedAt})).

type AnyItem = ArchiveConcept | ArchiveVariable | ArchiveMeasurementTool;

interface Props {
  type: ArchiveItemType;
  icon: LucideIcon;
  title: string;
  description: string;
}

export default function ConsoleSimpleArchiveList({ type, icon, title, description }: Props) {
  const { user } = useAuthStore();
  const allowed = isAtLeast(user, "staff");
  const [items, setItems] = useState<AnyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  async function load() {
    setLoading(true);
    try {
      const res =
        type === "concept"
          ? await archiveConceptsApi.list()
          : type === "variable"
            ? await archiveVariablesApi.list()
            : await archiveMeasurementsApi.list();
      setItems(res.data as AnyItem[]);
    } catch (err) {
      console.error(`[console-archive-${type}] load failed`, err);
      toast.error("로드 실패");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (allowed) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowed, type]);

  async function handleDelete(item: AnyItem) {
    if (!confirm(`"${item.name}"을 삭제하시겠습니까?`)) return;
    try {
      if (type === "concept") await archiveConceptsApi.delete(item.id);
      else if (type === "variable") await archiveVariablesApi.delete(item.id);
      else await archiveMeasurementsApi.delete(item.id);
      toast.success("삭제 완료");
      load();
    } catch (err) {
      console.error(`[console-archive-${type}] delete failed`, err);
      toast.error("삭제 실패");
    }
  }

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return items;
    return items.filter((it) => {
      const altNames = (it as { altNames?: string[] }).altNames ?? [];
      const tags = (it as { tags?: string[] }).tags ?? [];
      const hay = [it.name, it.description ?? "", ...altNames, ...tags]
        .join(" ")
        .toLowerCase();
      return hay.includes(term);
    });
  }, [items, q]);

  if (!allowed) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground">접근 권한이 없습니다 (staff 이상).</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ConsolePageHeader
        icon={icon}
        title={title}
        description={description}
        actions={
          <Link href={`/console/archive/${type}s/new`}>
            <Button size="sm">
              <Plus className="mr-1 h-4 w-4" />새 {ARCHIVE_ITEM_TYPE_LABELS[type]}
            </Button>
          </Link>
        }
      />

      <div className="mt-4 relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="이름·설명·태그로 검색"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="pl-9"
        />
      </div>

      {loading ? (
        <div className="mt-4 space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="mt-8 rounded-lg border border-dashed p-12 text-center text-sm text-muted-foreground">
          {q ? "검색 결과가 없습니다." : "등록된 항목이 없습니다."}
        </div>
      ) : (
        <div className="mt-4 space-y-2">
          {filtered.map((item) => (
            <ArchiveRow
              key={item.id}
              type={type}
              item={item}
              onDelete={() => handleDelete(item)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ArchiveRow({
  type,
  item,
  onDelete,
}: {
  type: ArchiveItemType;
  item: AnyItem;
  onDelete: () => void;
}) {
  const meta = item as ArchiveOperationalMeta;
  const altNames = (item as { altNames?: string[] }).altNames ?? [];
  return (
    <Card>
      <CardContent className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/console/archive/${type}s/${item.id}/edit`}
              className="font-medium truncate hover:text-primary hover:underline"
            >
              {item.name}
            </Link>
            {altNames.length > 0 && (
              <Badge variant="outline" className="text-[10px]">
                {altNames.slice(0, 2).join(", ")}
                {altNames.length > 2 && ` +${altNames.length - 2}`}
              </Badge>
            )}
          </div>
          {item.description && (
            <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">
              {item.description}
            </p>
          )}
          <OperationalMetaLine meta={meta} />
        </div>
        <div className="flex items-center gap-1">
          <Link href={`/console/archive/${type}s/${item.id}/edit`}>
            <Button variant="ghost" size="sm" aria-label="편집">
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          </Link>
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            className="text-destructive hover:text-destructive"
            aria-label="삭제"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/** Phase 3.5 — 운영 메타 노출 한 줄 (콘솔 전용). */
export function OperationalMetaLine({ meta }: { meta: ArchiveOperationalMeta }) {
  const updatedBy = meta.updatedBy?.trim();
  const reviewedBy = meta.reviewedBy?.trim();
  const reviewedAt = meta.reviewedAt;
  if (!updatedBy && !reviewedBy) return null;
  const reviewedLabel = reviewedAt
    ? new Date(reviewedAt).toLocaleString("ko-KR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;
  return (
    <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-muted-foreground">
      {updatedBy && <span>최종 수정: {updatedBy}</span>}
      {reviewedBy && (
        <span>
          · 검수: {reviewedBy}
          {reviewedLabel && ` (${reviewedLabel})`}
        </span>
      )}
    </p>
  );
}

