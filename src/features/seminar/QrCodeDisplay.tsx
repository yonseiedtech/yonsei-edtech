"use client";

import { QRCodeSVG } from "qrcode.react";
import { CheckCircle } from "lucide-react";

interface Props {
  token?: string;
  size?: number;
  checkedIn?: boolean;
}

export default function QrCodeDisplay({ token, size = 200, checkedIn = false }: Props) {
  // QA-v3 H1: qrToken 미발급 레거시 참석 문서 방어 — undefined 렌더 크래시 방지
  if (!token) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-muted-foreground/30 p-6 text-center text-xs text-muted-foreground" style={{ width: size }}>
        QR 코드를 준비 중입니다.
        <br />잠시 후 새로고침해 주세요.
      </div>
    );
  }
  return (
    <div className="relative inline-flex flex-col items-center">
      <div className="rounded-2xl border-2 border-primary/20 bg-card p-3">
        <QRCodeSVG
          value={token}
          size={size}
          fgColor="#0a2e6c"
          level="M"
        />
      </div>
      <p className="mt-2 text-xs text-muted-foreground">세미나 출석 QR</p>
      {checkedIn && (
        <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-card/80">
          <div className="flex flex-col items-center gap-1">
            <CheckCircle size={40} className="text-success" />
            <span className="text-sm font-bold text-success">출석 완료</span>
          </div>
        </div>
      )}
    </div>
  );
}
