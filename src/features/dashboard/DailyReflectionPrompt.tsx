"use client";

/**
 * Daily Reflection Prompt 위젯 (Sprint 67-AR — 교육공학 이론 보강 #6)
 *
 * 이론 근거:
 * - Microlearning (Hug, 2005) — 짧고 집중된 학습 단위가 장기 학습 효과적
 * - Reflective Practice (Schön, 1983) — 학습자가 매일 짧은 회고를 누적하면 메타인지 강화
 *
 * 동작: 사용자 별 고정 시드(uid + 날짜) 기반으로 매일 1개 프롬프트 선택.
 * 클릭 시 사용자가 본인 회고를 자유게시판에 작성하도록 prefilled URL 이동.
 */

import { useMemo } from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, Sparkles } from "lucide-react";
import { useAuthStore } from "@/features/auth/auth-store";

const PROMPTS: { text: string; tag: string }[] = [
  {
    tag: "메타인지",
    text: "이번 주에 본인이 '이해했다고 느꼈지만 사실 잘 모르는' 개념이 있다면 무엇인가요?",
  },
  {
    tag: "전이",
    text: "최근 세미나·논문에서 배운 것을 본인의 연구·진로에 어떻게 적용할 수 있을까요?",
  },
  {
    tag: "회고",
    text: "오늘 학회에서 보낸 시간 중 가장 가치 있었던 30분은 무엇이었나요? 왜 그렇게 느꼈나요?",
  },
  {
    tag: "네트워크",
    text: "이번 주 본인 연구에 도움을 줄 수 있는 사람을 한 명 떠올려보세요. 어떤 질문을 하시겠어요?",
  },
  {
    tag: "비판적 사고",
    text: "최근 본 자료·강의 중 본인이 '동의하지 않는다' 라고 느낀 부분이 있다면, 그 이유를 한 문장으로 정리해보세요.",
  },
  {
    tag: "Bloom 분석",
    text: "본인 현재 학기에서 가장 어려운 학습 단계는 무엇인가요? (기억·이해·응용·분석·평가·창조 중)",
  },
  {
    tag: "Kolb 실험",
    text: "이번 주 새롭게 시도하고 싶은 학습·연구 방법 한 가지를 한 줄로 적어보세요.",
  },
  {
    tag: "ZPD",
    text: "본인 혼자서는 어렵지만 누군가의 도움으로 할 수 있을 것 같은 일은 무엇인가요?",
  },
  {
    tag: "디자인 사고",
    text: "만약 본인이 학회 운영진이라면 어떤 한 가지를 가장 먼저 바꾸시겠어요? 왜죠?",
  },
  {
    tag: "동기",
    text: "최근 학회 활동에서 '내가 잘하고 있다'고 느낀 순간이 있다면 언제, 왜였나요?",
  },
  {
    tag: "사례 학습",
    text: "지금까지 본인이 본 학술대회 발표 중 가장 인상 깊었던 것은? 무엇이 좋았나요?",
  },
  {
    tag: "장기 목표",
    text: "졸업 후 5년 시점의 본인을 그려보세요. 지금 무엇을 시작해야 그 모습에 도달할까요?",
  },
  {
    tag: "협업",
    text: "본인이 잘 모르는 분야의 학회 동료에게 도움을 청한 적이 마지막으로 언제인가요?",
  },
  {
    tag: "교수설계",
    text: "본인이 가르치는 입장이라면, 이번 주 학습한 내용을 학습자에게 어떻게 설명하시겠어요?",
  },
];

/** uid + 날짜로 해시 시드 — 같은 사용자에게 매일 다른 프롬프트, 다음날 또 다른 프롬프트 */
function dailyIndex(userId: string, prompts: number): number {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const seed = `${userId}_${today}`;
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % prompts;
}

export default function DailyReflectionPrompt() {
  const { user } = useAuthStore();

  const prompt = useMemo(() => {
    if (!user?.id) return PROMPTS[0];
    return PROMPTS[dailyIndex(user.id, PROMPTS.length)];
  }, [user?.id]);

  if (!user) return null;

  const reflectTitle = encodeURIComponent(`[오늘의 회고] ${prompt.tag}`);
  const reflectBody = encodeURIComponent(
    `프롬프트: ${prompt.text}\n\n본인 회고:\n\n\n— 매일 5분 회고 (Microlearning + Reflective Practice).`,
  );
  const writeHref = `/board/write?category=free&title=${reflectTitle}&content=${reflectBody}`;

  return (
    <div className="rounded-2xl border-2 border-primary/15 bg-gradient-to-br from-primary/5 via-sky-500/3 to-card p-5 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <div
          className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary"
          aria-hidden
        >
          <Sparkles size={16} />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-bold">오늘의 5분 회고</h3>
          <p className="text-[11px] text-muted-foreground" title="Microlearning(Hug, 2005) + Reflective Practice(Schön, 1983)">
            Microlearning · 학습 효과 누적
          </p>
        </div>
        <span className="hidden items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary sm:inline-flex">
          <BookOpen size={10} aria-hidden />
          {prompt.tag}
        </span>
      </div>

      <p className="rounded-2xl border bg-card p-4 text-sm leading-relaxed text-foreground/90">
        {prompt.text}
      </p>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[10px] leading-relaxed text-muted-foreground/80">
          매일 다른 프롬프트가 노출됩니다. 5분 회고를 누적하면 메타인지가 강화됩니다.
        </p>
        <Link
          href={writeHref}
          className="group inline-flex items-center gap-1 rounded-full bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          회고 작성
          <ArrowRight size={11} className="transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
    </div>
  );
}
