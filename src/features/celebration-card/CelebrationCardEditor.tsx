"use client";

import { useEffect, useRef, useState } from "react";
import { Plus, Trash2, Download, Loader2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { CardFit } from "./CardFit";
import { exportCelebrationCardToPng } from "./download";
import { PRESETS, TYPE_LABELS } from "./presets";
import type { CardType, CelebrationCardData } from "./types";

const STORAGE_KEY = "celebration-card-draft";
const MAX_PARAGRAPHS = 5;

const ALL_TYPES: CardType[] = [
  "birth",
  "wedding",
  "graduation",
  "award",
  "admission",
  "birthday",
  "free",
];

function loadDraft(): CelebrationCardData | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CelebrationCardData) : null;
  } catch {
    return null;
  }
}

function saveDraft(data: CelebrationCardData) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // storage full or unavailable — fail silently
  }
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground">
        {label}
      </label>
      {children}
      {hint && (
        <p className="text-[11px] text-muted-foreground/70">{hint}</p>
      )}
    </div>
  );
}

export default function CelebrationCardEditor() {
  const [data, setData] = useState<CelebrationCardData>(
    () => loadDraft() ?? PRESETS.birth,
  );
  const [exporting, setExporting] = useState(false);
  const cardRef = useRef<HTMLDivElement | null>(null);

  // Persist to localStorage on every change
  useEffect(() => {
    saveDraft(data);
  }, [data]);

  function patch(partial: Partial<CelebrationCardData>) {
    setData((prev) => ({ ...prev, ...partial }));
  }

  function applyPreset(type: CardType) {
    const preset = PRESETS[type];
    setData({ ...preset });
    toast.success(`"${TYPE_LABELS[type]}" 프리셋 적용됨`);
  }

  function patchParagraph(idx: number, value: string) {
    const next = [...data.paragraphs];
    next[idx] = value;
    patch({ paragraphs: next });
  }

  function addParagraph() {
    if (data.paragraphs.length >= MAX_PARAGRAPHS) {
      toast.error(`문단은 최대 ${MAX_PARAGRAPHS}개까지 추가할 수 있습니다.`);
      return;
    }
    patch({ paragraphs: [...data.paragraphs, ""] });
  }

  function removeParagraph(idx: number) {
    if (data.paragraphs.length <= 1) return;
    patch({ paragraphs: data.paragraphs.filter((_, i) => i !== idx) });
  }

  async function handleExport() {
    if (!cardRef.current) {
      toast.error("카드 요소를 찾을 수 없습니다.");
      return;
    }
    setExporting(true);
    try {
      const name = data.recipientName.trim() || "축하카드";
      await exportCelebrationCardToPng(
        cardRef.current,
        `연세교육공학_${TYPE_LABELS[data.type]}_${name}.png`,
      );
      toast.success("PNG 저장 완료");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "알 수 없는 오류";
      toast.error(`내보내기 실패: ${msg}`);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-4 pb-16">
      {/* ── Type preset selector ────────────────────────────── */}
      <Card>
        <CardContent className="p-4">
          <p className="mb-2.5 text-xs font-medium text-muted-foreground">
            유형 선택 — 선택하면 전체 프리셋이 적용됩니다
          </p>
          <div className="flex flex-wrap gap-1.5">
            {ALL_TYPES.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => applyPreset(t)}
                className={[
                  "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                  data.type === t
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-background text-muted-foreground hover:border-primary/50 hover:text-foreground",
                ].join(" ")}
              >
                {TYPE_LABELS[t]}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── Two-column layout: form | preview ──────────────── */}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,380px)]">
        {/* ── Left: Form ──────────────────────────────────── */}
        <div className="space-y-4">
          {/* Headline */}
          <Card>
            <CardContent className="space-y-3 p-4">
              <Field
                label="헤드라인"
                hint="줄바꿈은 \n 또는 Enter로 — 2줄 권장"
              >
                <Textarea
                  value={data.headline}
                  onChange={(e) => patch({ headline: e.target.value })}
                  rows={3}
                  placeholder="새 생명의 탄생을\n온 마음으로 축하합니다"
                />
              </Field>
            </CardContent>
          </Card>

          {/* Recipient */}
          <Card>
            <CardContent className="space-y-3 p-4">
              <p className="text-xs font-semibold text-foreground">
                수신자
              </p>
              <Field label="접두 문구">
                <Input
                  value={data.recipientPrefix}
                  onChange={(e) => patch({ recipientPrefix: e.target.value })}
                  placeholder="연세교육공학의 소중한"
                />
              </Field>
              <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                <Field label="이름 (크게 표시됨)">
                  <Input
                    value={data.recipientName}
                    onChange={(e) =>
                      patch({ recipientName: e.target.value })
                    }
                    placeholder="홍길동"
                    className="text-base font-semibold"
                  />
                </Field>
                <Field label="호칭">
                  <Input
                    value={data.recipientHonorific}
                    onChange={(e) =>
                      patch({ recipientHonorific: e.target.value })
                    }
                    placeholder="선생님"
                    className="w-24"
                  />
                </Field>
              </div>
            </CardContent>
          </Card>

          {/* Body paragraphs */}
          <Card>
            <CardContent className="space-y-3 p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-foreground">
                  본문 문단{" "}
                  <span className="font-normal text-muted-foreground">
                    ({data.paragraphs.length} / {MAX_PARAGRAPHS})
                  </span>
                </p>
                <p className="text-[11px] text-muted-foreground">
                  <code className="rounded bg-muted px-1 py-0.5">**굵게**</code>{" "}
                  마크다운 지원
                </p>
              </div>
              <div className="space-y-2.5">
                {data.paragraphs.map((para, i) => (
                  <div key={i} className="flex gap-2">
                    <Textarea
                      value={para}
                      onChange={(e) => patchParagraph(i, e.target.value)}
                      rows={3}
                      placeholder={`문단 ${i + 1}`}
                      className="flex-1 text-sm"
                    />
                    <button
                      type="button"
                      aria-label={`문단 ${i + 1} 삭제`}
                      onClick={() => removeParagraph(i)}
                      disabled={data.paragraphs.length <= 1}
                      className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border text-muted-foreground transition hover:border-destructive/50 hover:text-destructive disabled:pointer-events-none disabled:opacity-30"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full text-xs"
                onClick={addParagraph}
                disabled={data.paragraphs.length >= MAX_PARAGRAPHS}
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                문단 추가
              </Button>
              {data.paragraphs.length >= 4 && (
                <p className="text-[11px] text-warning">
                  문단이 4개 이상이면 본문이 카드 밖으로 넘칠 수 있습니다.
                  각 문단을 간결하게 작성해 주세요.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Closing */}
          <Card>
            <CardContent className="space-y-3 p-4">
              <p className="text-xs font-semibold text-foreground">
                맺음말
              </p>
              <Field label="맺음 인사">
                <Input
                  value={data.closing}
                  onChange={(e) => patch({ closing: e.target.value })}
                  placeholder="진심으로 축하드립니다."
                />
              </Field>
              <Field label='보내는 곳 ("연세교육공학 드림" 권장)'>
                <Input
                  value={data.senderSuffix}
                  onChange={(e) => patch({ senderSuffix: e.target.value })}
                  placeholder="연세교육공학 드림"
                />
              </Field>
            </CardContent>
          </Card>

          {/* Photo */}
          <Card>
            <CardContent className="space-y-3 p-4">
              <p className="text-xs font-semibold text-foreground">
                하단 사진 (선택)
              </p>
              <div className="flex items-center gap-2">
                <input
                  id="use-placeholder"
                  type="checkbox"
                  checked={data.usePhotoPlaceholder}
                  onChange={(e) =>
                    patch({ usePhotoPlaceholder: e.target.checked })
                  }
                  className="h-4 w-4 rounded border-border accent-primary"
                />
                <label
                  htmlFor="use-placeholder"
                  className="text-sm text-foreground"
                >
                  네이비 그라데이션 배경 사용 (사진 없음)
                </label>
              </div>
              {!data.usePhotoPlaceholder && (
                <Field
                  label="사진 URL"
                  hint="같은 도메인 이미지만 CORS 없이 안전하게 내보낼 수 있습니다. 예: /yonsei-campus.jpg"
                >
                  <Input
                    value={data.photoUrl}
                    onChange={(e) => patch({ photoUrl: e.target.value })}
                    placeholder="/yonsei-campus.jpg"
                  />
                </Field>
              )}
              {!data.usePhotoPlaceholder && (
                <div className="flex gap-1.5">
                  <span className="self-center text-[11px] text-muted-foreground">
                    프리셋:
                  </span>
                  <button
                    type="button"
                    onClick={() => patch({ photoUrl: "/yonsei-campus.jpg" })}
                    className="rounded border bg-muted px-2 py-1 text-[11px] text-muted-foreground transition hover:bg-primary/5 hover:text-foreground"
                  >
                    연세 캠퍼스
                  </button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={handleExport}
              disabled={exporting}
              className="flex-1 sm:flex-none"
            >
              {exporting ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-1.5 h-4 w-4" />
              )}
              PNG 다운로드
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                applyPreset(data.type);
              }}
              title="현재 유형의 프리셋으로 초기화"
            >
              <RotateCcw className="mr-1.5 h-4 w-4" />
              프리셋 초기화
            </Button>
          </div>
        </div>

        {/* ── Right: Live preview ─────────────────────────────── */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">
            실시간 미리보기 — 1:1.9 세로형
          </p>
          {/* Card preview is always light regardless of site dark mode */}
          <div className="overflow-hidden rounded-2xl border bg-muted/30 p-3 shadow-sm">
            <CardFit data={data} refCb={(el) => { cardRef.current = el; }} />
          </div>
          <p className="text-[11px] text-muted-foreground">
            내보내기 해상도: 1080 × 2052 px (2×)
          </p>
        </div>
      </div>
    </div>
  );
}
