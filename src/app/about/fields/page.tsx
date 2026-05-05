"use client";

import { Monitor, GraduationCap, Brain, Lightbulb, BarChart3, Users, type LucideIcon } from "lucide-react";
import { useFields } from "@/features/site-settings/useSiteContent";
import { Skeleton } from "@/components/ui/skeleton";

const ICON_MAP: Record<string, LucideIcon> = {
  Monitor, GraduationCap, Brain, Lightbulb, BarChart3, Users,
};

export default function FieldsPage() {
  const { value: fields, isLoading } = useFields();

  return (
    <div className="py-16">
      <section className="mx-auto max-w-6xl px-4 text-center">
        <h1 className="text-3xl font-bold md:text-4xl">활동 분야</h1>
        <p className="mt-4 text-muted-foreground">연세교육공학회가 탐구하고 실천하는 주요 분야입니다.</p>
      </section>

      <section className="mx-auto mt-12 max-w-6xl px-4">
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
