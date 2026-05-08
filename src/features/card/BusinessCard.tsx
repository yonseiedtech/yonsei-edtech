"use client";

import { forwardRef } from "react";
import Image from "next/image";
import { QRCodeSVG } from "qrcode.react";
import type { User } from "@/types";
import { SCHOOL_LEVEL_LABELS } from "@/types";

interface BusinessCardProps {
  user: User;
  /** QR에 담을 URL (상대방 명함 보기 링크 or vCard URL) */
  qrValue: string;
  /** true면 '명함 교환' 태그를 숨김 (자기 카드 전용 토글) */
  hideExchangeHint?: boolean;
}

function formatPhone(raw: string | undefined): string {
  if (!raw) return "";
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 11) return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  if (digits.length === 10) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  return raw;
}

const BusinessCard = forwardRef<HTMLDivElement, BusinessCardProps>(
  function BusinessCard({ user, qrValue, hideExchangeHint }, ref) {
    // Sprint 67: occupation 인지 + 중복 제거 (legacy 데이터에서 affiliation == department 이거나
    // 교사 직군에서 학교명이 두 번 들어가는 케이스 방지).
    const affiliationLine = (() => {
      const parts: string[] = [];
      if (user.occupation === "teacher") {
        // 교사: [교육청] · [학교급] [학교명]
        if (user.affiliationOffice) parts.push(user.affiliationOffice);
        const schoolBlock: string[] = [];
        if (user.schoolLevel) schoolBlock.push(SCHOOL_LEVEL_LABELS[user.schoolLevel]);
        if (user.affiliation) schoolBlock.push(user.affiliation);
        if (schoolBlock.length > 0) parts.push(schoolBlock.join(" "));
      } else {
        if (user.affiliation) parts.push(user.affiliation);
        if (user.department && user.department !== user.affiliation) {
          parts.push(user.department);
        }
      }
      return parts.join(" · ");
    })();

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
            <Image
              src="/logo-text.png"
              alt="연세교육공학회"
              width={200}
              height={40}
              className="h-8 w-auto brightness-0 invert"
            />
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

          {/* 이름 + 소속 + 직함 (Sprint 67-G: 순서 변경 — 이름→소속→직함) */}
          <div className="mt-3 text-center">
            <h2 className="text-xl font-bold text-slate-900">{user.name}</h2>
            {affiliationLine && <p className="mt-0.5 text-sm text-slate-600">{affiliationLine}</p>}
            {user.position && <p className="mt-0.5 text-xs text-slate-500">{user.position}</p>}
          </div>

          {/* 연락처 */}
          <div className="mt-4 space-y-1 text-center text-xs text-slate-600">
            {user.contactEmail || user.email ? (
              <p className="truncate">{user.contactEmail ?? user.email}</p>
            ) : null}
            {user.phone ? <p>{formatPhone(user.phone)}</p> : null}
            {user.field ? <p className="italic text-slate-500">#{user.field}</p> : null}
          </div>

          {/* 관심 분야 키워드 */}
          {user.interestKeywords && user.interestKeywords.length > 0 && (
            <div className="mt-3 flex flex-wrap justify-center gap-1">
              {user.interestKeywords.slice(0, 6).map((kw) => (
                <span
                  key={kw}
                  className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary"
                >
                  {kw}
                </span>
              ))}
            </div>
          )}

          {/* 관심 연구 주제 (첫 번째 1개, 축약) */}
          {user.researchTopics && user.researchTopics.length > 0 && (
            <p className="mt-2 line-clamp-2 text-center text-[10px] leading-relaxed text-slate-500 px-1">
              {user.researchTopics[0]}
            </p>
          )}

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
