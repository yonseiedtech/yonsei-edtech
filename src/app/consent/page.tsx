import type { Metadata } from "next";
import { CURRENT_TERMS } from "@/lib/legal";

export const CONSENT_VERSION = CURRENT_TERMS.collection;

export const metadata: Metadata = {
  title: "개인정보 수집·이용 동의서",
  description: "연세교육공학회 개인정보 수집·이용 동의서",
};

export default function ConsentPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <header className="mb-8 border-b pb-6">
        <h1 className="text-2xl font-bold">개인정보 수집·이용 동의서</h1>
        <p className="mt-2 text-xs text-muted-foreground">
          버전 {CONSENT_VERSION} · 시행일: 2026년 4월 15일
        </p>
      </header>

      <div className="space-y-8 text-sm leading-relaxed text-foreground">
        <p>
          연세교육공학회(이하 &ldquo;학회&rdquo;)는 「개인정보 보호법」 제15조 및 제22조에 따라
          회원의 개인정보를 다음과 같이 수집·이용하고자 합니다. 내용을 자세히 읽으신 후
          동의 여부를 결정해 주시기 바랍니다.
        </p>

        <section>
          <h2 className="mb-3 text-base font-semibold">1. 수집 항목 및 목적 (필수)</h2>
          <div className="overflow-hidden rounded-lg border">
            <table className="w-full text-xs">
              <thead className="bg-muted/40">
                <tr>
                  <th className="border-b px-3 py-2 text-left">구분</th>
                  <th className="border-b px-3 py-2 text-left">수집 항목</th>
                  <th className="border-b px-3 py-2 text-left">이용 목적</th>
                  <th className="border-b px-3 py-2 text-left">보유 기간</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border-b px-3 py-2 align-top">회원 가입</td>
                  <td className="border-b px-3 py-2 align-top">이름, 이메일, 학번, 비밀번호, 생년월일, 입학 시점</td>
                  <td className="border-b px-3 py-2 align-top">본인 확인, 회원 관리, 부정 이용 방지</td>
                  <td className="border-b px-3 py-2 align-top">회원 탈퇴 시까지</td>
                </tr>
                <tr>
                  <td className="border-b px-3 py-2 align-top">학술활동</td>
                  <td className="border-b px-3 py-2 align-top">세미나·활동 참여 이력, 후기</td>
                  <td className="border-b px-3 py-2 align-top">수료증 발급, 이력 관리</td>
                  <td className="border-b px-3 py-2 align-top">회원 자격 종료 + 3년</td>
                </tr>
                <tr>
                  <td className="px-3 py-2 align-top">서비스 운영</td>
                  <td className="px-3 py-2 align-top">접속 로그, IP 주소, 쿠키</td>
                  <td className="px-3 py-2 align-top">부정 이용 분석, 서비스 품질 개선</td>
                  <td className="px-3 py-2 align-top">1년</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-base font-semibold">2. 수집 항목 및 목적 (선택)</h2>
          <div className="overflow-hidden rounded-lg border">
            <table className="w-full text-xs">
              <thead className="bg-muted/40">
                <tr>
                  <th className="border-b px-3 py-2 text-left">수집 항목</th>
                  <th className="border-b px-3 py-2 text-left">이용 목적</th>
                  <th className="border-b px-3 py-2 text-left">보유 기간</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border-b px-3 py-2 align-top">연락처(휴대폰)</td>
                  <td className="border-b px-3 py-2 align-top">긴급 공지, 본인 확인 보조</td>
                  <td className="border-b px-3 py-2 align-top">회원 탈퇴 시까지</td>
                </tr>
                <tr>
                  <td className="border-b px-3 py-2 align-top">소속·직책·관심분야</td>
                  <td className="border-b px-3 py-2 align-top">회원 간 네트워킹, 명함 교환</td>
                  <td className="border-b px-3 py-2 align-top">회원 탈퇴 시까지</td>
                </tr>
                <tr>
                  <td className="px-3 py-2 align-top">프로필 이미지</td>
                  <td className="px-3 py-2 align-top">회원 식별, 명함·수료증</td>
                  <td className="px-3 py-2 align-top">회원 탈퇴 시까지</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold">3. 동의 거부 권리 및 불이익</h2>
          <p>
            정보주체는 개인정보 수집·이용에 대한 동의를 거부할 권리가 있습니다. 다만 필수 항목에
            대한 동의를 거부하시는 경우 회원 가입 및 학술활동 참여가 제한될 수 있습니다. 선택 항목
            동의 거부 시에는 해당 기능 이용에 일부 제한이 있을 수 있으나 회원 가입은 가능합니다.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold">4. 제3자 제공</h2>
          <p>
            학회는 원칙적으로 정보주체의 개인정보를 제3자에게 제공하지 않습니다. 다만 법령에 의해
            요구되거나 정보주체가 별도로 동의한 경우에 한하여 제공할 수 있습니다.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold">5. 마케팅·이벤트 정보 수신 (선택)</h2>
          <p>
            동의 시 학회의 신규 세미나·학술행사 안내, 뉴스레터, 이벤트 정보를 이메일로 발송받습니다.
            수신 거부는 언제든지 마이페이지 또는 수신 메일 하단의 링크를 통해 철회할 수 있습니다.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold">6. 문의처</h2>
          <p>개인정보 보호책임자: yonsei.edtech@gmail.com</p>
        </section>
      </div>
    </div>
  );
}
