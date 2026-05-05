"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import AuthGuard from "@/features/auth/AuthGuard";
import ConsolePageHeader from "@/components/admin/ConsolePageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GraduationCap, Search, Check, X, AlertCircle } from "lucide-react";
import { useAuthStore } from "@/features/auth/auth-store";
import { isAtLeast } from "@/lib/permissions";
import { alumniThesesApi, profilesApi } from "@/lib/bkend";
import type { AlumniThesis, User } from "@/types";

function ConsoleAlumniMappingContent() {
  const { user: viewer } = useAuthStore();
  const isStaff = isAtLeast(viewer, "staff");

  const [theses, setTheses] = useState<AlumniThesis[]>([]);
  const [members, setMembers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "unmapped" | "candidate" | "ambiguous" | "verified"
  >("unmapped");
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    if (!isStaff) return;
    let cancelled = false;
    (async () => {
      try {
        const [tRes, mRes] = await Promise.all([
          alumniThesesApi.list(),
          profilesApi.list({ limit: 1000 }),
        ]);
        if (cancelled) return;
        setTheses(tRes.data);
        setMembers(mRes.data);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "불러오지 못했습니다");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isStaff]);

  const candidatesByName = useMemo(() => {
    const map = new Map<string, User[]>();
    members.forEach((m) => {
      if (!m.name) return;
      const key = m.name.trim();
      const arr = map.get(key) ?? [];
      arr.push(m);
      map.set(key, arr);
    });
    return map;
  }, [members]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return theses.filter((t) => {
      if (statusFilter !== "all" && (t.authorMappingStatus ?? "unmapped") !== statusFilter) return false;
      if (!q) return true;
      const hay = [t.title, t.authorName, t.advisorName].filter(Boolean).join(" ").toLowerCase();
      return hay.includes(q);
    });
  }, [theses, search, statusFilter]);

  async function applyMapping(thesis: AlumniThesis, candidate: User) {
    if (savingId) return;
    setSavingId(thesis.id);
    try {
      await alumniThesesApi.update(thesis.id, {
        authorUserId: candidate.id,
        authorMappingStatus: "verified",
      });
      setTheses((prev) =>
        prev.map((t) =>
          t.id === thesis.id
            ? { ...t, authorUserId: candidate.id, authorMappingStatus: "verified" }
            : t
        )
      );
    } catch (e) {
      alert(e instanceof Error ? e.message : "매핑 실패");
    } finally {
      setSavingId(null);
    }
  }

  async function markStatus(
    thesis: AlumniThesis,
    status: "unmapped" | "ambiguous"
  ) {
    if (savingId) return;
    setSavingId(thesis.id);
    try {
      await alumniThesesApi.update(thesis.id, {
        authorMappingStatus: status,
        authorUserId: undefined,
      });
      setTheses((prev) =>
        prev.map((t) =>
          t.id === thesis.id
            ? { ...t, authorMappingStatus: status, authorUserId: undefined }
            : t
        )
      );
    } catch (e) {
      alert(e instanceof Error ? e.message : "업데이트 실패");
    } finally {
      setSavingId(null);
    }
  }

  if (!isStaff) {
    return (
      <div className="py-16">
        <div className="mx-auto max-w-3xl px-4">
          <p className="text-sm text-destructive">⚠ 운영진 권한이 필요합니다.</p>
        </div>
      </div>
    );
  }

  const stats = {
    total: theses.length,
    unmapped: theses.filter((t) => (t.authorMappingStatus ?? "unmapped") === "unmapped").length,
    verified: theses.filter((t) => t.authorMappingStatus === "verified").length,
    ambiguous: theses.filter((t) => t.authorMappingStatus === "ambiguous").length,
  };

  const filters: { key: typeof statusFilter; label: string; count: number }[] = [
    { key: "unmapped", label: "미매핑", count: stats.unmapped },
    { key: "ambiguous", label: "모호 (동명이인)", count: stats.ambiguous },
    { key: "verified", label: "확정", count: stats.verified },
    { key: "all", label: "전체", count: stats.total },
  ];

  return (
    <div className="py-12">
      <div className="mx-auto max-w-6xl px-4">
        <ConsolePageHeader
          icon={GraduationCap}
          title="졸업논문 회원 매핑"
          description="학위논문 저자명과 학회 회원을 연결합니다. 동명이인은 모호 처리하세요."
        />

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setStatusFilter(f.key)}
              className={`rounded-lg border px-3 py-3 text-left transition-colors ${
                statusFilter === f.key
                  ? "border-primary bg-primary/5"
                  : "border-border bg-card hover:bg-muted/30"
              }`}
            >
              <p className="text-xs text-muted-foreground">{f.label}</p>
              <p className="mt-0.5 text-xl font-bold">{f.count}</p>
            </button>
          ))}
        </div>

        <div className="mt-4 relative max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="저자명·논문제목·지도교수 검색"
            className="pl-9"
          />
        </div>

        {loading ? (
          <div className="mt-12 space-y-3" aria-busy="true" aria-label="졸업생 매핑 불러오는 중">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-xl" />
            ))}
          </div>
        ) : error ? (
          <p className="mt-12 text-sm text-destructive" role="alert">⚠ {error}</p>
        ) : filtered.length === 0 ? (
          <p className="mt-12 text-sm text-muted-foreground">표시할 항목이 없습니다.</p>
        ) : (
          <ul className="mt-6 space-y-3">
            {filtered.map((t) => {
              const candidates = candidatesByName.get(t.authorName.trim()) ?? [];
              const status = t.authorMappingStatus ?? "unmapped";
              return (
                <li key={t.id} className="rounded-xl border bg-card p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link
                        href={`/alumni/thesis/${t.id}`}
                        className="text-sm font-semibold hover:text-primary"
                        target="_blank"
                      >
                        {t.title}
                      </Link>
                      <p className="mt-1 text-xs text-muted-foreground">
                        저자 <span className="font-medium text-foreground/80">{t.authorName}</span>
                        {t.advisorName && ` · 지도 ${t.advisorName}`}
                        {t.awardedYearMonth && ` · ${t.awardedYearMonth}`}
                      </p>
                    </div>
                    <Badge
                      variant={
                        status === "verified"
                          ? "default"
                          : status === "ambiguous"
                            ? "destructive"
                            : "outline"
                      }
                      className="text-[10px]"
                    >
                      {status === "verified"
                        ? "확정"
                        : status === "ambiguous"
                          ? "모호"
                          : status === "candidate"
                            ? "후보"
                            : "미매핑"}
                    </Badge>
                  </div>

                  {candidates.length === 0 && status !== "verified" ? (
                    <div className="mt-3 flex items-center gap-2 rounded-md bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                      <AlertCircle size={12} />
                      이름이 일치하는 회원이 없습니다.
                    </div>
                  ) : status === "verified" && t.authorUserId ? (
                    <div className="mt-3 flex items-center justify-between rounded-md bg-emerald-50 px-3 py-2">
                      <span className="text-xs">
                        매핑됨 →{" "}
                        <Link
                          href={`/profile/${t.authorUserId}`}
                          className="font-medium text-primary hover:underline"
                          target="_blank"
                        >
                          {members.find((m) => m.id === t.authorUserId)?.name ?? t.authorName} 회원
                        </Link>
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={savingId === t.id}
                        onClick={() => markStatus(t, "unmapped")}
                      >
                        매핑 해제
                      </Button>
                    </div>
                  ) : (
                    <div className="mt-3 space-y-2">
                      <p className="text-[11px] text-muted-foreground">
                        후보 회원 {candidates.length}명
                      </p>
                      <ul className="space-y-1.5">
                        {candidates.map((c) => (
                          <li
                            key={c.id}
                            className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-muted/20 px-3 py-2"
                          >
                            <div className="text-xs">
                              <span className="font-medium">{c.name}</span>
                              {c.studentId && (
                                <span className="ml-2 font-mono text-[10px] text-muted-foreground">
                                  {c.studentId}
                                </span>
                              )}
                              {c.enrollmentYear && (
                                <span className="ml-2 text-[10px] text-muted-foreground">
                                  {c.enrollmentYear}년
                                  {c.enrollmentHalf === 1 ? " 전기" : c.enrollmentHalf === 2 ? " 후기" : ""}
                                </span>
                              )}
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={savingId === t.id}
                              onClick={() => applyMapping(t, c)}
                            >
                              <Check size={12} className="mr-1" /> 이 회원으로 확정
                            </Button>
                          </li>
                        ))}
                      </ul>
                      {candidates.length > 1 && status !== "ambiguous" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={savingId === t.id}
                          onClick={() => markStatus(t, "ambiguous")}
                        >
                          <X size={12} className="mr-1" /> 동명이인 — 모호 처리
                        </Button>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

export default function ConsoleAlumniMappingPage() {
  return (
    <AuthGuard>
      <ConsoleAlumniMappingContent />
    </AuthGuard>
  );
}
