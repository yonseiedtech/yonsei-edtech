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
  Bell,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { PromotionContent, Seminar } from "@/types";

/* ── 리마인더 메시지 템플릿 ── */
function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일(${["일","월","화","수","목","금","토"][d.getDay()]})`;
}

interface ReminderTemplate {
  id: string;
  label: string;
  timing: string;
  getMessage: (s: Seminar) => string;
}

const REMINDER_TEMPLATES: ReminderTemplate[] = [
  {
    id: "d-2",
    label: "D-2 사전 리마인더",
    timing: "세미나 2일 전",
    getMessage: (s) =>
`[연세교육공학회] 세미나 안내

안녕하세요, 연세교육공학회입니다.

신청해주신 세미나가 이틀 앞으로 다가왔습니다!

세미나 정보
• 제목: ${s.title}
• 일시: ${formatDate(s.date)}${s.time ? ` ${s.time}` : ""}
• 장소: ${s.location || (s.isOnline ? "ZOOM (링크 별도 안내)" : "추후 안내")}
${s.isOnline && s.onlineUrl ? `• ZOOM 링크: ${s.onlineUrl}` : ""}

참석 전 안내사항
• 세미나 시작 10분 전까지 입장해주세요
${s.isOnline ? "• ZOOM 접속 시 실명으로 참여 부탁드립니다" : "• 현장에서 QR 출석 체크가 진행됩니다"}
• 사전 질문이 있으시면 답글로 남겨주세요

많은 관심과 참여 부탁드립니다!
연세교육공학회 드림`,
  },
  {
    id: "d-day",
    label: "D-DAY 당일 안내",
    timing: "세미나 당일 오전",
    getMessage: (s) =>
`[연세교육공학회] 오늘 세미나 당일입니다!

안녕하세요, 연세교육공학회입니다.

오늘 세미나가 진행됩니다!

세미나 정보
• 제목: ${s.title}
• 일시: ${formatDate(s.date)}${s.time ? ` ${s.time}` : ""}
• 장소: ${s.location || (s.isOnline ? "ZOOM" : "추후 안내")}
${s.isOnline && s.onlineUrl ? `• ZOOM 링크: ${s.onlineUrl}` : ""}

안내사항
${s.isOnline
  ? `• ZOOM 접속은 시작 10분 전부터 가능합니다
• 마이크는 음소거 상태로 입장해주세요
• 질의응답은 채팅 또는 손들기 기능을 이용해주세요`
  : `• 현장 도착 후 QR 출석 체크를 진행해주세요
• 주차가 어려울 수 있으니 대중교통 이용을 권장합니다
• 세미나 자료는 현장에서 배포됩니다`}

오늘 뵙겠습니다!
연세교육공학회 드림`,
  },
  {
    id: "after",
    label: "교육 종료 후 감사 인사",
    timing: "세미나 종료 후",
    getMessage: (s) =>
`[연세교육공학회] 세미나 참석 감사합니다!

안녕하세요, 연세교육공학회입니다.

「${s.title}」 세미나에 참석해주셔서 진심으로 감사드립니다.

안내사항
• 세미나 자료는 홈페이지(yonsei-edtech.vercel.app)에서 확인 가능합니다
• 수료증은 홈페이지 세미나 페이지에서 다운로드할 수 있습니다
• 후기 작성: https://yonsei-edtech.vercel.app/seminars/${s.id}/review
${s.isOnline ? "• 녹화 영상은 편집 후 별도 공유 예정입니다" : ""}

피드백
세미나에 대한 소중한 의견을 남겨주시면
더 나은 세미나를 준비하는 데 큰 도움이 됩니다.

다음 세미나에서도 함께해주세요!
연세교육공학회 드림`,
  },
];

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

export default function PromotionTab({ seminarId: propSeminarId }: { seminarId?: string } = {}) {
  const router = useRouter();
  const { seminars } = useSeminars();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(propSeminarId ?? null);
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
      router.push("/board/press");
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
            <div className="flex flex-wrap gap-2">
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

      {/* 리마인더 메시지 */}
      {seminar && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Bell size={16} className="text-primary" />
            <h3 className="text-sm font-semibold">리마인더 메시지</h3>
          </div>
          <p className="text-xs text-muted-foreground">
            세미나 정보가 자동으로 반영된 카카오톡 리마인더 메시지입니다. &quot;복사&quot; 버튼으로 복사 후 카카오톡에 붙여넣기하세요.
          </p>
          {REMINDER_TEMPLATES.map((tpl) => {
            const msg = tpl.getMessage(seminar);
            return (
              <div key={tpl.id} className="rounded-xl border bg-white overflow-hidden">
                <div className="flex items-center justify-between border-b bg-muted/20 px-4 py-3">
                  <div>
                    <h4 className="text-sm font-medium">{tpl.label}</h4>
                    <p className="text-xs text-muted-foreground">{tpl.timing}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(msg);
                      toast.success(`${tpl.label} 메시지가 복사되었습니다.`);
                    }}
                  >
                    <Copy size={14} className="mr-1" />복사
                  </Button>
                </div>
                <div className="p-4">
                  <pre className="whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground font-[inherit]">{msg}</pre>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
