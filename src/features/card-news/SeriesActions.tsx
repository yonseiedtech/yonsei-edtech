"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, Loader2, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cardNewsApi } from "@/lib/bkend";
import { todayYmdKst } from "@/lib/dday";
import type { CardNewsSeries } from "./types";

interface Props {
  series: CardNewsSeries;
  isPersisted: boolean;
}

function nextDuplicateId(baseId: string): string {
  const ymd = new Date()
    .toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" })
    .replace(/-/g, "")
    .slice(2);
  const rand = Math.random().toString(36).slice(2, 6);
  const cleanBase = baseId.replace(/-copy(-[a-z0-9]+)*$/i, "");
  return `${cleanBase}-copy-${ymd}-${rand}`;
}

export default function SeriesActions({ series, isPersisted }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<"delete" | "duplicate" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    if (!isPersisted) {
      setError("기본 시리즈는 삭제할 수 없습니다.");
      return;
    }
    setBusy("delete");
    setError(null);
    try {
      await cardNewsApi.delete(series.id);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "삭제 실패");
    } finally {
      setBusy(null);
    }
  }

  async function handleDuplicate() {
    setBusy("duplicate");
    setError(null);
    try {
      const newId = nextDuplicateId(series.id);
      const payload = {
        title: `${series.title} (복제)`,
        description: series.description,
        // Sprint 69: KST 기준으로 publishedAt 기록 (UTC drift 픽스)
        publishedAt: todayYmdKst(),
        category: series.category ?? "",
        cards: series.cards.map((c) => ({ ...c })),
      };
      await cardNewsApi.upsert(newId, payload);
      router.push(`/console/card-news/${newId}/edit`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "복제 실패");
      setBusy(null);
    }
  }

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={handleDuplicate}
        disabled={busy !== null}
        title="시리즈 복제"
        className="inline-flex h-8 w-8 items-center justify-center rounded-md border bg-background text-muted-foreground shadow-sm transition hover:bg-muted hover:text-foreground disabled:opacity-50"
      >
        {busy === "duplicate" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Copy className="h-3.5 w-3.5" />}
      </button>

      <AlertDialog>
        <AlertDialogTrigger
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border bg-background text-destructive shadow-sm transition hover:bg-destructive/10 disabled:opacity-50"
          title={isPersisted ? "시리즈 삭제" : "기본 시리즈는 삭제할 수 없습니다"}
          disabled={!isPersisted || busy !== null}
        >
          {busy === "delete" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>시리즈를 삭제할까요?</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-medium text-foreground">{series.title}</span> 시리즈와 카드 {series.cards.length}장을 영구 삭제합니다. 이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {error && (
        <span role="alert" className="ml-2 text-[10px] text-destructive">
          {error}
        </span>
      )}
    </div>
  );
}
