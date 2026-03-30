"use client";

import Link from "next/link";
import { Target, Eye, Sparkles, ArrowRight, Info } from "lucide-react";
import PageHeader from "@/components/ui/page-header";
import { useAbout } from "@/features/site-settings/useSiteContent";

const ICONS = [Target, Eye, Sparkles];
const LABELS = ["미션", "비전", "가치"];

export default function AboutPage() {
  const { value: about, isLoading } = useAbout();

  const values = [
    { icon: ICONS[0], title: LABELS[0], desc: about.mission },
    { icon: ICONS[1], title: LABELS[1], desc: about.vision },
    { icon: ICONS[2], title: LABELS[2], desc: about.values },
  ];

  return (
    <div className="py-16">
      <section className="mx-auto max-w-6xl px-4">
        <PageHeader
          icon={<Info size={24} />}
          title="학회 소개"
          description="연세교육공학회는 연세대학교에서 교육공학을 탐구하는 학술 커뮤니티입니다."
        />
      </section>

      <section className="mx-auto mt-16 max-w-6xl px-4">
        {isLoading ? (
          <div className="flex justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>
        ) : (
          <div className="grid gap-6 md:grid-cols-3">
            {values.map((v) => (
              <div key={v.title} className="rounded-2xl border bg-white p-8 shadow-sm">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <v.icon size={24} />
                </div>
                <h3 className="text-xl font-bold">{v.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{v.desc}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mx-auto mt-20 max-w-6xl px-4 text-center">
        <Link href="/about/fields" className="inline-flex items-center gap-2 rounded-xl bg-primary/10 px-6 py-3 text-sm font-medium text-primary transition-colors hover:bg-primary/20">
          활동 분야 알아보기 <ArrowRight size={16} />
        </Link>
      </section>
    </div>
  );
}
