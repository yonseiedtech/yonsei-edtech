"use client";

import { useState, useEffect } from "react";
import { useSeminars } from "@/features/seminar/useSeminar";
import { useUpdateSeminar } from "@/features/seminar/useSeminar";
import { useAuthStore } from "@/features/auth/auth-store";
import { useSeminarAdminContext } from "./seminar-admin-store";
import { auth } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Loader2, Download, Image as ImageIcon, Save } from "lucide-react";
import { toast } from "sonner";
import type { Seminar } from "@/types";

const SIZES = [
  { value: "instagram", label: "인스타그램 세로 (1080x1350)" },
  { value: "square", label: "정사각형 (1080x1080)" },
  { value: "a4", label: "A4 (2480x3508)" },
];

export default function PosterGenerator({ seminarId: propSeminarId }: { seminarId?: string } = {}) {
  const { seminars } = useSeminars();
  const { updateSeminar } = useUpdateSeminar();
  const activeSeminarId = useSeminarAdminContext((s) => s.activeSeminarId);
  const setActiveSeminarId = useSeminarAdminContext((s) => s.setActiveSeminarId);
  const selectedId = propSeminarId ?? activeSeminarId ?? "";
  const setSelectedId = (id: string) => setActiveSeminarId(id || null);
  useEffect(() => {
    if (propSeminarId && propSeminarId !== activeSeminarId) {
      setActiveSeminarId(propSeminarId);
    }
  }, [propSeminarId, activeSeminarId, setActiveSeminarId]);
  const [size, setSize] = useState("instagram");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);

  const selectedSeminar = seminars.find((s) => s.id === selectedId);

  async function handleGenerate() {
    if (!selectedSeminar) {
      toast.error("세미나를 선택해주세요.");
      return;
    }

    setGenerating(true);
    setImageUrl(null);

    try {
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error("로그인이 필요합니다.");
      const token = await currentUser.getIdToken(true);

      const res = await fetch("/api/ai/poster", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ seminar: selectedSeminar, size }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || `API 오류 (${res.status})`);
      }

      const data = await res.json();
      setImageUrl(data.imageUrl);
      toast.success("포스터가 생성되었습니다.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "포스터 생성 실패");
    } finally {
      setGenerating(false);
    }
  }

  function handleDownload() {
    if (!imageUrl || !selectedSeminar) return;
    const a = document.createElement("a");
    a.href = imageUrl;
    const ext = imageUrl.includes("image/png") ? "png" : "jpg";
    a.download = `poster_${selectedSeminar.title.replace(/[^가-힣a-zA-Z0-9]/g, "_")}.${ext}`;
    a.click();
    toast.success("다운로드되었습니다.");
  }

  async function handleSaveToPoster() {
    if (!imageUrl || !selectedSeminar) return;
    setSaving(true);
    try {
      await updateSeminar({
        id: selectedSeminar.id,
        data: { posterUrl: imageUrl },
      });
      toast.success("포스터가 세미나에 저장되었습니다.");
    } catch {
      toast.error("저장 실패");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold">AI 포스터 생성</h2>
        <p className="mb-6 text-sm text-muted-foreground">
          세미나 정보를 기반으로 AI가 포스터를 자동 생성합니다.
        </p>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* 세미나 선택 */}
          <div>
            <label className="mb-1.5 block text-sm font-medium">세미나 선택</label>
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="w-full rounded-md border px-3 py-2 text-sm"
            >
              <option value="">세미나를 선택하세요</option>
              {seminars.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title}
                </option>
              ))}
            </select>
          </div>

          {/* 규격 선택 */}
          <div>
            <label className="mb-1.5 block text-sm font-medium">포스터 규격</label>
            <select
              value={size}
              onChange={(e) => setSize(e.target.value)}
              className="w-full rounded-md border px-3 py-2 text-sm"
            >
              {SIZES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 선택된 세미나 정보 */}
        {selectedSeminar && (
          <div className="mt-4 rounded-lg bg-muted/30 p-3 text-sm">
            <p className="font-medium">{selectedSeminar.title}</p>
            <p className="mt-1 text-muted-foreground">
              {selectedSeminar.date} {selectedSeminar.time} · {selectedSeminar.location} · {selectedSeminar.speaker}
            </p>
          </div>
        )}

        <Button
          className="mt-4"
          onClick={handleGenerate}
          disabled={generating || !selectedId}
        >
          {generating ? (
            <>
              <Loader2 size={16} className="mr-1 animate-spin" />
              생성 중...
            </>
          ) : (
            <>
              <ImageIcon size={16} className="mr-1" />
              포스터 생성
            </>
          )}
        </Button>
      </div>

      {/* 미리보기 */}
      {imageUrl && (
        <div className="rounded-xl border bg-white p-6">
          <h3 className="mb-4 text-lg font-semibold">생성된 포스터</h3>
          <div className="flex justify-center rounded-lg bg-muted/30 p-4">
            <img
              src={imageUrl}
              alt="생성된 포스터"
              className="max-h-[600px] rounded-lg shadow-lg"
            />
          </div>
          <div className="mt-4 flex gap-2">
            <Button variant="outline" onClick={handleDownload}>
              <Download size={16} className="mr-1" />
              다운로드
            </Button>
            <Button onClick={handleSaveToPoster} disabled={saving}>
              {saving ? (
                <Loader2 size={16} className="mr-1 animate-spin" />
              ) : (
                <Save size={16} className="mr-1" />
              )}
              세미나에 저장
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
