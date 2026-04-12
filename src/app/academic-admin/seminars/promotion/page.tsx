"use client";

import { useState } from "react";
import PromotionTab from "@/features/seminar-admin/PromotionTab";
import PosterGenerator from "@/features/seminar-admin/PosterGenerator";
import { cn } from "@/lib/utils";
import { FileText, Image as ImageIcon } from "lucide-react";

const SUB_TABS = [
  { key: "text", label: "텍스트 콘텐츠", icon: FileText },
  { key: "poster", label: "포스터", icon: ImageIcon },
] as const;

type SubTab = (typeof SUB_TABS)[number]["key"];

export default function PromotionPage() {
  const [tab, setTab] = useState<SubTab>("text");

  return (
    <div>
      <div className="mb-6 flex gap-2">
        {SUB_TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
              tab === t.key
                ? "bg-primary text-white"
                : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground",
            )}
          >
            <t.icon size={16} />
            {t.label}
          </button>
        ))}
      </div>

      {tab === "text" ? <PromotionTab /> : <PosterGenerator />}
    </div>
  );
}
