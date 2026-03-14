"use client";

import { useState } from "react";
import AuthGuard from "@/features/auth/AuthGuard";
import { Badge } from "@/components/ui/badge";
import { Shield, Lock, Mail } from "lucide-react";
import { cn } from "@/lib/utils";
import { ROLE_LABELS } from "@/types";
import type { UserRole } from "@/types";

interface DirectoryMember {
  name: string;
  role: Exclude<UserRole, "guest">;
  generation: number;
  email?: string;
  affiliation?: string;
  position?: string;
  note?: string;
  tenure?: string;
}

const CURRENT_STAFF: DirectoryMember[] = [
  { name: "김회장", role: "president", generation: 12, email: "president@yonsei.ac.kr", affiliation: "연세대학교", position: "교육학과 박사과정" },
  { name: "이운영", role: "staff", generation: 12, email: "staff@yonsei.ac.kr", affiliation: "연세대학교", position: "교육학과 석사과정" },
];

const ADVISORS: DirectoryMember[] = [
  { name: "최자문", role: "advisor", generation: 1, email: "advisor@yonsei.ac.kr", affiliation: "OO대학교", position: "교수", note: "교육공학 전공" },
];

const PAST_PRESIDENTS: DirectoryMember[] = [
  { name: "김회장", role: "president", generation: 12, tenure: "2025.09~현재", affiliation: "연세대학교", position: "박사과정" },
  { name: "최현우", role: "alumni", generation: 2, tenure: "2024.03~2025.08", affiliation: "OO에듀", position: "대표" },
  { name: "김민수", role: "alumni", generation: 1, tenure: "2023.03~2024.02", affiliation: "연세대학교", position: "박사과정" },
];

type Tab = "staff" | "advisors" | "presidents";

function DirectoryContent() {
  const [activeTab, setActiveTab] = useState<Tab>("staff");

  const tabs: { key: Tab; label: string }[] = [
    { key: "staff", label: "현 운영진" },
    { key: "advisors", label: "자문위원" },
    { key: "presidents", label: "역대 회장" },
  ];

  return (
    <div className="py-16">
      <div className="mx-auto max-w-4xl px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield size={28} className="text-primary" />
            <h1 className="text-3xl font-bold">운영진 연락망</h1>
          </div>
          <Badge variant="secondary" className="gap-1">
            <Lock size={12} />
            학회원 전용
          </Badge>
        </div>

        {/* Tabs */}
        <div className="mt-8 flex gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "rounded-full px-5 py-2 text-sm font-medium transition-colors",
                activeTab === tab.key
                  ? "bg-primary text-white"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* 현 운영진 */}
        {activeTab === "staff" && (
          <div className="mt-6">
            <h2 className="text-lg font-bold">현 운영진 (2026 봄학기)</h2>
            <div className="mt-3 overflow-x-auto rounded-xl border bg-white">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/30">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">이름</th>
                    <th className="px-4 py-3 text-left font-medium">역할</th>
                    <th className="px-4 py-3 text-left font-medium">기수</th>
                    <th className="px-4 py-3 text-left font-medium">소속</th>
                    <th className="px-4 py-3 text-left font-medium">연락처</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {CURRENT_STAFF.map((m) => (
                    <tr key={m.name}>
                      <td className="px-4 py-3 font-medium">{m.name}</td>
                      <td className="px-4 py-3">
                        <Badge variant="secondary">{ROLE_LABELS[m.role]}</Badge>
                      </td>
                      <td className="px-4 py-3">{m.generation}기</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {[m.affiliation, m.position].filter(Boolean).join(" · ")}
                      </td>
                      <td className="px-4 py-3">
                        {m.email && (
                          <a
                            href={`mailto:${m.email}`}
                            className="inline-flex items-center gap-1 text-primary hover:underline"
                          >
                            <Mail size={12} />
                            {m.email}
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 자문위원 */}
        {activeTab === "advisors" && (
          <div className="mt-6">
            <h2 className="text-lg font-bold">자문위원</h2>
            <div className="mt-3 overflow-x-auto rounded-xl border bg-white">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/30">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">이름</th>
                    <th className="px-4 py-3 text-left font-medium">기수</th>
                    <th className="px-4 py-3 text-left font-medium">소속</th>
                    <th className="px-4 py-3 text-left font-medium">비고</th>
                    <th className="px-4 py-3 text-left font-medium">연락처</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {ADVISORS.map((m) => (
                    <tr key={m.name}>
                      <td className="px-4 py-3 font-medium">{m.name}</td>
                      <td className="px-4 py-3">{m.generation}기</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {[m.affiliation, m.position].filter(Boolean).join(" · ")}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{m.note}</td>
                      <td className="px-4 py-3">
                        {m.email && (
                          <a
                            href={`mailto:${m.email}`}
                            className="inline-flex items-center gap-1 text-primary hover:underline"
                          >
                            <Mail size={12} />
                            {m.email}
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 역대 회장 */}
        {activeTab === "presidents" && (
          <div className="mt-6">
            <h2 className="text-lg font-bold">역대 회장</h2>
            <div className="mt-3 overflow-x-auto rounded-xl border bg-white">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/30">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">기수</th>
                    <th className="px-4 py-3 text-left font-medium">이름</th>
                    <th className="px-4 py-3 text-left font-medium">재임 기간</th>
                    <th className="px-4 py-3 text-left font-medium">현 소속</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {PAST_PRESIDENTS.map((m, i) => (
                    <tr key={`${m.name}-${i}`}>
                      <td className="px-4 py-3">{m.generation}기</td>
                      <td className="px-4 py-3 font-medium">{m.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{m.tenure}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {[m.affiliation, m.position].filter(Boolean).join(" · ")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function DirectoryPage() {
  return (
    <AuthGuard>
      <DirectoryContent />
    </AuthGuard>
  );
}
