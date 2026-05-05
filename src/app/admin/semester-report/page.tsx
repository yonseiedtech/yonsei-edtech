"use client";

import { useState, useRef } from "react";
import AuthGuard from "@/features/auth/AuthGuard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { auth } from "@/lib/firebase";
import { BarChart3, FileDown, Copy, Loader2, Printer } from "lucide-react";
import ConsolePageHeader from "@/components/admin/ConsolePageHeader";
import { toast } from "sonner";

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => CURRENT_YEAR - i);

function SemesterReportPage() {
  const [year, setYear] = useState(CURRENT_YEAR);
  const [half, setHalf] = useState<1 | 2>(new Date().getMonth() < 8 ? 1 : 2);
  const [report, setReport] = useState("");
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  async function handleGenerate() {
    setReport("");
    setLoading(true);
    abortRef.current = new AbortController();

    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error("인증 필요");

      const res = await fetch("/api/ai/semester-report", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ year, half }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "보고서 생성 실패");
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("스트림을 읽을 수 없습니다.");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("0:")) {
            try {
              const chunk = JSON.parse(line.slice(2));
              setReport((prev) => prev + chunk);
            } catch {
              // skip
            }
          }
        }
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        toast.error((err as Error).message || "보고서 생성 실패");
      }
    } finally {
      setLoading(false);
    }
  }

  function handleCopy() {
    navigator.clipboard.writeText(report);
    toast.success("클립보드에 복사되었습니다.");
  }

  function handleDownload() {
    const blob = new Blob([report], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${year}년_${half}학기_학술활동_보고서.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <ConsolePageHeader
        icon={BarChart3}
        title="학기 리포트"
        description="학기별 운영 활동을 종합 리포트로 출력합니다."
        actions={<Badge variant="secondary">AI 자동 생성</Badge>}
      />

      {/* 학기 선택 */}
      <div className="flex flex-wrap items-end gap-3 rounded-xl border bg-card p-5">
        <div>
          <label className="mb-1 block text-sm font-medium">연도</label>
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="rounded-md border px-3 py-2 text-sm"
          >
            {YEARS.map((y) => (
              <option key={y} value={y}>{y}년</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">학기</label>
          <select
            value={half}
            onChange={(e) => setHalf(Number(e.target.value) as 1 | 2)}
            className="rounded-md border px-3 py-2 text-sm"
          >
            <option value={1}>1학기 (3~8월)</option>
            <option value={2}>2학기 (9~2월)</option>
          </select>
        </div>
        <Button onClick={handleGenerate} disabled={loading}>
          {loading ? (
            <>
              <Loader2 size={16} className="mr-1 animate-spin" /> 생성 중...
            </>
          ) : (
            "보고서 생성"
          )}
        </Button>
      </div>

      {/* 보고서 결과 */}
      {report && (
        <div className="rounded-xl border bg-card">
          <div className="flex items-center justify-end gap-2 border-b px-5 py-3">
            <Button size="sm" variant="outline" onClick={handleCopy}>
              <Copy size={14} className="mr-1" /> 복사
            </Button>
            <Button size="sm" variant="outline" onClick={handleDownload}>
              <FileDown size={14} className="mr-1" /> 다운로드
            </Button>
            <Button size="sm" variant="outline" onClick={() => window.print()}>
              <Printer size={14} className="mr-1" /> 인쇄/PDF
            </Button>
          </div>
          <div id="printable-report" className="max-w-none p-6 whitespace-pre-wrap text-sm leading-relaxed font-[inherit] [&>*]:font-[inherit] print:p-0">
            {report.split("\n").map((line, i) => {
              if (line.startsWith("# ")) return <h1 key={i} className="mt-6 mb-3 text-xl font-bold first:mt-0">{line.slice(2)}</h1>;
              if (line.startsWith("## ")) return <h2 key={i} className="mt-5 mb-2 text-lg font-bold">{line.slice(3)}</h2>;
              if (line.startsWith("### ")) return <h3 key={i} className="mt-4 mb-1 text-base font-semibold">{line.slice(4)}</h3>;
              if (line.startsWith("- ")) return <p key={i} className="ml-4 before:content-['•_'] before:text-primary">{line.slice(2)}</p>;
              if (line.trim() === "") return <div key={i} className="h-2" />;
              return <p key={i}>{line}</p>;
            })}
          </div>
        </div>
      )}

      {loading && !report && (
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <Loader2 size={32} className="mx-auto animate-spin text-primary" />
            <p className="mt-3 text-sm text-muted-foreground">
              데이터를 수집하고 보고서를 생성하고 있습니다...
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminSemesterReportPage() {
  return (
    <AuthGuard allowedRoles={["staff", "president", "admin"]}>
      <SemesterReportPage />
    </AuthGuard>
  );
}
