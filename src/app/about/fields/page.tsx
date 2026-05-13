"use client";

import { Monitor, GraduationCap, Brain, Lightbulb, BarChart3, Users, Compass, type LucideIcon } from "lucide-react";
import { useFields } from "@/features/site-settings/useSiteContent";
import { Skeleton } from "@/components/ui/skeleton";
import PageHeader from "@/components/ui/page-header";
import { Separator } from "@/components/ui/separator";

const ICON_MAP: Record<string, LucideIcon> = {
  Monitor, GraduationCap, Brain, Lightbulb, BarChart3, Users,
};

export default function FieldsPage() {
  const { value: fields, isLoading } = useFields();

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 py-8 sm:py-14">
      <section className="mx-auto max-w-6xl px-4">
        <PageHeader
          icon={Compass}
          title="활동 분야"
          description="연세교육공학회가 탐구하고 실천하는 주요 분야입니다."
        />
        <Separator className="mt-6" />
      </section>

      <section className="mx-auto mt-10 max-w-6xl px-4">
        {isLoading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3" aria-busy="true" aria-label="활동 분야 불러오는 중">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-start gap-4 rounded-2xl border bg-card p-6 shadow-sm">
                <Skeleton className="h-10 w-10 shrink-0 rounded-lg" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="mt-2 h-3 w-full" />
                  <Skeleton className="mt-1 h-3 w-5/6" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {fields.map((f) => {
              const Icon = ICON_MAP[f.icon] || Lightbulb;
              return (
                <div key={f.title} className="flex items-start gap-4 rounded-2xl border bg-card p-6 shadow-sm">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary/10 text-secondary">
                    <Icon size={20} />
                  </div>
                  <div>
                    <h3 className="font-semibold">{f.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
