"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  awardsApi,
  externalActivitiesApi,
  contentCreationsApi,
} from "@/lib/bkend";
import {
  AWARD_SCOPE_LABELS,
  CONTENT_CREATION_TYPE_LABELS,
  EXTERNAL_ACTIVITY_TYPE_LABELS,
} from "@/types";
import type {
  Award,
  ContentCreation,
  ExternalActivity,
  User,
} from "@/types";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  Award as AwardIcon,
  Globe,
  ExternalLink,
  CheckCircle2,
  Clock,
  AlertCircle,
  Pencil,
} from "lucide-react";
import PortfolioVerifyButtons from "./PortfolioVerifyButtons";

type PortfolioStatus = "approved" | "pending" | "rejected";

interface PortfolioItem {
  id: string;
  kind: "award" | "external" | "content";
  status: PortfolioStatus;
  title: string;
  url?: string;
  date: string;
  meta: string;
  description?: string;
  rejectionReason?: string;
  typeLabel: string;
  raw: Award | ExternalActivity | ContentCreation;
}

const STATUS_META: Record<
  PortfolioStatus,
  { label: string; icon: typeof CheckCircle2; tone: string; badgeVariant: "default" | "outline" | "destructive" }
> = {
  approved: {
    label: "승인",
    icon: CheckCircle2,
    tone: "text-emerald-600",
    badgeVariant: "default",
  },
  pending: {
    label: "승인 대기",
    icon: Clock,
    tone: "text-amber-600",
    badgeVariant: "outline",
  },
  rejected: {
    label: "미승인",
    icon: AlertCircle,
    tone: "text-rose-600",
    badgeVariant: "destructive",
  },
};

function awardStatus(a: Award): PortfolioStatus {
  // Award 타입은 rejectionReason 미지원 — 검증여부만 체크
  return a.verified ? "approved" : "pending";
}

function externalStatus(x: ExternalActivity): PortfolioStatus {
  if (x.verified) return "approved";
  if (x.rejectionReason) return "rejected";
  return "pending";
}

interface Props {
  owner: User;
  isOwner: boolean;
}

export default function ProfilePortfolio({ owner, isOwner }: Props) {
  const { data: awards = [], isLoading: awardsLoading } = useQuery({
    queryKey: ["profile-awards", owner.id],
    queryFn: async () => {
      const res = await awardsApi.listByUser(owner.id);
      return res.data as unknown as Award[];
    },
    enabled: !!owner.id,
  });

  const { data: externals = [], isLoading: externalsLoading } = useQuery({
    queryKey: ["profile-external-activities", owner.id],
    queryFn: async () => {
      const res = await externalActivitiesApi.listByUser(owner.id);
      return res.data as unknown as ExternalActivity[];
    },
    enabled: !!owner.id,
  });

  const { data: contents = [], isLoading: contentsLoading } = useQuery({
    queryKey: ["profile-content-creations", owner.id],
    queryFn: async () => {
      const res = await contentCreationsApi.listByUser(owner.id);
      return res.data as unknown as ContentCreation[];
    },
    enabled: !!owner.id,
  });

  const items: PortfolioItem[] = useMemo(() => {
    const out: PortfolioItem[] = [];
    for (const a of awards) {
      out.push({
        id: `award-${a.id}`,
        kind: "award",
        status: awardStatus(a),
        title: a.title,
        date: a.date ?? "",
        meta: [a.organization, a.date].filter(Boolean).join(" · "),
        description: a.description,
        typeLabel: AWARD_SCOPE_LABELS[a.scope],
        raw: a,
      });
    }
    for (const x of externals) {
      out.push({
        id: `external-${x.id}`,
        kind: "external",
        status: externalStatus(x),
        title: x.title,
        url: x.url,
        date: x.date ?? "",
        meta: [x.organization, x.date, x.role, x.location]
          .filter(Boolean)
          .join(" · "),
        description: x.description,
        rejectionReason: x.rejectionReason,
        typeLabel: EXTERNAL_ACTIVITY_TYPE_LABELS[x.type],
        raw: x,
      });
    }
    for (const c of contents) {
      out.push({
        id: `content-${c.id}`,
        kind: "content",
        status: "approved",
        title: c.title,
        url: c.url,
        date: c.publishedAt ?? "",
        meta: c.publishedAt ?? "",
        description: c.description,
        typeLabel: CONTENT_CREATION_TYPE_LABELS[c.type],
        raw: c,
      });
    }
    return out.sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
  }, [awards, externals, contents]);

  const isLoading = awardsLoading || externalsLoading || contentsLoading;

  const buckets: Record<PortfolioStatus, PortfolioItem[]> = useMemo(() => {
    const acc: Record<PortfolioStatus, PortfolioItem[]> = {
      approved: [],
      pending: [],
      rejected: [],
    };
    for (const it of items) acc[it.status].push(it);
    return acc;
  }, [items]);

  return (
    <section className="rounded-2xl border bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          학술 포트폴리오
        </h2>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-muted-foreground">
            총 {items.length}건
          </span>
          {isOwner && (
            <Link
              href="/mypage/portfolio"
              className="inline-flex items-center gap-1 rounded-md border border-primary/30 bg-white px-2 py-0.5 text-[10px] font-medium text-primary hover:bg-primary/5"
            >
              <Pencil size={10} /> 편집
            </Link>
          )}
        </div>
      </div>

      {isLoading ? (
        <p className="py-4 text-center text-xs text-muted-foreground">
          불러오는 중…
        </p>
      ) : items.length === 0 ? (
        <p className="flex items-center justify-center gap-2 py-6 text-xs text-muted-foreground">
          <Sparkles size={14} aria-hidden="true" />
          등록된 포트폴리오 항목이 없습니다.
        </p>
      ) : (
        <div className="space-y-4">
          {(Object.keys(STATUS_META) as PortfolioStatus[]).map((status) => {
            const list = buckets[status];
            if (list.length === 0) return null;
            const meta = STATUS_META[status];
            const Icon = meta.icon;
            return (
              <div key={status}>
                <div className="mb-1.5 flex items-center gap-1.5">
                  <Icon size={12} className={meta.tone} />
                  <h3 className="text-[11px] font-semibold tracking-wide">
                    {meta.label}
                    <span className="ml-1 font-normal text-muted-foreground">
                      ({list.length})
                    </span>
                  </h3>
                </div>
                <ul className="space-y-1.5">
                  {list.map((it) => (
                    <PortfolioRow
                      key={it.id}
                      item={it}
                      ownerId={owner.id}
                    />
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function PortfolioRow({
  item,
  ownerId,
}: {
  item: PortfolioItem;
  ownerId: string;
}) {
  const KindIcon =
    item.kind === "award" ? AwardIcon : item.kind === "external" ? Globe : Sparkles;
  return (
    <li className="rounded-md border bg-muted/10 p-2.5">
      <div className="flex flex-wrap items-center gap-1.5">
        <KindIcon size={12} className="shrink-0 text-primary/70" />
        {item.url ? (
          <a
            href={item.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-0.5 text-sm font-medium hover:text-primary hover:underline"
          >
            {item.title}
            <ExternalLink size={10} />
          </a>
        ) : (
          <p className="text-sm font-medium">{item.title}</p>
        )}
        <Badge variant="secondary" className="text-[10px]">
          {item.typeLabel}
        </Badge>
        {item.kind !== "content" && (
          <PortfolioVerifyButtons
            kind={item.kind === "award" ? "awards" : "external_activities"}
            itemId={(item.raw as Award | ExternalActivity).id}
            ownerId={ownerId}
          />
        )}
      </div>
      {item.meta && (
        <p className="mt-0.5 text-[11px] text-muted-foreground">{item.meta}</p>
      )}
      {item.description && (
        <p className="mt-1 text-[11px] text-foreground/80">{item.description}</p>
      )}
      {item.status === "rejected" && item.rejectionReason && (
        <p className="mt-1.5 inline-flex items-center gap-1 rounded-md border border-rose-200 bg-rose-50 px-2 py-0.5 text-[10px] text-rose-700">
          <AlertCircle size={10} /> 반려 사유: {item.rejectionReason}
        </p>
      )}
    </li>
  );
}
