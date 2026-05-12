"use client";

/**
 * 학기별 로드맵 (Sprint 67-AR — 운영진 CMS 전환)
 *
 * Firestore `roadmap_stages` 컬렉션에서 동적으로 불러오며, 운영진이 콘솔에서
 * 즉시 수정 가능. Firestore 가 비어있으면 정적 fallback 로 동작.
 * 본인 학기 자동 매칭 + 강조 유지.
 */

import { useEffect, useMemo, useState } from "react";
import { BookOpen, Brain, Check, CheckCircle2, Sparkles, Star, Target } from "lucide-react";
import { useAuthStore } from "@/features/auth/auth-store";
import { getUserCumulativeSemesterCount } from "@/lib/interview-target";
import { roadmapStagesApi } from "@/lib/bkend";
import {
  BLOOM_STAGE_LABELS,
  ROADMAP_COLOR_PRESETS,
  type BloomStage,
  type RoadmapColorPreset,
  type RoadmapStage,
} from "@/types/steppingstone";

interface RoadmapItem {
  semester: number;
  title: string;
  shortTag: string;
  items: string[];
  color: string;
  bgColor: string;
  isAlumni?: boolean;
  bloomStage?: BloomStage;
}

/** Firestore 가 비어있을 때 사용할 정적 fallback */
const STATIC_FALLBACK: RoadmapItem[] = [
  {
    semester: 1,
    title: "1학기차 — 적응과 시작",
    shortTag: "정착",
    color: "text-blue-700 dark:text-blue-300",
    bgColor: "border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/20",
    bloomStage: "understand",
    items: [
      "신입생 OT 참여 + 학회 가입 신청",
      "지도교수님 정하기 (1학기 말 권장)",
      "교육공학 핵심 과목 (교수설계론·학습이론) 수강",
      "세미나 정기 참여 — 학회 분위기 익히기",
      "동기 명함 교환 + 네트워크 형성",
    ],
  },
  {
    semester: 2,
    title: "2학기차 — 연구주제 모색",
    shortTag: "탐색",
    color: "text-emerald-700 dark:text-emerald-300",
    bgColor: "border-emerald-200 bg-emerald-50/50 dark:border-emerald-900 dark:bg-emerald-950/20",
    bloomStage: "apply",
    items: [
      "관심 분야 키워드·연구 주제 명확화 (마이페이지)",
      "지도교수 연구실 합류 또는 프로젝트 참여",
      "교육공학 학술대회 1회 이상 참석 (춘·추계)",
      "분석 노트로 본인 연구 자산 누적 시작",
      "선배·졸업생 인터뷰 참여 — 진로 정보 수집",
    ],
  },
  {
    semester: 3,
    title: "3학기차 — 본격 연구",
    shortTag: "본격",
    color: "text-amber-700 dark:text-amber-300",
    bgColor: "border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20",
    bloomStage: "analyze",
    items: [
      "논문 주제 1차 구체화 + 지도교수 협의",
      "관련 선행연구 정리 — 에듀테크 아카이브 활용",
      "학술대회 포스터·발표 신청 도전",
      "필요 시 IRB 신청 준비 시작",
      "프로젝트·스터디 1개 이상 적극 참여",
    ],
  },
  {
    semester: 4,
    title: "4학기차 — 논문 집필",
    shortTag: "집필",
    color: "text-rose-700 dark:text-rose-300",
    bgColor: "border-rose-200 bg-rose-50/50 dark:border-rose-900 dark:bg-rose-950/20",
    bloomStage: "evaluate",
    items: [
      "학위논문 초고 작성 (지도교수와 격주 미팅 권장)",
      "데이터 수집·분석 완료",
      "학술대회 본 발표 1회 이상 권장",
      "디펜스 연습 도구로 사전 점검 시작",
      "졸업 행정 일정 캘린더에 등록",
    ],
  },
  {
    semester: 5,
    title: "디펜스 학기 — 심사 준비",
    shortTag: "심사",
    color: "text-purple-700 dark:text-purple-300",
    bgColor: "border-purple-200 bg-purple-50/50 dark:border-purple-900 dark:bg-purple-950/20",
    bloomStage: "create",
    items: [
      "디펜스 연습 (음성 채점·따라 읽기) 매주 1회",
      "심사위원 구성 + 사전 발표",
      "최종 논문 제출 + 심사 일정 확정",
      "디펜스 발표 자료 5회 이상 리허설",
      "졸업 후 진로 — 동문 네트워크 활용",
    ],
  },
  {
    semester: 7,
    title: "졸업 후 — 동문 단계",
    shortTag: "동문",
    color: "text-slate-700 dark:text-slate-300",
    bgColor: "border-slate-200 bg-slate-50/50 dark:border-slate-900 dark:bg-slate-950/20",
    bloomStage: "create",
    items: [
      "졸업생 회원으로 전환 + 본인 학위논문 등록",
      "후배 세미나·인터뷰 참여 — 멘토로",
      "학술대회 동문 참석 — 네트워크 유지",
      "관심 분야 채용·강연 정보 학회를 통해 공유",
      "후배 멘토링 신청 받기 (네트워킹 Map 활용)",
    ],
  },
];

function presetToColors(preset: RoadmapColorPreset): { color: string; bgColor: string } {
  const p = ROADMAP_COLOR_PRESETS[preset];
  return { color: p.textColor, bgColor: p.bgColor };
}

function stageToItem(s: RoadmapStage): RoadmapItem {
  const { color, bgColor } = presetToColors(s.colorPreset);
  return {
    semester: s.matchSemester,
    title: s.title,
    shortTag: s.shortTag,
    items: s.items,
    color,
    bgColor,
    isAlumni: s.isAlumni,
    bloomStage: s.bloomStage,
  };
}

export default function SemesterRoadmap() {
  const { user } = useAuthStore();
  const myCumulative = user ? getUserCumulativeSemesterCount(user) ?? 1 : null;
  const isAlumni = !!(user as { isAlumni?: boolean } | null)?.isAlumni;

  // Firestore 에서 운영진이 관리하는 stage 들 불러오기 (없으면 fallback)
  const [stages, setStages] = useState<RoadmapItem[]>(STATIC_FALLBACK);
  useEffect(() => {
    roadmapStagesApi
      .listPublished()
      .then((res) => {
        const data = (res.data ?? []) as RoadmapStage[];
        if (data.length > 0) {
          const sorted = [...data].sort((a, b) => a.order - b.order);
          setStages(sorted.map(stageToItem));
        }
      })
      .catch(() => {
        // ignore - keep fallback
      });
  }, []);

  // 본인 학기 매칭 — Firestore 가 isAlumni 단계를 정의했는지에 따라 동작
  const myMatchedSemester = useMemo(() => {
    if (!user) return null;
    // alumni 우선 — isAlumni stage 가 있으면 그 matchSemester, 없으면 데이터 중 최대값
    if (isAlumni) {
      const alumniStage = stages.find((s) => s.isAlumni);
      return alumniStage?.semester ?? null;
    }
    if (myCumulative == null) return null;
    // 사용자 학기 이상 중 가장 가까운 stage 매칭 — 정확 일치 우선
    const exact = stages.find((s) => s.semester === myCumulative);
    if (exact) return exact.semester;
    // 그 외엔 가장 큰 stage 중 사용자 학기 이하인 것 (e.g. 7학기 사용자 → 5학기차 stage)
    const eligible = stages
      .filter((s) => !s.isAlumni && s.semester <= myCumulative)
      .sort((a, b) => b.semester - a.semester);
    return eligible[0]?.semester ?? null;
  }, [user, myCumulative, isAlumni, stages]);

  const ROADMAP = stages;

  return (
    <section className="mt-12">
      <div className="mb-5 flex items-baseline justify-between gap-2">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Target size={20} className="text-primary" />
            학기별 로드맵
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            입학부터 졸업, 동문까지 — 학기마다 꼭 알아야 할 것을 정리했어요.
          </p>
        </div>
        {myMatchedSemester != null && (
          <div className="hidden shrink-0 items-center gap-1 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary sm:inline-flex">
            <Sparkles size={11} />
            현재 내 단계
          </div>
        )}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {ROADMAP.map((stage) => {
          const isMine = myMatchedSemester === stage.semester;
          return (
            <div
              key={stage.semester}
              className={`relative rounded-2xl border-2 p-5 transition-all ${
                isMine
                  ? "border-primary shadow-lg ring-2 ring-primary/20"
                  : `${stage.bgColor} hover:shadow-md`
              }`}
            >
              {isMine && (
                <span className="absolute -top-3 left-4 inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-0.5 text-[11px] font-bold text-primary-foreground shadow-sm">
                  <Star size={10} className="fill-current" />내 학기
                </span>
              )}
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold ${
                    isMine ? "bg-primary text-primary-foreground" : `bg-card ${stage.color}`
                  }`}
                >
                  {stage.semester === 7 ? "졸" : stage.semester}
                </span>
                <h3 className={`flex-1 font-bold ${isMine ? "text-primary" : stage.color}`}>
                  {stage.title}
                </h3>
              </div>
              {stage.bloomStage && (
                <div
                  className="mt-2 inline-flex items-center gap-1 rounded-full border bg-card/60 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground"
                  title="Bloom's Taxonomy (Anderson & Krathwohl, 2001) — 본 학기 주된 인지 활동 단계"
                >
                  <Brain size={9} aria-hidden />
                  인지 단계 · {BLOOM_STAGE_LABELS[stage.bloomStage]}
                </div>
              )}
              <ul className="mt-3 space-y-1.5">
                {stage.items.map((item, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-sm leading-relaxed text-foreground/80"
                  >
                    <CheckCircle2
                      size={14}
                      className={`mt-0.5 shrink-0 ${
                        isMine ? "text-primary" : "text-muted-foreground/60"
                      }`}
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      {!user && (
        <div className="mt-6 rounded-2xl border-2 border-dashed border-primary/30 bg-primary/5 p-5 text-center">
          <BookOpen size={20} className="mx-auto mb-2 text-primary" />
          <p className="text-sm font-medium">
            로그인하면 본인 학기에 맞는 로드맵이 자동 강조됩니다.
          </p>
          <a
            href="/auth/login"
            className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
          >
            <Check size={14} />
            로그인하기
          </a>
        </div>
      )}
    </section>
  );
}
