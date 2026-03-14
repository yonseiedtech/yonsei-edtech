"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AuthGuard from "@/features/auth/AuthGuard";
import {
  useNewsletterStore,
  SECTION_TYPE_LABELS,
} from "@/features/newsletter/newsletter-store";
import type { NewsletterSection } from "@/features/newsletter/newsletter-store";
import { MOCK_POSTS } from "@/features/board/board-data";
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
  ArrowLeft,
  Plus,
  Trash2,
  GripVertical,
  Eye,
  Save,
  FileText,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

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

function NewsletterEditor() {
  const router = useRouter();
  const { issues, addIssue } = useNewsletterStore();
  const [showPostPicker, setShowPostPicker] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // 편집 중인 학회보 상태
  const nextIssueNumber = Math.max(...issues.map((i) => i.issueNumber), 0) + 1;
  const [title, setTitle] = useState(`연세교육공학회보 제${nextIssueNumber}호`);
  const [subtitle, setSubtitle] = useState("");
  const [coverColor, setCoverColor] = useState(COVER_COLORS[0].value);
  const [editorName, setEditorName] = useState("");
  const [sections, setSections] = useState<NewsletterSection[]>([]);

  // 게시글에서 섹션 추가
  function addFromPost(postId: string) {
    const post = MOCK_POSTS.find((p) => p.id === postId);
    if (!post) return;

    // 게시글 내용을 파싱하여 섹션들로 분리
    const contentLines = post.content.split("\n").filter((l) => l.trim());
    const bulletItems = contentLines.filter((l) => l.startsWith("- "));

    if (bulletItems.length >= 2) {
      // 글머리 기호 항목들을 개별 섹션으로 변환
      bulletItems.forEach((item, idx) => {
        const text = item.replace(/^- /, "").trim();
        const colonIdx = text.indexOf(": ");
        const sectionTitle = colonIdx > -1 ? text.substring(0, colonIdx) : text;
        const sectionContent =
          colonIdx > -1 ? text.substring(colonIdx + 2) : text;

        setSections((prev) => [
          ...prev,
          {
            id: `new-${Date.now()}-${idx}`,
            postId,
            title: sectionTitle,
            content: sectionContent,
            authorName: post.authorName,
            type: idx === 0 ? "feature" : "review",
            order: prev.length + idx + 1,
          },
        ]);
      });
      toast.success(
        `"${post.title}"에서 ${bulletItems.length}개 섹션이 자동 생성되었습니다.`
      );
    } else {
      // 단일 섹션으로 추가
      setSections((prev) => [
        ...prev,
        {
          id: `new-${Date.now()}`,
          postId,
          title: post.title,
          content: post.content,
          authorName: post.authorName,
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

  function handleSave(status: "draft" | "published") {
    if (!title.trim() || !subtitle.trim() || sections.length === 0) {
      toast.error("제목, 부제목, 그리고 최소 1개 섹션이 필요합니다.");
      return;
    }
    addIssue({
      issueNumber: nextIssueNumber,
      title,
      subtitle,
      coverColor,
      publishDate: new Date().toISOString().split("T")[0],
      editorName: editorName || "편집팀",
      sections,
      status,
    });
    toast.success(
      status === "published"
        ? "학회보가 발행되었습니다!"
        : "초안이 저장되었습니다."
    );
    router.push("/newsletter");
  }

  return (
    <div className="py-16">
      <div className="mx-auto max-w-4xl px-4">
        <button
          onClick={() => router.push("/newsletter")}
          className="mb-6 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft size={16} />
          학회보 목록
        </button>

        <h1 className="text-3xl font-bold">학회보 편집</h1>
        <p className="mt-1 text-muted-foreground">
          게시글을 선택하면 섹션으로 자동 변환됩니다.
        </p>

        {/* 기본 정보 */}
        <div className="mt-8 space-y-4 rounded-2xl border bg-white p-6">
          <h2 className="font-bold">기본 정보</h2>
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
              <Input
                value={editorName}
                onChange={(e) => setEditorName(e.target.value)}
                placeholder="이름"
              />
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
            <h2 className="font-bold">
              섹션 ({sections.length})
            </h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPostPicker(true)}
            >
              <Plus size={14} className="mr-1" />
              게시글에서 추가
            </Button>
          </div>

          {sections.length === 0 ? (
            <div className="mt-6 rounded-xl border-2 border-dashed bg-muted/20 py-12 text-center">
              <FileText size={32} className="mx-auto text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">
                아직 섹션이 없습니다. 게시글을 선택하여 섹션을 추가하세요.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => setShowPostPicker(true)}
              >
                <Plus size={14} className="mr-1" />
                게시글에서 추가
              </Button>
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
                        <GripVertical
                          size={14}
                          className="text-muted-foreground"
                        />
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
                            updateSection(section.id, {
                              title: e.target.value,
                            })
                          }
                          className="text-sm font-medium"
                          placeholder="섹션 제목"
                        />
                        <textarea
                          value={section.content}
                          onChange={(e) =>
                            updateSection(section.id, {
                              content: e.target.value,
                            })
                          }
                          rows={3}
                          className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                          placeholder="내용..."
                        />
                        <Input
                          value={section.authorName}
                          onChange={(e) =>
                            updateSection(section.id, {
                              authorName: e.target.value,
                            })
                          }
                          className="text-xs"
                          placeholder="작성자"
                        />
                      </div>

                      <button
                        onClick={() => removeSection(section.id)}
                        className="shrink-0 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* 하단 액션 */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
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
              disabled={sections.length === 0}
            >
              <Save size={16} className="mr-1" />
              초안 저장
            </Button>
            <Button
              onClick={() => handleSave("published")}
              disabled={sections.length === 0}
            >
              발행하기
            </Button>
          </div>
        </div>

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
              게시글을 선택하면 내용이 자동으로 섹션으로 변환됩니다.
              글머리 기호(-)가 포함된 게시글은 각 항목이 개별 섹션으로 분리됩니다.
            </p>
            <div className="max-h-[50vh] divide-y overflow-y-auto rounded-lg border">
              {MOCK_POSTS.map((post) => {
                const alreadyAdded = sections.some((s) => s.postId === post.id);
                return (
                  <button
                    key={post.id}
                    onClick={() => !alreadyAdded && addFromPost(post.id)}
                    disabled={alreadyAdded}
                    className={cn(
                      "w-full px-4 py-3 text-left transition-colors",
                      alreadyAdded
                        ? "bg-muted/30 opacity-50"
                        : "hover:bg-muted/30"
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

            {/* 표지 미리보기 */}
            <div
              className={cn(
                "flex min-h-[200px] flex-col justify-end rounded-xl bg-gradient-to-br p-6 text-white",
                coverColor
              )}
            >
              <p className="text-xs uppercase tracking-widest opacity-70">
                연세교육공학회보
              </p>
              <p className="text-xs opacity-60">vol. {nextIssueNumber}</p>
              <h2 className="mt-3 text-2xl font-bold">
                {subtitle || "(부제목)"}
              </h2>
              <p className="mt-2 text-xs opacity-80">
                편집 {editorName || "(편집자)"}
              </p>
            </div>

            {/* 목차 */}
            <div className="rounded-xl border p-4">
              <h3 className="text-sm font-bold">목차</h3>
              <div className="mt-2 space-y-1.5">
                {sections
                  .sort((a, b) => a.order - b.order)
                  .map((s, idx) => (
                    <div
                      key={s.id}
                      className="flex items-center gap-2 text-sm"
                    >
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

            {/* 본문 미리보기 */}
            {sections
              .sort((a, b) => a.order - b.order)
              .map((s) => (
                <div key={s.id} className="rounded-xl border p-4">
                  <Badge variant="secondary" className="text-[10px]">
                    {SECTION_TYPE_LABELS[s.type]}
                  </Badge>
                  <h3 className="mt-2 text-lg font-bold">{s.title}</h3>
                  <p className="text-xs text-muted-foreground">
                    글 {s.authorName}
                  </p>
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
    </div>
  );
}

export default function NewsletterEditPage() {
  return (
    <AuthGuard allowedRoles={["staff", "president", "admin"]}>
      <NewsletterEditor />
    </AuthGuard>
  );
}
