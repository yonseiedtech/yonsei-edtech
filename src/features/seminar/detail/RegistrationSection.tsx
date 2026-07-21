"use client";

import { useEffect } from "react";
import Link from "next/link";
import QrCodeDisplay from "@/features/seminar/QrCodeDisplay";
import { attendeesApi } from "@/lib/bkend";
import SeminarRegistrationForm from "@/features/seminar/SeminarRegistrationForm";
import SeminarCalendarCta from "@/features/seminar/detail/SeminarCalendarCta";
import { Button } from "@/components/ui/button";
import {
  UserPlus,
  UserCheck,
  ExternalLink,
  LogIn,
  Settings,
  Clock,
  XCircle,
  Users,
} from "lucide-react";
import type { Seminar, SeminarAttendee, SeminarStatus, User, WaitlistEntry } from "@/types";

interface Props {
  seminar: Seminar;
  computedStatus: SeminarStatus;
  user: User | null;
  isStaff: boolean;
  isAttending: boolean;
  isFull: boolean;
  myAttendee: SeminarAttendee | null;
  onToggle: () => void;
  onEditRegFields: () => void;
  onRegistered: () => void;
  waitlist?: WaitlistEntry[];
  myWaitlistEntry?: WaitlistEntry | null;
  onJoinWaitlist?: () => void;
  onCancelWaitlist?: () => void;
  isWaitlistLoading?: boolean;
}

export default function RegistrationSection({
  seminar,
  computedStatus,
  user,
  isStaff,
  isAttending,
  isFull,
  myAttendee,
  onToggle,
  onEditRegFields,
  onRegistered,
  waitlist = [],
  myWaitlistEntry,
  onJoinWaitlist,
  onCancelWaitlist,
  isWaitlistLoading,
}: Props) {
  return (
    <div className="mt-4 rounded-2xl border bg-card p-5 sm:mt-6 sm:p-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          <UserPlus size={16} />
          참석 신청
        </h2>
        {isStaff && (
          <button
            onClick={onEditRegFields}
            className="flex items-center gap-1 rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            title="신청 폼 설정"
          >
            <Settings size={14} />
            폼 설정
          </button>
        )}
      </div>

      {/* Participation snapshot — 신청 현황 한눈에 (회원 참석자 기준) */}
      {computedStatus === "upcoming" && (
        <div className="mb-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
          <Users size={15} className="text-muted-foreground" />
          <span className="font-medium text-foreground">
            신청 {seminar.attendeeIds?.length ?? 0}명
          </span>
          {seminar.maxAttendees != null && (
            <span className="text-muted-foreground">(정원 {seminar.maxAttendees}명)</span>
          )}
          {isFull && waitlist.length > 0 && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              대기 {waitlist.length}명
            </span>
          )}
        </div>
      )}

      {/* External registration button */}
      {seminar.registrationUrl && computedStatus === "upcoming" && (
        <div className="mb-4">
          <a href={seminar.registrationUrl} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" className="w-full sm:w-auto">
              <ExternalLink size={16} className="mr-1" />
              외부 신청 (Google Form 등)
            </Button>
          </a>
        </div>
      )}

      {/* Member attendance toggle (회원 전용) */}
      {computedStatus === "upcoming" && user && (
        <div className="mb-4">
          <p className="mb-2 text-xs font-medium text-muted-foreground">
            회원 참석 신청 (QR 출석 코드 발급)
          </p>
          <Button
            onClick={onToggle}
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
                회원 참석 신청
              </>
            )}
          </Button>
          {isFull && !isAttending && !myWaitlistEntry && (
            <div className="mt-3">
              <p className="text-xs text-destructive mb-2">
                정원이 마감되었습니다. {seminar.maxAttendees && `(${seminar.attendeeIds.length}/${seminar.maxAttendees}명)`}
              </p>
              {onJoinWaitlist && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onJoinWaitlist}
                  disabled={isWaitlistLoading}
                >
                  <Clock size={14} className="mr-1" />
                  대기열 등록 ({waitlist.length}명 대기 중)
                </Button>
              )}
            </div>
          )}
          {myWaitlistEntry && (
            <div className="mt-3 rounded-lg border border-warning/20 bg-warning/5 p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock size={16} className="text-warning" />
                  <span className="text-sm font-medium text-warning">
                    대기 순번 {myWaitlistEntry.position}번
                  </span>
                  <span className="text-xs text-warning">
                    (전체 {waitlist.length}명 대기 중)
                  </span>
                </div>
                {onCancelWaitlist && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onCancelWaitlist}
                    disabled={isWaitlistLoading}
                    className="h-7 text-xs text-destructive hover:text-destructive"
                  >
                    <XCircle size={14} className="mr-1" />
                    대기 취소
                  </Button>
                )}
              </div>
              <p className="mt-1 text-xs text-warning">자리가 생기면 자동으로 참가 확정되고 알림을 보내드립니다.</p>
            </div>
          )}
        </div>
      )}

      {/* Registration form (비회원 / 추가 정보 필요 시) */}
      {computedStatus === "upcoming" && (seminar.registrationFields?.length ?? 0) > 0 && (
        <div className={user ? "border-t pt-4 mt-4" : ""}>
          {user && (
            <p className="mb-2 text-xs font-medium text-muted-foreground">
              외부 참가자 신청 / 추가 정보 등록
            </p>
          )}
          <SeminarRegistrationForm
            seminarId={seminar.id}
            seminarTitle={seminar.title}
            fields={seminar.registrationFields}
            autoConvert={seminar.autoConvertRegistration}
            onSubmitted={onRegistered}
          />
        </div>
      )}

      {/* Login prompt */}
      {computedStatus === "upcoming" && !user && (
        <div className="mt-4 text-center">
          <Link href="/login">
            <Button variant="outline" className="w-full sm:w-auto">
              <LogIn size={16} className="mr-1" />
              로그인하면 QR 출석 등 회원 기능을 이용할 수 있습니다
            </Button>
          </Link>
        </div>
      )}

      {/* QR code */}
      {isAttending && myAttendee && computedStatus === "upcoming" && (
        <QrTokenSelfHeal attendee={myAttendee} />
      )}
      {isAttending && myAttendee && computedStatus === "upcoming" && (
        <div className="mt-6 border-t pt-6">
          <h3 className="mb-3 text-sm font-bold">내 출석 QR 코드</h3>
          <div className="flex justify-center">
            <QrCodeDisplay
              token={myAttendee.qrToken}
              size={180}
              checkedIn={myAttendee.checkedIn}
            />
          </div>
        </div>
      )}

      {/* Calendar add + reminder note — 신청 완료 상태 (Luma형 원페이지 강화) */}
      {isAttending && computedStatus === "upcoming" && (
        <SeminarCalendarCta seminar={seminar} />
      )}
    </div>
  );
}

/** QA-v3 H1: qrToken 발급 이전(레거시) 참석 문서에 토큰을 지연 발급 — store 구독으로 즉시 반영됨 */
function QrTokenSelfHeal({ attendee }: { attendee: SeminarAttendee }) {
  useEffect(() => {
    if (attendee.qrToken) return;
    void attendeesApi
      .update(attendee.id, { qrToken: crypto.randomUUID() })
      .catch(() => {});
  }, [attendee.id, attendee.qrToken]);
  return null;
}
