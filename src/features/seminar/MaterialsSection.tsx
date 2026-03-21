"use client";

import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { materialsApi } from "@/lib/bkend";
import { useAuthStore } from "@/features/auth/auth-store";
import { isAtLeast } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, Download, Trash2, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { Seminar, SeminarMaterial } from "@/types";

interface Props {
  seminar: Seminar;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("파일 읽기 실패"));
    reader.readAsDataURL(file);
  });
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

export default function MaterialsSection({ seminar }: Props) {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [uploading, setUploading] = useState(false);

  const isStaff = isAtLeast(user, "staff");
  const isSpeaker = user?.name && seminar.speaker.includes(user.name);
  const canUpload = isStaff || isSpeaker;

  const { data: materials = [] } = useQuery({
    queryKey: ["materials", seminar.id],
    queryFn: async () => {
      const res = await materialsApi.list(seminar.id);
      return res.data as unknown as SeminarMaterial[];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => materialsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["materials", seminar.id] });
      toast.success("자료가 삭제되었습니다.");
    },
  });

  async function handleUpload() {
    const file = fileRef.current?.files?.[0];
    if (!file) {
      toast.error("파일을 선택해주세요.");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.error("파일 크기가 5MB를 초과합니다.");
      return;
    }
    if (!user) return;

    setUploading(true);
    try {
      const fileUrl = await fileToBase64(file);
      await materialsApi.create({
        seminarId: seminar.id,
        title: title || file.name,
        fileName: file.name,
        fileUrl,
        fileSize: file.size,
        uploadedBy: user.id,
        uploadedByName: user.name,
      });
      queryClient.invalidateQueries({ queryKey: ["materials", seminar.id] });
      toast.success("자료가 업로드되었습니다.");
      setTitle("");
      if (fileRef.current) fileRef.current.value = "";
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "업로드 실패");
    } finally {
      setUploading(false);
    }
  }

  function handleDownload(material: SeminarMaterial) {
    const a = document.createElement("a");
    a.href = material.fileUrl;
    a.download = material.fileName;
    a.click();
  }

  return (
    <div className="space-y-6">
      {/* 업로드 폼 */}
      {canUpload && (
        <div className="rounded-lg border bg-muted/30 p-4">
          <h3 className="mb-3 text-sm font-medium">자료 업로드</h3>
          <div className="space-y-3">
            <Input
              placeholder="자료 제목 (선택)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <input
              ref={fileRef}
              type="file"
              className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-primary/10 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-primary hover:file:bg-primary/20"
            />
            <p className="text-xs text-muted-foreground">최대 5MB</p>
            <Button onClick={handleUpload} disabled={uploading} size="sm">
              {uploading ? (
                <Loader2 size={14} className="mr-1 animate-spin" />
              ) : (
                <Upload size={14} className="mr-1" />
              )}
              업로드
            </Button>
          </div>
        </div>
      )}

      {/* 자료 목록 */}
      {materials.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          등록된 자료가 없습니다.
        </p>
      ) : (
        <div className="space-y-2">
          {materials.map((m) => (
            <div
              key={m.id}
              className="flex items-center justify-between rounded-lg border bg-white px-4 py-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <FileText size={20} className="shrink-0 text-primary" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{m.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {m.uploadedByName} · {formatFileSize(m.fileSize)} ·{" "}
                    {new Date(m.createdAt).toLocaleDateString("ko-KR")}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownload(m)}
                >
                  <Download size={14} />
                </Button>
                {(isStaff || m.uploadedBy === user?.id) && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive"
                    onClick={() => deleteMutation.mutate(m.id)}
                  >
                    <Trash2 size={14} />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
