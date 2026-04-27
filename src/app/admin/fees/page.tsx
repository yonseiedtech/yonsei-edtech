"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { dataApi, profilesApi } from "@/lib/bkend";
import { parseExcelFile, type SpreadsheetRow } from "@/lib/parse-spreadsheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import ConsolePageHeader from "@/components/admin/ConsolePageHeader";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Wallet,
  Check,
  X,
  Search,
  Download,
  Settings,
  Users,
  TrendingUp,
  Loader2,
  Plus,
  BookOpen,
  ArrowUpCircle,
  ArrowDownCircle,
  Pencil,
  Trash2,
  FileSpreadsheet,
  Upload,
  RefreshCw,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { todayYmdLocal } from "@/lib/dday";

interface FeePayment {
  id: string;
  userId: string;
  userName: string;
  studentId: string;
  semester: string; // "2026-1", "2026-2"
  amount: number;
  status: "paid" | "unpaid" | "exempt";
  paidAt?: string;
  confirmedBy?: string;
  memo?: string;
  createdAt: string;
}

interface FeeSetting {
  id: string;
  semester: string;
  amount: number;
  dueDate?: string;
  createdAt: string;
}

interface Transaction {
  id: string;
  type: "income" | "expense";
  category: string;
  description: string;
  amount: number;
  date: string;
  semester: string;
  memo?: string;
  createdBy: string;
  createdAt: string;
}

const INCOME_CATEGORIES = ["학회비", "후원금", "행사 수입", "기타 수입"];
const EXPENSE_CATEGORIES = ["행사비", "식비/다과", "인쇄/제작", "교통비", "강사료", "플랫폼/서비스", "사무용품", "기타 지출"];

type Section = "dashboard" | "payments" | "ledger" | "settings";
type PaymentFilter = "all" | "paid" | "unpaid" | "exempt";

const CURRENT_YEAR = new Date().getFullYear();
const SEMESTERS = [
  `${CURRENT_YEAR}-1`,
  `${CURRENT_YEAR}-2`,
  `${CURRENT_YEAR - 1}-1`,
  `${CURRENT_YEAR - 1}-2`,
];

function formatSemester(s: string) {
  const [year, half] = s.split("-");
  return `${year}년 ${half === "1" ? "1학기" : "2학기"}`;
}

export default function FeesPage() {
  const queryClient = useQueryClient();
  const [section, setSection] = useState<Section>("dashboard");
  const [selectedSemester, setSelectedSemester] = useState(SEMESTERS[0]);
  const [searchQuery, setSearchQuery] = useState("");
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>("all");

  // 설정 다이얼로그
  const [showSettings, setShowSettings] = useState(false);
  const [settingAmount, setSettingAmount] = useState("");
  const [settingDueDate, setSettingDueDate] = useState("");

  // 메모 다이얼로그
  const [memoDialog, setMemoDialog] = useState<{ paymentId: string; memo: string } | null>(null);

  // 엑셀 대조 상태
  const [reconcileExpanded, setReconcileExpanded] = useState(false);
  const [reconcileFile, setReconcileFile] = useState<File | null>(null);
  const [reconcileRows, setReconcileRows] = useState<SpreadsheetRow[] | null>(null);
  const [reconcileLoading, setReconcileLoading] = useState(false);
  const [reconcileBulk, setReconcileBulk] = useState(false);

  // 장부 상태
  const [showTxDialog, setShowTxDialog] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [txForm, setTxForm] = useState({
    type: "expense" as "income" | "expense",
    category: "",
    description: "",
    amount: "",
    date: todayYmdLocal(),
    memo: "",
  });
  const [ledgerFilter, setLedgerFilter] = useState<"all" | "income" | "expense">("all");

  // 데이터 조회
  const { data: payments = [] } = useQuery({
    queryKey: ["fee_payments", selectedSemester],
    queryFn: async () => {
      const res = await dataApi.list<FeePayment>("fee_payments", {
        "filter[semester]": selectedSemester,
      });
      return res.data;
    },
  });

  const { data: feeSettings = [] } = useQuery({
    queryKey: ["fee_settings"],
    queryFn: async () => {
      const res = await dataApi.list<FeeSetting>("fee_settings");
      return res.data;
    },
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ["transactions", selectedSemester],
    queryFn: async () => {
      const res = await dataApi.list<Transaction>("transactions", {
        "filter[semester]": selectedSemester,
        sort: "date:desc",
      });
      return res.data;
    },
  });

  const { data: members = [] } = useQuery({
    queryKey: ["admin", "all-members"],
    queryFn: async () => {
      const res = await profilesApi.list({ limit: 500 });
      return res.data as unknown as {
        id: string; name: string; username: string; studentId?: string;
        email: string; approved: boolean; memberType?: string;
      }[];
    },
  });

  const currentSetting = feeSettings.find((s) => s.semester === selectedSemester);
  const feeAmount = currentSetting?.amount ?? 0;

  // 회원별 납부 상태 매핑
  const paymentMap = new Map(payments.map((p) => [p.userId, p]));
  const approvedMembers = members.filter((m) => m.approved);

  // 납부 현황 목록 (회원 + 납부 기록 병합)
  const memberPayments = approvedMembers.map((m) => {
    const payment = paymentMap.get(m.id);
    return {
      ...m,
      payment,
      status: (payment?.status ?? "unpaid") as "paid" | "unpaid" | "exempt",
    };
  });

  // 필터 + 검색
  const filtered = memberPayments.filter((m) => {
    if (paymentFilter !== "all" && m.status !== paymentFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return m.name.toLowerCase().includes(q) || (m.studentId ?? "").includes(q);
    }
    return true;
  });

  // 통계
  const stats = {
    total: approvedMembers.length,
    paid: memberPayments.filter((m) => m.status === "paid").length,
    unpaid: memberPayments.filter((m) => m.status === "unpaid").length,
    exempt: memberPayments.filter((m) => m.status === "exempt").length,
    totalAmount: memberPayments.filter((m) => m.status === "paid").reduce((sum, m) => sum + (m.payment?.amount ?? feeAmount), 0),
  };
  const paidRate = stats.total > 0 ? Math.round((stats.paid / stats.total) * 100) : 0;

  // 납부 처리
  const payMutation = useMutation({
    mutationFn: async ({ userId, userName, studentId, status, memo }: {
      userId: string; userName: string; studentId: string; status: "paid" | "unpaid" | "exempt"; memo?: string;
    }) => {
      const existing = paymentMap.get(userId);
      if (existing) {
        await dataApi.update("fee_payments", existing.id, {
          status,
          amount: feeAmount,
          paidAt: status === "paid" ? new Date().toISOString() : null,
          memo: memo || null,
        });
      } else {
        await dataApi.create("fee_payments", {
          userId,
          userName,
          studentId,
          semester: selectedSemester,
          amount: feeAmount,
          status,
          paidAt: status === "paid" ? new Date().toISOString() : null,
          memo: memo || null,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fee_payments", selectedSemester] });
      toast.success("납부 상태가 업데이트되었습니다.");
    },
  });

  // 설정 저장
  async function saveSetting() {
    const amount = Number(settingAmount);
    if (!amount || amount <= 0) { toast.error("금액을 입력하세요."); return; }
    if (currentSetting) {
      await dataApi.update("fee_settings", currentSetting.id, { amount, dueDate: settingDueDate || null });
    } else {
      await dataApi.create("fee_settings", { semester: selectedSemester, amount, dueDate: settingDueDate || null });
    }
    queryClient.invalidateQueries({ queryKey: ["fee_settings"] });
    setShowSettings(false);
    toast.success("학회비 설정이 저장되었습니다.");
  }

  // 일괄 납부 처리
  async function bulkMarkPaid(userIds: string[]) {
    for (const uid of userIds) {
      const m = approvedMembers.find((mm) => mm.id === uid);
      if (!m) continue;
      await payMutation.mutateAsync({ userId: uid, userName: m.name, studentId: m.studentId ?? "", status: "paid" });
    }
  }

  // 엑셀 대조 — 행 매칭
  type ReconcileMatch = {
    row: SpreadsheetRow;
    matched: typeof approvedMembers[number] | null;
    candidates: typeof approvedMembers;
    status: "matched" | "ambiguous" | "not_found" | "already_paid";
    amount?: number;
  };

  function matchRowToMember(row: SpreadsheetRow): ReconcileMatch {
    const sid = (row["학번"] ?? "").trim();
    const email = (row["이메일"] ?? "").trim().toLowerCase();
    const name = (row["이름"] ?? "").trim();
    const amountRaw = (row["금액"] ?? "").replace(/[^0-9.-]/g, "");
    const amount = amountRaw ? Number(amountRaw) : undefined;

    let matched: typeof approvedMembers[number] | null = null;
    let candidates: typeof approvedMembers = [];

    if (sid) {
      candidates = approvedMembers.filter((m) => (m.studentId ?? "").trim() === sid);
      if (candidates.length === 1) matched = candidates[0];
    }
    if (!matched && email) {
      const byEmail = approvedMembers.filter((m) => (m.email ?? "").toLowerCase() === email);
      if (byEmail.length === 1) matched = byEmail[0];
      else if (byEmail.length > 1) candidates = byEmail;
    }
    if (!matched && name) {
      const byName = approvedMembers.filter((m) => m.name === name);
      if (byName.length === 1) matched = byName[0];
      else if (byName.length > 1) candidates = byName;
    }

    if (matched) {
      const existing = paymentMap.get(matched.id);
      if (existing?.status === "paid") {
        return { row, matched, candidates: [matched], status: "already_paid", amount };
      }
      return { row, matched, candidates: [matched], status: "matched", amount };
    }
    if (candidates.length > 1) {
      return { row, matched: null, candidates, status: "ambiguous", amount };
    }
    return { row, matched: null, candidates: [], status: "not_found", amount };
  }

  const reconcileMatches: ReconcileMatch[] = reconcileRows
    ? reconcileRows.map(matchRowToMember)
    : [];

  const reconcileStats = {
    total: reconcileMatches.length,
    matched: reconcileMatches.filter((m) => m.status === "matched").length,
    alreadyPaid: reconcileMatches.filter((m) => m.status === "already_paid").length,
    ambiguous: reconcileMatches.filter((m) => m.status === "ambiguous").length,
    notFound: reconcileMatches.filter((m) => m.status === "not_found").length,
  };

  async function handleReconcileParse() {
    if (!reconcileFile) { toast.error("파일을 선택하세요."); return; }
    setReconcileLoading(true);
    try {
      const rows = await parseExcelFile(reconcileFile, ["이름", "학번", "이메일", "금액"]);
      if (rows.length === 0) {
        toast.error("파싱된 행이 없습니다. 헤더에 이름/학번/이메일/금액이 포함되어 있는지 확인하세요.");
        setReconcileRows(null);
      } else {
        setReconcileRows(rows);
        toast.success(`${rows.length}행 분석 완료`);
      }
    } catch (e) {
      console.error(e);
      toast.error("파일 파싱에 실패했습니다.");
      setReconcileRows(null);
    } finally {
      setReconcileLoading(false);
    }
  }

  async function handleReconcileApply() {
    const ids = reconcileMatches
      .filter((m) => m.status === "matched" && m.matched)
      .map((m) => m.matched!.id);
    if (ids.length === 0) { toast.error("일치하는 회원이 없습니다."); return; }
    if (!confirm(`일치 ${ids.length}건을 일괄 납부 처리하시겠습니까?\n(이미 납부, 미등록, 동명이인 항목은 제외됩니다.)`)) return;
    setReconcileBulk(true);
    try {
      await bulkMarkPaid(ids);
      toast.success(`${ids.length}건 일괄 납부 처리 완료`);
      setReconcileRows(null);
      setReconcileFile(null);
    } catch (e) {
      console.error(e);
      toast.error("일괄 처리 중 일부가 실패했습니다.");
    } finally {
      setReconcileBulk(false);
    }
  }

  function handleReconcileReset() {
    setReconcileRows(null);
    setReconcileFile(null);
  }

  // 거래 추가/수정
  const txMutation = useMutation({
    mutationFn: async (data: typeof txForm & { id?: string }) => {
      const payload = {
        type: data.type,
        category: data.category,
        description: data.description,
        amount: Number(data.amount),
        date: data.date,
        semester: selectedSemester,
        memo: data.memo || null,
        createdBy: members.find((m) => m.id)?.name ?? "",
      };
      if (data.id) {
        await dataApi.update("transactions", data.id, payload);
      } else {
        await dataApi.create("transactions", payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions", selectedSemester] });
      setShowTxDialog(false);
      setEditingTx(null);
      setTxForm({ type: "expense", category: "", description: "", amount: "", date: todayYmdLocal(), memo: "" });
      toast.success(editingTx ? "거래가 수정되었습니다." : "거래가 등록되었습니다.");
    },
  });

  const deleteTxMutation = useMutation({
    mutationFn: (id: string) => dataApi.delete("transactions", id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions", selectedSemester] });
      toast.success("거래가 삭제되었습니다.");
    },
  });

  // 장부 통계
  const ledgerStats = (() => {
    const income = transactions.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
    const expense = transactions.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
    return { income, expense, balance: income - expense };
  })();

  const filteredTx = transactions.filter((t) => ledgerFilter === "all" || t.type === ledgerFilter);

  function openTxDialog(tx?: Transaction) {
    if (tx) {
      setEditingTx(tx);
      setTxForm({ type: tx.type, category: tx.category, description: tx.description, amount: String(tx.amount), date: tx.date, memo: tx.memo ?? "" });
    } else {
      setEditingTx(null);
      setTxForm({ type: "expense", category: "", description: "", amount: "", date: todayYmdLocal(), memo: "" });
    }
    setShowTxDialog(true);
  }

  // CSV 내보내기
  function exportCSV() {
    const bom = "\uFEFF";
    const header = "이름,학번,이메일,상태,금액,납부일,메모\n";
    const rows = filtered.map((m) => {
      const s = m.status === "paid" ? "납부" : m.status === "exempt" ? "면제" : "미납";
      const amt = m.payment?.amount ?? (m.status === "paid" ? feeAmount : 0);
      const date = m.payment?.paidAt ? new Date(m.payment.paidAt).toLocaleDateString("ko-KR") : "";
      return `"${m.name}","${m.studentId ?? ""}","${m.email}","${s}",${amt},"${date}","${m.payment?.memo ?? ""}"`;
    }).join("\n");
    const blob = new Blob([bom + header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `학회비_${selectedSemester}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <ConsolePageHeader
        icon={Wallet}
        title="학회비 관리"
        description="학기별 학회비 납부 현황과 수입·지출 장부를 한 곳에서 관리합니다."
        actions={
          <select
            value={selectedSemester}
            onChange={(e) => setSelectedSemester(e.target.value)}
            className="rounded-lg border px-3 py-1.5 text-sm"
          >
            {SEMESTERS.map((s) => (
              <option key={s} value={s}>{formatSemester(s)}</option>
            ))}
          </select>
        }
      />

      <Tabs value={section} onValueChange={(v) => setSection(v as Section)}>
        <TabsList>
          <TabsTrigger value="dashboard">
            <TrendingUp size={14} className="mr-1" />대시보드
          </TabsTrigger>
          <TabsTrigger value="payments">
            <Users size={14} className="mr-1" />납부 현황
          </TabsTrigger>
          <TabsTrigger value="ledger">
            <BookOpen size={14} className="mr-1" />수입·지출
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Settings size={14} className="mr-1" />설정
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="mt-4">
          <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4">
            <div className="rounded-lg border bg-white p-4 text-center">
              <p className="text-3xl font-bold">{stats.total}</p>
              <p className="text-xs text-muted-foreground">전체 회원</p>
            </div>
            <div className="rounded-lg border bg-white p-4 text-center">
              <p className="text-3xl font-bold text-green-600">{stats.paid}</p>
              <p className="text-xs text-muted-foreground">납부 완료</p>
            </div>
            <div className="rounded-lg border bg-white p-4 text-center">
              <p className="text-3xl font-bold text-red-500">{stats.unpaid}</p>
              <p className="text-xs text-muted-foreground">미납</p>
            </div>
            <div className="rounded-lg border bg-white p-4 text-center">
              <p className="text-3xl font-bold text-primary">{paidRate}%</p>
              <p className="text-xs text-muted-foreground">납부율</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4">
            <div className="rounded-lg border bg-white p-4">
              <p className="text-sm text-muted-foreground">{formatSemester(selectedSemester)} 학회비</p>
              <p className="mt-1 text-2xl font-bold">{feeAmount > 0 ? `${feeAmount.toLocaleString()}원` : "미설정"}</p>
              {currentSetting?.dueDate && (
                <p className="mt-1 text-xs text-muted-foreground">납부 기한: {currentSetting.dueDate}</p>
              )}
            </div>
            <div className="rounded-lg border bg-white p-4">
              <p className="text-sm text-muted-foreground">총 납부 금액</p>
              <p className="mt-1 text-2xl font-bold text-green-600">{stats.totalAmount.toLocaleString()}원</p>
              <p className="mt-1 text-xs text-muted-foreground">면제 {stats.exempt}명</p>
            </div>
            <div className="rounded-lg border bg-white p-4">
              <p className="text-sm text-muted-foreground">총 수입 / 지출</p>
              <p className="mt-1 text-lg font-bold">
                <span className="text-green-600">+{ledgerStats.income.toLocaleString()}</span>
                <span className="mx-1 text-muted-foreground">/</span>
                <span className="text-red-500">-{ledgerStats.expense.toLocaleString()}</span>
              </p>
            </div>
            <div className="rounded-lg border bg-white p-4">
              <p className="text-sm text-muted-foreground">잔액</p>
              <p className={cn("mt-1 text-2xl font-bold", ledgerStats.balance >= 0 ? "text-primary" : "text-red-500")}>
                {ledgerStats.balance >= 0 ? "+" : ""}{ledgerStats.balance.toLocaleString()}원
              </p>
            </div>
          </div>

          {/* 납부율 프로그레스 바 */}
          <div className="rounded-lg border bg-white p-4">
            <div className="flex items-center justify-between text-sm">
              <span>납부 진행률</span>
              <span className="font-medium">{stats.paid} / {stats.total}명</span>
            </div>
            <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-green-500 transition-all"
                style={{ width: `${paidRate}%` }}
              />
            </div>
          </div>
          </div>
        </TabsContent>

        <TabsContent value="payments" className="mt-4">
          <div className="space-y-3">
          {/* 엑셀 대조 카드 */}
          <div className="rounded-lg border bg-white">
            <button
              onClick={() => setReconcileExpanded((v) => !v)}
              className="flex w-full items-center justify-between px-4 py-3 text-left"
            >
              <div className="flex items-center gap-2">
                <FileSpreadsheet size={16} className="text-primary" />
                <span className="text-sm font-semibold">엑셀로 회비 대조</span>
                <span className="text-xs text-muted-foreground">
                  은행/구글폼 엑셀을 업로드해 회원 명단과 자동 매칭하고 일괄 납부 처리
                </span>
              </div>
              {reconcileExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            {reconcileExpanded && (
              <div className="space-y-3 border-t px-4 py-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={(e) => {
                      setReconcileFile(e.target.files?.[0] ?? null);
                      setReconcileRows(null);
                    }}
                    className="block text-xs file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-primary-foreground hover:file:bg-primary/90"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleReconcileParse} disabled={!reconcileFile || reconcileLoading}>
                      {reconcileLoading ? <Loader2 size={14} className="mr-1 animate-spin" /> : <Upload size={14} className="mr-1" />}
                      분석
                    </Button>
                    {reconcileRows && (
                      <Button size="sm" variant="outline" onClick={handleReconcileReset}>
                        <RefreshCw size={14} className="mr-1" />
                        초기화
                      </Button>
                    )}
                  </div>
                </div>

                <p className="text-[11px] text-muted-foreground">
                  헤더 예시: <code className="rounded bg-muted px-1">이름 | 학번 | 이메일 | 금액</code>{" "}
                  · 매칭 우선순위: 학번 → 이메일 → 이름. 동명이인은 자동 매칭에서 제외됩니다.
                </p>

                {reconcileRows && (
                  <>
                    <div className="flex flex-wrap gap-2 text-xs">
                      <Badge variant="secondary">전체 {reconcileStats.total}</Badge>
                      <Badge className="bg-green-100 text-green-700 hover:bg-green-100">일치 {reconcileStats.matched}</Badge>
                      <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">이미 납부 {reconcileStats.alreadyPaid}</Badge>
                      <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">동명이인 {reconcileStats.ambiguous}</Badge>
                      <Badge className="bg-red-100 text-red-700 hover:bg-red-100">미등록 {reconcileStats.notFound}</Badge>
                    </div>

                    <div className="max-h-[360px] overflow-auto rounded-lg border">
                      <table className="w-full text-xs">
                        <thead className="sticky top-0 bg-muted/40">
                          <tr className="text-left">
                            <th className="px-2 py-1.5">이름</th>
                            <th className="px-2 py-1.5">학번</th>
                            <th className="px-2 py-1.5">이메일</th>
                            <th className="px-2 py-1.5">금액</th>
                            <th className="px-2 py-1.5">매칭</th>
                            <th className="px-2 py-1.5">상태</th>
                          </tr>
                        </thead>
                        <tbody>
                          {reconcileMatches.map((rm, i) => (
                            <tr key={i} className="border-t">
                              <td className="px-2 py-1">{rm.row["이름"] || "-"}</td>
                              <td className="px-2 py-1 text-muted-foreground">{rm.row["학번"] || "-"}</td>
                              <td className="px-2 py-1 text-muted-foreground">{rm.row["이메일"] || "-"}</td>
                              <td className="px-2 py-1 text-right tabular-nums">
                                {rm.amount ? `${rm.amount.toLocaleString()}원` : "-"}
                              </td>
                              <td className="px-2 py-1">
                                {rm.matched ? (
                                  <span className="font-medium">{rm.matched.name}</span>
                                ) : rm.candidates.length > 1 ? (
                                  <span className="text-yellow-700">
                                    {rm.candidates.map((c) => `${c.name}(${c.studentId ?? "-"})`).join(", ")}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </td>
                              <td className="px-2 py-1">
                                {rm.status === "matched" && (
                                  <Badge className="bg-green-100 text-green-700 hover:bg-green-100">일치</Badge>
                                )}
                                {rm.status === "already_paid" && (
                                  <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">이미 납부</Badge>
                                )}
                                {rm.status === "ambiguous" && (
                                  <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">동명이인</Badge>
                                )}
                                {rm.status === "not_found" && (
                                  <Badge className="bg-red-100 text-red-700 hover:bg-red-100">미등록</Badge>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        학회비 설정 금액({feeAmount > 0 ? `${feeAmount.toLocaleString()}원` : "미설정"})으로 처리됩니다.
                      </span>
                      <Button
                        size="sm"
                        onClick={handleReconcileApply}
                        disabled={reconcileStats.matched === 0 || reconcileBulk || feeAmount === 0}
                      >
                        {reconcileBulk ? <Loader2 size={14} className="mr-1 animate-spin" /> : <Check size={14} className="mr-1" />}
                        일치 {reconcileStats.matched}건 일괄 납부 처리
                      </Button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* 필터/검색 바 */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-1">
              {(["all", "paid", "unpaid", "exempt"] as PaymentFilter[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setPaymentFilter(f)}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                    paymentFilter === f
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted/50 text-muted-foreground hover:text-foreground",
                  )}
                >
                  {f === "all" ? "전체" : f === "paid" ? "납부" : f === "unpaid" ? "미납" : "면제"}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <div className="relative flex-1 sm:w-48">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="이름/학번 검색"
                  className="pl-8 text-sm"
                />
              </div>
              <Button variant="outline" size="sm" onClick={exportCSV}>
                <Download size={14} className="mr-1" />
                CSV
              </Button>
            </div>
          </div>

          {/* 회원 목록 */}
          <div className="rounded-lg border bg-white">
            <div className="hidden sm:grid grid-cols-[1fr_100px_80px_100px_80px] items-center gap-2 border-b bg-muted/30 px-4 py-2.5 text-xs font-medium text-muted-foreground">
              <span>회원</span>
              <span>학번</span>
              <span>상태</span>
              <span>납부일</span>
              <span>처리</span>
            </div>
            {filtered.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">해당하는 회원이 없습니다.</p>
            ) : (
              filtered.map((m) => (
                <div key={m.id} className="flex flex-col gap-2 border-b px-4 py-3 text-sm sm:grid sm:grid-cols-[1fr_100px_80px_100px_80px] sm:items-center sm:gap-2">
                  <div>
                    <span className="font-medium">{m.name}</span>
                    <span className="ml-2 text-xs text-muted-foreground">{m.email}</span>
                  </div>
                  <span className="text-muted-foreground">{m.studentId ?? "-"}</span>
                  <div>
                    <Badge
                      variant="secondary"
                      className={cn("text-xs",
                        m.status === "paid" ? "bg-green-50 text-green-700" :
                        m.status === "exempt" ? "bg-blue-50 text-blue-700" :
                        "bg-red-50 text-red-700",
                      )}
                    >
                      {m.status === "paid" ? "납부" : m.status === "exempt" ? "면제" : "미납"}
                    </Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {m.payment?.paidAt ? new Date(m.payment.paidAt).toLocaleDateString("ko-KR") : "-"}
                  </span>
                  <div className="flex gap-1">
                    {m.status !== "paid" && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 gap-0.5 text-[10px] sm:gap-1 sm:text-xs text-green-600"
                        onClick={() => payMutation.mutate({ userId: m.id, userName: m.name, studentId: m.studentId ?? "", status: "paid" })}
                        disabled={payMutation.isPending}
                      >
                        <Check size={12} />
                        납부
                      </Button>
                    )}
                    {m.status === "paid" && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 gap-0.5 text-[10px] sm:gap-1 sm:text-xs text-red-500"
                        onClick={() => payMutation.mutate({ userId: m.id, userName: m.name, studentId: m.studentId ?? "", status: "unpaid" })}
                        disabled={payMutation.isPending}
                      >
                        <X size={12} />
                        취소
                      </Button>
                    )}
                    {m.status === "unpaid" && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-[10px] sm:text-xs text-blue-600"
                        onClick={() => payMutation.mutate({ userId: m.id, userName: m.name, studentId: m.studentId ?? "", status: "exempt" })}
                        disabled={payMutation.isPending}
                      >
                        면제
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
          </div>
        </TabsContent>

        <TabsContent value="ledger" className="mt-4">
          <div className="space-y-4">
          {/* 요약 카드 */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-lg border bg-white p-4 text-center">
              <div className="flex items-center justify-center gap-1.5 text-green-600">
                <ArrowDownCircle size={16} />
                <span className="text-xs font-medium">수입</span>
              </div>
              <p className="mt-1 text-2xl font-bold text-green-600">{ledgerStats.income.toLocaleString()}원</p>
            </div>
            <div className="rounded-lg border bg-white p-4 text-center">
              <div className="flex items-center justify-center gap-1.5 text-red-500">
                <ArrowUpCircle size={16} />
                <span className="text-xs font-medium">지출</span>
              </div>
              <p className="mt-1 text-2xl font-bold text-red-500">{ledgerStats.expense.toLocaleString()}원</p>
            </div>
            <div className="rounded-lg border bg-white p-4 text-center">
              <div className="flex items-center justify-center gap-1.5 text-primary">
                <Wallet size={16} />
                <span className="text-xs font-medium">잔액</span>
              </div>
              <p className={cn("mt-1 text-2xl font-bold", ledgerStats.balance >= 0 ? "text-primary" : "text-red-500")}>
                {ledgerStats.balance >= 0 ? "+" : ""}{ledgerStats.balance.toLocaleString()}원
              </p>
            </div>
          </div>

          {/* 필터 + 추가 */}
          <div className="flex items-center justify-between">
            <div className="flex gap-1">
              {(["all", "income", "expense"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setLedgerFilter(f)}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                    ledgerFilter === f ? "bg-primary text-primary-foreground" : "bg-muted/50 text-muted-foreground hover:text-foreground",
                  )}
                >
                  {f === "all" ? "전체" : f === "income" ? "수입" : "지출"}
                </button>
              ))}
            </div>
            <Button size="sm" onClick={() => openTxDialog()}>
              <Plus size={14} className="mr-1" />
              거래 등록
            </Button>
          </div>

          {/* 거래 목록 */}
          <div className="rounded-lg border bg-white">
            <div className="hidden sm:grid grid-cols-[80px_100px_1fr_120px_60px] items-center gap-2 border-b bg-muted/30 px-4 py-2.5 text-xs font-medium text-muted-foreground">
              <span>날짜</span>
              <span>분류</span>
              <span>내용</span>
              <span className="text-right">금액</span>
              <span />
            </div>
            {filteredTx.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">등록된 거래가 없습니다.</p>
            ) : (
              filteredTx.map((tx) => (
                <div key={tx.id} className="flex flex-col gap-1 border-b px-4 py-3 text-sm sm:grid sm:grid-cols-[80px_100px_1fr_120px_60px] sm:items-center sm:gap-2">
                  <span className="text-xs text-muted-foreground">{tx.date}</span>
                  <div>
                    <Badge variant="secondary" className={cn("text-xs", tx.type === "income" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700")}>
                      {tx.category}
                    </Badge>
                  </div>
                  <div>
                    <span className="font-medium">{tx.description}</span>
                    {tx.memo && <span className="ml-2 text-xs text-muted-foreground">({tx.memo})</span>}
                  </div>
                  <span className={cn("text-right font-medium", tx.type === "income" ? "text-green-600" : "text-red-500")}>
                    {tx.type === "income" ? "+" : "-"}{tx.amount.toLocaleString()}원
                  </span>
                  <div className="flex gap-1">
                    <button onClick={() => openTxDialog(tx)} className="rounded p-1 text-muted-foreground hover:text-foreground">
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => { if (confirm("삭제하시겠습니까?")) deleteTxMutation.mutate(tx.id); }}
                      className="rounded p-1 text-muted-foreground hover:text-red-500"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
          </div>
        </TabsContent>

        <TabsContent value="settings" className="mt-4">
          <div className="space-y-4">
          <div className="rounded-lg border bg-white p-6">
            <h3 className="text-sm font-semibold">학기별 학회비 설정</h3>
            <p className="mt-1 text-xs text-muted-foreground">학기를 선택하고 학회비 금액과 납부 기한을 설정합니다.</p>

            <div className="mt-4 space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium">학기</label>
                <select
                  value={selectedSemester}
                  onChange={(e) => setSelectedSemester(e.target.value)}
                  className="w-full rounded-lg border px-3 py-2 text-sm sm:w-48"
                >
                  {SEMESTERS.map((s) => (
                    <option key={s} value={s}>{formatSemester(s)}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium">학회비 금액 (원)</label>
                  <Input
                    type="number"
                    value={settingAmount || currentSetting?.amount || ""}
                    onChange={(e) => setSettingAmount(e.target.value)}
                    placeholder="예: 30000"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">납부 기한</label>
                  <Input
                    type="date"
                    value={settingDueDate || currentSetting?.dueDate || ""}
                    onChange={(e) => setSettingDueDate(e.target.value)}
                  />
                </div>
              </div>
              <Button onClick={saveSetting}>설정 저장</Button>
            </div>
          </div>

          <div className="rounded-lg border bg-white p-6">
            <h3 className="text-sm font-semibold">학기별 설정 내역</h3>
            <div className="mt-3 space-y-2">
              {feeSettings.length === 0 ? (
                <p className="text-sm text-muted-foreground">설정된 학기가 없습니다.</p>
              ) : (
                feeSettings.map((s) => (
                  <div key={s.id} className="flex items-center justify-between rounded-lg border px-4 py-2.5 text-sm">
                    <span className="font-medium">{formatSemester(s.semester)}</span>
                    <div className="flex items-center gap-4 text-muted-foreground">
                      <span>{s.amount.toLocaleString()}원</span>
                      {s.dueDate && <span>기한: {s.dueDate}</span>}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* 거래 등록/수정 다이얼로그 */}
      <Dialog open={showTxDialog} onOpenChange={setShowTxDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTx ? "거래 수정" : "거래 등록"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex gap-2">
              {(["income", "expense"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTxForm((f) => ({ ...f, type: t, category: "" }))}
                  className={cn(
                    "flex-1 rounded-lg border py-2 text-sm font-medium transition-colors",
                    txForm.type === t
                      ? t === "income" ? "border-green-500 bg-green-50 text-green-700" : "border-red-400 bg-red-50 text-red-600"
                      : "text-muted-foreground",
                  )}
                >
                  {t === "income" ? "수입" : "지출"}
                </button>
              ))}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">분류</label>
              <select
                value={txForm.category}
                onChange={(e) => setTxForm((f) => ({ ...f, category: e.target.value }))}
                className="w-full rounded-lg border px-3 py-2 text-sm"
              >
                <option value="">선택하세요</option>
                {(txForm.type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">내용</label>
              <Input value={txForm.description} onChange={(e) => setTxForm((f) => ({ ...f, description: e.target.value }))} placeholder="거래 내용을 입력하세요" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium">금액 (원)</label>
                <Input type="number" value={txForm.amount} onChange={(e) => setTxForm((f) => ({ ...f, amount: e.target.value }))} placeholder="0" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">날짜</label>
                <Input type="date" value={txForm.date} onChange={(e) => setTxForm((f) => ({ ...f, date: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">메모 (선택)</label>
              <Input value={txForm.memo} onChange={(e) => setTxForm((f) => ({ ...f, memo: e.target.value }))} placeholder="비고" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTxDialog(false)}>취소</Button>
            <Button
              onClick={() => {
                if (!txForm.category) { toast.error("분류를 선택하세요."); return; }
                if (!txForm.description) { toast.error("내용을 입력하세요."); return; }
                if (!txForm.amount || Number(txForm.amount) <= 0) { toast.error("금액을 입력하세요."); return; }
                txMutation.mutate(editingTx ? { ...txForm, id: editingTx.id } : txForm);
              }}
              disabled={txMutation.isPending}
            >
              {txMutation.isPending ? <Loader2 size={14} className="mr-1 animate-spin" /> : null}
              {editingTx ? "수정" : "등록"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
