"use client";

import { useState } from "react";
import { Save, Plus, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useUpdateArticleMeta } from "../api/useJournal";
import type {
  ArticleCitation,
  CitationType,
  ResearchJournalArticle,
  UpdateArticleMetaInput,
} from "@/types";

interface Props {
  article: ResearchJournalArticle;
  disabled?: boolean;
}

const CITATION_TYPE_LABELS: Record<CitationType, string> = {
  journal: "학술논문",
  book: "단행본",
  chapter: "단행본 챕터",
  thesis: "학위논문",
  web: "웹",
  other: "기타",
};

function newId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function JournalArticleContentEditor({ article, disabled }: Props) {
  const updateMut = useUpdateArticleMeta(article.id);

  const [titleKo, setTitleKo] = useState(article.titleKo ?? "");
  const [titleEn, setTitleEn] = useState(article.titleEn ?? "");
  const [abstractKo, setAbstractKo] = useState(article.abstractKo ?? "");
  const [abstractEn, setAbstractEn] = useState(article.abstractEn ?? "");
  const [keywordsKoRaw, setKeywordsKoRaw] = useState((article.keywordsKo ?? []).join(", "));
  const [keywordsEnRaw, setKeywordsEnRaw] = useState((article.keywordsEn ?? []).join(", "));
  const [content, setContent] = useState(article.content ?? "");
  const [citations, setCitations] = useState<ArticleCitation[]>(article.citations ?? []);
  const [dataLinksRaw, setDataLinksRaw] = useState((article.dataLinks ?? []).join("\n"));

  const isImrad = article.contentStructure === "imrad";

  const addCitation = () => {
    setCitations([
      ...citations,
      {
        id: newId(),
        type: "journal",
        authors: "",
        year: new Date().getFullYear(),
        title: "",
      },
    ]);
  };

  const updateCitation = (
    idx: number,
    key: keyof ArticleCitation,
    value: unknown,
  ) => {
    setCitations((cs) =>
      cs.map((c, i) => (i === idx ? { ...c, [key]: value } : c)),
    );
  };

  const removeCitation = (idx: number) => {
    setCitations((cs) => cs.filter((_, i) => i !== idx));
  };

  const save = async () => {
    const patch: UpdateArticleMetaInput = {
      titleKo: titleKo.trim(),
      titleEn: titleEn.trim() || undefined,
      abstractKo: abstractKo.trim(),
      abstractEn: abstractEn.trim() || undefined,
      keywordsKo: keywordsKoRaw.split(",").map((s) => s.trim()).filter(Boolean),
      keywordsEn: keywordsEnRaw.split(",").map((s) => s.trim()).filter(Boolean),
      content,
      citations,
      dataLinks: dataLinksRaw.split("\n").map((s) => s.trim()).filter(Boolean),
    };
    await updateMut.mutateAsync(patch);
  };

  return (
    <div className="space-y-6">
      {/* 메타 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">논문 메타</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="art-title-ko">
              제목 (한글) <span className="text-red-500">*</span>
            </Label>
            <Input
              id="art-title-ko"
              value={titleKo}
              onChange={(e) => setTitleKo(e.target.value)}
              disabled={disabled}
              required
            />
          </div>
          <div>
            <Label htmlFor="art-title-en">제목 (영문)</Label>
            <Input
              id="art-title-en"
              value={titleEn}
              onChange={(e) => setTitleEn(e.target.value)}
              disabled={disabled}
            />
          </div>
          <div>
            <Label htmlFor="art-abstract-ko">
              초록 (한글) <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="art-abstract-ko"
              rows={6}
              value={abstractKo}
              onChange={(e) => setAbstractKo(e.target.value)}
              disabled={disabled}
              required
            />
          </div>
          <div>
            <Label htmlFor="art-abstract-en">초록 (영문)</Label>
            <Textarea
              id="art-abstract-en"
              rows={6}
              value={abstractEn}
              onChange={(e) => setAbstractEn(e.target.value)}
              disabled={disabled}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="art-kw-ko">키워드 (한글, 콤마 구분)</Label>
              <Input
                id="art-kw-ko"
                value={keywordsKoRaw}
                onChange={(e) => setKeywordsKoRaw(e.target.value)}
                disabled={disabled}
                placeholder="예: 마이크로러닝, 학습몰입, 메타분석"
              />
            </div>
            <div>
              <Label htmlFor="art-kw-en">키워드 (영문, 콤마 구분)</Label>
              <Input
                id="art-kw-en"
                value={keywordsEnRaw}
                onChange={(e) => setKeywordsEnRaw(e.target.value)}
                disabled={disabled}
                placeholder="예: micro-learning, engagement, meta-analysis"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 본문 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            본문 ({isImrad ? "IMRaD 구조 권장" : "자유 형식"})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isImrad && (
            <p className="mb-2 rounded bg-blue-50 px-3 py-2 text-xs text-blue-900">
              💡 정식 연구지는 <strong>IMRaD 구조</strong>를 권장합니다. 다음 섹션 헤더를 사용하세요:
              <br />
              <code className="text-xs">## 서론 / ## 방법 / ## 결과 / ## 논의 / ## 결론 / ## 참고문헌</code>
            </p>
          )}
          <Textarea
            rows={20}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            disabled={disabled}
            placeholder={
              isImrad
                ? "## 서론\n\n...\n\n## 방법\n\n...\n\n## 결과\n\n...\n\n## 논의\n\n..."
                : "markdown 본문"
            }
            className="font-mono text-sm"
          />
        </CardContent>
      </Card>

      {/* 인용 (참고문헌) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">참고문헌 ({citations.length}건)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {citations.map((c, idx) => (
            <div key={c.id} className="space-y-2 rounded border border-zinc-200 p-2">
              <div className="grid gap-2 sm:grid-cols-[120px_1fr_80px_auto]">
                <select
                  value={c.type}
                  onChange={(e) =>
                    updateCitation(idx, "type", e.target.value as CitationType)
                  }
                  disabled={disabled}
                  className="rounded border border-zinc-300 px-2 py-1 text-xs"
                >
                  {Object.entries(CITATION_TYPE_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
                <Input
                  placeholder="저자 (예: Mayer, R. E., & Schmidt, A.)"
                  value={c.authors}
                  onChange={(e) => updateCitation(idx, "authors", e.target.value)}
                  disabled={disabled}
                />
                <Input
                  type="number"
                  placeholder="연도"
                  value={c.year}
                  onChange={(e) =>
                    updateCitation(idx, "year", parseInt(e.target.value, 10) || 0)
                  }
                  disabled={disabled}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeCitation(idx)}
                  disabled={disabled}
                  title="제거"
                >
                  <X size={14} className="text-red-500" />
                </Button>
              </div>
              <Input
                placeholder="제목"
                value={c.title}
                onChange={(e) => updateCitation(idx, "title", e.target.value)}
                disabled={disabled}
              />
              <div className="grid gap-2 sm:grid-cols-2">
                <Input
                  placeholder="출처 (venue/publisher)"
                  value={c.source ?? ""}
                  onChange={(e) => updateCitation(idx, "source", e.target.value)}
                  disabled={disabled}
                />
                <Input
                  placeholder="DOI 또는 URL"
                  value={c.doi ?? c.url ?? ""}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v.startsWith("10.")) updateCitation(idx, "doi", v);
                    else updateCitation(idx, "url", v);
                  }}
                  disabled={disabled}
                />
              </div>
            </div>
          ))}
          {!disabled && (
            <Button type="button" size="sm" variant="outline" onClick={addCitation}>
              <Plus size={14} className="mr-1" />
              참고문헌 추가
            </Button>
          )}
        </CardContent>
      </Card>

      {/* 데이터 링크 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">데이터·자료 링크 (Open Science)</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            rows={3}
            placeholder="OSF·Zenodo·GitHub 등 외부 저장소 URL을 한 줄에 하나씩"
            value={dataLinksRaw}
            onChange={(e) => setDataLinksRaw(e.target.value)}
            disabled={disabled}
          />
        </CardContent>
      </Card>

      {!disabled && (
        <div className="flex justify-end">
          <Button type="button" onClick={save} disabled={updateMut.isPending}>
            <Save size={14} className="mr-1" />
            저장
          </Button>
        </div>
      )}
    </div>
  );
}
