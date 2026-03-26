"use client";

import { useState, useRef } from "react";
import { useSeminars, useSeminar, useAttendees } from "@/features/seminar/useSeminar";
import { registrationsApi, attendeesApi, seminarsApi } from "@/lib/bkend";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Download, Trash2, Pencil, Settings, UserPlus, Plus, Loader2,
  BarChart3, Users, FileSpreadsheet, Link, MessageSquare, Share2, Copy, Printer,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { parseExcelFile, parseCSVText, extractSheetId, getSheetCsvUrl } from "@/lib/parse-spreadsheet";
import type { SeminarRegistration, SeminarAttendee, RegistrationFieldConfig } from "@/types";
import { DEFAULT_REGISTRATION_FIELDS } from "@/types";

const REG_COLUMNS = ["이름", "이메일", "소속", "연락처", "메모"];

function exportRegistrationsCSV(seminarTitle: string, regs: SeminarRegistration[]) {
  const header = "이름,이메일,소속,연락처,메모,신청일시,참석자전환";
  const rows = regs.map((r) =>
    [r.name, r.email, r.affiliation ?? "", r.phone ?? "", `"${(r.memo ?? "").replace(/"/g, '""')}"`,
      r.createdAt ? new Date(r.createdAt).toLocaleString("ko-KR") : "", r.convertedAt ? "O" : ""].join(","),
  );
  const bom = "\uFEFF";
  const csv = bom + [header, ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `신청자_${seminarTitle.replace(/[^가-힣a-zA-Z0-9]/g, "_")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/* ── 탭 버튼 ── */
type TabKey = "manage" | "analysis" | "settings";
const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: "manage", label: "신청 관리", icon: <Users size={14} /> },
  { key: "analysis", label: "분석", icon: <BarChart3 size={14} /> },
  { key: "settings", label: "폼 설정", icon: <Settings size={14} /> },
];

/* ── 분석 섹션 ── */
function RegistrationAnalysis({
  registrations, attendees, seminarTitle, seminarDate,
}: {
  registrations: SeminarRegistration[];
  attendees: SeminarAttendee[];
  seminarTitle: string;
  seminarDate?: string;
}) {
  const [shareOpen, setShareOpen] = useState(false);

  if (registrations.length === 0) return <p className="py-8 text-center text-sm text-muted-foreground">신청 데이터가 없습니다.</p>;

  const total = registrations.length;
  const members = registrations.filter((r) => r.userId).length;
  const converted = registrations.filter((r) => r.convertedAt).length;
  const checkedIn = attendees.filter((a) => a.checkedIn).length;

  // 소속별 분포
  const affDist: Record<string, number> = {};
  for (const r of registrations) {
    const key = r.affiliation?.trim() || "미입력";
    affDist[key] = (affDist[key] || 0) + 1;
  }
  const affEntries = Object.entries(affDist).sort((a, b) => b[1] - a[1]);
  const affMax = Math.max(...affEntries.map(([, c]) => c), 1);

  // 질문 목록
  const questions = registrations.filter((r) => r.memo && r.memo !== "." && r.memo.trim().length > 1).map((r) => ({ id: r.id, name: r.name, q: r.memo! }));

  // 참석 전환율
  const convRate = total > 0 ? Math.round((converted / total) * 100) : 0;
  const checkRate = converted > 0 ? Math.round((checkedIn / converted) * 100) : 0;

  function generateShareText() {
    const lines = [
      `📊 ${seminarTitle} — 신청자 분석 리포트`,
      seminarDate ? `📅 ${seminarDate}` : "",
      "",
      `▸ 총 신청: ${total}명 (회원 ${members}명, 비회원 ${total - members}명)`,
      `▸ 참석자 전환: ${converted}명 (${convRate}%)`,
      converted > 0 ? `▸ 실제 출석: ${checkedIn}명 (전환 대비 ${checkRate}%)` : "",
      "",
    ];
    if (affEntries.length > 1) {
      lines.push("▸ 소속별 분포:");
      for (const [aff, count] of affEntries) lines.push(`  - ${aff}: ${count}명`);
      lines.push("");
    }
    if (questions.length > 0) {
      lines.push("▸ 사전 질문/메모:");
      for (const { name, q } of questions) lines.push(`  - ${name}: ${q}`);
    }
    return lines.filter(Boolean).join("\n");
  }

  function handleCopy() {
    navigator.clipboard.writeText(generateShareText());
    toast.success("리포트가 클립보드에 복사되었습니다.");
  }

  function handlePrint() {
    const text = generateShareText();
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<html><head><title>${seminarTitle} 신청자 리포트</title><style>body{font-family:sans-serif;padding:40px;white-space:pre-wrap;line-height:1.8;font-size:14px;}</style></head><body>${text}</body></html>`);
    w.document.close();
    w.print();
  }

  return (
    <div className="space-y-4">
      {/* 강사 공유 */}
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={() => setShareOpen(true)}>
          <Share2 size={14} className="mr-1" />강사 공유
        </Button>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border bg-white p-4 text-center">
          <p className="text-2xl font-bold text-blue-600">{total}</p>
          <p className="text-xs text-muted-foreground">총 신청</p>
        </div>
        <div className="rounded-xl border bg-white p-4 text-center">
          <p className="text-2xl font-bold text-primary">{members}</p>
          <p className="text-xs text-muted-foreground">회원</p>
        </div>
        <div className="rounded-xl border bg-white p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{converted}</p>
          <p className="text-xs text-muted-foreground">참석자 전환</p>
        </div>
        <div className="rounded-xl border bg-white p-4 text-center">
          <p className="text-2xl font-bold text-emerald-600">{checkedIn}</p>
          <p className="text-xs text-muted-foreground">실제 출석</p>
        </div>
      </div>

      {/* 전환율 / 출석률 */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border bg-white p-4">
          <div className="mb-1 flex items-center justify-between text-sm">
            <span>참석 전환율</span>
            <span className="font-medium">{convRate}%</span>
          </div>
          <div className="h-3 w-full rounded-full bg-muted/30">
            <div className="h-full rounded-full bg-green-500 transition-all" style={{ width: `${convRate}%` }} />
          </div>
        </div>
        <div className="rounded-xl border bg-white p-4">
          <div className="mb-1 flex items-center justify-between text-sm">
            <span>실제 출석률</span>
            <span className="font-medium">{checkRate}%</span>
          </div>
          <div className="h-3 w-full rounded-full bg-muted/30">
            <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${checkRate}%` }} />
          </div>
        </div>
      </div>

      {/* 소속별 분포 */}
      {affEntries.length > 1 && (
        <div className="rounded-xl border bg-white p-5">
          <h5 className="mb-3 text-sm font-medium">소속별 분포</h5>
          <div className="space-y-2">
            {affEntries.map(([aff, count]) => (
              <div key={aff} className="flex items-center gap-2 text-xs">
                <span className="w-28 truncate text-right text-muted-foreground" title={aff}>{aff}</span>
                <div className="h-4 flex-1 rounded bg-muted/30">
                  <div className="h-full rounded bg-blue-500/70 transition-all" style={{ width: `${(count / affMax) * 100}%` }} />
                </div>
                <span className="w-6 text-right text-muted-foreground">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 사전 질문/메모 */}
      {questions.length > 0 && (
        <div className="rounded-xl border bg-white p-5">
          <h5 className="mb-3 text-sm font-medium">사전 질문/메모 ({questions.length}건)</h5>
          <div className="max-h-60 space-y-2 overflow-y-auto">
            {questions.map((q) => (
              <div key={q.id} className="rounded-lg border bg-muted/10 px-4 py-3 text-xs">
                <span className="font-medium text-foreground">{q.name}</span>
                <p className="mt-1 leading-relaxed text-muted-foreground">{q.q}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 강사 공유 Dialog */}
      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>강사 공유용 리포트</DialogTitle></DialogHeader>
          <div className="max-h-80 overflow-y-auto rounded-lg border bg-muted/10 p-4">
            <pre className="whitespace-pre-wrap text-xs leading-relaxed">{generateShareText()}</pre>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handlePrint}><Printer size={14} className="mr-1" />인쇄</Button>
            <Button onClick={handleCopy}><Copy size={14} className="mr-1" />클립보드 복사</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ── 사전 질문 관리 ── */
function QuestionManager({ registrations, refetch }: { registrations: SeminarRegistration[]; refetch: () => void }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({ name: "", memo: "" });

  const withMemo = registrations.filter((r) => r.memo && r.memo.trim().length > 0 && r.memo !== ".");

  async function handleSaveMemo(id: string) {
    try {
      await registrationsApi.update(id, { memo: editText || undefined });
      toast.success("질문이 수정되었습니다.");
      setEditingId(null);
      refetch();
    } catch { toast.error("수정에 실패했습니다."); }
  }

  async function handleDeleteMemo(id: string) {
    try {
      await registrationsApi.update(id, { memo: "" });
      toast.success("질문이 삭제되었습니다.");
      refetch();
    } catch { toast.error("삭제에 실패했습니다."); }
  }

  async function handleAddQuestion() {
    if (!addForm.name.trim()) { toast.error("이름을 입력하세요."); return; }
    if (!addForm.memo.trim()) { toast.error("질문을 입력하세요."); return; }
    // 기존 신청자 중 이름 매칭하여 memo 업데이트, 없으면 안내
    const match = registrations.find((r) => r.name === addForm.name.trim() && (!r.memo || r.memo === "."));
    if (match) {
      try {
        await registrationsApi.update(match.id, { memo: addForm.memo.trim() });
        toast.success(`${addForm.name}의 질문이 추가되었습니다.`);
        setAddForm({ name: "", memo: "" });
        setAddOpen(false);
        refetch();
      } catch { toast.error("추가에 실패했습니다."); }
    } else {
      toast.error("해당 이름의 신청자를 찾을 수 없거나 이미 질문이 있습니다.");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h5 className="flex items-center gap-1.5 text-sm font-medium">
          <MessageSquare size={16} />
          사전 질문 관리 ({withMemo.length}건)
        </h5>
        <Button variant="outline" size="sm" onClick={() => setAddOpen(true)}>
          <Plus size={14} className="mr-1" />질문 추가
        </Button>
      </div>

      {withMemo.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">등록된 질문이 없습니다.</p>
      ) : (
        <div className="space-y-2">
          {withMemo.map((r) => (
            <div key={r.id} className="rounded-xl border bg-white p-4">
              {editingId === r.id ? (
                <div className="space-y-2">
                  <p className="text-xs font-medium">{r.name}</p>
                  <Textarea value={editText} onChange={(e) => setEditText(e.target.value)} rows={3} />
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => setEditingId(null)}>취소</Button>
                    <Button size="sm" onClick={() => handleSaveMemo(r.id)}>저장</Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <p className="text-xs font-medium">{r.name}</p>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{r.memo}</p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button variant="outline" size="sm" onClick={() => { setEditingId(r.id); setEditText(r.memo ?? ""); }}>
                      <Pencil size={12} />
                    </Button>
                    <Button variant="outline" size="sm" className="text-destructive" onClick={() => handleDeleteMemo(r.id)}>
                      <Trash2 size={12} />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 질문 추가 Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>사전 질문 추가</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium">신청자 이름 *</label>
              <Input value={addForm.name} onChange={(e) => setAddForm({ ...addForm, name: e.target.value })} placeholder="기존 신청자 이름" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium">질문 내용 *</label>
              <Textarea value={addForm.memo} onChange={(e) => setAddForm({ ...addForm, memo: e.target.value })} rows={3} placeholder="질문 내용을 입력하세요" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>취소</Button>
            <Button onClick={handleAddQuestion}>추가</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface EditForm {
  id: string;
  name: string;
  email: string;
  affiliation: string;
  phone: string;
  memo: string;
}

/* ── 신청서 폼 설정 ── */
function FormFieldsEditor({ seminarId, fields }: { seminarId: string; fields: RegistrationFieldConfig[] }) {
  const qc = useQueryClient();
  const [localFields, setLocalFields] = useState<RegistrationFieldConfig[]>(
    fields.length > 0 ? fields : DEFAULT_REGISTRATION_FIELDS,
  );
  const [saving, setSaving] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [newField, setNewField] = useState({ label: "", type: "text" as RegistrationFieldConfig["type"] });

  function toggleEnabled(idx: number) {
    const updated = [...localFields];
    if (updated[idx].key === "name" || updated[idx].key === "email") return;
    updated[idx] = { ...updated[idx], enabled: !updated[idx].enabled };
    setLocalFields(updated);
  }

  function toggleRequired(idx: number) {
    const updated = [...localFields];
    updated[idx] = { ...updated[idx], required: !updated[idx].required };
    setLocalFields(updated);
  }

  function addCustomField() {
    if (!newField.label.trim()) { toast.error("필드 이름을 입력하세요."); return; }
    setLocalFields([...localFields, {
      key: `custom_${Date.now()}`,
      label: newField.label.trim(),
      type: newField.type,
      required: false,
      enabled: true,
      placeholder: "",
    }]);
    setNewField({ label: "", type: "text" });
    setAddOpen(false);
  }

  function removeField(idx: number) {
    if (!localFields[idx].key.startsWith("custom_")) return;
    setLocalFields(localFields.filter((_, i) => i !== idx));
  }

  async function handleSave() {
    setSaving(true);
    try {
      await seminarsApi.update(seminarId, { registrationFields: localFields });
      qc.invalidateQueries({ queryKey: ["seminars", seminarId] });
      toast.success("신청서 폼 설정이 저장되었습니다.");
    } catch { toast.error("저장에 실패했습니다."); }
    finally { setSaving(false); }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h5 className="text-sm font-medium">신청서 필드 설정</h5>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setAddOpen(true)}><Plus size={14} className="mr-1" />필드 추가</Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving && <Loader2 size={14} className="mr-1 animate-spin" />}저장
          </Button>
        </div>
      </div>

      <div className="space-y-1.5">
        {localFields.map((f, i) => (
          <div key={f.key} className={cn(
            "flex items-center gap-3 rounded-lg border px-3 py-2 text-sm",
            !f.enabled && "opacity-50 bg-muted/20",
          )}>
            <Checkbox checked={f.enabled} onCheckedChange={() => toggleEnabled(i)} disabled={f.key === "name" || f.key === "email"} />
            <span className="flex-1 font-medium">{f.label}</span>
            <Badge variant="outline" className="text-[10px]">{f.type}</Badge>
            <label className="flex items-center gap-1 text-xs text-muted-foreground">
              <Checkbox checked={f.required} onCheckedChange={() => toggleRequired(i)} disabled={!f.enabled} />필수
            </label>
            {f.key.startsWith("custom_") && (
              <button onClick={() => removeField(i)} className="text-muted-foreground hover:text-destructive"><Trash2 size={12} /></button>
            )}
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">활성화된 필드만 공개 신청 폼에 표시됩니다. 이름/이메일은 필수입니다.</p>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>커스텀 필드 추가</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium">필드 이름</label>
              <Input value={newField.label} onChange={(e) => setNewField({ ...newField, label: e.target.value })} placeholder="예: 소속 학과" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium">입력 타입</label>
              <select value={newField.type} onChange={(e) => setNewField({ ...newField, type: e.target.value as RegistrationFieldConfig["type"] })} className="w-full rounded-md border px-3 py-1.5 text-sm">
                <option value="text">텍스트</option><option value="email">이메일</option><option value="tel">전화번호</option><option value="textarea">장문 텍스트</option><option value="select">선택형</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>취소</Button>
            <Button onClick={addCustomField}>추가</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ── 메인 컴포넌트 ── */
export default function RegistrationsTab() {
  const { seminars } = useSeminars();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const seminar = seminars.find((s) => s.id === selectedId);
  const [activeTab, setActiveTab] = useState<TabKey>("manage");
  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const [converting, setConverting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [registering, setRegistering] = useState(false);
  const excelRef = useRef<HTMLInputElement>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetUrl, setSheetUrl] = useState("");
  const [sheetLoading, setSheetLoading] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualForm, setManualForm] = useState({ name: "", email: "", affiliation: "", phone: "", memo: "" });

  const qc = useQueryClient();
  const seminarDetail = useSeminar(selectedId ?? "");
  const { attendees } = useAttendees(selectedId ?? "");

  const { data, refetch } = useQuery({
    queryKey: ["registrations", selectedId],
    queryFn: async () => {
      if (!selectedId) return [];
      const res = await registrationsApi.list(selectedId);
      return res.data as unknown as SeminarRegistration[];
    },
    enabled: !!selectedId,
    retry: false,
  });

  const registrations = data ?? [];

  // 신청자 등록 (엑셀/시트/수기)
  async function registerFromData(rows: { name: string; email: string; affiliation: string; phone: string; memo: string }[]) {
    if (rows.length === 0) { toast.error("데이터가 없습니다."); return; }
    if (!selectedId) return;
    setRegistering(true);
    let added = 0;
    let skipped = 0;
    const existingEmails = new Set(registrations.map((r) => r.email).filter(Boolean));
    try {
      for (const row of rows) {
        if (!row.name.trim()) continue; // 이름 없으면 스킵
        if (row.email && existingEmails.has(row.email)) { skipped++; continue; }
        await registrationsApi.create({
          seminarId: selectedId,
          name: row.name,
          email: row.email,
          affiliation: row.affiliation || undefined,
          phone: row.phone || undefined,
          memo: row.memo || undefined,
        });
        existingEmails.add(row.email);
        added++;
      }
      qc.invalidateQueries({ queryKey: ["registrations", selectedId] });
      await refetch();
      const parts = [];
      if (added > 0) parts.push(`${added}명 신청 등록`);
      if (skipped > 0) parts.push(`${skipped}명 중복 건너뜀`);
      toast.success(parts.join(", "));
    } catch { toast.error("등록 중 오류가 발생했습니다."); }
    finally { setRegistering(false); }
  }

  async function handleExcelUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const raw = await parseExcelFile(file, REG_COLUMNS);
      await registerFromData(raw.map((r) => ({
        name: r["이름"] || "", email: r["이메일"] || "", affiliation: r["소속"] || "",
        phone: r["연락처"] || "", memo: r["메모"] || "",
      })));
    } catch { toast.error("파일을 읽을 수 없습니다."); }
    if (excelRef.current) excelRef.current.value = "";
  }

  async function handleSheetLoad() {
    const sheetId = extractSheetId(sheetUrl);
    if (!sheetId) { toast.error("올바른 구글 스프레드시트 URL을 입력하세요."); return; }
    setSheetLoading(true);
    try {
      const res = await fetch(`/api/sheets?url=${encodeURIComponent(getSheetCsvUrl(sheetId))}`);
      if (!res.ok) { toast.error("불러오기 실패"); return; }
      const raw = parseCSVText(await res.text(), REG_COLUMNS);
      await registerFromData(raw.map((r) => ({
        name: r["이름"] || "", email: r["이메일"] || "", affiliation: r["소속"] || "",
        phone: r["연락처"] || "", memo: r["메모"] || "",
      })));
      setSheetOpen(false);
      setSheetUrl("");
    } catch { toast.error("스프레드시트 연결 실패"); }
    finally { setSheetLoading(false); }
  }

  async function handleManualRegister() {
    if (!manualForm.name.trim() || !manualForm.email.trim()) { toast.error("이름과 이메일은 필수입니다."); return; }
    await registerFromData([manualForm]);
    setManualForm({ name: "", email: "", affiliation: "", phone: "", memo: "" });
    setManualOpen(false);
  }

  async function handleDelete(id: string) {
    try { await registrationsApi.delete(id); toast.success("삭제되었습니다."); refetch(); }
    catch { toast.error("삭제 실패"); }
  }

  function openEdit(reg: SeminarRegistration) {
    setEditForm({ id: reg.id, name: reg.name, email: reg.email, affiliation: reg.affiliation ?? "", phone: reg.phone ?? "", memo: reg.memo ?? "" });
  }

  async function handleSaveEdit() {
    if (!editForm) return;
    try {
      await registrationsApi.update(editForm.id, {
        name: editForm.name, email: editForm.email,
        affiliation: editForm.affiliation || undefined, phone: editForm.phone || undefined, memo: editForm.memo || undefined,
      });
      toast.success("수정되었습니다."); setEditForm(null); refetch();
    } catch { toast.error("수정 실패"); }
  }

  function toggleSelect(id: string) {
    setSelected((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  }
  function toggleAll() {
    const convertable = registrations.filter((r) => !r.convertedAt);
    if (selected.size === convertable.length) setSelected(new Set());
    else setSelected(new Set(convertable.map((r) => r.id)));
  }

  async function convertToAttendees(ids: string[]) {
    if (!selectedId) return;
    setConverting(true);
    let added = 0, skipped = 0;
    try {
      for (const reg of registrations.filter((r) => ids.includes(r.id))) {
        if (reg.userId) {
          const existing = await attendeesApi.check(selectedId, reg.userId);
          if ((existing.data as unknown[]).length > 0) { skipped++; continue; }
        }
        await attendeesApi.addWithDetails(selectedId, {
          userName: reg.name, userId: reg.userId || `guest_${reg.email}`,
          email: reg.email, phone: reg.phone || undefined,
          interests: reg.affiliation || undefined, questions: reg.memo || undefined,
          isGuest: !reg.userId, checkedIn: false, checkedInAt: null, checkedInBy: null,
        });
        await registrationsApi.update(reg.id, { convertedAt: new Date().toISOString() });
        added++;
      }
      qc.invalidateQueries({ queryKey: ["attendees", selectedId] });
      refetch(); setSelected(new Set());
      const parts = [];
      if (added > 0) parts.push(`${added}명 참석자 등록`);
      if (skipped > 0) parts.push(`${skipped}명 중복 건너뜀`);
      toast.success(parts.join(", "));
    } catch { toast.error("전환 중 오류"); }
    finally { setConverting(false); }
  }

  const convertableSelected = [...selected].filter((id) => { const r = registrations.find((reg) => reg.id === id); return r && !r.convertedAt; });

  return (
    <div className="space-y-6">
      {/* 세미나 선택 */}
      <div className="flex items-end gap-4">
        <div className="flex-1">
          <label className="mb-2 block text-sm font-medium">세미나 선택</label>
          <select value={selectedId ?? ""} onChange={(e) => { setSelectedId(e.target.value || null); setSelected(new Set()); setActiveTab("manage"); }} className="w-full rounded-lg border px-3 py-2 text-sm">
            <option value="">-- 세미나를 선택하세요 --</option>
            {seminars.map((s) => <option key={s.id} value={s.id}>{s.title} ({s.date})</option>)}
          </select>
        </div>
        {seminar && registrations.length > 0 && (
          <Button variant="outline" size="sm" onClick={() => exportRegistrationsCSV(seminar.title, registrations)}>
            <Download size={14} className="mr-1" />CSV
          </Button>
        )}
      </div>

      {/* 서브 탭 */}
      {selectedId && (
        <div className="flex gap-1 border-b">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "flex items-center gap-1.5 border-b-2 px-4 py-2 text-sm font-medium transition-colors",
                activeTab === tab.key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {tab.icon}{tab.label}
            </button>
          ))}
        </div>
      )}

      {/* 신청 관리 탭 */}
      {selectedId && activeTab === "manage" && (
        <div className="space-y-4">
          {/* 등록 버튼 */}
          <div className="rounded-xl border bg-white p-4">
            <div className="flex items-center justify-between">
              <h4 className="flex items-center gap-1.5 text-sm font-medium"><UserPlus size={16} />신청자 등록</h4>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => excelRef.current?.click()} disabled={registering}>
                  {registering ? <Loader2 size={14} className="mr-1 animate-spin" /> : <FileSpreadsheet size={14} className="mr-1" />}엑셀
                </Button>
                <input ref={excelRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleExcelUpload} />
                <Button variant="outline" size="sm" onClick={() => setSheetOpen(true)} disabled={registering}><Link size={14} className="mr-1" />구글 시트</Button>
                <Button variant="outline" size="sm" onClick={() => setManualOpen(true)} disabled={registering}><UserPlus size={14} className="mr-1" />수기 등록</Button>
              </div>
            </div>
          </div>

          {/* 신청 목록 */}
          <div className="rounded-xl border bg-white">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <span className="text-sm font-medium">신청자 {registrations.length}명</span>
              {convertableSelected.length > 0 && (
                <Button size="sm" onClick={() => convertToAttendees(convertableSelected)} disabled={converting}>
                  {converting ? <Loader2 size={14} className="mr-1 animate-spin" /> : <UserPlus size={14} className="mr-1" />}
                  참석자 전환 ({convertableSelected.length})
                </Button>
              )}
            </div>
            {registrations.length === 0 ? (
              <p className="p-6 text-center text-sm text-muted-foreground">신청 내역이 없습니다.</p>
            ) : (
              <div className="max-h-96 overflow-x-auto overflow-y-auto">
                <table className="w-full text-sm whitespace-nowrap">
                  <thead className="sticky top-0 border-b bg-muted/30">
                    <tr>
                      <th className="px-3 py-2 text-left"><Checkbox checked={registrations.filter((r) => !r.convertedAt).length > 0 && selected.size === registrations.filter((r) => !r.convertedAt).length} onCheckedChange={toggleAll} /></th>
                      <th className="px-3 py-2 text-left font-medium">이름</th>
                      <th className="px-3 py-2 text-left font-medium">이메일</th>
                      <th className="px-3 py-2 text-left font-medium">소속</th>
                      <th className="px-3 py-2 text-left font-medium">연락처</th>
                      <th className="px-3 py-2 text-left font-medium">상태</th>
                      <th className="px-3 py-2 text-left font-medium">관리</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {registrations.map((r) => (
                      <tr key={r.id} className={cn(selected.has(r.id) && "bg-primary/5")}>
                        <td className="px-3 py-2"><Checkbox checked={selected.has(r.id)} onCheckedChange={() => toggleSelect(r.id)} disabled={!!r.convertedAt} /></td>
                        <td className="px-3 py-2 font-medium">{r.name}</td>
                        <td className="px-3 py-2 text-muted-foreground">{r.email}</td>
                        <td className="px-3 py-2 text-muted-foreground">{r.affiliation ?? "-"}</td>
                        <td className="px-3 py-2 text-muted-foreground">{r.phone ?? "-"}</td>
                        <td className="px-3 py-2">
                          <div className="flex flex-wrap gap-1">
                            {r.userId && <Badge variant="secondary" className="text-[10px]">회원</Badge>}
                            {r.convertedAt ? <Badge className="bg-green-50 text-green-700 text-[10px]">참석 등록</Badge> : <Badge variant="outline" className="text-[10px] text-muted-foreground">대기</Badge>}
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex gap-1">
                            <Button variant="outline" size="sm" onClick={() => openEdit(r)}><Pencil size={12} /></Button>
                            <Button variant="outline" size="sm" className="text-destructive" onClick={() => handleDelete(r.id)}><Trash2 size={12} /></Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* 사전 질문 관리 */}
          <div className="rounded-xl border bg-white p-5">
            <QuestionManager registrations={registrations} refetch={refetch} />
          </div>
        </div>
      )}

      {/* 분석 탭 */}
      {selectedId && activeTab === "analysis" && (
        <RegistrationAnalysis
          registrations={registrations}
          attendees={attendees}
          seminarTitle={seminar?.title ?? ""}
          seminarDate={seminar?.date}
        />
      )}

      {/* 폼 설정 탭 */}
      {selectedId && activeTab === "settings" && seminarDetail && (
        <div className="rounded-xl border bg-white p-5">
          <FormFieldsEditor seminarId={selectedId} fields={(seminarDetail.registrationFields as RegistrationFieldConfig[]) ?? []} />
        </div>
      )}

      {/* Dialogs */}
      <Dialog open={sheetOpen} onOpenChange={setSheetOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>구글 스프레드시트에서 신청자 등록</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input value={sheetUrl} onChange={(e) => setSheetUrl(e.target.value)} placeholder="https://docs.google.com/spreadsheets/d/..." />
            <p className="text-xs text-muted-foreground">&quot;링크가 있는 모든 사용자에게 공개&quot; 설정 필요. 이름/이메일/소속/연락처/메모 열 자동 인식.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSheetOpen(false)}>취소</Button>
            <Button onClick={handleSheetLoad} disabled={sheetLoading || !sheetUrl.trim()}>
              {sheetLoading && <Loader2 size={14} className="mr-1 animate-spin" />}불러오기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={manualOpen} onOpenChange={setManualOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>신청자 수기 등록</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><label className="mb-1 block text-xs font-medium">이름 *</label><Input value={manualForm.name} onChange={(e) => setManualForm({ ...manualForm, name: e.target.value })} /></div>
              <div><label className="mb-1 block text-xs font-medium">이메일 *</label><Input value={manualForm.email} onChange={(e) => setManualForm({ ...manualForm, email: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="mb-1 block text-xs font-medium">소속</label><Input value={manualForm.affiliation} onChange={(e) => setManualForm({ ...manualForm, affiliation: e.target.value })} /></div>
              <div><label className="mb-1 block text-xs font-medium">연락처</label><Input value={manualForm.phone} onChange={(e) => setManualForm({ ...manualForm, phone: e.target.value })} /></div>
            </div>
            <div><label className="mb-1 block text-xs font-medium">메모/질문</label><Textarea value={manualForm.memo} onChange={(e) => setManualForm({ ...manualForm, memo: e.target.value })} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setManualOpen(false)}>취소</Button>
            <Button onClick={handleManualRegister} disabled={registering}>등록</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editForm} onOpenChange={(open) => !open && setEditForm(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>신청 정보 수정</DialogTitle></DialogHeader>
          {editForm && (
            <div className="grid gap-3">
              <div><label className="mb-1 block text-sm font-medium">이름</label><Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} /></div>
              <div><label className="mb-1 block text-sm font-medium">이메일</label><Input type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="mb-1 block text-sm font-medium">소속</label><Input value={editForm.affiliation} onChange={(e) => setEditForm({ ...editForm, affiliation: e.target.value })} /></div>
                <div><label className="mb-1 block text-sm font-medium">연락처</label><Input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} /></div>
              </div>
              <div><label className="mb-1 block text-sm font-medium">메모</label><Textarea value={editForm.memo} onChange={(e) => setEditForm({ ...editForm, memo: e.target.value })} rows={3} /></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditForm(null)}>취소</Button>
            <Button onClick={handleSaveEdit}>저장</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
