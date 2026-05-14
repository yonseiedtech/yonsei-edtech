"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Users,
  Mic,
  CheckCircle2,
  Clock,
  Sparkles,
  Heart,
  AlertTriangle,
  Lightbulb,
  Save,
  Loader2,
  Lock,
} from "lucide-react";
import { toast } from "sonner";

import AuthGuard from "@/features/auth/AuthGuard";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/features/auth/auth-store";
import {
  seminarsApi,
  registrationsApi,
  attendeesApi,
  hostRetrospectivesApi,
} from "@/lib/bkend";
import SeminarConnectedTodos from "@/features/seminar/SeminarConnectedTodos";
import {
  HOST_RETROSPECTIVE_TAG_SUGGESTIONS,
  type Seminar,
  type HostRetrospective,
  type SeminarRegistration,
  type SeminarAttendee,
} from "@/types";
import { canAccessSeminarHostDashboard, isSeminarHost } from "@/lib/host-helpers";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function SeminarHostPage(props: PageProps) {
  const { id } = use(props.params);
  return (
    <AuthGuard>
      <SeminarHostInner seminarId={id} />
    </AuthGuard>
  );
}

function SeminarHostInner({ seminarId }: { seminarId: string }) {
  const router = useRouter();
  const { user } = useAuthStore();

  const { data: seminar, isLoading: seminarLoading } = useQuery<Seminar | null>({
    queryKey: ["seminar-host", seminarId],
    queryFn: async () => {
      const res = await seminarsApi.get(seminarId);
      return (res as unknown as Seminar) ?? null;
    },
    retry: false,
  });

  const allowed = canAccessSeminarHostDashboard(seminar ?? null, user);
  const isMyRetro = isSeminarHost(seminar ?? null, user?.id);

  // ─────────────────────────────────────────
  // 신청자 / 출석자
  // ─────────────────────────────────────────
  const { data: regs = [], dataUpdatedAt: regsUpdatedAt } = useQuery<SeminarRegistration[]>({
    enabled: allowed,
    queryKey: ["host-regs", seminarId],
    queryFn: async () => (await registrationsApi.list(seminarId)).data,
    refetchInterval: 5_000,
    refetchIntervalInBackground: false,
  });

  const { data: attendees = [], dataUpdatedAt: attendeesUpdatedAt } = useQuery<SeminarAttendee[]>({
    enabled: allowed,
    queryKey: ["host-attendees", seminarId],
    queryFn: async () => (await attendeesApi.list(seminarId)).data,
    refetchInterval: 5_000,
    refetchIntervalInBackground: false,
  });

  const lastSyncAt = Math.max(regsUpdatedAt ?? 0, attendeesUpdatedAt ?? 0);

  const checkedInIds = useMemo(
    () => new Set(attendees.filter((a) => a.checkedIn).map((a) => a.userId)),
    [attendees],
  );

  const stats = useMemo(() => {
    const total = regs.length;
    const checkedIn = regs.filter((r) => r.userId && checkedInIds.has(r.userId)).length;
    return { total, checkedIn, notYet: total - checkedIn };
  }, [regs, checkedInIds]);

  // ─────────────────────────────────────────
  // 호스트 회고 (F6)
  // ─────────────────────────────────────────
  const [retro, setRetro] = useState<HostRetrospective | null>(null);
  const [retroLoading, setRetroLoading] = useState(true);
  const [liked, setLiked] = useState("");
  const [lacked, setLacked] = useState("");
  const [longedFor, setLongedFor] = useState("");
  const [rating, setRating] = useState<number | "">("");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user || !isMyRetro) {
      setRetroLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setRetroLoading(true);
      try {
        const mine = await hostRetrospectivesApi.getMine("seminar", seminarId, user.id);
        if (cancelled) return;
        setRetro(mine);
        if (mine) {
          setLiked(mine.liked || "");
          setLacked(mine.lacked || "");
          setLongedFor(mine.longedFor || "");
          setRating(mine.rating ?? "");
          setTags(mine.followUpTags || []);
        }
      } finally {
        if (!cancelled) setRetroLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, seminarId, isMyRetro]);

  // 운영진(호스트 본인 아님)일 때 게시된 회고 목록 표시
  const { data: publishedRetros = [] } = useQuery<HostRetrospective[]>({
    enabled: allowed && !isMyRetro,
    queryKey: ["host-retros-published", seminarId],
    queryFn: async () => (await hostRetrospectivesApi.listByActivity("seminar", seminarId)).data,
  });

  function addTag(t: string) {
    const trimmed = t.trim();
    if (!trimmed) return;
    if (tags.includes(trimmed)) return;
    setTags([...tags, trimmed]);
    setTagInput("");
  }

  function removeTag(t: string) {
    setTags(tags.filter((x) => x !== t));
  }

  async function handleSave(asPublish: boolean) {
    if (!user || !isMyRetro) return;
    if (!liked.trim() && !lacked.trim() && !longedFor.trim()) {
      toast.error("최소 한 칸은 작성해주세요.");
      return;
    }
    setSaving(true);
    const now = new Date().toISOString();
    const payload = {
      activityType: "seminar" as const,
      activityId: seminarId,
      hostUserId: user.id,
      hostUserName: user.name,
      liked,
      lacked,
      longedFor,
      rating: rating === "" ? null : Number(rating),
      followUpTags: tags,
      status: asPublish ? "published" : "draft",
      updatedAt: now,
    };
    try {
      if (retro) {
        const updated = await hostRetrospectivesApi.update(retro.id, payload);
        setRetro(updated);
      } else {
        const created = await hostRetrospectivesApi.create({ ...payload, createdAt: now });
        setRetro(created);
      }
      toast.success(asPublish ? "회고를 공개했습니다." : "초안 저장 완료");
    } catch (err) {
      console.error(err);
      toast.error("저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  }

  if (seminarLoading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10" aria-busy="true" aria-label="세미나 호스트 대시보드 불러오는 중">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="mt-4 h-8 w-2/3" />
        <Skeleton className="mt-2 h-4 w-1/2" />
        <div className="mt-8 grid grid-cols-3 gap-3 sm:gap-4">
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
        </div>
        <div className="mt-10 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!seminar) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <p className="text-sm text-muted-foreground">세미나를 찾을 수 없습니다.</p>
        <Button variant="outline" onClick={() => router.back()} className="mt-4">
          돌아가기
        </Button>
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <Lock size={32} className="mx-auto text-muted-foreground" />
        <h1 className="mt-4 text-lg font-semibold">접근 권한이 없습니다</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          호스트 대시보드는 해당 세미나의 연사 또는 운영진만 접근할 수 있습니다.
        </p>
        <Link
          href={`/seminars/${seminarId}`}
          className="mt-4 inline-flex items-center gap-1 text-sm text-primary underline"
        >
          세미나 페이지로
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <Link
        href={`/seminars/${seminarId}`}
        className="mb-4 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft size={12} />
        세미나로
      </Link>

      <header className="mb-8">
        <div className="flex flex-wrap items-center gap-2">
          <Badge className="bg-blue-600 text-white">
            <Mic size={12} className="mr-1" />
            연사 대시보드
          </Badge>
          {!isMyRetro && (
            <Badge variant="outline" className="text-[10px]">
              운영진 보기 모드
            </Badge>
          )}
          <Badge variant="outline" className="gap-1 border-emerald-200 bg-emerald-50 text-[10px] text-emerald-700">
            <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
            실시간 (5초)
          </Badge>
        </div>
        <h1 className="mt-3 text-3xl font-bold">{seminar.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {seminar.date} {seminar.time} · {seminar.location}
        </p>
        {lastSyncAt > 0 && (
          <p className="mt-1 text-[11px] text-muted-foreground/70">
            마지막 갱신: {new Date(lastSyncAt).toLocaleTimeString("ko-KR")}
          </p>
        )}
      </header>

      {/* 집계 위젯 */}
      <section className="mb-8 grid grid-cols-3 gap-3 sm:gap-4">
        <StatCard label="신청자" value={stats.total} icon={<Users size={16} />} tone="default" />
        <StatCard label="출석" value={stats.checkedIn} icon={<CheckCircle2 size={16} />} tone="success" />
        <StatCard label="미출석" value={stats.notYet} icon={<Clock size={16} />} tone="muted" />
      </section>

      {/* 신청자 카드 */}
      <section className="mb-10">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          <Users size={14} />
          신청자 ({regs.length})
        </h2>
        {regs.length === 0 ? (
          <div className="rounded-2xl border border-dashed bg-muted/20 p-8 text-center text-sm text-muted-foreground">
            아직 신청자가 없습니다.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {regs.map((r) => {
              const checked = r.userId ? checkedInIds.has(r.userId) : false;
              return (
                <div
                  key={r.id}
                  className={
                    "rounded-2xl border p-3 " +
                    (checked ? "bg-emerald-50/40 dark:bg-emerald-950/20" : "bg-card")
                  }
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{r.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{r.affiliation || r.email}</p>
                    </div>
                    {checked ? (
                      <Badge className="shrink-0 bg-emerald-600 text-white">출석</Badge>
                    ) : (
                      <Badge variant="outline" className="shrink-0 text-[10px]">대기</Badge>
                    )}
                  </div>
                  {r.memo && (
                    <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{r.memo}</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 세미나 연동 운영 업무 */}
      <section className="mb-10">
        <SeminarConnectedTodos
          seminarId={seminarId}
          seminarTitle={seminar.title}
          seminarDate={seminar.date}
        />
      </section>

      {/* F6: 호스트 회고 */}
      {isMyRetro ? (
        <section className="rounded-2xl border bg-card p-5 sm:p-7">
          <header className="mb-4 flex items-center justify-between gap-2">
            <div>
              <h2 className="flex items-center gap-2 text-base font-bold">
                <Sparkles size={16} className="text-primary" />
                호스트 회고
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                회고는 본인과 운영진(공개 시)만 열람합니다. 다음 회차/인수인계의 자산이 됩니다.
              </p>
            </div>
            {retro && (
              <Badge variant={retro.status === "published" ? "default" : "outline"}>
                {retro.status === "published" ? "공개" : "초안"}
              </Badge>
            )}
          </header>

          {retroLoading ? (
            <div className="space-y-3 py-2" aria-busy="true" aria-label="회고 불러오는 중">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : (
            <div className="space-y-5">
              <RetroField
                icon={<Heart size={14} className="text-rose-500" />}
                label="좋았던 점"
                placeholder="잘 굴러간 진행 / 참가자 반응 / 운영 요소…"
                value={liked}
                onChange={setLiked}
              />
              <RetroField
                icon={<AlertTriangle size={14} className="text-amber-500" />}
                label="아쉬웠던 점"
                placeholder="시간 부족 / 자료 미비 / 참여 저조…"
                value={lacked}
                onChange={setLacked}
              />
              <RetroField
                icon={<Lightbulb size={14} className="text-blue-500" />}
                label="보완·발전시킬 사항"
                placeholder="다음 회차 또는 인수인계 시 반영할 개선안…"
                value={longedFor}
                onChange={setLongedFor}
              />

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">자평 (1~5, 선택)</label>
                  <Input
                    type="number"
                    min={1}
                    max={5}
                    value={rating}
                    onChange={(e) => {
                      const v = e.target.value;
                      setRating(v === "" ? "" : Math.max(1, Math.min(5, Number(v))));
                    }}
                    className="mt-1 max-w-[100px]"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">후속 액션 태그</label>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    {tags.map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => removeTag(t)}
                        className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] hover:bg-muted/70"
                      >
                        #{t} ✕
                      </button>
                    ))}
                    <Input
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addTag(tagInput);
                        }
                      }}
                      placeholder="Enter로 추가"
                      className="h-7 w-32 text-xs"
                    />
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {HOST_RETROSPECTIVE_TAG_SUGGESTIONS.map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => addTag(t)}
                        className="rounded-full border border-dashed border-muted-foreground/40 px-2 py-0.5 text-[10px] text-muted-foreground hover:border-primary hover:text-primary"
                      >
                        + {t}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                <Button onClick={() => handleSave(false)} variant="outline" disabled={saving}>
                  {saving ? <Loader2 size={14} className="mr-1 animate-spin" /> : <Save size={14} className="mr-1" />}
                  초안 저장
                </Button>
                <Button onClick={() => handleSave(true)} disabled={saving}>
                  {saving ? <Loader2 size={14} className="mr-1 animate-spin" /> : <Sparkles size={14} className="mr-1" />}
                  공개 (운영진 열람)
                </Button>
              </div>
            </div>
          )}
        </section>
      ) : (
        <section className="rounded-2xl border bg-card p-5 sm:p-7">
          <header className="mb-4">
            <h2 className="flex items-center gap-2 text-base font-bold">
              <Sparkles size={16} className="text-primary" />
              호스트 회고 (운영진 열람)
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              연사가 작성·공개한 회고만 표시됩니다.
            </p>
          </header>
          {publishedRetros.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              아직 공개된 회고가 없습니다.
            </p>
          ) : (
            <div className="space-y-4">
              {publishedRetros.map((r) => (
                <div key={r.id} className="rounded-2xl border bg-background p-4">
                  <div className="mb-2 flex items-center justify-between text-xs">
                    <span className="font-semibold">{r.hostUserName || "연사"}</span>
                    <span className="text-muted-foreground">
                      {new Date(r.updatedAt).toLocaleDateString("ko-KR")}
                      {r.rating ? ` · ⭐ ${r.rating}/5` : ""}
                    </span>
                  </div>
                  <ReadOnlyRetro liked={r.liked} lacked={r.lacked} longedFor={r.longedFor} />
                  {r.followUpTags && r.followUpTags.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {r.followUpTags.map((t) => (
                        <span
                          key={t}
                          className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground"
                        >
                          #{t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

// ── 헬퍼 컴포넌트 ──

function StatCard({
  label, value, icon, tone,
}: {
  label: string; value: number; icon: React.ReactNode;
  tone: "default" | "success" | "muted";
}) {
  const tones = {
    default: "bg-card",
    success: "bg-emerald-50/60 dark:bg-emerald-950/30",
    muted: "bg-muted/30",
  };
  return (
    <div className={`rounded-2xl border p-3 sm:p-4 ${tones[tone]}`}>
      <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </div>
      <p className="mt-1 text-2xl font-bold tabular-nums">{value}</p>
    </div>
  );
}

function RetroField({
  icon, label, placeholder, value, onChange,
}: {
  icon: React.ReactNode; label: string; placeholder: string;
  value: string; onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
        {icon}
        {label}
      </label>
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={3}
        className="mt-1 resize-y"
      />
    </div>
  );
}

function ReadOnlyRetro({ liked, lacked, longedFor }: { liked: string; lacked: string; longedFor: string }) {
  return (
    <div className="space-y-2 text-sm">
      {liked && (
        <p>
          <span className="mr-1 font-semibold text-rose-600">좋았던 점:</span>
          <span className="text-foreground/90">{liked}</span>
        </p>
      )}
      {lacked && (
        <p>
          <span className="mr-1 font-semibold text-amber-600">아쉬웠던 점:</span>
          <span className="text-foreground/90">{lacked}</span>
        </p>
      )}
      {longedFor && (
        <p>
          <span className="mr-1 font-semibold text-blue-600">보완·발전:</span>
          <span className="text-foreground/90">{longedFor}</span>
        </p>
      )}
    </div>
  );
}
