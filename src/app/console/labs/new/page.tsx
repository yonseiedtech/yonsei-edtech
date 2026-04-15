"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { useCreateLab } from "@/features/labs/useLabs";
import { useAuthStore } from "@/features/auth/auth-store";
import { canManageLabs } from "@/lib/permissions";
import type { LabKind, LabStatus } from "@/types";
import { cn } from "@/lib/utils";

export default function NewLabPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { createLab, isLoading } = useCreateLab();
  const [kind, setKind] = useState<LabKind>("external");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [externalUrl, setExternalUrl] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [featureFlag, setFeatureFlag] = useState("");
  const [previewRoute, setPreviewRoute] = useState("");
  const [tags, setTags] = useState("");
  const [status, setStatus] = useState<LabStatus>("testing");

  if (!canManageLabs(user)) {
    return <p className="text-sm text-muted-foreground">권한이 없습니다.</p>;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return toast.error("제목을 입력하세요.");
    if (kind === "external" && !externalUrl.trim()) return toast.error("외부 URL을 입력하세요.");
    try {
      const lab = await createLab({
        kind,
        title: title.trim(),
        description: description.trim(),
        status,
        externalUrl: externalUrl.trim() || undefined,
        thumbnailUrl: thumbnailUrl.trim() || undefined,
        featureFlag: featureFlag.trim() || undefined,
        previewRoute: previewRoute.trim() || undefined,
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
      });
      toast.success("실험을 등록했습니다.");
      router.push(`/console/labs/${(lab as { id: string }).id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "등록 실패");
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold">새 실험 등록</h1>
      <form onSubmit={onSubmit} className="space-y-5">
        <div>
          <label className="mb-1.5 block text-sm font-medium">종류</label>
          <div className="flex gap-2">
            {(["external", "internal"] as const).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setKind(k)}
                className={cn(
                  "flex-1 rounded-lg border px-3 py-2 text-sm transition-colors",
                  kind === k ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted",
                )}
              >
                {k === "external" ? "외부 링크 (학회원 서비스)" : "내부 프로토타입"}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium">제목</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-lg border px-3 py-2 text-sm"
            required
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium">설명</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="w-full rounded-lg border px-3 py-2 text-sm"
          />
        </div>

        {kind === "external" ? (
          <>
            <div>
              <label className="mb-1.5 block text-sm font-medium">외부 URL *</label>
              <input
                value={externalUrl}
                onChange={(e) => setExternalUrl(e.target.value)}
                placeholder="https://..."
                className="w-full rounded-lg border px-3 py-2 text-sm"
                required
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">썸네일 URL (선택)</label>
              <input
                value={thumbnailUrl}
                onChange={(e) => setThumbnailUrl(e.target.value)}
                placeholder="https://..."
                className="w-full rounded-lg border px-3 py-2 text-sm"
              />
            </div>
          </>
        ) : (
          <>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Feature Flag</label>
              <input
                value={featureFlag}
                onChange={(e) => setFeatureFlag(e.target.value)}
                placeholder="labs-new-seminar-detail"
                className="w-full rounded-lg border px-3 py-2 text-sm font-mono"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">미리보기 경로 (선택)</label>
              <input
                value={previewRoute}
                onChange={(e) => setPreviewRoute(e.target.value)}
                placeholder="/seminars/:id?lab=new-detail"
                className="w-full rounded-lg border px-3 py-2 text-sm font-mono"
              />
            </div>
          </>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium">상태</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as LabStatus)}
              className="w-full rounded-lg border px-3 py-2 text-sm"
            >
              <option value="draft">준비중</option>
              <option value="testing">테스트</option>
              <option value="feedback">피드백</option>
              <option value="approved">승인됨</option>
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">태그 (쉼표 구분)</label>
            <input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="ai, seminar, ux"
              className="w-full rounded-lg border px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <button
            type="submit"
            disabled={isLoading}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
          >
            {isLoading ? "등록 중…" : "등록"}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-lg border px-4 py-2 text-sm"
          >
            취소
          </button>
        </div>
      </form>
    </div>
  );
}
