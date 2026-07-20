/**
 * 대내 학술대회(미니 학술대회) 목록
 *
 * 데이터 원천 우선순위:
 *  1) site_settings key="internal_conferences" 문서(운영진 편집 후 단일 진실 원천)
 *  2) 코드 레지스트리 INTERNAL_CONFERENCES (폴백 · 시드 원본)
 *
 * CRUD(생성·수정·삭제)는 InternalConferencesView(클라이언트 컴포넌트)가 담당한다.
 */

import { Trophy } from "lucide-react";
import PageContainer from "@/components/ui/page-container";
import PageHeader from "@/components/ui/page-header";
import { Separator } from "@/components/ui/separator";
import InternalConferencesView from "@/features/internal-conference/InternalConferencesView";

export const metadata = {
  title: "대내 학술대회",
  description:
    "연세교육공학회가 주최하는 대내 학술대회(미니 학술대회). 해커톤·심포지엄 등 구성원과 함께 만드는 학술 행사입니다.",
};

export default function InternalConferencesPage() {
  return (
    <PageContainer width="wide">
      <div className="animate-in fade-in slide-in-from-bottom-2 py-8 duration-300 sm:py-14">
        <div className="mx-auto max-w-6xl px-4">
          <PageHeader
            icon={<Trophy size={24} />}
            title="대내 학술대회"
            description="연세교육공학회가 주최하는 미니 학술대회입니다. 해커톤·심포지엄 등 구성원과 함께 문제를 정의하고 해법을 나눕니다."
          />

          <Separator className="mt-6" />

          <InternalConferencesView />
        </div>
      </div>
    </PageContainer>
  );
}
