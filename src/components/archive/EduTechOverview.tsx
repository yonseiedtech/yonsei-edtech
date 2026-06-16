"use client";

/**
 * 교육공학 정의·탐구분야 개관 — Sprint 66+
 * /archive 페이지 상단에 노출.
 * 출처 모델:
 *  - 정의·목적·활용 분야·관련 개념: 일반 교육공학 개관도
 *  - 5대 영역: AECT 1994 (Seels & Richey, 1994) 5 Domain Model
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ChevronDown,
  ChevronUp,
  Pencil,
  Wrench,
  Hammer,
  Settings,
  ClipboardCheck,
  GraduationCap,
  Globe,
  BookMarked,
  Users,
  Quote,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DomainNode {
  key: string;
  label: string;
  Icon: typeof Pencil;
  topics: string[];
  theories: string[];
  color: string;
  border: string;
}

const DOMAINS: DomainNode[] = [
  {
    key: "design",
    label: "설계 (Design)",
    Icon: Pencil,
    topics: ["ISD", "메시지 설계", "교수전략", "시각 자료"],
    theories: ["일반체제이론", "행동주의", "인지주의", "교수설계이론", "통신이론", "지각주의", "구성주의"],
    color: "bg-blue-50 text-blue-900 border-blue-200 dark:bg-blue-950/40 dark:text-blue-100 dark:border-blue-800",
    border: "border-l-blue-500",
  },
  {
    key: "develop",
    label: "개발 (Development)",
    Icon: Hammer,
    topics: ["인쇄자료", "시청각자료", "CBI", "시각화"],
    theories: ["통신이론"],
    color: "bg-emerald-50 text-emerald-900 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-100 dark:border-emerald-800",
    border: "border-l-emerald-500",
  },
  {
    key: "utilize",
    label: "활용 (Utilization)",
    Icon: Wrench,
    topics: ["매체활용", "혁신의 확산", "채택/제도화", "정책/규제", "활용모형"],
    theories: ["여론주도자", "문지기", "조직개발", "혁신확산"],
    color: "bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-950/40 dark:text-amber-100 dark:border-amber-800",
    border: "border-l-amber-500",
  },
  {
    key: "manage",
    label: "관리 (Management)",
    Icon: Settings,
    topics: ["프로젝트", "자원", "전달체계", "정보"],
    theories: ["행동주의", "통신이론", "생산성이론", "체제접근", "동기이론", "정보이론"],
    color: "bg-purple-50 text-purple-900 border-purple-200 dark:bg-purple-950/40 dark:text-purple-100 dark:border-purple-800",
    border: "border-l-purple-500",
  },
  {
    key: "evaluate",
    label: "평가 (Evaluation)",
    Icon: ClipboardCheck,
    topics: ["요구분석", "준거참조측정", "형성평가", "종합평가"],
    theories: ["행동주의", "일반체제이론", "구성주의", "인지과학"],
    color: "bg-rose-50 text-rose-900 border-rose-200 dark:bg-rose-950/40 dark:text-rose-100 dark:border-rose-800",
    border: "border-l-rose-500",
  },
];

export default function EduTechOverview() {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card className="mt-6 border-l-4 border-l-primary/60">
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <GraduationCap size={18} className="text-primary" />
            교육공학이란?
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded((v) => !v)}
            className="h-7 px-2 text-xs"
          >
            {expanded ? (
              <>
                <ChevronUp size={14} className="mr-1" />
                접기
              </>
            ) : (
              <>
                <ChevronDown size={14} className="mr-1" />
                자세히
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 정의 한 줄 — AECT 2023 최신 정의 반영 */}
        <p className="text-sm leading-relaxed">
          교육공학(Educational Technology)은 <strong>학습경험과 학습환경</strong>을{" "}
          <strong>전략적으로 설계·관리·구현·평가</strong>하여 <strong>학습자를 권한화(empower)</strong>하고,
          <strong>학습·수행을 향상</strong>시키는 <em>이론·연구·실천에 대한 윤리적 학문과 응용</em>입니다 (AECT, 2023).
        </p>

        {expanded && (
          <>
            {/* 목적·활용 분야·관련 개념 */}
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border bg-muted/20 p-3">
                <p className="text-xs font-semibold text-muted-foreground">🎯 목적</p>
                <ul className="mt-1.5 space-y-0.5 text-xs text-foreground">
                  <li>• 교육의 효과성</li>
                  <li>• 교육의 효율성</li>
                </ul>
              </div>
              <div className="rounded-lg border bg-muted/20 p-3">
                <p className="text-xs font-semibold text-muted-foreground">🏫 활용 분야</p>
                <ul className="mt-1.5 space-y-0.5 text-xs text-foreground">
                  <li>• 학교 교육</li>
                  <li>• 기업 교육 (HRD)</li>
                  <li>• 공무원·공공 교육</li>
                </ul>
              </div>
              <div className="rounded-lg border bg-muted/20 p-3">
                <p className="text-xs font-semibold text-muted-foreground">🔗 관련 개념</p>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {[
                    "ISD",
                    "교수학습설계",
                    "멀티미디어 교육",
                    "원격 교육",
                    "전자 교육",
                    "통합 학습",
                  ].map((c) => (
                    <Badge
                      key={c}
                      variant="outline"
                      className="text-[10px] font-normal"
                    >
                      {c}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            {/* AECT 5대 영역 */}
            <div className="rounded-lg border bg-card p-4">
              <p className="text-sm font-semibold">
                📐 교육공학의 5대 탐구 영역
                <span className="ml-2 text-[10px] font-normal text-muted-foreground">
                  AECT 1994 (Seels &amp; Richey)
                </span>
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                교육공학은 <strong>이론·실제</strong>의 5개 영역이 상호 연결된 분야입니다. 본 아카이브의
                개념·변인·측정도구는 주로 <strong>설계·평가</strong> 영역에 자료가 모이지만,
                연구 흐름에 따라 <strong>개발·활용·관리</strong> 영역과도 연결됩니다.
              </p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {DOMAINS.map((d) => {
                  const Icon = d.Icon;
                  return (
                    <div
                      key={d.key}
                      className={cn(
                        "rounded-md border border-l-4 bg-card p-2.5",
                        d.border,
                      )}
                    >
                      <div className="flex items-center gap-1.5">
                        <Icon size={14} className="text-foreground/70" />
                        <p className="text-xs font-bold">{d.label}</p>
                      </div>
                      <p className="mt-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                        주제
                      </p>
                      <div className="mt-0.5 flex flex-wrap gap-1">
                        {d.topics.map((t) => (
                          <Badge
                            key={t}
                            variant="outline"
                            className={cn("text-[10px] font-normal", d.color)}
                          >
                            {t}
                          </Badge>
                        ))}
                      </div>
                      <p className="mt-2 text-[10px] uppercase tracking-wider text-muted-foreground">
                        이론 기반
                      </p>
                      <p className="mt-0.5 text-[10px] leading-relaxed text-foreground/70">
                        {d.theories.join(" · ")}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            <p className="text-[11px] text-muted-foreground">
              🔍 본 아카이브에서 찾는 <strong>개념·변인·측정도구</strong>는 위 5개 영역 중 어디에 해당하는지
              생각하면 연구 위치를 잡기 쉬워집니다. 자기효능감(평가)·메시지 설계(설계)·혁신 확산(활용) 등.
            </p>

            {/* AECT 미국 교육공학회 — Sprint 70 */}
            <div className="rounded-lg border bg-gradient-to-br from-sky-50/40 to-white p-4 dark:from-sky-950/30 dark:to-card">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="flex items-center gap-2 text-sm font-semibold">
                  <Globe size={14} className="text-sky-700 dark:text-sky-400" />
                  AECT — 미국 교육공학회
                </p>
                <a
                  href="https://aect.org"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[10px] text-sky-700 hover:underline dark:text-sky-400"
                >
                  aect.org
                  <ExternalLink size={10} />
                </a>
              </div>
              <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                <strong>Association for Educational Communications and Technology</strong> (1923~).
                전 세계 교육공학 학자·실무자 협회로, 우리 분야의 정의·표준·학술지(ETR&amp;D)를 주도합니다.
                1994년 5도메인 모델, 2008년·2023년 정의는 모두 AECT 공식 작업의 산물입니다.
              </p>

              {/* AECT 2023 최신 공식 정의 */}
              <div className="mt-3 rounded-md border-l-4 border-l-sky-500 bg-sky-50/80 p-3 dark:bg-sky-950/40">
                <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-sky-900 dark:text-sky-200">
                  <Quote size={10} />
                  AECT 2023 최신 공식 정의
                  <Badge className="ml-1 bg-sky-600 text-[9px] text-white">NEW</Badge>
                </p>
                <p className="mt-1.5 text-xs italic leading-relaxed text-sky-950 dark:text-sky-100">
                  &ldquo;Educational technology is the <strong>ethical study and application</strong>{" "}
                  of <strong>theory, research, and practices</strong> to{" "}
                  <strong>advance knowledge, improve learning and performance</strong>, and{" "}
                  <strong>empower learners</strong> through <strong>strategic design, management, implementation, and evaluation</strong>{" "}
                  of <strong>learning experiences and environments</strong> using appropriate{" "}
                  <strong>processes and resources</strong>.&rdquo;
                </p>
                <p className="mt-2 text-[11px] leading-relaxed text-foreground">
                  <strong>의역</strong> — 교육공학은 <em>학습경험과 학습환경</em>의 전략적{" "}
                  <em>설계·관리·구현·평가</em>를 통해 <em>지식의 진보, 학습·수행의 향상, 학습자 권한 강화</em>를 추구하는{" "}
                  <em>이론·연구·실천에 대한 윤리적 학문과 응용</em>이다.
                </p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {[
                    { label: "Ethical study & application", note: "윤리적 학문과 응용" },
                    { label: "Theory · Research · Practices", note: "이론·연구·실천" },
                    { label: "Advance knowledge", note: "지식의 진보" },
                    { label: "Improve learning & performance", note: "학습·수행 향상" },
                    { label: "Empower learners", note: "학습자 권한 강화 (신규)" },
                    { label: "Strategic Design/Mgmt/Impl/Eval", note: "전략적 설계·관리·구현·평가" },
                    { label: "Learning experiences & environments", note: "학습경험·환경 (신규)" },
                  ].map((k) => (
                    <Badge
                      key={k.label}
                      variant="outline"
                      className="border-sky-200 bg-card text-[10px] font-normal dark:border-sky-800"
                      title={k.note}
                    >
                      {k.label}
                    </Badge>
                  ))}
                </div>
                <p className="mt-2 text-[10px] text-muted-foreground">
                  Task Force: Albert Ritzhaupt &amp; Keith Heggart (Co-Chairs) · Christopher Prokes ·
                  Kamla Al Amri · Monalisa Dash · Michelle R. Gould · Royce Kimmons (2023).
                </p>
              </div>

              {/* 정의의 진화 — 1994 → 2008 → 2023 */}
              <div className="mt-3 rounded-md border bg-card p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  📜 정의의 진화 1994 → 2008 → 2023
                </p>
                <div className="mt-2 space-y-2">
                  <div className="rounded-md border-l-4 border-l-border bg-muted/30 p-2">
                    <p className="text-[10px] font-semibold text-muted-foreground">1994 (Seels &amp; Richey)</p>
                    <p className="text-[11px] italic text-foreground/80">
                      &ldquo;Theory and practice of design, development, utilization, management, evaluation of processes and resources for learning.&rdquo;
                    </p>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">
                      <strong>핵심 추가:</strong> 5도메인 모델 (설계·개발·활용·관리·평가)
                    </p>
                  </div>
                  <div className="rounded-md border-l-4 border-l-sky-300 bg-sky-50/40 p-2 dark:border-l-sky-700 dark:bg-sky-950/30">
                    <p className="text-[10px] font-semibold text-muted-foreground">2008</p>
                    <p className="text-[11px] italic text-foreground/80">
                      &ldquo;Study and ethical practice of facilitating learning and improving performance by creating, using, and managing appropriate technological processes and resources.&rdquo;
                    </p>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">
                      <strong>핵심 추가:</strong> <em>윤리(ethical)</em> + <em>수행 향상(improving performance)</em> → HRD/기업교육 연결
                    </p>
                  </div>
                  <div className="rounded-md border-l-4 border-l-sky-500 bg-sky-100/60 p-2 dark:bg-sky-900/40">
                    <p className="text-[10px] font-semibold text-muted-foreground">2023 (최신)</p>
                    <p className="text-[11px] italic text-foreground/80">
                      &ldquo;Ethical study and application … advance knowledge, improve learning and performance, and empower learners … learning experiences and environments using appropriate processes and resources.&rdquo;
                    </p>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">
                      <strong>핵심 추가:</strong> <em>학습자 권한 강화(empower learners)</em> + <em>학습경험·환경(learning experiences and environments)</em> →
                      LX(Learning Experience) · UDL · 학습자 주체성 강화 흐름 반영
                    </p>
                  </div>
                </div>
              </div>

              {/* AECT 핵심 자원 */}
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                <div className="rounded-md border bg-card p-2.5">
                  <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <BookMarked size={10} />
                    주요 학술지
                  </p>
                  <ul className="mt-1.5 space-y-0.5 text-[11px] leading-relaxed">
                    <li>
                      <strong>ETR&amp;D</strong>{" "}
                      <span className="text-muted-foreground">(Educational Technology Research &amp; Development, SSCI)</span>
                    </li>
                    <li>
                      <strong>TechTrends</strong>{" "}
                      <span className="text-muted-foreground">(실천·동향)</span>
                    </li>
                  </ul>
                </div>
                <div className="rounded-md border bg-card p-2.5">
                  <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <Users size={10} />
                    Divisions (관심 분야)
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {[
                      "Design & Development (D&D)",
                      "Research & Theory (R&T)",
                      "Distance Learning (DDL)",
                      "Teacher Education (TED)",
                      "Culture · Learning · Tech (CLT)",
                      "International (INTL)",
                    ].map((d) => (
                      <Badge
                        key={d}
                        variant="outline"
                        className="text-[9px] font-normal"
                      >
                        {d}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="rounded-md border bg-card p-2.5">
                  <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <GraduationCap size={10} />
                    핵심 개념·이론 산출
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {[
                      "ADDIE",
                      "Dick & Carey",
                      "Smith & Ragan",
                      "Cognitive Load (Sweller)",
                      "Multimedia Principles (Mayer)",
                      "TPACK",
                      "Universal Design for Learning",
                    ].map((c) => (
                      <Badge
                        key={c}
                        variant="outline"
                        className="text-[9px] font-normal"
                      >
                        {c}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              {/* 정의 변천 타임라인 */}
              <div className="mt-3 rounded-md border bg-card p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  📜 AECT 정의 변천사
                </p>
                <ol className="mt-1.5 space-y-1 text-[11px] leading-relaxed">
                  <li>
                    <strong className="text-foreground">1963</strong>{" "}
                    <span className="text-muted-foreground">시청각 통신 (Audiovisual Communications) — 메시지 전달 중심</span>
                  </li>
                  <li>
                    <strong className="text-foreground">1972</strong>{" "}
                    <span className="text-muted-foreground">교육공학 = 매체 (Media) 활용 — 시청각 교육의 확장</span>
                  </li>
                  <li>
                    <strong className="text-foreground">1977</strong>{" "}
                    <span className="text-muted-foreground">학습을 위한 문제 분석·해결의 복합 과정 — 체제적 접근 도입</span>
                  </li>
                  <li>
                    <strong className="text-foreground">1994</strong>{" "}
                    <span className="text-muted-foreground">설계·개발·활용·관리·평가 5도메인 (Seels &amp; Richey)</span>
                  </li>
                  <li>
                    <strong className="text-sky-900 dark:text-sky-300">2008</strong>{" "}
                    <span className="text-foreground">윤리·수행 향상·과정·자원 강조 (현행 정의)</span>
                  </li>
                </ol>
              </div>

              {/* 한국 교육공학회와 비교 */}
              <div className="mt-3 rounded-md border border-amber-200 bg-amber-50/50 p-3 dark:border-amber-800 dark:bg-amber-950/30">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-900 dark:text-amber-200">
                  🇰🇷 한국 교육공학회 (KSET) 와의 관계
                </p>
                <p className="mt-1 text-[11px] leading-relaxed text-foreground">
                  <strong>Korean Society for Educational Technology</strong> (1985 창립). AECT 의 정의·이론 틀을
                  국내 맥락(공교육·기업 HRD·평생교육)에 적용·발전시키는 학술 단체로, 학술지{" "}
                  <strong>『교육공학연구』</strong> (KCI 우수등재) 를 발행합니다. 본 학회 활동·연구는
                  AECT 의 글로벌 표준과 KSET 의 국내 맥락이 만나는 지점에서 이루어집니다.
                </p>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
