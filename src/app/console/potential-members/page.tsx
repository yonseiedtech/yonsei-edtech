"use client";

/**
 * 운영 콘솔 — 잠재회원 (Potential Member) Phase A 뷰
 *
 * 대외 학술대회·세미나에 비회원(게스트)으로 등록한 인물을 한 화면에서 보고
 * 회원 가입 follow-up 에 활용한다. staff 전용 — PII 포함.
 */

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { UserPlus, Loader2, Sparkles, Globe, BookOpen } from "lucide-react";
import AuthGuard from "@/features/auth/AuthGuard";
import { auth as firebaseAuth } from "@/lib/firebase";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import EmptyState from "@/components/ui/empty-state";
import ConsolePageHeader from "@/components/admin/ConsolePageHeader";
import { EXTERNAL_PARTICIPANT_TYPE_LABELS } from "@/types";
import type { ExternalParticipantType } from "@/types";

interface PotentialRecord {
  kind: "activity" | "seminar";
  id: string;
  title: string;
  date: string;
  status?: string;
  participantType?: ExternalParticipantType;
}

interface PotentialMember {
  studentId: string;
  name: string;
  email?: string;
  phone?: string;
  recordCount: number;
  lastActivityDate: string;
  records: PotentialRecord[];
}

function formatDate(raw: string): string {
  if (!raw) return "-";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  return d.toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" });
}

async function fetchPotentialMembers(): Promise<PotentialMember[]> {
  const token = await firebaseAuth.currentUser?.getIdToken();
  const res = await fetch("/api/console/potential-members", {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error ?? `HTTP ${res.status}`);
  }
  const data = (await res.json()) as { potentialMembers: PotentialMember[] };
  return data.potentialMembers ?? [];
}

function RecordChip({ rec }: { rec: PotentialRecord }) {
  const Icon = rec.kind === "seminar" ? BookOpen : Globe;
  const typeLabel = rec.participantType
    ? EXTERNAL_PARTICIPANT_TYPE_LABELS[rec.participantType]
    : undefined;
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border bg-muted/30 px-2 py-0.5 text-[11px]"
      title={`${rec.title} (${formatDate(rec.date)})`}
    >
      <Icon size={11} className="shrink-0 text-muted-foreground" />
      <span className="max-w-[14rem] truncate">{rec.title}</span>
      {typeLabel && (
        <span className="rounded bg-primary/10 px-1 text-[10px] font-medium text-primary">
          {typeLabel}
        </span>
      )}
    </span>
  );
}

function PotentialMembersContent() {
  const [search, setSearch] = useState("");

  const { data: members = [], isLoading, error } = useQuery({
    queryKey: ["console-potential-members"],
    queryFn: fetchPotentialMembers,
    staleTime: 60_000,
    retry: false,
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return members;
    return members.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.studentId.toLowerCase().includes(q),
    );
  }, [members, search]);

  return (
    <div className="space-y-6">
      <ConsolePageHeader
        icon={UserPlus}
        title="잠재회원"
        description="대외 학술대회·세미나에 비회원으로 참여한 분들 — 가장 유력한 가입 후보입니다."
      />

      <div className="rounded-md border bg-blue-50 p-4 text-sm text-blue-900 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-100">
        <div className="flex items-start gap-2">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0" />
          <p className="leading-relaxed">
            대외 학술대회·세미나에 비회원으로 참여한 분들입니다. 회원 가입 시 학번으로
            활동 이력이 자동 연동됩니다.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="이름·학번 검색..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-60"
        />
        {!isLoading && !error && (
          <span className="text-xs text-muted-foreground">
            {filtered.length}/{members.length}명
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20 text-sm text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 잠재회원 집계 중…
        </div>
      ) : error ? (
        <div
          role="alert"
          className="rounded-md border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-200"
        >
          잠재회원 목록을 불러오지 못했습니다: {(error as Error).message}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={UserPlus}
          title={search ? "검색 결과가 없습니다" : "잠재회원이 없습니다"}
          description={
            search
              ? "이름·학번을 다시 확인해 주세요."
              : "대외 학술대회·세미나에 비회원으로 등록한 인물이 아직 없습니다."
          }
        />
      ) : (
        <>
          {/* 데스크톱 — 테이블 */}
          <div className="hidden overflow-x-auto rounded-2xl border bg-card lg:block">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">이름</th>
                  <th className="px-3 py-2 text-left font-medium">학번</th>
                  <th className="px-3 py-2 text-left font-medium">이메일</th>
                  <th className="px-3 py-2 text-left font-medium">연락처</th>
                  <th className="px-3 py-2 text-left font-medium">참여 건수</th>
                  <th className="px-3 py-2 text-left font-medium">최근 활동일</th>
                  <th className="px-3 py-2 text-left font-medium">참여 이력</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((m, i) => (
                  <tr key={`${m.studentId}-${m.name}-${i}`} className="border-t align-top">
                    <td className="px-3 py-2 font-medium">{m.name}</td>
                    <td className="px-3 py-2 font-mono text-xs">
                      {m.studentId || <span className="text-muted-foreground">-</span>}
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {m.email || <span className="text-muted-foreground">-</span>}
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {m.phone || <span className="text-muted-foreground">-</span>}
                    </td>
                    <td className="px-3 py-2">
                      <Badge variant="secondary">{m.recordCount}건</Badge>
                    </td>
                    <td className="px-3 py-2 text-xs">{formatDate(m.lastActivityDate)}</td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-1">
                        {m.records.map((rec, ri) => (
                          <RecordChip key={`${rec.kind}-${rec.id}-${ri}`} rec={rec} />
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 모바일 — 카드 */}
          <div className="space-y-3 lg:hidden">
            {filtered.map((m, i) => (
              <div
                key={`${m.studentId}-${m.name}-${i}`}
                className="rounded-2xl border bg-card p-4"
              >
                <div className="flex items-center justify-between">
                  <p className="font-semibold">{m.name}</p>
                  <Badge variant="secondary">{m.recordCount}건</Badge>
                </div>
                <dl className="mt-2 space-y-0.5 text-xs text-muted-foreground">
                  <div className="flex gap-2">
                    <dt className="w-16 shrink-0">학번</dt>
                    <dd className="font-mono">{m.studentId || "-"}</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="w-16 shrink-0">이메일</dt>
                    <dd className="break-all">{m.email || "-"}</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="w-16 shrink-0">연락처</dt>
                    <dd>{m.phone || "-"}</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="w-16 shrink-0">최근 활동</dt>
                    <dd>{formatDate(m.lastActivityDate)}</dd>
                  </div>
                </dl>
                <div className="mt-2 flex flex-wrap gap-1">
                  {m.records.map((rec, ri) => (
                    <RecordChip key={`${rec.kind}-${rec.id}-${ri}`} rec={rec} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function PotentialMembersPage() {
  return (
    <AuthGuard allowedRoles={["staff", "president", "admin", "sysadmin"]}>
      <PotentialMembersContent />
    </AuthGuard>
  );
}
