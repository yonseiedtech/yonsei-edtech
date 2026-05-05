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
    color: "bg-blue-50 text-blue-900 border-blue-200",
    border: "border-l-blue-500",
  },
  {
    key: "develop",
    label: "개발 (Development)",
    Icon: Hammer,
    topics: ["인쇄자료", "시청각자료", "CBI", "시각화"],
    theories: ["통신이론"],
    color: "bg-emerald-50 text-emerald-900 border-emerald-200",
    border: "border-l-emerald-500",
  },
  {
    key: "utilize",
    label: "활용 (Utilization)",
    Icon: Wrench,
    topics: ["매체활용", "혁신의 확산", "채택/제도화", "정책/규제", "활용모형"],
    theories: ["여론주도자", "문지기", "조직개발", "혁신확산"],
    color: "bg-amber-50 text-amber-900 border-amber-200",
    border: "border-l-amber-500",
  },
  {
    key: "manage",
    label: "관리 (Management)",
    Icon: Settings,
    topics: ["프로젝트", "자원", "전달체계", "정보"],
    theories: ["행동주의", "통신이론", "생산성이론", "체제접근", "동기이론", "정보이론"],
    color: "bg-purple-50 text-purple-900 border-purple-200",
    border: "border-l-purple-500",
  },
  {
    key: "evaluate",
    label: "평가 (Evaluation)",
    Icon: ClipboardCheck,
    topics: ["요구분석", "준거참조측정", "형성평가", "종합평가"],
    theories: ["행동주의", "일반체제이론", "구성주의", "인지과학"],
    color: "bg-rose-50 text-rose-900 border-rose-200",
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
        {/* 정의 한 줄 */}
        <p className="text-sm leading-relaxed">
          교육공학(Educational Technology)은 <strong>전통적 교육</strong>과{" "}
          <strong>체제적 접근</strong>을 더해 <strong>대안적 교육방법</strong>을 모색하고,
          교수·학습 과정을 재설계(<em>Reengineering of Instruction &amp; Learning</em>)하여{" "}
          <strong>교육의 효과성·효율성</strong>을 높이는 학문·실천 분야입니다.
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
            <div className="rounded-lg border bg-gradient-to-br from-sky-50/40 to-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="flex items-center gap-2 text-sm font-semibold">
                  <Globe size={14} className="text-sky-700" />
                  AECT — 미국 교육공학회
                </p>
                <a
                  href="https://aect.org"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[10px] text-sky-700 hover:underline"
                >
                  aect.org
                  <ExternalLink size={10} />
                </a>
              </div>
              <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                <strong>Association for Educational Communications and Technology</strong> (1923~).
                전 세계 교육공학 학자·실무자 협회로, 우리 분야의 정의·표준·학술지(ETR&amp;D)를 주도합니다.
                1994년 5도메인 모델, 2008년 정의는 모두 AECT 공식 작업의 산물입니다.
              </p>

              {/* AECT 2008 공식 정의 */}
              <div className="mt-3 rounded-md border-l-4 border-l-sky-400 bg-sky-50/60 p-3">
                <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-sky-900">
                  <Quote size={10} />
                  AECT 2008 공식 정의
                </p>
                <p className="mt-1.5 text-xs italic leading-relaxed text-sky-950">
                  &ldquo;Educational technology is the <strong>study</strong> and <strong>ethical practice</strong>{" "}
                  of <strong>facilitating learning</strong> and <strong>improving performance</strong> by{" "}
                  <strong>creating, using, and managing</strong> appropriate{" "}
                  <strong>technological processes and resources</strong>.&rdquo;
                </p>
                <p className="mt-2 text-[11px] leading-relaxed text-foreground">
                  <strong>의역</strong> — 교육공학은 적절한 <em>기술적 과정과 자원</em>을{" "}
                  <em>창조·활용·관리</em>함으로써 <em>학습을 촉진</em>하고 <em>수행을 향상</em>시키는{" "}
                  <em>학문적 연구이자 윤리적 실천</em>이다.
                </p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {[
                    { label: "Study", note: "체계적 연구" },
                    { label: "Ethical practice", note: "윤리적 실천" },
                    { label: "Facilitating learning", note: "학습 촉진" },
                    { label: "Improving performance", note: "수행 향상" },
                    { label: "Creating · Using · Managing", note: "창조·활용·관리" },
                    { label: "Processes & Resources", note: "과정·자원" },
                  ].map((k) => (
                    <Badge
                      key={k.label}
                      variant="outline"
                      className="border-sky-200 bg-card text-[10px] font-normal"
                      title={k.note}
                    >
                      {k.label}
                    </Badge>
                  ))}
                </div>
                <p className="mt-2 text-[10px] text-muted-foreground">
                  💡 1994년 정의(<em>theory and practice of design, development, utilization, management, evaluation</em>)
                  와 비교하면 2008년 정의는 <strong>윤리</strong>·<strong>수행 향상</strong>이 추가되어
                  HRD(인적자원개발)·기업 교육 영역과의 연결성이 강화되었습니다.
                </p>
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
                    <strong className="text-sky-900">2008</strong>{" "}
                    <span className="text-foreground">윤리·수행 향상·과정·자원 강조 (현행 정의)</span>
                  </li>
                </ol>
              </div>

              {/* 한국 교육공학회와 비교 */}
              <div className="mt-3 rounded-md border border-amber-200 bg-amber-50/50 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-900">
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
