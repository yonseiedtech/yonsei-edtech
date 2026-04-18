"use client";

import { useEffect, useState } from "react";
import { auth as firebaseAuth } from "@/lib/firebase";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/features/auth/auth-store";
import { AlertCircle, CheckCircle2, Loader2, RefreshCw, ShieldCheck } from "lucide-react";
import ConsolePageHeader from "@/components/admin/ConsolePageHeader";

interface UserRow {
  id: string;
  name: string;
  email: string;
  studentId: string;
  role: string;
  approved: boolean;
  enrollmentStatus: string;
  hasAuthAccount: boolean;
  uidMatch: boolean;
  issues: string[];
}

interface AuditResult {
  total: number;
  totalExcludingAdmin: number;
  authUserCount: number;
  groups: Record<string, UserRow[]>;
  summary: { label: string; count: number; withIssues: number }[];
}

const GROUP_ORDER = ["학회장", "운영진", "자문위원", "재(휴)학생", "졸업생", "게스트", "기타"];

export default function UserAuditPage() {
  const { user } = useAuthStore();
  const [data, setData] = useState<AuditResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function load() {
    if (!user || (user.role !== "admin" && user.role !== "sysadmin")) {
      setErr("관리자만 접근 가능합니다.");
      return;
    }
    setLoading(true);
    setErr("");
    try {
      const token = await firebaseAuth.currentUser?.getIdToken();
      const res = await fetch("/api/admin/audit-users", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "실패");
      setData(json);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "실패");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  if (!user || (user.role !== "admin" && user.role !== "sysadmin")) {
    return <div className="p-8 text-center text-muted-foreground">관리자만 접근 가능합니다.</div>;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-10">
      <ConsolePageHeader
        icon={ShieldCheck}
        title="회원 검증"
        description="Firebase Auth 계정과 Firestore 프로필 정합성을 검증합니다."
        actions={
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            {loading ? <Loader2 size={14} className="mr-1 animate-spin" /> : <RefreshCw size={14} className="mr-1" />}
            새로고침
          </Button>
        }
      />

      {err && (
        <div className="mt-4 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {err}
        </div>
      )}

      {data && (
        <>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="전체 회원" value={data.total} />
            <StatCard label="관리자 제외" value={data.totalExcludingAdmin} />
            <StatCard label="Firebase Auth 계정" value={data.authUserCount} />
            <StatCard
              label="이슈 있는 회원"
              value={Object.values(data.groups).flat().filter((r) => r.issues.length > 0).length}
              alert
            />
          </div>

          <div className="mt-6 space-y-6">
            {GROUP_ORDER.filter((g) => data.groups[g]?.length).map((group) => (
              <section key={group}>
                <h2 className="mb-2 flex items-center gap-2 text-lg font-bold">
                  {group}
                  <Badge variant="secondary">{data.groups[group].length}명</Badge>
                  {data.groups[group].some((r) => r.issues.length > 0) && (
                    <Badge className="bg-amber-100 text-amber-800">
                      이슈 {data.groups[group].filter((r) => r.issues.length > 0).length}
                    </Badge>
                  )}
                </h2>
                <div className="overflow-x-auto rounded-xl border bg-white">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 text-left text-xs">
                      <tr>
                        <th className="px-3 py-2">이름</th>
                        <th className="px-3 py-2">학번</th>
                        <th className="px-3 py-2">이메일</th>
                        <th className="px-3 py-2">상태</th>
                        <th className="px-3 py-2">검증</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {data.groups[group].map((u) => (
                        <tr key={u.id} className={u.issues.length > 0 ? "bg-amber-50/40" : ""}>
                          <td className="px-3 py-2 font-medium">{u.name || "-"}</td>
                          <td className="px-3 py-2 font-mono text-xs">{u.studentId || "-"}</td>
                          <td className="px-3 py-2 text-xs text-muted-foreground">{u.email || "-"}</td>
                          <td className="px-3 py-2 text-xs">
                            <div className="flex flex-wrap gap-1">
                              <Badge variant={u.approved ? "secondary" : "outline"} className={u.approved ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}>
                                {u.approved ? "승인" : "미승인"}
                              </Badge>
                              {u.enrollmentStatus && (
                                <Badge variant="outline" className="text-[10px]">{u.enrollmentStatus}</Badge>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-2">
                            {u.issues.length === 0 ? (
                              <span className="inline-flex items-center gap-1 text-xs text-green-700">
                                <CheckCircle2 size={14} /> 정상
                              </span>
                            ) : (
                              <div className="flex flex-wrap items-center gap-1">
                                <AlertCircle size={14} className="text-amber-600" />
                                {u.issues.map((i) => (
                                  <Badge key={i} className="bg-amber-100 text-amber-800 text-[10px]">{i}</Badge>
                                ))}
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({ label, value, alert }: { label: string; value: number; alert?: boolean }) {
  return (
    <div className={`rounded-xl border bg-white p-4 ${alert && value > 0 ? "border-amber-300 bg-amber-50" : ""}`}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}
