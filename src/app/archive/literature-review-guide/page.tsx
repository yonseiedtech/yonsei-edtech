"use client";

/**
 * 선행연구 정리·서론 작성 가이드 (아카이브 신규 정적 페이지)
 *
 * 선행연구를 "읽고 → 정리하고 → 한계를 연결해 연구모형으로 → 서론으로 엮는"
 * 논리 구성 과정을 절차·예시 중심으로 정리한 가이드.
 *
 * 일반적 학술 논문 작성 원칙(선행연구 고찰·서론 구조)을 교육공학 맥락에서
 * 객관적으로 재서술한 참고 자료. 모든 예시는 형식 설명용 가상 예시이며 실제
 * 문헌이 아니다. 세부 형식·표현은 소속 규정·지도교수 안내를 우선한다.
 *
 * 인용 형식(직접/간접 인용·표절 회피)은 /archive/citation-guide,
 * 참고문헌 형식은 /archive/apa-style 가 담당 — 본 페이지는 상호 링크로 연계.
 */

import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  ListChecks,
  HelpCircle,
  Table2,
  GitMerge,
  PenLine,
  Repeat,
  AlignLeft,
  Layers,
  AlertTriangle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import PageHeader from "@/components/ui/page-header";
import PageContainer from "@/components/ui/page-container";
import { Separator } from "@/components/ui/separator";
import InlineNotification from "@/components/ui/inline-notification";
import ArchiveStickyToc, { type ArchiveTocSection } from "@/components/archive/ArchiveStickyToc";

const TOC_SECTIONS: ArchiveTocSection[] = [
  { id: "three-questions", label: "1. 선행연구 3대 질문" },
  { id: "summary-table", label: "2. 정리표 7컬럼" },
  { id: "gap-to-model", label: "3. 한계 → 연구모형" },
  { id: "own-words", label: "4. 내 말로 쓰기 5단계" },
  { id: "paraphrase", label: "5. 간접인용 연습" },
  { id: "intro-flow", label: "6. 서론 4단계 흐름" },
  { id: "list-vs-weave", label: "7. 나열형 vs 엮음형" },
  { id: "weaving-patterns", label: "8. 묶어쓰기 3패턴" },
];

/** 선행연구 3대 질문 */
const THREE_QUESTIONS: { q: string; role: string; detail: string }[] = [
  {
    q: "① 이 연구는 무엇을 밝혔는가?",
    role: "이론적 배경의 재료",
    detail:
      "연구가 검증·발견한 핵심 결과를 한 문장으로 요약합니다. 이론적 배경에서 인용할 근거가 됩니다.",
  },
  {
    q: "② 이 연구의 한계는 무엇인가?",
    role: "내 연구의 필요성·독창성 근거",
    detail:
      "다루지 못한 변인, 좁은 표본, 일반화의 한계 등을 짚습니다. 한계야말로 내 연구가 비집고 들어갈 틈입니다.",
  },
  {
    q: "③ 내 연구와 어떻게 연결되는가?",
    role: "서론 논리 흐름",
    detail:
      "이 연구의 결과·한계가 내 연구 문제와 어떻게 이어지는지 적습니다. 30편을 읽어도 '연결'을 적지 않으면 글이 써지지 않습니다.",
  },
];

/** 선행연구 정리표 7컬럼 + 예시 1행 */
const TABLE_COLUMNS = [
  "저자·연도",
  "연구주제",
  "연구대상",
  "연구방법",
  "주요결과",
  "한계점",
  "내 연구와의 연결점",
];
const TABLE_EXAMPLE_ROW = [
  "이연구(2021)",
  "스마트폰 과의존과 학업태도",
  "중학생 320명",
  "설문조사·다중회귀",
  "과의존이 높을수록 학업태도가 부정적",
  "자기조절력 변인을 함께 보지 않음",
  "자기조절력을 함께 투입해 모형을 확장할 필요",
];

/** 두 연구 한계 → 연구모형 도출 워크스루 */
const GAP_STUDIES: { label: string; topic: string; missing: string }[] = [
  {
    label: "연구 A",
    topic: "스마트폰 과의존 → 학업태도",
    missing: "자기조절력 변인 없음",
  },
  {
    label: "연구 B",
    topic: "자기조절력 → 학업태도",
    missing: "스마트폰 과의존 변인 없음",
  },
];

/** "내 말로 쓰기" 5단계 */
const OWN_WORDS_STEPS: { step: string; detail: string }[] = [
  { step: "이해될 때까지 5~10회 정독", detail: "구조가 머리에 들어올 때까지 천천히 반복해서 읽습니다." },
  { step: "원문 창을 닫는다", detail: "화면을 내리거나 창을 닫아 원문이 보이지 않게 합니다." },
  {
    step: "1학년에게 설명하듯 재진술",
    detail: "친구나 후배에게 말하듯 핵심을 내 언어로 말 또는 글로 다시 풀어냅니다.",
  },
  {
    step: "원문과 대조",
    detail: "다시 원문을 펴서 빠뜨린 부분·잘못 이해한 부분을 찾아 고칩니다.",
  },
  {
    step: "③~④ 반복 후 출처 표기",
    detail: "내용이 정확해질 때까지 반복하고, 마지막에 출처를 답니다.",
  },
];

/** 간접인용 3열 예시 */
const PARAPHRASE_EXAMPLE = {
  original:
    "스마트폰 과의존은 청소년의 학업 집중도를 저하시키고 수업 참여 의지를 감소시키는 것으로 나타났다.",
  plagiarism:
    "스마트폰에 지나치게 의존하는 것은 청소년의 수업 집중력을 떨어뜨리고 학습 참여 동기를 낮추는 것으로 확인되었다.",
  plagiarismWhy: "문장 구조가 동일하고 단어만 유의어로 바꿈 — 출처를 달아도 표절로 간주됩니다.",
  paraphrase:
    "이연구(2021)에 의하면 스마트폰 사용을 스스로 조절하지 못하는 청소년일수록 수업 중 집중을 유지하기 어려우며, 학교 학습 활동에 능동적으로 참여하려는 의지도 낮아지는 경향이 있다.",
  paraphraseWhy: "단어·구조를 전면 재작성하고 내용을 풍부하게 — 핵심 의미는 유지하되 내 문장으로 다시 씀.",
};

/** 서론 4단계 흐름 */
const INTRO_FLOW: { phase: string; what: string; example: string }[] = [
  {
    phase: "① 현상 제시",
    what: "사회적 문제 현상을 통계·뉴스 등 객관적 자료로 제시",
    example:
      "최근 청소년의 스마트폰 과의존 비율이 꾸준히 증가하고 있다(○○청, 2023).",
  },
  {
    phase: "② 선행연구 소개",
    what: "현상과 관련된 기존 연구 결과를 소개",
    example:
      "여러 연구에서 스마트폰 과의존이 학업태도에 부정적 영향을 미친다고 보고되었다.",
  },
  {
    phase: "③ 연구 공백 지적",
    what: "기존 연구의 공통 한계·gap을 분석해 명시",
    example:
      "그러나 대부분의 연구는 자기조절력과 같은 개인 내적 요인을 함께 고려하지 못하였다.",
  },
  {
    phase: "④ 연구 목적 선언",
    what: "이 공백을 메우겠다는 연구 목적을 선언",
    example:
      "이에 본 연구는 스마트폰 과의존과 자기조절력이 학업태도에 미치는 영향을 함께 살펴보고자 한다.",
  },
];

/** 묶어쓰기 3패턴 */
const WEAVING_PATTERNS: {
  name: string;
  guide: string;
  example: string;
  note?: string;
}[] = [
  {
    name: "유사 결과 묶기",
    guide: "공통 결론을 한 문장으로 모으고, 세미콜론으로 여러 연구를 함께 인용합니다.",
    example:
      "스마트폰 과의존이 학업태도에 부정적 영향을 미친다는 점은 여러 연구에서 일관되게 확인되었다(김연구, 2020; 이학습, 2021; 박교육, 2022).",
  },
  {
    name: "상반 결과 대비",
    guide: "'반면' 등으로 결과를 대조한 뒤, 차이가 시사하는 바를 분석합니다.",
    example:
      "일부 연구는 부정적 영향을 보고하였다(김연구, 2020). 반면 다른 연구에서는 유의한 영향이 없었다(이학습, 2021). 이러한 상반된 결과는 매개·조절 변인의 작용 가능성을 시사한다.",
  },
  {
    name: "공백 전환 표현",
    guide:
      "'그러나/하지만/그럼에도 불구하고'로 전환해 연구 공백으로 넘어갑니다.",
    example:
      "그러나 이러한 연구들은 자기조절력을 함께 고려하지 못한 한계가 있다.",
    note:
      "'그러나'를 선호하지 않는 지도교수도 있습니다(개인 선호·관행 차이). 전환 표현은 지도교수·학술지 관례를 확인해 다양하게 활용하세요.",
  },
];

function SectionTitle({ no, icon: Icon, children }: { no: number; icon: typeof ListChecks; children: React.ReactNode }) {
  return (
    <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-4 w-4" aria-hidden />
      </span>
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-bold text-muted-foreground">
        {no}
      </span>
      {children}
    </h2>
  );
}

export default function LiteratureReviewGuidePage() {
  return (
    <PageContainer width="default">
      <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
        <Link href="/archive">
          <Button variant="ghost" size="sm" className="mb-3">
            <ArrowLeft className="mr-1 h-4 w-4" />
            아카이브
          </Button>
        </Link>

        <div className="lg:grid lg:grid-cols-[1fr_200px] lg:gap-6">
          <div className="min-w-0 lg:max-w-3xl">
            <PageHeader
              icon={ListChecks}
              title="선행연구 정리·서론 작성 가이드"
              description="선행연구를 읽고 정리해 한계를 연결하고, 그것을 서론으로 엮어내는 논리 구성 과정을 절차와 예시로 정리했습니다."
            />

            <Separator className="mt-6" />

            <div className="mt-6">
              <InlineNotification
                kind="info"
                title="이 가이드에 대하여"
                description={
                  <span>
                    선행연구 고찰·서론 구성의 일반적 원칙을 교육공학 맥락에서 정리한 참고 자료입니다.
                    모든 예시는 <strong>형식 설명용 가상 예시</strong>(가상의 저자·연구)이며 실제 문헌이
                    아닙니다. 인용을 <strong>내 말로 바꾸는 방법·표절 회피</strong>는{" "}
                    <Link href="/archive/citation-guide" className="font-medium text-primary underline">
                      인용 가이드
                    </Link>
                    , 참고문헌 형식은{" "}
                    <Link href="/archive/apa-style" className="font-medium text-primary underline">
                      APA 가이드
                    </Link>
                    를 함께 참고하세요.
                  </span>
                }
              />
            </div>

            {/* ── 1. 선행연구 3대 질문 ── */}
            <section id="three-questions" className="mt-8 space-y-3 scroll-mt-24">
              <SectionTitle no={1} icon={HelpCircle}>선행연구를 읽는 3대 질문</SectionTitle>
              <p className="text-sm leading-relaxed text-muted-foreground">
                선행연구를 읽는 궁극적 목적은 <strong className="text-foreground">내 연구가 왜
                필요한지를 증명</strong>하는 것입니다. 한 편을 읽을 때마다 다음 세 가지를 스스로 묻고
                답을 적어 두면, 읽은 내용이 곧 서론·이론적 배경의 재료가 됩니다.
              </p>
              <div className="grid gap-3 sm:grid-cols-3">
                {THREE_QUESTIONS.map((item) => (
                  <div key={item.q} className="rounded-xl border bg-card p-4">
                    <p className="text-sm font-semibold leading-snug">{item.q}</p>
                    <p className="mt-1.5 inline-block rounded-md bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                      {item.role}
                    </p>
                    <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{item.detail}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* ── 2. 정리표 7컬럼 ── */}
            <section id="summary-table" className="mt-8 space-y-3 scroll-mt-24">
              <SectionTitle no={2} icon={Table2}>선행연구 정리표 — 7컬럼 템플릿</SectionTitle>
              <p className="text-sm leading-relaxed text-muted-foreground">
                복잡한 엑셀표보다 아래 7컬럼의 <strong className="text-foreground">심플 버전</strong>이
                실전에 유용합니다. 핵심은 결과 요약이 아니라 <strong className="text-foreground">한계 →
                내 연구와의 연결</strong>을 적는 것입니다.
              </p>
              <div className="overflow-x-auto rounded-xl border">
                <table className="w-full min-w-[640px] text-left text-xs">
                  <thead>
                    <tr className="bg-muted/50">
                      {TABLE_COLUMNS.map((c, i) => (
                        <th
                          key={c}
                          className={`px-3 py-2 font-semibold ${i >= 5 ? "text-rose-700 dark:text-rose-300" : "text-foreground"}`}
                        >
                          {c}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-t">
                      {TABLE_EXAMPLE_ROW.map((v, i) => (
                        <td
                          key={i}
                          className={`px-3 py-2.5 align-top leading-relaxed ${i >= 5 ? "bg-rose-50/40 text-rose-900 dark:bg-rose-950/20 dark:text-rose-200" : "text-muted-foreground"}`}
                        >
                          {v}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground">
                ※ 마지막 두 컬럼(<span className="text-rose-700 dark:text-rose-300">한계점·연결점</span>)을
                비워 두면 30편을 읽어도 글이 써지지 않습니다. 이 두 칸이 연구모형의 씨앗입니다.
              </p>
            </section>

            {/* ── 3. 한계 → 연구모형 ── */}
            <section id="gap-to-model" className="mt-8 space-y-3 scroll-mt-24">
              <SectionTitle no={3} icon={GitMerge}>두 연구의 한계 → 연구모형 도출</SectionTitle>
              <p className="text-sm leading-relaxed text-muted-foreground">
                두세 편의 한계를 비교하는 것만으로도 연구모형이 나옵니다. 두 연구의 빈틈이 만나는
                지점에서 새로운 모형이 만들어집니다.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {GAP_STUDIES.map((s) => (
                  <div key={s.label} className="rounded-xl border bg-card p-4">
                    <p className="text-sm font-semibold">{s.label}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{s.topic}</p>
                    <p className="mt-2 inline-flex items-center gap-1 rounded-md bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">
                      한계 · {s.missing}
                    </p>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-center py-1 text-muted-foreground" aria-hidden>
                <ArrowRight className="h-5 w-5 rotate-90 sm:rotate-0" />
              </div>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 dark:border-emerald-900 dark:bg-emerald-950/20">
                <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
                  도출된 연구모형
                </p>
                <p className="mt-1 text-sm leading-relaxed text-emerald-900/80 dark:text-emerald-200/80">
                  &ldquo;스마트폰 과의존과 자기조절력을 동시에 독립변수로 투입해, 두 요인이 학업태도에
                  미치는 영향을 함께 검증한다&rdquo; — 두 한계의 교집합에서 새 모형이 탄생합니다.
                </p>
              </div>
            </section>

            {/* ── 4. 내 말로 쓰기 5단계 ── */}
            <section id="own-words" className="mt-8 space-y-3 scroll-mt-24">
              <SectionTitle no={4} icon={PenLine}>&ldquo;내 말로 쓰기&rdquo; 5단계</SectionTitle>
              <p className="text-sm leading-relaxed text-muted-foreground">
                선행연구를 표절 없이 인용하려면 원문을 보면서 쓰지 않는 것이 핵심입니다. 원문을 보며
                쓰면 뇌가 그 문장 구조를 그대로 따라가기 때문입니다.
              </p>
              <ol className="space-y-2">
                {OWN_WORDS_STEPS.map((s, i) => (
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
              <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-xs leading-relaxed text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
                <AlignLeft className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                <p>
                  <strong>해설지 비유:</strong> 원문을 옆에 두고 쓰는 것은 해설지를 보며 수학 문제를
                  푸는 것과 같습니다. 그 순간엔 풀리지만 실력은 늘지 않고, 글은 원문 구조를 따라가
                  표절 위험이 높아집니다.
                </p>
              </div>
            </section>

            {/* ── 5. 간접인용 연습 ── */}
            <section id="paraphrase" className="mt-8 space-y-3 scroll-mt-24">
              <SectionTitle no={5} icon={Repeat}>간접인용 연습 — 원문 → 변형</SectionTitle>
              <p className="text-sm leading-relaxed text-muted-foreground">
                원문을 왼쪽에, 바꿔 쓴 버전을 오른쪽에 두고 다양하게 변형하는 연습을 일주일만 해도
                능숙해집니다. 아래는 같은 원문을 잘못 바꾼 예와 올바르게 바꾼 예입니다.
              </p>
              <div className="space-y-2">
                <div className="rounded-xl border bg-muted/30 p-3.5">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">원문</p>
                  <p className="mt-1 text-sm leading-relaxed">{PARAPHRASE_EXAMPLE.original}</p>
                </div>
                <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-3.5 dark:border-rose-900 dark:bg-rose-950/20">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-rose-700 dark:text-rose-300">
                    ❌ 표절에 가까운 버전 (단어만 치환)
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-rose-900 dark:text-rose-200">{PARAPHRASE_EXAMPLE.plagiarism}</p>
                  <p className="mt-1.5 text-xs text-rose-700/80 dark:text-rose-300/80">{PARAPHRASE_EXAMPLE.plagiarismWhy}</p>
                </div>
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3.5 dark:border-emerald-900 dark:bg-emerald-950/20">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                    ✅ 올바른 간접인용 (문장 전체 재작성)
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-emerald-900 dark:text-emerald-200">{PARAPHRASE_EXAMPLE.paraphrase}</p>
                  <p className="mt-1.5 text-xs text-emerald-700/80 dark:text-emerald-300/80">{PARAPHRASE_EXAMPLE.paraphraseWhy}</p>
                </div>
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground">
                직접/간접 인용의 구분과 표절 회피 원칙은{" "}
                <Link href="/archive/citation-guide" className="font-medium text-primary underline">
                  인용 가이드
                </Link>
                에서 더 자세히 다룹니다.
              </p>
            </section>

            {/* ── 6. 서론 4단계 흐름 ── */}
            <section id="intro-flow" className="mt-8 space-y-3 scroll-mt-24">
              <SectionTitle no={6} icon={Layers}>서론 4단계 흐름</SectionTitle>
              <p className="text-sm leading-relaxed text-muted-foreground">
                정리한 선행연구를 서론으로 엮을 때는 다음 네 단계를 따르면 막힘이 줄어듭니다. 골격을
                외워 두고 살만 붙이면 한 페이지가 됩니다.
              </p>
              <div className="space-y-2">
                {INTRO_FLOW.map((f, i) => (
                  <div key={f.phase} className="rounded-xl border bg-card p-3.5">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <p className="text-sm font-semibold">{f.phase}</p>
                      <p className="text-xs text-muted-foreground">{f.what}</p>
                    </div>
                    <p className="mt-1.5 rounded-lg bg-primary/5 px-2.5 py-1.5 text-xs leading-relaxed text-muted-foreground">
                      예) {f.example}
                    </p>
                    {i < INTRO_FLOW.length - 1 && (
                      <div className="mt-1 flex justify-center text-muted-foreground" aria-hidden>
                        <ArrowRight className="h-4 w-4 rotate-90" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>

            {/* ── 7. 나열형 vs 엮음형 ── */}
            <section id="list-vs-weave" className="mt-8 space-y-3 scroll-mt-24">
              <SectionTitle no={7} icon={AlignLeft}>나열형 ❌ vs 엮음형 ✅</SectionTitle>
              <p className="text-sm leading-relaxed text-muted-foreground">
                선행연구를 &ldquo;A는~, B는~, C는~&rdquo;처럼 단순 나열하면 &ldquo;그래서 내 연구에 왜
                필요한가&rdquo;가 드러나지 않습니다. 공통점·차이·공백으로 엮어야 합니다.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-3.5 dark:border-rose-900 dark:bg-rose-950/20">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-rose-700 dark:text-rose-300">❌ 나열형</p>
                  <p className="mt-1 text-sm leading-relaxed text-rose-900 dark:text-rose-200">
                    김연구(2020)는 A를 밝혔다. 이학습(2021)은 B를 밝혔다. 박교육(2022)은 C를 밝혔다.
                  </p>
                </div>
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3.5 dark:border-emerald-900 dark:bg-emerald-950/20">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">✅ 엮음형</p>
                  <p className="mt-1 text-sm leading-relaxed text-emerald-900 dark:text-emerald-200">
                    여러 연구가 스마트폰 과의존의 부정적 영향을 일관되게 보고하였다(김연구, 2020; 이학습,
                    2021). 그러나 이들은 자기조절력을 함께 고려하지 못하였다. 이에 본 연구는 …
                  </p>
                </div>
              </div>
            </section>

            {/* ── 8. 묶어쓰기 3패턴 ── */}
            <section id="weaving-patterns" className="mt-8 space-y-3 scroll-mt-24">
              <SectionTitle no={8} icon={GitMerge}>선행연구 묶어쓰기 3패턴</SectionTitle>
              <div className="space-y-2">
                {WEAVING_PATTERNS.map((p) => (
                  <div key={p.name} className="rounded-xl border bg-card p-3.5">
                    <p className="text-sm font-semibold">{p.name}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{p.guide}</p>
                    <p className="mt-2 rounded-lg bg-primary/5 px-2.5 py-1.5 text-xs leading-relaxed text-muted-foreground">
                      예) {p.example}
                    </p>
                    {p.note && (
                      <p className="mt-1.5 flex items-start gap-1.5 text-xs leading-relaxed text-amber-700 dark:text-amber-300">
                        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                        {p.note}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </section>

            <Separator className="mt-8" />
            <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
              본 가이드는 선행연구 고찰·서론 구성의 일반적 원칙을 교육공학 연구자용으로 정리한 참고
              자료입니다. 일부 표현 선호(예: 전환 접속어)와 관행은 지도교수·소속 대학원·투고 학술지의
              지침에 따라 다를 수 있으며, 최종 표기·구성은 소속 규정과 지도교수 안내를 우선하시기
              바랍니다.
            </p>
          </div>

          <ArchiveStickyToc sections={TOC_SECTIONS} />
        </div>
      </div>
    </PageContainer>
  );
}
