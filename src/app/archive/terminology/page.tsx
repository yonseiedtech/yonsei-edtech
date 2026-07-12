"use client";

/**
 * 교육공학 아카이브 — AECT 용어 표준 사전.
 *
 * 『교육공학 용어해설』(Rita C. Richey 편, 학지사 2020 / 원서 Springer 2013)의 공식
 * 표제어 186개·역어·6영역 분류를 브라우징한다. 표제어·역어 대응(사실 정보)만
 * 수록하며, 원저작물의 해설 본문은 전재하지 않는다.
 */

import Link from "next/link";
import { BookMarked, ArrowLeft } from "lucide-react";
import PageHeader from "@/components/ui/page-header";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import InlineNotification from "@/components/ui/inline-notification";
import PageContainer from "@/components/ui/page-container";
import AectTerminologyBrowser from "@/components/archive/AectTerminologyBrowser";
import { AECT_SOURCE, AECT_TERMS, aectCitation } from "@/lib/aect-terminology";

export default function AectTerminologyPage() {
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

        <PageHeader
          icon={BookMarked}
          title="AECT 용어 표준 사전"
          description={`AECT 공식 용어집의 표제어 ${AECT_TERMS.length}개·공식 역어·6개 영역 분류를 표준으로 정리했습니다.`}
        />

        <Separator className="mt-6" />

        {/* ── 출처 카드 (서지 정보) ── */}
        <Card className="mt-6 border-l-4 border-l-indigo-400 bg-card shadow-sm">
          <CardContent className="py-5">
            <p className="text-sm font-semibold">출처</p>
            <p className="mt-1.5 text-sm leading-relaxed text-foreground/90">
              <span className="font-serif italic">{AECT_SOURCE.titleEn}</span>
              {" — "}
              <strong>
                {AECT_SOURCE.editor} (편), 『{AECT_SOURCE.titleKo}』
              </strong>
              <br />
              {AECT_SOURCE.translators.join(", ")} 공역 · {AECT_SOURCE.publisherKo}(
              {AECT_SOURCE.yearTranslation}) · 원서 {AECT_SOURCE.publisherEn}(
              {AECT_SOURCE.yearOriginal})
            </p>
            <p className="mt-3 rounded-lg bg-muted/50 px-3 py-2 font-mono text-[11px] leading-relaxed text-muted-foreground">
              {aectCitation()}
            </p>
          </CardContent>
        </Card>

        {/* ── 저작권·범위 고지 ── */}
        <div className="mt-4">
          <InlineNotification
            kind="info"
            title="이 사전에 대하여"
            description={
              <span>
                본 사전은 AECT(교육공학 커뮤니케이션 협회) 용어정의위원회의 공식 용어집인{" "}
                <em className="font-serif">
                  『{AECT_SOURCE.titleKo}』({AECT_SOURCE.publisherKo}, {AECT_SOURCE.yearTranslation})
                </em>
                의 <strong>표제어·역어 대응 정보</strong>와 영역 분류만 수록합니다. 각 용어의
                해설 본문은 원저작물을 참조하시기 바랍니다. 원서{" "}
                <em className="font-serif">{AECT_SOURCE.titleEn}</em>는{" "}
                {AECT_SOURCE.publisherEn}({AECT_SOURCE.yearOriginal})에서, 번역서는{" "}
                {AECT_SOURCE.publisherKo}에서 발행되었습니다.
              </span>
            }
          />
        </div>

        {/* ── 브라우저 (검색·필터·표) ── */}
        <AectTerminologyBrowser />
      </div>
    </PageContainer>
  );
}
