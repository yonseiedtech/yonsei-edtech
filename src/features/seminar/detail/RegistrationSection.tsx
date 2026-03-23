"use client";

import Link from "next/link";
import QrCodeDisplay from "@/features/seminar/QrCodeDisplay";
import SeminarRegistrationForm from "@/features/seminar/SeminarRegistrationForm";
import { Button } from "@/components/ui/button";
import {
  UserPlus,
  UserCheck,
  ExternalLink,
  LogIn,
  Settings,
} from "lucide-react";
import type { Seminar, SeminarAttendee, SeminarStatus, User } from "@/types";

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
}: Props) {
  return (
    <div className="mt-6 rounded-2xl border bg-white p-8">
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
          {isFull && !isAttending && (
            <p className="mt-2 text-xs text-destructive">인원이 가득 찼습니다.</p>
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
    </div>
  );
}
