"use client";

import { useState } from "react";
import { MessageSquare, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAddReviewComment } from "../api/useJournal";
import { SEVERITY_LABELS, SEVERITY_COLORS } from "../lib/article-status";
import type { ResearchJournalArticle, ReviewCommentSeverity, User } from "@/types";

interface Props {
  article: ResearchJournalArticle;
  currentUserId: string;
  canComment: boolean; // 검수자 + staff+ + 팀 멤버
  userMap: Map<string, User>;
}

const SEVERITIES: ReviewCommentSeverity[] = ["blocking", "major", "minor", "praise"];

export default function JournalReviewCommentSection({
  article,
  currentUserId,
  canComment,
  userMap,
}: Props) {
  const addMut = useAddReviewComment(article.id);
  const [body, setBody] = useState("");
  const [severity, setSeverity] = useState<ReviewCommentSeverity>("minor");

  const submit = async () => {
    if (!body.trim()) return;
    await addMut.mutateAsync({
      reviewerId: currentUserId,
      body: body.trim(),
      severity,
    });
    setBody("");
    setSeverity("minor");
  };

  const comments = [...(article.reviewComments ?? [])].sort((a, b) =>
    (b.createdAt ?? "").localeCompare(a.createdAt ?? ""),
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <MessageSquare size={16} /> 검수 코멘트 ({comments.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {comments.length === 0 ? (
          <p className="text-sm text-muted-foreground">아직 검수 코멘트가 없습니다.</p>
        ) : (
          comments.map((c) => {
            const reviewer = userMap.get(c.reviewerId);
            return (
              <div
                key={c.id}
                className={`rounded border-l-4 p-3 text-sm ${SEVERITY_COLORS[c.severity]}`}
              >
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-xs font-semibold">
                    [{SEVERITY_LABELS[c.severity]}] {reviewer?.name ?? c.reviewerId}
                  </span>
                  <span className="text-xs opacity-70">
                    {new Date(c.createdAt).toLocaleString("ko-KR")}
                  </span>
                </div>
                <p className="whitespace-pre-wrap leading-relaxed">{c.body}</p>
                {c.resolvedAt && (
                  <p className="mt-1 text-xs italic opacity-70">
                    ✓ {new Date(c.resolvedAt).toLocaleString("ko-KR")} 해결됨
                  </p>
                )}
              </div>
            );
          })
        )}

        {canComment && (
          <div className="space-y-2 rounded border border-dashed border-muted p-3">
            <div className="flex items-center gap-2">
              <Label htmlFor="rc-severity" className="mb-0 text-xs shrink-0">
                심각도:
              </Label>
              <select
                id="rc-severity"
                value={severity}
                onChange={(e) => setSeverity(e.target.value as ReviewCommentSeverity)}
                className="rounded border border-muted px-2 py-1 text-xs"
              >
                {SEVERITIES.map((s) => (
                  <option key={s} value={s}>
                    {SEVERITY_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>
            <Textarea
              rows={3}
              placeholder="검수 코멘트 — markdown 가능. blocking 등급은 해결 전까지 accept 불가."
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
            <Button type="button" size="sm" onClick={submit} disabled={!body.trim() || addMut.isPending}>
              <Plus size={14} className="mr-1" />
              코멘트 추가
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
