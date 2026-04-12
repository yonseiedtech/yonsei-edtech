"use client";

import { useState } from "react";
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
} from "lucide-react";

const STATUS_STYLES: Record<SeminarStatus, string> = {
  draft: "bg-gray-100 text-gray-500",
  upcoming: "bg-primary/10 text-primary",
  ongoing: "bg-amber-100 text-amber-700",
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

  const { data: registrations } = useQuery({
    queryKey: ["registrations", seminar.id],
    queryFn: async () => {
      const res = await registrationsApi.list(seminar.id);
      return res.data as unknown as { id: string }[];
    },
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

  if (!seminar) {
    return (
      <div className="py-16 text-center text-muted-foreground">
        세미나를 찾을 수 없습니다.
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
          <div className="mb-4 flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            <AlertCircle size={18} className="shrink-0" />
            <div>
              <p className="font-medium">참석 신청 후 이용 가능합니다</p>
              <p className="mt-0.5 text-xs text-amber-600">
                세미나에 참석 신청하시면 자료실, 후기 작성 등 모든 기능을 이용하실 수 있습니다.
              </p>
            </div>
          </div>
        )}

        <div className="rounded-2xl border bg-white">
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

          {/* 탭 콘텐츠 */}
          <div className="p-6">
            {activeTab === "overview" && <OverviewSection seminar={seminar} />}
            {activeTab === "materials" && <MaterialsSection seminar={seminar} />}
            {activeTab === "reviews" && <SeminarReviews seminar={seminar} />}
          </div>
        </div>
      </div>
    </div>
  );
}
