"use client";

import { Users, Calendar } from "lucide-react";

export default function StudiesPage() {
  return (
    <div className="py-16">
      <div className="mx-auto max-w-4xl px-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 text-accent">
            <Users size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold">스터디</h1>
            <p className="text-sm text-muted-foreground">
              AI 교육, UX 리서치, 교수설계 등 관심 주제별 소그룹 스터디를 운영합니다.
            </p>
          </div>
        </div>

        <div className="mt-8 rounded-2xl border bg-white p-8">
          <h2 className="text-lg font-bold">스터디 소개</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            연세교육공학회에서는 회원들의 관심 분야에 따라 다양한 주제별 스터디를 운영합니다.
            깊이 있는 학습과 실습을 병행하며, 함께 성장하는 학술 커뮤니티를 만들어갑니다.
          </p>
          <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
            <Calendar size={14} />
            수시 운영
          </div>
        </div>

        <div className="mt-6 rounded-xl border bg-muted/30 p-8 text-center text-sm text-muted-foreground">
          스터디 목록은 준비 중입니다.
        </div>
      </div>
    </div>
  );
}
