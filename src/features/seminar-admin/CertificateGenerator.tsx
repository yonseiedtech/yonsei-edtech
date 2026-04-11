"use client";

import { useState, useRef, useCallback } from "react";
import { useSeminars, useAttendees } from "@/features/seminar/useSeminar";
import { useAuthStore } from "@/features/auth/auth-store";
import { certificatesApi } from "@/lib/bkend";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Download, Printer, Award, Heart, Plus, Settings, Check, UserPlus, Eye, X, AlignLeft, AlignCenter, AlignRight, AlignJustify, ZoomIn, ZoomOut, FileDown, Palette } from "lucide-react";
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
  const [filter, setFilter] = useState<"all" | "checked" | "unchecked">("all");
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
                  <Button variant="ghost" size="sm" className="h-5 px-1.5 text-[10px]" onClick={() => addRecipient(att.userName)}>
                    <Plus size={10} />추가
                  </Button>
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

async function generateCertificateNo(certType: CertType = "completion"): Promise<string> {
  const yy = String(new Date().getFullYear()).slice(-2);
  const prefix = certType === "completion" ? "C" : "A"; // C=수료증, A=감사장
  const tag = `${prefix}${yy}-`;
  try {
    const existing = await certificatesApi.list();
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

const CERT_STYLE_STORAGE_KEY = "cert-area-styles";

/** 드래그 가능한 영역 래퍼 */
function DraggableArea({
  areaKey,
  offsetX,
  offsetY,
  editable,
  onDragEnd,
  selectedArea,
  onSelect,
  scale = 0.6,
  children,
}: {
  areaKey: AreaKey;
  offsetX: number;
  offsetY: number;
  editable: boolean;
  onDragEnd: (key: AreaKey, dx: number, dy: number) => void;
  selectedArea: AreaKey | null;
  onSelect: (key: AreaKey) => void;
  scale?: number;
  children: React.ReactNode;
}) {
  const dragging = useRef(false);
  const startPos = useRef({ x: 0, y: 0 });
  const startOffset = useRef({ x: 0, y: 0 });
  const [localOffset, setLocalOffset] = useState({ x: 0, y: 0 });
  const isSelected = selectedArea === areaKey;

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!editable) return;
      e.preventDefault();
      e.stopPropagation();
      onSelect(areaKey);
      dragging.current = true;
      startPos.current = { x: e.clientX, y: e.clientY };
      startOffset.current = { x: offsetX, y: offsetY };
      setLocalOffset({ x: 0, y: 0 });

      const handleMouseMove = (ev: MouseEvent) => {
        if (!dragging.current) return;
        const dx = (ev.clientX - startPos.current.x) / scale;
        const dy = (ev.clientY - startPos.current.y) / scale;
        setLocalOffset({ x: dx, y: dy });
      };

      const handleMouseUp = (ev: MouseEvent) => {
        if (!dragging.current) return;
        dragging.current = false;
        const dx = (ev.clientX - startPos.current.x) / scale;
        const dy = (ev.clientY - startPos.current.y) / scale;
        setLocalOffset({ x: 0, y: 0 });
        onDragEnd(areaKey, startOffset.current.x + dx, startOffset.current.y + dy);
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [editable, areaKey, offsetX, offsetY, onDragEnd, onSelect]
  );

  const ox = offsetX || 0;
  const oy = offsetY || 0;

  if (!editable) {
    return (
      <div style={{ transform: ox || oy ? `translate(${ox}px, ${oy}px)` : undefined }}>
        {children}
      </div>
    );
  }

  return (
    <div
      onMouseDown={handleMouseDown}
      style={{
        transform: `translate(${ox + localOffset.x}px, ${oy + localOffset.y}px)`,
        cursor: "move",
        position: "relative",
        outline: isSelected ? "2px dashed #3b82f6" : "1px dashed transparent",
        outlineOffset: "3px",
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
        <span className="absolute -top-4 left-0 rounded bg-blue-500 px-1.5 py-0.5 text-[9px] font-medium text-white" style={{ zIndex: 10 }}>
          {AREA_LABELS[areaKey]}
        </span>
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

      {/* 수평 맞춤 */}
      <div>
        <p className="mb-1 text-[10px] text-muted-foreground">수평 맞춤</p>
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
          {/* 수평 중앙 맞춤 (오프셋 리셋) */}
          <button
            title="수평 중앙으로 이동"
            onClick={() => onChange({ ...value, offsetX: 0, textAlign: "center" })}
            className="ml-auto flex h-6 items-center gap-0.5 rounded border border-muted bg-white px-1.5 text-[9px] text-muted-foreground hover:bg-muted/50"
          >
            ↔ 중앙
          </button>
        </div>
      </div>

      {/* 수직 중앙 맞춤 */}
      <button
        title="수직 위치 초기화 (오프셋 Y=0)"
        onClick={() => onChange({ ...value, offsetY: 0 })}
        className="flex h-6 w-full items-center justify-center gap-0.5 rounded border border-muted bg-white text-[9px] text-muted-foreground hover:bg-muted/50"
      >
        ↕ 수직 위치 초기화
      </button>

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
  selectedArea = null,
  onAreaDrag,
  onSelectArea,
  previewScale,
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
  selectedArea?: AreaKey | null;
  onAreaDrag?: (key: AreaKey, x: number, y: number) => void;
  onSelectArea?: (key: AreaKey) => void;
  previewScale?: number;
}) {
  const isCompletion = type === "completion";
  const title = isCompletion ? "수 료 증" : "감사장";
  const accentColor = style.borderColor;
  const a = areaStyles;

  const dragProps = (key: AreaKey) => ({
    areaKey: key,
    offsetX: a[key].offsetX,
    offsetY: a[key].offsetY,
    editable,
    selectedArea,
    onSelect: onSelectArea ?? (() => {}),
    onDragEnd: onAreaDrag ?? (() => {}),
    scale: previewScale ?? 0.6,
  });

  return (
    <div
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

      {/* ─── 본문 영역 ─── */}
      <div
        className="flex flex-col items-center"
        style={{ padding: "22mm 36mm 18mm" }}
      >
        {/* 증서 번호 */}
        <DraggableArea {...dragProps("certNo")}>
          <div style={{ width: "100%", textAlign: a.certNo.textAlign, marginTop: a.certNo.marginTop, marginBottom: a.certNo.marginBottom }}>
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

        {/* 수여자 이름 */}
        <DraggableArea {...dragProps("name")}>
          <div style={{ marginTop: a.name.marginTop, marginBottom: a.name.marginBottom, textAlign: a.name.textAlign, width: "100%" }}>
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
            <span
              style={{
                fontSize: "13pt",
                marginLeft: "6px",
                fontWeight: 600,
                color: "#444",
              }}
            >
              선생님
            </span>
          </div>
        </DraggableArea>

        {/* 워터마크 엠블럼 */}
        <div
          className="absolute left-1/2 -translate-x-1/2"
          style={{
            top: "40%",
            opacity: 0.06,
            width: "300px",
            height: "300px",
            pointerEvents: "none",
          }}
        >
          <img src="/cert-emblem.png" alt="" style={{ width: "100%", height: "100%" }} />
        </div>

        {/* 본문 */}
        <DraggableArea {...dragProps("body")}>
          <div
            className="relative"
            style={{
              fontSize: a.body.fontSize,
              lineHeight: a.body.lineHeight,
              letterSpacing: a.body.letterSpacing,
              textAlign: a.body.textAlign,
              width: "100%",
              maxWidth: "460px",
              margin: "0 auto",
              marginTop: a.body.marginTop,
              marginBottom: a.body.marginBottom,
              wordBreak: "keep-all",
              color: "#222",
              fontWeight: 700,
            }}
          >
            <p style={{ textIndent: "1em", whiteSpace: "pre-wrap" }}>
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

const FONT_PRESETS = [
  { label: "함렛 (추천·한글 최적)", value: "'Hahmlet', serif" },
  { label: "Noto Serif 한글", value: "'Noto Serif KR', serif" },
  { label: "고운바탕", value: "'Gowun Batang', serif" },
  { label: "페이퍼로지 (로컬)", value: "'페이퍼로지 8 ExtraBold', '페이퍼로지 8', serif" },
  { label: "바탕체", value: "'Batang', 'Nanum Myeongjo', serif" },
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
    fontFamily: "'Hahmlet', serif",
    borderColor: "#003378",
    areaStyles: { ...DEFAULT_AREA_STYLES },
  },
  {
    label: "모던 심플",
    description: "Noto Serif + 넓은 여백, 깔끔한 스타일",
    fontFamily: "'Noto Serif KR', serif",
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
    fontFamily: "'Batang', 'Nanum Myeongjo', serif",
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
      const html2canvas = (await import("html2canvas-pro")).default;
      const { jsPDF } = await import("jspdf");
      const canvas = await html2canvas(printRef.current.firstElementChild as HTMLElement, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
      });
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const imgData = canvas.toDataURL("image/png");
      pdf.addImage(imgData, "PNG", 0, 0, 210, 297);
      const fileName = `${certType === "completion" ? "수료증" : "감사장"}_${recipientName || "미입력"}_${certificateNo || "번호없음"}.pdf`;
      pdf.save(fileName);
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

    for (const att of newTargets) {
      const no = await generateCertificateNo(certType);
      await certificatesApi.create({
        seminarId: seminar.id,
        seminarTitle: seminar.title,
        recipientName: att.userName,
        type: "completion",
        certificateNo: no,
        issuedAt: new Date().toISOString(),
        issuedBy: user?.id ?? "",
      });
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

          {/* 감사장: 연사/발표자 바로 선택 */}
          {certType === "appreciation" && seminar && speakers.length > 0 && (
            <div className="rounded-lg border border-orange-200 bg-orange-50/50 p-3">
              <p className="text-xs font-semibold text-orange-700">연사/발표자 <span className="font-normal text-muted-foreground">({speakers.length}명)</span></p>
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
            </div>
          )}

          {/* 참석자 → 발급 대상자 선택 */}
          {seminar && attendees.length > 0 && (
            <AttendeeSelector
              attendees={attendees}
              seminarId={seminar.id}
              certType={certType}
              onSelectName={(name) => setRecipientName(name)}
              onBatchCreate={async (names, onProgress) => {
                try {
                  let created = 0, skipped = 0;
                  let existingNames = new Set<string>();
                  try {
                    const existingRes = await certificatesApi.list(seminar.id);
                    existingNames = new Set((existingRes.data as unknown as { recipientName: string }[]).map((c) => c.recipientName));
                  } catch (e) {
                    console.error("[cert] 기존 발급 조회 실패:", e);
                  }
                  for (let i = 0; i < names.length; i++) {
                    onProgress?.(i + 1, names.length);
                    const name = names[i];
                    if (existingNames.has(name)) { skipped++; continue; }
                    try {
                      const no = await generateCertificateNo(certType);
                      await certificatesApi.create({ seminarId: seminar.id, seminarTitle: seminar.title, recipientName: name, type: certType, certificateNo: no, issuedAt: new Date().toISOString(), issuedBy: user?.id ?? "" });
                      created++;
                    } catch (e) {
                      console.error(`[cert] ${name} 발급 실패:`, e);
                      toast.error(`${name} 발급 실패: ${e instanceof Error ? e.message : "알 수 없는 오류"}`);
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
              selectedArea={selectedArea}
              onAreaDrag={handleAreaDrag}
              onSelectArea={(key) => {
                setSelectedArea(key);
                setExpandedArea(key);
              }}
              previewScale={zoom}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
