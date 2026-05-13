"use client";

import { Mail, MapPin, Clock, MessageCircle, ArrowRight, HelpCircle } from "lucide-react";
import Link from "next/link";
import ContactForm from "@/components/contact/ContactForm";
import PageHeader from "@/components/ui/page-header";
import ActionableBanner from "@/components/ui/actionable-banner";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useContactInfo } from "@/features/site-settings/useSiteContent";

/* ─────────────────────────────────────────────────────────
   연락처 정보 항목 타입
───────────────────────────────────────────────────────── */
interface ContactInfoItemProps {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}

function ContactInfoItem({ icon, label, children }: ContactInfoItemProps) {
  return (
    <div className="flex items-start gap-4">
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"
        aria-hidden
      >
        {icon}
      </div>
      <div className="min-w-0">
        <h3 className="text-sm font-semibold">{label}</h3>
        <div className="mt-0.5 text-sm text-muted-foreground">{children}</div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   연락처 정보 스켈레톤
───────────────────────────────────────────────────────── */
function ContactInfoSkeleton() {
  return (
    <div className="space-y-5" aria-label="연락처 정보 로딩 중">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-start gap-4">
          <Skeleton className="h-10 w-10 shrink-0 rounded-xl" />
          <div className="flex-1 space-y-2 pt-1">
            <Skeleton className="h-3.5 w-16" />
            <Skeleton className="h-3 w-44" />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   메인 페이지
───────────────────────────────────────────────────────── */
export default function ContactPage() {
  const { value: info, isLoading } = useContactInfo();

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 py-8 sm:py-14">
      <div className="mx-auto max-w-5xl px-4">

        {/* ── 페이지 헤더 ── */}
        <PageHeader
          icon={MessageCircle}
          title="문의하기"
          description="학회 운영·서비스에 대해 궁금한 점이 있으면 편하게 남겨주세요."
        />

        <Separator className="mt-6" />

        {/* ── /help FAQ 먼저 확인 유도 배너 ── */}
        <div className="mt-6">
          <ActionableBanner
            kind="info"
            title="혹시 자주 묻는 질문에서 해결되지 않으셨나요?"
            description="가입·디딤판·세미나·AI 포럼 등 자주 묻는 질문을 카테고리별로 정리해 두었습니다. 문의 전 먼저 확인하시면 바로 해결되는 경우가 많습니다."
            action={{ label: "도움말 FAQ 보기", href: "/help" }}
          />
        </div>

        {/* ── 2단 레이아웃: 연락처 정보 + 문의 폼 ── */}
        <div className="mt-8 grid gap-8 lg:grid-cols-5">

          {/* ── 좌: 연락처 정보 패널 ── */}
          <aside className="lg:col-span-2" aria-label="연락처 정보">
            <div className="rounded-2xl border bg-card p-6 shadow-sm">
              <h2 className="mb-5 text-base font-bold tracking-tight">연락처</h2>

              {isLoading ? (
                <ContactInfoSkeleton />
              ) : (
                <div className="space-y-5">
                  <ContactInfoItem
                    icon={<Mail size={18} />}
                    label="이메일"
                  >
                    {info.email}
                  </ContactInfoItem>

                  <ContactInfoItem
                    icon={<MapPin size={18} />}
                    label="위치"
                  >
                    <span className="whitespace-pre-line">{info.address}</span>
                  </ContactInfoItem>

                  <ContactInfoItem
                    icon={<Clock size={18} />}
                    label="정기 모임"
                  >
                    {info.meetingSchedule}
                  </ContactInfoItem>
                </div>
              )}

              {/* 구분선 */}
              <Separator className="my-5" />

              {/* 응답 안내 */}
              <div className="space-y-1.5 text-xs text-muted-foreground">
                <p className="flex items-center gap-1.5">
                  <span className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" aria-hidden />
                  운영진이 <span className="font-semibold text-foreground">24시간 이내</span> 답변 드립니다.
                </p>
                <p className="flex items-center gap-1.5">
                  <span className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" aria-hidden />
                  이메일로 답변 내용이 발송됩니다.
                </p>
              </div>

              {/* FAQ 링크 — 보조 */}
              <Link
                href="/help"
                className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-1 rounded-sm"
                aria-label="도움말 FAQ 페이지로 이동"
              >
                <HelpCircle size={12} aria-hidden />
                자주 묻는 질문 확인하기
                <ArrowRight size={11} aria-hidden />
              </Link>
            </div>
          </aside>

          {/* ── 우: 문의 폼 ── */}
          <main className="lg:col-span-3" aria-label="문의 작성 폼">
            <ContactForm />
          </main>
        </div>

      </div>
    </div>
  );
}
