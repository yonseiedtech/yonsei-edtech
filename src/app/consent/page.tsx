import type { Metadata } from "next";
import { CURRENT_TERMS } from "@/lib/legal";
import { FileCheck } from "lucide-react";
import PageHeader from "@/components/ui/page-header";
import InlineNotification from "@/components/ui/inline-notification";
import { Separator } from "@/components/ui/separator";

export const CONSENT_VERSION = CURRENT_TERMS.collection;

export const metadata: Metadata = {
  title: "개인정보 수집·이용 동의서",
  description: "연세교육공학회 개인정보 수집·이용 동의서",
};

const TOC_ITEMS = [
  { id: "required", label: "1. 수집 항목·목적 (필수)" },
  { id: "optional", label: "2. 수집 항목·목적 (선택)" },
  { id: "refusal", label: "3. 거부 권리·불이익" },
  { id: "third-party", label: "4. 제3자 제공" },
  { id: "marketing", label: "5. 마케팅·이벤트 수신 (선택)" },
  { id: "contact", label: "6. 문의처" },
];

export default function ConsentPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:py-14">
      {/* Page Header */}
      <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
        <PageHeader
          icon={FileCheck}
          title="개인정보 수집·이용 동의서"
          description="학회가 수집·이용하는 개인정보 항목과 목적을 안내합니다."
        />
      </div>

      {/* Version badge */}
      <div className="mt-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
        <InlineNotification
          kind="info"
          title={`현행 버전 ${CONSENT_VERSION} · 시행일: 2026년 4월 15일`}
          description="「개인정보 보호법」 제15조 및 제22조에 따라 개인정보를 수집·이용합니다. 내용을 자세히 읽으신 후 동의 여부를 결정해 주시기 바랍니다."
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
            <nav aria-label="개인정보 수집·이용 동의서 목차">
              <ol className="space-y-1">
                {TOC_ITEMS.map((item) => (
                  <li key={item.id}>
                    <a
                      href={`#consent-${item.id}`}
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
          aria-label="개인정보 수집·이용 동의서 본문"
        >
          <div className="space-y-10 text-sm leading-relaxed text-foreground sm:text-base">
            <p className="text-muted-foreground">
              연세교육공학회(이하 &ldquo;학회&rdquo;)는 「개인정보 보호법」 제15조 및 제22조에 따라
              회원의 개인정보를 다음과 같이 수집·이용하고자 합니다. 내용을 자세히 읽으신 후
              동의 여부를 결정해 주시기 바랍니다.
            </p>

            {/* Section 1 — Required */}
            <section id="consent-required" aria-labelledby="consent-heading-required">
              <h2
                id="consent-heading-required"
                className="mb-4 flex items-center gap-2 text-base font-semibold tracking-tight sm:text-lg"
              >
                <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  1
                </span>
                수집 항목 및 목적 (필수)
              </h2>
              <div className="overflow-hidden rounded-2xl border shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs sm:text-sm" aria-label="필수 개인정보 수집 항목">
                    <thead>
                      <tr className="bg-muted/50">
                        <th
                          scope="col"
                          className="border-b px-4 py-3 text-left font-semibold text-foreground"
                        >
                          구분
                        </th>
                        <th
                          scope="col"
                          className="border-b px-4 py-3 text-left font-semibold text-foreground"
                        >
                          수집 항목
                        </th>
                        <th
                          scope="col"
                          className="border-b px-4 py-3 text-left font-semibold text-foreground"
                        >
                          이용 목적
                        </th>
                        <th
                          scope="col"
                          className="border-b px-4 py-3 text-left font-semibold text-foreground"
                        >
                          보유 기간
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      <tr className="transition-colors hover:bg-muted/20">
                        <td className="px-4 py-3 align-top font-medium text-foreground">회원 가입</td>
                        <td className="px-4 py-3 align-top text-foreground/80">
                          이름, 이메일, 학번, 비밀번호, 생년월일, 입학 시점
                        </td>
                        <td className="px-4 py-3 align-top text-foreground/80">
                          본인 확인, 회원 관리, 부정 이용 방지
                        </td>
                        <td className="px-4 py-3 align-top text-foreground/80">회원 탈퇴 시까지</td>
                      </tr>
                      <tr className="transition-colors hover:bg-muted/20">
                        <td className="px-4 py-3 align-top font-medium text-foreground">학술활동</td>
                        <td className="px-4 py-3 align-top text-foreground/80">
                          세미나·활동 참여 이력, 후기
                        </td>
                        <td className="px-4 py-3 align-top text-foreground/80">수료증 발급, 이력 관리</td>
                        <td className="px-4 py-3 align-top text-foreground/80">회원 자격 종료 + 3년</td>
                      </tr>
                      <tr className="transition-colors hover:bg-muted/20">
                        <td className="px-4 py-3 align-top font-medium text-foreground">서비스 운영</td>
                        <td className="px-4 py-3 align-top text-foreground/80">
                          접속 로그, IP 주소, 쿠키
                        </td>
                        <td className="px-4 py-3 align-top text-foreground/80">
                          부정 이용 분석, 서비스 품질 개선
                        </td>
                        <td className="px-4 py-3 align-top text-foreground/80">1년</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </section>

            <Separator />

            {/* Section 2 — Optional */}
            <section id="consent-optional" aria-labelledby="consent-heading-optional">
              <h2
                id="consent-heading-optional"
                className="mb-4 flex items-center gap-2 text-base font-semibold tracking-tight sm:text-lg"
              >
                <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  2
                </span>
                수집 항목 및 목적 (선택)
              </h2>
              <div className="overflow-hidden rounded-2xl border shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs sm:text-sm" aria-label="선택 개인정보 수집 항목">
                    <thead>
                      <tr className="bg-muted/50">
                        <th
                          scope="col"
                          className="border-b px-4 py-3 text-left font-semibold text-foreground"
                        >
                          수집 항목
                        </th>
                        <th
                          scope="col"
                          className="border-b px-4 py-3 text-left font-semibold text-foreground"
                        >
                          이용 목적
                        </th>
                        <th
                          scope="col"
                          className="border-b px-4 py-3 text-left font-semibold text-foreground"
                        >
                          보유 기간
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      <tr className="transition-colors hover:bg-muted/20">
                        <td className="px-4 py-3 align-top font-medium text-foreground">연락처(휴대폰)</td>
                        <td className="px-4 py-3 align-top text-foreground/80">긴급 공지, 본인 확인 보조</td>
                        <td className="px-4 py-3 align-top text-foreground/80">회원 탈퇴 시까지</td>
                      </tr>
                      <tr className="transition-colors hover:bg-muted/20">
                        <td className="px-4 py-3 align-top font-medium text-foreground">소속·직책·관심분야</td>
                        <td className="px-4 py-3 align-top text-foreground/80">회원 간 네트워킹, 명함 교환</td>
                        <td className="px-4 py-3 align-top text-foreground/80">회원 탈퇴 시까지</td>
                      </tr>
                      <tr className="transition-colors hover:bg-muted/20">
                        <td className="px-4 py-3 align-top font-medium text-foreground">프로필 이미지</td>
                        <td className="px-4 py-3 align-top text-foreground/80">회원 식별, 명함·수료증</td>
                        <td className="px-4 py-3 align-top text-foreground/80">회원 탈퇴 시까지</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </section>

            <Separator />

            {/* Section 3 — Refusal */}
            <section id="consent-refusal" aria-labelledby="consent-heading-refusal">
              <h2
                id="consent-heading-refusal"
                className="mb-3 flex items-center gap-2 text-base font-semibold tracking-tight sm:text-lg"
              >
                <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  3
                </span>
                동의 거부 권리 및 불이익
              </h2>
              <p className="text-foreground/90">
                정보주체는 개인정보 수집·이용에 대한 동의를 거부할 권리가 있습니다. 다만 필수 항목에
                대한 동의를 거부하시는 경우 회원 가입 및 학술활동 참여가 제한될 수 있습니다. 선택 항목
                동의 거부 시에는 해당 기능 이용에 일부 제한이 있을 수 있으나 회원 가입은 가능합니다.
              </p>
            </section>

            <Separator />

            {/* Section 4 — Third party */}
            <section id="consent-third-party" aria-labelledby="consent-heading-third-party">
              <h2
                id="consent-heading-third-party"
                className="mb-3 flex items-center gap-2 text-base font-semibold tracking-tight sm:text-lg"
              >
                <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  4
                </span>
                제3자 제공
              </h2>
              <p className="text-foreground/90">
                학회는 원칙적으로 정보주체의 개인정보를 제3자에게 제공하지 않습니다. 다만 법령에 의해
                요구되거나 정보주체가 별도로 동의한 경우에 한하여 제공할 수 있습니다.
              </p>
            </section>

            <Separator />

            {/* Section 5 — Marketing */}
            <section id="consent-marketing" aria-labelledby="consent-heading-marketing">
              <h2
                id="consent-heading-marketing"
                className="mb-3 flex items-center gap-2 text-base font-semibold tracking-tight sm:text-lg"
              >
                <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  5
                </span>
                마케팅·이벤트 정보 수신 (선택)
              </h2>
              <p className="text-foreground/90">
                동의 시 학회의 신규 세미나·학술행사 안내, 뉴스레터, 이벤트 정보를 이메일로 발송받습니다.
                수신 거부는 언제든지 마이페이지 또는 수신 메일 하단의 링크를 통해 철회할 수 있습니다.
              </p>
            </section>

            <Separator />

            {/* Section 6 — Contact */}
            <section id="consent-contact" aria-labelledby="consent-heading-contact">
              <h2
                id="consent-heading-contact"
                className="mb-3 flex items-center gap-2 text-base font-semibold tracking-tight sm:text-lg"
              >
                <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  6
                </span>
                문의처
              </h2>
              <div className="rounded-2xl border bg-muted/30 p-4">
                <p className="text-sm text-foreground/90">
                  <span className="font-semibold">개인정보 보호책임자</span>:{" "}
                  <a
                    href="mailto:yonsei.edtech@gmail.com"
                    className="text-primary underline underline-offset-4 hover:text-primary/80 focus-visible:ring-2"
                  >
                    yonsei.edtech@gmail.com
                  </a>
                </p>
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
