"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Download,
  ShieldAlert,
  User,
  FileText,
  MessageSquare,
  BookOpen,
  Award,
  Bell,
  ClipboardList,
  Activity,
  Loader2,
} from "lucide-react";
import { auth } from "@/lib/firebase";
import { useAuthStore } from "@/features/auth/auth-store";
import { cn } from "@/lib/utils";
import { SEMANTIC } from "@/lib/design-tokens";
import AuthGuard from "@/features/auth/AuthGuard";
import PageContainer from "@/components/ui/page-container";

const DATA_CATEGORIES = [
  { icon: User, label: "프로필", description: "이름·이메일·학번·역할·연구 관심사 등" },
  { icon: ClipboardList, label: "학술활동 참여", description: "참여 중인 스터디·프로젝트·대외활동 신청 내역" },
  { icon: Award, label: "수료증·임명장", description: "발급된 모든 수료 및 참석확인 문서" },
  { icon: BookOpen, label: "연구 데이터", description: "논문 분석 노트·연구 보고서·계획서" },
  { icon: FileText, label: "게시글 · 댓글", description: "작성한 게시글 및 댓글 전체" },
  { icon: MessageSquare, label: "인터뷰 응답", description: "제출한 인터뷰 답변" },
  { icon: Activity, label: "수강 내역", description: "등록한 강좌 및 수강 기록" },
  { icon: Bell, label: "알림 (최대 500건)", description: "수신한 알림 목록" },
];

function DataExportContent() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDownload() {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) throw new Error("로그인이 필요합니다.");

      const res = await fetch("/api/me/export", {
        headers: { Authorization: `Bearer ${idToken}` },
      });

      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(json.error ?? `서버 오류 (${res.status})`);
      }

      const blob = await res.blob();
      const today = new Date().toISOString().slice(0, 10);
      const filename = `yonsei-edtech-data-${user.id}-${today}.json`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "알 수 없는 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <PageContainer width="narrow">
      {/* 헤더 */}
      <div className="mb-6 flex items-center gap-3">
        <Link
          href="/mypage?tab=settings"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted"
          aria-label="마이페이지로 돌아가기"
        >
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-xl font-bold">내 데이터 다운로드</h1>
          <p className="text-xs text-muted-foreground">
            GDPR 정보 이동권 — 본인의 학회 활동 데이터를 JSON 파일로 저장합니다.
          </p>
        </div>
      </div>

      <div className="space-y-5">
        {/* 포함 데이터 안내 */}
        <section className="rounded-2xl border bg-card p-5">
          <h2 className="mb-3 text-sm font-semibold">포함되는 데이터 ({DATA_CATEGORIES.length}개 카테고리)</h2>
          <ul className="divide-y">
            {DATA_CATEGORIES.map(({ icon: Icon, label, description }) => (
              <li key={label} className="flex items-start gap-3 py-2.5">
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon size={14} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium">{label}</p>
                  <p className="text-xs text-muted-foreground">{description}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* 개인정보 주의 안내 */}
        <div className={cn("flex items-start gap-3 rounded-2xl border p-4", SEMANTIC.warning.border, SEMANTIC.warning.bg)}>
          <ShieldAlert size={18} className={cn("mt-0.5 shrink-0", SEMANTIC.warning.accent)} />
          <div className="min-w-0">
            <p className={cn("text-sm font-semibold", SEMANTIC.warning.titleStrong)}>개인정보 보호 주의</p>
            <p className={cn("mt-0.5 text-xs", SEMANTIC.warning.textMuted)}>
              다운로드 파일에는 본인의 이름·이메일·학번·활동 기록 등 민감한 개인정보가 포함됩니다.
              제3자에게 공유하거나 공개 저장소에 업로드하지 마세요.
            </p>
          </div>
        </div>

        {/* 다운로드 버튼 */}
        <div className="rounded-2xl border bg-card p-5">
          <p className="mb-4 text-sm text-muted-foreground">
            버튼을 클릭하면 현재 계정({user?.email})의 데이터를 수집하여 JSON 파일로 다운로드합니다.
            데이터 크기에 따라 수 초가 소요될 수 있습니다.
          </p>

          {error && (
            <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={handleDownload}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                데이터 수집 중…
              </>
            ) : (
              <>
                <Download size={15} />
                내 데이터 다운로드
              </>
            )}
          </button>
        </div>

        {/* 삭제 요청 안내 */}
        <section className="rounded-2xl border bg-muted/30 p-5">
          <h2 className="mb-2 text-sm font-semibold">데이터 삭제 요청</h2>
          <p className="text-xs text-muted-foreground">
            계정 및 모든 데이터 삭제를 원하시면 마이페이지 설정 탭의{" "}
            <Link href="/mypage?tab=settings" className="font-medium text-primary hover:underline">
              회원 탈퇴
            </Link>{" "}
            섹션을 이용하거나, 운영진에게 직접 문의해 주세요.
          </p>
        </section>
      </div>
    </PageContainer>
  );
}

export default function DataExportPage() {
  return (
    <AuthGuard>
      <DataExportContent />
    </AuthGuard>
  );
}
