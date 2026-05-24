"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Calendar, Copy, Check, RefreshCw, Download, ExternalLink, Lock, Globe } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { auth } from "@/lib/firebase";
import { profilesApi } from "@/lib/bkend";
import { useAuthStore } from "@/features/auth/auth-store";
import AuthGuard from "@/features/auth/AuthGuard";
import { Skeleton } from "@/components/ui/skeleton";
import type { User } from "@/types";

const SITE_ORIGIN =
  typeof window !== "undefined"
    ? window.location.origin
    : "https://yonsei-edtech.vercel.app";

const PUBLIC_ICS_URL = `${SITE_ORIGIN}/api/calendar/public.ics`;

function CalendarSyncContent() {
  const { user: authUser } = useAuthStore();
  const uid = authUser?.id ?? "";
  const qc = useQueryClient();

  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // 프로필에서 calendarToken 조회
  const { data: profile, isLoading } = useQuery({
    queryKey: ["mypage-user", uid],
    queryFn: async () => {
      const res = await profilesApi.get(uid);
      return res as unknown as User;
    },
    enabled: !!uid,
    staleTime: 30_000,
  });

  const calendarToken = profile?.calendarToken ?? null;
  const personalIcsUrl = calendarToken
    ? `${SITE_ORIGIN}/api/calendar/me.ics?token=${calendarToken}`
    : null;

  // 토큰 발급 / 재발급
  const generateToken = useMutation({
    mutationFn: async () => {
      const newToken = crypto.randomUUID();
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) throw new Error("로그인이 필요합니다.");
      await profilesApi.update(uid, { calendarToken: newToken } as Partial<User>);
      return newToken;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mypage-user", uid] });
      import("sonner").then(({ toast }) =>
        toast.success("개인 캘린더 토큰이 발급되었습니다."),
      );
    },
    onError: (e: Error) => {
      import("sonner").then(({ toast }) =>
        toast.error(`토큰 발급 실패: ${e.message}`),
      );
    },
  });

  async function copyToClipboard(text: string, key: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch {
      import("sonner").then(({ toast }) => toast.error("복사에 실패했습니다."));
    }
  }

  function downloadIcs(url: string, filename: string) {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      {/* 헤더 */}
      <div className="mb-6 flex items-center gap-3">
        <Link
          href="/mypage"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted"
          aria-label="마이페이지로 돌아가기"
        >
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-xl font-bold">캘린더 Sync</h1>
          <p className="text-xs text-muted-foreground">
            Google Calendar · Apple Calendar에 학회 일정을 구독합니다.
          </p>
        </div>
      </div>

      <div className="space-y-5">
        {/* ── 공개 학회 캘린더 ── */}
        <section className="rounded-2xl border bg-card p-5">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Globe size={18} />
            </div>
            <div>
              <h2 className="text-sm font-semibold">공개 학회 일정</h2>
              <p className="text-xs text-muted-foreground">세미나 · 학회 행사 — 누구나 구독 가능</p>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2">
            <code className="min-w-0 flex-1 truncate text-[11px] text-foreground/80">
              {PUBLIC_ICS_URL}
            </code>
            <button
              onClick={() => copyToClipboard(PUBLIC_ICS_URL, "public")}
              className="shrink-0 rounded p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="공개 캘린더 URL 복사"
              title="URL 복사"
            >
              {copiedKey === "public" ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
            </button>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={() => downloadIcs(PUBLIC_ICS_URL, "yonsei-edtech-public.ics")}
              className="inline-flex items-center gap-1.5 rounded-lg border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
            >
              <Download size={13} />
              .ics 다운로드
            </button>
            <a
              href={`https://calendar.google.com/calendar/r?cid=${encodeURIComponent(PUBLIC_ICS_URL)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
            >
              <ExternalLink size={13} />
              Google Calendar에 추가
            </a>
          </div>
        </section>

        {/* ── 개인 캘린더 ── */}
        <section className="rounded-2xl border bg-card p-5">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
              <Lock size={18} />
            </div>
            <div>
              <h2 className="text-sm font-semibold">내 개인 일정</h2>
              <p className="text-xs text-muted-foreground">
                내가 등록한 세미나 · 수강 수업 · 학술활동 — 토큰 인증 필요
              </p>
            </div>
          </div>

          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-8 w-40" />
            </div>
          ) : calendarToken && personalIcsUrl ? (
            <>
              <div className="flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2">
                <code className="min-w-0 flex-1 truncate text-[11px] text-foreground/80">
                  {personalIcsUrl}
                </code>
                <button
                  onClick={() => copyToClipboard(personalIcsUrl, "personal")}
                  className="shrink-0 rounded p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  aria-label="개인 캘린더 URL 복사"
                  title="URL 복사"
                >
                  {copiedKey === "personal" ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                </button>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  onClick={() => downloadIcs(personalIcsUrl, "yonsei-edtech-me.ics")}
                  className="inline-flex items-center gap-1.5 rounded-lg border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
                >
                  <Download size={13} />
                  .ics 다운로드
                </button>
                <a
                  href={`https://calendar.google.com/calendar/r?cid=${encodeURIComponent(personalIcsUrl)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
                >
                  <ExternalLink size={13} />
                  Google Calendar에 추가
                </a>
                <button
                  onClick={() => generateToken.mutate()}
                  disabled={generateToken.isPending}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-destructive/40 bg-card px-3 py-1.5 text-xs font-medium text-destructive transition-colors hover:bg-destructive/5 disabled:opacity-50"
                  title="기존 URL이 무효화됩니다"
                >
                  <RefreshCw size={13} className={generateToken.isPending ? "animate-spin" : ""} />
                  토큰 재발급
                </button>
              </div>

              <p className="mt-2 text-[11px] text-muted-foreground">
                재발급 시 기존 URL은 즉시 무효화됩니다. 구독 중인 외부 캘린더 URL도 교체해야 합니다.
              </p>
            </>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                개인 캘린더 토큰이 없습니다. 아래 버튼으로 발급하세요.
              </p>
              <button
                onClick={() => generateToken.mutate()}
                disabled={generateToken.isPending}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                <Calendar size={15} />
                {generateToken.isPending ? "발급 중…" : "개인 캘린더 토큰 발급"}
              </button>
            </div>
          )}
        </section>

        {/* ── 외부 캘린더 등록 안내 ── */}
        <section className="rounded-2xl border bg-muted/30 p-5">
          <h2 className="mb-3 text-sm font-semibold">외부 캘린더 등록 방법</h2>
          <div className="space-y-4">
            <div>
              <h3 className="mb-1 text-xs font-semibold text-foreground/80">Google Calendar</h3>
              <ol className="ml-4 list-decimal space-y-1 text-xs text-muted-foreground">
                <li>Google Calendar 웹 → 왼쪽 &ldquo;다른 캘린더&rdquo; 옆 <strong>+</strong> 클릭</li>
                <li>&ldquo;URL로 구독&rdquo; 선택</li>
                <li>위의 URL을 붙여넣고 <strong>캘린더 추가</strong></li>
                <li>또는 &ldquo;Google Calendar에 추가&rdquo; 버튼을 직접 클릭</li>
              </ol>
            </div>
            <div>
              <h3 className="mb-1 text-xs font-semibold text-foreground/80">Apple Calendar (macOS)</h3>
              <ol className="ml-4 list-decimal space-y-1 text-xs text-muted-foreground">
                <li>캘린더 앱 → 파일 → <strong>새 캘린더 구독</strong></li>
                <li>URL 입력 후 <strong>구독</strong></li>
              </ol>
            </div>
            <div>
              <h3 className="mb-1 text-xs font-semibold text-foreground/80">Apple Calendar (iPhone/iPad)</h3>
              <ol className="ml-4 list-decimal space-y-1 text-xs text-muted-foreground">
                <li>설정 → 캘린더 → 계정 → 계정 추가 → <strong>기타</strong></li>
                <li>&ldquo;캘린더 구독&rdquo; 탭 → URL 입력</li>
              </ol>
            </div>
            <div>
              <h3 className="mb-1 text-xs font-semibold text-foreground/80">.ics 직접 다운로드</h3>
              <p className="text-xs text-muted-foreground">
                구독 URL 대신 .ics 파일을 다운로드해 캘린더 앱에서 가져오기(Import)할 수 있습니다.
                단, 이 경우 이후 일정 변경 사항은 자동 반영되지 않습니다.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default function CalendarSyncPage() {
  return (
    <AuthGuard>
      <CalendarSyncContent />
    </AuthGuard>
  );
}
