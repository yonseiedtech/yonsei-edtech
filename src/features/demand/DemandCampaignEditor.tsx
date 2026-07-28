"use client";

/**
 * 수요조사 캠페인 편집기 (2026-07-28) — 콘솔 /console/demand 전용 (staff+, 콘솔 레이아웃 게이트).
 * 현재 학기(useEffectiveSemesterKey) 캠페인을 로드/저장한다.
 *  - 제목·설명·기간(시작/종료)·사전 스터디 주제 선택지(라벨+분야)·상태(초안/진행/마감)
 *  - 회원 화면(DemandSurveySection)에 배너·주제 칩·D-day·기간 마감으로 반영된다.
 */

import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Megaphone, Plus, Trash2, Loader2, Save, Info, History, ClipboardCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useEffectiveSemesterKey } from "@/features/site-settings/useCurrentSemester";
import { semesterLabelFromKey, shiftSemesterKey } from "@/lib/semester";
import { useAuthStore } from "@/features/auth/auth-store";
import { commBoardsApi, commQuestionsApi, commLikesApi } from "@/lib/bkend";
import { appendStatusHistory } from "./demand-status";
import {
  useDemandCampaigns,
  useUpdateDemandCampaigns,
  upsertCampaign,
  pickActiveOrLatest,
  makeCampaignTopic,
  makeCampaignId,
  DOMAIN_OPTIONS,
  type DemandCampaign,
  type DemandCampaignTopic,
  type CampaignStatus,
} from "./useDemandCampaign";
import type { CommBoard, CommQuestion } from "@/types";

/** 참여할래요 반응 targetType (DemandSurveySection 과 동일 값) */
const DEMAND_JOIN = "demand-join";
/** 개설 정족수 — 참여할래요 이 수 이상이면 검토 대기 전환 대상 */
const JOIN_THRESHOLD = 3;

const STATUS_META: Record<CampaignStatus, { label: string; hint: string }> = {
  draft: { label: "초안", hint: "회원 화면에 노출되지 않습니다." },
  active: { label: "진행", hint: "회원 화면에 배너·주제·남은 기간이 노출됩니다." },
  closed: { label: "마감", hint: "회원 등록 폼이 비활성화됩니다." },
};

function newTopic(): DemandCampaignTopic {
  return makeCampaignTopic();
}

export default function DemandCampaignEditor() {
  const semesterKey = useEffectiveSemesterKey();
  const semesterLabel = semesterLabelFromKey(semesterKey);
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const { campaigns, recordId, isLoading, today } = useDemandCampaigns(semesterKey);
  const saveMutation = useUpdateDemandCampaigns();

  // L5. 지난 학기 캠페인 (템플릿 복제 소스) — 직전 학기 키로 로드(활성/최신 1건).
  const prevKey = useMemo(() => shiftSemesterKey(semesterKey, -1), [semesterKey]);
  const { campaigns: prevCampaigns, isLoading: prevLoading, today: prevToday } =
    useDemandCampaigns(prevKey ?? "");
  const prevCampaign = useMemo(
    () => pickActiveOrLatest(prevCampaigns, prevToday),
    [prevCampaigns, prevToday],
  );

  // ── 편집 대상 선택 (복수 라운드) ──────────────────────────────────────────
  // selectedId 가 배열에 없으면(미저장 신규) pendingNew 로 편집한다.
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pendingNew, setPendingNew] = useState<DemandCampaign | null>(null);
  const activeOrLatest = useMemo(() => pickActiveOrLatest(campaigns, today), [campaigns, today]);
  const selected = useMemo<DemandCampaign | null>(() => {
    if (pendingNew && selectedId === pendingNew.id) return pendingNew;
    return campaigns.find((c) => c.id === selectedId) ?? activeOrLatest;
  }, [campaigns, selectedId, activeOrLatest, pendingNew]);

  // 라운드 목록(round 오름차순 + 미저장 신규 말미)
  const roundList = useMemo(() => {
    const list = [...campaigns].sort((a, b) => (a.round ?? 0) - (b.round ?? 0));
    if (pendingNew) list.push(pendingNew);
    return list;
  }, [campaigns, pendingNew]);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [status, setStatus] = useState<CampaignStatus>("draft");
  const [topics, setTopics] = useState<DemandCampaignTopic[]>([]);

  // 선택 캠페인으로 폼 동기화 — 렌더 중 안전 리셋(React "이전 값 저장" 패턴).
  // 학기 전환·라운드 선택·저장 후 재조회로 identity(키)가 바뀌면 서버 값으로 폼을 재설정한다.
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const identity = isLoading
    ? null
    : `${semesterKey}::${recordId ?? "new"}::${selected?.id ?? "empty"}::${selected?.updatedAt ?? ""}`;
  if (identity !== null && identity !== loadedKey) {
    setLoadedKey(identity);
    setTitle(selected?.title ?? "");
    setDescription(selected?.description ?? "");
    setStartDate(selected?.startDate ?? "");
    setEndDate(selected?.endDate ?? "");
    setStatus(selected?.status ?? "draft");
    setTopics(selected?.topics ?? []);
  }

  function selectRound(id: string) {
    setSelectedId(id);
    if (pendingNew && pendingNew.id !== id) setPendingNew(null);
  }

  function handleAddRound() {
    const maxRound = campaigns.reduce((m, c) => Math.max(m, c.round ?? 1), 0);
    const fresh: DemandCampaign = {
      id: makeCampaignId(),
      round: maxRound + 1,
      semester: semesterKey,
      title: "",
      topics: [],
      startDate: "",
      endDate: "",
      status: "draft",
    };
    setPendingNew(fresh);
    setSelectedId(fresh.id);
  }

  function handleRemoveRound() {
    if (!selected) return;
    // 미저장 신규(pendingNew) 는 배열에서 그냥 폐기.
    if (pendingNew && selected.id === pendingNew.id) {
      setPendingNew(null);
      setSelectedId(null);
      return;
    }
    if (!window.confirm(`${selected.round ?? 1}차 캠페인을 삭제합니다. 계속할까요?`)) return;
    const nextCampaigns = campaigns.filter((c) => c.id !== selected.id);
    saveMutation.mutate(
      { recordId, campaigns: nextCampaigns, semesterKey },
      {
        onSuccess: () => {
          toast.success("라운드를 삭제했습니다.");
          setSelectedId(null);
        },
        onError: (e) => toast.error(`삭제 실패: ${e instanceof Error ? e.message : "오류"}`),
      },
    );
  }

  function updateTopic(id: string, patch: Partial<DemandCampaignTopic>) {
    setTopics((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }
  function removeTopic(id: string) {
    setTopics((prev) => prev.filter((t) => t.id !== id));
  }

  // L5. 지난 학기 캠페인 불러오기 — 주제 복제 + 제목/설명 프리필. 기간은 비워 재설정 유도.
  function handleLoadPrev() {
    if (!prevCampaign) {
      toast.error("불러올 지난 학기 캠페인이 없습니다.");
      return;
    }
    const hasContent = !!(title.trim() || description.trim() || topics.length > 0);
    if (
      hasContent &&
      !window.confirm(
        "현재 편집 중인 내용을 지난 학기 캠페인 내용으로 덮어씁니다. 계속할까요?\n(기간은 비워지므로 다시 설정해주세요.)",
      )
    ) {
      return;
    }
    setTitle(prevCampaign.title ?? "");
    setDescription(prevCampaign.description ?? "");
    setTopics(prevCampaign.topics.map((t) => makeCampaignTopic(t.label, t.domain ?? "")));
    setStartDate("");
    setEndDate("");
    setStatus("draft");
    toast.success(
      `지난 학기 캠페인을 불러왔습니다. 주제 ${prevCampaign.topics.length}건 복제 · 기간을 다시 설정하세요.`,
    );
  }

  // L6. 정족수 달성 수요 일괄 검토전환 — 현재 학기 보드의 수집중 & 정족수 달성 수요를 reviewing 으로.
  const bulkConvertMutation = useMutation({
    mutationFn: async (targets: CommQuestion[]) => {
      for (const q of targets) {
        await commQuestionsApi.update(q.id, {
          demandPref: {
            ...q.demandPref,
            status: "reviewing",
            statusHistory: appendStatusHistory(q.demandPref, "reviewing", user?.id),
          },
        });
      }
      return targets.length;
    },
    onSuccess: (n) => {
      void qc.invalidateQueries({ queryKey: ["demand-questions"] });
      void qc.invalidateQueries({ queryKey: ["demand-joins"] });
      toast.success(`정족수 달성 ${n}건을 검토 대기로 전환했습니다.`);
    },
    onError: (e) => toast.error(`전환 실패: ${e instanceof Error ? e.message : "오류"}`),
  });

  const [scanning, setScanning] = useState(false);

  /** 현재 학기 보드에서 정족수(참여 ≥ N) 달성 & 수집중 수요를 조회. */
  async function scanQuorumTargets(): Promise<CommQuestion[]> {
    const contextId = `demand-${semesterKey}`;
    const res = await commBoardsApi.listByContext("demand", contextId);
    const board = (res.data as CommBoard[])[0];
    if (!board) return [];
    const [questions, joinCounts] = await Promise.all([
      commQuestionsApi.listByBoard(board.id).then((r) => r.data as CommQuestion[]),
      commLikesApi.countsByType(DEMAND_JOIN),
    ]);
    return questions.filter((q) => {
      const st = q.demandPref?.status ?? "collecting";
      return st === "collecting" && (joinCounts[q.id] ?? 0) >= JOIN_THRESHOLD;
    });
  }

  /** 일괄 전환 실행 — closing=true 이면 마감 저장 직후 자동 호출. */
  async function runBulkConvert(closing: boolean) {
    if (scanning || bulkConvertMutation.isPending) return;
    setScanning(true);
    try {
      const targets = await scanQuorumTargets();
      if (targets.length === 0) {
        if (!closing) toast.info("정족수(참여 3명 이상) 달성 수집중 수요가 없습니다.");
        return;
      }
      const prompt = closing
        ? `마감하면 회원 등록이 중단됩니다.\n정족수 달성 ${targets.length}건을 개설 검토 대기로 전환합니다. 계속할까요?`
        : `정족수 달성 ${targets.length}건을 개설 검토 대기(reviewing)로 전환합니다. 계속할까요?`;
      if (!window.confirm(prompt)) return;
      bulkConvertMutation.mutate(targets);
    } catch (e) {
      toast.error(`조회 실패: ${e instanceof Error ? e.message : "오류"}`);
    } finally {
      setScanning(false);
    }
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
    // 선택 캠페인의 id·round 승계(신규는 새 id·round=1). 배열에 upsert 후 전체 저장.
    const id = selected?.id ?? makeCampaignId();
    const round = selected?.round ?? 1;
    const prevStatus = selected?.status;
    const payload: DemandCampaign = {
      id,
      round,
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
    const nextCampaigns = upsertCampaign(campaigns, payload);
    // 마감으로 전환(직전 저장이 마감이 아니었던 경우)이면 저장 성공 후 일괄 전환 흐름 실행.
    const closing = status === "closed" && prevStatus !== "closed";
    saveMutation.mutate(
      { recordId, campaigns: nextCampaigns, semesterKey },
      {
        onSuccess: () => {
          toast.success("캠페인을 저장했습니다.");
          setPendingNew(null);
          setSelectedId(id);
          if (closing) void runBulkConvert(true);
        },
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
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="ml-auto"
            onClick={handleLoadPrev}
            disabled={prevLoading || !prevCampaign}
            title={
              prevCampaign
                ? `${semesterLabelFromKey(prevKey)} 캠페인 주제·제목을 복제합니다.`
                : "불러올 지난 학기 캠페인이 없습니다."
            }
          >
            {prevLoading ? (
              <Loader2 size={13} className="mr-1 animate-spin" />
            ) : (
              <History size={13} className="mr-1" />
            )}
            지난 학기 캠페인 불러오기
          </Button>
        </div>

        {/* ── 라운드(캠페인) 목록 — 복수 캠페인 선택·추가·삭제 ── */}
        <div className="mb-4 flex flex-wrap items-center gap-1.5 border-b pb-3">
          {roundList.map((c) => {
            const isSel = selected?.id === c.id;
            const isPending = pendingNew?.id === c.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => selectRound(c.id)}
                aria-pressed={isSel}
                className={cn(
                  "flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors",
                  isSel
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:bg-accent",
                )}
              >
                <span className="font-medium">{c.round ?? 1}차</span>
                <span className="text-[10px] opacity-70">
                  {isPending ? "미저장" : STATUS_META[c.status].label}
                </span>
              </button>
            );
          })}
          <Button type="button" size="sm" variant="outline" onClick={handleAddRound}>
            <Plus size={13} className="mr-1" /> 라운드 추가
          </Button>
          {selected && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={handleRemoveRound}
              disabled={saveMutation.isPending}
              className="text-muted-foreground hover:text-destructive"
            >
              <Trash2 size={13} className="mr-1" /> 라운드 삭제
            </Button>
          )}
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

          {/* L6. 정족수 달성 수요 일괄 검토전환 */}
          <div className="space-y-2 rounded-xl border border-dashed p-3">
            <p className="flex items-center gap-1.5 text-xs font-medium text-foreground">
              <ClipboardCheck size={13} className="text-primary" /> 정족수 달성 수요 일괄 전환
            </p>
            <p className="text-[11px] text-muted-foreground">
              현재 학기 보드에서 &quot;참여할래요&quot; {JOIN_THRESHOLD}명 이상이면서 아직 수집중인
              수요를 개설 검토 대기로 한 번에 전환합니다. 캠페인을 마감(저장)하면 자동으로 실행됩니다.
            </p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => runBulkConvert(false)}
              disabled={scanning || bulkConvertMutation.isPending}
            >
              {scanning || bulkConvertMutation.isPending ? (
                <Loader2 size={13} className="mr-1 animate-spin" />
              ) : (
                <ClipboardCheck size={13} className="mr-1" />
              )}
              정족수 달성 수요 검토전환
            </Button>
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
