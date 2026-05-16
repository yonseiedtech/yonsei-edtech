"use client";

/**
 * 스터디 회차 회고 카드 (Sprint 1 — Study Enhancement)
 * - 회차 단위로 본인이 작성하는 개인 회고 (liked/lacked/longedFor + rating + takeaways)
 * - 본인은 자신의 회고만, 운영진/리더는 모든 참여자의 회고(공개분) 열람 가능
 * - completed 회차에서 가장 강조됨
 */

import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Loader2,
  MessageSquareQuote,
  Pencil,
  Save,
  Star,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { studySessionReflectionsApi, profilesApi } from "@/lib/bkend";
import type { StudySessionReflection, User } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface Props {
  activityId: string;
  activityProgressId: string;
  week: number;
  /** 회차 상태 — completed 일 때 작성 prompt 강조 */
  progressStatus: "planned" | "in_progress" | "completed";
  currentUserId?: string;
  currentUserName?: string;
  /** 운영진/리더 — 모든 회원 회고 열람 */
  canViewAll: boolean;
  /** 본 회차에 참여한 회원 ID 목록 — 미작성자 안내용 */
  participantIds: string[];
}

const FIELD_PROMPTS = {
  liked: "잘됐던 점 · Liked (예: 이번 챕터 토론이 활발했음)",
  lacked: "아쉬웠던 점 · Lacked (예: 시간이 부족해서 마지막 섹션 못 다룸)",
  longedFor: "다음에 보완할 점 · Longed for (예: 발제 슬라이드 미리 공유)",
};

export default function StudySessionReflectionCard({
  activityId,
  activityProgressId,
  week,
  progressStatus,
  currentUserId,
  currentUserName,
  canViewAll,
  participantIds,
}: Props) {
  const queryClient = useQueryClient();

  // 내 회고
  const { data: myReflection, isLoading: myLoading } = useQuery({
    queryKey: ["study-reflection", "mine", activityProgressId, currentUserId],
    queryFn: () =>
      currentUserId
        ? studySessionReflectionsApi.getMine(activityProgressId, currentUserId)
        : Promise.resolve(null),
    enabled: !!currentUserId,
  });

  // 회차의 모든 회고 (운영진/리더)
  const { data: allReflections = [] } = useQuery({
    queryKey: ["study-reflection", "progress", activityProgressId],
    enabled: canViewAll,
    queryFn: async () => {
      const res = await studySessionReflectionsApi.listByProgress(activityProgressId);
      return res.data ?? [];
    },
  });

  // 회고 작성자 이름 (denorm 누락 시 보조)
  const reflectionUserIds = useMemo(
    () =>
      Array.from(
        new Set(
          (allReflections as StudySessionReflection[])
            .filter((r) => !r.userName)
            .map((r) => r.userId),
        ),
      ),
    [allReflections],
  );
  const { data: reflectionUsers = [] } = useQuery({
    queryKey: ["study-reflection", "users", reflectionUserIds.join(",")],
    enabled: reflectionUserIds.length > 0,
    queryFn: async () => {
      const results = await Promise.all(
        reflectionUserIds.map(async (uid) => {
          try {
            return (await profilesApi.get(uid)) as User;
          } catch {
            return null;
          }
        }),
      );
      return results.filter((u): u is User => !!u);
    },
  });
  const userNameMap = useMemo(() => {
    const m = new Map<string, string>();
    (reflectionUsers as User[]).forEach((u) => m.set(u.id, u.name));
    return m;
  }, [reflectionUsers]);

  // 작성 폼 상태
  const [editing, setEditing] = useState(false);
  const [liked, setLiked] = useState("");
  const [lacked, setLacked] = useState("");
  const [longedFor, setLongedFor] = useState("");
  const [rating, setRating] = useState<number>(0);
  const [takeawaysText, setTakeawaysText] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showOthers, setShowOthers] = useState(false);

  useEffect(() => {
    if (myReflection) {
      setLiked(myReflection.liked ?? "");
      setLacked(myReflection.lacked ?? "");
      setLongedFor(myReflection.longedFor ?? "");
      setRating(myReflection.rating ?? 0);
      setTakeawaysText((myReflection.takeaways ?? []).join("\n"));
      setIsPrivate(!!myReflection.isPrivate);
    }
  }, [myReflection]);

  async function handleSave() {
    if (!currentUserId) {
      toast.error("로그인이 필요합니다.");
      return;
    }
    if (!liked.trim() && !lacked.trim() && !longedFor.trim()) {
      toast.error("최소 한 칸 이상 작성해주세요.");
      return;
    }
    setSaving(true);
    try {
      const takeaways = takeawaysText
        .split(/\r?\n/)
        .map((s) => s.trim())
        .filter(Boolean);

      const payload = {
        activityId,
        activityProgressId,
        week,
        userId: currentUserId,
        userName: currentUserName,
        liked: liked.trim(),
        lacked: lacked.trim(),
        longedFor: longedFor.trim(),
        rating: rating > 0 ? rating : undefined,
        takeaways: takeaways.length > 0 ? takeaways : undefined,
        isPrivate,
      };

      // createdAt / updatedAt 은 dataApi 가 serverTimestamp 로 자동 설정.
      if (myReflection) {
        await studySessionReflectionsApi.update(myReflection.id, payload);
      } else {
        await studySessionReflectionsApi.create(payload);
      }

      await queryClient.invalidateQueries({
        queryKey: ["study-reflection", "mine", activityProgressId, currentUserId],
      });
      if (canViewAll) {
        await queryClient.invalidateQueries({
          queryKey: ["study-reflection", "progress", activityProgressId],
        });
      }
      toast.success("회고가 저장되었습니다.");
      setEditing(false);
    } catch (e) {
      console.error("[reflection/save]", e);
      toast.error(e instanceof Error ? `저장 실패: ${e.message}` : "저장 실패");
    } finally {
      setSaving(false);
    }
  }

  const promptToWrite = progressStatus === "completed" && !myReflection && !editing;
  const reflectionsToShow = canViewAll
    ? (allReflections as StudySessionReflection[]).filter(
        (r) => !r.isPrivate || r.userId === currentUserId,
      )
    : [];
  const writtenUserSet = new Set(
    (allReflections as StudySessionReflection[]).map((r) => r.userId),
  );
  const missingCount = canViewAll
    ? participantIds.filter((pid) => !writtenUserSet.has(pid)).length
    : 0;

  return (
    <div
      className={cn(
        "rounded-lg border bg-card p-3 space-y-3",
        promptToWrite && "border-primary/40 bg-primary/5",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <h4 className="flex items-center gap-1.5 text-xs font-semibold">
          <MessageSquareQuote size={12} />
          회고
          {myReflection && (
            <Badge variant="secondary" className="bg-emerald-50 text-[9px] text-emerald-700">
              작성 완료
            </Badge>
          )}
          {canViewAll && (
            <Badge variant="outline" className="text-[9px]">
              전체 {reflectionsToShow.length}건
              {missingCount > 0 && ` · 미작성 ${missingCount}명`}
            </Badge>
          )}
        </h4>
        {currentUserId && !editing && (
          <Button
            size="sm"
            variant={promptToWrite ? "default" : "outline"}
            className="h-7 gap-1 px-2 text-[11px]"
            onClick={() => setEditing(true)}
          >
            <Pencil size={11} />
            {myReflection ? "수정" : "작성"}
          </Button>
        )}
      </div>

      {!currentUserId && (
        <p className="rounded border border-dashed bg-muted/20 px-2 py-3 text-center text-[11px] text-muted-foreground">
          로그인 후 회고를 작성할 수 있습니다.
        </p>
      )}

      {currentUserId && editing && (
        <div className="space-y-2">
          <div>
            <label className="mb-1 block text-[11px] text-muted-foreground">
              {FIELD_PROMPTS.liked}
            </label>
            <textarea
              value={liked}
              onChange={(e) => setLiked(e.target.value)}
              rows={2}
              className="w-full rounded-lg border px-2 py-1.5 text-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] text-muted-foreground">
              {FIELD_PROMPTS.lacked}
            </label>
            <textarea
              value={lacked}
              onChange={(e) => setLacked(e.target.value)}
              rows={2}
              className="w-full rounded-lg border px-2 py-1.5 text-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] text-muted-foreground">
              {FIELD_PROMPTS.longedFor}
            </label>
            <textarea
              value={longedFor}
              onChange={(e) => setLongedFor(e.target.value)}
              rows={2}
              className="w-full rounded-lg border px-2 py-1.5 text-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] text-muted-foreground">
              핵심 takeaway (한 줄에 하나씩, 선택)
            </label>
            <textarea
              value={takeawaysText}
              onChange={(e) => setTakeawaysText(e.target.value)}
              rows={2}
              placeholder={"예) Vygotsky ZPD 개념의 실제 적용\nFlipped learning 효과 측정 변인"}
              className="w-full rounded-lg border px-2 py-1.5 text-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-muted-foreground">평가</span>
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRating((r) => (r === n ? 0 : n))}
                  className={cn(
                    "rounded p-0.5",
                    rating >= n ? "text-amber-500" : "text-muted-foreground/40",
                  )}
                  aria-label={`${n}점`}
                >
                  <Star size={14} className={cn(rating >= n && "fill-current")} />
                </button>
              ))}
            </div>
            <label className="ml-auto flex items-center gap-1 text-[11px] text-muted-foreground">
              <input
                type="checkbox"
                checked={isPrivate}
                onChange={(e) => setIsPrivate(e.target.checked)}
                className="h-3 w-3"
              />
              <EyeOff size={11} /> 비공개 (운영진도 비공개)
            </label>
          </div>
          <div className="flex justify-end gap-1.5">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setEditing(false)}
              disabled={saving}
              className="h-7 px-2 text-[11px]"
            >
              <X size={11} className="mr-0.5" /> 취소
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={saving}
              className="h-7 px-2 text-[11px]"
            >
              {saving ? (
                <Loader2 size={11} className="mr-0.5 animate-spin" />
              ) : (
                <Save size={11} className="mr-0.5" />
              )}
              저장
            </Button>
          </div>
        </div>
      )}

      {currentUserId && !editing && (
        <>
          {myLoading ? (
            <p className="text-[11px] text-muted-foreground">불러오는 중…</p>
          ) : myReflection ? (
            <ReflectionView
              reflection={myReflection}
              userName={currentUserName ?? "나"}
              mine
            />
          ) : promptToWrite ? (
            <p className="rounded border border-dashed border-primary/30 bg-primary/5 px-2 py-3 text-center text-[11px] text-foreground">
              회차가 완료되었습니다 — 짧은 회고를 남겨 보세요. 학습 잔디에도 반영됩니다.
            </p>
          ) : (
            <p className="rounded border border-dashed bg-muted/20 px-2 py-3 text-center text-[11px] text-muted-foreground">
              아직 회고를 작성하지 않았습니다.
            </p>
          )}

          {canViewAll && reflectionsToShow.length > 0 && (
            <div className="border-t pt-2">
              <button
                type="button"
                onClick={() => setShowOthers((v) => !v)}
                className="flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
              >
                <Eye size={11} />
                다른 참여자 회고 {reflectionsToShow.length}건
                {showOthers ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
              </button>
              {showOthers && (
                <div className="mt-2 space-y-2">
                  {reflectionsToShow
                    .filter((r) => r.userId !== currentUserId)
                    .map((r) => (
                      <ReflectionView
                        key={r.id}
                        reflection={r}
                        userName={r.userName ?? userNameMap.get(r.userId) ?? "(이름 미확인)"}
                      />
                    ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ReflectionView({
  reflection,
  userName,
  mine = false,
}: {
  reflection: StudySessionReflection;
  userName: string;
  mine?: boolean;
}) {
  return (
    <div
      className={cn(
        "space-y-1.5 rounded-md border bg-background p-2 text-[11px]",
        mine && "border-primary/30 bg-primary/5",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium text-foreground">
          {userName}
          {mine && <span className="ml-1 text-primary">(나)</span>}
        </span>
        <div className="flex items-center gap-1">
          {reflection.rating && reflection.rating > 0 && (
            <span className="flex items-center gap-0.5 text-amber-600">
              {Array.from({ length: reflection.rating }).map((_, i) => (
                <Star key={i} size={10} className="fill-current" />
              ))}
            </span>
          )}
          {reflection.isPrivate && (
            <Badge variant="outline" className="text-[9px]">
              비공개
            </Badge>
          )}
        </div>
      </div>
      {reflection.liked && (
        <Field label="👍 잘됐던 점" body={reflection.liked} tone="emerald" />
      )}
      {reflection.lacked && (
        <Field label="🟠 아쉬웠던 점" body={reflection.lacked} tone="amber" />
      )}
      {reflection.longedFor && (
        <Field label="🔵 다음에 보완할 점" body={reflection.longedFor} tone="blue" />
      )}
      {reflection.takeaways && reflection.takeaways.length > 0 && (
        <div className="rounded border-l-2 border-primary/40 bg-primary/5 px-2 py-1">
          <p className="mb-0.5 text-[10px] font-semibold text-primary">핵심 takeaway</p>
          <ul className="list-disc pl-3 text-[11px] text-foreground">
            {reflection.takeaways.map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  body,
  tone,
}: {
  label: string;
  body: string;
  tone: "emerald" | "amber" | "blue";
}) {
  const cls =
    tone === "emerald"
      ? "border-emerald-200 bg-emerald-50/50"
      : tone === "amber"
        ? "border-amber-200 bg-amber-50/50"
        : "border-blue-200 bg-blue-50/50";
  return (
    <div className={cn("rounded border px-2 py-1", cls)}>
      <p className="text-[10px] font-semibold text-foreground/80">{label}</p>
      <p className="mt-0.5 whitespace-pre-wrap text-[11px] leading-relaxed text-foreground">
        {body}
      </p>
    </div>
  );
}
