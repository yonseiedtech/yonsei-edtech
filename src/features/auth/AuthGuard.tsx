"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Clock, XCircle } from "lucide-react";
import { useAuth } from "./useAuth";
import { hasPermission } from "@/lib/permissions";
import { toast } from "sonner";
import type { UserRole } from "@/types";

interface Props {
  children: React.ReactNode;
  /** 접근 허용 역할 목록. 생략하면 로그인만 확인 */
  allowedRoles?: UserRole[];
  /** 레거시 호환용: true면 admin만 허용 */
  requireAdmin?: boolean;
}

export default function AuthGuard({ children, allowedRoles, requireAdmin }: Props) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const roles = requireAdmin ? (["admin", "sysadmin"] as UserRole[]) : allowedRoles;

  useEffect(() => {
    if (isLoading) return;

    if (!user) {
      if (typeof window !== "undefined") {
        // QA-v3 M: 쿼리스트링(?tab=…, ?compose=…)까지 보존해야 로그인 후 딥링크가 살아남는다
        sessionStorage.setItem("returnUrl", window.location.pathname + window.location.search);
      }
      router.push("/login");
      return;
    }

    if (roles && !hasPermission(user, roles)) {
      toast.error("접근 권한이 없습니다.");
      router.push("/");
    }
  }, [user, isLoading, roles, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) return null;
  if (roles && !hasPermission(user, roles)) return null;

  // A2(승인 게이트): 미승인 회원은 로그인 세션이 살아 있어도 회원 전용 영역 진입 차단.
  //  세션 강제 로그아웃 없이 화면 게이트만 적용(공개 페이지·게스트 접근은 AuthGuard 밖이라 불변).
  //  거절(rejected) 회원은 별도 안내(A5 정합).
  if (user.approved === false) {
    return <ApprovalGate rejected={user.rejected === true} />;
  }

  return <>{children}</>;
}

/** 미승인/거절 회원 진입 게이트 — 승인 대기 또는 반려 안내 + 문의 경로. */
function ApprovalGate({ rejected }: { rejected: boolean }) {
  if (rejected) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="w-full max-w-md space-y-4 rounded-2xl border bg-card p-8 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
            <XCircle size={28} className="text-destructive" />
          </div>
          <h2 className="text-lg font-bold">가입 신청이 반려되었습니다</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            제출하신 가입 신청이 승인되지 않았습니다. 자세한 사유나 재신청은 아래 경로로 문의해 주세요.
          </p>
          <p className="text-xs text-muted-foreground">
            문의:{" "}
            <a href="mailto:yonsei.edtech@gmail.com" className="font-medium text-primary hover:underline">
              yonsei.edtech@gmail.com
            </a>
          </p>
          <Link href="/" className="inline-block text-xs text-primary hover:underline">
            홈으로 돌아가기
          </Link>
        </div>
      </div>
    );
  }
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="w-full max-w-md space-y-4 rounded-2xl border bg-card p-8 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-warning/15">
          <Clock size={28} className="text-warning" />
        </div>
        <h2 className="text-lg font-bold">승인 대기 중</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          가입 신청이 접수되었으며 운영진 확인 후 승인됩니다. 승인 완료 후 회원 전용 기능을 이용하실 수 있습니다.
        </p>
        <p className="text-xs text-muted-foreground">평균 1~2 영업일 이내 처리됩니다.</p>
        <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
          <Link href="/about" className="rounded-full border px-3 py-1 text-xs hover:bg-muted">학회 소개</Link>
          <Link href="/card-news" className="rounded-full border px-3 py-1 text-xs hover:bg-muted">카드뉴스</Link>
          <Link href="/journal" className="rounded-full border px-3 py-1 text-xs hover:bg-muted">연구지</Link>
        </div>
        <p className="text-xs text-muted-foreground">
          문의:{" "}
          <a href="mailto:yonsei.edtech@gmail.com" className="font-medium text-primary hover:underline">
            yonsei.edtech@gmail.com
          </a>
        </p>
      </div>
    </div>
  );
}
