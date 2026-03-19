"use client";

import { Monitor, GraduationCap, Brain, Lightbulb, BarChart3, Users, type LucideIcon } from "lucide-react";
import { useFields } from "@/features/site-settings/useSiteContent";

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
          <div className="flex justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {fields.map((f) => {
              const Icon = ICON_MAP[f.icon] || Lightbulb;
              return (
                <div key={f.title} className="flex items-start gap-4 rounded-2xl border bg-white p-6 shadow-sm">
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
