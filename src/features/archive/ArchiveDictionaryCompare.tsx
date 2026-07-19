"use client";

/**
 * ArchiveDictionaryCompare — 사전 3종 역할 안내 (M8 디스앰비규에이션)
 *
 * "정의를 찾는" 목적의 리소스가 기초 용어·AECT 표준 사전·개념 라이브러리 3종으로 병존해
 * 첫 방문자가 무엇을 먼저 볼지 혼란스러웠다. "언제 무엇을 쓰나" 3열 마이크로 비교로
 * 각 사전의 역할(처음 만나는 단어 / 표준 역어·정의 / 이론·구성개념 심화)을 명시한다.
 */

import Link from "next/link";
import { BookText, BookMarked, Lightbulb, ArrowRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface DictRole {
  icon: LucideIcon;
  title: string;
  when: string;
  desc: string;
  href: string;
  accent: string;
}

const ROLES: DictRole[] = [
  {
    icon: BookText,
    title: "기초 용어",
    when: "처음 만나는 단어일 때",
    desc: "변인·연구설계·측정 등 자주 쓰는 입문 용어와 헷갈리는 용어 페어를 빠르게 확인합니다.",
    href: "/archive/foundation-terms",
    accent: "text-cat-6",
  },
  {
    icon: BookMarked,
    title: "AECT 표준 사전",
    when: "표준 역어·정의를 확인할 때",
    desc: "『교육공학 용어해설』(학지사, 2020) 공식 표제어·역어 186개로 표준 표기를 대조합니다.",
    href: "/archive/terminology",
    accent: "text-info",
  },
  {
    icon: Lightbulb,
    title: "개념 라이브러리",
    when: "이론·구성개념을 심화할 때",
    desc: "자기효능감·학습몰입처럼 이론적 개념을 변인·측정도구까지 연결해 깊이 살펴봅니다.",
    href: "/archive/concept",
    accent: "text-cat-5",
  },
];

export default function ArchiveDictionaryCompare() {
  return (
    <div className="mb-5 rounded-2xl border bg-muted/30 p-4">
      <p className="mb-3 text-xs font-semibold text-muted-foreground">
        어떤 사전을 볼까요? — 목적에 따라 골라 보세요
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {ROLES.map((r) => {
          const Icon = r.icon;
          return (
            <Link
              key={r.title}
              href={r.href}
              className="group flex flex-col gap-1.5 rounded-xl border bg-card p-3 shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              <div className="flex items-center gap-1.5">
                <Icon className={cn("h-4 w-4 shrink-0", r.accent)} aria-hidden />
                <span className="text-sm font-semibold tracking-tight">{r.title}</span>
                <ArrowRight className="ml-auto h-3.5 w-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden />
              </div>
              <p className={cn("text-xs font-medium", r.accent)}>{r.when}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{r.desc}</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
