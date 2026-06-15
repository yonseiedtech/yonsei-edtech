"use client";

import Link from "next/link";
import { ArrowLeft, Layers } from "lucide-react";
import PageContainer from "@/components/ui/page-container";
import PageHeader from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import FlashcardStudy from "@/components/flashcard/FlashcardStudy";

export default function FlashcardsPage() {
  return (
    <PageContainer width="default">
      <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
        <Link href="/diagnosis">
          <Button variant="ghost" size="sm" className="mb-3">
            <ArrowLeft className="mr-1 h-4 w-4" />
            진단평가
          </Button>
        </Link>

        <PageHeader
          icon={Layers}
          title="내 암기카드"
          description="진단평가에서 틀린 문항을 뒤집기·간격반복으로 복습하세요. 맞춘 카드는 복습 간격이 늘어나고, 틀린 카드는 다시 출제됩니다."
        />

        <div className="mt-6">
          <FlashcardStudy />
        </div>
      </div>
    </PageContainer>
  );
}
