"use client";

/**
 * SemesterWrappedView — 회원 본인 "이번 학기 학회 발자취"(Wrapped) 리포트 (v6-H2).
 *
 * 축적된 활동 데이터를 따뜻한 성장 서사로 되돌려준다. 비교·등수 없이 개인 성장만.
 * 6~8장의 하이라이트 카드 스크롤 + 요약 1장 공유 이미지(캔버스) 다운로드.
 * 데이터 읽기는 useSemesterWrapped(대부분 캐시 재사용)에 위임.
 */

import { useRef, useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  Flame,
  CalendarCheck,
  BookOpen,
  PenLine,
  ClipboardCheck,
  Layers,
  Users,
  ArrowRight,
  Download,
  Trophy,
} from "lucide-react";
import PageContainer from "@/components/ui/page-container";
import { Button } from "@/components/ui/button";
import { BRAND } from "@/lib/brand";
import { useSemesterWrapped, type WrappedMetrics } from "./useSemesterWrapped";

interface Props {
  userId: string;
}

export default function SemesterWrappedView({ userId }: Props) {
  const m = useSemesterWrapped(userId);

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
            세미나 참석·논문 읽기·진단평가·집필을 조금씩 쌓아가면, 이번 학기의
            성장 이야기를 이곳에서 되돌려 드릴게요.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <Link href="/diagnosis">
              <Button size="sm" variant="outline">연구 준비도 진단하기</Button>
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
            { label: "학습한 날", value: `${m.totalStudyDays}일` },
            { label: "최장 연속", value: `${m.longestStreak}일`, icon: Flame },
          ]}
        />

        {m.papersRead > 0 && (
          <StoryCard
            icon={BookOpen}
            eyebrow="읽기"
            title={`논문 ${m.papersRead}편을 읽어냈어요`}
            body={
              m.longestReadPaper
                ? `가장 오래 머문 논문은 「${truncate(m.longestReadPaper.title, 40)}」 — ${m.longestReadPaper.durationMin}분 동안 정독했어요.`
                : "한 편 한 편이 다음 연구의 밑거름이 됩니다."
            }
            stats={[{ label: "완독한 논문", value: `${m.papersRead}편` }]}
          />
        )}

        {m.writingPeakChars > 0 && (
          <StoryCard
            icon={PenLine}
            eyebrow="집필"
            title={`${m.writingPeakChars.toLocaleString()}자를 써 내려갔어요`}
            body={
              m.writingDelta > 0
                ? `이번 학기에만 ${m.writingDelta.toLocaleString()}자가 늘었어요. 문장이 쌓여 논문이 되어갑니다.`
                : "한 글자 한 글자, 생각을 글로 옮긴 시간이었어요."
            }
            stats={[
              { label: "도달 분량", value: `${m.writingPeakChars.toLocaleString()}자` },
              ...(m.writingDelta > 0
                ? [{ label: "이번 학기 증가", value: `+${m.writingDelta.toLocaleString()}자` }]
                : []),
            ]}
          />
        )}

        {(m.diagnosticCount > 0 || m.latestPaperReadiness != null) && (
          <StoryCard
            icon={ClipboardCheck}
            eyebrow="준비도"
            title={
              m.diagnosticCount > 0
                ? `연구 준비도를 ${m.diagnosticCount}번 점검했어요`
                : "연구 준비도를 확인했어요"
            }
            body={readinessBody(m)}
            stats={[
              ...(m.latestPaperReadiness != null
                ? [{ label: "논문 작성 준비도", value: `${m.latestPaperReadiness}` }]
                : []),
              ...(m.latestAnalysisReadiness != null
                ? [{ label: "연구 분석 준비도", value: `${m.latestAnalysisReadiness}` }]
                : []),
            ]}
          />
        )}

        {m.flashcardTotal > 0 && (
          <StoryCard
            icon={Layers}
            eyebrow="복습"
            title={`암기카드 ${m.flashcardTotal}장을 쌓았어요`}
            body={
              m.flashcardCorrectRate != null
                ? `복습 정답률 ${m.flashcardCorrectRate}%. 틀린 개념을 되짚으며 약점을 채워갔어요.`
                : "약점 개념을 카드로 만들어 두었어요. 틈틈이 뒤집어 보세요."
            }
            stats={[
              { label: "만든 카드", value: `${m.flashcardTotal}장` },
              ...(m.flashcardCorrectRate != null
                ? [{ label: "정답률", value: `${m.flashcardCorrectRate}%` }]
                : []),
            ]}
          />
        )}

        {m.seminarsAttended > 0 && (
          <StoryCard
            icon={Users}
            eyebrow="함께"
            title={`세미나 ${m.seminarsAttended}회에 참석했어요`}
            body="같은 길을 걷는 동료들과 나눈 시간이 연구의 시야를 넓혀 주었어요."
            stats={[{ label: "참석 세미나", value: `${m.seminarsAttended}회` }]}
          />
        )}

        <SummaryCard m={m} />
      </div>
    </PageContainer>
  );
}

// ── 하위 컴포넌트 ─────────────────────────────────────────

function HeroCard({ m }: { m: WrappedMetrics }) {
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
          아래로 넘기며 하나씩 되돌아 보세요.
        </p>
        <div className="mt-6 flex flex-wrap gap-2 text-sm">
          <HeroChip value={`${m.totalStudyDays}일`} label="학습" />
          {m.papersRead > 0 && <HeroChip value={`${m.papersRead}편`} label="논문" />}
          {m.seminarsAttended > 0 && <HeroChip value={`${m.seminarsAttended}회`} label="세미나" />}
          {m.flashcardTotal > 0 && <HeroChip value={`${m.flashcardTotal}장`} label="암기카드" />}
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
        {m.topLabels.length > 0 && (
          <> 가장 자주 남긴 활동은 {m.topLabels.map((t) => t.label).join(" · ")}였어요.</>
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

function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n)}…` : s;
}

function readinessBody(m: WrappedMetrics): string {
  if (m.paperReadinessDelta != null && (m.paperReadinessDelta !== 0 || m.analysisReadinessDelta !== 0)) {
    const parts: string[] = [];
    if (m.paperReadinessDelta !== 0) {
      const s = m.paperReadinessDelta > 0 ? `+${m.paperReadinessDelta}` : `${m.paperReadinessDelta}`;
      parts.push(`논문 작성 ${s}`);
    }
    if (m.analysisReadinessDelta != null && m.analysisReadinessDelta !== 0) {
      const s = m.analysisReadinessDelta > 0 ? `+${m.analysisReadinessDelta}` : `${m.analysisReadinessDelta}`;
      parts.push(`연구 분석 ${s}`);
    }
    return `학기 초 대비 준비도가 ${parts.join(", ")}만큼 움직였어요. 진단이 성장의 좌표가 되었네요.`;
  }
  return "약점을 마주하고 다시 진단한 그 용기가 이미 준비의 절반이에요.";
}

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

  // 통계 그리드 (2열)
  const items: { value: string; label: string }[] = [
    { value: `${m.totalStudyDays}일`, label: "학습한 날" },
    { value: `${m.longestStreak}일`, label: "최장 연속" },
    { value: `${m.papersRead}편`, label: "읽은 논문" },
    { value: `${m.seminarsAttended}회`, label: "참석 세미나" },
    {
      value: m.flashcardCorrectRate != null ? `${m.flashcardCorrectRate}%` : `${m.flashcardTotal}장`,
      label: m.flashcardCorrectRate != null ? "암기카드 정답률" : "암기카드",
    },
    {
      value:
        m.writingPeakChars > 0
          ? `${Math.round(m.writingPeakChars / 1000)}k자`
          : `${m.activityScore.toLocaleString()}`,
      label: m.writingPeakChars > 0 ? "집필 분량" : "활동 점수",
    },
  ];

  const startY = 400;
  const rowH = 195;
  const colX = [90, 570];
  items.forEach((it, i) => {
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
