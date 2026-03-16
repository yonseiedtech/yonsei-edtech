import type { Metadata } from "next";
import { Monitor, GraduationCap, Brain, Lightbulb, BarChart3, Users } from "lucide-react";

export const metadata: Metadata = {
  title: "활동 분야",
  description: "연세교육공학회의 주요 활동 분야를 소개합니다.",
};

const fields = [
  { icon: Monitor, title: "에듀테크", desc: "AI 교육, LMS, 교육용 앱 등 기술 기반 교육 솔루션을 탐구하고 프로토타입을 개발합니다." },
  { icon: GraduationCap, title: "교수설계", desc: "ADDIE, SAM 등 체계적인 교수-학습 설계 모형을 연구하고 실제 교육 현장에 적용합니다." },
  { icon: Brain, title: "학습과학", desc: "인지심리학, 동기이론, 자기조절학습 등 학습의 과학적 원리를 탐구합니다." },
  { icon: Lightbulb, title: "UX/UI 디자인", desc: "교육 서비스의 사용자 경험을 설계하고 학습자 중심의 인터페이스를 연구합니다." },
  { icon: BarChart3, title: "학습 분석", desc: "학습 데이터를 수집·분석하여 교육 효과를 측정하고 개선 방안을 도출합니다." },
  { icon: Users, title: "협력 학습", desc: "온·오프라인 환경에서의 협력 학습 설계와 커뮤니티 기반 학습을 연구합니다." },
];

export default function FieldsPage() {
  return (
    <div className="py-16">
      <section className="mx-auto max-w-6xl px-4 text-center">
        <h1 className="text-3xl font-bold md:text-4xl">활동 분야</h1>
        <p className="mt-4 text-muted-foreground">
          연세교육공학회가 탐구하고 실천하는 주요 분야입니다.
        </p>
      </section>

      <section className="mx-auto mt-12 max-w-6xl px-4">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {fields.map((f) => (
            <div
              key={f.title}
              className="flex items-start gap-4 rounded-2xl border bg-white p-6 shadow-sm"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary/10 text-secondary">
                <f.icon size={20} />
              </div>
              <div>
                <h3 className="font-semibold">{f.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
