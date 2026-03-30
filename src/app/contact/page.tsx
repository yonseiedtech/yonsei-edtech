"use client";

import { Mail, MapPin, Clock, MessageSquare } from "lucide-react";
import ContactForm from "@/components/contact/ContactForm";
import PageHeader from "@/components/ui/page-header";
import { useContactInfo } from "@/features/site-settings/useSiteContent";

export default function ContactPage() {
  const { value: info, isLoading } = useContactInfo();

  return (
    <div className="py-16">
      <section className="mx-auto max-w-6xl px-4">
        <PageHeader
          icon={<MessageSquare size={24} />}
          title="문의하기"
          description="학회에 대한 궁금한 점이 있으시면 편하게 문의해주세요."
        />
      </section>

      <section className="mx-auto mt-12 max-w-6xl px-4">
        <div className="grid gap-8 md:grid-cols-2">
          <div className="space-y-6">
            <h2 className="text-xl font-bold">연락처</h2>

            {isLoading ? (
              <div className="space-y-4 py-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-start gap-4">
                    <div className="h-10 w-10 shrink-0 animate-pulse rounded-lg bg-muted" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-20 animate-pulse rounded bg-muted" />
                      <div className="h-3 w-40 animate-pulse rounded bg-muted" />
                    </div>
                  </div>
                ))}
              </div>
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
