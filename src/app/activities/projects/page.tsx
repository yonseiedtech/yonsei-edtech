"use client";

import { FolderKanban, Calendar } from "lucide-react";

export default function ProjectsPage() {
  return (
    <div className="py-16">
      <div className="mx-auto max-w-4xl px-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary/10 text-secondary">
            <FolderKanban size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold">팀 프로젝트</h1>
            <p className="text-sm text-muted-foreground">
              실제 교육 현장의 문제를 기술로 해결하는 프로토타입을 개발합니다.
            </p>
          </div>
        </div>

        <div className="mt-8 rounded-2xl border bg-white p-8">
          <h2 className="text-lg font-bold">프로젝트 소개</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            연세교육공학회의 팀 프로젝트는 기획부터 개발, 사용성 테스트까지
            교육공학 프로젝트의 전 과정을 경험하는 활동입니다. 학기 단위로 운영되며,
            팀을 구성하여 교육 문제를 분석하고 에듀테크 솔루션을 개발합니다.
          </p>
          <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
            <Calendar size={14} />
            학기 단위 운영
          </div>
        </div>

        <div className="mt-6 rounded-xl border bg-muted/30 p-8 text-center text-sm text-muted-foreground">
          프로젝트 목록은 준비 중입니다.
        </div>
      </div>
    </div>
  );
}
