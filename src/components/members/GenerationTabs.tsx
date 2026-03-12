"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import MemberCard from "./MemberCard";
import type { MemberData } from "@/app/members/page";

interface Props {
  members: MemberData[];
}

export default function GenerationTabs({ members }: Props) {
  const generations = [...new Set(members.map((m) => m.generation))].sort(
    (a, b) => b - a
  );
  const [active, setActive] = useState(generations[0]);

  const filtered = members.filter((m) => m.generation === active);

  return (
    <div>
      {/* Tabs */}
      <div className="flex justify-center gap-2">
        {generations.map((gen) => (
          <button
            key={gen}
            onClick={() => setActive(gen)}
            className={cn(
              "rounded-full px-5 py-2 text-sm font-medium transition-colors",
              active === gen
                ? "bg-primary text-white"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
          >
            {gen}기
          </button>
        ))}
      </div>

      {/* Member Grid */}
      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {filtered.map((member) => (
          <MemberCard key={member.name} member={member} />
        ))}
      </div>
    </div>
  );
}
