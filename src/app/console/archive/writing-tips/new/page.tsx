"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useAuthStore } from "@/features/auth/auth-store";
import { isAtLeast } from "@/lib/permissions";
import WritingTipForm from "@/components/archive/WritingTipForm";

/**
 * 글쓰기 팁 신규 등록 폼 (v13-H2: ?title=...&url=... 프리필 지원).
 * 해커톤 "아카이브 산출물로 등록" 딥링크에서 제목·URL을 자동 채워 착지한다.
 */
function WritingTipsNewContent() {
  const { user } = useAuthStore();
  const allowed = isAtLeast(user, "staff");
  const sp = useSearchParams();
  const prefillTitle = sp.get("title") ?? undefined;
  const prefillUrl = sp.get("url") ?? undefined;

  if (!allowed || !user) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground">접근 권한이 없습니다 (staff 이상).</p>
      </div>
    );
  }

  const hasPrefill = !!(prefillTitle || prefillUrl);

  return (
    <WritingTipForm
      initial={null}
      userId={user.id}
      prefill={hasPrefill ? { title: prefillTitle, url: prefillUrl } : undefined}
    />
  );
}

export default function ConsoleWritingTipsNewPage() {
  return (
    <Suspense>
      <WritingTipsNewContent />
    </Suspense>
  );
}
