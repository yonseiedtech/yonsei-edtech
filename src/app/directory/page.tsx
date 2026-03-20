"use client";

import { useState } from "react";
import AuthGuard from "@/features/auth/AuthGuard";
import { useMembers } from "@/features/member/useMembers";
import { useAuthStore } from "@/features/auth/auth-store";
import { usePastPresidents } from "@/features/site-settings/useSiteContent";
import { isAtLeast } from "@/lib/permissions";
import { Badge } from "@/components/ui/badge";
import { Shield, Lock, Mail } from "lucide-react";
import { cn } from "@/lib/utils";
import { ROLE_LABELS } from "@/types";
import type { User, ContactVisibility } from "@/types";

function filterContactByVisibility(
  member: User,
  viewer: User | null
): User {
  const vis: ContactVisibility = member.contactVisibility ?? "members";
  const shouldHide =
    vis === "private" ||
    (vis === "staff" && !isAtLeast(viewer, "staff")) ||
    (vis === "members" && !viewer);

  if (shouldHide) {
    return { ...member, contactEmail: undefined };
  }
  return member;
}

type Tab = "staff" | "advisors" | "presidents";

function DirectoryContent() {
  const [activeTab, setActiveTab] = useState<Tab>("staff");
  const { user: viewer } = useAuthStore();

  // 현 운영진: staff + president
  const { members: staffMembers, isLoading: staffLoading } = useMembers({ role: "staff" });
  const { members: presidentMembers, isLoading: presLoading } = useMembers({ role: "president" });
  const currentStaff = [...presidentMembers, ...staffMembers].map((m) =>
    filterContactByVisibility(m, viewer)
  );

  // 자문위원
  const { members: advisors, isLoading: advLoading } = useMembers({ role: "advisor" });
  const filteredAdvisors = advisors.map((m) => filterContactByVisibility(m, viewer));

  // 역대 회장
  const { value: pastPresidents, isLoading: ppLoading } = usePastPresidents();

  const isLoading = staffLoading || presLoading || advLoading || ppLoading;

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

        {isLoading ? (
          <div className="mt-8 flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : (
          <>
            {/* 현 운영진 */}
            {activeTab === "staff" && (
              <div className="mt-6">
                <h2 className="text-lg font-bold">현 운영진</h2>
                {currentStaff.length === 0 ? (
                  <p className="mt-4 text-sm text-muted-foreground">등록된 운영진이 없습니다.</p>
                ) : (
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
                        {currentStaff.map((m) => (
                          <tr key={m.id}>
                            <td className="px-4 py-3 font-medium">{m.name}</td>
                            <td className="px-4 py-3">
                              <Badge variant="secondary">{ROLE_LABELS[m.role]}</Badge>
                            </td>
                            <td className="px-4 py-3">{m.generation}기</td>
                            <td className="px-4 py-3 text-muted-foreground">
                              {[m.affiliation, m.position].filter(Boolean).join(" · ")}
                            </td>
                            <td className="px-4 py-3">
                              {m.contactEmail ? (
                                <a
                                  href={`mailto:${m.contactEmail}`}
                                  className="inline-flex items-center gap-1 text-primary hover:underline"
                                >
                                  <Mail size={12} />
                                  {m.contactEmail}
                                </a>
                              ) : m.email ? (
                                <a
                                  href={`mailto:${m.email}`}
                                  className="inline-flex items-center gap-1 text-primary hover:underline"
                                >
                                  <Mail size={12} />
                                  {m.email}
                                </a>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* 자문위원 */}
            {activeTab === "advisors" && (
              <div className="mt-6">
                <h2 className="text-lg font-bold">자문위원</h2>
                {filteredAdvisors.length === 0 ? (
                  <p className="mt-4 text-sm text-muted-foreground">등록된 자문위원이 없습니다.</p>
                ) : (
                  <div className="mt-3 overflow-x-auto rounded-xl border bg-white">
                    <table className="w-full text-sm">
                      <thead className="border-b bg-muted/30">
                        <tr>
                          <th className="px-4 py-3 text-left font-medium">이름</th>
                          <th className="px-4 py-3 text-left font-medium">기수</th>
                          <th className="px-4 py-3 text-left font-medium">소속</th>
                          <th className="px-4 py-3 text-left font-medium">분야</th>
                          <th className="px-4 py-3 text-left font-medium">연락처</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {filteredAdvisors.map((m) => (
                          <tr key={m.id}>
                            <td className="px-4 py-3 font-medium">{m.name}</td>
                            <td className="px-4 py-3">{m.generation}기</td>
                            <td className="px-4 py-3 text-muted-foreground">
                              {[m.affiliation, m.position].filter(Boolean).join(" · ")}
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">{m.field}</td>
                            <td className="px-4 py-3">
                              {m.contactEmail ? (
                                <a
                                  href={`mailto:${m.contactEmail}`}
                                  className="inline-flex items-center gap-1 text-primary hover:underline"
                                >
                                  <Mail size={12} />
                                  {m.contactEmail}
                                </a>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* 역대 회장 */}
            {activeTab === "presidents" && (
              <div className="mt-6">
                <h2 className="text-lg font-bold">역대 회장</h2>
                {pastPresidents.length === 0 ? (
                  <p className="mt-4 text-sm text-muted-foreground">
                    역대 회장 정보가 아직 등록되지 않았습니다.
                  </p>
                ) : (
                  <div className="mt-3 overflow-x-auto rounded-xl border bg-white">
                    <table className="w-full text-sm">
                      <thead className="border-b bg-muted/30">
                        <tr>
                          <th className="px-4 py-3 text-left font-medium">대수</th>
                          <th className="px-4 py-3 text-left font-medium">이름</th>
                          <th className="px-4 py-3 text-left font-medium">임기</th>
                          <th className="px-4 py-3 text-left font-medium">소속</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {[...pastPresidents]
                          .sort((a, b) => a.generation - b.generation)
                          .map((p, idx) => (
                            <tr key={idx}>
                              <td className="px-4 py-3">
                                <Badge variant="secondary">{p.generation}대</Badge>
                              </td>
                              <td className="px-4 py-3 font-medium">{p.name}</td>
                              <td className="px-4 py-3 text-muted-foreground">{p.term}</td>
                              <td className="px-4 py-3 text-muted-foreground">{p.affiliation}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </>
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
