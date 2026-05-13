import type { Metadata } from "next";
import { History } from "lucide-react";
import Timeline from "@/components/about/Timeline";
import PageHeader from "@/components/ui/page-header";
import { Separator } from "@/components/ui/separator";

export const metadata: Metadata = {
  title: "연혁",
  description: "연세교육공학회의 주요 연혁을 소개합니다.",
};

export default function HistoryPage() {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 py-8 sm:py-14">
      <section className="mx-auto max-w-6xl px-4">
        <PageHeader
          icon={History}
          title="연혁"
          description="연세교육공학회의 걸어온 길을 소개합니다."
        />
        <Separator className="mt-6" />
      </section>

      <section className="mx-auto mt-10 max-w-6xl px-4">
        <Timeline />
      </section>
    </div>
  );
}
