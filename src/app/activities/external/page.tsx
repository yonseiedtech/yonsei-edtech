"use client";

import { Globe, Calendar } from "lucide-react";

export default function ExternalActivitiesPage() {
  return (
    <div className="py-16">
      <div className="mx-auto max-w-4xl px-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Globe size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold">대외 학회활동</h1>
            <p className="text-sm text-muted-foreground">
              외부 학술대회 참가, 학회 발표 등 대외 활동을 소개합니다.
            </p>
          </div>
        </div>

        <div className="mt-8 rounded-2xl border bg-white p-8">
          <h2 className="text-lg font-bold">대외 활동 소개</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            연세교육공학회 회원들은 국내외 교육공학 관련 학술대회에 참가하여
            논문을 발표하고, 다른 대학교의 교육공학 연구자들과 교류하며
            학문적 역량을 확장합니다. AECT, KSET, 한국교육공학회 등
            주요 학회 활동에 적극적으로 참여하고 있습니다.
          </p>
          <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
            <Calendar size={14} />
            연중 수시
          </div>
        </div>

        <div className="mt-6 rounded-xl border bg-muted/30 p-8 text-center text-sm text-muted-foreground">
          대외 학회활동 내역은 준비 중입니다.
        </div>
      </div>
    </div>
  );
}
