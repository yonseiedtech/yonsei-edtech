"use client";

/**
 * 수요조사 캠페인 편집기 (2026-07-28) — 콘솔 /console/demand 전용 (staff+, 콘솔 레이아웃 게이트).
 * 현재 학기(useEffectiveSemesterKey) 캠페인을 로드/저장한다.
 *  - 제목·설명·기간(시작/종료)·사전 스터디 주제 선택지(라벨+분야)·상태(초안/진행/마감)
 *  - 회원 화면(DemandSurveySection)에 배너·주제 칩·D-day·기간 마감으로 반영된다.
 */

import { useState } from "react";
import { toast } from "sonner";
import { Megaphone, Plus, Trash2, Loader2, Save, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useEffectiveSemesterKey } from "@/features/site-settings/useCurrentSemester";
import { semesterLabelFromKey } from "@/lib/semester";
import { useAuthStore } from "@/features/auth/auth-store";
import {
  useDemandCampaign,
  useUpdateDemandCampaign,
  DOMAIN_OPTIONS,
  type DemandCampaign,
  type DemandCampaignTopic,
  type CampaignStatus,
} from "./useDemandCampaign";

const STATUS_META: Record<CampaignStatus, { label: string; hint: string }> = {
  draft: { label: "초안", hint: "회원 화면에 노출되지 않습니다." },
  active: { label: "진행", hint: "회원 화면에 배너·주제·남은 기간이 노출됩니다." },
  closed: { label: "마감", hint: "회원 등록 폼이 비활성화됩니다." },
};

function newTopic(): DemandCampaignTopic {
  const id =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `t-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return { id, label: "", domain: "" };
}

export default function DemandCampaignEditor() {
  const semesterKey = useEffectiveSemesterKey();
  const semesterLabel = semesterLabelFromKey(semesterKey);
  const { user } = useAuthStore();
  const { campaign, recordId, isLoading } = useDemandCampaign(semesterKey);
  const saveMutation = useUpdateDemandCampaign();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [status, setStatus] = useState<CampaignStatus>("draft");
  const [topics, setTopics] = useState<DemandCampaignTopic[]>([]);

  // 로드된 캠페인으로 폼 동기화 — 렌더 중 안전 리셋(React "이전 값 저장" 패턴).
  // 학기 전환·저장 후 재조회로 identity(키)가 바뀌면 서버 값으로 폼을 재설정한다.
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const identity = isLoading ? null : `${semesterKey}::${recordId ?? "new"}::${campaign?.updatedAt ?? ""}`;
  if (identity !== null && identity !== loadedKey) {
    setLoadedKey(identity);
    setTitle(campaign?.title ?? "");
    setDescription(campaign?.description ?? "");
    setStartDate(campaign?.startDate ?? "");
    setEndDate(campaign?.endDate ?? "");
    setStatus(campaign?.status ?? "draft");
    setTopics(campaign?.topics ?? []);
  }

  function updateTopic(id: string, patch: Partial<DemandCampaignTopic>) {
    setTopics((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }
  function removeTopic(id: string) {
    setTopics((prev) => prev.filter((t) => t.id !== id));
  }

  function handleSave() {
    if (!title.trim()) {
      toast.error("캠페인 제목을 입력하세요.");
      return;
    }
    if (startDate && endDate && endDate < startDate) {
      toast.error("종료일이 시작일보다 빠릅니다.");
      return;
    }
    const cleanTopics = topics
      .map((t) => ({ ...t, label: t.label.trim(), domain: t.domain?.trim() || undefined }))
      .filter((t) => t.label.length > 0);
    const payload: DemandCampaign = {
      semester: semesterKey,
      title: title.trim(),
      description: description.trim() || undefined,
      topics: cleanTopics,
      startDate,
      endDate,
      status,
      updatedBy: user?.name ?? user?.id ?? "",
      updatedAt: new Date().toISOString(),
    };
    saveMutation.mutate(
      { recordId, campaign: payload, semesterKey },
      {
        onSuccess: () => toast.success("캠페인을 저장했습니다."),
        onError: (e) =>
          toast.error(`저장 실패: ${e instanceof Error ? e.message : "오류"}`),
      },
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="animate-spin text-muted-foreground" size={22} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border bg-card p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Megaphone size={16} className="text-primary" />
          <h3 className="text-sm font-semibold text-foreground">수요조사 캠페인</h3>
          <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
            {semesterLabel}
          </span>
        </div>

        <div className="space-y-4">
          {/* 제목 */}
          <div className="space-y-1.5">
            <Label className="text-xs" htmlFor="campaign-title">
              제목 <span className="text-destructive">*</span>
            </Label>
            <Input
              id="campaign-title"
              value={title}
              onChange={(e) => setTitle(e.target.value.slice(0, 80))}
              placeholder="예: 2026-2학기 스터디 수요조사"
              maxLength={80}
            />
          </div>

          {/* 설명 */}
          <div className="space-y-1.5">
            <Label className="text-xs" htmlFor="campaign-desc">
              설명 <span className="text-muted-foreground/60">(선택)</span>
            </Label>
            <Textarea
              id="campaign-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, 300))}
              rows={2}
              placeholder="회원에게 안내할 문구 (예: 관심 주제에 참여 의사를 남겨주세요)"
            />
          </div>

          {/* 기간 */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs" htmlFor="campaign-start">
                시작일
              </Label>
              <Input
                id="campaign-start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs" htmlFor="campaign-end">
                종료일
              </Label>
              <Input
                id="campaign-end"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          {/* 상태 */}
          <div className="space-y-1.5">
            <Label className="text-xs">상태</Label>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(STATUS_META) as CampaignStatus[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatus(s)}
                  aria-pressed={status === s}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs transition-colors",
                    status === s
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:bg-accent",
                  )}
                >
                  {STATUS_META[s].label}
                </button>
              ))}
            </div>
            <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <Info size={11} /> {STATUS_META[status].hint}
            </p>
          </div>

          {/* 사전 주제 선택지 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">
                사전 스터디 주제 <span className="text-muted-foreground/60">(선택 — 회원 등록 폼에 칩으로 제시)</span>
              </Label>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setTopics((prev) => [...prev, newTopic()])}
              >
                <Plus size={13} className="mr-1" /> 주제 추가
              </Button>
            </div>
            {topics.length === 0 ? (
              <p className="rounded-lg border border-dashed px-3 py-4 text-center text-xs text-muted-foreground">
                등록된 주제가 없습니다. 회원은 자유 입력으로 수요를 등록합니다.
              </p>
            ) : (
              <ul className="space-y-2">
                {topics.map((t) => (
                  <li key={t.id} className="flex items-center gap-2">
                    <Input
                      value={t.label}
                      onChange={(e) => updateTopic(t.id, { label: e.target.value.slice(0, 60) })}
                      placeholder="주제 라벨 (예: 논문 읽기 방법론)"
                      maxLength={60}
                      className="flex-1"
                    />
                    <select
                      value={t.domain ?? ""}
                      onChange={(e) => updateTopic(t.id, { domain: e.target.value })}
                      className="h-9 shrink-0 rounded-md border border-input bg-background px-2 text-xs text-foreground"
                      aria-label="분야"
                    >
                      <option value="">분야</option>
                      {DOMAIN_OPTIONS.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => removeTopic(t.id)}
                      aria-label="주제 삭제"
                      className="shrink-0 rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-destructive"
                    >
                      <Trash2 size={14} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex justify-end border-t pt-3">
            <Button onClick={handleSave} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? (
                <Loader2 size={14} className="mr-1 animate-spin" />
              ) : (
                <Save size={14} className="mr-1" />
              )}
              캠페인 저장
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
