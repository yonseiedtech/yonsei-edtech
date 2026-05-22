"use client";

/**
 * 운영 콘솔 — 신청자 데이터 분리 마이그레이션 (1회성 도구).
 *
 * activities/{id}.applicants (공개 임베드) → activity_applicants/{id} (운영진 전용) 분리.
 * 1단계(copy): 모든 활동의 임베드 신청자를 비공개 문서로 복사 — 삭제 없음, 재실행 안전.
 * 2단계(delete): 비공개 문서로 복사가 검증된 활동만 임베드 applicants 필드 제거 → PII 노출 차단.
 */

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, DatabaseZap, Copy, ShieldCheck, AlertTriangle } from "lucide-react";
import AuthGuard from "@/features/auth/AuthGuard";
import { auth } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import ConsolePageHeader from "@/components/admin/ConsolePageHeader";

function MigratePageContent() {
  const [running, setRunning] = useState<"copy" | "delete" | null>(null);
  const [copyResult, setCopyResult] = useState<unknown>(null);
  const [deleteResult, setDeleteResult] = useState<unknown>(null);

  async function run(mode: "copy" | "delete") {
    if (
      mode === "delete" &&
      !confirm(
        "2단계: 비공개 문서로 복사가 검증된 활동의 공개 임베드 applicants 필드를 제거합니다.\n" +
          "반드시 1단계(복사)를 먼저 실행하고 결과를 확인한 뒤 진행하세요. 계속할까요?",
      )
    ) {
      return;
    }
    setRunning(mode);
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error("인증이 필요합니다. 다시 로그인해주세요.");
      const res = await fetch(`/api/admin/migrate-applicants?mode=${mode}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "마이그레이션에 실패했습니다.");
        return;
      }
      if (mode === "copy") setCopyResult(data);
      else setDeleteResult(data);
      toast.success(mode === "copy" ? "1단계(복사) 완료" : "2단계(임베드 제거) 완료");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "마이그레이션에 실패했습니다.");
    } finally {
      setRunning(null);
    }
  }

  return (
    <div className="space-y-6">
      <ConsolePageHeader
        icon={DatabaseZap}
        title="신청자 데이터 분리 마이그레이션"
        description="공개 활동 문서의 신청자 개인정보를 운영진 전용 비공개 문서로 이전합니다. (1회성 작업)"
      />

      <div className="rounded-md border bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
        <div className="flex items-start gap-2">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-semibold">실행 순서를 반드시 지켜주세요</p>
            <ol className="mt-1 list-decimal space-y-0.5 pl-4 text-xs">
              <li>1단계(복사)를 실행합니다 — 임베드 신청자를 비공개 문서로 복사합니다 (삭제 없음, 여러 번 실행해도 안전).</li>
              <li>결과를 확인하고, 활동 페이지·신청현황 탭이 정상 표시되는지 점검합니다.</li>
              <li>이상이 없으면 2단계(임베드 제거)를 실행합니다 — 복사가 검증된 활동만 공개 문서의 신청자 정보를 제거합니다.</li>
            </ol>
          </div>
        </div>
      </div>

      {/* 1단계 — 복사 */}
      <div className="rounded-md border bg-card p-4">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <Copy size={15} /> 1단계 — 비공개 문서로 복사
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          모든 활동의 임베드 applicants 를 activity_applicants 문서로 복사합니다. 공개 문서는 그대로 둡니다.
        </p>
        <Button type="button" size="sm" className="mt-3" onClick={() => run("copy")} disabled={running !== null}>
          {running === "copy" ? (
            <>
              <Loader2 className="mr-1 h-3 w-3 animate-spin" /> 복사 중…
            </>
          ) : (
            "1단계 실행 (복사)"
          )}
        </Button>
        {copyResult != null && (
          <pre className="mt-3 overflow-x-auto rounded bg-muted/50 p-3 text-xs">
            {JSON.stringify(copyResult, null, 2)}
          </pre>
        )}
      </div>

      {/* 2단계 — 임베드 제거 */}
      <div className="rounded-md border bg-card p-4">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <ShieldCheck size={15} /> 2단계 — 공개 문서에서 임베드 신청자 제거
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          비공개 문서로 복사가 검증된 활동만 공개 문서의 applicants 필드를 제거합니다. 이후 비회원에게 신청자
          개인정보가 노출되지 않습니다.
        </p>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="mt-3"
          onClick={() => run("delete")}
          disabled={running !== null}
        >
          {running === "delete" ? (
            <>
              <Loader2 className="mr-1 h-3 w-3 animate-spin" /> 제거 중…
            </>
          ) : (
            "2단계 실행 (임베드 제거)"
          )}
        </Button>
        {deleteResult != null && (
          <pre className="mt-3 overflow-x-auto rounded bg-muted/50 p-3 text-xs">
            {JSON.stringify(deleteResult, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
}

export default function MigrateApplicantsPage() {
  return (
    <AuthGuard allowedRoles={["admin", "sysadmin"]}>
      <MigratePageContent />
    </AuthGuard>
  );
}
