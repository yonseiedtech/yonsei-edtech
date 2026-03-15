import type { Metadata } from "next";
import Timeline from "@/components/about/Timeline";

export const metadata: Metadata = {
  title: "연혁",
  description: "연세교육공학회의 주요 연혁을 소개합니다.",
};

export default function HistoryPage() {
  return (
    <div className="py-16">
      <section className="mx-auto max-w-6xl px-4 text-center">
        <h1 className="text-3xl font-bold md:text-4xl">연혁</h1>
        <p className="mt-4 text-muted-foreground">
          연세교육공학회의 걸어온 길을 소개합니다.
        </p>
      </section>

      <section className="mx-auto mt-12 max-w-6xl px-4">
        <Timeline />
      </section>
    </div>
  );
}
