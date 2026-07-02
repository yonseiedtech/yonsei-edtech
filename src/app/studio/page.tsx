"use client";

/**
 * 디자인 스튜디오 — 내 문서 목록 + 새 문서 만들기 (2026-07-02).
 * 카드뉴스·포스터·발표 슬라이드를 자유 캔버스로 제작. 세미나·스터디·대외활동과
 * 연계해 템플릿을 프리필할 수 있다 (회원 누구나 본인 문서).
 */

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Palette, Plus, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import AuthGuard from "@/features/auth/AuthGuard";
import PageContainer from "@/components/ui/page-container";
import PageHeader from "@/components/ui/page-header";
import EmptyState from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/features/auth/auth-store";
import { designDocsApi, seminarsApi, activitiesApi } from "@/lib/bkend";
import PageCanvas from "@/features/studio/PageCanvas";
import { buildTemplatePages, buildBlankPages, type TemplatePrefill } from "@/features/studio/templates";
import {
  DESIGN_CANVAS_SIZES,
  DESIGN_DOC_TYPE_LABELS,
  DESIGN_LINK_KIND_LABELS,
  type DesignDocType,
  type DesignDocument,
  type DesignLink,
} from "@/features/studio/studio-types";
import type { Seminar, Activity } from "@/types";

function StudioContent() {
  const { user } = useAuthStore();
  const router = useRouter();
  const qc = useQueryClient();
  const uid = user?.id ?? "";

  const { data: docsRes, isLoading } = useQuery({
    queryKey: ["studio-docs", uid],
    queryFn: () => designDocsApi.listByUser(uid),
    enabled: !!uid,
    staleTime: 30_000,
  });
  const docs = useMemo(
    () =>
      [...((docsRes?.data ?? []) as DesignDocument[])].sort((a, b) =>
        (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""),
      ),
    [docsRes],
  );

  // ── 새 문서 다이얼로그 ──
  const [open, setOpen] = useState(false);
  const [docType, setDocType] = useState<DesignDocType>("cardnews");
  const [title, setTitle] = useState("");
  const [useTemplate, setUseTemplate] = useState(true);
  const [linkKey, setLinkKey] = useState(""); // "seminar:<id>" | "study:<id>" ...
  const [creating, setCreating] = useState(false);

  const { data: seminarsRes } = useQuery({
    queryKey: ["studio-seminars"],
    queryFn: () => seminarsApi.list({ limit: 100 }),
    enabled: open,
    staleTime: 5 * 60_000,
  });
  const { data: activitiesRes } = useQuery({
    queryKey: ["studio-activities"],
    queryFn: () => activitiesApi.list(),
    enabled: open,
    staleTime: 5 * 60_000,
  });

  const linkOptions = useMemo(() => {
    const opts: { key: string; label: string; link: DesignLink; prefill: TemplatePrefill }[] = [];
    for (const s of ((seminarsRes?.data ?? []) as unknown as Seminar[])) {
      const speaker = s.speakers?.map((sp) => sp.name).join(", ") || s.speaker || "";
      opts.push({
        key: `seminar:${s.id}`,
        label: `[세미나] ${s.title}`,
        link: { kind: "seminar", refId: s.id, title: s.title },
        prefill: {
          title: s.title,
          subtitle: speaker ? `연사 ${speaker}` : undefined,
          date: [s.date, s.time].filter(Boolean).join(" "),
          location: s.isOnline ? "온라인 (ZOOM)" : s.location,
          speaker,
          description: s.description,
        },
      });
    }
    for (const a of ((activitiesRes?.data ?? []) as unknown as Activity[])) {
      const kind = a.type === "study" ? "study" : a.type === "project" ? "project" : "external";
      opts.push({
        key: `${kind}:${a.id}`,
        label: `[${DESIGN_LINK_KIND_LABELS[kind]}] ${a.title}`,
        link: { kind, refId: a.id, title: a.title },
        prefill: {
          title: a.title,
          date: [a.date, a.endDate].filter(Boolean).join(" ~ "),
          location: a.location,
          description: a.description,
        },
      });
    }
    return opts;
  }, [seminarsRes, activitiesRes]);

  async function handleCreate() {
    if (!user || creating) return;
    setCreating(true);
    try {
      const picked = linkOptions.find((o) => o.key === linkKey);
      const prefill = picked?.prefill ?? {};
      const now = new Date().toISOString();
      const created = await designDocsApi.create({
        userId: user.id,
        authorName: user.name,
        docType,
        title: title.trim() || picked?.link.title || `새 ${DESIGN_DOC_TYPE_LABELS[docType]}`,
        pages: useTemplate ? buildTemplatePages(docType, prefill) : buildBlankPages(docType),
        ...(picked ? { linked: picked.link } : {}),
        published: false,
        createdAt: now,
        updatedAt: now,
      });
      qc.invalidateQueries({ queryKey: ["studio-docs", uid] });
      router.push(`/studio/${(created as DesignDocument).id}`);
    } catch (e) {
      console.error("[studio] create failed", e);
      toast.error("문서 생성에 실패했습니다.");
      setCreating(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("이 디자인 문서를 삭제할까요?")) return;
    try {
      await designDocsApi.remove(id);
      qc.invalidateQueries({ queryKey: ["studio-docs", uid] });
      toast.success("삭제했습니다.");
    } catch {
      toast.error("삭제에 실패했습니다.");
    }
  }

  return (
    <PageContainer width="default">
      <PageHeader
        icon={Palette}
        title="디자인 스튜디오"
        description="카드뉴스·포스터·발표 슬라이드를 직접 만들고, 세미나·스터디와 연계해 홍보물로 활용하세요."
        actions={
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus size={15} className="mr-1.5" />새 디자인
          </Button>
        }
      />

      <div className="mt-6">
        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Skeleton className="h-56 rounded-2xl" /><Skeleton className="h-56 rounded-2xl" /><Skeleton className="h-56 rounded-2xl" />
          </div>
        ) : docs.length === 0 ? (
          <EmptyState
            icon={Palette}
            title="아직 만든 디자인이 없습니다"
            description="새 디자인을 만들어 세미나 포스터·스터디 카드뉴스·발표 슬라이드를 제작해 보세요."
            actionLabel="새 디자인 만들기"
            onAction={() => setOpen(true)}
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {docs.map((d) => {
              const size = DESIGN_CANVAS_SIZES[d.docType];
              const cover = d.pages[0];
              return (
                <div key={d.id} className="group overflow-hidden rounded-2xl border bg-card shadow-sm transition-shadow hover:shadow-md">
                  <button type="button" className="block w-full" onClick={() => router.push(`/studio/${d.id}`)}>
                    <div className="flex items-center justify-center overflow-hidden bg-muted/40" style={{ height: 180 }}>
                      {cover ? (
                        <PageCanvas page={cover} width={size.width} height={size.height} scale={Math.min(240 / size.width, 180 / size.height)} className="pointer-events-none" />
                      ) : null}
                    </div>
                  </button>
                  <div className="flex items-center justify-between gap-2 p-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{d.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {DESIGN_DOC_TYPE_LABELS[d.docType]} · {d.pages.length}페이지
                        {d.linked ? ` · ${d.linked.title}` : ""}
                      </p>
                    </div>
                    <button
                      type="button"
                      aria-label="삭제"
                      onClick={() => void handleDelete(d.id)}
                      className="shrink-0 rounded p-1.5 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 새 문서 다이얼로그 */}
      <Dialog open={open} onOpenChange={(o) => !creating && setOpen(o)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>새 디자인 만들기</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="mb-1.5 text-sm font-semibold">종류</p>
              <div className="grid grid-cols-3 gap-2">
                {(Object.keys(DESIGN_DOC_TYPE_LABELS) as DesignDocType[]).map((t) => {
                  const s = DESIGN_CANVAS_SIZES[t];
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setDocType(t)}
                      className={cn(
                        "rounded-xl border p-3 text-center text-sm transition-colors",
                        docType === t ? "border-primary bg-primary/5 font-semibold text-primary" : "hover:bg-muted",
                      )}
                    >
                      {DESIGN_DOC_TYPE_LABELS[t]}
                      <span className="mt-0.5 block text-[11px] font-normal text-muted-foreground">{s.width}×{s.height}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <p className="mb-1.5 text-sm font-semibold">제목</p>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="예: 가을 세미나 홍보 카드뉴스" />
            </div>
            <div>
              <p className="mb-1.5 text-sm font-semibold">활동 연계 <span className="font-normal text-muted-foreground">(선택 — 제목·일시·장소가 템플릿에 자동 입력)</span></p>
              <select
                value={linkKey}
                onChange={(e) => setLinkKey(e.target.value)}
                className="h-9 w-full rounded-md border bg-background px-2 text-sm"
              >
                <option value="">연계 안 함</option>
                {linkOptions.map((o) => (
                  <option key={o.key} value={o.key}>{o.label}</option>
                ))}
              </select>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={useTemplate} onChange={(e) => setUseTemplate(e.target.checked)} className="h-4 w-4 rounded border-input" />
              브랜드 템플릿으로 시작 (네이비·골드 에디토리얼)
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={creating}>취소</Button>
            <Button onClick={() => void handleCreate()} disabled={creating}>
              {creating && <Loader2 size={14} className="mr-1 animate-spin" />}만들기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}

export default function StudioPage() {
  return (
    <AuthGuard>
      <StudioContent />
    </AuthGuard>
  );
}
