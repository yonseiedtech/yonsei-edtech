import type { Metadata } from "next";
import { History } from "lucide-react";
import Timeline from "@/components/about/Timeline";
import PageHeader from "@/components/ui/page-header";
import { Separator } from "@/components/ui/separator";
import PageContainer from "@/components/ui/page-container";

export const metadata: Metadata = {
  title: "연혁",
  description: "연세교육공학회의 주요 연혁을 소개합니다.",
};

export default function HistoryPage() {
  return (
    <PageContainer width="default">
      <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
        <section>
          <PageHeader
            icon={History}
            title="연혁"
            description="연세교육공학회의 걸어온 길을 소개합니다."
          />
          <Separator className="mt-6" />
        </section>

        <section className="mt-10">
          <Timeline />
        </section>
      </div>
    </PageContainer>
  );
}
