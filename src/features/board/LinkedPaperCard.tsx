"use client";

/**
 * Sprint 41d — 게시물 본문 위에 표시되는 첨부 논문 카드.
 * 다른 회원이 이 논문을 자신의 ResearchPaper(논문 읽기) 목록에 1-클릭으로 저장할 수 있다.
 */

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/features/auth/auth-store";
import { useResearchPapers, useCreateResearchPaper } from "@/features/research/useResearchPapers";
import type { PostLinkedPaper } from "@/types";
import { BookmarkPlus, BookOpenCheck, ExternalLink, Check, LogIn } from "lucide-react";
import { toast } from "sonner";

interface Props {
  paper: PostLinkedPaper;
  authorIsMe: boolean;
  onLoginRequired?: () => void;
}

export default function LinkedPaperCard({ paper, authorIsMe, onLoginRequired }: Props) {
  const { user } = useAuthStore();
  const { papers } = useResearchPapers(user?.id);
  const createPaper = useCreateResearchPaper();
  const [saving, setSaving] = useState(false);

  // 이미 내 읽기 목록에 있는지 확인 (제목+연도+저자 fingerprint)
  const alreadySaved = useMemo(() => {
    if (!papers || papers.length === 0) return false;
    const fp = `${paper.title.trim().toLowerCase()}|${paper.year ?? ""}|${(paper.authors ?? "").trim().toLowerCase()}`;
    return papers.some((p) => `${p.title.trim().toLowerCase()}|${p.year ?? ""}|${(p.authors ?? "").trim().toLowerCase()}` === fp);
  }, [papers, paper]);

  async function handleSave() {
    if (!user) {
      onLoginRequired?.();
      return;
    }
    setSaving(true);
    try {
      await createPaper.mutateAsync({
        userId: user.id,
        paperType: paper.paperType,
        thesisLevel: paper.thesisLevel,
        title: paper.title,
        authors: paper.authors,
        year: paper.year,
        venue: paper.venue,
        doi: paper.doi,
        url: paper.url,
        sourceAlumniThesisId: paper.sourceAlumniThesisId,
        readStatus: "to_read",
        isDraft: false,
      });
      toast.success("내 분석 노트에 추가되었습니다. 마이페이지 → 연구 → 논문 읽기 탭에서 확인하세요.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-6 rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 to-slate-50 p-5">
      <div className="flex items-center gap-2 text-violet-800">
        <BookOpenCheck size={18} />
        <span className="text-sm font-bold">리뷰한 논문</span>
        <Badge
          variant="outline"
          className={paper.paperType === "thesis" ? "border-violet-300 bg-card text-violet-700" : "border-blue-300 bg-card text-blue-700"}
        >
          {paper.paperType === "thesis"
            ? paper.thesisLevel === "doctoral"
              ? "박사논문"
              : "석사논문"
            : "학술논문"}
        </Badge>
      </div>
      <h3 className="mt-3 text-base font-semibold leading-snug">{paper.title}</h3>
      {[paper.authors, paper.year, paper.venue].some(Boolean) && (
        <div className="mt-1 text-sm text-muted-foreground">
          {[paper.authors, paper.year, paper.venue].filter(Boolean).join(" · ")}
        </div>
      )}
      {(paper.doi || paper.url) && (
        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          {paper.doi && <span>DOI: {paper.doi}</span>}
          {paper.url && (
            <a
              href={paper.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-blue-600 underline"
            >
              <ExternalLink size={11} />
              원문 보기
            </a>
          )}
        </div>
      )}

      <div className="mt-4 flex items-center gap-2">
        {!authorIsMe ? (
          !user ? (
            <Button size="sm" variant="outline" onClick={() => onLoginRequired?.()}>
              <LogIn size={14} className="mr-1.5" />
              로그인 후 내 분석 노트에 추가
            </Button>
          ) : alreadySaved ? (
            <Button size="sm" variant="outline" disabled>
              <Check size={14} className="mr-1.5" />
              이미 내 분석 노트에 있음
            </Button>
          ) : (
            <Button size="sm" onClick={handleSave} disabled={saving}>
              <BookmarkPlus size={14} className="mr-1.5" />
              {saving ? "추가 중…" : "내 분석 노트에 추가"}
            </Button>
          )
        ) : (
          <span className="text-xs text-muted-foreground">본인이 첨부한 논문입니다.</span>
        )}
      </div>
    </div>
  );
}
