"use client";

import { use, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import AuthGuard from "@/features/auth/AuthGuard";
import QrScanner from "@/features/seminar/QrScanner";
import CheckinResultCard from "@/features/seminar/CheckinResult";
import CheckinDashboard from "@/features/seminar/CheckinDashboard";
import { useSeminar } from "@/features/seminar/useSeminar";
import { useSeminarStore } from "@/features/seminar/seminar-store"; // checkinByToken은 아직 store 사용 (QR 로컬 처리)
import { useAuthStore } from "@/features/auth/auth-store";
import { Button } from "@/components/ui/button";
import { ArrowLeft, QrCode } from "lucide-react";
import type { CheckinResult } from "@/types";

function CheckinContent({ id }: { id: string }) {
  const router = useRouter();
  const { user } = useAuthStore();
  const seminar = useSeminar(id);
  const checkinByToken = useSeminarStore((s) => s.checkinByToken);
  const [lastResult, setLastResult] = useState<CheckinResult | null>(null);
  const [scanLog, setScanLog] = useState<Array<{ name: string; time: string; success: boolean }>>([]);

  const handleScan = useCallback(
    (token: string) => {
      if (!user) return;
      const result = checkinByToken(token, user.id);
      setLastResult(result);

      if (result.success) {
        setScanLog((prev) => [
          {
            name: result.attendee.userName,
            time: new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
            success: true,
          },
          ...prev,
        ].slice(0, 10));
      }
    },
    [user, checkinByToken]
  );

  if (!seminar) {
    return (
      <div className="py-16 text-center text-muted-foreground">
        세미나를 찾을 수 없습니다.
      </div>
    );
  }

  return (
    <div className="py-16">
      <div className="mx-auto max-w-lg px-4">
        <button
          onClick={() => router.push(`/seminars/${id}`)}
          className="mb-4 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft size={16} />
          세미나로 돌아가기
        </button>

        <div className="flex items-center gap-2">
          <QrCode size={24} className="text-primary" />
          <h1 className="text-xl font-bold">출석 체크</h1>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{seminar.title}</p>

        {/* QR 스캐너 */}
        <div className="mt-4">
          <QrScanner onScan={handleScan} />
        </div>

        {/* 스캔 결과 */}
        {lastResult && (
          <div className="mt-3">
            <CheckinResultCard
              result={lastResult}
              onDismiss={() => setLastResult(null)}
            />
          </div>
        )}

        {/* 최근 체크인 로그 */}
        {scanLog.length > 0 && (
          <div className="mt-4 rounded-xl border bg-white p-4">
            <h3 className="text-sm font-medium">최근 체크인</h3>
            <div className="mt-2 space-y-1">
              {scanLog.map((log, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between text-xs"
                >
                  <span className="font-medium">{log.name}</span>
                  <span className="text-muted-foreground">{log.time}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 출석 현황 */}
        <div className="mt-6">
          <CheckinDashboard seminarId={id} />
        </div>
      </div>
    </div>
  );
}

export default function CheckinPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return (
    <AuthGuard allowedRoles={["staff", "president", "admin"]}>
      <CheckinContent id={id} />
    </AuthGuard>
  );
}
