"use client";

/**
 * 교육공학 아카이브 — APA 7판 참고문헌 작성 가이드.
 *
 * APA 7판(2019/2020)의 공개 표준 규칙을 교육공학 연구자용으로 정리한 요약 페이지.
 * 예시는 모두 형식 설명용 가상 예시이며 실제 문헌이 아님.
 */

import Link from "next/link";
import { BookText, ArrowLeft } from "lucide-react";
import PageHeader from "@/components/ui/page-header";
import { Separator } from "@/components/ui/separator";
import InlineNotification from "@/components/ui/inline-notification";

/** 자료 유형별 형식 + 예시 블록 */
function RefBlock({ label, format, example }: { label: string; format: string; example: string }) {
  return (
    <div className="rounded-xl border bg-card p-3.5">
      <p className="text-sm font-semibold">{label}</p>
      <p className="mt-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">형식</p>
      <p className="mt-0.5 rounded-lg bg-muted/50 px-2.5 py-1.5 font-mono text-xs leading-relaxed">{format}</p>
      <p className="mt-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">예시 (가상)</p>
      <p className="mt-0.5 rounded-lg bg-primary/5 px-2.5 py-1.5 text-xs leading-relaxed">{example}</p>
    </div>
  );
}

function SectionTitle({ no, children }: { no: number; children: React.ReactNode }) {
  return (
    <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary">
        {no}
      </span>
      {children}
    </h2>
  );
}

export default function ApaStylePage() {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 py-8 sm:py-14">
      <div className="mx-auto max-w-3xl px-4">
        <Link
          href="/archive"
          className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft size={16} />
          교육공학 아카이브로
        </Link>

        <PageHeader
          icon={BookText}
          title="APA 7판 참고문헌 작성 가이드"
          description="교육공학 학위논문·학술지 투고를 위한 APA 7th edition 인용·참고문헌 형식 요약"
        />

        <Separator className="mt-6" />

        <div className="mt-6">
          <InlineNotification
            kind="info"
            title="이 페이지에 대하여"
            description={
              <span>
                APA 7판(American Psychological Association, 2020)의 공개 표준 규칙을 교육공학
                연구자용으로 정리한 요약입니다. 모든 예시는 <strong>형식 설명용 가상 예시</strong>(가상의
                저자·논문)이며 실제 문헌이 아닙니다. 정확한 규정과 예외는{" "}
                <em>APA Publication Manual (7th ed.)</em> 원문을, 학위논문 제출 형식은{" "}
                <strong>소속 대학원 지침</strong>을 우선 확인하세요.
              </span>
            }
          />
        </div>

        {/* ── 1. 기본 구조 ── */}
        <section className="mt-8 space-y-3">
          <SectionTitle no={1}>기본 구조 — 4가지 핵심 요소</SectionTitle>
          <p className="text-sm leading-relaxed text-muted-foreground">
            APA 참고문헌 항목은 <strong className="text-foreground">저자 · 날짜 · 제목 · 출처</strong>{" "}
            네 요소로 구성됩니다. 본문에는 <strong className="text-foreground">본문 내 인용
            (in-text citation)</strong>을, 글 끝에는 <strong className="text-foreground">참고문헌
            목록(reference list)</strong>을 두며, 본문에 인용된 문헌과 목록의 문헌은 빠짐없이
            일치해야 합니다.
          </p>
          <div className="rounded-xl border bg-muted/20 p-3 text-xs leading-relaxed text-muted-foreground">
            저자. (날짜). <span className="text-foreground">제목</span>. 출처.
          </div>
        </section>

        {/* ── 2. 본문 내 인용 ── */}
        <section className="mt-8 space-y-3">
          <SectionTitle no={2}>본문 내 인용 (In-text Citation)</SectionTitle>
          <p className="text-sm leading-relaxed text-muted-foreground">
            괄호식과 서술식 두 가지가 있습니다. 직접 인용 시에는 쪽수를 함께 표기합니다.
          </p>
          <div className="space-y-2">
            <RefBlock
              label="괄호식 / 서술식"
              format="(저자, 연도)  ·  저자(연도)는 ~"
              example="(홍길동, 2023)  ·  홍길동(2023)은 학습몰입을 …"
            />
            <RefBlock
              label="저자 2명"
              format="국문 (저자1, 저자2, 연도)  ·  영문 (Author1 & Author2, 연도)"
              example="(홍길동, 김교육, 2023)  ·  (Hong & Kim, 2023)"
            />
            <RefBlock
              label="저자 3명 이상 — 첫 인용부터 축약"
              format="국문 (제1저자 외, 연도)  ·  영문 (First author et al., 연도)"
              example="(홍길동 외, 2023)  ·  (Hong et al., 2023)"
            />
            <RefBlock
              label="직접 인용 (쪽수 표기)"
              format="(저자, 연도, p. 쪽)  ·  여러 쪽이면 pp. 시작–끝"
              example="(홍길동, 2023, p. 45)  ·  (Hong et al., 2023, pp. 12–14)"
            />
          </div>
        </section>

        {/* ── 3. 참고문헌 목록 — 자료 유형별 ── */}
        <section className="mt-8 space-y-3">
          <SectionTitle no={3}>참고문헌 목록 — 자료 유형별 형식</SectionTitle>
          <p className="text-sm leading-relaxed text-muted-foreground">
            저자명은 국문은 성명 전체, 영문은 성 + 이름 이니셜로 적습니다. 학술지명·책 제목은
            이탤릭(국문은 소속 지침에 따라 진하게 처리하기도 함)으로 강조합니다.
          </p>
          <div className="space-y-2">
            <RefBlock
              label="학술지 논문 (국문)"
              format="저자. (연도). 논문 제목. 학술지명, 권(호), 시작쪽–끝쪽. https://doi.org/xxxx"
              example="홍길동, 김교육. (2023). 플립러닝 환경에서 학습몰입의 매개효과. 교육공학연구, 39(2), 101–128. https://doi.org/10.0000/example"
            />
            <RefBlock
              label="학술지 논문 (영문)"
              format="Author, A. A., & Author, B. B. (Year). Article title. Journal Name, Vol(Issue), pp–pp. https://doi.org/xxxx"
              example="Hong, G., & Kim, E. (2023). Mediating effect of flow in flipped learning. Educational Technology Research, 39(2), 101–128. https://doi.org/10.0000/example"
            />
            <RefBlock
              label="단행본 (APA 7판: 출판지 생략)"
              format="저자. (연도). 책 제목 (판 표기). 출판사."
              example="김교육. (2022). 교수설계의 이론과 실제 (2판). 학지사."
            />
            <RefBlock
              label="책의 장 (Book Chapter)"
              format="저자. (연도). 장 제목. In 편저자 (편), 책 제목 (pp. 시작–끝). 출판사."
              example="홍길동. (2021). 적응형 학습 시스템 설계. In 김교육 (편), 미래 교육공학 (pp. 55–80). 학지사."
            />
            <RefBlock
              label="학위논문"
              format="저자. (연도). 논문 제목 [석사학위논문/박사학위논문, 대학명]. 저장소·DB명. URL"
              example="홍길동. (2024). 대학원생의 학업몰입 요인 탐색 [석사학위논문, 연세대학교]. 학술정보원."
            />
            <RefBlock
              label="학술대회 발표"
              format="발표자. (연도, 월 일). 발표 제목 [발표 형식]. 학술대회명, 개최지."
              example="홍길동, 김교육. (2024, 5월 30일). 생성형 AI 기반 피드백 설계 [포스터 발표]. 한국교육공학회 춘계학술대회, 서울."
            />
            <RefBlock
              label="웹페이지 / 온라인 자료"
              format="저자 또는 기관. (연도, 월 일). 페이지 제목. 사이트명. URL"
              example="한국교육학술정보원. (2023, 3월 2일). 디지털 교과서 활용 안내. KERIS. https://example.org/page"
            />
            <RefBlock
              label="보고서"
              format="기관. (연도). 보고서 제목 (보고서 번호). 발행처. URL"
              example="한국교육개발원. (2023). 에듀테크 활용 실태 조사 (RR-2023-01). 한국교육개발원. https://example.org/report"
            />
          </div>
        </section>

        {/* ── 4. 국문 자료 유의점 ── */}
        <section className="mt-8 space-y-3">
          <SectionTitle no={4}>국문 자료 작성 시 유의점</SectionTitle>
          <ul className="space-y-1.5 rounded-xl border bg-card p-4 text-sm leading-relaxed text-muted-foreground">
            <li>• 국문 저자는 <strong className="text-foreground">성명 전체</strong>를 적고, 영문 저자는 성 + 이름 이니셜로 적습니다.</li>
            <li>• 본문 3인 이상 인용 시 국문은 <strong className="text-foreground">&apos;외&apos;</strong>, 영문은 <strong className="text-foreground">&apos;et al.&apos;</strong>을 씁니다.</li>
            <li>• 참고문헌 목록은 일반적으로 국문 문헌(가나다순) → 영문 문헌(알파벳순) 순으로 배열하나, 통합 배열을 요구하는 곳도 있어 <strong className="text-foreground">소속 지침</strong>을 확인하세요.</li>
            <li>• 국문 학술지명·책 제목의 이탤릭 처리는 어색할 수 있어 진하게 처리하기도 합니다 — 제출 지침을 우선합니다.</li>
            <li>• 국내 논문 인용 시 권(호)·쪽수 표기는 학술지마다 관행이 다를 수 있습니다.</li>
          </ul>
        </section>

        {/* ── 5. APA 6 → 7 변경점 ── */}
        <section className="mt-8 space-y-3">
          <SectionTitle no={5}>APA 6판 → 7판 주요 변경점</SectionTitle>
          <ul className="space-y-1.5 rounded-xl border bg-card p-4 text-sm leading-relaxed text-muted-foreground">
            <li>• <strong className="text-foreground">출판사 소재지(출판지) 생략</strong> — 단행본에 도시명을 적지 않습니다.</li>
            <li>• <strong className="text-foreground">DOI 형식 통일</strong> — <code className="rounded bg-muted px-1 text-xs">https://doi.org/…</code> 형태로 적고, &quot;doi:&quot; 표기는 폐기되었습니다.</li>
            <li>• <strong className="text-foreground">본문 3인 이상</strong>은 첫 인용부터 &apos;et al.&apos;(외)로 축약합니다 (6판은 3~5인 첫 인용 시 전원 표기).</li>
            <li>• 참고문헌 목록의 저자는 <strong className="text-foreground">최대 20명</strong>까지 표기하고, 21명 이상이면 19명 + … + 마지막 저자로 적습니다.</li>
            <li>• 웹 자료의 &quot;Retrieved from&quot;은 대부분 생략하며, 수시로 바뀌는 자료에만 인출일을 표기합니다.</li>
          </ul>
        </section>

        <Separator className="mt-8" />
        <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
          본 가이드는 APA 7판 공개 표준을 교육공학 연구자가 빠르게 참고하도록 정리한 요약본입니다.
          세부 규정·예외 사항은 <em>APA Publication Manual (7th ed.)</em> 및 소속 대학원 논문 작성
          지침을 반드시 확인하시기 바랍니다.
        </p>
      </div>
    </div>
  );
}
