"use client";

import { useState } from "react";
import { useSeminars } from "@/features/seminar/useSeminar";
import { streamAI } from "@/lib/ai-client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Instagram,
  Mail,
  MessageCircle,
  Hash,
  Sparkles,
  Copy,
  Download,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Seminar } from "@/types";

type ContentFormat = "press" | "sns" | "email" | "kakao" | "hashtag";

const FORMAT_OPTIONS: { key: ContentFormat; label: string; icon: React.ReactNode }[] = [
  { key: "press", label: "보도자료", icon: <FileText size={14} /> },
  { key: "sns", label: "SNS 포스팅", icon: <Instagram size={14} /> },
  { key: "email", label: "초대 이메일", icon: <Mail size={14} /> },
  { key: "kakao", label: "카카오톡", icon: <MessageCircle size={14} /> },
  { key: "hashtag", label: "해시태그", icon: <Hash size={14} /> },
];

export default function PromotionTab() {
  const { seminars } = useSeminars();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [format, setFormat] = useState<ContentFormat>("press");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);

  const seminar = seminars.find((s) => s.id === selectedId);

  async function handleGenerate(fmt: ContentFormat) {
    if (!seminar) {
      toast.error("세미나를 먼저 선택하세요.");
      return;
    }
    setFormat(fmt);
    setResult("");
    setLoading(true);
    try {
      await streamAI(
        "/api/ai/press-release",
        { seminar, format: fmt },
        (chunk) => setResult((prev) => prev + chunk),
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "AI 생성 실패");
    } finally {
      setLoading(false);
    }
  }

  function handleCopy() {
    navigator.clipboard.writeText(result);
    toast.success("클립보드에 복사되었습니다.");
  }

  function handleDownload() {
    const blob = new Blob([result], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const label = FORMAT_OPTIONS.find((f) => f.key === format)?.label ?? format;
    a.download = `${label}_${seminar?.title.replace(/[^가-힣a-zA-Z0-9]/g, "_") ?? "seminar"}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      {/* 세미나 선택 */}
      <div>
        <label className="mb-2 block text-sm font-medium">세미나 선택</label>
        <select
          value={selectedId ?? ""}
          onChange={(e) => setSelectedId(e.target.value || null)}
          className="w-full rounded-lg border px-3 py-2 text-sm"
        >
          <option value="">-- 세미나를 선택하세요 --</option>
          {seminars.map((s) => (
            <option key={s.id} value={s.id}>
              {s.title} ({s.date})
            </option>
          ))}
        </select>
      </div>

      {/* 포맷 버튼 */}
      <div>
        <label className="mb-2 block text-sm font-medium">콘텐츠 형식</label>
        <div className="flex flex-wrap gap-2">
          {FORMAT_OPTIONS.map((opt) => (
            <Button
              key={opt.key}
              size="sm"
              variant={format === opt.key ? "default" : "outline"}
              onClick={() => handleGenerate(opt.key)}
              disabled={loading || !selectedId}
            >
              {opt.icon}
              <span className="ml-1">{opt.label}</span>
              {loading && format === opt.key && (
                <Loader2 size={14} className="ml-1 animate-spin" />
              )}
            </Button>
          ))}
        </div>
      </div>

      {/* 결과 */}
      {(result || loading) && (
        <div className="rounded-xl border bg-white p-6">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-primary" />
              <span className="text-sm font-medium">
                {FORMAT_OPTIONS.find((f) => f.key === format)?.label}
              </span>
              {loading && <Loader2 size={14} className="animate-spin text-muted-foreground" />}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleCopy} disabled={!result}>
                <Copy size={14} className="mr-1" />
                복사
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownload} disabled={!result}>
                <Download size={14} className="mr-1" />
                .txt
              </Button>
            </div>
          </div>
          <textarea
            value={result}
            onChange={(e) => setResult(e.target.value)}
            rows={16}
            className="w-full rounded-lg border border-input bg-muted/30 px-3 py-2 font-mono text-xs leading-relaxed outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
        </div>
      )}
    </div>
  );
}
