"use client";

/**
 * Sprint 41d — paper_review 게시판 작성 시 본인의 ResearchPaper(논문 읽기) 목록에서 가져오기.
 * 또는 직접 메타데이터를 입력해 첨부할 수 있는 다이얼로그.
 */

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useResearchPapers } from "@/features/research/useResearchPapers";
import type { PostLinkedPaper, PaperType, ThesisLevel, ResearchPaper } from "@/types";
import { BookOpen, FilePlus2, Search } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  userId: string | undefined;
  onSelect: (paper: PostLinkedPaper) => void;
}

function paperToLinked(p: ResearchPaper): PostLinkedPaper {
  return {
    paperType: p.paperType,
    thesisLevel: p.thesisLevel,
    title: p.title,
    authors: p.authors,
    year: p.year,
    venue: p.venue,
    doi: p.doi,
    url: p.url,
    sourceResearchPaperId: p.id,
    sourceAlumniThesisId: p.sourceAlumniThesisId,
  };
}

export default function LinkedPaperPicker({ open, onOpenChange, userId, onSelect }: Props) {
  const { papers, isLoading } = useResearchPapers(userId);
  const [tab, setTab] = useState<"library" | "manual">("library");
  const [q, setQ] = useState("");

  const [paperType, setPaperType] = useState<PaperType>("academic");
  const [thesisLevel, setThesisLevel] = useState<ThesisLevel>("master");
  const [title, setTitle] = useState("");
  const [authors, setAuthors] = useState("");
  const [year, setYear] = useState("");
  const [venue, setVenue] = useState("");
  const [doi, setDoi] = useState("");
  const [url, setUrl] = useState("");

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return papers;
    return papers.filter(
      (p) =>
        p.title.toLowerCase().includes(term) ||
        (p.authors ?? "").toLowerCase().includes(term) ||
        (p.venue ?? "").toLowerCase().includes(term),
    );
  }, [papers, q]);

  function handlePickFromLibrary(p: ResearchPaper) {
    onSelect(paperToLinked(p));
    onOpenChange(false);
  }

  function handleManualSubmit() {
    if (!title.trim()) return;
    onSelect({
      paperType,
      thesisLevel: paperType === "thesis" ? thesisLevel : undefined,
      title: title.trim(),
      authors: authors.trim() || undefined,
      year: year ? Number(year) : undefined,
      venue: venue.trim() || undefined,
      doi: doi.trim() || undefined,
      url: url.trim() || undefined,
    });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>리뷰할 논문 첨부</DialogTitle>
          <DialogDescription>
            내 논문 읽기에 저장된 논문을 가져오거나, 메타데이터를 직접 입력하세요.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as "library" | "manual")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="library">
              <BookOpen size={14} className="mr-1.5" />
              내 논문 읽기에서 가져오기
            </TabsTrigger>
            <TabsTrigger value="manual">
              <FilePlus2 size={14} className="mr-1.5" />
              직접 입력
            </TabsTrigger>
          </TabsList>

          <TabsContent value="library" className="mt-3 space-y-3">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-2.5 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="제목·저자·게재처 검색"
                className="pl-8"
              />
            </div>
            <div className="max-h-80 overflow-y-auto rounded-lg border">
              {isLoading ? (
                <div className="p-6 text-center text-sm text-muted-foreground">불러오는 중…</div>
              ) : filtered.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  {papers.length === 0
                    ? "내 논문 읽기 목록이 비어있습니다. /mypage/research?tab=reading 에서 먼저 논문을 등록하거나 직접 입력 탭을 사용하세요."
                    : "검색 결과가 없습니다."}
                </div>
              ) : (
                <ul className="divide-y">
                  {filtered.map((p) => (
                    <li key={p.id}>
                      <button
                        type="button"
                        onClick={() => handlePickFromLibrary(p)}
                        className="flex w-full flex-col gap-1 p-3 text-left transition-colors hover:bg-muted/40"
                      >
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className={p.paperType === "thesis" ? "border-violet-300 bg-violet-50 text-violet-700" : "border-blue-300 bg-blue-50 text-blue-700"}
                          >
                            {p.paperType === "thesis"
                              ? p.thesisLevel === "doctoral"
                                ? "박사논문"
                                : "석사논문"
                              : "학술논문"}
                          </Badge>
                          <span className="text-sm font-medium">{p.title}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {[p.authors, p.year, p.venue].filter(Boolean).join(" · ")}
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </TabsContent>

          <TabsContent value="manual" className="mt-3 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium">유형</label>
                <select
                  value={paperType}
                  onChange={(e) => setPaperType(e.target.value as PaperType)}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="academic">학술논문</option>
                  <option value="thesis">학위논문</option>
                </select>
              </div>
              {paperType === "thesis" && (
                <div>
                  <label className="mb-1 block text-xs font-medium">학위</label>
                  <select
                    value={thesisLevel}
                    onChange={(e) => setThesisLevel(e.target.value as ThesisLevel)}
                    className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="master">석사</option>
                    <option value="doctoral">박사</option>
                  </select>
                </div>
              )}
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium">제목 *</label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="논문 제목" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium">저자</label>
                <Input value={authors} onChange={(e) => setAuthors(e.target.value)} placeholder="홍길동, 김철수" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium">연도</label>
                <Input value={year} onChange={(e) => setYear(e.target.value)} placeholder="2024" inputMode="numeric" />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium">게재처 (학회·학교)</label>
              <Input value={venue} onChange={(e) => setVenue(e.target.value)} placeholder="교육공학연구 / 연세대학교 교육대학원" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium">DOI</label>
                <Input value={doi} onChange={(e) => setDoi(e.target.value)} placeholder="10.xxxx/xxxxx" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium">링크 URL</label>
                <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
                취소
              </Button>
              <Button type="button" onClick={handleManualSubmit} disabled={!title.trim()}>
                첨부하기
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
