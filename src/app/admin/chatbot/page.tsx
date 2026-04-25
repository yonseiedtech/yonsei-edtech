"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { dataApi, siteSettingsApi } from "@/lib/bkend";
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
  MessageCircle,
  Plus,
  Pencil,
  Trash2,
  Search,
  Loader2,
  Clock,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import ConsolePageHeader from "@/components/admin/ConsolePageHeader";

interface ChatLog {
  id: string;
  userId?: string;
  userName?: string;
  userMessage: string;
  botResponse: string;
  createdAt: string;
}

interface ChatQA {
  id: string;
  keywords: string[];
  question: string;
  answer: string;
  enabled: boolean;
  createdAt: string;
}

type Section = "greeting" | "logs" | "qa";

export default function ChatbotAdminPage() {
  const queryClient = useQueryClient();
  const [section, setSection] = useState<Section>("greeting");
  const [greetingText, setGreetingText] = useState("");
  const [savingGreeting, setSavingGreeting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Q&A 편집
  const [qaDialog, setQaDialog] = useState(false);
  const [editQaId, setEditQaId] = useState<string | null>(null);
  const [qaForm, setQaForm] = useState({ question: "", answer: "", keywords: "" });

  // 인사말 조회
  const { data: greetingSetting } = useQuery({
    queryKey: ["site_settings", "chatbot_greeting"],
    queryFn: async () => {
      const res = await siteSettingsApi.getByKey("chatbot_greeting");
      return res.data[0] as { id: string; value: string } | undefined;
    },
  });

  // 노출 여부 조회 (기본: 숨김)
  const { data: visibleSetting } = useQuery({
    queryKey: ["site_settings", "chatbot_visible"],
    queryFn: async () => {
      const res = await siteSettingsApi.getByKey("chatbot_visible");
      return res.data[0] as { id: string; value: string } | undefined;
    },
  });
  const isVisible = visibleSetting?.value === "true";

  const toggleVisibilityMutation = useMutation({
    mutationFn: async (next: boolean) => {
      const value = next ? "true" : "false";
      if (visibleSetting?.id) {
        await siteSettingsApi.update(visibleSetting.id, { key: "chatbot_visible", value });
      } else {
        await siteSettingsApi.create({ key: "chatbot_visible", value });
      }
    },
    onSuccess: (_data, next) => {
      queryClient.invalidateQueries({ queryKey: ["site_settings", "chatbot_visible"] });
      toast.success(next ? "챗봇 플로팅 UI를 표시합니다." : "챗봇 플로팅 UI를 숨깁니다.");
    },
    onError: () => toast.error("설정 변경에 실패했습니다."),
  });

  // 인사말 초기값 설정
  const currentGreeting = greetingSetting?.value || "안녕하세요! 연세교육공학회 챗봇입니다. 궁금한 점이 있으시면 편하게 질문해 주세요! 😊";
  if (greetingText === "" && greetingSetting?.value) setGreetingText(greetingSetting.value);

  async function saveGreeting() {
    setSavingGreeting(true);
    try {
      if (greetingSetting?.id) {
        await siteSettingsApi.update(greetingSetting.id, { key: "chatbot_greeting", value: greetingText });
      } else {
        await siteSettingsApi.create({ key: "chatbot_greeting", value: greetingText });
      }
      queryClient.invalidateQueries({ queryKey: ["site_settings", "chatbot_greeting"] });
      toast.success("인사말이 저장되었습니다.");
    } catch {
      toast.error("저장에 실패했습니다.");
    } finally {
      setSavingGreeting(false);
    }
  }

  // 채팅 로그 조회
  const { data: chatLogs = [] } = useQuery({
    queryKey: ["chat_logs"],
    queryFn: async () => {
      const res = await dataApi.list<ChatLog>("chat_logs", { sort: "createdAt:desc", limit: 100 });
      return res.data;
    },
  });

  // Q&A 설정 조회
  const { data: qaList = [] } = useQuery({
    queryKey: ["chat_qa"],
    queryFn: async () => {
      const res = await dataApi.list<ChatQA>("chat_qa", { sort: "createdAt:desc" });
      return res.data;
    },
  });

  // 채팅 로그 필터
  const filteredLogs = chatLogs.filter((log) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return log.userMessage.toLowerCase().includes(q) || (log.userName ?? "").toLowerCase().includes(q);
  });

  // Q&A 저장
  const saveQaMutation = useMutation({
    mutationFn: async () => {
      const data = {
        question: qaForm.question.trim(),
        answer: qaForm.answer.trim(),
        keywords: qaForm.keywords.split(",").map((k) => k.trim()).filter(Boolean),
        enabled: true,
      };
      if (editQaId) {
        await dataApi.update("chat_qa", editQaId, data);
      } else {
        await dataApi.create("chat_qa", data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat_qa"] });
      toast.success(editQaId ? "수정되었습니다." : "등록되었습니다.");
      closeQaDialog();
    },
  });

  const deleteQaMutation = useMutation({
    mutationFn: (id: string) => dataApi.delete("chat_qa", id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat_qa"] });
      toast.success("삭제되었습니다.");
    },
  });

  const toggleQaMutation = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      dataApi.update("chat_qa", id, { enabled }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat_qa"] });
    },
  });

  function openCreateQa() {
    setEditQaId(null);
    setQaForm({ question: "", answer: "", keywords: "" });
    setQaDialog(true);
  }

  function openEditQa(qa: ChatQA) {
    setEditQaId(qa.id);
    setQaForm({ question: qa.question, answer: qa.answer, keywords: qa.keywords.join(", ") });
    setQaDialog(true);
  }

  function closeQaDialog() {
    setQaDialog(false);
    setEditQaId(null);
    setQaForm({ question: "", answer: "", keywords: "" });
  }

  return (
    <div className="space-y-6">
      <ConsolePageHeader
        icon={MessageCircle}
        title="연교공 챗봇 관리"
        description="회원과 방문자에게 노출되는 챗봇 인사말·채팅 기록·Q&A 자동응답을 관리합니다."
        actions={
          <Badge
            variant="secondary"
            className={cn(
              "text-xs",
              isVisible ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700",
            )}
          >
            {isVisible ? "노출중" : "숨김"}
          </Badge>
        }
      />

      <div className="rounded-xl border bg-white p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-semibold">챗봇 플로팅 UI 노출</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              모든 페이지 우측 하단에 떠 있는 챗봇 버튼의 노출 여부를 제어합니다.
              숨김으로 두면 회원·방문자에게 챗봇이 보이지 않습니다.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant="secondary"
              className={cn(
                "text-xs",
                isVisible ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700",
              )}
            >
              {isVisible ? "현재: 노출" : "현재: 숨김"}
            </Badge>
            <Button
              size="sm"
              variant={isVisible ? "outline" : "default"}
              disabled={toggleVisibilityMutation.isPending}
              onClick={() => toggleVisibilityMutation.mutate(!isVisible)}
            >
              {toggleVisibilityMutation.isPending && (
                <Loader2 size={14} className="mr-1 animate-spin" />
              )}
              {isVisible ? "숨김으로 전환" : "노출로 전환"}
            </Button>
          </div>
        </div>
      </div>

      <Tabs value={section} onValueChange={(v) => setSection(v as Section)}>
        <TabsList>
          <TabsTrigger value="greeting">
            <MessageCircle size={14} className="mr-1" />
            인사말 설정
          </TabsTrigger>
          <TabsTrigger value="logs">
            <Clock size={14} className="mr-1" />
            채팅 기록
          </TabsTrigger>
          <TabsTrigger value="qa">
            <MessageCircle size={14} className="mr-1" />
            Q&A 설정
          </TabsTrigger>
        </TabsList>

        <TabsContent value="greeting" className="mt-4">
          <div className="rounded-xl border bg-white p-6 space-y-4">
          <h3 className="font-semibold">챗봇 인사말 설정</h3>
          <p className="text-xs text-muted-foreground">챗봇을 열었을 때 처음 표시되는 인사말을 설정합니다.</p>
          <div>
            <label className="mb-1 block text-sm font-medium">현재 인사말</label>
            <div className="rounded-lg bg-muted/30 p-3 text-sm text-muted-foreground">{currentGreeting}</div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">새 인사말</label>
            <textarea
              value={greetingText || currentGreeting}
              onChange={(e) => setGreetingText(e.target.value)}
              rows={4}
              placeholder="챗봇 인사말을 입력하세요."
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </div>
          <Button onClick={saveGreeting} disabled={savingGreeting}>
            {savingGreeting && <Loader2 size={14} className="mr-1 animate-spin" />}
            인사말 저장
          </Button>
          </div>
        </TabsContent>

        <TabsContent value="logs" className="mt-4">
          <div className="space-y-3">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="메시지 내용 또는 사용자 검색"
              className="pl-8 text-sm"
            />
          </div>

          {filteredLogs.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">채팅 기록이 없습니다.</p>
          ) : (
            <div className="space-y-2">
              {filteredLogs.map((log) => (
                <div key={log.id} className="rounded-lg border bg-white p-4">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <User size={12} />
                    <span>{log.userName || "익명"}</span>
                    <span>·</span>
                    <span>{new Date(log.createdAt).toLocaleString("ko-KR", { timeZone: "Asia/Seoul", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false })}</span>
                  </div>
                  <div className="mt-2 space-y-1.5">
                    <div className="flex gap-2">
                      <Badge variant="secondary" className="shrink-0 text-[10px]">질문</Badge>
                      <p className="text-sm">{log.userMessage}</p>
                    </div>
                    <div className="flex gap-2">
                      <Badge className="shrink-0 bg-primary/10 text-[10px] text-primary">답변</Badge>
                      <p className="text-sm text-muted-foreground">{log.botResponse}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          </div>
        </TabsContent>

        <TabsContent value="qa" className="mt-4">
          <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              자주 묻는 질문과 답변을 설정합니다. 키워드가 매칭되면 설정된 답변을 자동으로 제공합니다.
            </p>
            <Button size="sm" onClick={openCreateQa}>
              <Plus size={14} className="mr-1" />
              Q&A 추가
            </Button>
          </div>

          {qaList.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">설정된 Q&A가 없습니다.</p>
          ) : (
            <div className="space-y-2">
              {qaList.map((qa) => (
                <div key={qa.id} className={cn("rounded-lg border bg-white p-4", !qa.enabled && "opacity-50")}>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="secondary" className={qa.enabled ? "bg-green-50 text-green-700 text-[10px]" : "text-[10px]"}>
                          {qa.enabled ? "활성" : "비활성"}
                        </Badge>
                        {qa.keywords.map((k) => (
                          <Badge key={k} variant="secondary" className="text-[10px]">{k}</Badge>
                        ))}
                      </div>
                      <p className="mt-1.5 text-sm font-medium">Q: {qa.question}</p>
                      <p className="mt-1 text-sm text-muted-foreground">A: {qa.answer}</p>
                    </div>
                    <div className="flex shrink-0 gap-1 self-end sm:self-start">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => toggleQaMutation.mutate({ id: qa.id, enabled: !qa.enabled })}
                      >
                        {qa.enabled ? "비활성" : "활성"}
                      </Button>
                      <Button variant="outline" size="sm" className="h-7" onClick={() => openEditQa(qa)}>
                        <Pencil size={12} />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-destructive"
                        onClick={() => { if (confirm("삭제하시겠습니까?")) deleteQaMutation.mutate(qa.id); }}
                      >
                        <Trash2 size={12} />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Q&A 등록/수정 Dialog */}
      <Dialog open={qaDialog} onOpenChange={(open) => !open && closeQaDialog()}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editQaId ? "Q&A 수정" : "Q&A 등록"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium">키워드 (쉼표 구분)</label>
              <Input
                value={qaForm.keywords}
                onChange={(e) => setQaForm({ ...qaForm, keywords: e.target.value })}
                placeholder="예: 세미나, 일정, 시간"
              />
              <p className="mt-1 text-xs text-muted-foreground">사용자 메시지에 키워드가 포함되면 이 답변을 제공합니다.</p>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">질문 (대표 질문)</label>
              <Input
                value={qaForm.question}
                onChange={(e) => setQaForm({ ...qaForm, question: e.target.value })}
                placeholder="예: 세미나는 언제 열리나요?"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">답변</label>
              <textarea
                value={qaForm.answer}
                onChange={(e) => setQaForm({ ...qaForm, answer: e.target.value })}
                rows={4}
                placeholder="챗봇이 제공할 답변을 작성하세요."
                className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeQaDialog}>취소</Button>
            <Button
              onClick={() => saveQaMutation.mutate()}
              disabled={saveQaMutation.isPending || !qaForm.question.trim() || !qaForm.answer.trim()}
            >
              {saveQaMutation.isPending && <Loader2 size={14} className="mr-1 animate-spin" />}
              {editQaId ? "수정" : "등록"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
