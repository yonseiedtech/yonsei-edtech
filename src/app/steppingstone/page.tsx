"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { GraduationCap, BookOpen, ScrollText, Award, ArrowRight, Compass } from "lucide-react";
import { guideTracksApi } from "@/lib/bkend";
import { GUIDE_TRACK_LABELS, type GuideTrack, type GuideTrackKey } from "@/types";
import SemesterRoadmap from "@/features/steppingstone/SemesterRoadmap";

interface StaticTrack {
  key: GuideTrackKey;
  title: string;
  description: string;
  icon: typeof BookOpen;
  href: string | null; // null = 준비 중
  color: string;
}

const STATIC_TRACKS: StaticTrack[] = [
  {
    key: "onboarding",
    title: "신입생 온보딩",
    description:
      "합격 직후부터 입학 후 1학기 정착까지, 사전 준비 · OT · 수강신청 · 학회 가입을 한 흐름으로 안내합니다.",
    icon: GraduationCap,
    href: "/steppingstone/onboarding",
    color: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  },
  {
    key: "current_student",
    title: "재학생 학습 가이드",
    description: "학기별 학습 흐름·연구 노하우·세미나 활용법.",
    icon: BookOpen,
    href: "/steppingstone/current-student",
    color: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  },
  {
    key: "comprehensive_exam",
    title: "학술대회 대비",
    description: "주요 학회·학술대회 일정, 발표 신청 방법, 발표문/포스터 작성 가이드.",
    icon: ScrollText,
    href: "/steppingstone/conference",
    color: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  },
  {
    key: "graduation",
    title: "졸업 준비",
    description: "논문 심사 연습(음성 채점·따라 읽기) · 심사 절차 · 졸업 후 네트워크.",
    icon: Award,
    href: "/steppingstone/thesis-defense",
    color: "bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300",
  },
];

export default function SteppingstoneHubPage() {
  const [tracks, setTracks] = useState<GuideTrack[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    guideTracksApi
      .listPublished()
      .then((res) => setTracks(res.data))
      .catch(() => setTracks([]))
      .finally(() => setLoading(false));
  }, []);

  const publishedKeys = new Set(tracks.map((t) => t.key));

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
      <header className="mb-12 sm:mb-14">
        <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
          </span>
          학회 자체 운영 가이드 시스템
        </div>
        <div className="mt-4 flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/15 to-sky-400/15 text-primary shadow-sm">
            <Compass size={28} />
          </div>
          <div className="flex-1">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
              인지디딤판
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              연세교육공학 구성원이 입학부터 졸업까지 자력으로 따라갈 수 있도록 안내하는 가이드 모음입니다.
              각 트랙은 단계별 체크리스트·자료·신청 안내를 한 곳에 모아 보여줍니다.
            </p>
          </div>
        </div>
      </header>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2" aria-busy="true" aria-label="인지디딤판 트랙 불러오는 중">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex h-full flex-col rounded-2xl border p-6">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <Skeleton className="h-5 w-32" />
              </div>
              <Skeleton className="mt-4 h-4 w-full" />
              <Skeleton className="mt-1 h-4 w-3/4" />
              <Skeleton className="mt-4 h-3 w-24" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {STATIC_TRACKS.map((t) => {
            const Icon = t.icon;
            const isReady = t.href != null || publishedKeys.has(t.key);
            const card = (
              <div
                className={
                  "group relative flex h-full flex-col overflow-hidden rounded-2xl border bg-card p-6 transition-all duration-300 " +
                  (isReady
                    ? "hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg"
                    : "opacity-60")
                }
              >
                {/* 트랙별 색상 좌측 strip — 시각 식별 강화 */}
                {isReady && (
                  <div
                    aria-hidden
                    className={
                      "absolute inset-y-0 left-0 w-1 transition-all group-hover:w-1.5 " +
                      t.color.split(" ").find((c) => c.startsWith("text-"))?.replace("text-", "bg-")
                    }
                  />
                )}
                <div className="flex items-center gap-3">
                  <div className={"flex h-14 w-14 items-center justify-center rounded-2xl shadow-sm transition-transform group-hover:scale-105 " + t.color}>
                    <Icon size={26} />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-lg font-bold tracking-tight sm:text-xl">{t.title}</h2>
                    <p className="text-xs text-muted-foreground">{GUIDE_TRACK_LABELS[t.key]}</p>
                  </div>
                  {!isReady && <Badge variant="secondary">준비 중</Badge>}
                </div>
                <p className="mt-4 flex-1 text-sm leading-relaxed text-muted-foreground">{t.description}</p>
                {isReady && (
                  <div className="mt-5 flex items-center gap-1 text-sm font-semibold text-primary transition-all group-hover:gap-2">
                    <span>바로가기</span>
                    <ArrowRight size={16} />
                  </div>
                )}
              </div>
            );

            return t.href && isReady ? (
              <Link key={t.key} href={t.href} className="block">
                {card}
              </Link>
            ) : (
              <div key={t.key}>{card}</div>
            );
          })}
        </div>
      )}

      <SemesterRoadmap />

      <p className="mt-10 text-center text-xs text-muted-foreground">
        잘못된 정보를 발견하셨나요?{" "}
        <Link href="/contact" className="underline hover:text-primary">
          문의 게시판
        </Link>
        으로 알려주세요. 운영진이 확인 후 즉시 반영합니다.
      </p>
    </div>
  );
}
