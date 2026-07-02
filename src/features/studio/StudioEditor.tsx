"use client";

/**
 * StudioEditor — 디자인 스튜디오 편집기 (카드뉴스·포스터·발표 슬라이드).
 *
 * 모델: DesignDocument.pages[].elements[] 자유 캔버스 (studio-types.ts).
 * 조작: 클릭 선택 → 드래그 이동, 모서리 핸들 리사이즈, 속성 패널 편집.
 * 저장: 3초 디바운스 자동 저장 + 수동 저장.
 * 내보내기: exporters.ts (PNG/ZIP/PDF/PPTX) — 숨김 풀사이즈 렌더를 캡처.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft, Type, Square, Circle, Minus, ImagePlus, Smile, Plus, Copy, Trash2,
  ChevronUp, ChevronDown, Save, Download, Loader2, Lock, Unlock, Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/features/auth/auth-store";
import { designDocsApi, seminarsApi } from "@/lib/bkend";
import { isStaffOrAbove } from "@/lib/permissions";
import { uploadImage } from "@/lib/upload";
import PageCanvas from "./PageCanvas";
import { BRAND_COLORS, BRAND_ASSETS, STUDIO_ICONS, makeText, makeImage, makeShape, makeIcon, makePage, newId } from "./studio-utils";
import { DESIGN_CANVAS_SIZES, DESIGN_DOC_TYPE_LABELS } from "./studio-types";
import type { DesignDocument, DesignElement, DesignPage } from "./studio-types";

const EDIT_SCALE_MAX_W = 560;

/** dataURL 을 지정 폭 이하 JPEG 로 재인코딩 (포스터 게시 용량 절감) */
function shrinkToJpeg(dataUrl: string, maxWidth: number, quality: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const ratio = Math.min(1, maxWidth / img.width);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * ratio);
      canvas.height = Math.round(img.height * ratio);
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("canvas context"));
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = reject;
    img.src = dataUrl;
  });
}

type DragState =
  | { mode: "move"; elId: string; startX: number; startY: number; origX: number; origY: number }
  | { mode: "resize"; elId: string; corner: "nw" | "ne" | "sw" | "se"; startX: number; startY: number; orig: { x: number; y: number; w: number; h: number } }
  | null;

export default function StudioEditor({ docId }: { docId: string }) {
  const { user } = useAuthStore();
  const router = useRouter();
  const [doc, setDoc] = useState<DesignDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [pageIdx, setPageIdx] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [iconPickerOpen, setIconPickerOpen] = useState(false);
  const [imageMenuOpen, setImageMenuOpen] = useState(false);
  const [exporting, setExporting] = useState<string | null>(null);
  const dirtyRef = useRef(false);
  const docRef = useRef<DesignDocument | null>(null);
  docRef.current = doc;

  const size = doc ? DESIGN_CANVAS_SIZES[doc.docType] : { width: 1080, height: 1080 };
  const scale = Math.min(EDIT_SCALE_MAX_W / size.width, 640 / size.height);

  // ── 로드 ──
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const d = await designDocsApi.get(docId);
        if (!cancelled) setDoc(d);
      } catch {
        toast.error("문서를 불러오지 못했습니다.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [docId]);

  const readOnly = !!doc && !!user && doc.userId !== user.id;

  // ── 변경 + 자동 저장 ──
  const mutate = useCallback((fn: (d: DesignDocument) => DesignDocument) => {
    setDoc((cur) => {
      if (!cur) return cur;
      dirtyRef.current = true;
      return fn(cur);
    });
  }, []);

  const save = useCallback(async (silent = true) => {
    const cur = docRef.current;
    if (!cur || !dirtyRef.current) return;
    setSaving(true);
    try {
      const now = new Date().toISOString();
      const approxSize = JSON.stringify(cur.pages).length;
      if (approxSize > 900_000) {
        toast.error("문서 용량이 한도(1MB)에 근접했습니다. 삽입 이미지를 줄이거나 페이지를 나눠주세요.");
      }
      await designDocsApi.update(cur.id, { pages: cur.pages, title: cur.title, lastSavedAt: now, updatedAt: now });
      dirtyRef.current = false;
      setSavedAt(now);
      if (!silent) toast.success("저장되었습니다.");
    } catch {
      if (!silent) toast.error("저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  }, []);

  useEffect(() => {
    if (readOnly) return;
    const t = setInterval(() => void save(true), 3000);
    return () => clearInterval(t);
  }, [save, readOnly]);

  const page: DesignPage | undefined = doc?.pages[pageIdx];
  const selected = useMemo(
    () => page?.elements.find((e) => e.id === selectedId) ?? null,
    [page, selectedId],
  );

  const patchPage = useCallback((fn: (p: DesignPage) => DesignPage) => {
    mutate((d) => ({ ...d, pages: d.pages.map((p, i) => (i === pageIdx ? fn(p) : p)) }));
  }, [mutate, pageIdx]);

  const patchElement = useCallback((id: string, patch: Partial<DesignElement>) => {
    patchPage((p) => ({
      ...p,
      elements: p.elements.map((e) => (e.id === id ? ({ ...e, ...patch } as DesignElement) : e)),
    }));
  }, [patchPage]);

  function addElement(el: DesignElement) {
    patchPage((p) => ({ ...p, elements: [...p.elements, el] }));
    setSelectedId(el.id);
  }

  function removeSelected() {
    if (!selectedId) return;
    patchPage((p) => ({ ...p, elements: p.elements.filter((e) => e.id !== selectedId) }));
    setSelectedId(null);
  }

  function reorderSelected(dir: 1 | -1) {
    if (!selectedId) return;
    patchPage((p) => {
      const idx = p.elements.findIndex((e) => e.id === selectedId);
      const to = idx + dir;
      if (idx < 0 || to < 0 || to >= p.elements.length) return p;
      const arr = [...p.elements];
      const [el] = arr.splice(idx, 1);
      arr.splice(to, 0, el);
      return { ...p, elements: arr };
    });
  }

  // ── 키보드: Delete 로 요소 삭제 (텍스트 입력 중엔 무시) ──
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Delete" && e.key !== "Backspace") return;
      const t = e.target as HTMLElement;
      if (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable) return;
      if (selectedId) {
        e.preventDefault();
        removeSelected();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, pageIdx]);

  // ── 드래그/리사이즈 ──
  const dragRef = useRef<DragState>(null);

  const onPointerMove = useCallback((e: PointerEvent) => {
    const drag = dragRef.current;
    if (!drag) return;
    const dx = (e.clientX - drag.startX) / scale;
    const dy = (e.clientY - drag.startY) / scale;
    if (drag.mode === "move") {
      patchElement(drag.elId, { x: Math.round(drag.origX + dx), y: Math.round(drag.origY + dy) });
    } else {
      const { x, y, w, h } = drag.orig;
      let nx = x, ny = y, nw = w, nh = h;
      if (drag.corner.includes("e")) nw = Math.max(20, w + dx);
      if (drag.corner.includes("s")) nh = Math.max(20, h + dy);
      if (drag.corner.includes("w")) { nw = Math.max(20, w - dx); nx = x + (w - nw); }
      if (drag.corner.includes("n")) { nh = Math.max(20, h - dy); ny = y + (h - nh); }
      patchElement(drag.elId, { x: Math.round(nx), y: Math.round(ny), w: Math.round(nw), h: Math.round(nh) });
    }
  }, [patchElement, scale]);

  const onPointerUp = useCallback(() => {
    dragRef.current = null;
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", onPointerUp);
  }, [onPointerMove]);

  function startMove(e: React.PointerEvent, el: DesignElement) {
    if (readOnly || el.locked) return;
    e.preventDefault();
    e.stopPropagation();
    setSelectedId(el.id);
    dragRef.current = { mode: "move", elId: el.id, startX: e.clientX, startY: e.clientY, origX: el.x, origY: el.y };
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  }

  function startResize(e: React.PointerEvent, el: DesignElement, corner: "nw" | "ne" | "sw" | "se") {
    if (readOnly) return;
    e.preventDefault();
    e.stopPropagation();
    dragRef.current = { mode: "resize", elId: el.id, corner, startX: e.clientX, startY: e.clientY, orig: { x: el.x, y: el.y, w: el.w, h: el.h } };
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  }

  // ── 이미지 업로드 ──
  // Firebase Storage 미활성(Blaze 필요) 환경 대응: base64 dataURL 로 문서에 내장.
  // 800px 리사이즈(≈100~250KB)라 Firestore 문서 1MB 한도 내에서 3~4장까지 안전.
  async function handleUpload(file: File) {
    try {
      const url = await uploadImage(file);
      addElement(makeImage(url, { x: 120, y: 120, w: Math.round(size.width * 0.4), h: Math.round(size.width * 0.3) }));
      toast.success("이미지를 추가했습니다.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "이미지 업로드에 실패했습니다.");
    }
  }

  // ── 세미나 포스터 게시 (연계 세미나 + staff 전용) ──
  const canPublishPoster = !!doc?.linked && doc.linked.kind === "seminar" && isStaffOrAbove(user ?? null);
  async function publishPoster() {
    if (!doc?.linked || doc.linked.kind !== "seminar") return;
    setExporting("poster");
    try {
      await save(true);
      const { capturePagePng } = await import("./exporters");
      const png = await capturePagePng(doc.pages[0].id);
      // Storage 미활성 환경: JPEG 재인코딩(≤810px)으로 용량을 줄여 dataURL 로 저장
      // (기존 AI 포스터 생성기와 동일한 seminar.posterUrl 경로)
      const jpeg = await shrinkToJpeg(png, 810, 0.82);
      if (jpeg.length > 950_000) {
        toast.error("포스터 이미지가 저장 한도(1MB)를 초과합니다. 페이지 요소를 줄여주세요.");
        return;
      }
      await seminarsApi.update(doc.linked.refId, { posterUrl: jpeg });
      toast.success("1페이지를 세미나 포스터로 게시했습니다. 세미나 상세에서 확인하세요.");
    } catch (err) {
      console.error("[studio] poster publish failed", err);
      toast.error("포스터 게시에 실패했습니다.");
    } finally {
      setExporting(null);
    }
  }

  // ── 내보내기 ──
  async function runExport(kind: "png" | "zip" | "pdf" | "pptx") {
    if (!doc) return;
    setExporting(kind);
    try {
      await save(true);
      const { exportDesign } = await import("./exporters");
      await exportDesign(doc, kind, pageIdx);
      toast.success("내보내기가 완료되었습니다.");
    } catch (err) {
      console.error("[studio] export failed", err);
      toast.error("내보내기에 실패했습니다.");
    } finally {
      setExporting(null);
    }
  }

  if (loading) {
    return <div className="flex min-h-[50vh] items-center justify-center text-sm text-muted-foreground">불러오는 중…</div>;
  }
  if (!doc || !page) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
        문서를 찾을 수 없습니다.
        <Button variant="outline" size="sm" onClick={() => router.push("/studio")}>목록으로</Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      {/* 헤더 */}
      <div className="flex flex-wrap items-center gap-2">
        <Link href="/studio" className="rounded-md p-1.5 text-muted-foreground hover:bg-muted"><ArrowLeft size={16} /></Link>
        <Input
          value={doc.title}
          onChange={(e) => mutate((d) => ({ ...d, title: e.target.value }))}
          className="h-9 w-56 font-semibold"
          disabled={readOnly}
        />
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
          {DESIGN_DOC_TYPE_LABELS[doc.docType]} · {size.width}×{size.height}
        </span>
        {doc.linked && (
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">연계: {doc.linked.title}</span>
        )}
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {saving ? "저장 중…" : savedAt ? `자동 저장됨 ${new Date(savedAt).toLocaleTimeString("ko-KR")}` : ""}
          </span>
          {!readOnly && (
            <Button size="sm" variant="outline" onClick={() => void save(false)}>
              <Save size={14} className="mr-1" />저장
            </Button>
          )}
          {canPublishPoster && (
            <Button size="sm" disabled={exporting !== null} onClick={() => void publishPoster()}>
              {exporting === "poster" ? <Loader2 size={13} className="mr-1 animate-spin" /> : null}
              세미나 포스터로 게시
            </Button>
          )}
          <div className="flex items-center gap-1">
            {(["png", "zip", "pdf", "pptx"] as const).map((k) => (
              <Button key={k} size="sm" variant="outline" disabled={exporting !== null} onClick={() => void runExport(k)}>
                {exporting === k ? <Loader2 size={13} className="mr-1 animate-spin" /> : <Download size={13} className="mr-1" />}
                {k.toUpperCase()}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* 툴바 */}
      {!readOnly && (
        <div className="relative mt-3 flex flex-wrap items-center gap-1.5 rounded-xl border bg-card p-2">
          <Button size="sm" variant="ghost" onClick={() => addElement(makeText({ fontSize: Math.round(size.width * 0.04) }))}><Type size={15} className="mr-1" />텍스트</Button>
          <Button size="sm" variant="ghost" onClick={() => addElement(makeShape("rect"))}><Square size={15} className="mr-1" />사각형</Button>
          <Button size="sm" variant="ghost" onClick={() => addElement(makeShape("circle"))}><Circle size={15} className="mr-1" />원</Button>
          <Button size="sm" variant="ghost" onClick={() => addElement(makeShape("line"))}><Minus size={15} className="mr-1" />선</Button>
          <Button size="sm" variant="ghost" onClick={() => { setIconPickerOpen((v) => !v); setImageMenuOpen(false); }}><Smile size={15} className="mr-1" />아이콘</Button>
          <Button size="sm" variant="ghost" onClick={() => { setImageMenuOpen((v) => !v); setIconPickerOpen(false); }}><ImagePlus size={15} className="mr-1" />이미지</Button>
          <span className="mx-1 h-5 w-px bg-border" />
          <span className="text-xs text-muted-foreground">배경</span>
          {BRAND_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={`배경 ${c}`}
              onClick={() => patchPage((p) => ({ ...p, background: c }))}
              className={cn("h-6 w-6 rounded-full border", page.background === c && "ring-2 ring-primary ring-offset-1")}
              style={{ background: c }}
            />
          ))}

          {iconPickerOpen && (
            <div className="absolute left-2 top-full z-20 mt-1 grid grid-cols-8 gap-1 rounded-xl border bg-popover p-2 shadow-md">
              {Object.entries(STUDIO_ICONS).map(([name, Icon]) => (
                <button
                  key={name}
                  type="button"
                  title={name}
                  onClick={() => { addElement(makeIcon(name, { w: Math.round(size.width * 0.1), h: Math.round(size.width * 0.1) })); setIconPickerOpen(false); }}
                  className="rounded-lg p-2 hover:bg-accent"
                >
                  <Icon size={20} />
                </button>
              ))}
            </div>
          )}
          {imageMenuOpen && (
            <div className="absolute left-2 top-full z-20 mt-1 w-64 space-y-2 rounded-xl border bg-popover p-3 shadow-md">
              <label className="block cursor-pointer rounded-lg border border-dashed p-3 text-center text-xs text-muted-foreground hover:border-primary/40">
                파일 업로드 (1MB 이하 이미지 · 자동 리사이즈)
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void handleUpload(f);
                    setImageMenuOpen(false);
                  }}
                />
              </label>
              <p className="text-[11px] font-semibold text-muted-foreground">브랜드 자산</p>
              <div className="flex flex-wrap gap-1.5">
                {BRAND_ASSETS.map((a) => (
                  <button
                    key={a.src}
                    type="button"
                    onClick={() => { addElement(makeImage(a.src, { fit: "contain" })); setImageMenuOpen(false); }}
                    className="rounded-lg border px-2 py-1 text-xs hover:bg-accent"
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="mt-4 grid gap-4 lg:grid-cols-[140px_1fr_260px]">
        {/* 페이지 목록 */}
        <div className="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
          {doc.pages.map((p, i) => (
            <button
              key={p.id}
              type="button"
              onClick={() => { setPageIdx(i); setSelectedId(null); }}
              className={cn(
                "relative shrink-0 rounded-lg border-2 p-1 transition-colors",
                i === pageIdx ? "border-primary" : "border-transparent hover:border-border",
              )}
            >
              <PageCanvas page={p} width={size.width} height={size.height} scale={120 / size.width} className="pointer-events-none rounded-md border bg-white" />
              <span className="absolute left-1.5 top-1.5 rounded bg-black/50 px-1 text-[10px] text-white">{i + 1}</span>
            </button>
          ))}
          {!readOnly && (
            <div className="flex shrink-0 gap-1 lg:flex-col">
              <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => { mutate((d) => ({ ...d, pages: [...d.pages, makePage("#ffffff")] })); setPageIdx(doc.pages.length); }}>
                <Plus size={13} className="mr-1" />페이지
              </Button>
              <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => {
                mutate((d) => {
                  const clone: DesignPage = JSON.parse(JSON.stringify(d.pages[pageIdx]));
                  clone.id = newId("pg");
                  clone.elements = clone.elements.map((e) => ({ ...e, id: newId() }));
                  const pages = [...d.pages];
                  pages.splice(pageIdx + 1, 0, clone);
                  return { ...d, pages };
                });
                setPageIdx(pageIdx + 1);
              }}>
                <Copy size={13} className="mr-1" />복제
              </Button>
              {doc.pages.length > 1 && (
                <Button size="sm" variant="outline" className="h-8 text-xs text-destructive" onClick={() => {
                  mutate((d) => ({ ...d, pages: d.pages.filter((_, i) => i !== pageIdx) }));
                  setPageIdx(Math.max(0, pageIdx - 1));
                }}>
                  <Trash2 size={13} className="mr-1" />삭제
                </Button>
              )}
            </div>
          )}
        </div>

        {/* 캔버스 */}
        <div className="flex items-start justify-center overflow-auto rounded-xl border bg-muted/30 p-4">
          <div onPointerDown={() => setSelectedId(null)}>
            <PageCanvas page={page} width={size.width} height={size.height} scale={scale} className="rounded-md shadow-md">
              {/* 편집 오버레이 — 문서 좌표계 내부 (scale 자동 적용) */}
              {page.elements.map((el) => {
                const isSel = el.id === selectedId;
                return (
                  <div
                    key={`ov-${el.id}`}
                    onPointerDown={(e) => startMove(e, el)}
                    style={{
                      position: "absolute",
                      left: el.x,
                      top: el.y,
                      width: el.w,
                      height: el.h,
                      cursor: el.locked ? "default" : "move",
                      outline: isSel ? `${Math.max(2, 2 / scale)}px solid #0a4da3` : undefined,
                      outlineOffset: 2,
                    }}
                  >
                    {isSel && !readOnly && (["nw", "ne", "sw", "se"] as const).map((corner) => (
                      <span
                        key={corner}
                        onPointerDown={(e) => startResize(e, el, corner)}
                        style={{
                          position: "absolute",
                          width: 14 / scale,
                          height: 14 / scale,
                          background: "#fff",
                          border: `${2 / scale}px solid #0a4da3`,
                          borderRadius: "50%",
                          left: corner.includes("w") ? -8 / scale : undefined,
                          right: corner.includes("e") ? -8 / scale : undefined,
                          top: corner.includes("n") ? -8 / scale : undefined,
                          bottom: corner.includes("s") ? -8 / scale : undefined,
                          cursor: corner === "nw" || corner === "se" ? "nwse-resize" : "nesw-resize",
                        }}
                      />
                    ))}
                  </div>
                );
              })}
            </PageCanvas>
          </div>
        </div>

        {/* 속성 패널 */}
        <div className="rounded-xl border bg-card p-3">
          {!selected ? (
            <p className="text-xs text-muted-foreground">
              요소를 클릭해 선택하세요. 드래그로 이동, 모서리 핸들로 크기 조절, Delete 키로 삭제할 수 있습니다.
            </p>
          ) : (
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold">
                  {selected.type === "text" ? "텍스트" : selected.type === "image" ? "이미지" : selected.type === "shape" ? "도형" : "아이콘"}
                </span>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="뒤로" onClick={() => reorderSelected(-1)}><ChevronDown size={13} /></Button>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="앞으로" onClick={() => reorderSelected(1)}><ChevronUp size={13} /></Button>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title={selected.locked ? "잠금 해제" : "잠금"} onClick={() => patchElement(selected.id, { locked: !selected.locked })}>
                    {selected.locked ? <Lock size={13} /> : <Unlock size={13} />}
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" title="삭제" onClick={removeSelected}><Trash2 size={13} /></Button>
                </div>
              </div>

              {selected.type === "text" && (
                <>
                  <Textarea
                    rows={3}
                    value={selected.text}
                    onChange={(e) => patchElement(selected.id, { text: e.target.value })}
                    className="text-sm"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <label>크기
                      <Input type="number" className="mt-0.5 h-8" value={selected.fontSize}
                        onChange={(e) => patchElement(selected.id, { fontSize: Number(e.target.value) || 12 })} />
                    </label>
                    <label>굵기
                      <select className="mt-0.5 h-8 w-full rounded-md border bg-background px-2" value={selected.fontWeight}
                        onChange={(e) => patchElement(selected.id, { fontWeight: Number(e.target.value) as 400 })}>
                        <option value={400}>보통</option><option value={600}>세미볼드</option>
                        <option value={700}>볼드</option><option value={900}>블랙</option>
                      </select>
                    </label>
                    <label>서체
                      <select className="mt-0.5 h-8 w-full rounded-md border bg-background px-2" value={selected.fontFamily}
                        onChange={(e) => patchElement(selected.id, { fontFamily: e.target.value as "sans" })}>
                        <option value="sans">고딕 (Pretendard)</option>
                        <option value="display">세리프 (Hahmlet)</option>
                      </select>
                    </label>
                    <label>정렬
                      <select className="mt-0.5 h-8 w-full rounded-md border bg-background px-2" value={selected.align}
                        onChange={(e) => patchElement(selected.id, { align: e.target.value as "left" })}>
                        <option value="left">왼쪽</option><option value="center">가운데</option><option value="right">오른쪽</option>
                      </select>
                    </label>
                  </div>
                </>
              )}

              {selected.type === "image" && (
                <div className="grid grid-cols-2 gap-2">
                  <label>맞춤
                    <select className="mt-0.5 h-8 w-full rounded-md border bg-background px-2" value={selected.fit}
                      onChange={(e) => patchElement(selected.id, { fit: e.target.value as "cover" })}>
                      <option value="cover">채우기</option><option value="contain">전체 보이기</option>
                    </select>
                  </label>
                  <label>모서리
                    <Input type="number" className="mt-0.5 h-8" value={selected.radius ?? 0}
                      onChange={(e) => patchElement(selected.id, { radius: Number(e.target.value) || 0 })} />
                  </label>
                </div>
              )}

              {selected.type === "shape" && selected.shape === "rect" && (
                <label>모서리
                  <Input type="number" className="mt-0.5 h-8" value={selected.radius ?? 0}
                    onChange={(e) => patchElement(selected.id, { radius: Number(e.target.value) || 0 })} />
                </label>
              )}

              {(selected.type === "text" || selected.type === "shape" || selected.type === "icon") && (
                <div>
                  <p className="mb-1 font-semibold">색상</p>
                  <div className="flex flex-wrap gap-1.5">
                    {BRAND_COLORS.map((c) => {
                      const cur = selected.type === "shape" ? selected.fill : selected.color;
                      const key = selected.type === "shape" ? "fill" : "color";
                      return (
                        <button key={c} type="button" aria-label={c}
                          onClick={() => patchElement(selected.id, { [key]: c } as Partial<DesignElement>)}
                          className={cn("h-6 w-6 rounded-full border", cur === c && "ring-2 ring-primary ring-offset-1")}
                          style={{ background: c }} />
                      );
                    })}
                    <input
                      type="color"
                      aria-label="직접 선택"
                      className="h-6 w-8 cursor-pointer rounded border"
                      value={(selected.type === "shape" ? selected.fill : selected.color).startsWith("#") ? (selected.type === "shape" ? selected.fill : selected.color) : "#003378"}
                      onChange={(e) => patchElement(selected.id, (selected.type === "shape" ? { fill: e.target.value } : { color: e.target.value }) as Partial<DesignElement>)}
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-4 gap-1.5">
                {(["x", "y", "w", "h"] as const).map((k) => (
                  <label key={k} className="text-[11px] uppercase text-muted-foreground">{k}
                    <Input type="number" className="mt-0.5 h-8 px-1.5" value={Math.round(selected[k])}
                      onChange={(e) => patchElement(selected.id, { [k]: Number(e.target.value) || 0 } as Partial<DesignElement>)} />
                  </label>
                ))}
              </div>
              <label>불투명도 ({Math.round((selected.opacity ?? 1) * 100)}%)
                <input type="range" min={10} max={100} className="mt-1 w-full"
                  value={Math.round((selected.opacity ?? 1) * 100)}
                  onChange={(e) => patchElement(selected.id, { opacity: Number(e.target.value) / 100 })} />
              </label>
            </div>
          )}

          <div className="mt-4 border-t pt-3 text-[11px] text-muted-foreground">
            <p className="flex items-center gap-1 font-semibold"><Layers size={12} />페이지 요소 {page.elements.length}개</p>
          </div>
        </div>
      </div>

      {/* 내보내기용 숨김 풀사이즈 렌더 */}
      {exporting && (
        <div style={{ position: "fixed", left: -100000, top: 0 }} aria-hidden>
          {doc.pages.map((p) => (
            <PageCanvas key={`export-${p.id}`} page={p} width={size.width} height={size.height} scale={1} canvasId={`studio-export-${p.id}`} />
          ))}
        </div>
      )}
    </div>
  );
}
