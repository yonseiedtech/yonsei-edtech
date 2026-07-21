"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  useSeminar,
} from "@/features/seminar/useSeminar";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/features/auth/auth-store";
import { isAtLeast } from "@/lib/permissions";
import { registrationsApi } from "@/lib/bkend";
import MaterialsSection from "@/features/seminar/MaterialsSection";
import SeminarReviews from "@/features/seminar/SeminarReviews";
import { getComputedStatus } from "@/lib/seminar-utils";
import { SEMINAR_STATUS_LABELS } from "@/types";
import type { SeminarStatus } from "@/types";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  Info,
  FolderOpen,
  MessageSquare,
  Calendar,
  MapPin,
  Users,
  AlertCircle,
  Mic,
  Link2,
  Copy,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import EmptyState from "@/components/ui/empty-state";

const STATUS_STYLES: Record<SeminarStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  upcoming: "bg-primary/10 text-primary",
  ongoing: "bg-warning/10 text-warning",
  completed: "bg-muted text-muted-foreground",
  cancelled: "bg-destructive/10 text-destructive",
};

type Tab = "overview" | "materials" | "reviews";

const TABS: { value: Tab; label: string; icon: React.ReactNode }[] = [
  { value: "overview", label: "개요", icon: <Info size={16} /> },
  { value: "materials", label: "자료실", icon: <FolderOpen size={16} /> },
  { value: "reviews", label: "세미나 후기", icon: <MessageSquare size={16} /> },
];

interface Props {
  seminarId: string;
}

function OverviewSection({ seminar }: { seminar: NonNullable<ReturnType<typeof useSeminar>> }) {
  const computed = getComputedStatus(seminar);

  const { user: lmsViewer } = useAuthStore();
  const canSeeRegistrations =
    !!lmsViewer &&
    (isAtLeast(lmsViewer, "staff") || (seminar.hostUserIds ?? []).includes(lmsViewer.id));
  const { data: registrations } = useQuery({
    queryKey: ["registrations", seminar.id],
    queryFn: async () => {
      const res = await registrationsApi.list(seminar.id);
      return res.data as unknown as { id: string }[];
    },
    // QA-v3 M: 룰상 staff/호스트/본인 전용 — 권한 없는 사용자의 반복 permission-denied 차단
    enabled: canSeeRegistrations,
  });
  const totalAttendees = seminar.attendeeIds.length + (registrations?.length ?? 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Badge className={cn("text-xs", STATUS_STYLES[computed])} variant="secondary">
          {SEMINAR_STATUS_LABELS[computed]}
        </Badge>
      </div>
      <h2 className="text-xl font-bold">{seminar.title}</h2>
      <div className="space-y-2 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <Calendar size={16} />
          <span>{seminar.date} {seminar.time}</span>
        </div>
        <div className="flex items-center gap-2">
          <MapPin size={16} />
          <span>{seminar.location}</span>
        </div>
        <div className="flex items-center gap-2">
          <Users size={16} />
          <span>
            참석 {totalAttendees}
            {seminar.maxAttendees ? ` / ${seminar.maxAttendees}` : ""}명
          </span>
        </div>
        <div className="flex items-start gap-2">
          <Mic size={16} className="mt-0.5 shrink-0" />
          <div>
            <span>{seminar.speaker}</span>
            {(seminar.speakerAffiliation || seminar.speakerPosition) && (
              <span className="text-xs text-muted-foreground/70">
                {" "}({[seminar.speakerAffiliation, seminar.speakerPosition].filter(Boolean).join(" · ")})
              </span>
            )}
            {seminar.speakerBio && (
              <p className="mt-1 text-xs leading-relaxed">{seminar.speakerBio}</p>
            )}
          </div>
        </div>
      </div>
      {seminar.description && (
        <div className="mt-4 whitespace-pre-wrap rounded-lg bg-muted/30 p-4 text-sm leading-relaxed">
          {seminar.description}
        </div>
      )}
    </div>
  );
}

export default function SeminarLMS({ seminarId }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const seminar = useSeminar(seminarId);
  const { user } = useAuthStore();
  const isStaff = isAtLeast(user, "staff");
  const isAttending = user ? (seminar?.attendeeIds ?? []).includes(user.id) : false;
  const hasAccess = isAttending || isStaff;

  // 연사 후기 링크 (staff 전용)
  const [speakerToken, setSpeakerToken] = useState<string | null>(seminar?.speakerReviewToken ?? null);
  const [generatingToken, setGeneratingToken] = useState(false);
  // seminar 비동기 로드 후 기존 토큰 동기화 — 기존 링크가 안 보여 재생성(링크 무효화)되는 버그 방지
  useEffect(() => {
    if (seminar?.speakerReviewToken) setSpeakerToken(seminar.speakerReviewToken);
  }, [seminar?.speakerReviewToken]);

  async function handleGenerateSpeakerLink() {
    if (!seminar) return;
    setGeneratingToken(true);
    try {
      const res = await fetch(`/api/seminars/${seminar.id}/speaker-token`, { method: "POST" });
      const data = await res.json();
      if (data.token) {
        setSpeakerToken(data.token);
        const url = `${window.location.origin}/seminars/${seminar.id}/speaker-review?token=${data.token}`;
        await navigator.clipboard.writeText(url);
        toast.success("연사 후기 링크가 생성되어 클립보드에 복사되었습니다.");
      }
    } catch {
      toast.error("링크 생성에 실패했습니다.");
    } finally {
      setGeneratingToken(false);
    }
  }

  function handleCopySpeakerLink() {
    if (!seminar || !speakerToken) return;
    const url = `${window.location.origin}/seminars/${seminar.id}/speaker-review?token=${speakerToken}`;
    navigator.clipboard.writeText(url);
    toast.success("연사 후기 링크가 클립보드에 복사되었습니다.");
  }

  function handleCopyAttendeeLink() {
    if (!seminar) return;
    // 참석자 후기는 토큰 불필요 — 이름·학번 인증 페이지로 바로 연결
    const url = `${window.location.origin}/seminars/${seminar.id}/review`;
    navigator.clipboard.writeText(url);
    toast.success("참석자 후기 링크가 클립보드에 복사되었습니다.");
  }

  if (!seminar) {
    return (
      <div className="py-8">
        <EmptyState compact title="세미나를 찾을 수 없습니다" />
      </div>
    );
  }

  return (
    <div className="py-16">
      <div className="mx-auto max-w-3xl px-4">
        <Link
          href={`/seminars/${seminarId}`}
          className="mb-6 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft size={16} />
          세미나 상세로 돌아가기
        </Link>

        {/* 미참석자 안내 */}
        {!hasAccess && (
          <div className="mb-4 flex items-center gap-3 rounded-2xl border border-warning/20 bg-warning/5 p-4 text-sm text-warning">
            <AlertCircle size={18} className="shrink-0" />
            <div>
              <p className="font-medium">참석 신청 후 이용 가능합니다</p>
              <p className="mt-0.5 text-xs text-warning">
                세미나에 참석 신청하시면 자료실, 후기 작성 등 모든 기능을 이용하실 수 있습니다.
              </p>
            </div>
          </div>
        )}

        {/* 연사 후기 링크 (staff 전용) */}
        {isStaff && (
          <div className="mb-4 rounded-2xl border border-cat-1/20 bg-cat-1/5 p-4">
            <h3 className="mb-2 flex items-center gap-2 text-sm font-medium">
              <Mic size={14} className="text-cat-1" />
              연사 후기 링크
            </h3>
            {speakerToken ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2">
                  <Link2 size={14} className="shrink-0 text-muted-foreground" />
                  <span className="flex-1 truncate text-xs text-muted-foreground">
                    /seminars/{seminar.id}/speaker-review?token={speakerToken.slice(0, 8)}...
                  </span>
                  <Button size="sm" variant="ghost" onClick={handleCopySpeakerLink} className="h-7 shrink-0 px-2">
                    <Copy size={12} className="mr-1" />
                    복사
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  이 링크를 연사에게 공유하면 별도 인증 없이 후기를 작성할 수 있습니다.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  연사에게 공유할 후기 작성 링크를 생성합니다.
                </p>
                <Button size="sm" onClick={handleGenerateSpeakerLink} disabled={generatingToken}>
                  {generatingToken ? <Loader2 size={14} className="mr-1 animate-spin" /> : <Link2 size={14} className="mr-1" />}
                  연사 후기 링크 생성
                </Button>
              </div>
            )}
          </div>
        )}

        {/* 참석자 후기 링크 (staff 전용) */}
        {isStaff && (
          <div className="mb-4 rounded-2xl border border-success/20 bg-success/5 p-4">
            <h3 className="mb-2 flex items-center gap-2 text-sm font-medium">
              <MessageSquare size={14} className="text-success" />
              참석자 후기 링크
            </h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2">
                <Link2 size={14} className="shrink-0 text-muted-foreground" />
                <span className="flex-1 truncate text-xs text-muted-foreground">
                  /seminars/{seminar.id}/review
                </span>
                <Button size="sm" variant="ghost" onClick={handleCopyAttendeeLink} className="h-7 shrink-0 px-2">
                  <Copy size={12} className="mr-1" />
                  복사
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                이 링크를 참석자에게 공유하면 이름·학번 인증 후 후기를 작성할 수 있습니다.
              </p>
            </div>
          </div>
        )}

        <div className="rounded-2xl border bg-card">
          {/* 탭 네비게이션 */}
          <div className="flex overflow-x-auto border-b">
            {TABS.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                className={cn(
                  "flex flex-none items-center gap-1.5 border-b-2 px-4 py-3 text-sm font-medium transition-colors",
                  activeTab === tab.value
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {/* 탭 콘텐츠 — 자료실·후기는 참석자/운영진만 (무단 열람 차단) */}
          <div className="p-6">
            {activeTab === "overview" && <OverviewSection seminar={seminar} />}
            {activeTab === "materials" &&
              (hasAccess ? (
                <MaterialsSection seminar={seminar} />
              ) : (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  자료실은 참석 신청 후 이용할 수 있습니다.
                </p>
              ))}
            {activeTab === "reviews" &&
              (hasAccess ? (
                <SeminarReviews seminar={seminar} />
              ) : (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  후기는 참석 신청 후 이용할 수 있습니다.
                </p>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}
