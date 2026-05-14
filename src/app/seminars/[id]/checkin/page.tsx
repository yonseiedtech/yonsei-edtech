"use client";

import { use, useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import AuthGuard from "@/features/auth/AuthGuard";
import QrScanner from "@/features/seminar/QrScanner";
import CheckinResultCard from "@/features/seminar/CheckinResult";
import CheckinDashboard from "@/features/seminar/CheckinDashboard";
import { useSeminar } from "@/features/seminar/useSeminar";
import { useSeminarStore } from "@/features/seminar/seminar-store";
import { useAuthStore } from "@/features/auth/auth-store";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowLeft, QrCode, UserCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CheckinResult } from "@/types";

type CheckinMode = "qr" | "self";

function CheckinContent({ id }: { id: string }) {
  const router = useRouter();
  const { user } = useAuthStore();
  const seminar = useSeminar(id);
  const checkinByToken = useSeminarStore((s) => s.checkinByToken);
  const checkinBySelfInfo = useSeminarStore((s) => s.checkinBySelfInfo);
  const loadAttendees = useSeminarStore((s) => s.loadAttendees);
  const loaded = useSeminarStore((s) => s.loaded);

  const [mode, setMode] = useState<CheckinMode>("qr");
  const [selfName, setSelfName] = useState("");
  const [selfStudentId, setSelfStudentId] = useState("");

  const unsubscribe = useSeminarStore((s) => s.unsubscribe);

  useEffect(() => {
    loadAttendees(id);
    return () => unsubscribe();
  }, [id, loadAttendees, unsubscribe]);

  const [lastResult, setLastResult] = useState<CheckinResult | null>(null);
  const [scanLog, setScanLog] = useState<Array<{ name: string; time: string; success: boolean; method: string }>>([]);

  function addToLog(name: string, success: boolean, method: string) {
    setScanLog((prev) => [
      {
        name,
        time: new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
        success,
        method,
      },
      ...prev,
    ].slice(0, 20));
  }

  const handleScan = useCallback(
    (token: string) => {
      if (!user) return;
      const result = checkinByToken(token, user.id);
      setLastResult(result);
      if (result.success) addToLog(result.attendee.userName, true, "QR");
    },
    [user, checkinByToken]
  );

  function handleSelfCheckin() {
    if (!user) return;
    if (!selfName.trim()) return;
    const result = checkinBySelfInfo(selfName.trim(), selfStudentId.trim(), user.id);
    setLastResult(result);
    if (result.success) {
      addToLog(result.attendee.userName, true, "셀프");
      setSelfName("");
      setSelfStudentId("");
    }
  }

  if (!seminar) {
    return (
      <div className="py-16 text-center text-muted-foreground">
        세미나를 찾을 수 없습니다.
      </div>
    );
  }

  if (!loaded) {
    return (
      <div className="py-16 text-center text-muted-foreground">
        참석자 정보를 불러오는 중...
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

        {/* 체크인 모드 탭 */}
        <div className="mt-4 flex gap-1 rounded-lg bg-muted/50 p-1">
          <button
            onClick={() => setMode("qr")}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-md px-4 py-2 text-sm font-medium transition-colors",
              mode === "qr" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <QrCode size={16} />
            QR 스캔
          </button>
          <button
            onClick={() => setMode("self")}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-md px-4 py-2 text-sm font-medium transition-colors",
              mode === "self" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <UserCheck size={16} />
            셀프 체크인
          </button>
        </div>

        {/* QR 스캐너 */}
        {mode === "qr" && (
          <div className="mt-4">
            <QrScanner onScan={handleScan} />
          </div>
        )}

        {/* 셀프 체크인 폼 */}
        {mode === "self" && (
          <div className="mt-4 rounded-2xl border bg-card p-5 space-y-3">
            <p className="text-xs text-muted-foreground">이름과 학번을 입력하여 출석 체크합니다.</p>
            <div>
              <label className="mb-1 block text-sm font-medium">이름 *</label>
              <Input
                value={selfName}
                onChange={(e) => setSelfName(e.target.value)}
                placeholder="홍길동"
                onKeyDown={(e) => e.key === "Enter" && handleSelfCheckin()}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">학번</label>
              <Input
                value={selfStudentId}
                onChange={(e) => setSelfStudentId(e.target.value)}
                placeholder="2025431009"
                onKeyDown={(e) => e.key === "Enter" && handleSelfCheckin()}
              />
            </div>
            <Button onClick={handleSelfCheckin} disabled={!selfName.trim()} className="w-full">
              <UserCheck size={16} className="mr-1" />
              출석 체크
            </Button>
          </div>
        )}

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
          <div className="mt-4 rounded-2xl border bg-card p-4">
            <h3 className="text-sm font-medium">최근 체크인</h3>
            <div className="mt-2 space-y-1">
              {scanLog.map((log, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{log.name}</span>
                    <span className={cn(
                      "rounded px-1.5 py-0.5 text-[10px] font-medium",
                      log.method === "QR" ? "bg-blue-50 text-blue-600" : "bg-green-50 text-green-600",
                    )}>
                      {log.method}
                    </span>
                  </div>
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
