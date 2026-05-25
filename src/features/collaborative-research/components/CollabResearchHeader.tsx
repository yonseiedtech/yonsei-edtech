"use client";

import Link from "next/link";
import { Users, Pencil, Settings, LayoutDashboard } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import CollabResearchStatusBadge from "./CollabResearchStatusBadge";
import {
  COLLABORATION_TYPE_LABELS,
} from "../lib/research-status";
import type { CollaborativeResearch, CollabMemberRole } from "@/types";

interface Props {
  research: CollaborativeResearch;
  myRole?: CollabMemberRole;
  isLeader: boolean;
  activeTab: "dashboard" | "members" | "meta" | "settings";
}

const TABS: Array<{
  key: Props["activeTab"];
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  href: (id: string) => string;
  leaderOnly?: boolean;
}> = [
  { key: "dashboard", label: "대시보드", icon: LayoutDashboard, href: (id) => `/collab/${id}` },
  { key: "members", label: "멤버", icon: Users, href: (id) => `/collab/${id}/members` },
  { key: "meta", label: "메타", icon: Pencil, href: (id) => `/collab/${id}/meta` },
  { key: "settings", label: "설정", icon: Settings, href: (id) => `/collab/${id}/settings`, leaderOnly: true },
];

export default function CollabResearchHeader({ research, isLeader, activeTab }: Props) {
  const tabs = TABS.filter((t) => !t.leaderOnly || isLeader);
  return (
    <header className="space-y-4 border-b pb-4">
      <div>
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <Badge variant="outline">
            {COLLABORATION_TYPE_LABELS[research.collaborationType]}
          </Badge>
          <CollabResearchStatusBadge status={research.status} size="sm" />
          <span className="text-xs text-zinc-500">
            {research.collaboratorCount}명 참여 · 시작 {research.startDate}
          </span>
        </div>
        <h1 className="text-2xl font-bold">{research.title}</h1>
        {research.researchTopic && (
          <p className="mt-1 text-sm text-zinc-600">{research.researchTopic}</p>
        )}
      </div>

      <nav className="flex flex-wrap gap-1">
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = activeTab === t.key;
          return (
            <Link key={t.key} href={t.href(research.id)}>
              <Button
                variant={active ? "default" : "ghost"}
                size="sm"
                className="gap-1.5"
              >
                <Icon size={14} />
                {t.label}
              </Button>
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
