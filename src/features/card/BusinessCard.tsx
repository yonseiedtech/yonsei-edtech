"use client";

import { forwardRef } from "react";
import Image from "next/image";
import { QRCodeSVG } from "qrcode.react";
import type { User } from "@/types";

interface BusinessCardProps {
  user: User;
  /** QR에 담을 URL (상대방 명함 보기 링크 or vCard URL) */
  qrValue: string;
  /** true면 '명함 교환' 태그를 숨김 (자기 카드 전용 토글) */
  hideExchangeHint?: boolean;
}

const BusinessCard = forwardRef<HTMLDivElement, BusinessCardProps>(
  function BusinessCard({ user, qrValue, hideExchangeHint }, ref) {
    const affiliationLine = [user.affiliation, user.department].filter(Boolean).join(" ");

    return (
      <div
        ref={ref}
        className="relative mx-auto w-[320px] overflow-hidden rounded-3xl bg-gradient-to-b from-white to-slate-50 shadow-xl ring-1 ring-slate-200"
        style={{ aspectRatio: "9 / 16" }}
      >
        {/* Top accent */}
        <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-br from-primary to-primary/70" />

        <div className="relative flex h-full flex-col px-6 pt-8 pb-6">
          {/* 학회 로고 + 엠블럼 */}
          <div className="flex items-center gap-2 text-white">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-card shadow-sm ring-1 ring-white/40">
              <Image src="/yonsei-emblem.svg" alt="연세대학교 엠블럼" width={22} height={22} className="h-5 w-5" />
            </div>
            <span className="text-xs font-semibold tracking-wide">연세교육공학회</span>
          </div>

          {/* 프로필 사진 */}
          <div className="mt-6 flex justify-center">
            <div className="relative h-24 w-24 overflow-hidden rounded-full bg-card ring-4 ring-white shadow-md">
              {user.profileImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.profileImage} alt={user.name} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-primary/10 text-3xl font-bold text-primary">
                  {user.name?.[0] ?? "?"}
                </div>
              )}
            </div>
          </div>

          {/* 이름 + 직함 */}
          <div className="mt-3 text-center">
            <h2 className="text-xl font-bold text-slate-900">{user.name}</h2>
            {user.position && <p className="mt-0.5 text-sm text-slate-600">{user.position}</p>}
            {affiliationLine && <p className="mt-0.5 text-xs text-slate-500">{affiliationLine}</p>}
          </div>

          {/* 연락처 */}
          <div className="mt-4 space-y-1 text-center text-xs text-slate-600">
            {user.contactEmail || user.email ? (
              <p className="truncate">{user.contactEmail ?? user.email}</p>
            ) : null}
            {user.phone ? <p>{user.phone}</p> : null}
            {user.field ? <p className="italic text-slate-500">#{user.field}</p> : null}
          </div>

          {/* QR */}
          <div className="mt-auto flex flex-col items-center gap-1.5 pt-4">
            <div className="rounded-xl bg-card p-2 shadow-sm ring-1 ring-slate-200">
              <QRCodeSVG value={qrValue} size={96} level="M" />
            </div>
            {!hideExchangeHint && (
              <p className="text-[10px] text-slate-400">QR 스캔 · 명함 교환</p>
            )}
          </div>
        </div>
      </div>
    );
  }
);

export default BusinessCard;
