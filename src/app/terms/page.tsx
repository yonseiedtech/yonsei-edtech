import type { Metadata } from "next";
import { CURRENT_TERMS } from "@/lib/legal";
import { ScrollText } from "lucide-react";
import PageHeader from "@/components/ui/page-header";
import InlineNotification from "@/components/ui/inline-notification";
import { Separator } from "@/components/ui/separator";

export const TERMS_VERSION = CURRENT_TERMS.terms;

export const metadata: Metadata = {
  title: "서비스 이용약관",
  description: "연세교육공학회 서비스 이용약관",
};

const TOC_ITEMS = [
  { id: "purpose", label: "제1조 목적" },
  { id: "definitions", label: "제2조 정의" },
  { id: "effect", label: "제3조 효력·개정" },
  { id: "signup", label: "제4조 회원가입" },
  { id: "service", label: "제5조 서비스 제공" },
  { id: "obligations", label: "제6조 이용자 의무" },
  { id: "posts", label: "제7조 게시물 관리" },
  { id: "disclaimer", label: "제8조 면책조항" },
  { id: "jurisdiction", label: "제9조 준거법·관할" },
  { id: "addendum", label: "부칙" },
];

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:py-14">
      {/* Page Header */}
      <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
        <PageHeader
          icon={ScrollText}
          title="서비스 이용약관"
          description="연세교육공학회 웹사이트 및 관련 서비스 이용에 관한 약관입니다."
        />
      </div>

      {/* Version badge */}
      <div className="mt-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
        <InlineNotification
          kind="info"
          title={`현행 버전 ${TERMS_VERSION} · 시행일: 2026년 4월 15일`}
          description="본 약관은 서비스 이용에 관한 권리·의무 및 책임사항을 규정합니다. 회원가입 또는 서비스 이용 시 본 약관에 동의한 것으로 간주됩니다."
        />
      </div>

      <Separator className="my-8" />

      <div className="flex gap-10">
        {/* Sticky Table of Contents — 데스크톱만 표시 */}
        <aside className="hidden w-48 shrink-0 lg:block">
          <div className="sticky top-24">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              목차
            </p>
            <nav aria-label="서비스 이용약관 목차">
              <ol className="space-y-1">
                {TOC_ITEMS.map((item) => (
                  <li key={item.id}>
                    <a
                      href={`#terms-${item.id}`}
                      className="block rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground focus-visible:ring-2"
                    >
                      {item.label}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
          </div>
        </aside>

        {/* Main content */}
        <main
          className="min-w-0 flex-1 animate-in fade-in slide-in-from-bottom-2 duration-500"
          aria-label="서비스 이용약관 본문"
        >
          <div className="space-y-10 text-sm leading-relaxed text-foreground sm:text-base">

            <section id="terms-purpose" aria-labelledby="terms-heading-purpose">
              <h2
                id="terms-heading-purpose"
                className="mb-3 flex items-center gap-2 text-base font-semibold tracking-tight sm:text-lg"
              >
                <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  1
                </span>
                제1조 (목적)
              </h2>
              <p className="text-foreground/90">
                본 약관은 연세교육공학회(이하 &ldquo;학회&rdquo;)가 운영하는 웹사이트 및 관련 서비스(이하
                &ldquo;서비스&rdquo;)의 이용과 관련하여 학회와 이용자 간의 권리, 의무 및 책임사항,
                기타 필요한 사항을 규정함을 목적으로 합니다.
              </p>
            </section>

            <Separator />

            <section id="terms-definitions" aria-labelledby="terms-heading-definitions">
              <h2
                id="terms-heading-definitions"
                className="mb-3 flex items-center gap-2 text-base font-semibold tracking-tight sm:text-lg"
              >
                <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  2
                </span>
                제2조 (정의)
              </h2>
              <ol className="ml-4 list-decimal space-y-1.5 text-foreground/90 marker:text-primary/60">
                <li>&ldquo;이용자&rdquo;란 서비스에 접속하여 본 약관에 따라 서비스를 이용하는 회원 및 비회원을 말합니다.</li>
                <li>&ldquo;회원&rdquo;이란 학회에 가입신청을 하고 승인된 자로서, 서비스를 지속적으로 이용할 수 있는 자를 말합니다.</li>
                <li>&ldquo;게시물&rdquo;이란 이용자가 서비스를 이용함에 있어 서비스상에 게시한 문자, 사진, 파일 등의 정보를 말합니다.</li>
              </ol>
            </section>

            <Separator />

            <section id="terms-effect" aria-labelledby="terms-heading-effect">
              <h2
                id="terms-heading-effect"
                className="mb-3 flex items-center gap-2 text-base font-semibold tracking-tight sm:text-lg"
              >
                <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  3
                </span>
                제3조 (약관의 효력 및 개정)
              </h2>
              <ol className="ml-4 list-decimal space-y-1.5 text-foreground/90 marker:text-primary/60">
                <li>본 약관은 서비스 화면에 게시하거나 기타의 방법으로 공지함으로써 효력을 발생합니다.</li>
                <li>학회는 필요한 경우 관련 법령을 위배하지 않는 범위에서 본 약관을 개정할 수 있습니다.</li>
                <li>약관이 개정되는 경우 학회는 개정 내용과 적용일자를 명시하여 서비스 내에서 최소 7일 전부터 공지합니다.</li>
                <li>개정 약관은 이용자가 재동의 절차를 거친 후부터 적용되며, 이용자가 명시적으로 거부 의사를 표명하는 경우 회원 탈퇴를 요청할 수 있습니다.</li>
              </ol>
            </section>

            <Separator />

            <section id="terms-signup" aria-labelledby="terms-heading-signup">
              <h2
                id="terms-heading-signup"
                className="mb-3 flex items-center gap-2 text-base font-semibold tracking-tight sm:text-lg"
              >
                <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  4
                </span>
                제4조 (회원가입)
              </h2>
              <ol className="ml-4 list-decimal space-y-1.5 text-foreground/90 marker:text-primary/60">
                <li>이용자는 학회가 정한 양식에 따라 회원정보를 기입하고 본 약관 및 개인정보처리방침에 동의함으로써 회원가입을 신청합니다.</li>
                <li>학회는 신청자에 대해 승인 절차를 거쳐 회원자격을 부여하며, 학술활동 목적에 부합하지 않는 경우 가입을 거절할 수 있습니다.</li>
              </ol>
            </section>

            <Separator />

            <section id="terms-service" aria-labelledby="terms-heading-service">
              <h2
                id="terms-heading-service"
                className="mb-3 flex items-center gap-2 text-base font-semibold tracking-tight sm:text-lg"
              >
                <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  5
                </span>
                제5조 (서비스의 제공 및 변경)
              </h2>
              <p className="mb-3 text-muted-foreground">학회는 다음과 같은 서비스를 제공합니다.</p>
              <ul className="ml-4 list-disc space-y-1.5 text-foreground/90 marker:text-primary/60">
                <li>세미나·학술활동 안내 및 신청</li>
                <li>회원 간 커뮤니티 및 자료실</li>
                <li>수료증·감사장 발급</li>
                <li>학회 운영 관련 제반 업무</li>
              </ul>
            </section>

            <Separator />

            <section id="terms-obligations" aria-labelledby="terms-heading-obligations">
              <h2
                id="terms-heading-obligations"
                className="mb-3 flex items-center gap-2 text-base font-semibold tracking-tight sm:text-lg"
              >
                <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  6
                </span>
                제6조 (이용자의 의무)
              </h2>
              <ol className="ml-4 list-decimal space-y-1.5 text-foreground/90 marker:text-primary/60">
                <li>이용자는 타인의 정보를 도용하거나 허위사실을 기재해서는 안 됩니다.</li>
                <li>이용자는 관계 법령, 본 약관, 이용안내 및 서비스와 관련하여 공지한 주의사항을 준수해야 합니다.</li>
                <li>이용자는 학회의 사전 승낙 없이 서비스를 이용하여 영업활동을 할 수 없습니다.</li>
              </ol>
            </section>

            <Separator />

            <section id="terms-posts" aria-labelledby="terms-heading-posts">
              <h2
                id="terms-heading-posts"
                className="mb-3 flex items-center gap-2 text-base font-semibold tracking-tight sm:text-lg"
              >
                <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  7
                </span>
                제7조 (게시물의 관리)
              </h2>
              <p className="text-foreground/90">
                이용자가 게시한 게시물이 관련 법령 또는 본 약관에 위배되는 경우, 학회는 사전 통보 없이
                해당 게시물을 삭제하거나 이동할 수 있으며, 해당 이용자에 대해 서비스 이용을 제한할 수 있습니다.
              </p>
            </section>

            <Separator />

            <section id="terms-disclaimer" aria-labelledby="terms-heading-disclaimer">
              <h2
                id="terms-heading-disclaimer"
                className="mb-3 flex items-center gap-2 text-base font-semibold tracking-tight sm:text-lg"
              >
                <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  8
                </span>
                제8조 (면책조항)
              </h2>
              <p className="text-foreground/90">
                학회는 천재지변, 전쟁, 기간통신사업자의 서비스 중지 등 불가항력적 사유로 서비스를
                제공할 수 없는 경우 서비스 제공에 관한 책임이 면제됩니다.
              </p>
            </section>

            <Separator />

            <section id="terms-jurisdiction" aria-labelledby="terms-heading-jurisdiction">
              <h2
                id="terms-heading-jurisdiction"
                className="mb-3 flex items-center gap-2 text-base font-semibold tracking-tight sm:text-lg"
              >
                <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  9
                </span>
                제9조 (준거법 및 관할)
              </h2>
              <p className="text-foreground/90">
                본 약관의 해석 및 학회와 이용자 간의 분쟁에 대하여는 대한민국의 법을 준거법으로 하며,
                분쟁에 관한 소송은 민사소송법상의 관할법원에 제소합니다.
              </p>
            </section>

            <Separator />

            <section id="terms-addendum" aria-labelledby="terms-heading-addendum">
              <h2
                id="terms-heading-addendum"
                className="mb-3 flex items-center gap-2 text-base font-semibold tracking-tight sm:text-lg"
              >
                <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  부
                </span>
                부칙
              </h2>
              <p className="text-foreground/90">본 약관은 2026년 4월 15일부터 시행됩니다.</p>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
