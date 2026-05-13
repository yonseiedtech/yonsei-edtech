import type { Metadata } from "next";
import { CURRENT_TERMS } from "@/lib/legal";
import { Shield } from "lucide-react";
import PageHeader from "@/components/ui/page-header";
import InlineNotification from "@/components/ui/inline-notification";
import { Separator } from "@/components/ui/separator";

export const PRIVACY_VERSION = CURRENT_TERMS.privacy;

export const metadata: Metadata = {
  title: "개인정보처리방침",
  description: "연세교육공학회 개인정보처리방침",
};

const TOC_ITEMS = [
  { id: "purpose", label: "1. 처리 목적" },
  { id: "items", label: "2. 수집 항목" },
  { id: "retention", label: "3. 보유·이용기간" },
  { id: "third-party", label: "4. 제3자 제공" },
  { id: "delegation", label: "5. 처리 위탁" },
  { id: "rights", label: "6. 정보주체 권리" },
  { id: "disposal", label: "7. 파기" },
  { id: "security", label: "8. 안전성 확보" },
  { id: "officer", label: "9. 보호책임자" },
  { id: "changes", label: "10. 방침 변경" },
];

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:py-14">
      {/* Page Header */}
      <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
        <PageHeader
          icon={Shield}
          title="개인정보처리방침"
          description="연세교육공학회가 수집·보유하는 개인정보의 처리 방침입니다."
        />
      </div>

      {/* Version badge */}
      <div className="mt-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
        <InlineNotification
          kind="info"
          title={`현행 버전 ${PRIVACY_VERSION} · 시행일: 2026년 4월 15일`}
          description="본 방침은 「개인정보 보호법」 제30조 및 「정보통신망 이용촉진 및 정보보호 등에 관한 법률」에 따라 공개됩니다. 변경 시 시행 7일 전 공지합니다."
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
            <nav aria-label="개인정보처리방침 목차">
              <ol className="space-y-1">
                {TOC_ITEMS.map((item) => (
                  <li key={item.id}>
                    <a
                      href={`#privacy-${item.id}`}
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
          aria-label="개인정보처리방침 본문"
        >
          <div className="space-y-10 text-sm leading-relaxed text-foreground sm:text-base">
            <p className="text-muted-foreground">
              연세교육공학회(이하 &ldquo;학회&rdquo;)는 「개인정보 보호법」 제30조 및 「정보통신망 이용촉진 및
              정보보호 등에 관한 법률」에 따라 정보주체의 개인정보를 보호하고 관련 고충을 신속하고 원활하게
              처리하기 위하여 다음과 같이 개인정보 처리방침을 수립·공개합니다.
            </p>

            <section id="privacy-purpose" aria-labelledby="privacy-heading-purpose">
              <h2
                id="privacy-heading-purpose"
                className="mb-3 flex items-center gap-2 text-base font-semibold tracking-tight sm:text-lg"
              >
                <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  1
                </span>
                개인정보의 처리 목적
              </h2>
              <p className="mb-3 text-muted-foreground">학회는 다음의 목적을 위하여 개인정보를 처리합니다.</p>
              <ul className="ml-4 list-disc space-y-1.5 text-foreground/90 marker:text-primary/60">
                <li>회원 가입 및 관리, 본인 확인, 회원자격 유지·관리</li>
                <li>세미나·학술활동 참가 접수 및 안내</li>
                <li>수료증·감사장 발급 및 이력 관리</li>
                <li>공지사항·뉴스레터 등 학회 운영 관련 소통</li>
                <li>민원·문의 응대 및 분쟁 조정</li>
              </ul>
            </section>

            <Separator />

            <section id="privacy-items" aria-labelledby="privacy-heading-items">
              <h2
                id="privacy-heading-items"
                className="mb-3 flex items-center gap-2 text-base font-semibold tracking-tight sm:text-lg"
              >
                <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  2
                </span>
                수집하는 개인정보 항목
              </h2>
              <ul className="ml-4 list-disc space-y-1.5 text-foreground/90 marker:text-primary/60">
                <li><strong className="font-semibold text-foreground">필수</strong>: 이름, 이메일, 학번(아이디), 비밀번호, 생년월일, 입학 시점</li>
                <li><strong className="font-semibold text-foreground">선택</strong>: 연락처(휴대폰), 소속, 직책, 관심분야, 프로필 이미지</li>
                <li><strong className="font-semibold text-foreground">자동 수집</strong>: 서비스 이용기록, 접속 로그, 쿠키, IP 주소</li>
              </ul>
            </section>

            <Separator />

            <section id="privacy-retention" aria-labelledby="privacy-heading-retention">
              <h2
                id="privacy-heading-retention"
                className="mb-3 flex items-center gap-2 text-base font-semibold tracking-tight sm:text-lg"
              >
                <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  3
                </span>
                개인정보의 보유 및 이용기간
              </h2>
              <ol className="ml-4 list-decimal space-y-1.5 text-foreground/90 marker:text-primary/60">
                <li>회원정보: 회원 탈퇴 시까지. 다만 관계 법령에서 정한 기간 동안은 별도 보관합니다.</li>
                <li>세미나·활동 참여 기록: 회원 자격 유지 기간 + 학술 이력 관리를 위한 추가 3년</li>
                <li>수료증·감사장 발급 기록: 발급일로부터 5년</li>
                <li>부정 이용 기록: 1년 (재발 방지 목적)</li>
              </ol>
            </section>

            <Separator />

            <section id="privacy-third-party" aria-labelledby="privacy-heading-third-party">
              <h2
                id="privacy-heading-third-party"
                className="mb-3 flex items-center gap-2 text-base font-semibold tracking-tight sm:text-lg"
              >
                <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  4
                </span>
                개인정보의 제3자 제공
              </h2>
              <p className="text-foreground/90">
                학회는 정보주체의 동의, 법률의 특별한 규정 등 「개인정보 보호법」 제17조 및 제18조에
                해당하는 경우에만 개인정보를 제3자에게 제공합니다. 현재 정기적으로 제3자에게 제공하는
                개인정보는 없습니다.
              </p>
            </section>

            <Separator />

            <section id="privacy-delegation" aria-labelledby="privacy-heading-delegation">
              <h2
                id="privacy-heading-delegation"
                className="mb-3 flex items-center gap-2 text-base font-semibold tracking-tight sm:text-lg"
              >
                <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  5
                </span>
                개인정보처리의 위탁
              </h2>
              <ul className="mb-3 ml-4 list-disc space-y-1.5 text-foreground/90 marker:text-primary/60">
                <li>클라우드 인프라(데이터 저장·호스팅): Google Firebase, Vercel</li>
                <li>이메일 발송: Resend / Gmail SMTP</li>
              </ul>
              <p className="text-xs text-muted-foreground">
                위탁계약 시 「개인정보 보호법」 제26조에 따라 개인정보의 안전한 관리를 위한 사항을 계약서에 명시합니다.
              </p>
            </section>

            <Separator />

            <section id="privacy-rights" aria-labelledby="privacy-heading-rights">
              <h2
                id="privacy-heading-rights"
                className="mb-3 flex items-center gap-2 text-base font-semibold tracking-tight sm:text-lg"
              >
                <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  6
                </span>
                정보주체의 권리와 행사방법
              </h2>
              <p className="mb-3 text-foreground/90">정보주체는 학회에 대해 언제든지 다음 각 호의 권리를 행사할 수 있습니다.</p>
              <ol className="mb-3 ml-4 list-decimal space-y-1.5 text-foreground/90 marker:text-primary/60">
                <li>개인정보 열람 요구</li>
                <li>오류 등이 있을 경우 정정 요구</li>
                <li>삭제 요구</li>
                <li>처리정지 요구</li>
              </ol>
              <p className="text-foreground/90">
                권리 행사는 마이페이지에서 직접 수행하거나 학회 이메일(아래 문의처)로 요청하실 수 있으며,
                학회는 지체 없이 조치하겠습니다.
              </p>
            </section>

            <Separator />

            <section id="privacy-disposal" aria-labelledby="privacy-heading-disposal">
              <h2
                id="privacy-heading-disposal"
                className="mb-3 flex items-center gap-2 text-base font-semibold tracking-tight sm:text-lg"
              >
                <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  7
                </span>
                개인정보의 파기
              </h2>
              <p className="text-foreground/90">
                학회는 개인정보 보유기간의 경과, 처리목적 달성 등 개인정보가 불필요하게 되었을 때에는
                지체 없이 해당 개인정보를 파기합니다. 전자적 파일 형태는 복구 불가능한 방법으로 영구
                삭제하며, 종이 문서는 분쇄하거나 소각합니다.
              </p>
            </section>

            <Separator />

            <section id="privacy-security" aria-labelledby="privacy-heading-security">
              <h2
                id="privacy-heading-security"
                className="mb-3 flex items-center gap-2 text-base font-semibold tracking-tight sm:text-lg"
              >
                <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  8
                </span>
                개인정보의 안전성 확보 조치
              </h2>
              <ul className="ml-4 list-disc space-y-1.5 text-foreground/90 marker:text-primary/60">
                <li>개인정보 암호화: 비밀번호는 단방향 해시로 저장</li>
                <li>접근통제: 관리자 권한 분리, 접근 로그 기록</li>
                <li>접속기록의 보관 및 위변조 방지</li>
              </ul>
            </section>

            <Separator />

            <section id="privacy-officer" aria-labelledby="privacy-heading-officer">
              <h2
                id="privacy-heading-officer"
                className="mb-3 flex items-center gap-2 text-base font-semibold tracking-tight sm:text-lg"
              >
                <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  9
                </span>
                개인정보 보호책임자
              </h2>
              <div className="rounded-2xl border bg-muted/30 p-4">
                <p className="text-sm text-foreground/90">
                  <span className="font-semibold">개인정보 보호책임자</span>: 연세교육공학회 운영진
                </p>
                <p className="mt-1 text-sm text-foreground/90">
                  <span className="font-semibold">이메일</span>:{" "}
                  <a
                    href="mailto:yonsei.edtech@gmail.com"
                    className="text-primary underline underline-offset-4 hover:text-primary/80 focus-visible:ring-2"
                  >
                    yonsei.edtech@gmail.com
                  </a>
                </p>
              </div>
            </section>

            <Separator />

            <section id="privacy-changes" aria-labelledby="privacy-heading-changes">
              <h2
                id="privacy-heading-changes"
                className="mb-3 flex items-center gap-2 text-base font-semibold tracking-tight sm:text-lg"
              >
                <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  10
                </span>
                개인정보처리방침의 변경
              </h2>
              <p className="text-foreground/90">
                본 방침은 시행일부터 적용되며, 법령 및 방침에 따른 변경내용의 추가, 삭제 및 정정이
                있는 경우 변경사항의 시행 7일 전부터 공지사항을 통하여 고지합니다.
              </p>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
