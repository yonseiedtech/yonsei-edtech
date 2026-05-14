"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  GraduationCap,
  CheckCircle2,
  Circle,
  ExternalLink,
  Download,
  Info,
  ArrowRight,
} from "lucide-react";
import { useAuthStore } from "@/features/auth/auth-store";
import { isStaffOrAbove } from "@/lib/permissions";
import {
  guideTracksApi,
  guideItemsApi,
  guideProgressApi,
} from "@/lib/bkend";
import {
  GUIDE_ITEM_ACTION_LABELS,
  type GuideTrack,
  type GuideItem,
  type GuideItemActionType,
  type GuideProgress,
} from "@/types";

function ActionIcon({ type }: { type: GuideItemActionType }) {
  if (type === "link") return <ExternalLink size={14} />;
  if (type === "download") return <Download size={14} />;
  if (type === "internal") return <ArrowRight size={14} />;
  return <Info size={14} />;
}

function isItemActive(item: GuideItem, today = new Date()): boolean {
  if (item.appliesFrom && new Date(item.appliesFrom) > today) return false;
  if (item.appliesUntil && new Date(item.appliesUntil) < today) return false;
  return true;
}

/** 매우 단순한 마크다운 렌더링: 줄바꿈 보존 + 링크([text](url)) + **굵게** */
function renderInline(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const re = /\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    if (m[1] && m[2]) {
      parts.push(
        <a
          key={`l-${key++}`}
          href={m[2]}
          target={m[2].startsWith("http") ? "_blank" : undefined}
          rel="noopener noreferrer"
          className="text-primary underline hover:text-primary/80"
        >
          {m[1]}
        </a>,
      );
    } else if (m[3]) {
      parts.push(
        <strong key={`b-${key++}`} className="font-semibold">
          {m[3]}
        </strong>,
      );
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

function MarkdownLite({ source }: { source: string }) {
  const lines = source.split(/\r?\n/);
  return (
    <div className="space-y-1.5 text-sm leading-relaxed text-muted-foreground">
      {lines.map((line, i) => {
        if (!line.trim()) return <div key={i} className="h-1.5" />;
        if (line.startsWith("- ")) {
          return (
            <div key={i} className="flex gap-2">
              <span className="mt-1 inline-block h-1 w-1 shrink-0 rounded-full bg-muted-foreground/60" />
              <span>{renderInline(line.slice(2))}</span>
            </div>
          );
        }
        return <p key={i}>{renderInline(line)}</p>;
      })}
    </div>
  );
}

interface ItemCardProps {
  item: GuideItem;
  done: boolean;
  canCheck: boolean;
  onToggle: () => void;
}

function ItemCard({ item, done, canCheck, onToggle }: ItemCardProps) {
  const isPreview = !item.published;
  return (
    <div
      className={
        "rounded-2xl border p-4 transition-colors " +
        (isPreview
          ? "border-amber-300 bg-amber-50/30 dark:bg-amber-950/20"
          : done
            ? "bg-emerald-50/40 dark:bg-emerald-950/20"
            : "bg-card")
      }
    >
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={onToggle}
          disabled={!canCheck}
          className="mt-0.5 shrink-0"
          title={canCheck ? (done ? "완료 해제" : "완료 표시") : "로그인 후 체크 가능"}
        >
          {done ? (
            <CheckCircle2 size={20} className="text-emerald-600" />
          ) : (
            <Circle size={20} className={canCheck ? "text-muted-foreground" : "text-muted-foreground/40"} />
          )}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className={"font-semibold " + (done ? "text-muted-foreground line-through" : "")}>
              {item.title}
            </h3>
            {isPreview && (
              <Badge variant="secondary" className="bg-amber-100 text-[9px] text-amber-800">
                비공개 (운영진 미리보기)
              </Badge>
            )}
          </div>
          {item.body && (
            <div className="mt-2">
              <MarkdownLite source={item.body} />
            </div>
          )}
          {item.actionType !== "info" && (item.actionUrl || item.attachmentPath) && (
            <a
              href={item.actionUrl || item.attachmentPath}
              target={item.actionUrl?.startsWith("http") ? "_blank" : undefined}
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/10"
            >
              <ActionIcon type={item.actionType} />
              {GUIDE_ITEM_ACTION_LABELS[item.actionType]}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  const { user } = useAuthStore();
  const isLoggedIn = !!user;

  const [track, setTrack] = useState<GuideTrack | null>(null);
  const [items, setItems] = useState<GuideItem[]>([]);
  const [progress, setProgress] = useState<GuideProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  const isStaffViewer = isStaffOrAbove(user);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        // 운영진은 비공개 트랙도 미리보기, 일반 회원은 published만.
        const tracksRes = isStaffViewer
          ? await guideTracksApi.list()
          : await guideTracksApi.listPublished();
        // 동일 키의 중복 트랙이 잔존할 수 있으므로 모두 모아 항목을 합산한다.
        const onboardingTracks = tracksRes.data.filter((t) => t.key === "onboarding");
        if (cancelled) return;

        if (onboardingTracks.length === 0) {
          setTrack(null);
          setItems([]);
          return;
        }

        // 헤더/진행률 기준은 첫 트랙(공개 우선) 사용. 항목은 모든 트랙에서 병합.
        const primaryTrack = onboardingTracks[0];
        setTrack(primaryTrack);

        const itemResults = await Promise.all(
          onboardingTracks.map((t) =>
            isStaffViewer
              ? guideItemsApi.listByTrack(t.id)
              : guideItemsApi.listPublishedByTrack(t.id),
          ),
        );
        if (cancelled) return;
        const merged = itemResults.flatMap((r) => r.data);
        const seen = new Set<string>();
        const unique = merged.filter((i) => {
          if (seen.has(i.id)) return false;
          seen.add(i.id);
          return true;
        });
        const visible = unique.filter((i) => isItemActive(i));
        visible.sort((a, b) => a.order - b.order);
        setItems(visible);

        if (user) {
          const p = await guideProgressApi.getByUserAndTrack(user.id, primaryTrack.id);
          if (cancelled) return;
          setProgress(p);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, isStaffViewer]);

  const grouped = useMemo(() => {
    const map = new Map<string, GuideItem[]>();
    items.forEach((i) => {
      const arr = map.get(i.category) || [];
      arr.push(i);
      map.set(i.category, arr);
    });
    return Array.from(map.entries());
  }, [items]);

  const completedSet = useMemo(() => {
    return new Set(Object.keys(progress?.completedItems || {}));
  }, [progress]);

  const totalCount = items.length;
  const doneCount = items.filter((i) => completedSet.has(i.id)).length;
  const progressPct = totalCount === 0 ? 0 : Math.round((doneCount / totalCount) * 100);

  async function toggle(itemId: string) {
    if (!user || !track) return;
    setSavingId(itemId);
    try {
      const completed = { ...(progress?.completedItems || {}) };
      if (completed[itemId]) {
        delete completed[itemId];
      } else {
        completed[itemId] = new Date().toISOString();
      }
      const now = new Date().toISOString();
      if (progress) {
        const updated = await guideProgressApi.update(progress.id, {
          completedItems: completed,
          updatedAt: now,
        });
        setProgress(updated);
      } else {
        const created = await guideProgressApi.create({
          userId: user.id,
          trackId: track.id,
          completedItems: completed,
          startedAt: now,
          updatedAt: now,
        });
        setProgress(created);
      }
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <Link
        href="/steppingstone"
        className="mb-4 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft size={12} />
        인지디딤판
      </Link>

      <header className="mb-8 flex items-start gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
          <GraduationCap size={28} />
        </div>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">신입생 온보딩</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {track?.description ||
              "합격 직후부터 입학 후 1학기 정착까지, 단계별로 따라가면 되는 가이드입니다."}
          </p>
        </div>
      </header>

      {isStaffViewer && (track?.published === false || items.some((i) => !i.published)) && (
        <div className="mb-6 rounded-2xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
          <div className="font-semibold">운영진 미리보기 모드</div>
          <div className="mt-0.5">
            비공개 트랙·항목도 함께 보입니다. 회원에게는 공개로 전환된 항목만 노출됩니다.
            {track?.published === false && (
              <span className="ml-1 font-semibold">현재 트랙이 비공개 상태입니다.</span>
            )}
          </div>
        </div>
      )}

      {/* 진행률 카드 */}
      {totalCount > 0 && (
        <div className="mb-8 rounded-2xl border bg-card p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                내 진행률
              </p>
              <p className="mt-1 text-2xl font-bold">
                {doneCount}<span className="text-sm font-normal text-muted-foreground">/{totalCount}</span>
                <span className="ml-2 text-base font-semibold text-primary">{progressPct}%</span>
              </p>
            </div>
            {!isLoggedIn && (
              <Link href="/login">
                <Button size="sm" variant="outline">
                  로그인하고 진행률 저장
                </Button>
              </Link>
            )}
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-3" aria-busy="true" aria-label="온보딩 가이드 불러오는 중">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-2xl border bg-card p-4">
              <div className="flex items-start gap-3">
                <Skeleton className="mt-0.5 h-5 w-5 shrink-0 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-5/6" />
                  <div className="mt-2 flex gap-2">
                    <Skeleton className="h-5 w-20 rounded-md" />
                    <Skeleton className="h-5 w-16 rounded-md" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed bg-muted/30 p-10 text-center">
          <p className="text-sm text-muted-foreground">
            아직 등록된 가이드 항목이 없습니다.
            <br />
            운영진이 곧 콘텐츠를 추가할 예정입니다.
          </p>
          <Link
            href="/contact"
            className="mt-3 inline-flex items-center gap-1 text-xs text-primary underline"
          >
            먼저 알고 싶은 항목 요청하기
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          {grouped.map(([category, catItems]) => (
            <section key={category}>
              <div className="mb-3 flex items-center gap-2">
                <h2 className="text-lg font-bold">{category}</h2>
                <Badge variant="secondary" className="text-[10px]">
                  {catItems.filter((i) => completedSet.has(i.id)).length}/{catItems.length}
                </Badge>
              </div>
              <div className="space-y-2">
                {catItems.map((item) => (
                  <div key={item.id} className="relative">
                    <ItemCard
                      item={item}
                      done={completedSet.has(item.id)}
                      canCheck={isLoggedIn && savingId !== item.id}
                      onToggle={() => toggle(item.id)}
                    />
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
