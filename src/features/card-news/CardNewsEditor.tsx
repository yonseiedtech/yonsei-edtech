"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Eye,
  Plus,
  Save,
  Trash2,
  ChevronUp,
  ChevronDown,
  Copy,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CardArtFit } from "./CardArtFit";
import { cardNewsApi } from "@/lib/bkend";
import type { CardKind, CardNewsSeries, CardSpec } from "./types";

interface Props {
  initial: CardNewsSeries;
  isNew: boolean;
}

const KIND_LABELS: Record<CardKind, string> = {
  cover: "표지",
  intro: "인트로",
  feature: "기능 카드",
  cta: "마무리 CTA",
};

const KIND_OPTIONS: CardKind[] = ["cover", "intro", "feature", "cta"];

function uniqCardId(existing: string[], base: string) {
  let i = 1;
  let candidate = base;
  while (existing.includes(candidate)) {
    candidate = `${base}-${i++}`;
  }
  return candidate;
}

export default function CardNewsEditor({ initial, isNew }: Props) {
  const router = useRouter();
  const [series, setSeries] = useState<CardNewsSeries>(() => ({
    ...initial,
    cards: initial.cards.map((c) => ({ ...c })),
  }));
  const [activeIdx, setActiveIdx] = useState(0);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const total = series.cards.length;
  const card = series.cards[activeIdx];

  const idTaken = useMemo(() => {
    const ids = series.cards.map((c) => c.id);
    return new Set(ids).size !== ids.length;
  }, [series.cards]);

  function patchSeries(patch: Partial<CardNewsSeries>) {
    setSeries((s) => ({ ...s, ...patch }));
  }

  function patchCard(idx: number, patch: Partial<CardSpec>) {
    setSeries((s) => ({
      ...s,
      cards: s.cards.map((c, i) => (i === idx ? { ...c, ...patch } : c)),
    }));
  }

  function moveCard(idx: number, dir: -1 | 1) {
    const next = idx + dir;
    if (next < 0 || next >= series.cards.length) return;
    setSeries((s) => {
      const arr = [...s.cards];
      [arr[idx], arr[next]] = [arr[next], arr[idx]];
      return { ...s, cards: arr };
    });
    setActiveIdx(next);
  }

  function duplicateCard(idx: number) {
    setSeries((s) => {
      const src = s.cards[idx];
      const newId = uniqCardId(s.cards.map((c) => c.id), `${src.id}-copy`);
      const dup = { ...src, id: newId };
      const arr = [...s.cards];
      arr.splice(idx + 1, 0, dup);
      return { ...s, cards: arr };
    });
    setActiveIdx(idx + 1);
  }

  function deleteCard(idx: number) {
    if (series.cards.length <= 1) {
      setError("최소 1장은 남겨야 합니다.");
      return;
    }
    setSeries((s) => ({ ...s, cards: s.cards.filter((_, i) => i !== idx) }));
    setActiveIdx((cur) => Math.max(0, Math.min(cur, series.cards.length - 2)));
  }

  function addCard(kind: CardKind = "feature") {
    setSeries((s) => {
      const seq = String(s.cards.length + 1).padStart(2, "0");
      const newId = uniqCardId(
        s.cards.map((c) => c.id),
        `${seq}-${kind}`,
      );
      const fresh: CardSpec = {
        id: newId,
        kind,
        title: "새 카드 제목",
        subtitle: kind === "feature" ? "Subtitle" : undefined,
        badge: kind === "feature" ? `${s.cards.length + 1}.` : undefined,
        body: kind === "cover" || kind === "cta" ? "yonsei-edtech.vercel.app" : undefined,
        bullets: kind === "feature" || kind === "intro" ? ["불릿 1", "불릿 2"] : undefined,
      };
      return { ...s, cards: [...s.cards, fresh] };
    });
    setActiveIdx(series.cards.length);
  }

  async function handleSave() {
    setError(null);
    if (!series.title.trim()) {
      setError("시리즈 제목은 비울 수 없습니다.");
      return;
    }
    if (idTaken) {
      setError("카드 ID가 중복되었습니다. 각 카드의 ID를 고유하게 지정하세요.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: series.title,
        description: series.description ?? "",
        publishedAt: series.publishedAt,
        category: series.category ?? "",
        cards: series.cards,
      };
      await cardNewsApi.upsert(series.id, payload);
      setSavedAt(new Date());
      if (isNew) {
        router.replace(`/console/card-news/${series.id}/edit`);
        router.refresh();
      } else {
        router.refresh();
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "알 수 없는 오류";
      setError(`저장 실패: ${msg}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4 pb-12">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Link
            href="/console/card-news"
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            목록
          </Link>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
            카드뉴스 편집
          </h1>
          {isNew && (
            <Badge variant="outline" className="text-xs">
              새 시리즈
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {savedAt && !saving && (
            <span className="text-xs text-muted-foreground">
              저장됨 · {savedAt.toLocaleTimeString("ko-KR")}
            </span>
          )}
          <Link
            href={`/console/card-news/${series.id}`}
            target="_blank"
            className="inline-flex items-center gap-1.5 rounded-md border bg-background px-3 py-1.5 text-xs font-medium shadow-sm transition hover:bg-muted"
          >
            <Eye className="h-3.5 w-3.5" />
            슬라이드 보기
          </Link>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="mr-1 h-3.5 w-3.5" />
            )}
            저장
          </Button>
        </div>
      </div>

      {error && (
        <div role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <Tabs defaultValue="cards" className="space-y-4">
        <TabsList>
          <TabsTrigger value="meta">시리즈 정보</TabsTrigger>
          <TabsTrigger value="cards">카드 편집 ({total}장)</TabsTrigger>
        </TabsList>

        <TabsContent value="meta" className="space-y-4">
          <Card>
            <CardContent className="space-y-4 p-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">시리즈 ID</label>
                  <Input
                    value={series.id}
                    onChange={(e) => patchSeries({ id: e.target.value.trim() })}
                    disabled={!isNew}
                    placeholder="예: 2026-04-launch"
                  />
                  {!isNew && (
                    <p className="text-[11px] text-muted-foreground">기존 시리즈의 ID는 변경할 수 없습니다.</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">발행일</label>
                  <Input
                    type="date"
                    value={series.publishedAt}
                    onChange={(e) => patchSeries({ publishedAt: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">제목</label>
                  <Input
                    value={series.title}
                    onChange={(e) => patchSeries({ title: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">카테고리</label>
                  <Input
                    value={series.category ?? ""}
                    onChange={(e) => patchSeries({ category: e.target.value })}
                    placeholder="예: 공지, 학회보, 행사"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">설명</label>
                <Textarea
                  value={series.description}
                  onChange={(e) => patchSeries({ description: e.target.value })}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cards" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)_minmax(0,360px)]">
            <CardListSidebar
              cards={series.cards}
              activeIdx={activeIdx}
              onSelect={setActiveIdx}
              onAdd={addCard}
            />

            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-muted/30 px-3 py-2">
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium">{activeIdx + 1} / {total}</span>
                  <Badge variant="secondary" className="text-[10px]">
                    {KIND_LABELS[card.kind]}
                  </Badge>
                </div>
                <div className="flex items-center gap-1">
                  <Button size="sm" variant="ghost" onClick={() => moveCard(activeIdx, -1)} disabled={activeIdx === 0} title="위로">
                    <ChevronUp className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => moveCard(activeIdx, 1)} disabled={activeIdx === total - 1} title="아래로">
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => duplicateCard(activeIdx)} title="복제">
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => deleteCard(activeIdx)} title="삭제" className="text-destructive hover:bg-destructive/10 hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <CardEditorForm
                key={card.id + activeIdx}
                card={card}
                onChange={(patch) => patchCard(activeIdx, patch)}
              />
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">실시간 미리보기</p>
              <div className="overflow-hidden rounded-2xl border shadow-sm">
                <CardArtFit spec={card} />
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function CardListSidebar({
  cards,
  activeIdx,
  onSelect,
  onAdd,
}: {
  cards: CardSpec[];
  activeIdx: number;
  onSelect: (i: number) => void;
  onAdd: (kind: CardKind) => void;
}) {
  return (
    <div className="space-y-2">
      <ul className="space-y-1.5">
        {cards.map((c, i) => (
          <li key={`${c.id}-${i}`}>
            <button
              type="button"
              onClick={() => onSelect(i)}
              className={
                "flex w-full items-center gap-2 rounded-lg border px-2.5 py-2 text-left text-xs transition " +
                (i === activeIdx
                  ? "border-primary bg-primary/10 font-medium"
                  : "border-border bg-background hover:bg-muted")
              }
            >
              <span className="w-6 shrink-0 text-center text-[10px] text-muted-foreground">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="flex-1 truncate">{c.title?.split("\n")[0] ?? c.id}</span>
              <Badge variant="outline" className="text-[10px]">
                {KIND_LABELS[c.kind]}
              </Badge>
            </button>
          </li>
        ))}
      </ul>
      <div className="grid grid-cols-2 gap-1.5 pt-2">
        {KIND_OPTIONS.map((k) => (
          <Button
            key={k}
            type="button"
            size="sm"
            variant="outline"
            className="text-xs"
            onClick={() => onAdd(k)}
          >
            <Plus className="mr-0.5 h-3 w-3" />
            {KIND_LABELS[k]}
          </Button>
        ))}
      </div>
    </div>
  );
}

function CardEditorForm({
  card,
  onChange,
}: {
  card: CardSpec;
  onChange: (patch: Partial<CardSpec>) => void;
}) {
  const showSubtitle = card.kind === "feature";
  const showBullets = card.kind === "feature" || card.kind === "intro";
  const showEnglish = card.kind === "cover" || card.kind === "cta" || card.kind === "intro";
  const showPage = card.kind === "feature";

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="카드 ID">
            <Input
              value={card.id}
              onChange={(e) => onChange({ id: e.target.value.trim() })}
              placeholder="예: 03-home"
            />
          </Field>
          <Field label="유형">
            <select
              className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
              value={card.kind}
              onChange={(e) => onChange({ kind: e.target.value as CardKind })}
            >
              {KIND_OPTIONS.map((k) => (
                <option key={k} value={k}>
                  {KIND_LABELS[k]}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <Field label="배지 (좌상단 라벨)">
          <Input value={card.badge ?? ""} onChange={(e) => onChange({ badge: e.target.value })} />
        </Field>

        <Field label={`타이틀 (줄바꿈 \\n으로 구분)`}>
          <Textarea
            value={card.title ?? ""}
            onChange={(e) => onChange({ title: e.target.value })}
            rows={3}
            placeholder="한 화면에서 만나는&#10;학회 활동"
          />
        </Field>

        {showSubtitle && (
          <Field label="서브타이틀 (영문 라벨)">
            <Input value={card.subtitle ?? ""} onChange={(e) => onChange({ subtitle: e.target.value })} />
          </Field>
        )}

        {showEnglish && (
          <Field label="영문 캡션">
            <Input value={card.english ?? ""} onChange={(e) => onChange({ english: e.target.value })} />
          </Field>
        )}

        <Field label="본문">
          <Textarea
            value={card.body ?? ""}
            onChange={(e) => onChange({ body: e.target.value })}
            rows={3}
          />
        </Field>

        {showBullets && (
          <Field label="불릿 (한 줄당 한 항목)">
            <Textarea
              value={(card.bullets ?? []).join("\n")}
              onChange={(e) =>
                onChange({
                  bullets: e.target.value
                    .split("\n")
                    .map((s) => s.trim())
                    .filter(Boolean),
                })
              }
              rows={4}
              placeholder="이번 학기 학사일정 진행률을 한눈에&#10;오늘·이번주 수업 타임라인 위젯"
            />
          </Field>
        )}

        {showPage && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="페이지 경로">
              <Input
                value={card.page ?? ""}
                onChange={(e) => onChange({ page: e.target.value })}
                placeholder="/dashboard"
              />
            </Field>
            <Field label="스크린샷 키">
              <Input
                value={card.screenshot ?? ""}
                onChange={(e) => onChange({ screenshot: e.target.value })}
                placeholder="home, seminars, ..."
              />
            </Field>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}
