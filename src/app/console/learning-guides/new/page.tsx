"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BookMarked, Loader2 } from "lucide-react";
import ConsolePageHeader from "@/components/admin/ConsolePageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { guidesApi } from "@/features/learning-guides/api";
import { toast } from "sonner";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9가-힣\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export default function NewLearningGuidePage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    title: "",
    slug: "",
    subtitle: "",
    coverEmoji: "📖",
    category: "",
    description: "",
    tags: "",
    visibility: "member" as "public" | "member" | "staff",
  });

  function setField<K extends keyof typeof form>(key: K, value: typeof form[K]) {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      // 제목 변경 시 slug 자동 생성 (slug가 비어 있을 때)
      if (key === "title" && !prev.slug) {
        next.slug = slugify(value as string);
      }
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) { toast.error("제목을 입력하세요."); return; }
    if (!form.slug.trim()) { toast.error("slug를 입력하세요."); return; }

    setSaving(true);
    try {
      const tags = form.tags.split(",").map((t) => t.trim()).filter(Boolean);
      const res = await guidesApi.create({
        title: form.title.trim(),
        slug: form.slug.trim(),
        subtitle: form.subtitle.trim() || undefined,
        coverEmoji: form.coverEmoji.trim() || "📖",
        category: form.category.trim() || "일반",
        description: form.description.trim() || undefined,
        tags,
        visibility: form.visibility,
        status: "draft",
      });
      toast.success("가이드가 생성되었습니다. 챕터·페이지를 추가하세요.");
      router.push(`/console/learning-guides/${res.data.id}/edit`);
    } catch (err) {
      console.error("[new-guide] create failed", err);
      toast.error(err instanceof Error ? err.message : "생성 실패");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <ConsolePageHeader
        icon={BookMarked}
        title="새 러닝 가이드"
        description="기본 정보를 입력하고 생성 후 챕터·페이지를 추가하세요."
      />

      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* 제목 + 이모지 */}
            <div className="flex gap-3">
              <div className="w-20">
                <Label htmlFor="coverEmoji" className="text-xs">표지 이모지</Label>
                <Input
                  id="coverEmoji"
                  value={form.coverEmoji}
                  onChange={(e) => setField("coverEmoji", e.target.value)}
                  className="mt-1 text-center text-xl"
                  maxLength={4}
                />
              </div>
              <div className="flex-1">
                <Label htmlFor="title" className="text-xs">제목 *</Label>
                <Input
                  id="title"
                  value={form.title}
                  onChange={(e) => setField("title", e.target.value)}
                  placeholder="예: 교육공학 연구방법 입문"
                  className="mt-1"
                  required
                />
              </div>
            </div>

            {/* Slug */}
            <div>
              <Label htmlFor="slug" className="text-xs">slug * (URL — 영소문자·숫자·하이픈)</Label>
              <Input
                id="slug"
                value={form.slug}
                onChange={(e) => setField("slug", e.target.value.toLowerCase().replace(/[^a-z0-9가-힣-]/g, ""))}
                placeholder="research-methods-intro"
                className="mt-1 font-mono text-sm"
                required
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                /learning-guides/<strong>{form.slug || "slug"}</strong> 로 접근됩니다.
              </p>
            </div>

            {/* 부제 */}
            <div>
              <Label htmlFor="subtitle" className="text-xs">부제 (선택)</Label>
              <Input
                id="subtitle"
                value={form.subtitle}
                onChange={(e) => setField("subtitle", e.target.value)}
                placeholder="예: 양적·질적·혼합 연구방법 개요"
                className="mt-1"
              />
            </div>

            {/* 카테고리 + 공개 범위 */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="category" className="text-xs">카테고리</Label>
                <Input
                  id="category"
                  value={form.category}
                  onChange={(e) => setField("category", e.target.value)}
                  placeholder="예: 연구방법"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="visibility" className="text-xs">공개 범위</Label>
                <select
                  id="visibility"
                  value={form.visibility}
                  onChange={(e) => setField("visibility", e.target.value as "public" | "member" | "staff")}
                  className="mt-1 h-9 w-full rounded-md border bg-background px-2 text-sm"
                >
                  <option value="public">전체공개</option>
                  <option value="member">회원</option>
                  <option value="staff">운영진</option>
                </select>
              </div>
            </div>

            {/* 설명 */}
            <div>
              <Label htmlFor="description" className="text-xs">설명 (선택)</Label>
              <Textarea
                id="description"
                value={form.description}
                onChange={(e) => setField("description", e.target.value)}
                placeholder="이 가이드에 대한 짧은 소개"
                rows={2}
                className="mt-1 resize-none"
              />
            </div>

            {/* 태그 */}
            <div>
              <Label htmlFor="tags" className="text-xs">태그 (쉼표로 구분)</Label>
              <Input
                id="tags"
                value={form.tags}
                onChange={(e) => setField("tags", e.target.value)}
                placeholder="양적연구, 통계, 설문"
                className="mt-1"
              />
            </div>

            {/* 제출 */}
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
              >
                취소
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
                가이드 생성
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
