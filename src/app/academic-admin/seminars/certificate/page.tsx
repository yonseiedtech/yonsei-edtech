"use client";

import { useState } from "react";
import CertificateGenerator from "@/features/seminar-admin/CertificateGenerator";
import NametagGenerator from "@/features/seminar-admin/NametagGenerator";
import { Award, Tag } from "lucide-react";
import { cn } from "@/lib/utils";

type Tab = "certificate" | "nametag";

const TABS: { value: Tab; label: string; icon: React.ReactNode }[] = [
  { value: "certificate", label: "수료증/감사장", icon: <Award size={16} /> },
  { value: "nametag", label: "이름표", icon: <Tag size={16} /> },
];

export default function CertificatePage() {
  const [activeTab, setActiveTab] = useState<Tab>("certificate");

  return (
    <div className="space-y-6">
      {/* 서브탭 */}
      <div className="flex gap-1 rounded-lg bg-muted/50 p-1">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-medium transition-colors",
              activeTab === tab.value
                ? "bg-white text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "certificate" && <CertificateGenerator />}
      {activeTab === "nametag" && <NametagGenerator />}
    </div>
  );
}
