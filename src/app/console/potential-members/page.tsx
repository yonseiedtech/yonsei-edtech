"use client";

/**
 * 운영 콘솔 — 잠재회원 (Potential Member) Phase A 뷰
 *
 * 대외 학술대회·세미나에 비회원(게스트)으로 등록한 인물을 한 화면에서 보고
 * 회원 가입 follow-up 에 활용한다. staff 전용 — PII 포함.
 */

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  UserPlus,
  Loader2,
  Sparkles,
  Globe,
  BookOpen,
  Flame,
  Mail,
  Phone,
  Link2,
  CheckCircle2,
} from "lucide-react";
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
  interestScore: number;
  daysSinceLastActivity: number | null;
}

interface ConvertedMember {
  studentId: string;
  name: string;
  joinedAt: string;
}

interface PotentialMembersResponse {
  potentialMembers: PotentialMember[];
  recentConversions: ConvertedMember[];
}

function formatDate(raw: string): string {
  if (!raw) return "-";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  return d.toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" });
}

/** 관심도 점수 → 가입 후보 우선순위 등급 (운영진 연락 우선순위 판단용) */
function interestTier(score: number): { label: string; className: string } {
  if (score >= 90)
    return {
      label: "매우 유력",
      className:
        "bg-destructive/10 text-destructive",
    };
  if (score >= 60)
    return {
      label: "유력",
      className:
        "bg-warning/10 text-warning",
    };
  if (score >= 30)
    return {
      label: "관심",
      className:
        "bg-info/10 text-info",
    };
  return {
    label: "기본",
    className: "bg-muted text-muted-foreground",
  };
}

/** 마지막 활동 경과일을 사람이 읽기 쉬운 형태로 */
function recencyLabel(days: number | null): string {
  if (days == null) return "";
  if (days <= 1) return "오늘";
  if (days <= 30) return `${days}일 전`;
  if (days <= 365) return `${Math.round(days / 30)}개월 전`;
  return `${Math.round(days / 365)}년+ 전`;
}

async function fetchPotentialMembers(): Promise<PotentialMembersResponse> {
  const token = await firebaseAuth.currentUser?.getIdToken();
  const res = await fetch("/api/console/potential-members", {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error ?? `HTTP ${res.status}`);
  }
  const data = (await res.json()) as PotentialMembersResponse;
  return {
    potentialMembers: data.potentialMembers ?? [],
    recentConversions: data.recentConversions ?? [],
  };
}

/** 가입 안내 메일 본문 — 이름·이력 건수를 채운 follow-up 템플릿 */
function buildInviteMailto(m: PotentialMember): string {
  const subject = "[연세대 교육공학] 회원 가입 안내";
  const origin =
    typeof window !== "undefined" ? window.location.origin : "";
  const body = [
    `${m.name}님, 안녕하세요. 연세대학교 교육대학원 교육공학전공 학회입니다.`,
    "",
    `학회 학술대회·세미나에 ${m.recordCount}회 참여해 주셔서 감사합니다.`,
    "회원으로 가입하시면 그동안의 참여 이력이 자동으로 연동되고,",
    "스터디·세미나·연구 지원 등 회원 전용 활동에 참여하실 수 있습니다.",
    "",
    `가입하기: ${origin}/signup`,
    "",
    "감사합니다.",
  ].join("\n");
  return `mailto:${m.email ?? ""}?subject=${encodeURIComponent(
    subject,
  )}&body=${encodeURIComponent(body)}`;
}

/** 팔로업 액션 버튼 — 메일·전화·가입링크 복사 */
function FollowUpActions({ m }: { m: PotentialMember }) {
  const inviteLink =
    typeof window !== "undefined" ? `${window.location.origin}/signup` : "/signup";

  async function copyInvite() {
    try {
      await navigator.clipboard.writeText(inviteLink);
      toast.success("가입 링크를 복사했습니다");
    } catch {
      toast.error("복사에 실패했습니다");
    }
  }

  const btn =
    "inline-flex h-7 w-7 items-center justify-center rounded-md border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40";

  return (
    <div className="flex items-center gap-1">
      <a
        href={m.email ? buildInviteMailto(m) : undefined}
        className={btn}
        aria-disabled={!m.email}
        title={m.email ? "가입 안내 메일 보내기" : "이메일 없음"}
        onClick={(e) => {
          if (!m.email) e.preventDefault();
        }}
      >
        <Mail size={14} />
      </a>
      <a
        href={m.phone ? `tel:${m.phone}` : undefined}
        className={btn}
        aria-disabled={!m.phone}
        title={m.phone ? "전화 걸기" : "연락처 없음"}
        onClick={(e) => {
          if (!m.phone) e.preventDefault();
        }}
      >
        <Phone size={14} />
      </a>
      <button type="button" className={btn} title="가입 링크 복사" onClick={copyInvite}>
        <Link2 size={14} />
      </button>
    </div>
  );
}

/** 관심도 등급 배지 */
function InterestBadge({ score }: { score: number }) {
  const tier = interestTier(score);
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${tier.className}`}
      title={`관심도 점수 ${score}`}
    >
      <Flame size={11} className="shrink-0" />
      {tier.label}
    </span>
  );
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

const EMPTY_RESPONSE: PotentialMembersResponse = {
  potentialMembers: [],
  recentConversions: [],
};

function PotentialMembersContent() {
  const [search, setSearch] = useState("");

  const { data = EMPTY_RESPONSE, isLoading, error } = useQuery({
    queryKey: ["console-potential-members"],
    queryFn: fetchPotentialMembers,
    staleTime: 60_000,
    retry: false,
  });

  const members = data.potentialMembers;
  const conversions = data.recentConversions;

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

      <div className="rounded-md border bg-info/5 p-4 text-sm text-info">
        <div className="flex items-start gap-2">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0" />
          <p className="leading-relaxed">
            대외 학술대회·세미나에 비회원으로 참여한 분들입니다. 회원 가입 시 학번으로
            활동 이력이 자동 연동됩니다. <strong>관심도</strong>가 높은(참여수·최근성·발표
            참여) 순으로 정렬되며, 각 행의 메일·전화·링크 버튼으로 바로 가입을 권유할 수 있습니다.
          </p>
        </div>
      </div>

      {/* 최근 30일 잠재회원 → 정회원 전환 사례 */}
      {!isLoading && !error && conversions.length > 0 && (
        <div className="rounded-md border border-success/20 bg-success/5 p-4">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-success">
                최근 30일 전환 성공 {conversions.length}명
              </p>
              <p className="mt-0.5 text-xs text-success/80">
                비회원으로 참여하다 정회원으로 가입한 분들입니다 —{" "}
                {conversions
                  .slice(0, 8)
                  .map((c) => c.name)
                  .join(", ")}
                {conversions.length > 8 ? ` 외 ${conversions.length - 8}명` : ""}
              </p>
            </div>
          </div>
        </div>
      )}

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
          className="rounded-md border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive"
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
                  <th className="px-3 py-2 text-left font-medium">관심도</th>
                  <th className="px-3 py-2 text-left font-medium">이름</th>
                  <th className="px-3 py-2 text-left font-medium">학번</th>
                  <th className="px-3 py-2 text-left font-medium">이메일</th>
                  <th className="px-3 py-2 text-left font-medium">연락처</th>
                  <th className="px-3 py-2 text-left font-medium">참여 건수</th>
                  <th className="px-3 py-2 text-left font-medium">최근 활동일</th>
                  <th className="px-3 py-2 text-left font-medium">참여 이력</th>
                  <th className="px-3 py-2 text-left font-medium">팔로업</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((m, i) => (
                  <tr key={`${m.studentId}-${m.name}-${i}`} className="border-t align-top">
                    <td className="px-3 py-2">
                      <InterestBadge score={m.interestScore} />
                    </td>
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
                    <td className="px-3 py-2 text-xs">
                      {formatDate(m.lastActivityDate)}
                      {m.daysSinceLastActivity != null && (
                        <span className="ml-1 text-muted-foreground">
                          ({recencyLabel(m.daysSinceLastActivity)})
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-1">
                        {m.records.map((rec, ri) => (
                          <RecordChip key={`${rec.kind}-${rec.id}-${ri}`} rec={rec} />
                        ))}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <FollowUpActions m={m} />
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
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <p className="truncate font-semibold">{m.name}</p>
                    <InterestBadge score={m.interestScore} />
                  </div>
                  <Badge variant="secondary" className="shrink-0">
                    {m.recordCount}건
                  </Badge>
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
                    <dd>
                      {formatDate(m.lastActivityDate)}
                      {m.daysSinceLastActivity != null && (
                        <span className="ml-1">({recencyLabel(m.daysSinceLastActivity)})</span>
                      )}
                    </dd>
                  </div>
                </dl>
                <div className="mt-2 flex flex-wrap gap-1">
                  {m.records.map((rec, ri) => (
                    <RecordChip key={`${rec.kind}-${rec.id}-${ri}`} rec={rec} />
                  ))}
                </div>
                <div className="mt-3 flex items-center justify-end border-t pt-2">
                  <FollowUpActions m={m} />
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
