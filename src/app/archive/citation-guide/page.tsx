"use client";

/**
 * 논문 인용 가이드 (아카이브 신규 정적 페이지)
 *
 * 인용하는 "행위" 자체에 초점: 왜 인용하는가·표절, 직접/간접 인용, 내 말로 쓰는 법,
 * 본문 인용 표기(저자 수별), 재인용 지양, 인용 윤리.
 *
 * 참고문헌 "형식"(자료 유형별 APA reference list, DOI 등)은 /archive/apa-style 가 담당.
 * 두 페이지는 상호 링크로 연계한다.
 *
 * 본문 인용·저자 수별 표기·직접/간접 구분·재인용 지양·4단계 패러프레이즈는 강의 자료 기반(검증).
 * 기관 저자/저자 없음/표·그림 인용 등 구체 형식은 APA 7판 통용 형식으로 안내하되 "지침 확인"
 * 디스클레이머를 명시한다. 모든 예시는 형식 설명용 가상 예시(가상 저자)이다.
 */

import Link from "next/link";
import { Quote, ArrowLeft, AlertTriangle, CheckCircle2, XCircle, MinusCircle } from "lucide-react";
import PageHeader from "@/components/ui/page-header";
import PageContainer from "@/components/ui/page-container";
import { Separator } from "@/components/ui/separator";
import InlineNotification from "@/components/ui/inline-notification";
import ArchiveStickyToc, { type ArchiveTocSection } from "@/components/archive/ArchiveStickyToc";

const TOC_SECTIONS: ArchiveTocSection[] = [
  { id: "why-cite", label: "1. 왜 인용하는가 · 표절" },
  { id: "in-text", label: "2. 직접 vs 간접 인용" },
  { id: "paraphrase", label: "3. 내 말로 쓰는 법" },
  { id: "references", label: "4. 참고문헌 · 형식 요약" },
  { id: "ethics", label: "5. 인용 윤리 · 재인용" },
];

function SectionTitle({ no, children }: { no: number; children: React.ReactNode }) {
  return (
    <h2 className="flex items-center gap-2 font-display text-lg font-semibold tracking-tight">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary">
        {no}
      </span>
      {children}
    </h2>
  );
}

/** 본문 인용 표기 — 저자 수별 (저자-연도, APA 기준) */
const IN_TEXT_FORMATS: { label: string; narrative: string; parenthetical: string }[] = [
  { label: "저자 1명", narrative: "홍길동(2020)에 의하면 ~", parenthetical: "~ (홍길동, 2020)." },
  { label: "저자 2명", narrative: "홍길동과 김연구(2020)는 ~", parenthetical: "~ (홍길동, 김연구, 2020)." },
  { label: "저자 3명 이상", narrative: "홍길동 외(2020)는 ~", parenthetical: "~ (홍길동 외, 2020)." },
  {
    label: "복수 연구 동시 인용",
    narrative: "여러 연구에서 일관되게 보고되었다",
    parenthetical: "~ (이연구, 2020; 김박사, 2021; 최연구, 2022).",
  },
];

/** 표절 3유형 */
const PLAGIARISM_TYPES: { title: string; body: string }[] = [
  {
    title: "① 출처 미표기",
    body: "타인의 연구 결과를 자기 발견처럼 출처 없이 서술하는 것.",
  },
  {
    title: "② 원문 복붙 / 유의어 치환",
    body: "원문을 그대로, 또는 거의 그대로 가져오는 것. 출처를 달았더라도 문장 구조가 같고 단어만 유의어로 바꾸면 표절로 간주됩니다.",
  },
  {
    title: "③ 뭉뚱그린 인용",
    body: "누가·누구에게·어떤 경로인지 불명확하게 두루뭉술하게 인용하는 것.",
  },
];

/** 내 말로 쓰기 4단계 */
const PARAPHRASE_STEPS: { step: string; detail: string }[] = [
  { step: "이해될 때까지 5~10회 정독", detail: "인용할 부분을 천천히 반복해 읽어 구조를 파악합니다." },
  { step: "원문 창을 닫고 말로 설명", detail: "화면을 내린 뒤 친구·대학교 1학년에게 설명하듯 내 말로 풀어냅니다." },
  { step: "원문과 비교·수정", detail: "다시 원문을 펴서 빠진 부분·틀린 내용을 찾아 고칩니다." },
  { step: "반복 후 출처 표기", detail: "내용이 괜찮아질 때까지 반복하고, 마지막에 출처를 답니다." },
];

/** 간접인용 3버전 비교 */
const PARAPHRASE_VERSIONS: {
  kind: "bad" | "weak" | "good";
  label: string;
  text: string;
  why: string;
}[] = [
  {
    kind: "bad",
    label: "❌ 표절에 가까움 (단어만 치환)",
    text: "스마트폰에 지나치게 의존하는 것은 청소년의 수업 집중력을 떨어뜨리고 학습 참여 동기를 낮추는 것으로 확인되었다.",
    why: "문장 구조가 원문과 동일하고 단어만 유의어로 바꿈 → 표절.",
  },
  {
    kind: "weak",
    label: "△ 불완전한 간접인용 (너무 뭉뚱그림)",
    text: "이연구(2021)는 스마트폰 과의존이 학업에 부정적 영향을 준다고 했다.",
    why: "누가·어떤 경로로·무엇에 영향을 주는지 불명확.",
  },
  {
    kind: "good",
    label: "✅ 올바른 간접인용 (문장 전체 재작성)",
    text: "이연구(2021)에 의하면 스마트폰 사용을 스스로 조절하지 못하는 청소년일수록 수업 중 집중을 유지하기 어려우며, 학교 학습 활동에 능동적으로 참여하려는 의지도 낮아지는 경향이 있다.",
    why: "단어·구조를 전면 변경하고 내용을 풍부하게 — 핵심 의미는 유지.",
  },
];

const VERSION_STYLE: Record<
  (typeof PARAPHRASE_VERSIONS)[number]["kind"],
  { border: string; bg: string; head: string; body: string; icon: typeof CheckCircle2 }
> = {
  bad: {
    border: "border-destructive/20",
    bg: "bg-destructive/5",
    head: "text-destructive",
    body: "text-destructive",
    icon: XCircle,
  },
  weak: {
    border: "border-warning/20",
    bg: "bg-warning/5",
    head: "text-warning",
    body: "text-warning",
    icon: MinusCircle,
  },
  good: {
    border: "border-success/20",
    bg: "bg-success/5",
    head: "text-success",
    body: "text-success",
    icon: CheckCircle2,
  },
};

export default function CitationGuidePage() {
  return (
    <PageContainer width="default">
      <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
        <Link
          href="/archive"
          className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft size={16} />
          교육공학 아카이브로
        </Link>

        <div className="lg:grid lg:grid-cols-[1fr_200px] lg:gap-6">
          <div className="min-w-0 lg:max-w-3xl">
            <PageHeader
              icon={Quote}
              title="논문 인용 가이드"
              description="인용하는 행위 자체 — 직접·간접 인용, 표절 회피, 내 말로 쓰는 법, 본문 인용 표기, 재인용·윤리를 정리했습니다."
            />

            <Separator className="mt-6" />

            <div className="mt-6">
              <InlineNotification
                kind="info"
                title="이 가이드에 대하여"
                description={
                  <span>
                    인용의 원칙과 표기 방법을 교육공학 연구자용으로 정리한 참고 자료입니다. 모든 예시는{" "}
                    <strong>형식 설명용 가상 예시</strong>(가상의 저자·연구)이며 실제 문헌이 아닙니다.
                    자료 유형별 참고문헌 형식·DOI는{" "}
                    <Link href="/archive/apa-style" className="font-medium text-primary underline">
                      APA 가이드
                    </Link>
                    , 선행연구를 엮어 서론을 쓰는 법은{" "}
                    <Link href="/archive/literature-review-guide" className="font-medium text-primary underline">
                      선행연구·서론 가이드
                    </Link>
                    를 참고하세요. 최종 표기·인용 형식은 투고 학술지 기준과 소속 대학원 지침,
                    지도교수 안내를 우선 따르시기 바랍니다.
                  </span>
                }
              />
            </div>

            {/* ── 1. 왜 인용하는가 · 표절 ── */}
            <section id="why-cite" className="mt-8 space-y-3 scroll-mt-24">
              <SectionTitle no={1}>왜 인용하는가 · 표절이란</SectionTitle>
              <p className="text-sm leading-relaxed text-muted-foreground">
                논문은 선배 연구자들의 어깨 위에 올라서서 한 발 더 나아가는 선언입니다. 인용은 그들의
                작업을 공식 인정하고 <strong className="text-foreground">내 주장의 근거</strong>를 만드는
                행위이며, 근거 없는 주장은 학술적 글이 되기 어렵습니다. 잘못된 인용은 표절로, 학문적 윤리
                위반이자 장기적 검증 리스크가 됩니다.
              </p>
              <div className="grid gap-3 sm:grid-cols-3">
                {PLAGIARISM_TYPES.map((t) => (
                  <div key={t.title} className="rounded-xl border bg-card p-4">
                    <p className="text-sm font-semibold leading-snug">{t.title}</p>
                    <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{t.body}</p>
                  </div>
                ))}
              </div>
              <div className="flex items-start gap-2 rounded-xl border border-destructive/20 bg-destructive/5 p-3.5 text-xs leading-relaxed text-destructive">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                <p>
                  <strong>출처를 달아도 표절일 수 있습니다.</strong> 문장 구조가 원문과 같고 단어만
                  유의어로 바꾸면 표절로 간주됩니다. 핵심은 단어 교체가 아니라 <strong>문장 구조를 완전히
                  바꾸고 내용을 내 이해로 재구성</strong>하는 것입니다.
                </p>
              </div>
            </section>

            {/* ── 2. 직접 vs 간접 인용 ── */}
            <section id="in-text" className="mt-8 space-y-3 scroll-mt-24">
              <SectionTitle no={2}>본문 인용 — 직접 vs 간접</SectionTitle>
              <div className="overflow-x-auto rounded-xl border">
                <table className="w-full min-w-[520px] text-left text-xs">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="px-3 py-2 font-semibold">구분</th>
                      <th className="px-3 py-2 font-semibold">정의</th>
                      <th className="px-3 py-2 font-semibold">큰따옴표</th>
                      <th className="px-3 py-2 font-semibold">출처 표기</th>
                      <th className="px-3 py-2 font-semibold">사용 빈도</th>
                    </tr>
                  </thead>
                  <tbody className="text-muted-foreground">
                    <tr className="border-t">
                      <td className="px-3 py-2.5 font-medium text-foreground">직접 인용</td>
                      <td className="px-3 py-2.5">원문을 그대로 가져옴</td>
                      <td className="px-3 py-2.5">O</td>
                      <td className="px-3 py-2.5">O (쪽수 포함)</td>
                      <td className="px-3 py-2.5 text-destructive">최소화</td>
                    </tr>
                    <tr className="border-t">
                      <td className="px-3 py-2.5 font-medium text-foreground">간접 인용</td>
                      <td className="px-3 py-2.5">이해한 내용을 내 언어로 다시 씀</td>
                      <td className="px-3 py-2.5">X</td>
                      <td className="px-3 py-2.5 font-semibold text-foreground">반드시 O</td>
                      <td className="px-3 py-2.5 text-success">대부분</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">
                직접 인용이 많으면 &ldquo;논문을 안 읽었거나 패러프레이징 노력을 안 했다&rdquo;고
                평가될 수 있어 최소화합니다. 직접 인용은{" "}
                <strong className="text-foreground">법률 조항·공식 정의·특정 개념의 최초 정의</strong>처럼
                원문 표현을 바꾸면 의미가 달라지는 경우에만 예외적으로 사용합니다. 간접 인용도{" "}
                <strong className="text-foreground">출처는 반드시 표기</strong>합니다.
              </p>

              <p className="pt-1 text-sm font-medium">본문 인용 표기 (저자 수별)</p>
              <div className="space-y-2">
                {IN_TEXT_FORMATS.map((f) => (
                  <div key={f.label} className="rounded-xl border bg-card p-3.5">
                    <p className="text-sm font-semibold">{f.label}</p>
                    <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
                      <p className="rounded-lg bg-muted/50 px-2.5 py-1.5 text-xs leading-relaxed">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">서술식</span>
                        <br />
                        {f.narrative}
                      </p>
                      <p className="rounded-lg bg-muted/50 px-2.5 py-1.5 text-xs leading-relaxed">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">괄호식</span>
                        <br />
                        {f.parenthetical}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground">
                ※ 학술지에 따라 쉼표 대신 가운데점(·)·&ldquo;and&rdquo;·&ldquo;&amp;&rdquo;를 쓰거나,
                3인 이상도 첫 인용 시 전원 표기 후 이후 &lsquo;외&rsquo;를 쓰는 등 변형이 있습니다.{" "}
                <strong className="text-foreground">투고 학술지 기준</strong>을 우선하세요. 직접 인용의
                쪽수 표기(p./pp.)와 자료 유형별 형식은{" "}
                <Link href="/archive/apa-style" className="font-medium text-primary underline">
                  APA 가이드
                </Link>
                를 참고하세요.
              </p>
            </section>

            {/* ── 3. 내 말로 쓰는 법 ── */}
            <section id="paraphrase" className="mt-8 space-y-3 scroll-mt-24">
              <SectionTitle no={3}>내 말로 쓰는 법 — 4단계 + 비교 예시</SectionTitle>
              <ol className="space-y-2">
                {PARAPHRASE_STEPS.map((s, i) => (
                  <li key={i} className="flex gap-3 rounded-xl border bg-card p-3.5">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-xs font-bold text-primary">
                      {i + 1}
                    </span>
                    <div>
                      <p className="text-sm font-medium">{s.step}</p>
                      <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{s.detail}</p>
                    </div>
                  </li>
                ))}
              </ol>
              <div className="flex items-start gap-2 rounded-xl border border-warning/20 bg-warning/5 p-3.5 text-xs leading-relaxed text-warning">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                <p>
                  원문을 옆에 두고 쓰는 것은 해설지를 보며 문제를 푸는 것과 같아 뇌가 원문 구조를
                  따라가게 됩니다. AI 패러프레이징도 직접 먼저 바꿔 본 뒤 이상할 때만 확인용으로 쓰고,{" "}
                  <strong>AI가 만든 문장을 그대로 쓰지 마세요</strong>(원 표현이 그대로 나오는 경우가 많습니다).
                </p>
              </div>

              <p className="pt-1 text-sm font-medium">같은 원문, 세 가지 버전</p>
              <div className="rounded-xl border bg-muted/30 p-3.5">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">원문</p>
                <p className="mt-1 text-sm leading-relaxed">
                  스마트폰 과의존은 청소년의 학업 집중도를 저하시키고 수업 참여 의지를 감소시키는 것으로
                  나타났다.
                </p>
              </div>
              <div className="space-y-2">
                {PARAPHRASE_VERSIONS.map((v) => {
                  const st = VERSION_STYLE[v.kind];
                  const Icon = st.icon;
                  return (
                    <div key={v.kind} className={`rounded-xl border p-3.5 ${st.border} ${st.bg}`}>
                      <p className={`flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider ${st.head}`}>
                        <Icon className="h-3.5 w-3.5" aria-hidden />
                        {v.label}
                      </p>
                      <p className={`mt-1 text-sm leading-relaxed ${st.body}`}>{v.text}</p>
                      <p className={`mt-1.5 text-xs ${st.head} opacity-80`}>{v.why}</p>
                    </div>
                  );
                })}
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground">
                원문을 왼쪽에, 바꿔 쓴 버전을 오른쪽에 두고 다양하게 변형하는 연습을 일주일만 해도
                능숙해집니다. 선행연구 정리·연결과 연계한 추가 연습은{" "}
                <Link href="/archive/literature-review-guide" className="font-medium text-primary underline">
                  선행연구·서론 가이드
                </Link>
                를 참고하세요.
              </p>
            </section>

            {/* ── 4. 참고문헌 · 형식 요약 ── */}
            <section id="references" className="mt-8 space-y-3 scroll-mt-24">
              <SectionTitle no={4}>참고문헌 · 형식 요약</SectionTitle>
              <p className="text-sm leading-relaxed text-muted-foreground">
                참고문헌 항목은 <strong className="text-foreground">저자 · 날짜 · 제목 · 출처</strong> 네
                요소로 구성됩니다. 본문에 인용된 문헌과 목록의 문헌은 빠짐없이 일치해야 합니다.
              </p>
              <div className="rounded-xl border bg-muted/20 p-3 text-xs leading-relaxed text-muted-foreground">
                저자. (날짜). <span className="text-foreground">제목</span>. 출처.{" "}
                <span className="font-mono">https://doi.org/…</span>
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">
                자료 유형별(학술지·단행본·학위논문·웹자료 등) 상세 형식, DOI 표기, APA 6→7 변경점은{" "}
                <Link href="/archive/apa-style" className="font-medium text-primary underline">
                  APA 7판 참고문헌 가이드
                </Link>
                에서 확인하세요. 아카이브의 측정도구·개념 항목에 정리된 reference 정보를 참고문헌 작성에
                활용할 수도 있습니다.
              </p>
              {/* 번역서 인용 (2026-07-12 추가) — 원서/역서 이중 표기 */}
              <div className="space-y-2 rounded-xl border bg-muted/10 p-3.5">
                <p className="text-sm font-medium">번역서 인용 — 원서·역서 이중 표기</p>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  번역서를 읽고 인용할 때는 <strong className="text-foreground">원저자·원서 출판연도</strong>와{" "}
                  <strong className="text-foreground">역자·번역서 출판연도</strong>를 함께 밝힙니다. 본문에는 두
                  연도를 빗금으로 병기합니다.
                </p>
                <div className="rounded-lg border bg-background p-3 text-xs leading-relaxed">
                  <p className="font-medium text-muted-foreground">참고문헌 목록 (예: AECT 공식 용어집)</p>
                  <p className="mt-1">
                    Richey, R. C. (편). (2020). <span className="italic">교육공학 용어해설</span> (이현우,
                    임규연, 정재삼, 허희옥 공역). 학지사. (원저 2013년 출판)
                  </p>
                  <p className="mt-2 font-medium text-muted-foreground">본문 인용</p>
                  <p className="mt-1">… 로 정의된다(Richey, 2013/2020, p. 42).</p>
                </div>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  영어 논문에서는{" "}
                  <span className="font-mono text-[11px]">
                    Richey, R. C. (Ed.). (2013). Encyclopedia of terminology for educational communications
                    and technology. Springer.
                  </span>{" "}
                  처럼 원서를 직접 인용합니다. 원서와 번역서의 페이지가 다르므로{" "}
                  <strong className="text-foreground">실제로 읽은 판본의 페이지</strong>를 표기하세요.{" "}
                  <Link href="/archive/terminology" className="font-medium text-primary underline">
                    AECT 용어 표준 사전
                  </Link>
                  에서 이 용어집의 표제어·공식 역어를 검색할 수 있습니다.
                </p>
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground">
                ※ 기관 저자·저자 없음·연도 없음 자료, 표·그림 출처 표기 등의 구체 형식은 APA 7판 통용
                규칙을 따르되, 세부 표기는 소속 대학원·투고 학술지 지침을 확인하시기 바랍니다.
              </p>
            </section>

            {/* ── 5. 인용 윤리 · 재인용 ── */}
            <section id="ethics" className="mt-8 space-y-3 scroll-mt-24">
              <SectionTitle no={5}>인용 윤리 · 재인용</SectionTitle>
              <p className="text-sm leading-relaxed text-muted-foreground">
                표절은 학문적 윤리 위반이며, 학위·연구자 경력 전반에 걸친 장기적 검증 리스크가 됩니다.
                정직한 인용은 연구자 자신을 보호하는 일이기도 합니다.
              </p>
              <div className="flex items-start gap-2 rounded-xl border border-warning/20 bg-warning/5 p-3.5 text-xs leading-relaxed text-warning">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                <p>
                  <strong>재인용(2차 인용)은 최후 수단입니다.</strong> 원본을 끝내 찾을 수 없을 때만
                  사용하고, 원칙적으로 <strong>원본을 직접 읽고 확인</strong>하는 것이 학문적 정확성의
                  기본입니다. 재인용의 구체적 표기 형식은 소속 대학원·투고 학술지 지침을 확인하세요.
                </p>
              </div>
            </section>

            <Separator className="mt-8" />
            <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
              본 가이드는 강의 자료와 APA 7판 공개 표준을 교육공학 연구자용으로 정리한 참고 자료입니다.
              모든 예시는 형식 설명용 가상 예시이며, 최종 표기·인용 형식은 투고 학술지 기준과 소속
              대학원 논문 작성 지침, 지도교수 안내를 우선 따르시기 바랍니다.
            </p>
          </div>

          <ArchiveStickyToc sections={TOC_SECTIONS} />
        </div>
      </div>
    </PageContainer>
  );
}
