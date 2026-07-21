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
  ChevronUp, ChevronDown, Save, Download, Loader2, Lock, Unlock, Layers, Undo2, Redo2,
  Sparkles, Maximize2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/features/auth/auth-store";
import { designDocsApi, seminarsApi, streakEventsApi } from "@/lib/bkend";
import { isStaffOrAbove } from "@/lib/permissions";
import { uploadImage } from "@/lib/upload";
import PageCanvas from "./PageCanvas";
import { BRAND_COLORS, BRAND_ASSETS, STUDIO_ICONS, makeText, makeImage, makeShape, makeIcon, makePage, newId, resizePages } from "./studio-utils";
import { BRAND_PALETTE, BRAND_LOGOS } from "./brand-kit";
import { DESIGN_DOC_TYPE_LABELS, DESIGN_RESIZE_PRESETS, resolveCanvasSize } from "./studio-types";
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
  | { mode: "move"; elId: string; pointerId?: number; startX: number; startY: number; origX: number; origY: number }
  | { mode: "resize"; elId: string; pointerId?: number; corner: "nw" | "ne" | "sw" | "se"; startX: number; startY: number; orig: { x: number; y: number; w: number; h: number } }
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
  const [brandPanelOpen, setBrandPanelOpen] = useState(false);
  const [resizeMenuOpen, setResizeMenuOpen] = useState(false);
  const closeAllPopovers = useCallback(() => {
    setIconPickerOpen(false);
    setImageMenuOpen(false);
    setBrandPanelOpen(false);
    setResizeMenuOpen(false);
  }, []);
  // 팝오버 바깥 클릭/Escape 로 닫기 (Batch-3)
  useEffect(() => {
    if (!iconPickerOpen && !imageMenuOpen && !brandPanelOpen && !resizeMenuOpen) return;
    function onDown(e: PointerEvent) {
      const t = e.target as HTMLElement;
      if (!t.closest("[data-studio-toolbar]") && !t.closest("[data-studio-resize]")) {
        closeAllPopovers();
      }
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") closeAllPopovers();
    }
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onEsc);
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onEsc);
    };
  }, [iconPickerOpen, imageMenuOpen, brandPanelOpen, resizeMenuOpen, closeAllPopovers]);
  const [exporting, setExporting] = useState<string | null>(null);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const dirtyRef = useRef(false);
  const docRef = useRef<DesignDocument | null>(null);
  docRef.current = doc;
  // QA-v2: 탭 간 last-writer-wins 방지 — 서버 lastSavedAt 기준선·충돌 플래그·확인 스로틀
  const baseSavedAtRef = useRef<string | null>(null);
  const conflictRef = useRef(false);
  const lastConflictCheckRef = useRef(0);
  // RT-2: 스튜디오 제작 잔디 적립 — 세션당 1회 (멱등 day-bucket)
  const streakLoggedRef = useRef(false);
  // ── undo/redo (Batch-3): pages 스냅샷 스택. 편집 버스트(드래그·연속 타이핑)는
  // 400ms 스로틀로 한 스텝으로 묶는다. pages 는 불변 갱신이라 참조 스냅샷 안전. ──
  const undoStack = useRef<DesignPage[][]>([]);
  const redoStack = useRef<DesignPage[][]>([]);
  const lastPushRef = useRef(0);
  const [historyTick, setHistoryTick] = useState(0); // 버튼 활성화 리렌더 트리거

  const size = resolveCanvasSize(doc);
  // 컨테이너 실측 스케일 — 모바일에서 캔버스가 잘리지 않도록 (Batch-3)
  const canvasHostRef = useRef<HTMLDivElement | null>(null);
  const [hostWidth, setHostWidth] = useState<number>(EDIT_SCALE_MAX_W);
  useEffect(() => {
    const el = canvasHostRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w) setHostWidth(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [loading]);
  const scale = Math.min(
    Math.max(120, hostWidth - 8) / size.width,
    EDIT_SCALE_MAX_W / size.width,
    640 / size.height,
  );

  // ── 로드 ──
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const d = await designDocsApi.get(docId);
        if (!cancelled) {
          baseSavedAtRef.current = (d as { lastSavedAt?: string } | null)?.lastSavedAt ?? null;
          // 신뢰성(2026-07-04): 저장 실패 시점의 로컬 백업이 서버본보다 최신이면 복구 제안
          try {
            const raw = localStorage.getItem(`studio_backup_${docId}`);
            if (raw) {
              const backup = JSON.parse(raw) as { title?: string; pages?: DesignPage[]; at?: number };
              const serverAt = (d as { lastSavedAt?: string } | null)?.lastSavedAt;
              const serverMs = serverAt ? new Date(serverAt).getTime() : 0;
              if (backup.pages?.length && (backup.at ?? 0) > serverMs) {
                if (confirm("저장되지 못한 편집 내용의 로컬 백업이 있습니다. 복구할까요?\n(취소하면 백업은 삭제됩니다)")) {
                  setDoc({ ...(d as DesignDocument), title: backup.title ?? (d as DesignDocument).title, pages: backup.pages });
                  dirtyRef.current = true;
                  toast.info("로컬 백업을 불러왔습니다 — 용량을 줄인 뒤 저장해 주세요.");
                } else {
                  localStorage.removeItem(`studio_backup_${docId}`);
                  setDoc(d);
                }
              } else {
                setDoc(d);
              }
            } else {
              setDoc(d);
            }
          } catch {
            setDoc(d);
          }
        }
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
      const now = Date.now();
      if (now - lastPushRef.current > 400) {
        undoStack.current.push(cur.pages);
        if (undoStack.current.length > 30) undoStack.current.shift();
        redoStack.current = [];
        lastPushRef.current = now;
        setHistoryTick((t) => t + 1);
      }
      dirtyRef.current = true;
      return fn(cur);
    });
  }, []);

  const undo = useCallback(() => {
    setDoc((cur) => {
      if (!cur) return cur;
      const prev = undoStack.current.pop();
      if (!prev) return cur;
      redoStack.current.push(cur.pages);
      dirtyRef.current = true;
      lastPushRef.current = 0;
      setHistoryTick((t) => t + 1);
      return { ...cur, pages: prev };
    });
    setSelectedId(null);
  }, []);

  const redo = useCallback(() => {
    setDoc((cur) => {
      if (!cur) return cur;
      const next = redoStack.current.pop();
      if (!next) return cur;
      undoStack.current.push(cur.pages);
      dirtyRef.current = true;
      lastPushRef.current = 0;
      setHistoryTick((t) => t + 1);
      return { ...cur, pages: next };
    });
    setSelectedId(null);
  }, []);

  const [saveError, setSaveError] = useState<string | null>(null);
  const save = useCallback(async (silent = true) => {
    const cur = docRef.current;
    if (!cur || !dirtyRef.current || conflictRef.current) return;
    // QA-v2: UTF-16 length 는 한글에서 과소 측정 — 실제 바이트로 판정
    const approxSize = new TextEncoder().encode(JSON.stringify(cur.pages)).length;
    if (approxSize > 980_000) {
      // Firestore 문서 한도(1MiB) — 시도 자체를 막고 지속 배너로 알림 (침묵 실패 방지)
      // 신뢰성(2026-07-04): 저장 불가 구간의 편집이 탭 크래시로 전부 유실되지 않도록 로컬 백업
      try {
        localStorage.setItem(
          `studio_backup_${cur.id}`,
          JSON.stringify({ title: cur.title, pages: cur.pages, at: Date.now() }),
        );
      } catch {
        /* 저장소 부족 등은 무시 */
      }
      setSaveError(
        "문서 용량이 1MB 한도를 초과해 저장할 수 없습니다. 삽입 이미지를 삭제하거나 페이지를 나눠주세요. (편집 내용은 이 브라우저에 임시 백업됨)",
      );
      return;
    }
    // QA-v2: 다른 탭/기기 동시 편집 감지 (30초 스로틀) — 무경고 덮어쓰기 방지
    if (Date.now() - lastConflictCheckRef.current > 30_000) {
      lastConflictCheckRef.current = Date.now();
      try {
        const fresh = await designDocsApi.get(cur.id);
        const serverSavedAt = (fresh as { lastSavedAt?: string } | null)?.lastSavedAt ?? null;
        // QA-v3 M: baseline 이 null(첫 저장 전)이어도 서버에 저장 기록이 있으면 충돌 —
        // 기존 조건은 "첫 저장 전" 창구로 무경고 덮어쓰기를 통과시켰다.
        if (serverSavedAt && serverSavedAt !== baseSavedAtRef.current) {
          conflictRef.current = true;
          // QA-v3 M: 충돌 경로도 로컬 백업 — "새로고침하세요" 안내를 따르면 이 탭의 편집이 유실됐음
          try {
            localStorage.setItem(
              `studio_backup_${cur.id}`,
              JSON.stringify({ title: cur.title, pages: cur.pages, at: Date.now() }),
            );
          } catch {
            /* 무시 */
          }
          setSaveError(
            "다른 탭/기기에서 이 문서가 수정되었습니다. 덮어쓰기를 막기 위해 이 탭의 저장을 중단했어요 — 이 탭의 편집 내용은 브라우저에 임시 백업됐습니다. 새로고침해 최신 내용을 확인하세요.",
          );
          return;
        }
      } catch {
        // 확인 실패(오프라인 등)는 저장을 막지 않음
      }
    }
    setSaving(true);
    // 레이스 방지: await 전에 dirty 를 내리고, 실패 시 복구.
    // await 중 새 편집이 오면 mutate 가 다시 true 로 올리므로 유실되지 않는다.
    dirtyRef.current = false;
    try {
      const now = new Date().toISOString();
      await designDocsApi.update(cur.id, { pages: cur.pages, title: cur.title, lastSavedAt: now, updatedAt: now });
      baseSavedAtRef.current = now;
      setSavedAt(now);
      setSaveError(null);
      // 저장 성공 시 로컬 백업 정리 (오래된 백업이 다음 로드에서 복구 제안되지 않도록)
      try {
        localStorage.removeItem(`studio_backup_${cur.id}`);
      } catch {
        /* 무시 */
      }
      if (!streakLoggedRef.current && user?.id) {
        streakLoggedRef.current = true;
        const d = new Date();
        const ymdKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        void streakEventsApi.add({ userId: user.id, type: "studio-edit", refId: ymdKey, points: 2 }).catch(() => {});
      }
      if (!silent) toast.success("저장되었습니다.");
    } catch {
      dirtyRef.current = true;
      try {
        localStorage.setItem(
          `studio_backup_${cur.id}`,
          JSON.stringify({ title: cur.title, pages: cur.pages, at: Date.now() }),
        );
      } catch {
        /* 무시 */
      }
      setSaveError("저장에 실패했습니다. 네트워크를 확인하세요 — 편집 내용은 이 브라우저에 임시 백업됐습니다.");
      if (!silent) toast.error("저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  }, []);

  useEffect(() => {
    if (readOnly) return;
    const t = setInterval(() => void save(true), 3000);
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (dirtyRef.current) e.preventDefault();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      clearInterval(t);
      window.removeEventListener("beforeunload", onBeforeUnload);
      // SPA 내 이동 시 마지막 편집 flush (3초 미만 편집 유실 방지)
      void save(true);
    };
  }, [save, readOnly]);

  // undo/삭제로 페이지 수가 줄어도 항상 유효 인덱스
  const safePageIdx = doc ? Math.min(pageIdx, doc.pages.length - 1) : 0;
  useEffect(() => {
    if (doc && pageIdx !== safePageIdx) setPageIdx(safePageIdx);
  }, [doc, pageIdx, safePageIdx]);
  const page: DesignPage | undefined = doc?.pages[safePageIdx];
  const selected = useMemo(
    () => page?.elements.find((e) => e.id === selectedId) ?? null,
    [page, selectedId],
  );

  const patchPage = useCallback((fn: (p: DesignPage) => DesignPage) => {
    mutate((d) => ({ ...d, pages: d.pages.map((p, i) => (i === safePageIdx ? fn(p) : p)) }));
  }, [mutate, safePageIdx]);

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
    if (readOnly || !selectedId) return;
    // QA-v2: keydown 이펙트의 stale closure 가 잠금 직후 상태를 못 봐 잠긴 요소가 삭제되던 문제
    // — 항상 최신인 docRef 에서 잠금 상태를 판정한다.
    const el = docRef.current?.pages
      .flatMap((p) => p.elements)
      .find((e) => e.id === selectedId);
    if (el?.locked) {
      toast.info("잠긴 요소입니다. 잠금을 해제한 뒤 삭제하세요.");
      return;
    }
    patchPage((p) => ({ ...p, elements: p.elements.filter((e) => e.id !== selectedId) }));
    setSelectedId(null);
  }

  function reorderSelected(dir: 1 | -1) {
    if (readOnly || !selectedId) return;
    // QA-v3 L: 잠긴 요소는 z-순서도 고정
    const cur = docRef.current?.pages.flatMap((p) => p.elements).find((e) => e.id === selectedId);
    if (cur?.locked) {
      toast.info("잠긴 요소입니다. 잠금을 해제한 뒤 순서를 바꾸세요.");
      return;
    }
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
      const t = e.target as HTMLElement;
      const typing = !!t.closest("input, textarea, select, [contenteditable=true]");
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z" && !typing) {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y" && !typing) {
        e.preventDefault();
        redo();
        return;
      }
      if (e.key !== "Delete" && e.key !== "Backspace") return;
      if (typing) return;
      if (selectedId) {
        e.preventDefault();
        removeSelected();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- typing/removeSelected excluded to prevent resubscription churn on every keystroke
  }, [selectedId, pageIdx, undo, redo]);

  // ── 드래그/리사이즈 ──
  const dragRef = useRef<DragState>(null);

  const onPointerMove = useCallback((e: PointerEvent) => {
    const drag = dragRef.current;
    if (!drag) return;
    // P2(2026-07-04): 멀티터치 — 드래그를 시작한 포인터의 이동만 반영
    if (drag.pointerId !== undefined && e.pointerId !== drag.pointerId) return;
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

  const onPointerUp = useCallback((e?: PointerEvent) => {
    const drag = dragRef.current;
    // P2: 다른 손가락의 pointerup 이 드래그 전체를 해제하지 않도록
    if (e && drag && drag.pointerId !== undefined && e.pointerId !== drag.pointerId) return;
    dragRef.current = null;
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", onPointerUp);
    window.removeEventListener("pointercancel", onPointerUp);
  }, [onPointerMove]);

  // P2: 드래그 중 언마운트 시 window 리스너 누수 방지
  useEffect(() => {
    return () => {
      dragRef.current = null;
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
    };
  }, [onPointerMove, onPointerUp]);

  function startMove(e: React.PointerEvent, el: DesignElement) {
    if (readOnly) return;
    e.preventDefault();
    e.stopPropagation();
    setSelectedId(el.id);
    // 잠금: 선택·패널 편집(잠금 해제 포함)은 허용, 드래그 이동만 차단
    if (el.locked) return;
    dragRef.current = { mode: "move", elId: el.id, pointerId: e.pointerId, startX: e.clientX, startY: e.clientY, origX: el.x, origY: el.y };
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
  }

  function startResize(e: React.PointerEvent, el: DesignElement, corner: "nw" | "ne" | "sw" | "se") {
    if (readOnly || el.locked) return;
    e.preventDefault();
    e.stopPropagation();
    dragRef.current = { mode: "resize", elId: el.id, pointerId: e.pointerId, corner, startX: e.clientX, startY: e.clientY, orig: { x: el.x, y: el.y, w: el.w, h: el.h } };
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
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

  // ── 매직 리사이즈 (2026-07-18, 벤치마크 M2) ──
  // 현재 디자인을 다른 포맷으로 "복제". 새 문서로 저장 후 이동 — 원본은 그대로.
  const [resizing, setResizing] = useState(false);
  async function magicResize(preset: (typeof DESIGN_RESIZE_PRESETS)[number]) {
    if (!doc || !user || resizing || readOnly) return;
    setResizeMenuOpen(false);
    setResizing(true);
    try {
      await save(true);
      const now = new Date().toISOString();
      const created = await designDocsApi.create({
        userId: user.id,
        authorName: user.name,
        docType: doc.docType,
        canvasSize: preset.size,
        title: `${doc.title} (${preset.label})`,
        pages: resizePages(doc.pages, size, preset.size),
        ...(doc.linked ? { linked: doc.linked } : {}),
        published: false,
        createdAt: now,
        updatedAt: now,
      });
      toast.success(`${preset.label} 포맷으로 복제했습니다. 위치를 다듬어 완성하세요.`);
      router.push(`/studio/${(created as DesignDocument).id}`);
    } catch (err) {
      console.error("[studio] magic resize failed", err);
      toast.error("리사이즈에 실패했습니다.");
    } finally {
      setResizing(false);
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
          onChange={(e) => {
            // P2(2026-07-04): 제목은 undo 스냅샷(pages) 밖 — mutate 를 쓰면 redo 스택만 파괴됨
            setDoc((d) => (d ? { ...d, title: e.target.value } : d));
            dirtyRef.current = true;
          }}
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
          {saveError ? (
            <span className="rounded-md bg-destructive/10 px-2 py-1 text-xs font-semibold text-destructive">
              ⚠ {saveError}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">
              {saving ? "저장 중…" : savedAt ? `자동 저장됨 ${new Date(savedAt).toLocaleTimeString("ko-KR")}` : ""}
            </span>
          )}
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
            {(
              [
                { k: "png", label: "PNG", title: "현재 페이지를 이미지로 저장" },
                { k: "zip", label: "전체 ZIP", title: "모든 페이지 이미지를 압축파일로" },
                { k: "pdf", label: "PDF", title: "전체 페이지를 PDF 문서로" },
                { k: "pptx", label: "PPT", title: "파워포인트(pptx) 파일로" },
              ] as const
            ).map(({ k, label, title }) => (
              <Button key={k} size="sm" variant="outline" title={title} disabled={exporting !== null} onClick={() => void runExport(k)}>
                {exporting === k ? <Loader2 size={13} className="mr-1 animate-spin" /> : <Download size={13} className="mr-1" />}
                {label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* 툴바 */}
      {!readOnly && (
        <div className="relative mt-3 flex flex-wrap items-center gap-1.5 rounded-xl border bg-card p-2" data-studio-toolbar>
          <Button size="sm" variant="ghost" title="실행취소 (Ctrl+Z)" disabled={undoStack.current.length === 0} onClick={undo}><Undo2 size={15} /></Button>
          <Button size="sm" variant="ghost" title="다시실행 (Ctrl+Shift+Z)" disabled={redoStack.current.length === 0} onClick={redo}><Redo2 size={15} /></Button>
          <span className="mx-1 h-5 w-px bg-border" />
          <Button size="sm" variant="ghost" onClick={() => addElement(makeText({ fontSize: Math.round(size.width * 0.04) }))}><Type size={15} className="mr-1" />텍스트</Button>
          <Button size="sm" variant="ghost" onClick={() => addElement(makeShape("rect"))}><Square size={15} className="mr-1" />사각형</Button>
          <Button size="sm" variant="ghost" onClick={() => addElement(makeShape("circle"))}><Circle size={15} className="mr-1" />원</Button>
          <Button size="sm" variant="ghost" onClick={() => addElement(makeShape("line"))}><Minus size={15} className="mr-1" />선</Button>
          <Button size="sm" variant="ghost" onClick={() => { const v = !iconPickerOpen; closeAllPopovers(); setIconPickerOpen(v); }}><Smile size={15} className="mr-1" />아이콘</Button>
          <Button size="sm" variant="ghost" onClick={() => { const v = !imageMenuOpen; closeAllPopovers(); setImageMenuOpen(v); }}><ImagePlus size={15} className="mr-1" />이미지</Button>
          <span className="mx-1 h-5 w-px bg-border" />
          <Button size="sm" variant="ghost" onClick={() => { const v = !brandPanelOpen; closeAllPopovers(); setBrandPanelOpen(v); }}><Sparkles size={15} className="mr-1" />브랜드</Button>
          <Button size="sm" variant="ghost" title="다른 포맷으로 복제 (매직 리사이즈)" onClick={() => { const v = !resizeMenuOpen; closeAllPopovers(); setResizeMenuOpen(v); }}><Maximize2 size={15} className="mr-1" />리사이즈</Button>
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

          {brandPanelOpen && (
            <div className="absolute left-2 top-full z-20 mt-1 w-72 space-y-3 rounded-xl border bg-popover p-3 shadow-md">
              <p className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
                <Sparkles size={12} />학회 브랜드 킷
              </p>
              <div>
                <p className="mb-1 text-[11px] font-semibold text-muted-foreground">브랜드 배경</p>
                <div className="flex flex-wrap gap-1.5">
                  {([
                    ["네이비", BRAND_PALETTE.navy],
                    ["골드", BRAND_PALETTE.gold],
                    ["페이퍼", BRAND_PALETTE.paper],
                    ["딥그린", BRAND_PALETTE.green],
                    ["흰색", BRAND_PALETTE.white],
                  ] as const).map(([label, c]) => (
                    <button
                      key={c}
                      type="button"
                      title={`배경 ${label}`}
                      onClick={() => patchPage((p) => ({ ...p, background: c }))}
                      className={cn(
                        "flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[11px] hover:bg-accent",
                        page.background === c && "ring-2 ring-primary ring-offset-1",
                      )}
                    >
                      <span className="h-3.5 w-3.5 rounded-full border" style={{ background: c }} />
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-1 text-[11px] font-semibold text-muted-foreground">로고 삽입</p>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => { addElement(makeImage(BRAND_LOGOS.emblem, { fit: "contain", w: Math.round(size.width * 0.16), h: Math.round(size.width * 0.16) })); setBrandPanelOpen(false); }}
                    className="rounded-lg border px-2 py-1 text-xs hover:bg-accent"
                  >
                    엠블럼
                  </button>
                  <button
                    type="button"
                    onClick={() => { addElement(makeImage(BRAND_LOGOS.textLogo, { fit: "contain", w: Math.round(size.width * 0.4), h: Math.round(size.width * 0.12) })); setBrandPanelOpen(false); }}
                    className="rounded-lg border px-2 py-1 text-xs hover:bg-accent"
                  >
                    텍스트 로고
                  </button>
                </div>
              </div>
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                요소 색은 오른쪽 속성 패널의 브랜드 스와치로 통일하세요.
              </p>
            </div>
          )}

          {resizeMenuOpen && (
            <div data-studio-resize className="absolute left-2 top-full z-20 mt-1 w-72 space-y-2 rounded-xl border bg-popover p-3 shadow-md">
              <p className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
                <Maximize2 size={12} />다른 포맷으로 복제 (매직 리사이즈)
              </p>
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                현재 디자인을 새 크기로 <b>복제</b>합니다(원본 유지). 요소는 비례 축소·중앙 정렬되니 위치를 다듬어 완성하세요.
              </p>
              {DESIGN_RESIZE_PRESETS.map((preset) => (
                <button
                  key={preset.key}
                  type="button"
                  disabled={resizing}
                  onClick={() => void magicResize(preset)}
                  className="flex w-full items-center justify-between rounded-lg border px-2.5 py-2 text-left text-xs hover:bg-accent disabled:opacity-60"
                >
                  <span className="font-semibold">{preset.label}</span>
                  <span className="text-[11px] text-muted-foreground">{preset.size.width}×{preset.size.height}</span>
                </button>
              ))}
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
        <div ref={canvasHostRef} className="flex items-start justify-start overflow-auto rounded-xl border bg-muted/30 p-4 sm:justify-center">
          <div onPointerDown={() => setSelectedId(null)}>
            <PageCanvas page={page} width={size.width} height={size.height} scale={scale} className="rounded-md shadow-md">
              {/* 편집 오버레이 — 문서 좌표계 내부 (scale 자동 적용) */}
              {page.elements.map((el) => {
                const isSel = el.id === selectedId;
                return (
                  <div
                    key={`ov-${el.id}`}
                    onPointerDown={(e) => startMove(e, el)}
                    onDoubleClick={() => {
                      if (!readOnly && el.type === "text" && !el.locked) setEditingTextId(el.id);
                    }}
                    style={{
                      position: "absolute",
                      left: el.x,
                      top: el.y,
                      width: el.w,
                      height: el.h,
                      cursor: el.locked ? "default" : "move",
                      touchAction: "none",
                      outline: isSel ? `${Math.max(2, 2 / scale)}px solid #0a4da3` : undefined,
                      outlineOffset: 2,
                    }}
                  >
                    {editingTextId === el.id && el.type === "text" && (
                      <textarea
                        autoFocus
                        value={el.text}
                        onChange={(e) => patchElement(el.id, { text: e.target.value })}
                        onBlur={() => setEditingTextId(null)}
                        onKeyDown={(e) => {
                          if (e.key === "Escape") setEditingTextId(null);
                          e.stopPropagation();
                        }}
                        onPointerDown={(e) => e.stopPropagation()}
                        style={{
                          position: "absolute",
                          inset: 0,
                          width: "100%",
                          height: "100%",
                          resize: "none",
                          background: "rgba(255,255,255,0.92)",
                          border: `${2 / scale}px dashed #0a4da3`,
                          outline: "none",
                          padding: 0,
                          fontSize: el.fontSize,
                          fontWeight: el.fontWeight,
                          fontFamily: el.fontFamily === "display" ? "var(--font-display)" : "var(--font-sans)",
                          color: el.color,
                          textAlign: el.align,
                          lineHeight: el.lineHeight ?? 1.35,
                          overflow: "hidden",
                        }}
                      />
                    )}
                    {isSel && !readOnly && editingTextId !== el.id && (["nw", "ne", "sw", "se"] as const).map((corner) => (
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
              요소를 클릭해 선택하세요. 드래그 이동 · 모서리 핸들 크기 조절 · 텍스트는 더블클릭으로 바로 편집 · Delete 삭제 · Ctrl+Z 실행취소.
            </p>
          ) : (
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold">
                  {selected.type === "text" ? "텍스트" : selected.type === "image" ? "이미지" : selected.type === "shape" ? "도형" : "아이콘"}
                </span>
                <div className="flex gap-1">
                  {selected.type === "text" && !readOnly && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-1.5 text-[11px]"
                      title="캔버스에서 바로 편집 (터치 기기는 더블탭이 안 돼 이 버튼 사용)"
                      onClick={() => setEditingTextId(selected.id)}
                    >
                      <Type size={13} className="mr-0.5" />
                      편집
                    </Button>
                  )}
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
                      disabled={selected.locked}
                      onChange={(e) => {
                        const v = Number(e.target.value) || 0;
                        // w/h 최소 20px — 0 크기로 요소가 사라지는 사고 방지
                        patchElement(selected.id, { [k]: k === "w" || k === "h" ? Math.max(20, v) : v } as Partial<DesignElement>);
                      }} />
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
