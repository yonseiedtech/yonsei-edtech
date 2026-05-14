"use client";

/**
 * Connectivism 패널 (Sprint 67-AR — 교육공학 이론 보강 #7)
 *
 * 이론 근거:
 * - Connectivism (Siemens, 2005): 학습은 사람·자원·도구·도메인 사이 네트워크에서 일어남
 * - 학습 = 네트워크 형성·유지·확장 능력
 *
 * 본 패널은 마이페이지에서 학회 네트워킹 맵(/network)으로의 진입 카드.
 * 본인의 학습 네트워크를 한눈에 시각화하도록 유도한다.
 */

import Link from "next/link";
import { ArrowRight, Network, Users, Sparkles } from "lucide-react";

export default function ConnectivismPanel() {
  return (
    <section
      className="overflow-hidden rounded-2xl border-2 border-primary/15 bg-gradient-to-br from-primary/5 via-sky-500/5 to-card p-5 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300"
      aria-labelledby="connectivism-panel-title"
    >
      <div className="mb-3 flex items-center gap-2.5">
        <div
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 text-primary"
          aria-hidden
        >
          <Network size={18} />
        </div>
        <div className="flex-1">
          <h3 id="connectivism-panel-title" className="text-sm font-bold tracking-tight sm:text-base">
            내 학습 네트워크
          </h3>
          <p
            className="text-[11px] text-muted-foreground"
            title="Connectivism (Siemens, 2005) — 학습은 사람·자원·도구·도메인 사이 네트워크에서 일어남"
          >
            Connectivism · 학회 연결망 시각화
          </p>
        </div>
        <span className="hidden items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary sm:inline-flex">
          <Sparkles size={10} aria-hidden />
          학습이론
        </span>
      </div>

      <p className="text-sm leading-relaxed text-foreground/85">
        학회 회원과의 연결망을 동기·신분·학교급 차원으로 시각화한 인터랙티브 맵입니다. 본인이 누구와 학습 자원을 공유할 수 있는지 한눈에 파악하고, 네트워크 확장 기회를 발견하세요.
      </p>

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <div className="flex items-start gap-2 rounded-2xl border bg-card p-3">
          <Users size={14} className="mt-0.5 shrink-0 text-blue-600" aria-hidden />
          <div>
            <p className="text-xs font-bold">동기 (Cohort)</p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">같은 학기에 입학한 회원</p>
          </div>
        </div>
        <div className="flex items-start gap-2 rounded-2xl border bg-card p-3">
          <Users size={14} className="mt-0.5 shrink-0 text-emerald-600" aria-hidden />
          <div>
            <p className="text-xs font-bold">신분 유형</p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">동일 직업·역할 회원</p>
          </div>
        </div>
        <div className="flex items-start gap-2 rounded-2xl border bg-card p-3">
          <Users size={14} className="mt-0.5 shrink-0 text-amber-600" aria-hidden />
          <div>
            <p className="text-xs font-bold">학교급</p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">동일 K-12 단계 회원</p>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[10px] leading-relaxed text-muted-foreground/80">
          Siemens(2005) 이론에 따르면 학습은 노드 간 연결을 형성·유지하는 능력 그 자체입니다.
        </p>
        <Link
          href="/network"
          className="group inline-flex items-center gap-1 rounded-full bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          aria-label="내 학습 네트워크 맵 열기"
        >
          내 네트워크 보기
          <ArrowRight size={11} className="transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
    </section>
  );
}
