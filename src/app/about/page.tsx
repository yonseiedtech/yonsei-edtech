import type { Metadata } from "next";
import Link from "next/link";
import { Target, Eye, Sparkles, ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "학회 소개",
  description: "연세교육공학회의 미션, 비전, 활동분야를 소개합니다.",
};

const values = [
  {
    icon: Target,
    title: "미션",
    desc: "교육공학의 이론과 실천을 연결하여, 더 나은 교육 경험을 설계하고 공유합니다.",
  },
  {
    icon: Eye,
    title: "비전",
    desc: "에듀테크 분야의 차세대 리더를 양성하고, 교육 혁신을 선도하는 학술 커뮤니티가 됩니다.",
  },
  {
    icon: Sparkles,
    title: "가치",
    desc: "협력, 탐구, 혁신 — 함께 배우고, 깊이 연구하며, 새로운 가능성을 탐색합니다.",
  },
];


export default function AboutPage() {
  return (
    <div className="py-16">
      {/* Page Header */}
      <section className="mx-auto max-w-6xl px-4 text-center">
        <h1 className="text-3xl font-bold md:text-4xl">학회 소개</h1>
        <p className="mt-4 text-muted-foreground">
          연세교육공학회는 연세대학교에서 교육공학을 탐구하는 학술 커뮤니티입니다.
        </p>
      </section>

      {/* Mission / Vision / Values */}
      <section className="mx-auto mt-16 max-w-6xl px-4">
        <div className="grid gap-6 md:grid-cols-3">
          {values.map((v) => (
            <div
              key={v.title}
              className="rounded-2xl border bg-white p-8 shadow-sm"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <v.icon size={24} />
              </div>
              <h3 className="text-xl font-bold">{v.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {v.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Link to Fields */}
      <section className="mx-auto mt-20 max-w-6xl px-4 text-center">
        <Link
          href="/about/fields"
          className="inline-flex items-center gap-2 rounded-xl bg-primary/10 px-6 py-3 text-sm font-medium text-primary transition-colors hover:bg-primary/20"
        >
          활동 분야 알아보기 <ArrowRight size={16} />
        </Link>
      </section>

    </div>
  );
}
