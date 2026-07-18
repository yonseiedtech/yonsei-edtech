"use client";

// ── 인쇄용 명함 화면 미리보기 (실제 90×50mm 비율, 2026-07-19) ──
//
// 인쇄 PDF(BusinessCardPrintPdfDocument)와 동일한 레이아웃을 화면에서 실제 비율로 보여준다.
// 색은 모두 인라인 style(brand-kit/print-card 의 hex 데이터) — 화면 미리보기라 다크모드 무관하게
// 인쇄물 그대로를 보여주기 위함(BusinessCard.tsx 와 동일한 의도적 라이트 고정).
// ※ 미리보기는 재단(90×50) 기준으로 보여줌(작업 여백/블리드는 인쇄소용 PDF 에만 포함).

import Image from "next/image";
import { QRCodeSVG } from "qrcode.react";
import type { User } from "@/types";
import {
  CARD_ASPECT,
  PRINT_CARD_COLORS,
  SOCIETY_NAME_EN,
  SOCIETY_NAME_KR,
  SOCIETY_TAGLINE,
  buildPrintCardLines,
  type PrintCardVariant,
} from "@/features/card/print-card";

interface PrintBusinessCardProps {
  user: User;
  variant: PrintCardVariant;
  showEmail: boolean;
  showPhone: boolean;
  showField: boolean;
  profileUrl: string;
  /** "back" 이면 뒷면 미리보기 렌더 */
  side?: "front" | "back";
}

export default function PrintBusinessCard({
  user,
  variant,
  showEmail,
  showPhone,
  showField,
  profileUrl,
  side = "front",
}: PrintBusinessCardProps) {
  const c = PRINT_CARD_COLORS[variant];
  const lines = buildPrintCardLines(user);

  const contacts: string[] = [];
  if (showEmail && lines.email) contacts.push(lines.email);
  if (showPhone && lines.phone) contacts.push(lines.phone);

  // 컴포넌트가 아닌 렌더 함수(직접 호출) — c(색) 클로저 참조 + react-hooks/static-components 회피.
  const renderEmblem = (size: number) => (
    <span
      className="flex items-center justify-center rounded-full"
      style={{ width: size, height: size, backgroundColor: c.emblemBadge }}
    >
      <Image
        src="/yonsei-emblem.svg"
        alt="연세교육공학회 엠블럼"
        width={size - 4}
        height={size - 4}
        style={{ width: size - 4, height: size - 4 }}
      />
    </span>
  );

  if (side === "back") {
    return (
      <div
        className="mx-auto flex w-full max-w-[360px] flex-col items-center justify-center overflow-hidden rounded-xl shadow-md ring-1 ring-black/10"
        style={{ aspectRatio: CARD_ASPECT, backgroundColor: c.bg }}
      >
        {renderEmblem(44)}
        <p className="mt-2 text-base font-bold tracking-wide" style={{ color: c.society }}>
          {SOCIETY_NAME_KR}
        </p>
        <p className="mt-1 text-[8px] tracking-wide" style={{ color: c.sub }}>
          {SOCIETY_NAME_EN}
        </p>
        <p className="mt-2 text-[10px]" style={{ color: c.accent }}>
          {SOCIETY_TAGLINE}
        </p>
      </div>
    );
  }

  return (
    <div
      className="mx-auto w-full max-w-[360px] overflow-hidden rounded-xl shadow-md ring-1 ring-black/10"
      style={{ aspectRatio: CARD_ASPECT, backgroundColor: c.bg }}
    >
      {/* 안전영역(≈8% 인셋) */}
      <div className="flex h-full w-full" style={{ padding: "7.5%" }}>
        {/* 좌측: 브랜드 / 이름 / 연락처 */}
        <div className="flex min-w-0 flex-1 flex-col justify-between pr-2">
          <div className="flex items-center gap-1.5">
            {renderEmblem(22)}
            <div className="min-w-0">
              <p className="truncate text-[11px] font-bold leading-tight" style={{ color: c.society }}>
                {SOCIETY_NAME_KR}
              </p>
              <p className="truncate text-[6px] leading-tight" style={{ color: c.sub }}>
                {SOCIETY_NAME_EN}
              </p>
            </div>
          </div>

          <div className="my-1">
            <p className="text-2xl font-bold leading-none" style={{ color: c.name }}>
              {user.name}
              {lines.generationLabel && (
                <span className="ml-1.5 text-[9px] font-normal" style={{ color: c.sub }}>
                  {lines.generationLabel}
                </span>
              )}
            </p>
            <span
              className="mt-1.5 mb-1.5 block rounded-full"
              style={{ width: 34, height: 2.5, backgroundColor: c.accent }}
            />
            {lines.position && (
              <p className="truncate text-[10px] font-semibold" style={{ color: c.name }}>
                {lines.position}
              </p>
            )}
            {lines.affiliationLine && (
              <p className="truncate text-[9px]" style={{ color: c.sub }}>
                {lines.affiliationLine}
              </p>
            )}
            {showField && user.field && (
              <p className="truncate text-[8px]" style={{ color: c.accent }}>
                #{user.field}
              </p>
            )}
          </div>

          <div className="space-y-0.5">
            {contacts.map((line) => (
              <p key={line} className="truncate text-[8.5px]" style={{ color: c.sub }}>
                {line}
              </p>
            ))}
          </div>
        </div>

        {/* 우측: QR */}
        <div className="flex flex-col items-center justify-center">
          <div className="rounded-md p-1" style={{ backgroundColor: c.qrBox }}>
            <QRCodeSVG value={profileUrl} size={54} level="M" fgColor={c.qrFg} bgColor={c.qrBox} />
          </div>
          <p className="mt-1 text-[6px]" style={{ color: c.sub }}>
            QR · 프로필
          </p>
        </div>
      </div>
    </div>
  );
}
