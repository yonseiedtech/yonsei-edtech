"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import LoadingSpinner from "@/components/ui/loading-spinner";
import { GraduationCap, BookOpen, ScrollText, Award, ArrowRight, Compass } from "lucide-react";
import { guideTracksApi } from "@/lib/bkend";
import { GUIDE_TRACK_LABELS, type GuideTrack, type GuideTrackKey } from "@/types";

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
    href: null,
    color: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  },
  {
    key: "comprehensive_exam",
    title: "종합시험 대비",
    description: "응시 자격·출제 영역·기출·스터디 가이드.",
    icon: ScrollText,
    href: null,
    color: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  },
  {
    key: "graduation",
    title: "졸업 준비",
    description: "논문 일정·심사 절차·졸업 후 네트워크.",
    icon: Award,
    href: null,
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
    <div className="mx-auto max-w-6xl px-4 py-12">
      <header className="mb-10 flex items-start gap-4">
        <Compass size={32} className="mt-1 shrink-0 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">인지디딤판</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            연세교육공학 구성원이 입학부터 졸업까지 자력으로 따라갈 수 있도록 안내하는 가이드 모음입니다.
            각 트랙은 단계별 체크리스트·자료·신청 안내를 한 곳에 모아 보여줍니다.
          </p>
        </div>
      </header>

      {loading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {STATIC_TRACKS.map((t) => {
            const Icon = t.icon;
            const isReady = t.href != null || publishedKeys.has(t.key);
            const card = (
              <div
                className={
                  "group flex h-full flex-col rounded-2xl border p-6 transition-shadow " +
                  (isReady ? "hover:shadow-md" : "opacity-60")
                }
              >
                <div className="flex items-center gap-3">
                  <div className={"flex h-12 w-12 items-center justify-center rounded-xl " + t.color}>
                    <Icon size={22} />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-lg font-bold">{t.title}</h2>
                    <p className="text-xs text-muted-foreground">{GUIDE_TRACK_LABELS[t.key]}</p>
                  </div>
                  {!isReady && <Badge variant="secondary">준비 중</Badge>}
                </div>
                <p className="mt-4 flex-1 text-sm text-muted-foreground">{t.description}</p>
                {isReady && (
                  <div className="mt-4 flex items-center gap-1 text-sm font-semibold text-primary group-hover:gap-2 transition-all">
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
