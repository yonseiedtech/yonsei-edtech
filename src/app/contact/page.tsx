"use client";

import { Mail, MapPin, Clock } from "lucide-react";
import ContactForm from "@/components/contact/ContactForm";
import { useContactInfo } from "@/features/site-settings/useSiteContent";

export default function ContactPage() {
  const { value: info, isLoading } = useContactInfo();

  return (
    <div className="py-16">
      <section className="mx-auto max-w-6xl px-4 text-center">
        <h1 className="text-3xl font-bold md:text-4xl">문의하기</h1>
        <p className="mt-4 text-muted-foreground">학회에 대한 궁금한 점이 있으시면 편하게 문의해주세요.</p>
      </section>

      <section className="mx-auto mt-12 max-w-6xl px-4">
        <div className="grid gap-8 md:grid-cols-2">
          <div className="space-y-6">
            <h2 className="text-xl font-bold">연락처</h2>

            {isLoading ? (
              <div className="py-8 text-sm text-muted-foreground">불러오는 중...</div>
            ) : (
              <>
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><Mail size={20} /></div>
                  <div>
                    <h3 className="font-semibold">이메일</h3>
                    <p className="text-sm text-muted-foreground">{info.email}</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><MapPin size={20} /></div>
                  <div>
                    <h3 className="font-semibold">위치</h3>
                    <p className="whitespace-pre-line text-sm text-muted-foreground">{info.address}</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><Clock size={20} /></div>
                  <div>
                    <h3 className="font-semibold">정기 모임</h3>
                    <p className="text-sm text-muted-foreground">{info.meetingSchedule}</p>
                  </div>
                </div>
              </>
            )}
          </div>

          <ContactForm />
        </div>
      </section>
    </div>
  );
}
