"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  Loader2,
  CheckCircle2,
  DownloadCloud,
  ExternalLink,
} from "lucide-react";
import { seminarsApi, externalActivitiesApi, kudosApi, hackathonSubmissionsApi, activityParticipationsApi, activitiesApi } from "@/lib/bkend";
import { HACKATHON_CONTEXT_ID } from "@/features/hackathon/config";
import {
  buildPortfolioCandidates,
  candidateToExternalPayload,
  type PortfolioCandidate,
} from "@/lib/portfolio-autofill";
import type { ExternalActivity, RecentPaper } from "@/types";

interface Props {
  userId: string;
  recentPapers: RecentPaper[];
  existingExternals: ExternalActivity[];
  /** 적재 성공 시 생성된 external_activities 를 부모에 반영 */
  onAdded: (created: ExternalActivity[]) => void;
}

export default function PortfolioAutofillDialog({
  userId,
  recentPapers,
  existingExternals,
  onAdded,
}: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [candidates, setCandidates] = useState<PortfolioCandidate[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const openDialog = async () => {
    setOpen(true);
    setLoading(true);
    setSelected(new Set());
    try {
      // v12-M2: 세미나·논문에 더해 받은 kudos(멘토링)·해커톤 제출·설계 참여를 병렬 수집
      const [semRes, kudosRes, hackRes, partRes] = await Promise.all([
        seminarsApi.list({ limit: 500 }),
        kudosApi.listReceivedByUser(userId),
        hackathonSubmissionsApi.listByContext(HACKATHON_CONTEXT_ID),
        activityParticipationsApi.listByUser(userId),
      ]);
      // v13-M2: role==="designer" 참여 레코드 → 활동 정보 병렬 조회
      const designerParts = (partRes.data ?? []).filter(
        (p) => p.role === "designer" && !!p.activityId,
      );
      const designParticipations = await Promise.all(
        designerParts.map(async (p) => {
          try {
            const act = await activitiesApi.get(p.activityId as string);
            const design = act?.curriculumDesign as
              | { models?: { name: string }[] }
              | undefined;
            return {
              activityId: p.activityId as string,
              activityTitle: act?.title,
              modelNames: (design?.models ?? []).map((m) => m.name).filter(Boolean),
            };
          } catch {
            return { activityId: p.activityId as string };
          }
        }),
      );
      const built = buildPortfolioCandidates({
        userId,
        seminars: semRes.data,
        recentPapers,
        existingExternals,
        receivedKudos: kudosRes.data,
        hackathonSubmissions: hackRes.data,
        designParticipations,
      });
      setCandidates(built);
      // 미적재 항목은 기본 선택
      setSelected(new Set(built.filter((c) => !c.alreadyAdded).map((c) => c.sourceRef)));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "활동을 불러오지 못했습니다.");
      setCandidates([]);
    } finally {
      setLoading(false);
    }
  };

  const toggle = (ref: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(ref)) next.delete(ref);
      else next.add(ref);
      return next;
    });
  };

  const addable = candidates.filter((c) => !c.alreadyAdded);
  const selectedCount = addable.filter((c) => selected.has(c.sourceRef)).length;

  const addSelected = async () => {
    const picks = addable.filter((c) => selected.has(c.sourceRef));
    if (picks.length === 0) return;
    setBusy(true);
    try {
      const created: ExternalActivity[] = [];
      for (const c of picks) {
        const entity = await externalActivitiesApi.create(
          candidateToExternalPayload(c, userId),
        );
        created.push(entity as unknown as ExternalActivity);
      }
      onAdded(created);
      // 방금 적재분을 목록에서 "추가됨"으로 갱신
      const addedRefs = new Set(picks.map((c) => c.sourceRef));
      setCandidates((prev) =>
        prev.map((c) =>
          addedRefs.has(c.sourceRef) ? { ...c, alreadyAdded: true } : c,
        ),
      );
      setSelected(new Set());
      toast.success(`${created.length}건을 포트폴리오에 적재했습니다. 운영진 검증 후 정식 표기됩니다.`);
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "적재 실패");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={openDialog}
        className="inline-flex items-center gap-1 rounded-lg border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/10"
      >
        <DownloadCloud size={12} /> 내 활동 자동 불러오기
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] overflow-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles size={18} /> 내 활동 자동 불러오기
            </DialogTitle>
          </DialogHeader>

          <p className="text-xs text-muted-foreground">
            세미나 발표·대표 논문·멘토링 기여·해커톤 참가·교수설계 산출을 자동 수집했습니다.
            추가할 항목을 선택하면 대외활동 포트폴리오로 적재되며, 운영진 검증 후 프로필에 정식
            표기됩니다. 교수설계 산출은 마법사를 신규 저장한 시점부터 추적됩니다(과거 저장분
            소급 불가).
          </p>

          {loading ? (
            <p className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
              <Loader2 size={16} className="animate-spin" /> 활동을 수집하는 중…
            </p>
          ) : candidates.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              자동으로 불러올 수 있는 활동이 없습니다.
              <br />
              (세미나 연사·대표 논문 등록·멘토링 기여·해커톤 참가·교수설계 마법사 사용 이력이
              있으면 표시됩니다.)
            </p>
          ) : (
            <ul className="space-y-2">
              {candidates.map((c) => (
                <li
                  key={c.sourceRef}
                  className={`rounded-lg border p-3 ${
                    c.alreadyAdded ? "bg-muted/30" : "bg-card"
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <Checkbox
                      className="mt-0.5"
                      checked={c.alreadyAdded || selected.has(c.sourceRef)}
                      disabled={c.alreadyAdded || busy}
                      onCheckedChange={() => toggle(c.sourceRef)}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge variant="secondary" className="text-[10px]">
                          {c.sourceKindLabel}
                        </Badge>
                        <span className="text-sm font-medium">{c.title}</span>
                        {c.alreadyAdded && (
                          <Badge variant="outline" className="gap-0.5 text-[10px] text-success">
                            <CheckCircle2 size={9} /> 추가됨
                          </Badge>
                        )}
                      </div>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        {[
                          c.role,
                          c.organization,
                          c.date || undefined,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                      {c.url && (
                        <a
                          href={c.url}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-0.5 inline-flex items-center gap-0.5 text-[11px] text-primary hover:underline"
                        >
                          출처 <ExternalLink size={9} />
                        </a>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)} disabled={busy}>
              닫기
            </Button>
            <Button
              size="sm"
              onClick={addSelected}
              disabled={busy || selectedCount === 0}
            >
              {busy ? (
                <Loader2 size={14} className="mr-1 animate-spin" />
              ) : (
                <DownloadCloud size={14} className="mr-1" />
              )}
              선택 {selectedCount}건 적재
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
