import type { Metadata } from "next";
import { CURRENT_TERMS } from "@/lib/legal";

export const TERMS_VERSION = CURRENT_TERMS.terms;

export const metadata: Metadata = {
  title: "서비스 이용약관",
  description: "연세교육공학회 서비스 이용약관",
};

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <header className="mb-8 border-b pb-6">
        <h1 className="text-2xl font-bold">서비스 이용약관</h1>
        <p className="mt-2 text-xs text-muted-foreground">
          버전 {TERMS_VERSION} · 시행일: 2026년 4월 15일
        </p>
      </header>

      <div className="space-y-8 text-sm leading-relaxed text-foreground">
        <section>
          <h2 className="mb-2 text-base font-semibold">제1조 (목적)</h2>
          <p>
            본 약관은 연세교육공학회(이하 &ldquo;학회&rdquo;)가 운영하는 웹사이트 및 관련 서비스(이하
            &ldquo;서비스&rdquo;)의 이용과 관련하여 학회와 이용자 간의 권리, 의무 및 책임사항,
            기타 필요한 사항을 규정함을 목적으로 합니다.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold">제2조 (정의)</h2>
          <ol className="ml-4 list-decimal space-y-1">
            <li>&ldquo;이용자&rdquo;란 서비스에 접속하여 본 약관에 따라 서비스를 이용하는 회원 및 비회원을 말합니다.</li>
            <li>&ldquo;회원&rdquo;이란 학회에 가입신청을 하고 승인된 자로서, 서비스를 지속적으로 이용할 수 있는 자를 말합니다.</li>
            <li>&ldquo;게시물&rdquo;이란 이용자가 서비스를 이용함에 있어 서비스상에 게시한 문자, 사진, 파일 등의 정보를 말합니다.</li>
          </ol>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold">제3조 (약관의 효력 및 개정)</h2>
          <ol className="ml-4 list-decimal space-y-1">
            <li>본 약관은 서비스 화면에 게시하거나 기타의 방법으로 공지함으로써 효력을 발생합니다.</li>
            <li>학회는 필요한 경우 관련 법령을 위배하지 않는 범위에서 본 약관을 개정할 수 있습니다.</li>
            <li>약관이 개정되는 경우 학회는 개정 내용과 적용일자를 명시하여 서비스 내에서 최소 7일 전부터 공지합니다.</li>
            <li>개정 약관은 이용자가 재동의 절차를 거친 후부터 적용되며, 이용자가 명시적으로 거부 의사를 표명하는 경우 회원 탈퇴를 요청할 수 있습니다.</li>
          </ol>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold">제4조 (회원가입)</h2>
          <ol className="ml-4 list-decimal space-y-1">
            <li>이용자는 학회가 정한 양식에 따라 회원정보를 기입하고 본 약관 및 개인정보처리방침에 동의함으로써 회원가입을 신청합니다.</li>
            <li>학회는 신청자에 대해 승인 절차를 거쳐 회원자격을 부여하며, 학술활동 목적에 부합하지 않는 경우 가입을 거절할 수 있습니다.</li>
          </ol>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold">제5조 (서비스의 제공 및 변경)</h2>
          <p>학회는 다음과 같은 서비스를 제공합니다.</p>
          <ul className="ml-4 list-disc space-y-1">
            <li>세미나·학술활동 안내 및 신청</li>
            <li>회원 간 커뮤니티 및 자료실</li>
            <li>수료증·감사장 발급</li>
            <li>학회 운영 관련 제반 업무</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold">제6조 (이용자의 의무)</h2>
          <ol className="ml-4 list-decimal space-y-1">
            <li>이용자는 타인의 정보를 도용하거나 허위사실을 기재해서는 안 됩니다.</li>
            <li>이용자는 관계 법령, 본 약관, 이용안내 및 서비스와 관련하여 공지한 주의사항을 준수해야 합니다.</li>
            <li>이용자는 학회의 사전 승낙 없이 서비스를 이용하여 영업활동을 할 수 없습니다.</li>
          </ol>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold">제7조 (게시물의 관리)</h2>
          <p>
            이용자가 게시한 게시물이 관련 법령 또는 본 약관에 위배되는 경우, 학회는 사전 통보 없이
            해당 게시물을 삭제하거나 이동할 수 있으며, 해당 이용자에 대해 서비스 이용을 제한할 수 있습니다.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold">제8조 (면책조항)</h2>
          <p>
            학회는 천재지변, 전쟁, 기간통신사업자의 서비스 중지 등 불가항력적 사유로 서비스를
            제공할 수 없는 경우 서비스 제공에 관한 책임이 면제됩니다.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold">제9조 (준거법 및 관할)</h2>
          <p>
            본 약관의 해석 및 학회와 이용자 간의 분쟁에 대하여는 대한민국의 법을 준거법으로 하며,
            분쟁에 관한 소송은 민사소송법상의 관할법원에 제소합니다.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold">부칙</h2>
          <p>본 약관은 2026년 4월 15일부터 시행됩니다.</p>
        </section>
      </div>
    </div>
  );
}
