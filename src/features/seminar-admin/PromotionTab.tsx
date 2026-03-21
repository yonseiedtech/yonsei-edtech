"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSeminars } from "@/features/seminar/useSeminar";
import { useAuthStore } from "@/features/auth/auth-store";
import { promotionContentsApi, postsApi } from "@/lib/bkend";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
  Save,
  Trash2,
  Clock,
  Send,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { PromotionContent } from "@/types";

type ContentFormat = "press" | "sns" | "email" | "kakao" | "hashtag";

const FORMAT_OPTIONS: { key: ContentFormat; label: string; icon: React.ReactNode }[] = [
  { key: "press", label: "보도자료", icon: <FileText size={14} /> },
  { key: "sns", label: "SNS 포스팅", icon: <Instagram size={14} /> },
  { key: "email", label: "초대 이메일", icon: <Mail size={14} /> },
  { key: "kakao", label: "카카오톡", icon: <MessageCircle size={14} /> },
  { key: "hashtag", label: "해시태그", icon: <Hash size={14} /> },
];

const FORMAT_LABEL_MAP: Record<string, string> = {
  press: "보도자료",
  sns: "SNS 포스팅",
  email: "초대 이메일",
  kakao: "카카오톡",
  hashtag: "해시태그",
};

export default function PromotionTab() {
  const router = useRouter();
  const { seminars } = useSeminars();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [format, setFormat] = useState<ContentFormat>("press");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);

  const seminar = seminars.find((s) => s.id === selectedId);

  // 저장된 콘텐츠 이력
  const { data: savedContents } = useQuery({
    queryKey: ["promotion_contents", selectedId],
    queryFn: async () => {
      if (!selectedId) return [];
      const res = await promotionContentsApi.list(selectedId);
      return res.data as unknown as PromotionContent[];
    },
    enabled: !!selectedId,
    retry: false,
  });

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

  async function handleSave() {
    if (!seminar || !result.trim()) return;
    try {
      await promotionContentsApi.create({
        seminarId: seminar.id,
        seminarTitle: seminar.title,
        format,
        content: result,
        createdBy: user?.id ?? "",
      });
      queryClient.invalidateQueries({ queryKey: ["promotion_contents", selectedId] });
      toast.success("콘텐츠가 저장되었습니다.");
    } catch {
      toast.error("저장에 실패했습니다.");
    }
  }

  async function handleDelete(id: string) {
    try {
      await promotionContentsApi.delete(id);
      queryClient.invalidateQueries({ queryKey: ["promotion_contents", selectedId] });
      toast.success("삭제되었습니다.");
    } catch {
      toast.error("삭제에 실패했습니다.");
    }
  }

  function handleLoadSaved(content: PromotionContent) {
    setFormat(content.format as ContentFormat);
    setResult(content.content);
  }

  async function handlePublishToBoard() {
    if (!seminar || !result.trim()) return;
    try {
      const label = FORMAT_LABEL_MAP[format] ?? format;
      await postsApi.create({
        title: `[${label}] ${seminar.title}`,
        content: result,
        category: "press",
        authorId: user?.id,
        authorName: user?.name,
        viewCount: 0,
      });
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      toast.success("보도자료 게시판에 게시되었습니다.");
      router.push("/board?category=press");
    } catch {
      toast.error("게시에 실패했습니다.");
    }
  }

  function handleCopy(text?: string) {
    navigator.clipboard.writeText(text ?? result);
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
          onChange={(e) => { setSelectedId(e.target.value || null); setResult(""); }}
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
        <label className="mb-2 block text-sm font-medium">AI 콘텐츠 생성</label>
        <div className="flex flex-wrap gap-2">
          {FORMAT_OPTIONS.map((opt) => (
            <Button
              key={opt.key}
              size="sm"
              variant={format === opt.key && !loading ? "default" : "outline"}
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
              <Button variant="outline" size="sm" onClick={() => handleCopy()} disabled={!result}>
                <Copy size={14} className="mr-1" />
                복사
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownload} disabled={!result}>
                <Download size={14} className="mr-1" />
                .txt
              </Button>
              <Button size="sm" onClick={handleSave} disabled={!result || loading}>
                <Save size={14} className="mr-1" />
                저장
              </Button>
              {format === "press" && (
                <Button size="sm" variant="default" onClick={handlePublishToBoard} disabled={!result || loading}>
                  <Send size={14} className="mr-1" />
                  게시판에 게시
                </Button>
              )}
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

      {/* 저장된 콘텐츠 이력 */}
      {selectedId && savedContents && savedContents.length > 0 && (
        <div className="rounded-xl border bg-white">
          <div className="border-b px-4 py-3">
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-muted-foreground" />
              <span className="text-sm font-medium">저장된 콘텐츠 ({savedContents.length})</span>
            </div>
          </div>
          <div className="divide-y">
            {savedContents.map((c) => (
              <div key={c.id} className="flex items-center gap-3 px-4 py-3">
                <Badge variant="secondary" className="shrink-0 text-xs">
                  {FORMAT_LABEL_MAP[c.format] ?? c.format}
                </Badge>
                <p className="flex-1 truncate text-sm text-muted-foreground" title={c.content}>
                  {c.content.substring(0, 80)}...
                </p>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {c.createdAt ? new Date(c.createdAt).toLocaleDateString("ko-KR") : ""}
                </span>
                <div className="flex shrink-0 gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleLoadSaved(c)}
                  >
                    불러오기
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopy(c.content)}
                  >
                    <Copy size={12} />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive"
                    onClick={() => handleDelete(c.id)}
                  >
                    <Trash2 size={12} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
