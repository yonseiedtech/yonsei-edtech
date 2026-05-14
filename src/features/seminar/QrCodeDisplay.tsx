"use client";

import { QRCodeSVG } from "qrcode.react";
import { CheckCircle } from "lucide-react";

interface Props {
  token: string;
  size?: number;
  checkedIn?: boolean;
}

export default function QrCodeDisplay({ token, size = 200, checkedIn = false }: Props) {
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
            <CheckCircle size={40} className="text-green-600" />
            <span className="text-sm font-bold text-green-600">출석 완료</span>
          </div>
        </div>
      )}
    </div>
  );
}
