"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { dataApi, profilesApi } from "@/lib/bkend";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

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

type Section = "dashboard" | "payments" | "settings";
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

  const SECTIONS: { value: Section; label: string; icon: React.ReactNode }[] = [
    { value: "dashboard", label: "대시보드", icon: <TrendingUp size={14} /> },
    { value: "payments", label: "납부 현황", icon: <Users size={14} /> },
    { value: "settings", label: "설정", icon: <Settings size={14} /> },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wallet size={20} className="text-primary" />
          <h2 className="text-lg font-bold">학회비 관리</h2>
        </div>
        <select
          value={selectedSemester}
          onChange={(e) => setSelectedSemester(e.target.value)}
          className="rounded-lg border px-3 py-1.5 text-sm"
        >
          {SEMESTERS.map((s) => (
            <option key={s} value={s}>{formatSemester(s)}</option>
          ))}
        </select>
      </div>

      {/* 섹션 네비게이션 */}
      <div className="flex flex-wrap gap-1">
        {SECTIONS.map((s) => (
          <button
            key={s.value}
            onClick={() => setSection(s.value)}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
              section === s.value
                ? "bg-primary text-primary-foreground"
                : "bg-muted/50 text-muted-foreground hover:text-foreground",
            )}
          >
            {s.icon}
            {s.label}
          </button>
        ))}
      </div>

      {/* 대시보드 */}
      {section === "dashboard" && (
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

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
      )}

      {/* 납부 현황 */}
      {section === "payments" && (
        <div className="space-y-3">
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
                        className="h-7 gap-1 text-xs text-green-600"
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
                        className="h-7 gap-1 text-xs text-red-500"
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
                        className="h-7 text-xs text-blue-600"
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
      )}

      {/* 설정 */}
      {section === "settings" && (
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
      )}
    </div>
  );
}
