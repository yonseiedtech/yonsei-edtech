"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useSeminars, useAttendees } from "@/features/seminar/useSeminar";
import { useAuthStore } from "@/features/auth/auth-store";
import { certificatesApi } from "@/lib/bkend";
import { notifyCertificateIssued } from "@/features/notifications/notify";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Download, Printer, Award, Heart, Plus, Settings, Check, UserPlus, Eye, X, AlignLeft, AlignCenter, AlignRight, AlignJustify, ZoomIn, ZoomOut, FileDown, Palette, AlignVerticalJustifyCenter, AlignHorizontalJustifyCenter, ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type CertType = "completion" | "appreciation";

const CERT_LABELS: Record<CertType, { label: string; icon: React.ReactNode }> = {
  completion: { label: "수료증", icon: <Award size={16} /> },
  appreciation: { label: "감사장", icon: <Heart size={16} /> },
};

/** 참석자 현황 + 발급 대상자 2패널 컴포넌트 */
function AttendeeSelector({ attendees, seminarId, certType, onSelectName, onBatchCreate }: {
  attendees: { id: string; userName: string; checkedIn: boolean }[];
  seminarId: string;
  certType: CertType;
  onSelectName: (name: string) => void;
  onBatchCreate: (names: string[], onProgress?: (current: number, total: number) => void) => Promise<void>;
}) {
  const [recipients, setRecipients] = useState<string[]>([]);
  const [filter, setFilter] = useState<"all" | "checked" | "unchecked">(certType === "completion" ? "checked" : "all");
  const [creating, setCreating] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [manualName, setManualName] = useState("");

  const { data: existingCerts = [] } = useQuery({
    queryKey: ["certificates", seminarId],
    queryFn: async () => {
      const res = await certificatesApi.list(seminarId);
      return res.data as unknown as { recipientName: string; type: string }[];
    },
  });
  const issuedNames = new Set(existingCerts.filter((c) => c.type === certType).map((c) => c.recipientName));

  const filtered = attendees.filter((a) => {
    if (filter === "checked") return a.checkedIn;
    if (filter === "unchecked") return !a.checkedIn;
    return true;
  });

  function addRecipient(name: string) {
    if (recipients.includes(name)) { toast.error(`${name}님이 이미 대상자에 있습니다.`); return; }
    if (issuedNames.has(name)) { toast.error(`${name}님에게 이미 발급되었습니다.`); return; }
    // 수료증은 출석자만 발급 가능
    if (certType === "completion") {
      const att = attendees.find((a) => a.userName === name);
      if (att && !att.checkedIn) { toast.error(`${name}님은 미출석 상태입니다. 수료증은 출석자만 발급 가능합니다.`); return; }
    }
    setRecipients((prev) => [...prev, name]);
  }

  function removeRecipient(name: string) {
    setRecipients((prev) => prev.filter((n) => n !== name));
  }

  function addAllCheckedIn() {
    const names = attendees.filter((a) => a.checkedIn && !issuedNames.has(a.userName) && !recipients.includes(a.userName)).map((a) => a.userName);
    if (names.length === 0) { toast.error("추가할 출석자가 없습니다."); return; }
    setRecipients((prev) => [...prev, ...names]);
    toast.success(`${names.length}명 추가됨`);
  }

  function addManual() {
    if (!manualName.trim()) return;
    addRecipient(manualName.trim());
    setManualName("");
  }

  async function handleBatchIssue() {
    if (recipients.length === 0) { toast.error("발급 대상자를 추가하세요."); return; }
    setCreating(true);
    setProgress({ current: 0, total: recipients.length });
    await onBatchCreate(recipients, (current, total) => setProgress({ current, total }));
    setRecipients([]);
    setCreating(false);
    setProgress({ current: 0, total: 0 });
  }

  return (
    <div className="mt-4 space-y-3">
      {/* 패널 1: 참석자 현황 */}
      <div className="rounded-lg border bg-muted/30 p-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold">참석자 현황 <span className="font-normal text-muted-foreground">({attendees.length}명)</span></p>
          <div className="flex gap-1">
            {(["all", "checked", "unchecked"] as const).map((f) => (
              <button key={f} onClick={() => setFilter(f)} className={cn("rounded px-2 py-0.5 text-[10px] font-medium", filter === f ? "bg-primary text-white" : "bg-white text-muted-foreground")}>
                {f === "all" ? "전체" : f === "checked" ? "출석" : "미출석"}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-1">
          <Button variant="outline" size="sm" className="h-6 text-[10px]" onClick={addAllCheckedIn}>
            <Plus size={10} className="mr-0.5" />출석자 전체 추가
          </Button>
        </div>

        <div className="mt-2 max-h-36 space-y-0.5 overflow-y-auto">
          {filtered.map((att) => {
            const issued = issuedNames.has(att.userName);
            const inRecipients = recipients.includes(att.userName);
            return (
              <div key={att.id} className={cn("flex items-center justify-between rounded px-2 py-1 text-xs", (issued || inRecipients) && "opacity-40")}>
                <span className="flex items-center gap-1.5">
                  {att.userName}
                  {att.checkedIn && <Badge variant="secondary" className="h-4 text-[9px] bg-green-50 text-green-700">출석</Badge>}
                  {issued && <Badge variant="secondary" className="h-4 text-[9px]">발급완료</Badge>}
                  {inRecipients && <Badge variant="secondary" className="h-4 text-[9px] bg-blue-50 text-blue-700">대상자</Badge>}
                </span>
                {!issued && !inRecipients && (
                  certType === "completion" && !att.checkedIn ? (
                    <span className="text-[9px] text-muted-foreground">미출석</span>
                  ) : (
                    <Button variant="ghost" size="sm" className="h-5 px-1.5 text-[10px]" onClick={() => addRecipient(att.userName)}>
                      <Plus size={10} />추가
                    </Button>
                  )
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 패널 2: 발급 대상자 */}
      <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
        <p className="text-xs font-semibold text-primary">발급 대상자 <span className="font-normal">({recipients.length}명)</span></p>

        {recipients.length === 0 ? (
          <p className="mt-2 text-center text-[11px] text-muted-foreground">참석자 현황에서 "추가" 버튼을 눌러 대상자를 추가하세요.</p>
        ) : (
          <div className="mt-2 max-h-32 space-y-0.5 overflow-y-auto">
            {recipients.map((name) => (
              <div key={name} className="flex items-center justify-between rounded bg-white px-2 py-1 text-xs">
                <span>{name}</span>
                <button onClick={() => removeRecipient(name)} className="rounded p-0.5 text-muted-foreground hover:bg-red-50 hover:text-red-500">
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* 수기 추가 */}
        <div className="mt-2 flex gap-1">
          <Input value={manualName} onChange={(e) => setManualName(e.target.value)} placeholder="수기 입력" className="h-7 text-xs" onKeyDown={(e) => e.key === "Enter" && addManual()} />
          <Button variant="outline" size="sm" className="h-7 shrink-0 text-[10px]" onClick={addManual} disabled={!manualName.trim()}>추가</Button>
        </div>

        {/* 발급 버튼 */}
        <div className="mt-2 flex gap-1">
          <Button size="sm" className="h-8 flex-1 gap-1 text-xs" disabled={recipients.length === 0 || creating} onClick={handleBatchIssue}>
            {creating ? (
              <>{progress.current}/{progress.total} ({Math.round((progress.current / progress.total) * 100)}%)</>
            ) : (
              <><Award size={12} />{recipients.length}명 {certType === "completion" ? "수료증" : "감사장"} 일괄 발급</>
            )}
          </Button>
          {recipients.length === 1 && (
            <Button variant="outline" size="sm" className="h-8 gap-1 text-xs" onClick={() => onSelectName(recipients[0])}>
              <Eye size={12} />미리보기
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

/** 이름 자간: "홍길동" → "홍 길 동" */
function spacedName(name: string): string {
  return name.split("").join("\u2002");
}

/** 현재 최대 증서번호를 조회하여 다음 번호 반환 */
async function generateCertificateNo(certType: CertType = "completion"): Promise<string> {
  const yy = String(new Date().getFullYear()).slice(-2);
  const prefix = certType === "completion" ? "C" : "A"; // C=수료증, A=감사장
  const tag = `${prefix}${yy}-`;
  try {
    const existing = await certificatesApi.list(undefined, certType);
    let maxNum = 0;
    for (const c of existing.data) {
      const no = (c as Record<string, unknown>).certificateNo as string | undefined;
      if (no && no.startsWith(tag)) {
        const num = parseInt(no.split("-")[1], 10);
        if (!isNaN(num) && num > maxNum) maxNum = num;
      }
    }
    return `${tag}${String(maxNum + 1).padStart(3, "0")}`;
  } catch {
    return `${tag}001`;
  }
}

/** 일괄 발급용: 시작 번호를 한 번 조회 후 로컬에서 증가 */
async function generateCertificateNoBatch(certType: CertType, count: number): Promise<string[]> {
  const yy = String(new Date().getFullYear()).slice(-2);
  const prefix = certType === "completion" ? "C" : "A";
  const tag = `${prefix}${yy}-`;
  let maxNum = 0;
  try {
    const existing = await certificatesApi.list(undefined, certType);
    for (const c of existing.data) {
      const no = (c as Record<string, unknown>).certificateNo as string | undefined;
      if (no && no.startsWith(tag)) {
        const num = parseInt(no.split("-")[1], 10);
        if (!isNaN(num) && num > maxNum) maxNum = num;
      }
    }
  } catch { /* fallback to 0 */ }
  return Array.from({ length: count }, (_, i) =>
    `${tag}${String(maxNum + 1 + i).padStart(3, "0")}`
  );
}

/* ─────────────────────────────────────────────
 * 감사장/수료증 프리뷰 — pptx 원본 기반 디자인
 * 폰트: 함렛 / Noto Serif KR / 고운바탕 등 한글 웹폰트
 * ───────────────────────────────────────────── */

interface CertStyle {
  fontFamily: string;
  borderColor: string;
}

/** 영역별 세부 스타일 */
interface AreaStyle {
  fontSize: string;
  letterSpacing: string;
  lineHeight: string;
  marginTop: string;
  marginBottom: string;
  offsetX: number; // px 단위 드래그 오프셋
  offsetY: number;
  textAlign: "left" | "center" | "right" | "justify";
  /** 개체 전체 크기 배율 (기본 1.0) — PPT 모서리 드래그 시 변경 */
  scale?: number;
}

type AreaKey = "certNo" | "title" | "name" | "body" | "date" | "org";

const AREA_LABELS: Record<AreaKey, string> = {
  certNo: "증서 번호",
  title: "제목",
  name: "수여자 이름",
  body: "본문",
  date: "날짜",
  org: "학회명",
};

const DEFAULT_AREA_STYLES: Record<AreaKey, AreaStyle> = {
  certNo: { fontSize: "11pt", letterSpacing: "0.08em", lineHeight: "1.4", marginTop: "0mm", marginBottom: "20mm", offsetX: 0, offsetY: 0, textAlign: "left" },
  title: { fontSize: "42pt", letterSpacing: "0.3em", lineHeight: "1.2", marginTop: "0mm", marginBottom: "5mm", offsetX: 0, offsetY: 0, textAlign: "center" },
  name: { fontSize: "26pt", letterSpacing: "0.25em", lineHeight: "1.4", marginTop: "0mm", marginBottom: "14mm", offsetX: 0, offsetY: 0, textAlign: "right" },
  body: { fontSize: "12.5pt", letterSpacing: "0em", lineHeight: "2.5", marginTop: "0mm", marginBottom: "0mm", offsetX: 0, offsetY: 0, textAlign: "justify" },
  date: { fontSize: "13pt", letterSpacing: "0.15em", lineHeight: "1.4", marginTop: "22mm", marginBottom: "0mm", offsetX: 0, offsetY: 0, textAlign: "center" },
  org: { fontSize: "26px", letterSpacing: "0.2em", lineHeight: "1.2", marginTop: "18mm", marginBottom: "0mm", offsetX: 0, offsetY: 0, textAlign: "center" },
};

export const CERT_STYLE_STORAGE_KEY = "cert-area-styles";
const CERT_TEMPLATES_KEY = "cert-templates";

interface CertTemplate {
  name: string;
  certType: CertType;
  fontFamily: string;
  borderColor: string;
  bodyText: string;
  areaStyles: Record<AreaKey, AreaStyle>;
  createdAt: string;
}

/** 드래그 가능한 영역 래퍼 */
function DraggableArea({
  areaKey,
  offsetX,
  offsetY,
  editable,
  onDragEnd,
  selectedAreas,
  onSelect,
  scale = 0.6,
  snapPx = 0,
  boxScale = 1,
  onResize,
  onGuides,
  children,
}: {
  areaKey: AreaKey;
  offsetX: number;
  offsetY: number;
  editable: boolean;
  onDragEnd: (key: AreaKey, dx: number, dy: number) => void;
  selectedAreas: AreaKey[];
  onSelect: (key: AreaKey, ctrlKey: boolean) => void;
  scale?: number;
  /** 격자 스냅 크기(px, 0이면 비활성) */
  snapPx?: number;
  /** 개체 배율 (PPT 모서리 드래그) */
  boxScale?: number;
  onResize?: (key: AreaKey, newScale: number) => void;
  /** 드래그 중 가이드 라인 업데이트 (부모가 렌더링, 캔버스 절대 좌표) */
  onGuides?: (lines: { axis: "x" | "y"; at: number }[]) => void;
  children: React.ReactNode;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const startPos = useRef({ x: 0, y: 0 });
  const startOffset = useRef({ x: 0, y: 0 });
  const [localOffset, setLocalOffset] = useState({ x: 0, y: 0 });
  const isSelected = selectedAreas.includes(areaKey);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!editable) return;
      e.preventDefault();
      e.stopPropagation();
      onSelect(areaKey, e.ctrlKey || e.metaKey);
      dragging.current = true;
      startPos.current = { x: e.clientX, y: e.clientY };
      startOffset.current = { x: offsetX, y: offsetY };
      setLocalOffset({ x: 0, y: 0 });

      const SMART_TOL = 6; // px 허용 오차
      // 캔버스 기준 좌표계로 자신 + peer의 edge/center를 계산
      const canvas = rootRef.current?.closest("[data-cert-canvas]") as HTMLElement | null;
      const cRect = canvas?.getBoundingClientRect();
      type Rect = { key: string; left: number; right: number; top: number; bottom: number; cx: number; cy: number };
      const measureAll = (): { self: Rect | null; others: Rect[] } => {
        if (!canvas || !cRect) return { self: null, others: [] };
        const rects: Rect[] = Array.from(canvas.querySelectorAll<HTMLElement>("[data-area-key]")).map((el) => {
          const r = el.getBoundingClientRect();
          return {
            key: el.dataset.areaKey || "",
            left: (r.left - cRect.left) / scale,
            right: (r.right - cRect.left) / scale,
            top: (r.top - cRect.top) / scale,
            bottom: (r.bottom - cRect.top) / scale,
            cx: (r.left + r.right - 2 * cRect.left) / (2 * scale),
            cy: (r.top + r.bottom - 2 * cRect.top) / (2 * scale),
          };
        });
        const self = rects.find((r) => r.key === areaKey) || null;
        const others = rects.filter((r) => r.key !== areaKey);
        return { self, others };
      };
      const { self: selfAtStart, others } = measureAll();

      const applySnapAndLock = (dx: number, dy: number, ev: MouseEvent) => {
        if (ev.shiftKey) {
          if (Math.abs(dx) > Math.abs(dy)) dy = 0;
          else dx = 0;
        }
        let finalDx = dx;
        let finalDy = dy;
        const guides: { axis: "x" | "y"; at: number }[] = [];
        if (selfAtStart && others.length > 0) {
          // 가상의 현재 위치 = 시작 rect + (dx, dy)
          const cur = {
            left: selfAtStart.left + dx, right: selfAtStart.right + dx, cx: selfAtStart.cx + dx,
            top: selfAtStart.top + dy, bottom: selfAtStart.bottom + dy, cy: selfAtStart.cy + dy,
          };
          // 수직 가이드 (세로선): x-축 정렬 — 가장 가까운 매칭으로 스냅, 이후 정렬되는 모든 지점에 가이드
          let bestXDelta: number | null = null;
          for (const p of others) {
            for (const selfVal of [cur.left, cur.right, cur.cx]) {
              for (const peerVal of [p.left, p.right, p.cx]) {
                const diff = peerVal - selfVal;
                if (Math.abs(diff) <= SMART_TOL) {
                  if (bestXDelta === null || Math.abs(diff) < Math.abs(bestXDelta)) {
                    bestXDelta = diff;
                  }
                }
              }
            }
          }
          if (bestXDelta !== null) {
            finalDx = dx + bestXDelta;
            const snappedCur = { left: cur.left + bestXDelta, right: cur.right + bestXDelta, cx: cur.cx + bestXDelta };
            const seen = new Set<number>();
            for (const p of others) {
              for (const selfVal of [snappedCur.left, snappedCur.right, snappedCur.cx]) {
                for (const peerVal of [p.left, p.right, p.cx]) {
                  if (Math.abs(peerVal - selfVal) <= 0.5) {
                    const at = Math.round(peerVal * 10) / 10;
                    if (!seen.has(at)) { seen.add(at); guides.push({ axis: "x", at }); }
                  }
                }
              }
            }
          }
          // 수평 가이드 (가로선): y-축 정렬
          let bestYDelta: number | null = null;
          for (const p of others) {
            for (const selfVal of [cur.top, cur.bottom, cur.cy]) {
              for (const peerVal of [p.top, p.bottom, p.cy]) {
                const diff = peerVal - selfVal;
                if (Math.abs(diff) <= SMART_TOL) {
                  if (bestYDelta === null || Math.abs(diff) < Math.abs(bestYDelta)) {
                    bestYDelta = diff;
                  }
                }
              }
            }
          }
          if (bestYDelta !== null) {
            finalDy = dy + bestYDelta;
            const snappedCur = { top: cur.top + bestYDelta, bottom: cur.bottom + bestYDelta, cy: cur.cy + bestYDelta };
            const seen = new Set<number>();
            for (const p of others) {
              for (const selfVal of [snappedCur.top, snappedCur.bottom, snappedCur.cy]) {
                for (const peerVal of [p.top, p.bottom, p.cy]) {
                  if (Math.abs(peerVal - selfVal) <= 0.5) {
                    const at = Math.round(peerVal * 10) / 10;
                    if (!seen.has(at)) { seen.add(at); guides.push({ axis: "y", at }); }
                  }
                }
              }
            }
          }
        }
        // 가이드 미발동 시에만 격자 스냅
        if (snapPx > 0 && guides.length === 0) {
          const fx = startOffset.current.x + finalDx;
          const fy = startOffset.current.y + finalDy;
          finalDx = Math.round(fx / snapPx) * snapPx - startOffset.current.x;
          finalDy = Math.round(fy / snapPx) * snapPx - startOffset.current.y;
        }
        if (onGuides) onGuides(guides);
        return { dx: finalDx, dy: finalDy };
      };

      const handleMouseMove = (ev: MouseEvent) => {
        if (!dragging.current) return;
        let dx = (ev.clientX - startPos.current.x) / scale;
        let dy = (ev.clientY - startPos.current.y) / scale;
        ({ dx, dy } = applySnapAndLock(dx, dy, ev));
        setLocalOffset({ x: dx, y: dy });
      };

      const handleMouseUp = (ev: MouseEvent) => {
        if (!dragging.current) return;
        dragging.current = false;
        let dx = (ev.clientX - startPos.current.x) / scale;
        let dy = (ev.clientY - startPos.current.y) / scale;
        ({ dx, dy } = applySnapAndLock(dx, dy, ev));
        setLocalOffset({ x: 0, y: 0 });
        onDragEnd(areaKey, startOffset.current.x + dx, startOffset.current.y + dy);
        if (onGuides) onGuides([]);
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [editable, areaKey, offsetX, offsetY, onDragEnd, onSelect, scale, snapPx, onGuides]
  );

  // 모서리 리사이즈
  const startResize = useCallback(
    (e: React.MouseEvent) => {
      if (!editable || !onResize) return;
      e.preventDefault();
      e.stopPropagation();
      onSelect(areaKey, false);
      const startY = e.clientY;
      const startScale = boxScale || 1;
      const onMove = (ev: MouseEvent) => {
        const dy = (ev.clientY - startY) / scale;
        const factor = 1 + dy / 180; // 아래로 드래그 → 키움
        const next = Math.max(0.3, Math.min(3, startScale * factor));
        onResize(areaKey, Number(next.toFixed(3)));
      };
      const onUp = () => {
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
      };
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    },
    [editable, onResize, onSelect, areaKey, boxScale, scale]
  );

  const ox = offsetX || 0;
  const oy = offsetY || 0;

  const bs = boxScale ?? 1;

  if (!editable) {
    const t =
      bs !== 1
        ? `translate(${ox}px, ${oy}px) scale(${bs})`
        : ox || oy
        ? `translate(${ox}px, ${oy}px)`
        : undefined;
    return (
      <div
        ref={rootRef}
        data-area-key={areaKey}
        style={{ transform: t, transformOrigin: "top left", display: "inline-block" }}
      >
        {children}
      </div>
    );
  }

  return (
    <div
      ref={rootRef}
      data-area-key={areaKey}
      onMouseDown={handleMouseDown}
      style={{
        transform: `translate(${ox + localOffset.x}px, ${oy + localOffset.y}px) scale(${bs})`,
        transformOrigin: "top left",
        display: "inline-block",
        cursor: "move",
        position: "relative",
        outline: isSelected ? `${2 / bs}px dashed #3b82f6` : `${1 / bs}px dashed transparent`,
        outlineOffset: `${3 / bs}px`,
        borderRadius: "4px",
        transition: dragging.current ? "none" : "outline-color 0.15s",
      }}
      onMouseEnter={(e) => {
        if (!dragging.current) (e.currentTarget as HTMLElement).style.outlineColor = "#93c5fd";
      }}
      onMouseLeave={(e) => {
        if (!dragging.current && !isSelected) (e.currentTarget as HTMLElement).style.outlineColor = "transparent";
      }}
    >
      {isSelected && (
        <>
          <span
            className="absolute rounded bg-blue-500 px-1.5 py-0.5 text-[9px] font-medium text-white"
            style={{
              zIndex: 10,
              top: `${-16 / bs}px`,
              left: 0,
              transform: `scale(${1 / bs})`,
              transformOrigin: "top left",
              whiteSpace: "nowrap",
            }}
          >
            {AREA_LABELS[areaKey]} {bs !== 1 && `· ${Math.round(bs * 100)}%`}
          </span>
          {/* 모서리 리사이즈 핸들 (우측 하단) */}
          <span
            onMouseDown={startResize}
            style={{
              position: "absolute",
              right: `${-6 / bs}px`,
              bottom: `${-6 / bs}px`,
              width: `${10 / bs}px`,
              height: `${10 / bs}px`,
              background: "#3b82f6",
              border: `${1.5 / bs}px solid #fff`,
              borderRadius: `${2 / bs}px`,
              cursor: "nwse-resize",
              zIndex: 11,
            }}
            title="드래그로 크기 조절"
          />
        </>
      )}
      {children}
    </div>
  );
}

/** 숫자+단위 파싱 유틸 */
function parseUnit(val: string): { num: number; unit: string } {
  const m = val.match(/^(-?[\d.]+)\s*(pt|px|em|mm|%)$/);
  if (m) return { num: parseFloat(m[1]), unit: m[2] };
  const n = parseFloat(val);
  return { num: isNaN(n) ? 0 : n, unit: "" };
}

/** 슬라이더 한 줄 컴포넌트 */
function StyleSlider({ label, value, unit, min, max, step, onChange }: {
  label: string; value: number; unit: string; min: number; max: number; step: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="text-[10px] text-muted-foreground">
      <span className="flex items-center justify-between">
        <span>{label}</span>
        <span className="font-mono text-[9px] text-foreground">{value}{unit}</span>
      </span>
      <input
        type="range"
        min={min} max={max} step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="mt-0.5 block h-1.5 w-full cursor-pointer accent-primary"
      />
    </label>
  );
}

const ALIGN_OPTIONS: { value: AreaStyle["textAlign"]; icon: React.ReactNode; label: string }[] = [
  { value: "left", icon: <AlignLeft size={12} />, label: "왼쪽" },
  { value: "center", icon: <AlignCenter size={12} />, label: "가운데" },
  { value: "right", icon: <AlignRight size={12} />, label: "오른쪽" },
  { value: "justify", icon: <AlignJustify size={12} />, label: "양쪽" },
];

/** 영역별 스타일 편집 컨트롤 — 슬라이더 + 맞춤 버튼 */
function AreaStyleEditor({
  areaKey,
  value,
  onChange,
}: {
  areaKey: AreaKey;
  value: AreaStyle;
  onChange: (v: AreaStyle) => void;
}) {
  const fs = parseUnit(value.fontSize);
  const ls = parseUnit(value.letterSpacing);
  const lh = parseFloat(value.lineHeight) || 1.4;
  const mt = parseUnit(value.marginTop);
  const mb = parseUnit(value.marginBottom);

  return (
    <div className="rounded-lg border bg-muted/20 p-2.5 space-y-2">
      <p className="mb-1 text-[11px] font-semibold">{AREA_LABELS[areaKey]}</p>

      {/* 텍스트 정렬 */}
      <div>
        <p className="mb-1 text-[10px] text-muted-foreground">텍스트 정렬</p>
        <div className="flex gap-0.5">
          {ALIGN_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              title={opt.label}
              onClick={() => onChange({ ...value, textAlign: opt.value })}
              className={cn(
                "flex h-6 w-7 items-center justify-center rounded border text-[10px] transition-colors",
                value.textAlign === opt.value
                  ? "border-primary bg-primary text-white"
                  : "border-muted bg-white text-muted-foreground hover:bg-muted/50"
              )}
            >
              {opt.icon}
            </button>
          ))}
        </div>
      </div>

      {/* 위치 초기화 */}
      <div className="flex gap-1">
        <button
          title="수평 위치 초기화 (X=0)"
          onClick={() => onChange({ ...value, offsetX: 0 })}
          className="flex h-6 flex-1 items-center justify-center gap-0.5 rounded border border-muted bg-white text-[9px] text-muted-foreground hover:bg-muted/50"
        >
          ↔ X 초기화
        </button>
        <button
          title="수직 위치 초기화 (Y=0)"
          onClick={() => onChange({ ...value, offsetY: 0 })}
          className="flex h-6 flex-1 items-center justify-center gap-0.5 rounded border border-muted bg-white text-[9px] text-muted-foreground hover:bg-muted/50"
        >
          ↕ Y 초기화
        </button>
      </div>

      {/* 슬라이더들 */}
      <div className="space-y-1.5">
        <StyleSlider label="크기" value={fs.num} unit={fs.unit || "pt"} min={8} max={60} step={0.5}
          onChange={(n) => onChange({ ...value, fontSize: `${n}${fs.unit || "pt"}` })} />
        <StyleSlider label="자간" value={ls.num} unit={ls.unit || "em"} min={-0.05} max={0.5} step={0.01}
          onChange={(n) => onChange({ ...value, letterSpacing: `${n}${ls.unit || "em"}` })} />
        <StyleSlider label="줄간격" value={lh} unit="" min={1.0} max={3.5} step={0.1}
          onChange={(n) => onChange({ ...value, lineHeight: String(n) })} />
        <StyleSlider label="상단 여백" value={mt.num} unit={mt.unit || "mm"} min={0} max={40} step={1}
          onChange={(n) => onChange({ ...value, marginTop: `${n}${mt.unit || "mm"}` })} />
        <StyleSlider label="하단 여백" value={mb.num} unit={mb.unit || "mm"} min={0} max={40} step={1}
          onChange={(n) => onChange({ ...value, marginBottom: `${n}${mb.unit || "mm"}` })} />
      </div>

      {/* X/Y 위치 미세조절 */}
      <div className="grid grid-cols-2 gap-x-2">
        <label className="text-[10px] text-muted-foreground">
          X (px)
          <input type="number" value={Math.round(value.offsetX)}
            onChange={(e) => onChange({ ...value, offsetX: Number(e.target.value) || 0 })}
            className="mt-0.5 block w-full rounded border px-1.5 py-0.5 text-[11px]" />
        </label>
        <label className="text-[10px] text-muted-foreground">
          Y (px)
          <input type="number" value={Math.round(value.offsetY)}
            onChange={(e) => onChange({ ...value, offsetY: Number(e.target.value) || 0 })}
            className="mt-0.5 block w-full rounded border px-1.5 py-0.5 text-[11px]" />
        </label>
      </div>

      <button
        onClick={() => onChange(DEFAULT_AREA_STYLES[areaKey])}
        className="w-full rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground hover:bg-muted/80"
      >
        이 영역 초기화
      </button>
    </div>
  );
}

export { DEFAULT_AREA_STYLES };
export type { AreaKey, AreaStyle, CertStyle };

export function CertificatePreview({
  type,
  seminarTitle,
  seminarDate,
  semester,
  recipientName,
  certificateNo,
  bodyText,
  style,
  areaStyles,
  editable = false,
  selectedAreas = [],
  onAreaDrag,
  onSelectArea,
  previewScale,
  snapPx = 0,
  showGrid = false,
  snapStep = 16,
  onAreaResize,
}: {
  type: CertType;
  seminarTitle: string;
  seminarDate: string;
  semester: string;
  recipientName: string;
  certificateNo: string;
  bodyText: string;
  style: CertStyle;
  areaStyles: Record<AreaKey, AreaStyle>;
  editable?: boolean;
  selectedAreas?: AreaKey[];
  onAreaDrag?: (key: AreaKey, x: number, y: number) => void;
  onSelectArea?: (key: AreaKey, ctrlKey: boolean) => void;
  previewScale?: number;
  snapPx?: number;
  showGrid?: boolean;
  snapStep?: number;
  onAreaResize?: (key: AreaKey, newScale: number) => void;
}) {
  const isCompletion = type === "completion";
  const title = isCompletion ? "수 료 증" : "감사장";
  const accentColor = style.borderColor;
  const a = areaStyles;

  const [guides, setGuides] = useState<{ axis: "x" | "y"; at: number }[]>([]);

  const dragProps = (key: AreaKey) => ({
    areaKey: key,
    offsetX: a[key].offsetX,
    offsetY: a[key].offsetY,
    editable,
    selectedAreas: selectedAreas ?? [],
    onSelect: onSelectArea ?? (() => {}),
    onDragEnd: onAreaDrag ?? (() => {}),
    scale: previewScale ?? 0.6,
    snapPx,
    boxScale: a[key].scale ?? 1,
    onResize: onAreaResize,
    onGuides: setGuides,
  });
  void snapStep;

  return (
    <div
      data-cert-canvas=""
      className="relative mx-auto bg-white"
      style={{
        width: "210mm",
        minHeight: "297mm",
        fontFamily: style.fontFamily,
        overflow: "hidden",
      }}
    >
      {/* ─── 이중 프레임 ─── */}
      <div
        style={{
          position: "absolute",
          inset: "10mm",
          border: `2.5px solid ${accentColor}`,
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: "13mm",
          border: `0.8px solid ${accentColor}`,
          opacity: 0.35,
          pointerEvents: "none",
        }}
      />

      {/* ─── 네 모서리 꼭짓점 장식 ─── */}
      {[
        { top: "10mm", left: "10mm", bt: true, bl: true },
        { top: "10mm", right: "10mm", bt: true, br: true },
        { bottom: "10mm", left: "10mm", bb: true, bl: true },
        { bottom: "10mm", right: "10mm", bb: true, br: true },
      ].map((pos, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            top: pos.top, bottom: pos.bottom,
            left: pos.left, right: pos.right,
            width: "20px",
            height: "20px",
            borderTop: pos.bt ? `3px solid ${accentColor}` : "none",
            borderBottom: pos.bb ? `3px solid ${accentColor}` : "none",
            borderLeft: pos.bl ? `3px solid ${accentColor}` : "none",
            borderRight: pos.br ? `3px solid ${accentColor}` : "none",
            pointerEvents: "none",
          }}
        />
      ))}

      {/* 격자 오버레이 (편집 중 + 표시 옵션 활성화 시) */}
      {editable && showGrid && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            backgroundImage:
              "linear-gradient(to right, rgba(59,130,246,0.12) 1px, transparent 1px), linear-gradient(to bottom, rgba(59,130,246,0.12) 1px, transparent 1px)",
            backgroundSize: `${snapStep}px ${snapStep}px`,
          }}
        />
      )}

      {/* 스마트 가이드 (PPT 스타일 노란색 정렬선 — 캔버스 절대 좌표) */}
      {editable && guides.length > 0 && (
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 20 }}>
          {guides.map((g, i) =>
            g.axis === "x" ? (
              <div
                key={`gx-${i}-${g.at}`}
                style={{
                  position: "absolute",
                  top: 0,
                  bottom: 0,
                  left: `${g.at}px`,
                  width: 0,
                  borderLeft: "1px dashed #f59e0b",
                }}
              />
            ) : (
              <div
                key={`gy-${i}-${g.at}`}
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  top: `${g.at}px`,
                  height: 0,
                  borderTop: "1px dashed #f59e0b",
                }}
              />
            )
          )}
        </div>
      )}

      {/* ─── 본문 영역 ─── */}
      <div
        className="flex flex-col items-center"
        style={{ padding: "22mm 36mm 18mm" }}
      >
        {/* 증서 번호 — 항상 좌측 상단 */}
        <DraggableArea {...dragProps("certNo")}>
          <div style={{ width: "100%", textAlign: "left", marginTop: a.certNo.marginTop, marginBottom: a.certNo.marginBottom }}>
            <span
              style={{
                fontSize: a.certNo.fontSize,
                fontWeight: 700,
                color: "#666",
                letterSpacing: a.certNo.letterSpacing,
                lineHeight: a.certNo.lineHeight,
              }}
            >
              제 {certificateNo || "0"} 호
            </span>
          </div>
        </DraggableArea>

        {/* 제목 */}
        <DraggableArea {...dragProps("title")}>
          <h1
            style={{
              fontSize: a.title.fontSize,
              fontWeight: 900,
              letterSpacing: a.title.letterSpacing,
              lineHeight: a.title.lineHeight,
              color: accentColor,
              marginTop: a.title.marginTop,
              marginBottom: a.title.marginBottom,
              textAlign: a.title.textAlign,
            }}
          >
            {title}
          </h1>
        </DraggableArea>

        {/* 제목 하단 장식선 */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "18mm" }}>
          <div style={{ width: "40px", height: "1px", background: accentColor, opacity: 0.4 }} />
          <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: accentColor, opacity: 0.3 }} />
          <div style={{ width: "40px", height: "1px", background: accentColor, opacity: 0.4 }} />
        </div>

        {/* 수여자 이름 — 항상 우측 정렬 */}
        <DraggableArea {...dragProps("name")}>
          <div style={{ marginTop: a.name.marginTop, marginBottom: a.name.marginBottom, textAlign: "right", width: "100%" }}>
            <span
              style={{
                fontSize: a.name.fontSize,
                fontWeight: 900,
                letterSpacing: a.name.letterSpacing,
                lineHeight: a.name.lineHeight,
                color: "#111",
              }}
            >
              {recipientName || "___________"}
            </span>
          </div>
        </DraggableArea>

        {/* 워터마크 엠블럼 — 본문과 같은 중앙 축에 배치 */}
        <div
          className="absolute left-1/2"
          style={{
            top: "38%",
            transform: "translate(-50%, -50%)",
            opacity: 0.07,
            width: "440px",
            height: "440px",
            pointerEvents: "none",
          }}
        >
          <img src="/cert-emblem.png" alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
        </div>

        {/* 본문 — 워터마크와 같은 중앙 축에 정렬 */}
        <DraggableArea {...dragProps("body")}>
          <div
            className="relative"
            style={{
              fontSize: a.body.fontSize,
              lineHeight: a.body.lineHeight,
              letterSpacing: a.body.letterSpacing,
              textAlign: a.body.textAlign,
              width: "100%",
              maxWidth: "480px",
              marginLeft: "auto",
              marginRight: "auto",
              marginTop: a.body.marginTop,
              marginBottom: a.body.marginBottom,
              wordBreak: "keep-all",
              color: "#222",
              fontWeight: 700,
            }}
          >
            <p style={{ textIndent: "1em", whiteSpace: "pre-wrap", textAlign: a.body.textAlign }}>
              {bodyText}
            </p>
          </div>
        </DraggableArea>

        {/* 날짜 */}
        <DraggableArea {...dragProps("date")}>
          <p
            style={{
              fontSize: a.date.fontSize,
              fontWeight: 700,
              marginTop: a.date.marginTop,
              marginBottom: a.date.marginBottom,
              letterSpacing: a.date.letterSpacing,
              lineHeight: a.date.lineHeight,
              textAlign: a.date.textAlign,
              color: "#222",
            }}
          >
            {seminarDate}
          </p>
        </DraggableArea>

        {/* ─── 하단 서명 영역 ─── */}
        <DraggableArea {...dragProps("org")}>
          <div
            style={{
              marginTop: a.org.marginTop,
              marginBottom: a.org.marginBottom,
              width: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: a.org.textAlign === "left" ? "flex-start" : a.org.textAlign === "right" ? "flex-end" : "center",
              gap: "0",
            }}
          >
          {/* 구분선 */}
          <div style={{ width: "50px", height: "1.5px", background: accentColor, opacity: 0.25, marginBottom: "14mm" }} />

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "7px",
            }}
          >
            {/* 학회 엠블럼 */}
            <img
              src="/cert-emblem.png"
              alt="연세대학교"
              style={{ width: "48px", height: "48px" }}
            />

            {/* 학회명 + 영문명 */}
            <div style={{ textAlign: "center" }}>
              <p
                style={{
                  fontSize: a.org.fontSize,
                  fontWeight: 900,
                  color: accentColor,
                  fontFamily: style.fontFamily,
                  letterSpacing: a.org.letterSpacing,
                  lineHeight: a.org.lineHeight,
                  margin: 0,
                }}
              >
                연세교육공학회
              </p>
              <p
                style={{
                  fontSize: "8px",
                  color: "#777",
                  fontFamily: style.fontFamily,
                  letterSpacing: "0.08em",
                  margin: "2px 0 0",
                }}
              >
                Yonsei Educational Technology Association
              </p>
            </div>

            {/* 직인 이미지 */}
            <img
              src="/cert-seal.jpeg"
              alt="직인"
              style={{ width: "52px", height: "52px" }}
            />
          </div>
        </div>
        </DraggableArea>
      </div>
    </div>
  );
}

export function inferSemester(dateStr: string): string {
  const d = new Date(dateStr);
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  return `${year}년 ${month >= 3 && month <= 8 ? "1" : "2"}학기`;
}

export function getDefaultBody(type: CertType, semester: string, seminarTitle: string): string {
  if (type === "completion") {
    return `귀하께서는 ${semester} 연세교육공학회에서 구성원들의 교육공학 핵심 역량강화를 위하여 주관한 연세교육공학 학술대회 <${seminarTitle || "___"}>에 참석하여 소정의 과정을 이수하였기에 이 수료증을 수여합니다.`;
  }
  return `귀하께서는 ${semester} 연세교육공학회에서 구성원들의 교육공학 핵심 역량강화를 위하여 주관한 연세교육공학 학술대회 <${seminarTitle || "___"}>에서 귀하께서가 지신 지식과 경험을 헌신적이고 열정적으로 공유해주심으로서 구성원들의 성장에 큰 도움을 주셨음에 감사드리며, 연세교육공학회 구성원들의 마음을 담아 감사장을 드립니다.`;
}

// next/font/google로 self-host된 한글 세리프 폰트를 CSS 변수로 사용.
// CORS/unicode-range 지연 로딩 문제가 없고 html2canvas가 확실히 폰트를 인식한다.
// 최종 fallback으로 var(--font-noto-serif-kr) 를 두어 한글 글리프 누락을 방지.
const FONT_PRESETS = [
  { label: "함렛 (추천·한글 최적)", value: "var(--font-hahmlet), var(--font-noto-serif-kr), serif" },
  { label: "Noto Serif 한글", value: "var(--font-noto-serif-kr), serif" },
  { label: "고운바탕", value: "var(--font-gowun-batang), var(--font-noto-serif-kr), serif" },
  { label: "페이퍼로지 (로컬)", value: "'페이퍼로지 8 ExtraBold', '페이퍼로지 8', var(--font-noto-serif-kr), serif" },
  { label: "바탕체", value: "var(--font-gowun-batang), 'Batang', 'Nanum Myeongjo', var(--font-noto-serif-kr), serif" },
];

/** 스타일 프리셋 */
interface StylePreset {
  label: string;
  description: string;
  fontFamily: string;
  borderColor: string;
  areaStyles: Record<AreaKey, AreaStyle>;
}

const STYLE_PRESETS: StylePreset[] = [
  {
    label: "정통 격식체",
    description: "연세 블루 + 함렛, 공식 행사용",
    fontFamily: "var(--font-hahmlet), var(--font-noto-serif-kr), serif",
    borderColor: "#003378",
    areaStyles: { ...DEFAULT_AREA_STYLES },
  },
  {
    label: "모던 심플",
    description: "Noto Serif + 넓은 여백, 깔끔한 스타일",
    fontFamily: "var(--font-noto-serif-kr), serif",
    borderColor: "#1a1a2e",
    areaStyles: {
      certNo: { ...DEFAULT_AREA_STYLES.certNo, fontSize: "10pt", letterSpacing: "0.1em" },
      title: { ...DEFAULT_AREA_STYLES.title, fontSize: "38pt", letterSpacing: "0.4em" },
      name: { ...DEFAULT_AREA_STYLES.name, fontSize: "24pt", letterSpacing: "0.3em" },
      body: { ...DEFAULT_AREA_STYLES.body, fontSize: "12pt", lineHeight: "2.8", letterSpacing: "0.02em" },
      date: { ...DEFAULT_AREA_STYLES.date, fontSize: "12pt", letterSpacing: "0.2em" },
      org: { ...DEFAULT_AREA_STYLES.org, fontSize: "24px", letterSpacing: "0.25em" },
    },
  },
  {
    label: "클래식 바탕",
    description: "바탕체 + 전통적 분위기",
    fontFamily: "var(--font-gowun-batang), 'Batang', 'Nanum Myeongjo', var(--font-noto-serif-kr), serif",
    borderColor: "#2c1810",
    areaStyles: {
      certNo: { ...DEFAULT_AREA_STYLES.certNo, fontSize: "11pt", letterSpacing: "0.05em" },
      title: { ...DEFAULT_AREA_STYLES.title, fontSize: "44pt", letterSpacing: "0.35em" },
      name: { ...DEFAULT_AREA_STYLES.name, fontSize: "28pt", letterSpacing: "0.2em" },
      body: { ...DEFAULT_AREA_STYLES.body, fontSize: "13pt", lineHeight: "2.3" },
      date: { ...DEFAULT_AREA_STYLES.date, fontSize: "13pt" },
      org: { ...DEFAULT_AREA_STYLES.org, fontSize: "28px", letterSpacing: "0.15em" },
    },
  },
];

export default function CertificateGenerator() {
  const { seminars } = useSeminars();
  const { user } = useAuthStore();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [certType, setCertType] = useState<CertType>("appreciation");
  const [recipientName, setRecipientName] = useState("");
  const [semester, setSemester] = useState("");
  const [certificateNo, setCertificateNo] = useState("");
  const [showEditMode, setShowEditMode] = useState(false);
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [snapStep, setSnapStep] = useState(8);
  const [showGrid, setShowGrid] = useState(true);
  const [bodyText, setBodyText] = useState("");
  const [fontFamily, setFontFamily] = useState(FONT_PRESETS[0].value);
  const [borderColor, setBorderColor] = useState("#003378");
  const [areaStyles, setAreaStyles] = useState<Record<AreaKey, AreaStyle>>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(CERT_STYLE_STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          // 이전 버전에서 저장된 데이터에 누락된 필드(offsetX/Y 등)를 기본값으로 채움
          const merged = {} as Record<AreaKey, AreaStyle>;
          for (const k of Object.keys(DEFAULT_AREA_STYLES) as AreaKey[]) {
            merged[k] = { ...DEFAULT_AREA_STYLES[k], ...(parsed[k] ?? {}) };
          }
          return merged;
        }
      } catch { /* ignore */ }
    }
    return { ...DEFAULT_AREA_STYLES };
  });
  const [expandedArea, setExpandedArea] = useState<AreaKey | null>(null);
  const [selectedArea, setSelectedArea] = useState<AreaKey | null>(null);
  const [selectedAreas, setSelectedAreas] = useState<AreaKey[]>([]);
  const [zoom, setZoom] = useState(0.6);
  const [pdfLoading, setPdfLoading] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  function updateAreaStyle(key: AreaKey, value: AreaStyle) {
    setAreaStyles((prev) => ({ ...prev, [key]: value }));
  }

  function handleAreaDrag(key: AreaKey, x: number, y: number) {
    setAreaStyles((prev) => ({
      ...prev,
      [key]: { ...prev[key], offsetX: Math.round(x), offsetY: Math.round(y) },
    }));
  }

  function handleAreaResize(key: AreaKey, newScale: number) {
    setAreaStyles((prev) => ({
      ...prev,
      [key]: { ...prev[key], scale: newScale },
    }));
  }

  // ── 키보드 미세조정 (방향키: 1px, Shift+화살표: 10px, Alt+화살표: 0.1px) ──
  useEffect(() => {
    if (!showEditMode) return;
    const onKey = (e: KeyboardEvent) => {
      if (selectedAreas.length === 0) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      const step = e.altKey ? 0.1 : e.shiftKey ? 10 : 1;
      let dx = 0, dy = 0;
      if (e.key === "ArrowLeft") dx = -step;
      else if (e.key === "ArrowRight") dx = step;
      else if (e.key === "ArrowUp") dy = -step;
      else if (e.key === "ArrowDown") dy = step;
      else return;
      e.preventDefault();
      setAreaStyles((prev) => {
        const next = { ...prev };
        for (const k of selectedAreas) {
          next[k] = { ...next[k], offsetX: next[k].offsetX + dx, offsetY: next[k].offsetY + dy };
        }
        return next;
      });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showEditMode, selectedAreas]);

  // ── 캔버스(페이지) 기준 정렬 ──
  function alignToCanvas(axis: "h" | "v", mode: "start" | "center" | "end") {
    if (selectedAreas.length === 0) return;
    setAreaStyles((prev) => {
      const next = { ...prev };
      for (const k of selectedAreas) {
        // 페이지 중앙 기준: offset 0 = 원래 위치, 중앙은 페이지 중앙을 의미
        // 실제 픽셀 이동량은 preview 기준이 아니라 상대 offset이므로 단순화:
        // start = -300, center = 0, end = +300 (근사)
        const v = mode === "start" ? -300 : mode === "end" ? 300 : 0;
        if (axis === "h") next[k] = { ...next[k], offsetX: v };
        else next[k] = { ...next[k], offsetY: v };
      }
      return next;
    });
  }
  function handleMultiAlign(updates: { key: AreaKey; x: number; y: number }[]) {
    setAreaStyles((prev) => {
      const next = { ...prev };
      for (const u of updates) {
        next[u.key] = { ...next[u.key], offsetX: Math.round(u.x), offsetY: Math.round(u.y) };
      }
      return next;
    });
  }

  function saveAreaStyles() {
    try {
      localStorage.setItem(CERT_STYLE_STORAGE_KEY, JSON.stringify(areaStyles));
      toast.success("스타일 설정이 저장되었습니다.");
    } catch {
      toast.error("저장에 실패했습니다.");
    }
  }

  function resetAndClearStyles() {
    setAreaStyles({ ...DEFAULT_AREA_STYLES });
    localStorage.removeItem(CERT_STYLE_STORAGE_KEY);
    toast.success("모든 스타일이 초기화되었습니다.");
  }

  // ── 템플릿 관리 ──
  const [savedTemplates, setSavedTemplates] = useState<CertTemplate[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem(CERT_TEMPLATES_KEY);
        if (raw) return JSON.parse(raw) as CertTemplate[];
      } catch { /* ignore */ }
    }
    return [];
  });
  const [templateName, setTemplateName] = useState("");

  function saveTemplate() {
    const name = templateName.trim();
    if (!name) { toast.error("템플릿 이름을 입력하세요."); return; }
    const tpl: CertTemplate = {
      name,
      certType,
      fontFamily,
      borderColor,
      bodyText,
      areaStyles: { ...areaStyles },
      createdAt: new Date().toISOString(),
    };
    const exists = savedTemplates.findIndex((t) => t.name === name);
    const next = exists >= 0
      ? savedTemplates.map((t, i) => (i === exists ? tpl : t))
      : [...savedTemplates, tpl];
    setSavedTemplates(next);
    localStorage.setItem(CERT_TEMPLATES_KEY, JSON.stringify(next));
    setTemplateName("");
    toast.success(`"${name}" 템플릿이 저장되었습니다.`);
  }

  function loadTemplate(tpl: CertTemplate) {
    setCertType(tpl.certType);
    setFontFamily(tpl.fontFamily);
    setBorderColor(tpl.borderColor);
    setBodyText(tpl.bodyText);
    setAreaStyles({ ...tpl.areaStyles });
    toast.success(`"${tpl.name}" 템플릿이 적용되었습니다.`);
  }

  function deleteTemplate(name: string) {
    const next = savedTemplates.filter((t) => t.name !== name);
    setSavedTemplates(next);
    localStorage.setItem(CERT_TEMPLATES_KEY, JSON.stringify(next));
    toast.success(`"${name}" 템플릿이 삭제되었습니다.`);
  }

  function applyPreset(preset: StylePreset) {
    setFontFamily(preset.fontFamily);
    setBorderColor(preset.borderColor);
    setAreaStyles({ ...preset.areaStyles });
    toast.success(`"${preset.label}" 프리셋이 적용되었습니다.`);
  }

  async function handlePdfDownload() {
    if (!printRef.current) return;
    setPdfLoading(true);
    try {
      const target = printRef.current.firstElementChild as HTMLElement;
      if (!target) throw new Error("증서 미리보기 요소를 찾을 수 없습니다.");

      // letter-spacing em → px 정규화 (서버 렌더링 환경에서 폰트 metric 편차 방지)
      const clone = target.cloneNode(true) as HTMLElement;
      clone.style.transform = "none";
      const walk = (src: HTMLElement, dst: HTMLElement) => {
        const cs = window.getComputedStyle(src);
        const fontSizePx = parseFloat(cs.fontSize) || 16;
        const ls = src.style.letterSpacing;
        if (ls && ls.endsWith("em")) {
          const em = parseFloat(ls);
          if (!isNaN(em)) dst.style.letterSpacing = `${em * fontSizePx}px`;
        }
        for (let i = 0; i < src.children.length; i++) {
          walk(src.children[i] as HTMLElement, dst.children[i] as HTMLElement);
        }
      };
      walk(target, clone);
      // 미리보기용 편집 UI 잔여 요소 제거 (테두리 하이라이트 등)
      clone.querySelectorAll("[data-editable-overlay]").forEach((n) => n.remove());

      const html = clone.outerHTML;
      const fileName = `${certType === "completion" ? "수료증" : "감사장"}_${recipientName || "미입력"}_${certificateNo || "번호없음"}.pdf`;

      const res = await fetch("/api/certificates/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ html, fileName }),
      });
      if (!res.ok) {
        const msg = await res.text().catch(() => "");
        throw new Error(`서버 응답 오류: ${res.status} ${msg}`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("PDF가 다운로드되었습니다.");
    } catch (e) {
      console.error("[cert] PDF 생성 실패:", e);
      toast.error("PDF 생성에 실패했습니다.");
    } finally {
      setPdfLoading(false);
    }
  }

  const seminar = seminars.find((s) => s.id === selectedId);
  const { attendees } = useAttendees(selectedId ?? "");

  // 감사장 대상: 세미나 메인 연사 + 세션별 발표자
  const speakers: string[] = seminar
    ? [...new Set([seminar.speaker, ...(seminar.sessions?.map((s) => s.speaker) ?? [])].filter(Boolean))]
    : [];

  const currentSemester = semester || (seminar ? inferSemester(seminar.date) : "2026년 1학기");
  const currentBody = bodyText || getDefaultBody(certType, currentSemester, seminar?.title || "세미나 제목");

  async function handleSeminarChange(id: string) {
    setSelectedId(id || null);
    const s = seminars.find((sem) => sem.id === id);
    if (s) {
      setSemester(inferSemester(s.date));
      setCertificateNo(await generateCertificateNo(certType));
      setBodyText("");
    }
  }

  function handleTypeChange(type: CertType) {
    setCertType(type);
    setBodyText("");
  }

  function handlePrint() {
    if (!printRef.current) return;

    // 인쇄 전용 스타일을 동적으로 주입
    const styleId = "cert-print-style";
    let styleEl = document.getElementById(styleId) as HTMLStyleElement | null;
    if (!styleEl) {
      styleEl = document.createElement("style");
      styleEl.id = styleId;
      document.head.appendChild(styleEl);
    }
    styleEl.textContent = `
      @media print {
        @page { size: A4 portrait; margin: 0; }
        body > *:not(#cert-print-container) { display: none !important; }
        #cert-print-container {
          display: block !important;
          position: fixed !important;
          inset: 0 !important;
          z-index: 99999 !important;
          background: white !important;
          transform: none !important;
          width: 210mm !important;
          min-height: 297mm !important;
          overflow: visible !important;
        }
        #cert-print-container > div { overflow: visible !important; }
        #cert-print-container [style*="cursor: move"] {
          cursor: default !important;
          outline: none !important;
        }
        * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
      }
    `;

    // 인쇄 전용 컨테이너 생성 (원본 DOM을 클론)
    let container = document.getElementById("cert-print-container");
    if (container) container.remove();
    container = document.createElement("div");
    container.id = "cert-print-container";
    container.style.display = "none";
    container.innerHTML = printRef.current.innerHTML;
    document.body.appendChild(container);

    // 인쇄 후 정리
    const cleanup = () => {
      container?.remove();
      if (styleEl) styleEl.textContent = "";
      window.removeEventListener("afterprint", cleanup);
    };
    window.addEventListener("afterprint", cleanup);

    setTimeout(() => window.print(), 100);
  }

  async function handleSaveRecord() {
    if (!seminar || !recipientName) {
      toast.error("세미나와 수여자 이름을 입력하세요.");
      return;
    }
    try {
      await certificatesApi.create({
        seminarId: seminar.id,
        seminarTitle: seminar.title,
        recipientName,
        type: certType,
        certificateNo,
        issuedAt: new Date().toISOString(),
        issuedBy: user?.id ?? "",
      });
      toast.success(`${CERT_LABELS[certType].label} 기록이 저장되었습니다.`);
      setCertificateNo(await generateCertificateNo(certType));
    } catch {
      toast.error("저장에 실패했습니다.");
    }
  }

  async function handleBatchCreate() {
    if (!seminar) return;
    const targets = attendees.filter((a) => a.checkedIn);
    if (targets.length === 0) {
      toast.error("출석 체크된 참석자가 없습니다.");
      return;
    }

    // 기존 수료증 조회 (중복 방지)
    const existingRes = await certificatesApi.list(seminar.id);
    const existingNames = new Set(
      (existingRes.data as unknown as { recipientName: string }[]).map((c) => c.recipientName)
    );

    const newTargets = targets.filter((a) => !existingNames.has(a.userName));
    if (newTargets.length === 0) {
      toast.error("모든 출석자에게 이미 수료증이 발급되었습니다.");
      return;
    }

    const nos = await generateCertificateNoBatch(certType, newTargets.length);
    for (let i = 0; i < newTargets.length; i++) {
      await certificatesApi.create({
        seminarId: seminar.id,
        seminarTitle: seminar.title,
        recipientName: newTargets[i].userName,
        type: certType,
        certificateNo: nos[i],
        issuedAt: new Date().toISOString(),
        issuedBy: user?.id ?? "",
      });
      if (newTargets[i].userId) {
        notifyCertificateIssued(newTargets[i].userId, seminar.title, certType);
      }
    }

    const skipped = targets.length - newTargets.length;
    toast.success(
      `${newTargets.length}명 수료증 생성 완료` + (skipped > 0 ? ` (${skipped}명 중복 스킵)` : "")
    );
  }

  // 참석자 목록에서 선택하여 수기 추가
  async function handleAddFromAttendee(name: string) {
    if (!seminar) return;

    // 중복 확인
    const existingRes = await certificatesApi.list(seminar.id);
    const existingNames = new Set(
      (existingRes.data as unknown as { recipientName: string }[]).map((c) => c.recipientName)
    );
    if (existingNames.has(name)) {
      toast.error(`${name}님에게 이미 수료증이 발급되었습니다.`);
      return;
    }

    const no = await generateCertificateNo(certType);
    await certificatesApi.create({
      seminarId: seminar.id,
      seminarTitle: seminar.title,
      recipientName: name,
      type: certType,
      certificateNo: no,
      issuedAt: new Date().toISOString(),
      issuedBy: user?.id ?? "",
    });
    // 해당 참석자의 userId로 알림 발송
    const attendee = attendees.find((a) => a.userName === name);
    if (attendee?.userId) {
      notifyCertificateIssued(attendee.userId, seminar.title, certType);
    }
    setRecipientName(name);
    toast.success(`${name}님 ${certType === "completion" ? "수료증" : "감사장"} 생성 완료`);
  }

  const previewDate = seminar
    ? new Date(seminar.date).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" })
    : "";

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      {/* 좌측: 설정 패널 */}
      <div className="w-full shrink-0 space-y-4 lg:w-80">
        <div className="rounded-xl border bg-white p-5 space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium">세미나 선택</label>
            <select
              value={selectedId ?? ""}
              onChange={(e) => handleSeminarChange(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm"
            >
              <option value="">-- 세미나 선택 --</option>
              {seminars.map((s) => (
                <option key={s.id} value={s.id}>{s.title} ({s.date})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">종류</label>
            <div className="flex gap-2">
              {(Object.entries(CERT_LABELS) as [CertType, typeof CERT_LABELS[CertType]][]).map(
                ([key, { label, icon }]) => (
                  <Button key={key} size="sm" variant={certType === key ? "default" : "outline"} onClick={() => handleTypeChange(key)}>
                    {icon}
                    <span className="ml-1">{label}</span>
                  </Button>
                ),
              )}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">수여자 이름</label>
            <Input value={recipientName} onChange={(e) => setRecipientName(e.target.value)} placeholder="홍길동" />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">학기</label>
            <Input value={semester} onChange={(e) => setSemester(e.target.value)} placeholder="2026년 1학기" />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">증서 번호</label>
            <Input value={certificateNo} readOnly disabled placeholder="자동 생성" className="bg-gray-50" />
          </div>

          {/* 편집 모드 토글 */}
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => setShowEditMode(!showEditMode)}
          >
            <Settings size={14} className="mr-1" />
            {showEditMode ? "편집 모드 닫기" : "편집 모드 열기"}
          </Button>

          {showEditMode && (
            <div className="space-y-3 rounded-lg border border-dashed p-3">
              {/* 편집 툴바: 격자/스냅 */}
              <div className="rounded-md border bg-muted/30 p-2">
                <p className="mb-1 text-[11px] font-semibold">편집 도구</p>
                <div className="mb-1 flex flex-wrap gap-1">
                  <Button
                    variant={showGrid ? "default" : "outline"}
                    size="sm"
                    className="h-7 text-[10px]"
                    onClick={() => setShowGrid(!showGrid)}
                    title="격자 표시"
                  >
                    격자 {showGrid ? "ON" : "OFF"}
                  </Button>
                  <Button
                    variant={snapEnabled ? "default" : "outline"}
                    size="sm"
                    className="h-7 text-[10px]"
                    onClick={() => setSnapEnabled(!snapEnabled)}
                    title="드래그 시 격자에 스냅"
                  >
                    스냅 {snapEnabled ? "ON" : "OFF"}
                  </Button>
                  <select
                    value={snapStep}
                    onChange={(e) => setSnapStep(Number(e.target.value))}
                    className="h-7 rounded border px-1 text-[10px]"
                    title="격자 간격"
                  >
                    <option value={4}>4px</option>
                    <option value={8}>8px</option>
                    <option value={16}>16px</option>
                    <option value={32}>32px</option>
                  </select>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  방향키: 1px · Shift+화살표: 10px · Alt+화살표: 0.1px · Shift+드래그: 축 고정
                </p>
              </div>

              {/* 캔버스 기준 정렬 (선택 영역) */}
              {selectedAreas.length > 0 && (
                <div className="rounded-md border border-purple-200 bg-purple-50/60 p-2">
                  <p className="mb-1 text-[11px] font-semibold text-purple-700">
                    페이지 기준 정렬 · {selectedAreas.length}개 선택
                  </p>
                  <div className="grid grid-cols-3 gap-1">
                    <Button variant="outline" size="sm" className="h-7 text-[10px]"
                      onClick={() => alignToCanvas("h", "start")}>페이지 좌</Button>
                    <Button variant="outline" size="sm" className="h-7 text-[10px]"
                      onClick={() => alignToCanvas("h", "center")}>페이지 중앙</Button>
                    <Button variant="outline" size="sm" className="h-7 text-[10px]"
                      onClick={() => alignToCanvas("h", "end")}>페이지 우</Button>
                    <Button variant="outline" size="sm" className="h-7 text-[10px]"
                      onClick={() => alignToCanvas("v", "start")}>페이지 상</Button>
                    <Button variant="outline" size="sm" className="h-7 text-[10px]"
                      onClick={() => alignToCanvas("v", "center")}>페이지 중단</Button>
                    <Button variant="outline" size="sm" className="h-7 text-[10px]"
                      onClick={() => alignToCanvas("v", "end")}>페이지 하</Button>
                  </div>
                </div>
              )}

              <div>
                <label className="mb-1 block text-xs font-medium">폰트</label>
                <select
                  value={fontFamily}
                  onChange={(e) => setFontFamily(e.target.value)}
                  className="w-full rounded-md border px-2 py-1.5 text-sm"
                >
                  {FONT_PRESETS.map((fp) => (
                    <option key={fp.value} value={fp.value}>{fp.label}</option>
                  ))}
                </select>
                <p className="mt-1 text-[10px] text-muted-foreground">
                  페이퍼로지는 로컬 설치 시 인쇄에 적용됩니다.
                </p>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium">테두리 색상</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={borderColor}
                    onChange={(e) => setBorderColor(e.target.value)}
                    className="h-8 w-8 cursor-pointer rounded border"
                  />
                  <Input
                    value={borderColor}
                    onChange={(e) => setBorderColor(e.target.value)}
                    className="h-8 text-xs"
                    placeholder="#003378"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium">본문 내용 편집</label>
                <Textarea
                  value={bodyText || currentBody}
                  onChange={(e) => setBodyText(e.target.value)}
                  rows={6}
                  className="text-xs"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-1 h-7 text-xs"
                  onClick={() => setBodyText("")}
                >
                  기본 텍스트로 초기화
                </Button>
              </div>

              {/* PPT 스타일 정렬 도구 */}
              {selectedArea && (
                <div>
                  <label className="mb-1.5 block text-xs font-medium">
                    정렬 · {AREA_LABELS[selectedArea]}
                  </label>
                  {/* 수평 정렬 */}
                  <p className="mb-1 text-[10px] text-muted-foreground">수평 (좌우)</p>
                  <div className="grid grid-cols-3 gap-1">
                    <Button variant="outline" size="sm" className="h-7 gap-1 text-[10px]" title="좌측 붙임"
                      onClick={() => handleAreaDrag(selectedArea, -120, areaStyles[selectedArea].offsetY)}>
                      <ArrowLeft size={12} />좌
                    </Button>
                    <Button variant="outline" size="sm" className="h-7 gap-1 text-[10px]" title="수평 가운데"
                      onClick={() => handleAreaDrag(selectedArea, 0, areaStyles[selectedArea].offsetY)}>
                      <AlignHorizontalJustifyCenter size={12} />중앙
                    </Button>
                    <Button variant="outline" size="sm" className="h-7 gap-1 text-[10px]" title="우측 붙임"
                      onClick={() => handleAreaDrag(selectedArea, 120, areaStyles[selectedArea].offsetY)}>
                      <ArrowRight size={12} />우
                    </Button>
                  </div>
                  {/* 수직 정렬 */}
                  <p className="mb-1 mt-2 text-[10px] text-muted-foreground">수직 (상하)</p>
                  <div className="grid grid-cols-3 gap-1">
                    <Button variant="outline" size="sm" className="h-7 gap-1 text-[10px]" title="상단 붙임"
                      onClick={() => handleAreaDrag(selectedArea, areaStyles[selectedArea].offsetX, -120)}>
                      <ArrowUp size={12} />상
                    </Button>
                    <Button variant="outline" size="sm" className="h-7 gap-1 text-[10px]" title="수직 가운데"
                      onClick={() => handleAreaDrag(selectedArea, areaStyles[selectedArea].offsetX, 0)}>
                      <AlignVerticalJustifyCenter size={12} />중앙
                    </Button>
                    <Button variant="outline" size="sm" className="h-7 gap-1 text-[10px]" title="하단 붙임"
                      onClick={() => handleAreaDrag(selectedArea, areaStyles[selectedArea].offsetX, 120)}>
                      <ArrowDown size={12} />하
                    </Button>
                  </div>
                  {/* 미세조절 */}
                  <p className="mb-1 mt-2 text-[10px] text-muted-foreground">미세조절 (1px)</p>
                  <div className="grid grid-cols-4 gap-1">
                    <Button variant="outline" size="sm" className="h-7 text-[10px]" title="왼쪽 1px"
                      onClick={() => handleAreaDrag(selectedArea, areaStyles[selectedArea].offsetX - 1, areaStyles[selectedArea].offsetY)}>
                      ←1
                    </Button>
                    <Button variant="outline" size="sm" className="h-7 text-[10px]" title="오른쪽 1px"
                      onClick={() => handleAreaDrag(selectedArea, areaStyles[selectedArea].offsetX + 1, areaStyles[selectedArea].offsetY)}>
                      →1
                    </Button>
                    <Button variant="outline" size="sm" className="h-7 text-[10px]" title="위 1px"
                      onClick={() => handleAreaDrag(selectedArea, areaStyles[selectedArea].offsetX, areaStyles[selectedArea].offsetY - 1)}>
                      ↑1
                    </Button>
                    <Button variant="outline" size="sm" className="h-7 text-[10px]" title="아래 1px"
                      onClick={() => handleAreaDrag(selectedArea, areaStyles[selectedArea].offsetX, areaStyles[selectedArea].offsetY + 1)}>
                      ↓1
                    </Button>
                  </div>
                  <p className="mt-1 text-[9px] text-muted-foreground">
                    현재 위치: X={areaStyles[selectedArea].offsetX}px, Y={areaStyles[selectedArea].offsetY}px
                  </p>
                </div>
              )}

              {/* 다중 개체 정렬 (2개 이상 선택 시) */}
              {selectedAreas.length > 1 && (
                <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-3">
                  <label className="mb-1.5 block text-xs font-semibold text-blue-700">
                    다중 정렬 · {selectedAreas.length}개 선택
                    <button className="ml-2 text-[10px] font-normal text-muted-foreground hover:text-foreground" onClick={() => setSelectedAreas([])}>
                      선택 해제
                    </button>
                  </label>
                  <p className="mb-1 text-[10px] text-muted-foreground">수평 (좌우 맞춤)</p>
                  <div className="grid grid-cols-3 gap-1">
                    <Button variant="outline" size="sm" className="h-7 gap-1 text-[10px]" title="왼쪽 맞춤"
                      onClick={() => {
                        const minX = Math.min(...selectedAreas.map((k) => areaStyles[k].offsetX));
                        handleMultiAlign(selectedAreas.map((k) => ({ key: k, x: minX, y: areaStyles[k].offsetY })));
                      }}>
                      <ArrowLeft size={12} />좌 맞춤
                    </Button>
                    <Button variant="outline" size="sm" className="h-7 gap-1 text-[10px]" title="수평 가운데 맞춤"
                      onClick={() => {
                        const avgX = Math.round(selectedAreas.reduce((s, k) => s + areaStyles[k].offsetX, 0) / selectedAreas.length);
                        handleMultiAlign(selectedAreas.map((k) => ({ key: k, x: avgX, y: areaStyles[k].offsetY })));
                      }}>
                      <AlignHorizontalJustifyCenter size={12} />중앙
                    </Button>
                    <Button variant="outline" size="sm" className="h-7 gap-1 text-[10px]" title="오른쪽 맞춤"
                      onClick={() => {
                        const maxX = Math.max(...selectedAreas.map((k) => areaStyles[k].offsetX));
                        handleMultiAlign(selectedAreas.map((k) => ({ key: k, x: maxX, y: areaStyles[k].offsetY })));
                      }}>
                      <ArrowRight size={12} />우 맞춤
                    </Button>
                  </div>
                  <p className="mb-1 mt-2 text-[10px] text-muted-foreground">수직 (상하 맞춤)</p>
                  <div className="grid grid-cols-3 gap-1">
                    <Button variant="outline" size="sm" className="h-7 gap-1 text-[10px]" title="상단 맞춤"
                      onClick={() => {
                        const minY = Math.min(...selectedAreas.map((k) => areaStyles[k].offsetY));
                        handleMultiAlign(selectedAreas.map((k) => ({ key: k, x: areaStyles[k].offsetX, y: minY })));
                      }}>
                      <ArrowUp size={12} />상 맞춤
                    </Button>
                    <Button variant="outline" size="sm" className="h-7 gap-1 text-[10px]" title="수직 가운데 맞춤"
                      onClick={() => {
                        const avgY = Math.round(selectedAreas.reduce((s, k) => s + areaStyles[k].offsetY, 0) / selectedAreas.length);
                        handleMultiAlign(selectedAreas.map((k) => ({ key: k, x: areaStyles[k].offsetX, y: avgY })));
                      }}>
                      <AlignVerticalJustifyCenter size={12} />중앙
                    </Button>
                    <Button variant="outline" size="sm" className="h-7 gap-1 text-[10px]" title="하단 맞춤"
                      onClick={() => {
                        const maxY = Math.max(...selectedAreas.map((k) => areaStyles[k].offsetY));
                        handleMultiAlign(selectedAreas.map((k) => ({ key: k, x: areaStyles[k].offsetX, y: maxY })));
                      }}>
                      <ArrowDown size={12} />하 맞춤
                    </Button>
                  </div>
                  <p className="mt-1 text-[9px] text-muted-foreground">
                    Ctrl+클릭으로 개체를 추가/제거할 수 있습니다.
                  </p>
                </div>
              )}

              {/* 영역별 세부 스타일 */}
              <div>
                <label className="mb-1.5 block text-xs font-medium">영역별 세부 조절</label>
                <div className="space-y-1">
                  {(Object.keys(AREA_LABELS) as AreaKey[]).map((key) => (
                    <div key={key}>
                      <button
                        onClick={() => setExpandedArea(expandedArea === key ? null : key)}
                        className={cn(
                          "flex w-full items-center justify-between rounded-md border px-2.5 py-1.5 text-left text-[11px] font-medium transition-colors",
                          expandedArea === key
                            ? "border-primary/40 bg-primary/5 text-primary"
                            : "hover:bg-muted/50"
                        )}
                      >
                        {AREA_LABELS[key]}
                        <span className="text-[10px] text-muted-foreground">
                          {areaStyles[key].fontSize} · {areaStyles[key].letterSpacing}
                        </span>
                      </button>
                      {expandedArea === key && (
                        <div className="mt-1">
                          <AreaStyleEditor
                            areaKey={key}
                            value={areaStyles[key]}
                            onChange={(v) => updateAreaStyle(key, v)}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <div className="mt-2 flex gap-1.5">
                  <Button
                    size="sm"
                    className="h-7 flex-1 text-xs"
                    onClick={saveAreaStyles}
                  >
                    스타일 저장
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 flex-1 text-xs"
                    onClick={resetAndClearStyles}
                  >
                    전체 초기화
                  </Button>
                </div>
                {showEditMode && (
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    미리보기에서 영역을 드래그하여 위치를 조절할 수 있습니다.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* 스타일 프리셋 */}
          {showEditMode && (
            <div>
              <label className="mb-1.5 block text-xs font-medium">
                <Palette size={12} className="mr-1 inline" />스타일 프리셋
              </label>
              <div className="grid grid-cols-1 gap-1">
                {STYLE_PRESETS.map((preset) => (
                  <button
                    key={preset.label}
                    onClick={() => applyPreset(preset)}
                    className="flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-left text-[11px] transition-colors hover:bg-muted/50"
                  >
                    <span className="h-4 w-4 shrink-0 rounded-full border" style={{ background: preset.borderColor }} />
                    <span>
                      <span className="font-medium">{preset.label}</span>
                      <span className="ml-1 text-[10px] text-muted-foreground">{preset.description}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 내 템플릿 */}
          <div>
            <label className="mb-1.5 block text-xs font-medium">
              <Download size={12} className="mr-1 inline" />내 템플릿
            </label>
            {/* 저장 */}
            <div className="flex gap-1">
              <Input
                placeholder="템플릿 이름"
                className="h-7 text-xs"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") saveTemplate(); }}
              />
              <Button variant="outline" size="sm" className="h-7 shrink-0 text-[10px]" onClick={saveTemplate}>
                저장
              </Button>
            </div>
            {/* 목록 */}
            {savedTemplates.length > 0 ? (
              <div className="mt-2 space-y-0.5">
                {savedTemplates.map((tpl) => (
                  <div key={tpl.name} className="flex items-center justify-between rounded-lg border px-2.5 py-1.5 text-[11px]">
                    <button onClick={() => loadTemplate(tpl)} className="flex-1 text-left hover:text-primary">
                      <span className="flex items-center gap-1.5">
                        <span className="h-3 w-3 shrink-0 rounded-full border" style={{ background: tpl.borderColor }} />
                        <span className="font-medium">{tpl.name}</span>
                        <Badge variant="secondary" className="h-4 text-[9px]">
                          {tpl.certType === "completion" ? "수료증" : "감사장"}
                        </Badge>
                      </span>
                    </button>
                    <button
                      onClick={() => deleteTemplate(tpl.name)}
                      className="ml-1 rounded p-0.5 text-muted-foreground hover:bg-red-50 hover:text-red-500"
                      title="삭제"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-1 text-[10px] text-muted-foreground">
                저장된 템플릿이 없습니다. 현재 설정을 저장해보세요.
              </p>
            )}
          </div>

          <div className="space-y-2 pt-2">
            <Button className="w-full" onClick={handlePrint} disabled={!seminar}>
              <Printer size={16} className="mr-1" />인쇄
            </Button>
            <Button className="w-full" variant="outline" onClick={handlePdfDownload} disabled={!seminar || pdfLoading}>
              <FileDown size={16} className="mr-1" />{pdfLoading ? "PDF 생성 중..." : "PDF 다운로드"}
            </Button>
            <Button className="w-full" variant="outline" onClick={handleSaveRecord} disabled={!seminar || !recipientName}>
              <Plus size={16} className="mr-1" />발급 기록 저장
            </Button>
            {certType === "completion" && (
              <Button className="w-full" variant="outline" onClick={handleBatchCreate} disabled={!seminar}>
                <Download size={16} className="mr-1" />출석자 일괄 수료증
              </Button>
            )}
          </div>

          {/* 감사장: 연사/발표자 바로 선택 + 수기 추가 */}
          {certType === "appreciation" && seminar && (
            <div className="rounded-lg border border-orange-200 bg-orange-50/50 p-3">
              <p className="text-xs font-semibold text-orange-700">연사/발표자 <span className="font-normal text-muted-foreground">({speakers.length}명)</span></p>
              {speakers.length > 0 && (
                <div className="mt-2 space-y-0.5">
                  {speakers.map((name) => (
                    <div key={name} className="flex items-center justify-between rounded px-2 py-1 text-xs">
                      <span className="flex items-center gap-1.5">
                        {name}
                        <Badge variant="secondary" className="h-4 text-[9px] bg-orange-100 text-orange-700">연사</Badge>
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 px-1.5 text-[10px]"
                        onClick={() => setRecipientName(name)}
                      >
                        <UserPlus size={10} className="mr-0.5" />선택
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              {/* 연사 수기 추가 */}
              <div className="mt-2 flex gap-1">
                <Input
                  placeholder="연사/발표자 이름 입력"
                  className="h-7 text-xs"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const val = (e.target as HTMLInputElement).value.trim();
                      if (val) { setRecipientName(val); (e.target as HTMLInputElement).value = ""; }
                    }
                  }}
                  id="manual-speaker-input"
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 shrink-0 text-[10px]"
                  onClick={() => {
                    const input = document.getElementById("manual-speaker-input") as HTMLInputElement;
                    const val = input?.value.trim();
                    if (val) { setRecipientName(val); input.value = ""; }
                  }}
                >
                  <UserPlus size={10} className="mr-0.5" />추가
                </Button>
              </div>
              <p className="mt-1 text-[9px] text-muted-foreground">이름 입력 후 Enter 또는 추가 버튼을 누르면 수여자로 설정됩니다.</p>
            </div>
          )}

          {/* 참석자 → 발급 대상자 선택 (수료증만) */}
          {certType === "completion" && seminar && attendees.length > 0 && (
            <AttendeeSelector
              attendees={attendees}
              seminarId={seminar.id}
              certType={certType}
              onSelectName={(name) => setRecipientName(name)}
              onBatchCreate={async (names, onProgress) => {
                try {
                  let created = 0, skipped = 0;
                  let existingCertNames = new Set<string>();
                  try {
                    const existingRes = await certificatesApi.list(seminar.id, certType);
                    existingCertNames = new Set((existingRes.data as unknown as { recipientName: string }[]).map((c) => c.recipientName));
                  } catch (e) {
                    console.error("[cert] 기존 발급 조회 실패:", e);
                  }
                  // 중복 제외 후 실제 발급 대상 확정
                  const actualNames = names.filter((n) => !existingCertNames.has(n));
                  const skippedCount = names.length - actualNames.length;
                  skipped = skippedCount;

                  if (actualNames.length > 0) {
                    const nos = await generateCertificateNoBatch(certType, actualNames.length);
                    let idx = 0;
                    for (let i = 0; i < names.length; i++) {
                      onProgress?.(i + 1, names.length);
                      if (existingCertNames.has(names[i])) continue;
                      try {
                        await certificatesApi.create({ seminarId: seminar.id, seminarTitle: seminar.title, recipientName: names[i], type: certType, certificateNo: nos[idx], issuedAt: new Date().toISOString(), issuedBy: user?.id ?? "" });
                        created++;
                        idx++;
                      } catch (e) {
                        console.error(`[cert] ${names[i]} 발급 실패:`, e);
                        toast.error(`${names[i]} 발급 실패: ${e instanceof Error ? e.message : "알 수 없는 오류"}`);
                        idx++;
                      }
                    }
                  }
                  if (created > 0) toast.success(`${created}명 발급 완료` + (skipped > 0 ? ` (${skipped}명 중복 스킵)` : ""));
                  else if (skipped > 0) toast.error("모든 대상자가 이미 발급되었습니다.");
                } catch (e) {
                  console.error("[cert] 일괄 발급 오류:", e);
                  toast.error(`일괄 발급 오류: ${e instanceof Error ? e.message : "알 수 없는 오류"}`);
                }
              }}
            />
          )}
        </div>
      </div>

      {/* 우측: 미리보기 (항상 표시) */}
      <div className="min-w-0 flex-1">
        {/* 줌 컨트롤 바 */}
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-medium text-muted-foreground">미리보기 (A4 세로)</p>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setZoom((z) => Math.max(0.3, z - 0.1))} title="축소">
              <ZoomOut size={14} />
            </Button>
            <span className="min-w-[3.5rem] text-center text-xs font-medium tabular-nums text-muted-foreground">
              {Math.round(zoom * 100)}%
            </span>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setZoom((z) => Math.min(1, z + 0.1))} title="확대">
              <ZoomIn size={14} />
            </Button>
            {[0.5, 0.75, 1].map((z) => (
              <Button key={z} variant={Math.abs(zoom - z) < 0.01 ? "default" : "outline"} size="sm" className="h-7 px-2 text-[10px]" onClick={() => setZoom(z)}>
                {Math.round(z * 100)}%
              </Button>
            ))}
          </div>
        </div>
        <div
          className="overflow-auto rounded-lg border shadow-lg"
          style={{ maxHeight: "85vh" }}
        >
          <div
            ref={printRef}
            style={{ transform: `scale(${zoom})`, transformOrigin: "top left", width: `${100 / zoom}%` }}
          >
            <CertificatePreview
              type={certType}
              seminarTitle={seminar?.title || "세미나 제목"}
              semester={currentSemester}
              seminarDate={previewDate || "2026년 1월 1일"}
              recipientName={recipientName}
              certificateNo={certificateNo}
              bodyText={currentBody}
              style={{ fontFamily, borderColor }}
              areaStyles={areaStyles}
              editable={showEditMode}
              selectedAreas={selectedAreas}
              onAreaDrag={handleAreaDrag}
              onAreaResize={handleAreaResize}
              onSelectArea={(key, ctrlKey) => {
                if (ctrlKey) {
                  setSelectedAreas((prev) =>
                    prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
                  );
                } else {
                  setSelectedAreas([key]);
                }
                setSelectedArea(key);
                setExpandedArea(key);
              }}
              previewScale={zoom}
              snapPx={snapEnabled ? snapStep : 0}
              showGrid={showGrid}
              snapStep={snapStep}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
