"use client";

import { useState } from "react";
import { Check, X, Mail, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { evaluateConsentGate } from "../lib/consent-gate";
import { useRequestConsent, useRecordConsent } from "../api/useJournal";
import type { ResearchJournalArticle, User } from "@/types";

interface Props {
  article: ResearchJournalArticle;
  currentUserId: string;
  isLeader: boolean;
  userMap: Map<string, User>;
}

/** 저자 동의 게이트 패널. 정식 트랙 한정 표시. */
export default function JournalConsentPanel({
  article,
  currentUserId,
  isLeader,
  userMap,
}: Props) {
  const gate = evaluateConsentGate(article);
  const requestMut = useRequestConsent(article.id);
  const recordMut = useRecordConsent(article.id);
  const [rejectNote, setRejectNote] = useState("");
  const [showReject, setShowReject] = useState(false);

  if (article.publicationType !== "journal") {
    return (
      <Card>
        <CardContent className="p-4 text-sm text-muted-foreground">
          {article.publicationType === "working_paper" ? "워킹 페이퍼" : "리서치 노트"}는
          저자 동의 게이트 없이 책임연구자 자율로 출판할 수 있습니다.
        </CardContent>
      </Card>
    );
  }

  const myConsent = article.authorConsents?.[currentUserId];
  const isMeAuthor = article.authors.some((a) => a.userId === currentUserId);
  const notRequested = !article.consentRequestedAt;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Mail size={16} /> 저자 동의 게이트
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 진행률 표시 */}
        <div>
          <div className="mb-1 flex justify-between text-xs">
            <span className="font-medium">동의 진행률</span>
            <span>
              {gate.agreed}/{gate.total} 동의 · {gate.progress}%
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-success transition-all"
              style={{ width: `${gate.progress}%` }}
            />
          </div>
        </div>

        {/* 동의 게이트 사유 */}
        {gate.reason && (
          <div className="flex items-start gap-2 rounded border border-warning/20 bg-warning/5 px-3 py-2 text-xs text-warning">
            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
            <span>{gate.reason}</span>
          </div>
        )}

        {/* 저자별 동의 상태 */}
        {article.consentRequestedAt && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">저자별 응답</p>
            {article.authors.map((a) => {
              const c = article.authorConsents?.[a.userId];
              const status = c?.status ?? "pending";
              const statusColor =
                status === "agreed"
                  ? "text-success"
                  : status === "rejected"
                    ? "text-destructive"
                    : "text-muted-foreground";
              const statusLabel =
                status === "agreed" ? "✓ 동의" : status === "rejected" ? "✗ 거부" : "⋯ 대기";
              return (
                <div key={a.userId} className="flex items-center justify-between text-sm">
                  <span>
                    #{a.authorOrder} {a.displayName}
                  </span>
                  <span className={`text-xs font-medium ${statusColor}`}>{statusLabel}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* leader: 동의 요청 발송 */}
        {isLeader && notRequested && (
          <div className="space-y-2 rounded border border-cat-1/20 bg-cat-1/5 p-3">
            <p className="text-xs text-cat-1">
              모든 저자에게 동의 요청을 발송합니다. 각 저자는 저자순서·CRediT·ORCID 정보를
              확인하고 응답합니다.
            </p>
            <Button
              type="button"
              size="sm"
              onClick={() => requestMut.mutate(article.authors)}
              disabled={article.authors.length === 0 || requestMut.isPending}
            >
              <Mail size={14} className="mr-1" />
              동의 요청 발송
            </Button>
          </div>
        )}

        {/* leader: 재발송 (이미 발송된 경우) */}
        {isLeader && !notRequested && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => requestMut.mutate(article.authors)}
            disabled={requestMut.isPending}
          >
            <Mail size={14} className="mr-1" />
            동의 요청 재발송
          </Button>
        )}

        {/* 본인이 저자이면서 동의 응답 가능 */}
        {isMeAuthor && article.consentRequestedAt && myConsent?.status === "pending" && (
          <div className="space-y-2 rounded border border-success/20 bg-success/5 p-3">
            <p className="text-xs font-medium text-success">
              본인 동의 응답이 필요합니다
            </p>
            <p className="text-xs text-success">
              저자 순서·교신저자·소속·CRediT 역할·ORCID 가 정확한지 확인 후 응답하세요.
              발간 후에는 변경이 어렵습니다.
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                onClick={() =>
                  recordMut.mutate({ userId: currentUserId, agreed: true })
                }
                disabled={recordMut.isPending}
              >
                <Check size={14} className="mr-1" />
                동의
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setShowReject(!showReject)}
              >
                <X size={14} className="mr-1" />
                거부
              </Button>
            </div>
            {showReject && (
              <div className="space-y-2">
                <Textarea
                  rows={2}
                  placeholder="거부 사유 (예: 저자 순서 조정 필요)"
                  value={rejectNote}
                  onChange={(e) => setRejectNote(e.target.value)}
                />
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  onClick={() =>
                    recordMut.mutate({
                      userId: currentUserId,
                      agreed: false,
                      rejectionNote: rejectNote.trim(),
                    })
                  }
                  disabled={!rejectNote.trim() || recordMut.isPending}
                >
                  거부 확정
                </Button>
              </div>
            )}
          </div>
        )}

        {/* 본인 응답 이력 표시 */}
        {isMeAuthor && myConsent && myConsent.status !== "pending" && (
          <p className="text-xs text-muted-foreground">
            본인 응답: <strong>{myConsent.status === "agreed" ? "동의" : "거부"}</strong>
            {myConsent.agreedAt && ` (${new Date(myConsent.agreedAt).toLocaleString("ko-KR")})`}
            {myConsent.rejectionNote && ` — ${myConsent.rejectionNote}`}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
