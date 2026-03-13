"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import AuthGuard from "@/features/auth/AuthGuard";
import { useSeminar, useToggleAttendance } from "@/features/seminar/useSeminar";
import { useAuthStore } from "@/features/auth/auth-store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Users,
  UserCheck,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

function SeminarDetail({ id }: { id: string }) {
  const router = useRouter();
  const { user } = useAuthStore();
  const seminar = useSeminar(id);
  const { toggleAttendance } = useToggleAttendance();

  if (!seminar) {
    return (
      <div className="py-16 text-center text-muted-foreground">
        세미나를 찾을 수 없습니다.
      </div>
    );
  }

  const isAttending = user ? seminar.attendeeIds.includes(user.id) : false;
  const isFull =
    seminar.maxAttendees != null &&
    seminar.attendeeIds.length >= seminar.maxAttendees;
  const canToggle = seminar.status === "upcoming" && user;

  function handleToggle() {
    if (!user) return;
    if (!isAttending && isFull) {
      toast.error("참석 인원이 가득 찼습니다.");
      return;
    }
    toggleAttendance(seminar!.id, user.id);
    toast.success(isAttending ? "참석이 취소되었습니다." : "참석 신청되었습니다.");
  }

  const statusMap = {
    upcoming: { label: "예정", className: "bg-primary/10 text-primary" },
    completed: { label: "완료", className: "bg-muted text-muted-foreground" },
    cancelled: { label: "취소", className: "bg-destructive/10 text-destructive" },
  };
  const badge = statusMap[seminar.status];

  return (
    <div className="py-16">
      <div className="mx-auto max-w-3xl px-4">
        <button
          onClick={() => router.push("/seminars")}
          className="mb-6 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft size={16} />
          목록으로
        </button>

        <div className="rounded-2xl border bg-white p-8">
          <div className="flex items-center gap-2">
            <Badge className={cn("text-xs", badge.className)} variant="secondary">
              {badge.label}
            </Badge>
          </div>

          <h1 className="mt-3 text-2xl font-bold">{seminar.title}</h1>

          <div className="mt-4 space-y-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Calendar size={16} />
              <span>
                {seminar.date} {seminar.time}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin size={16} />
              <span>{seminar.location}</span>
            </div>
            <div className="flex items-center gap-2">
              <Users size={16} />
              <span>
                참석 {seminar.attendeeIds.length}
                {seminar.maxAttendees ? ` / ${seminar.maxAttendees}` : ""}명
              </span>
            </div>
          </div>

          <div className="mt-6 rounded-lg bg-muted/50 p-4">
            <div className="text-sm font-medium">발표: {seminar.speaker}</div>
            {seminar.speakerBio && (
              <div className="mt-1 text-xs text-muted-foreground">
                {seminar.speakerBio}
              </div>
            )}
          </div>

          <div className="mt-6 whitespace-pre-wrap text-sm leading-relaxed">
            {seminar.description}
          </div>

          {canToggle && (
            <div className="mt-8 border-t pt-6">
              <Button
                onClick={handleToggle}
                variant={isAttending ? "outline" : "default"}
                className="w-full sm:w-auto"
              >
                {isAttending ? (
                  <>
                    <UserCheck size={16} className="mr-1" />
                    참석 취소
                  </>
                ) : (
                  <>
                    <UserPlus size={16} className="mr-1" />
                    참석 신청
                  </>
                )}
              </Button>
              {isFull && !isAttending && (
                <p className="mt-2 text-xs text-destructive">
                  인원이 가득 찼습니다.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SeminarDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return (
    <AuthGuard allowedRoles={["member", "alumni", "staff", "president", "admin"]}>
      <SeminarDetail id={id} />
    </AuthGuard>
  );
}
