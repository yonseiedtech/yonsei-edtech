"use client";

import { useState } from "react";
import { Target, Plus, Check, Trash2, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import EmptyState from "@/components/ui/empty-state";
import {
  useMilestones,
  useCreateMilestone,
  useCompleteMilestone,
  useUpdateMilestone,
  useDeleteMilestone,
} from "../api/useCollabPhase2";
import type {
  CollabResearchMilestone,
  MilestoneStatus,
  MilestoneType,
} from "@/types";

interface Props {
  researchId: string;
  currentUserId: string;
  isLeader: boolean;
  isMember: boolean;
}

const TYPE_LABELS: Record<MilestoneType, string> = {
  irb: "IRB 심의",
  data_collection: "자료 수집",
  analysis: "분석",
  draft: "초고",
  review: "검수",
  submission: "제출",
  other: "기타",
};

const STATUS_LABELS: Record<MilestoneStatus, string> = {
  planned: "계획",
  in_progress: "진행 중",
  done: "완료",
  overdue: "지연",
  cancelled: "취소",
};

const STATUS_COLORS: Record<MilestoneStatus, string> = {
  planned: "bg-muted/50 text-muted-foreground",
  in_progress: "bg-cat-1/15 text-cat-1",
  done: "bg-success/15 text-success",
  overdue: "bg-destructive/15 text-destructive",
  cancelled: "bg-muted/50 text-muted-foreground",
};

export default function MilestonesBoard({
  researchId,
  currentUserId,
  isLeader,
  isMember,
}: Props) {
  const { data: milestones = [], isLoading } = useMilestones(researchId);
  const createMut = useCreateMilestone(researchId);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [type, setType] = useState<MilestoneType>("other");
  const [targetDate, setTargetDate] = useState("");
  const canEdit = isLeader || isMember;

  const handleCreate = async () => {
    if (!title.trim() || !targetDate) return;
    await createMut.mutateAsync({
      researchId,
      title: title.trim(),
      type,
      targetDate,
      assigneeIds: [currentUserId],
      status: "planned",
    });
    setCreating(false);
    setTitle("");
    setTargetDate("");
    setType("other");
  };

  if (isLoading) {
    return <p className="py-8 text-center text-sm text-muted-foreground">불러오는 중...</p>;
  }

  // 자동으로 overdue 표시 — 클라이언트 계산만, DB 미반영
  const today = new Date().toISOString().slice(0, 10);
  const enriched = milestones.map((m) => {
    if (m.status === "planned" || m.status === "in_progress") {
      if (m.targetDate < today) return { ...m, status: "overdue" as MilestoneStatus };
    }
    return m;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">마일스톤 ({milestones.length})</h2>
        {canEdit && (
          <Button size="sm" onClick={() => setCreating(!creating)}>
            <Plus size={14} className="mr-1" />
            새 마일스톤
          </Button>
        )}
      </div>

      {creating && (
        <Card className="border-primary/30">
          <CardHeader>
            <CardTitle className="text-base">마일스톤 추가</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="sm:col-span-2">
                <Label htmlFor="ms-title" className="text-xs">제목</Label>
                <Input
                  id="ms-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="예: IRB 신청서 제출"
                />
              </div>
              <div>
                <Label htmlFor="ms-type" className="text-xs">종류</Label>
                <select
                  id="ms-type"
                  value={type}
                  onChange={(e) => setType(e.target.value as MilestoneType)}
                  className="block w-full rounded border border-border px-2 py-2 text-sm"
                >
                  {Object.entries(TYPE_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <Label htmlFor="ms-date" className="text-xs">목표일</Label>
              <Input
                id="ms-date"
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="outline" onClick={() => setCreating(false)}>취소</Button>
              <Button size="sm" onClick={handleCreate} disabled={createMut.isPending}>
                추가
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {enriched.length === 0 ? (
        <EmptyState
          icon={Target}
          title="아직 마일스톤이 없습니다"
          description="IRB·자료 수집·분석·초고 등 주요 단계를 등록하고 상태를 추적하세요."
        />
      ) : (
        <div className="space-y-2">
          {enriched.map((m) => (
            <MilestoneRow
              key={m.id}
              milestone={m}
              researchId={researchId}
              canEdit={canEdit}
              isLeader={isLeader}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function MilestoneRow({
  milestone,
  researchId,
  canEdit,
  isLeader,
}: {
  milestone: CollabResearchMilestone;
  researchId: string;
  canEdit: boolean;
  isLeader: boolean;
}) {
  const updateMut = useUpdateMilestone(researchId, milestone.id);
  const completeMut = useCompleteMilestone(researchId);
  const deleteMut = useDeleteMilestone(researchId);

  return (
    <Card>
      <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="text-xs">
            {TYPE_LABELS[milestone.type]}
          </Badge>
          <div>
            <p className={`text-sm font-medium ${milestone.status === "done" ? "line-through text-muted-foreground" : ""}`}>
              {milestone.title}
            </p>
            <p className="text-xs text-muted-foreground">
              <Calendar size={11} className="mr-1 inline" />
              목표 {milestone.targetDate}
              {milestone.completedAt &&
                ` · 완료 ${new Date(milestone.completedAt).toLocaleDateString("ko-KR")}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className={`rounded-full px-2 py-0.5 text-xs ${STATUS_COLORS[milestone.status]}`}>
            {STATUS_LABELS[milestone.status]}
          </span>
          {canEdit && milestone.status !== "done" && milestone.status !== "cancelled" && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() =>
                completeMut.mutate({ id: milestone.id, assigneeIds: milestone.assigneeIds })
              }
            >
              <Check size={14} className="mr-1" />
              완료
            </Button>
          )}
          {canEdit && milestone.status !== "in_progress" && milestone.status !== "done" && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => updateMut.mutate({ status: "in_progress" })}
            >
              진행 중
            </Button>
          )}
          {isLeader && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                if (confirm(`'${milestone.title}' 마일스톤을 삭제하시겠습니까?`)) {
                  deleteMut.mutate(milestone.id);
                }
              }}
            >
              <Trash2 size={14} className="text-destructive" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
