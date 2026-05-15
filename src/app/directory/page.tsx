"use client";

import { useMemo, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import AuthGuard from "@/features/auth/AuthGuard";
import { useMembers } from "@/features/member/useMembers";
import { useAuthStore } from "@/features/auth/auth-store";
import { isAtLeast } from "@/lib/permissions";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import PageHeader from "@/components/ui/page-header";
import EmptyState from "@/components/ui/empty-state";
import { Shield, Lock, Mail, Download, Search, ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { OCCUPATION_LABELS, OCCUPATION_SHORT_LABELS } from "@/types";
import type { User, ContactVisibility, OccupationType } from "@/types";
import { todayYmdLocal } from "@/lib/dday";

function filterContactByVisibility(member: User, viewer: User | null): User {
  const vis: ContactVisibility = member.contactVisibility ?? "members";
  const shouldHide =
    vis === "private" ||
    (vis === "staff" && !isAtLeast(viewer, "staff")) ||
    (vis === "members" && !viewer);
  if (shouldHide) {
    return { ...member, contactEmail: undefined, phone: undefined };
  }
  return member;
}

function formatEnrollment(year?: number, half?: number): string {
  if (!year) return "—";
  const label = half === 2 ? "후기" : half === 1 ? "전기" : "";
  return `${year}년${label ? ` ${label}` : ""}`;
}

function occupationLabel(occ?: OccupationType): string {
  if (!occ) return "—";
  return OCCUPATION_SHORT_LABELS[occ] ?? OCCUPATION_LABELS[occ] ?? occ;
}

type Tab = "staff" | "advisors" | "students" | "alumni";
type StudentSubFilter = "all" | "enrolled" | "on_leave";
type SortKey = "enrollment" | "name" | "studentId";
type SortDir = "asc" | "desc";

function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function downloadCsv(filename: string, rows: string[][]) {
  const csv = rows.map((r) => r.map(csvEscape).join(",")).join("\n");
  // BOM for Excel
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function buildCsvRows(members: User[]): string[][] {
  // 화면 컬럼 + 직업유형별 세부 컬럼을 모두 포함한 와이드 테이블
  const header = [
    "입학시점", "이름", "학번", "핸드폰", "이메일", "직업유형",
    // 학교교사
    "[교사] 소속 교육청/학교", "[교사] 학교급", "[교사] 담당 과목",
    // 기업
    "[기업] 회사명", "[기업] 부서", "[기업] 직책", "[기업] 담당업무",
    // 연구소
    "[연구소] 기관명", "[연구소] 부서", "[연구소] 직책", "[연구소] 담당업무",
    // 공무원/공공기관/공기업
    "[공공] 기관명", "[공공] 부서", "[공공] 직책", "[공공] 담당업무",
    // 프리랜서
    "[프리] 활동분야", "[프리] 활동업무", "[프리] 대외직책", "[프리] 비고",
  ];
  const rows = members.map((m) => {
    const occ = m.occupation as OccupationType | undefined;
    const row: (string | number | undefined)[] = [
      formatEnrollment(m.enrollmentYear, m.enrollmentHalf),
      m.name,
      m.studentId ?? "",
      m.phone ?? "",
      m.contactEmail ?? m.email ?? "",
      occ ? OCCUPATION_LABELS[occ] : "",
      // 교사
      occ === "teacher" ? m.affiliation ?? "" : "",
      occ === "teacher" ? m.department ?? "" : "",
      occ === "teacher" ? m.position ?? "" : "",
      // 기업
      occ === "corporate" ? m.affiliation ?? "" : "",
      occ === "corporate" ? m.department ?? "" : "",
      occ === "corporate" ? m.position ?? "" : "",
      occ === "corporate" ? (m.corporateDuty as string | undefined) ?? "" : "",
      // 연구소
      occ === "researcher" ? m.affiliation ?? "" : "",
      occ === "researcher" ? m.department ?? "" : "",
      occ === "researcher" ? (m.researcherTitle as string | undefined) ?? "" : "",
      occ === "researcher" ? (m.researcherDuty as string | undefined) ?? "" : "",
      // 공공
      occ === "public" ? m.affiliation ?? "" : "",
      occ === "public" ? m.department ?? "" : "",
      occ === "public" ? (m.publicTitle as string | undefined) ?? "" : "",
      occ === "public" ? (m.publicDuty as string | undefined) ?? "" : "",
      // 프리랜서
      occ === "freelancer" ? m.affiliation ?? "" : "",
      occ === "freelancer" ? m.department ?? "" : "",
      occ === "freelancer" ? m.position ?? "" : "",
      occ === "freelancer" ? (m.freelancerNotes as string | undefined) ?? "" : "",
    ];
    return row.map((v) => (v === undefined ? "" : String(v)));
  });
  return [header, ...rows];
}

/**
 * 연락망 본체 — 공개(`/directory`)와 콘솔(`/console/directory`) 양쪽에서 사용.
 * variant 에 따라 외곽 컨테이너와 PageHeader 변형이 달라진다.
 * - public: 자체 `mx-auto max-w-6xl px-4 py-8 sm:py-14` 컨테이너 + PageHeader 공개 변형
 * - console: 콘솔 레이아웃이 이미 컨테이너 제공 → 외곽 패딩 제거 + PageHeader console 변형
 */
export function DirectoryContent({
  variant = "public",
}: { variant?: "public" | "console" } = {}) {
  const isConsole = variant === "console";
  const [activeTab, setActiveTab] = useState<Tab>("staff");
  const [studentSub, setStudentSub] = useState<StudentSubFilter>("all");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("enrollment");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const { user: viewer } = useAuthStore();

  // 운영진: staff + president
  const { members: staffMembers, isLoading: staffLoading } = useMembers({ role: "staff" });
  const { members: presidentMembers, isLoading: presLoading } = useMembers({ role: "president" });
  const { members: advisors, isLoading: advLoading } = useMembers({ role: "advisor" });
  const { members: regularMembers, isLoading: memLoading } = useMembers({ role: "member" });
  const { members: alumniMembers, isLoading: alumLoading } = useMembers({ role: "alumni" });

  const isLoading = staffLoading || presLoading || advLoading || memLoading || alumLoading;

  const baseList: User[] = useMemo(() => {
    let list: User[] = [];
    if (activeTab === "staff") list = [...presidentMembers, ...staffMembers];
    else if (activeTab === "advisors") list = advisors;
    else if (activeTab === "students") {
      list = regularMembers;
      if (studentSub !== "all") {
        list = list.filter((m) => (m.enrollmentStatus ?? "enrolled") === studentSub);
      }
    } else if (activeTab === "alumni") {
      // 졸업생: role === "alumni" OR enrollmentStatus === "graduated"
      list = [
        ...alumniMembers,
        ...regularMembers.filter((m) => m.enrollmentStatus === "graduated"),
      ];
      // dedupe by id
      const seen = new Set<string>();
      list = list.filter((m) => (seen.has(m.id) ? false : (seen.add(m.id), true)));
    }
    return list.map((m) => filterContactByVisibility(m, viewer));
  }, [activeTab, studentSub, presidentMembers, staffMembers, advisors, regularMembers, alumniMembers, viewer]);

  const filteredAndSorted = useMemo(() => {
    let list = baseList;
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((m) => {
        const hay = [
          m.name,
          m.studentId,
          m.email,
          m.contactEmail,
          m.phone,
          m.affiliation,
          m.department,
          m.position,
          m.occupation ? OCCUPATION_LABELS[m.occupation as OccupationType] : "",
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return hay.includes(q);
      });
    }
    const dir = sortDir === "asc" ? 1 : -1;
    const sorted = [...list].sort((a, b) => {
      if (sortKey === "name") return (a.name ?? "").localeCompare(b.name ?? "") * dir;
      if (sortKey === "studentId") return (a.studentId ?? "").localeCompare(b.studentId ?? "") * dir;
      // enrollment: yearHalf 기준
      const av = (a.enrollmentYear ?? 0) * 10 + (a.enrollmentHalf ?? 0);
      const bv = (b.enrollmentYear ?? 0) * 10 + (b.enrollmentHalf ?? 0);
      return (av - bv) * dir;
    });
    return sorted;
  }, [baseList, search, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "enrollment" ? "desc" : "asc");
    }
  }

  function handleCsvDownload() {
    const tabLabel =
      activeTab === "staff"
        ? "운영진"
        : activeTab === "advisors"
          ? "자문위원"
          : activeTab === "students"
            ? `재휴학생_${studentSub}`
            : "졸업생";
    const today = todayYmdLocal();
    downloadCsv(`연락망_${tabLabel}_${today}.csv`, buildCsvRows(filteredAndSorted));
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: "staff", label: "운영진" },
    { key: "advisors", label: "자문위원" },
    { key: "students", label: "재(휴)학생 회원" },
    { key: "alumni", label: "졸업생 회원" },
  ];

  const sortBtn = (k: SortKey, label: string) => (
    <button
      type="button"
      onClick={() => toggleSort(k)}
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium",
        sortKey === k ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/40"
      )}
      aria-label={`${label} 정렬`}
    >
      {label}
      <ArrowUpDown size={11} />
      {sortKey === k && <span className="text-[10px]">{sortDir === "asc" ? "↑" : "↓"}</span>}
    </button>
  );

  return (
    <div className={isConsole ? "" : "animate-in fade-in slide-in-from-bottom-2 duration-300 py-8 sm:py-14"}>
      <div className={isConsole ? "" : "mx-auto max-w-6xl px-4"}>
        <PageHeader
          variant={isConsole ? "console" : "public"}
          icon={Shield}
          title="연락망"
          description="학회원 연락처 정보를 확인하세요."
          actions={
            <Badge variant="secondary" className="gap-1">
              <Lock size={12} />
              학회원 전용
            </Badge>
          }
        />

        <Separator className="mt-6" />

        {/* Tabs */}
        <nav className="mt-6 flex gap-1 overflow-x-auto border-b" aria-label="연락망 분류">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => {
                setActiveTab(tab.key);
                setSearch("");
              }}
              aria-current={activeTab === tab.key ? "page" : undefined}
              className={cn(
                "flex flex-none items-center border-b-2 px-3 py-2 text-xs font-medium transition-colors sm:px-5 sm:py-2.5 sm:text-sm",
                activeTab === tab.key
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {/* 재(휴)학생 서브필터 */}
        {activeTab === "students" && (
          <div className="mt-4 flex flex-wrap gap-2">
            {(
              [
                { key: "all", label: "전체" },
                { key: "enrolled", label: "재학" },
                { key: "on_leave", label: "휴학" },
              ] as { key: StudentSubFilter; label: string }[]
            ).map((opt) => (
              <button
                key={opt.key}
                onClick={() => setStudentSub(opt.key)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs",
                  studentSub === opt.key
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:bg-muted/40"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}

        {/* 검색 + 정렬 + CSV */}
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="이름·학번·이메일·소속 검색"
              className="pl-9"
            />
          </div>
          <div className="flex items-center gap-1 rounded-lg border bg-card px-2 py-1">
            <span className="text-[11px] text-muted-foreground">정렬</span>
            {sortBtn("enrollment", "입학시점")}
            {sortBtn("name", "이름")}
            {sortBtn("studentId", "학번")}
          </div>
          <Button type="button" size="sm" variant="outline" onClick={handleCsvDownload}>
            <Download size={14} className="mr-1.5" />
            CSV 다운로드
          </Button>
        </div>

        {isLoading ? (
          <div className="mt-6 overflow-x-auto rounded-2xl border bg-card" aria-busy="true" aria-label="회원 명부 불러오는 중">
            <table className="w-full text-xs sm:text-sm">
              <thead className="border-b bg-muted/30">
                <tr>
                  {["입학시점", "이름", "학번", "핸드폰", "이메일", "직업유형"].map((h) => (
                    <th key={h} className="px-2 py-2 text-left font-medium sm:px-4 sm:py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 6 }).map((__, j) => (
                      <td key={j} className="px-2 py-2 sm:px-4 sm:py-3">
                        <Skeleton className="h-4 w-full max-w-[120px]" />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="mt-6">
            <p className="text-xs text-muted-foreground">
              총 {filteredAndSorted.length}명
              {search && ` · "${search}" 검색 결과`}
            </p>
            {filteredAndSorted.length === 0 ? (
              <EmptyState
                icon={Shield}
                title={search ? `"${search}"에 대한 결과 없음` : "표시할 회원이 없습니다"}
                description={
                  search
                    ? "키워드를 다시 확인하거나 검색을 초기화해보세요."
                    : "조건에 맞는 회원이 아직 등록되지 않았습니다."
                }
                {...(search ? { actionLabel: "검색 초기화", onAction: () => setSearch("") } : {})}
              />
            ) : (
              <div className="mt-3 overflow-x-auto rounded-2xl border bg-card">
                <table className="w-full text-xs sm:text-sm">
                  <thead className="border-b bg-muted/30">
                    <tr>
                      <th className="px-2 py-2 text-left font-medium sm:px-4 sm:py-3">입학시점</th>
                      <th className="px-2 py-2 text-left font-medium sm:px-4 sm:py-3">이름</th>
                      <th className="px-2 py-2 text-left font-medium sm:px-4 sm:py-3">학번</th>
                      <th className="px-2 py-2 text-left font-medium sm:px-4 sm:py-3">핸드폰</th>
                      <th className="px-2 py-2 text-left font-medium sm:px-4 sm:py-3">이메일</th>
                      <th className="px-2 py-2 text-left font-medium sm:px-4 sm:py-3">직업유형</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredAndSorted.map((m) => {
                      const mail = m.contactEmail || m.email;
                      const occ = m.occupation as OccupationType | undefined;
                      return (
                        <tr key={m.id}>
                          <td className="px-2 py-2 sm:px-4 sm:py-3 text-muted-foreground">
                            {formatEnrollment(m.enrollmentYear, m.enrollmentHalf)}
                          </td>
                          <td className="px-2 py-2 sm:px-4 sm:py-3 font-medium">{m.name}</td>
                          <td className="px-2 py-2 sm:px-4 sm:py-3 font-mono text-[11px] text-muted-foreground">
                            {m.studentId ?? "—"}
                          </td>
                          <td className="px-2 py-2 sm:px-4 sm:py-3">
                            {m.phone ? (
                              <a href={`tel:${m.phone}`} className="text-primary hover:underline">
                                {m.phone}
                              </a>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="px-2 py-2 sm:px-4 sm:py-3">
                            {mail ? (
                              <a
                                href={`mailto:${mail}`}
                                className="inline-flex items-center gap-1 text-primary hover:underline"
                              >
                                <Mail size={12} />
                                <span className="break-all">{mail}</span>
                              </a>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="px-2 py-2 sm:px-4 sm:py-3">
                            {occ ? (
                              <Badge variant="secondary" className="text-[11px]">
                                {occupationLabel(occ)}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function DirectoryPage() {
  return (
    <AuthGuard>
      <DirectoryContent variant="public" />
    </AuthGuard>
  );
}
