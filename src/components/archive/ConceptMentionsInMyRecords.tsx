"use client";

/**
 * "내 기록 속 이 개념" — 아카이브 개념 역참조 (벤치마크-H4, Obsidian unlinked mentions)
 *
 * 로그인 회원 '본인'의 메모·논문 읽기 기록에서 이 개념의 이름·별칭이 등장하는
 * 항목을 찾아 링크한다. 타인 콘텐츠는 스캔하지 않는다(프라이버시·비용).
 * 클라이언트에서 본인 데이터만 조회하고 react-query 로 캐시한다.
 */

import { useMemo } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { NotebookPen, BookOpen, Quote } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { userNotesApi, paperReadingLogsApi } from "@/lib/bkend";
import { findConceptMention } from "@/lib/concept-matching";
import type { UserNote } from "@/types";
import type { PaperReadingLog } from "@/types/paper-reading";

interface Props {
  conceptName: string;
  altNames: string[];
  userId: string;
}

interface MentionItem {
  key: string;
  kind: "note" | "reading";
  href: string;
  title: string;
  excerpt: string;
}

/** field 목록에서 개념 언급을 찾아 1줄 발췌를 만든다. 없으면 null. */
function buildExcerpt(fields: (string | undefined)[], names: string[]): string | null {
  for (const raw of fields) {
    const field = raw?.trim();
    if (!field) continue;
    const hit = findConceptMention(field, names);
    if (!hit) continue;
    const start = Math.max(0, hit.index - 30);
    const end = Math.min(field.length, hit.index + hit.name.length + 50);
    let snippet = field.slice(start, end).replace(/\s+/g, " ").trim();
    if (start > 0) snippet = `…${snippet}`;
    if (end < field.length) snippet = `${snippet}…`;
    return snippet;
  }
  return null;
}

export default function ConceptMentionsInMyRecords({
  conceptName,
  altNames,
  userId,
}: Props) {
  const names = useMemo(() => {
    const set = new Set<string>();
    for (const n of [conceptName, ...altNames]) {
      const t = n?.trim();
      if (t && t.length >= 2) set.add(t);
    }
    return [...set];
  }, [conceptName, altNames]);

  const { data: notes = [] } = useQuery({
    queryKey: ["user-notes", userId],
    queryFn: async () => {
      const res = await userNotesApi.listByUser(userId);
      return res.data as UserNote[];
    },
    enabled: !!userId && names.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  const { data: logs = [] } = useQuery({
    queryKey: ["paper-reading-logs", userId],
    queryFn: async () => {
      const res = await paperReadingLogsApi.listByUser(userId);
      return res.data as unknown as PaperReadingLog[];
    },
    enabled: !!userId && names.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  const items = useMemo<MentionItem[]>(() => {
    if (names.length === 0) return [];
    const out: MentionItem[] = [];
    for (const note of notes) {
      const excerpt = buildExcerpt([note.title, note.body], names);
      if (excerpt) {
        out.push({
          key: `note-${note.id}`,
          kind: "note",
          href: `/mypage/notes/${note.id}`,
          title: note.title || "(제목 없음)",
          excerpt,
        });
      }
    }
    for (const log of logs) {
      const excerpt = buildExcerpt(
        [log.title, log.oneLine, log.keyClaim, log.method, log.implication],
        names,
      );
      if (excerpt) {
        out.push({
          key: `reading-${log.id}`,
          kind: "reading",
          href: "/mypage/research",
          title: log.title || "논문 읽기 기록",
          excerpt,
        });
      }
    }
    return out;
  }, [notes, logs, names]);

  if (items.length === 0) return null;

  return (
    <Card className="mt-6 scroll-mt-24">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Quote className="h-4 w-4 text-muted-foreground" />
          내 기록 속 이 개념
          <span className="text-xs font-normal text-muted-foreground">
            · {items.length}건
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-3 text-sm text-muted-foreground">
          내가 작성한 메모·논문 읽기 기록에서 이 개념(&lsquo;{conceptName}&rsquo;)이 언급된 곳입니다.
        </p>
        <ul className="space-y-2">
          {items.map((it) => {
            const Icon = it.kind === "note" ? NotebookPen : BookOpen;
            return (
              <li key={it.key}>
                <Link
                  href={it.href}
                  className="flex items-start gap-2.5 rounded-md border p-3 transition-colors hover:bg-muted/40"
                >
                  <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-foreground line-clamp-1">
                      {it.title}
                    </span>
                    <span className="mt-0.5 block text-xs text-muted-foreground line-clamp-2">
                      {it.excerpt}
                    </span>
                  </span>
                  <span className="shrink-0 self-center text-[10px] text-muted-foreground">
                    {it.kind === "note" ? "메모" : "읽기 기록"}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
