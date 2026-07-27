"use client";

/**
 * SemesterWrappedView — 회원 본인 "이번 학기 학회 발자취"(Wrapped) 리포트.
 *
 * 축적된 활동 데이터를 따뜻한 성장 서사로 되돌려준다. 비교·등수 없이 개인 성장만.
 * v-rework(2026-07-27): 집필·준비도 카드를 걷어내고 ① 학술활동 ② 연구활동
 *  ③ 대학원 생활 ④ 운영진 활동 4개 카테고리 StoryCard 로 재구성.
 *  데이터 읽기는 useSemesterWrapped(대부분 캐시 재사용)에 위임.
 */

import { useRef, useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  Flame,
  CalendarCheck,
  Users,
  FlaskConical,
  GraduationCap,
  Shield,
  Layers,
  ArrowRight,
  Download,
  Trophy,
} from "lucide-react";
import PageContainer from "@/components/ui/page-container";
import { Button } from "@/components/ui/button";
import { BRAND } from "@/lib/brand";
import { useAuthStore } from "@/features/auth/auth-store";
import {
  useSemesterWrapped,
  type WrappedMetrics,
  type WrappedCategory,
  type CategoryKey,
} from "./useSemesterWrapped";

interface Props {
  userId: string;
}

/** 카테고리 아이콘 이름 → lucide 컴포넌트 (2개 조합: 대표/보조). */
const CATEGORY_ICON: Record<CategoryKey, React.ElementType> = {
  academic: Users,
  research: FlaskConical,
  grad: GraduationCap,
  staff: Shield,
};

export default function SemesterWrappedView({ userId }: Props) {
  const role = useAuthStore((s) => s.user?.role);
  const m = useSemesterWrapped(userId, role);

  if (m.isLoading) {
    return (
      <PageContainer width="narrow">
        <div className="space-y-4 py-10">
          <div className="h-40 animate-pulse rounded-3xl bg-muted" aria-busy="true" aria-label="발자취 불러오는 중" />
          <div className="h-32 animate-pulse rounded-2xl bg-muted" />
          <div className="h-32 animate-pulse rounded-2xl bg-muted" />
        </div>
      </PageContainer>
    );
  }

  if (!m.hasData) {
    return (
      <PageContainer width="narrow">
        <div className="mt-10 rounded-3xl border bg-card p-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Sparkles size={26} />
          </div>
          <h1 className="text-lg font-bold">{m.semesterLabel} 발자취를 모으는 중이에요</h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            세미나 참석·연구 활동·대학원 생활을 조금씩 쌓아가면, 이번 학기의
            성장 이야기를 이곳에서 되돌려 드릴게요.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <Link href="/activities">
              <Button size="sm" variant="outline">학술활동 둘러보기</Button>
            </Link>
            <Link href="/mypage">
              <Button size="sm" variant="ghost">마이페이지로</Button>
            </Link>
          </div>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer width="narrow">
      <div className="space-y-4 pb-16">
        <HeroCard m={m} />

        <StoryCard
          icon={CalendarCheck}
          eyebrow="꾸준함"
          title={`${m.totalStudyDays}일 학회와 함께했어요`}
          body={
            m.longestStreak >= 2
              ? `그중 최장 ${m.longestStreak}일은 하루도 빠짐없이 이어졌어요. 작은 하루가 모여 학기가 되었네요.`
              : "하루하루 남긴 발자국이 이번 학기의 리듬이 되었어요."
          }
          stats={[
            { label: "활동한 날", value: `${m.totalStudyDays}일` },
            { label: "최장 연속", value: `${m.longestStreak}일`, icon: Flame },
          ]}
        />

        {m.categories.map((c) => (
          <CategoryCard key={c.key} c={c} m={m} />
        ))}

        <SummaryCard m={m} />
      </div>
    </PageContainer>
  );
}

// ── 하위 컴포넌트 ─────────────────────────────────────────

function HeroCard({ m }: { m: WrappedMetrics }) {
  const top = m.categories[0];
  return (
    <div className="relative overflow-hidden rounded-3xl bg-primary p-8 text-primary-foreground shadow-sm">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-primary-foreground/10 blur-2xl"
      />
      <div className="relative">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-primary-foreground/15 px-3 py-1 text-xs font-medium">
          <Sparkles size={13} />
          {m.semesterLabel} 학회 발자취
        </div>
        <h1 className="mt-4 text-2xl font-bold leading-snug sm:text-3xl">
          이번 학기,
          <br />
          당신이 남긴 성장의 기록
        </h1>
        <p className="mt-3 max-w-md text-sm text-primary-foreground/80">
          비교도 등수도 없어요. 오직 당신이 쌓아 올린 이번 학기의 발자취예요.
          {top && ` 이번 학기 가장 자주 남긴 흔적은 ${top.label}이었어요.`}
        </p>
        <div className="mt-6 flex flex-wrap gap-2 text-sm">
          <HeroChip value={`${m.totalStudyDays}일`} label="활동" />
          {m.categories.slice(0, 3).map((c) => (
            <HeroChip key={c.key} value={`${c.days}일`} label={c.label} />
          ))}
        </div>
      </div>
    </div>
  );
}

function HeroChip({ value, label }: { value: string; label: string }) {
  return (
    <span className="inline-flex items-baseline gap-1 rounded-lg bg-primary-foreground/10 px-2.5 py-1.5">
      <span className="font-bold tabular-nums">{value}</span>
      <span className="text-xs text-primary-foreground/70">{label}</span>
    </span>
  );
}

/** 카테고리별 서사 본문 — 대표 활동을 엮어 따뜻하게. */
function categoryBody(c: WrappedCategory, m: WrappedMetrics): string {
  const labels = (c.topLabels ?? []).join(" · ");
  switch (c.key) {
    case "academic":
      return m.seminarsAttended > 0
        ? `세미나 ${m.seminarsAttended}회를 비롯해 ${labels || "여러 배움"}으로 시야를 넓힌 학기였어요.`
        : `${labels || "배움의 자리"}로 한 걸음씩 나아간 학기였어요.`;
    case "research":
      return m.papersRead > 0
        ? `논문 ${m.papersRead}편을 읽어내고 ${labels || "연구"}에 몰입했어요. 한 편 한 편이 다음 연구의 밑거름이 됩니다.`
        : `${labels || "연구 활동"}에 시간을 쏟았어요. 쌓인 기록이 곧 결실이 됩니다.`;
    case "grad":
      return m.flashcardTotal > 0 && m.flashcardCorrectRate != null
        ? `${labels || "소소한 기록"}과 암기카드 복습(정답률 ${m.flashcardCorrectRate}%)까지, 대학원 일상을 촘촘히 채웠어요.`
        : `${labels || "대학원 일상"} 속 작은 실천들이 모여 이번 학기가 되었어요.`;
    case "staff":
      return `완료한 운영 업무 ${m.staffTasksDone}건, 남긴 업무수행철 ${m.handoverAuthored}건. 보이지 않는 곳에서 학회를 지탱한 헌신이었어요.`;
    default:
      return `${labels}로 이어간 학기였어요.`;
  }
}

function CategoryCard({ c, m }: { c: WrappedCategory; m: WrappedMetrics }) {
  const Icon = CATEGORY_ICON[c.key] ?? Layers;
  const stats: Stat[] = [
    { label: "활동한 날", value: `${c.days}일` },
    { label: "활동 수", value: `${c.count}회` },
  ];
  if (c.key === "staff") {
    stats.length = 0;
    if (m.staffTasksDone > 0) stats.push({ label: "완료 업무", value: `${m.staffTasksDone}건` });
    if (m.handoverAuthored > 0) stats.push({ label: "업무수행철", value: `${m.handoverAuthored}건` });
    stats.push({ label: "활동한 날", value: `${c.days}일` });
  }
  return (
    <StoryCard
      icon={Icon}
      eyebrow={c.eyebrow}
      title={`${c.label}, ${c.days}일의 발자취`}
      body={categoryBody(c, m)}
      stats={stats}
    />
  );
}

interface Stat {
  label: string;
  value: string;
  icon?: React.ElementType;
}

function StoryCard({
  icon: Icon,
  eyebrow,
  title,
  body,
  stats,
}: {
  icon: React.ElementType;
  eyebrow: string;
  title: string;
  body: string;
  stats: Stat[];
}) {
  return (
    <div className="rounded-2xl border bg-card p-6 shadow-sm">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10">
          <Icon size={16} />
        </span>
        {eyebrow}
      </div>
      <h2 className="mt-3 text-lg font-bold leading-snug">{title}</h2>
      <p className="mt-1.5 text-sm text-muted-foreground">{body}</p>
      {stats.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {stats.map((s) => (
            <div
              key={s.label}
              className="flex items-baseline gap-1.5 rounded-xl border bg-muted/40 px-3 py-2"
            >
              {s.icon && <s.icon size={14} className="self-center text-primary" />}
              <span className="text-lg font-bold tabular-nums text-foreground">{s.value}</span>
              <span className="text-xs text-muted-foreground">{s.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SummaryCard({ m }: { m: WrappedMetrics }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [saving, setSaving] = useState(false);

  function handleDownload() {
    setSaving(true);
    try {
      const canvas = canvasRef.current ?? document.createElement("canvas");
      drawShareImage(canvas, m);
      const url = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = url;
      a.download = `학회발자취_${m.semesterLabel.replace(/\s/g, "")}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-2xl border bg-card p-6 shadow-sm">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10">
          <Trophy size={16} />
        </span>
        마무리
      </div>
      <h2 className="mt-3 text-lg font-bold leading-snug">
        {m.semesterLabel}, 참 잘 걸어왔어요
      </h2>
      <p className="mt-1.5 text-sm text-muted-foreground">
        이번 학기 활동 점수 {m.activityScore.toLocaleString()}점.
        {m.categories.length > 0 && (
          <> 학술·연구·대학원·운영을 아우른 {m.categories.map((c) => c.label).join(" · ")}의 기록이었어요.</>
        )}
      </p>

      <canvas ref={canvasRef} width={1080} height={1080} className="hidden" aria-hidden />

      <div className="mt-5 flex flex-wrap gap-2">
        <Button size="sm" onClick={handleDownload} disabled={saving}>
          <Download size={14} className="mr-1.5" />
          {saving ? "이미지 만드는 중…" : "요약 이미지 저장"}
        </Button>
        <Link href="/mypage">
          <Button size="sm" variant="outline">
            마이페이지로
            <ArrowRight size={14} className="ml-1.5" />
          </Button>
        </Link>
      </div>
      <p className="mt-3 text-[11px] text-muted-foreground">
        저장한 이미지는 SNS·포트폴리오에 자유롭게 공유할 수 있어요.
      </p>
    </div>
  );
}

// ── 유틸 ──────────────────────────────────────────────────

/** 요약 공유 이미지(1080x1080) — 브랜드 네이비 카드. 외부 의존 없이 캔버스로 렌더. */
function drawShareImage(canvas: HTMLCanvasElement, m: WrappedMetrics) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const W = 1080;
  const H = 1080;

  // 배경 (브랜드 네이비 그라데이션)
  const grad = ctx.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, BRAND.navy);
  grad.addColorStop(1, "#001a3d");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  ctx.textAlign = "left";

  // 상단 라벨
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.font = "600 34px system-ui, sans-serif";
  ctx.fillText(`${m.semesterLabel} · 연세교육공학회`, 90, 150);

  // 타이틀
  ctx.fillStyle = "#ffffff";
  ctx.font = "700 76px system-ui, sans-serif";
  ctx.fillText("나의 학회 발자취", 90, 250);

  // 통계 그리드 (2열) — 총 활동일·최장 연속 + 카테고리별 활동일 상위 4종
  const items: { value: string; label: string }[] = [
    { value: `${m.totalStudyDays}일`, label: "활동한 날" },
    { value: `${m.longestStreak}일`, label: "최장 연속" },
  ];
  for (const c of m.categories.slice(0, 4)) {
    items.push({ value: `${c.days}일`, label: c.label });
  }
  // 6칸을 채우지 못하면 요약 지표로 보충
  if (items.length < 6 && m.papersRead > 0) {
    items.push({ value: `${m.papersRead}편`, label: "읽은 논문" });
  }
  if (items.length < 6) {
    items.push({ value: `${m.activityScore.toLocaleString()}`, label: "활동 점수" });
  }
  const shown = items.slice(0, 6);

  const startY = 400;
  const rowH = 195;
  const colX = [90, 570];
  shown.forEach((it, i) => {
    const x = colX[i % 2];
    const y = startY + Math.floor(i / 2) * rowH;
    ctx.fillStyle = "rgba(255,255,255,0.06)";
    roundRect(ctx, x, y, 420, 160, 28);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.font = "700 64px system-ui, sans-serif";
    ctx.fillText(it.value, x + 40, y + 80);
    ctx.fillStyle = "rgba(255,255,255,0.65)";
    ctx.font = "500 30px system-ui, sans-serif";
    ctx.fillText(it.label, x + 40, y + 125);
  });

  // 하단 서명
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.font = "500 28px system-ui, sans-serif";
  ctx.fillText("yonsei-edtech.vercel.app", 90, H - 70);
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
