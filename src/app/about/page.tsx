import type { Metadata } from "next";
import { Target, Eye, Sparkles, GraduationCap, Monitor, Brain } from "lucide-react";
import Timeline from "@/components/about/Timeline";

export const metadata: Metadata = {
  title: "학회 소개",
  description: "연세교육공학회의 미션, 비전, 연혁을 소개합니다.",
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

const fields = [
  { icon: Monitor, title: "에듀테크", desc: "AI 교육, LMS, 교육용 앱 등 기술 기반 교육 솔루션" },
  { icon: GraduationCap, title: "교수설계", desc: "체계적인 교수-학습 설계 이론과 실습" },
  { icon: Brain, title: "학습과학", desc: "인지심리학, 동기이론 등 학습의 과학적 이해" },
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

      {/* Research Fields */}
      <section className="mx-auto mt-20 max-w-6xl px-4">
        <h2 className="text-center text-2xl font-bold">활동 분야</h2>
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {fields.map((f) => (
            <div
              key={f.title}
              className="flex items-start gap-4 rounded-2xl border bg-white p-6"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary/10 text-secondary">
                <f.icon size={20} />
              </div>
              <div>
                <h3 className="font-semibold">{f.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Timeline */}
      <section className="mx-auto mt-20 max-w-6xl px-4">
        <h2 className="text-center text-2xl font-bold">연혁</h2>
        <Timeline />
      </section>
    </div>
  );
}
