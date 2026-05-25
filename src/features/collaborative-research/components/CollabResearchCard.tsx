"use client";

import Link from "next/link";
import { Users, Calendar } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import CollabResearchStatusBadge from "./CollabResearchStatusBadge";
import CollabResearchRoleBadge from "./CollabResearchRoleBadge";
import { COLLABORATION_TYPE_LABELS } from "../lib/research-status";
import type { CollaborativeResearch, CollabMemberRole } from "@/types";

interface Props {
  research: CollaborativeResearch;
  myRole?: CollabMemberRole;
}

export default function CollabResearchCard({ research, myRole }: Props) {
  const startDate = research.startDate || "—";
  return (
    <Link href={`/collab/${research.id}`} className="block">
      <Card className="h-full transition-shadow hover:shadow-md">
        <CardContent className="space-y-3 p-5">
          <div className="flex items-start justify-between gap-2">
            <Badge variant="outline" className="text-xs">
              {COLLABORATION_TYPE_LABELS[research.collaborationType]}
            </Badge>
            <CollabResearchStatusBadge status={research.status} size="sm" />
          </div>

          <h3 className="line-clamp-2 text-base font-semibold leading-snug">
            {research.title}
          </h3>

          {research.researchTopic && (
            <p className="line-clamp-2 text-sm text-zinc-600">
              {research.researchTopic}
            </p>
          )}

          <div className="flex items-center justify-between pt-1 text-xs text-zinc-500">
            <span className="inline-flex items-center gap-1">
              <Users size={14} /> {research.collaboratorCount}명
            </span>
            <span className="inline-flex items-center gap-1">
              <Calendar size={14} /> {startDate}
            </span>
          </div>

          {myRole && (
            <div className="pt-1">
              <CollabResearchRoleBadge role={myRole} size="sm" />
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
