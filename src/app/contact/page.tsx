import type { Metadata } from "next";
import { Mail, MapPin, Clock } from "lucide-react";
import ContactForm from "@/components/contact/ContactForm";

export const metadata: Metadata = {
  title: "문의",
  description: "연세교육공학회에 문의하세요.",
};

export default function ContactPage() {
  return (
    <div className="py-16">
      <section className="mx-auto max-w-6xl px-4 text-center">
        <h1 className="text-3xl font-bold md:text-4xl">문의하기</h1>
        <p className="mt-4 text-muted-foreground">
          학회에 대한 궁금한 점이 있으시면 편하게 문의해주세요.
        </p>
      </section>

      <section className="mx-auto mt-12 max-w-6xl px-4">
        <div className="grid gap-8 md:grid-cols-2">
          {/* Contact Info */}
          <div className="space-y-6">
            <h2 className="text-xl font-bold">연락처</h2>

            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Mail size={20} />
              </div>
              <div>
                <h3 className="font-semibold">이메일</h3>
                <p className="text-sm text-muted-foreground">
                  yonsei.edtech@gmail.com
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <MapPin size={20} />
              </div>
              <div>
                <h3 className="font-semibold">위치</h3>
                <p className="text-sm text-muted-foreground">
                  서울시 서대문구 연세로 50
                  <br />
                  연세대학교 교육과학관
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Clock size={20} />
              </div>
              <div>
                <h3 className="font-semibold">정기 모임</h3>
                <p className="text-sm text-muted-foreground">
                  매주 수요일 오후 7시
                </p>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <ContactForm />
        </div>
      </section>
    </div>
  );
}
