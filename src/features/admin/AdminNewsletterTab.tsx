"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  useNewsletters,
  useCreateNewsletter,
  useUpdateNewsletter,
  useDeleteNewsletter,
  SECTION_TYPE_LABELS,
  AUTHOR_TYPE_LABELS,
} from "@/features/newsletter/newsletter-store";
import type { NewsletterSection, NewsletterIssue } from "@/features/newsletter/newsletter-store";
import { usePosts } from "@/features/board/useBoard";
import { useMembers } from "@/features/member/useMembers";
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
  Plus,
  Trash2,
  GripVertical,
  Eye,
  Save,
  FileText,
  ArrowUp,
  ArrowDown,
  Loader2,
  Pencil,
  Check,
  X,
  UserPlus,
  Mail,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { notifyNewsletterPublished } from "@/features/notifications/notify";
import { useAuthStore } from "@/features/auth/auth-store";

const COVER_COLORS = [
  { label: "보라", value: "from-violet-600 to-indigo-700" },
  { label: "초록", value: "from-emerald-600 to-teal-700" },
  { label: "주황", value: "from-amber-500 to-orange-600" },
  { label: "파랑", value: "from-blue-600 to-cyan-700" },
  { label: "빨강", value: "from-rose-600 to-pink-700" },
];

const SECTION_TYPES: NewsletterSection["type"][] = [
  "feature",
  "interview",
  "review",
  "column",
  "news",
];

const AUTHOR_TYPES = Object.keys(AUTHOR_TYPE_LABELS);

/** 입학 학기 옵션 생성 (최근 10년) */
function enrollmentOptions(): string[] {
  const currentYear = new Date().getFullYear();
  const options: string[] = [];
  for (let y = currentYear; y >= currentYear - 10; y--) {
    options.push(`${y}년 전기`);
    options.push(`${y}년 후기`);
  }
  return options;
}

export default function AdminNewsletterTab() {
  const router = useRouter();
  const { issues, isLoading: issuesLoading } = useNewsletters();
  const createMutation = useCreateNewsletter();
  const updateMutation = useUpdateNewsletter();
  const deleteMutation = useDeleteNewsletter();
  const { posts: allPosts } = usePosts("all");
  const currentUser = useAuthStore((s) => s.user);

  // 운영진 목록 (admin, president, staff)
  const { members: allMembers } = useMembers();
  const staffMembers = allMembers.filter((m) =>
    ["sysadmin", "admin", "president", "staff"].includes(m.role)
  );

  const [showPostPicker, setShowPostPicker] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showEditorPicker, setShowEditorPicker] = useState(false);
  const [sendingEmail, setSendingEmail] = useState<string | null>(null);

  // 예약 발송
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [publishAt, setPublishAt] = useState("");

  async function sendNewsletterEmail(issue: NewsletterIssue) {
    if (!confirm(`"${issue.title}" 학회보를 전체 회원에게 이메일로 발송하시겠습니까?`)) return;
    setSendingEmail(issue.id);
    try {
      const { auth } = await import("@/lib/firebase");
      const token = await auth.currentUser?.getIdToken();
      if (!token) { toast.error("인증이 필요합니다."); return; }
      const res = await fetch("/api/email/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title: issue.title,
          subtitle: issue.subtitle,
          issueNumber: issue.issueNumber,
          sections: issue.sections.map((s) => ({ title: s.title, type: s.type, authorName: s.authorName })),
        }),
      });
      const data = await res.json();
      if (data.sent) {
        toast.success(`${data.count}명에게 이메일이 발송되었습니다.`);
      } else {
        toast.error(data.reason || data.error || "발송에 실패했습니다.");
      }
    } catch {
      toast.error("이메일 발송 중 오류가 발생했습니다.");
    } finally {
      setSendingEmail(null);
    }
  }

  // 편집 대상 (null = 신규)
  const [editingId, setEditingId] = useState<string | null>(null);

  const nextIssueNumber =
    issues.length > 0 ? Math.max(...issues.map((i) => i.issueNumber), 0) + 1 : 1;
  const [title, setTitle] = useState(`연세교육공학회보 제${nextIssueNumber}호`);
  const [subtitle, setSubtitle] = useState("");
  const [coverColor, setCoverColor] = useState(COVER_COLORS[0].value);
  const [editors, setEditors] = useState<string[]>([]);
  const [sections, setSections] = useState<NewsletterSection[]>([]);
  const [sectionSaving, setSectionSaving] = useState<string | null>(null);

  // 기존 학회보 편집 모드 진입
  function startEdit(issue: NewsletterIssue) {
    setEditingId(issue.id);
    setTitle(issue.title);
    setSubtitle(issue.subtitle);
    setCoverColor(issue.coverColor);
    setEditors(issue.editorName ? issue.editorName.split(", ") : []);
    setSections([...issue.sections]);
    if (issue.publishAt) {
      setScheduleEnabled(true);
      // datetime-local input expects "YYYY-MM-DDTHH:mm"
      setPublishAt(issue.publishAt.slice(0, 16));
    } else {
      setScheduleEnabled(false);
      setPublishAt("");
    }
    toast.success(`"${issue.title}" 편집 모드로 전환했습니다.`);
  }

  function resetForm() {
    setEditingId(null);
    setTitle(`연세교육공학회보 제${nextIssueNumber}호`);
    setSubtitle("");
    setCoverColor(COVER_COLORS[0].value);
    setEditors([]);
    setSections([]);
    setScheduleEnabled(false);
    setPublishAt("");
  }

  // 편집자 토글
  function toggleEditor(name: string) {
    setEditors((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
    );
  }

  const editorName = editors.join(", ");

  function addFromPost(postId: string) {
    const post = allPosts.find((p) => p.id === postId);
    if (!post) return;

    const contentLines = post.content.split("\n").filter((l) => l.trim());
    const bulletItems = contentLines.filter((l) => l.startsWith("- "));

    if (bulletItems.length >= 2) {
      bulletItems.forEach((item, idx) => {
        const text = item.replace(/^- /, "").trim();
        const colonIdx = text.indexOf(": ");
        const sectionTitle = colonIdx > -1 ? text.substring(0, colonIdx) : text;
        const sectionContent = colonIdx > -1 ? text.substring(colonIdx + 2) : text;

        setSections((prev) => [
          ...prev,
          {
            id: `new-${Date.now()}-${idx}`,
            postId,
            title: sectionTitle,
            content: sectionContent,
            authorName: post.authorName,
            authorType: "",
            authorEnrollment: "",
            type: idx === 0 ? "feature" : "review",
            order: prev.length + idx + 1,
          },
        ]);
      });
      toast.success(
        `"${post.title}"에서 ${bulletItems.length}개 섹션이 자동 생성되었습니다.`
      );
    } else {
      setSections((prev) => [
        ...prev,
        {
          id: `new-${Date.now()}`,
          postId,
          title: post.title,
          content: post.content,
          authorName: post.authorName,
          authorType: "",
          authorEnrollment: "",
          type: "feature",
          order: prev.length + 1,
        },
      ]);
      toast.success(`"${post.title}"이 섹션으로 추가되었습니다.`);
    }
    setShowPostPicker(false);
  }

  function updateSection(id: string, data: Partial<NewsletterSection>) {
    setSections((prev) => prev.map((s) => (s.id === id ? { ...s, ...data } : s)));
  }

  function removeSection(id: string) {
    setSections((prev) =>
      prev
        .filter((s) => s.id !== id)
        .map((s, idx) => ({ ...s, order: idx + 1 }))
    );
  }

  function moveSection(id: string, direction: "up" | "down") {
    setSections((prev) => {
      const idx = prev.findIndex((s) => s.id === id);
      if (idx < 0) return prev;
      const newIdx = direction === "up" ? idx - 1 : idx + 1;
      if (newIdx < 0 || newIdx >= prev.length) return prev;
      const arr = [...prev];
      [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
      return arr.map((s, i) => ({ ...s, order: i + 1 }));
    });
  }

  // 섹션별 저장 (기존 학회보 편집 시)
  async function handleSaveSection(sectionId: string) {
    if (!editingId) {
      toast.error("먼저 학회보를 초안 저장한 후 섹션별 저장이 가능합니다.");
      return;
    }
    setSectionSaving(sectionId);
    try {
      await updateMutation.mutateAsync({
        id: editingId,
        data: { sections, lastEditedBy: currentUser?.name ?? "관리자" },
      });
      toast.success("섹션이 저장되었습니다.");
    } catch {
      toast.error("섹션 저장에 실패했습니다.");
    } finally {
      setSectionSaving(null);
    }
  }

  function handleSave(status: "draft" | "published") {
    if (!title.trim() || !subtitle.trim() || sections.length === 0) {
      toast.error("제목, 부제목, 그리고 최소 1개 섹션이 필요합니다.");
      return;
    }

    const payload = {
      issueNumber: editingId
        ? issues.find((i) => i.id === editingId)?.issueNumber ?? nextIssueNumber
        : nextIssueNumber,
      title,
      subtitle,
      coverColor,
      publishDate: new Date().toISOString().split("T")[0],
      editorName: editorName || "편집팀",
      sections,
      status,
      publishAt: scheduleEnabled && publishAt && status === "draft"
        ? new Date(publishAt).toISOString()
        : undefined,
      lastEditedBy: currentUser?.name ?? "관리자",
    };

    if (editingId) {
      updateMutation.mutate(
        { id: editingId, data: payload },
        {
          onSuccess: () => {
            toast.success(
              status === "published"
                ? "학회보가 발행되었습니다!"
                : "초안이 저장되었습니다."
            );
            if (status === "published") {
              notifyNewsletterPublished(title, payload.issueNumber, currentUser?.id);
            }
            resetForm();
            router.push("/newsletter");
          },
          onError: () => toast.error("저장에 실패했습니다."),
        }
      );
    } else {
      createMutation.mutate(payload, {
        onSuccess: () => {
          toast.success(
            status === "published"
              ? "학회보가 발행되었습니다!"
              : "초안이 저장되었습니다."
          );
          if (status === "published") {
            notifyNewsletterPublished(title, payload.issueNumber, currentUser?.id);
          }
          resetForm();
          router.push("/newsletter");
        },
        onError: () => toast.error("저장에 실패했습니다."),
      });
    }
  }

  function handleDelete(id: string, issueTitle: string) {
    if (!confirm(`"${issueTitle}"을 삭제하시겠습니까?`)) return;
    deleteMutation.mutate(id, {
      onSuccess: () => {
        toast.success("삭제되었습니다.");
        if (editingId === id) resetForm();
      },
      onError: () => toast.error("삭제에 실패했습니다."),
    });
  }

  const saving = createMutation.isPending || updateMutation.isPending;

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">
            학회보 편집 {editingId && <Badge className="ml-2">편집 중</Badge>}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            게시글을 선택하면 섹션으로 자동 변환됩니다.
          </p>
        </div>
        {editingId && (
          <Button variant="outline" size="sm" onClick={resetForm}>
            <X size={14} className="mr-1" />
            편집 취소 (새 학회보)
          </Button>
        )}
      </div>

      {/* 발행 통계 */}
      {!issuesLoading && issues.length > 0 && (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {(() => {
            const total = issues.length;
            const published = issues.filter((i) => i.status === "published").length;
            const draft = total - published;
            const latest = issues
              .filter((i) => i.status === "published")
              .sort((a, b) => (b.publishDate ?? "").localeCompare(a.publishDate ?? ""))[0];
            const stats = [
              { label: "총 호수", value: String(total) },
              { label: "발행", value: String(published) },
              { label: "초안", value: String(draft) },
              { label: "최신 발행일", value: latest?.publishDate ?? "—" },
            ];
            return stats.map((s) => (
              <div key={s.label} className="rounded-2xl border bg-white p-4">
                <div className="text-xs text-muted-foreground">{s.label}</div>
                <div className="mt-1 text-lg font-bold">{s.value}</div>
              </div>
            ));
          })()}
        </div>
      )}

      {/* 기존 학회보 목록 */}
      {!issuesLoading && issues.length > 0 && (
        <div className="mt-6 rounded-2xl border bg-white p-6">
          <h3 className="font-bold">발행 이력 ({issues.length})</h3>
          <div className="mt-3 divide-y">
            {issues.map((issue) => (
              <div key={issue.id} className="flex items-center justify-between py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{issue.title}</span>
                    <Badge
                      variant={issue.status === "published" ? "default" : "secondary"}
                    >
                      {issue.status === "published" ? "발행" : "초안"}
                    </Badge>
                    {editingId === issue.id && (
                      <Badge variant="outline" className="text-primary">
                        편집 중
                      </Badge>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {issue.publishDate} · {issue.editorName} · {issue.sections.length}개
                    섹션
                  </p>
                  {(issue.lastEditedBy || issue.lastEditedAt) && (
                    <p className="mt-0.5 text-[11px] text-muted-foreground/80">
                      마지막 수정: {issue.lastEditedBy ?? "—"}
                      {issue.lastEditedAt
                        ? ` · ${new Date(issue.lastEditedAt).toLocaleString("ko-KR")}`
                        : ""}
                    </p>
                  )}
                </div>
                <div className="ml-2 flex shrink-0 gap-1">
                  {issue.status === "published" && (
                    <button
                      onClick={() => sendNewsletterEmail(issue)}
                      disabled={sendingEmail === issue.id}
                      className="text-muted-foreground hover:text-primary disabled:opacity-50"
                      title="이메일 발송"
                    >
                      {sendingEmail === issue.id ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Mail size={16} />
                      )}
                    </button>
                  )}
                  <button
                    onClick={() => startEdit(issue)}
                    className="text-muted-foreground hover:text-primary"
                    title="편집"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(issue.id, issue.title)}
                    className="text-muted-foreground hover:text-destructive"
                    title="삭제"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 기본 정보 */}
      <div className="mt-6 space-y-4 rounded-2xl border bg-white p-6">
        <h3 className="font-bold">{editingId ? "학회보 정보 편집" : "새 학회보"}</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">제목</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">부제목 (표지)</label>
            <Input
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              placeholder="예: 생성형 AI와 교수설계의 만남"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">편집자</label>
            <div className="flex flex-wrap items-center gap-1.5">
              {editors.map((name) => (
                <Badge key={name} variant="secondary" className="gap-1 pr-1">
                  {name}
                  <button
                    onClick={() => toggleEditor(name)}
                    className="rounded-full p-0.5 hover:bg-destructive/20 hover:text-destructive"
                  >
                    <X size={10} />
                  </button>
                </Badge>
              ))}
              <Button
                variant="outline"
                size="sm"
                className="h-7 gap-1 text-xs"
                onClick={() => setShowEditorPicker(true)}
              >
                <UserPlus size={12} />
                운영진에서 추가
              </Button>
            </div>
            {editors.length === 0 && (
              <p className="mt-1 text-xs text-muted-foreground">
                편집자를 선택하지 않으면 &quot;편집팀&quot;으로 표시됩니다.
              </p>
            )}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">표지 색상</label>
            <div className="flex gap-2">
              {COVER_COLORS.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setCoverColor(c.value)}
                  className={cn(
                    "h-8 w-8 rounded-full bg-gradient-to-br transition-all",
                    c.value,
                    coverColor === c.value
                      ? "ring-2 ring-primary ring-offset-2"
                      : "opacity-60 hover:opacity-100"
                  )}
                  title={c.label}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 섹션 목록 */}
      <div className="mt-6 rounded-2xl border bg-white p-6">
        <div className="flex items-center justify-between">
          <h3 className="font-bold">섹션 ({sections.length})</h3>
          <div className="flex gap-2">
            <Button
              variant="default"
              size="sm"
              onClick={() => {
                setSections((prev) => [
                  ...prev,
                  {
                    id: `new-${Date.now()}`,
                    postId: undefined as unknown as string,
                    title: "",
                    content: "",
                    authorName: "",
                    authorType: "",
                    authorEnrollment: "",
                    type: "feature",
                    order: prev.length + 1,
                  },
                ]);
                toast.success("빈 섹션이 추가되었습니다. 내용을 직접 작성하세요.");
              }}
            >
              <Plus size={14} className="mr-1" />
              직접 작성
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPostPicker(true)}
            >
              <FileText size={14} className="mr-1" />
              게시글에서 추가
            </Button>
          </div>
        </div>

        {sections.length === 0 ? (
          <div className="mt-6 rounded-xl border-2 border-dashed bg-muted/20 py-12 text-center">
            <FileText size={32} className="mx-auto text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">
              아직 섹션이 없습니다. 직접 작성하거나 게시글에서 추가하세요.
            </p>
            <div className="mt-4 flex justify-center gap-2">
              <Button
                size="sm"
                onClick={() => {
                  setSections((prev) => [
                    ...prev,
                    {
                      id: `new-${Date.now()}`,
                      postId: undefined as unknown as string,
                      title: "",
                      content: "",
                      authorName: "",
                      authorType: "",
                      authorEnrollment: "",
                      type: "feature",
                      order: prev.length + 1,
                    },
                  ]);
                }}
              >
                <Plus size={14} className="mr-1" />
                직접 작성
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPostPicker(true)}
              >
                <FileText size={14} className="mr-1" />
                게시글에서 추가
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {sections
              .sort((a, b) => a.order - b.order)
              .map((section) => (
                <div
                  key={section.id}
                  className="rounded-xl border bg-muted/10 p-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex flex-col gap-0.5 pt-1">
                      <button
                        onClick={() => moveSection(section.id, "up")}
                        className="text-muted-foreground hover:text-foreground"
                        disabled={section.order <= 1}
                      >
                        <ArrowUp size={14} />
                      </button>
                      <GripVertical size={14} className="text-muted-foreground" />
                      <button
                        onClick={() => moveSection(section.id, "down")}
                        className="text-muted-foreground hover:text-foreground"
                        disabled={section.order >= sections.length}
                      >
                        <ArrowDown size={14} />
                      </button>
                    </div>

                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                          {section.order}
                        </span>
                        <select
                          value={section.type}
                          onChange={(e) =>
                            updateSection(section.id, {
                              type: e.target.value as NewsletterSection["type"],
                            })
                          }
                          className="rounded-md border px-2 py-1 text-xs"
                        >
                          {SECTION_TYPES.map((t) => (
                            <option key={t} value={t}>
                              {SECTION_TYPE_LABELS[t]}
                            </option>
                          ))}
                        </select>
                      </div>
                      <Input
                        value={section.title}
                        onChange={(e) =>
                          updateSection(section.id, { title: e.target.value })
                        }
                        className="text-sm font-medium"
                        placeholder="섹션 제목"
                      />
                      <textarea
                        value={section.content}
                        onChange={(e) =>
                          updateSection(section.id, { content: e.target.value })
                        }
                        rows={3}
                        className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                        placeholder="내용..."
                      />

                      {/* 작성자 정보 행 */}
                      <div className="grid gap-2 sm:grid-cols-3">
                        <Input
                          value={section.authorName}
                          onChange={(e) =>
                            updateSection(section.id, {
                              authorName: e.target.value,
                            })
                          }
                          className="text-xs"
                          placeholder="작성자 이름"
                        />
                        <select
                          value={section.authorType || ""}
                          onChange={(e) =>
                            updateSection(section.id, {
                              authorType: e.target.value,
                            })
                          }
                          className="rounded-md border px-2 py-1 text-xs"
                        >
                          <option value="">유형 선택</option>
                          {AUTHOR_TYPES.map((t) => (
                            <option key={t} value={t}>
                              {AUTHOR_TYPE_LABELS[t]}
                            </option>
                          ))}
                        </select>
                        <select
                          value={section.authorEnrollment || ""}
                          onChange={(e) =>
                            updateSection(section.id, {
                              authorEnrollment: e.target.value,
                            })
                          }
                          className="rounded-md border px-2 py-1 text-xs"
                        >
                          <option value="">입학 학기</option>
                          {enrollmentOptions().map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* 작성자 정보 미리보기 */}
                      {(section.authorType || section.authorEnrollment) && (
                        <div className="flex flex-wrap gap-1">
                          {section.authorType && (
                            <Badge variant="secondary" className="text-[10px]">
                              {AUTHOR_TYPE_LABELS[section.authorType]}
                            </Badge>
                          )}
                          {section.authorEnrollment && (
                            <Badge variant="outline" className="text-[10px]">
                              {section.authorEnrollment} 입학
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex shrink-0 flex-col gap-1">
                      {/* 섹션별 저장 버튼 */}
                      {editingId && (
                        <button
                          onClick={() => handleSaveSection(section.id)}
                          disabled={sectionSaving === section.id}
                          className="rounded p-1 text-muted-foreground hover:bg-primary/10 hover:text-primary"
                          title="이 섹션 저장"
                        >
                          {sectionSaving === section.id ? (
                            <Loader2 size={16} className="animate-spin" />
                          ) : (
                            <Save size={16} />
                          )}
                        </button>
                      )}
                      <button
                        onClick={() => removeSection(section.id)}
                        className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        title="삭제"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* 하단 액션 */}
      <div className="mt-6 space-y-3">
        {/* 예약 발송 */}
        <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-muted/20 px-4 py-3">
          <label className="flex cursor-pointer items-center gap-2 text-sm font-medium select-none">
            <input
              type="checkbox"
              checked={scheduleEnabled}
              onChange={(e) => setScheduleEnabled(e.target.checked)}
              className="rounded border"
            />
            <Clock size={14} />
            예약 발송
          </label>
          {scheduleEnabled && (
            <>
              <input
                type="datetime-local"
                value={publishAt}
                onChange={(e) => setPublishAt(e.target.value)}
                className="rounded-md border px-3 py-1.5 text-sm"
                min={new Date().toISOString().slice(0, 16)}
              />
              <span className="text-xs text-muted-foreground">초안으로 저장 후 지정 시각에 자동 발행됩니다</span>
            </>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button
            variant="outline"
            onClick={() => setShowPreview(true)}
            disabled={sections.length === 0}
          >
            <Eye size={16} className="mr-1" />
            미리보기
          </Button>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => handleSave("draft")}
              disabled={sections.length === 0 || saving}
            >
              {saving ? (
                <Loader2 size={16} className="mr-1 animate-spin" />
              ) : (
                <Save size={16} className="mr-1" />
              )}
              {scheduleEnabled && publishAt ? "예약 저장" : "초안 저장"}
            </Button>
            <Button
              onClick={() => handleSave("published")}
              disabled={sections.length === 0 || saving}
            >
              {saving && <Loader2 size={16} className="mr-1 animate-spin" />}
              발행하기
            </Button>
          </div>
        </div>
      </div>

      {/* 편집자 선택 Dialog */}
      <Dialog
        open={showEditorPicker}
        onOpenChange={(open) => !open && setShowEditorPicker(false)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>운영진에서 편집자 선택</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            복수 선택이 가능합니다. 클릭하여 토글하세요.
          </p>
          <div className="max-h-[50vh] divide-y overflow-y-auto rounded-lg border">
            {staffMembers.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                운영진 회원이 없습니다.
              </p>
            ) : (
              staffMembers.map((member) => {
                const selected = editors.includes(member.name);
                return (
                  <button
                    key={member.id}
                    onClick={() => toggleEditor(member.name)}
                    className={cn(
                      "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors",
                      selected ? "bg-primary/5" : "hover:bg-muted/30"
                    )}
                  >
                    <div
                      className={cn(
                        "flex h-5 w-5 shrink-0 items-center justify-center rounded border",
                        selected
                          ? "border-primary bg-primary text-white"
                          : "border-muted-foreground/30"
                      )}
                    >
                      {selected && <Check size={12} />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-sm font-medium">{member.name}</span>
                      <div className="flex items-center gap-1.5">
                        <Badge variant="secondary" className="text-[10px]">
                          {member.role === "sysadmin"
                            ? "시스템 관리자"
                            : member.role === "admin"
                              ? "관리자"
                              : member.role === "president"
                                ? "회장"
                                : "운영진"}
                        </Badge>
                        {member.generation && (
                          <span className="text-[10px] text-muted-foreground">
                            {member.generation}기
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setShowEditorPicker(false)}>
              선택 완료 ({editors.length}명)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 게시글 선택 Dialog */}
      <Dialog
        open={showPostPicker}
        onOpenChange={(open) => !open && setShowPostPicker(false)}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>게시글에서 섹션 추가</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            게시글을 선택하면 내용이 자동으로 섹션으로 변환됩니다. 글머리
            기호(-)가 포함된 게시글은 각 항목이 개별 섹션으로 분리됩니다.
          </p>
          <div className="max-h-[50vh] divide-y overflow-y-auto rounded-lg border">
            {allPosts.map((post) => {
              const alreadyAdded = sections.some((s) => s.postId === post.id);
              return (
                <button
                  key={post.id}
                  onClick={() => !alreadyAdded && addFromPost(post.id)}
                  disabled={alreadyAdded}
                  className={cn(
                    "w-full px-4 py-3 text-left transition-colors",
                    alreadyAdded ? "bg-muted/30 opacity-50" : "hover:bg-muted/30"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-[10px]">
                      {post.category}
                    </Badge>
                    <span className="truncate text-sm font-medium">
                      {post.title}
                    </span>
                    {alreadyAdded && (
                      <Badge className="ml-auto text-[10px]">추가됨</Badge>
                    )}
                  </div>
                  <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                    {post.authorName} · {post.content.substring(0, 60)}...
                  </p>
                </button>
              );
            })}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPostPicker(false)}>
              닫기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 미리보기 Dialog */}
      <Dialog
        open={showPreview}
        onOpenChange={(open) => !open && setShowPreview(false)}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>학회보 미리보기</DialogTitle>
          </DialogHeader>

          <div
            className={cn(
              "flex min-h-[200px] flex-col justify-end rounded-xl bg-gradient-to-br p-6 text-white",
              coverColor
            )}
          >
            <p className="text-xs uppercase tracking-widest opacity-70">
              연세교육공학회보
            </p>
            <p className="text-xs opacity-60">vol. {editingId ? issues.find((i) => i.id === editingId)?.issueNumber ?? nextIssueNumber : nextIssueNumber}</p>
            <h2 className="mt-3 text-2xl font-bold">
              {subtitle || "(부제목)"}
            </h2>
            <p className="mt-2 text-xs opacity-80">
              편집 {editorName || "(편집자)"}
            </p>
          </div>

          <div className="rounded-xl border p-4">
            <h3 className="text-sm font-bold">목차</h3>
            <div className="mt-2 space-y-1.5">
              {sections
                .sort((a, b) => a.order - b.order)
                .map((s, idx) => (
                  <div key={s.id} className="flex items-center gap-2 text-sm">
                    <span className="w-5 text-right text-xs text-muted-foreground">
                      {idx + 1}.
                    </span>
                    <Badge variant="secondary" className="text-[10px]">
                      {SECTION_TYPE_LABELS[s.type]}
                    </Badge>
                    <span className="truncate">{s.title}</span>
                  </div>
                ))}
            </div>
          </div>

          {sections
            .sort((a, b) => a.order - b.order)
            .map((s) => (
              <div key={s.id} className="rounded-xl border p-4">
                <Badge variant="secondary" className="text-[10px]">
                  {SECTION_TYPE_LABELS[s.type]}
                </Badge>
                <h3 className="mt-2 text-lg font-bold">{s.title}</h3>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  <span className="text-xs text-muted-foreground">
                    글 {s.authorName}
                  </span>
                  {s.authorType && (
                    <Badge variant="secondary" className="text-[10px]">
                      {AUTHOR_TYPE_LABELS[s.authorType]}
                    </Badge>
                  )}
                  {s.authorEnrollment && (
                    <Badge variant="outline" className="text-[10px]">
                      {s.authorEnrollment} 입학
                    </Badge>
                  )}
                </div>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-foreground/80">
                  {s.content}
                </p>
              </div>
            ))}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreview(false)}>
              닫기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
