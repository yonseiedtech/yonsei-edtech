"use client";

/**
 * 노드 클릭 → 회원 미니 모달 (major-network-map MVP)
 *
 * 그래프 컨텍스트 유지를 위해 미니 모달로 표시하고, 본격 프로필은 별도 라우트로 이동.
 */

import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NETWORK_RELATION_LABELS, ROLE_LABELS, OCCUPATION_LABELS, type NetworkEdge, type NetworkNode } from "@/types";
import { ExternalLink, Link2 } from "lucide-react";

interface MemberMiniDialogProps {
  node: NetworkNode | null;
  onClose: () => void;
  /** Sprint 67-AH: 본인과의 관계 표시용 — 전체 edges + 본인 ID */
  edges?: NetworkEdge[];
  currentUserId?: string;
}

export default function MemberMiniDialog({ node, onClose, edges, currentUserId }: MemberMiniDialogProps) {
  // Sprint 67-AH: 본인 ↔ 노드 사이의 관계 edges 찾기
  const relationEdge = node && currentUserId && edges
    ? edges.find(
        (e) =>
          (e.source === currentUserId && e.target === node.id) ||
          (e.target === currentUserId && e.source === node.id),
      )
    : null;
  const isMe = node?.id === currentUserId;
  return (
    <Dialog open={node !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        {node && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  {node.profileImage && (
                    <AvatarImage src={node.profileImage} alt={node.name} />
                  )}
                  <AvatarFallback>{node.name?.[0] ?? "?"}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col items-start gap-1">
                  <span className="text-base font-bold">{node.name}</span>
                  <div className="flex flex-wrap gap-1">
                    <Badge variant="secondary" className="text-[10px]">
                      {node.generation}기
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">
                      {ROLE_LABELS[node.role]}
                    </Badge>
                    {node.occupation && (
                      <Badge variant="outline" className="text-[10px]">
                        {OCCUPATION_LABELS[node.occupation]}
                      </Badge>
                    )}
                  </div>
                </div>
              </DialogTitle>
            </DialogHeader>

            {/* Sprint 67-AH: 본인과의 관계 표시 (본인 자신이 아닐 때) */}
            {!isMe && currentUserId && (
              <div className="mt-2 rounded-md border border-blue-200 bg-blue-50/60 p-2.5 dark:border-blue-900 dark:bg-blue-950/30">
                <p className="flex items-center gap-1 text-[11px] font-semibold text-blue-900 dark:text-blue-100">
                  <Link2 size={11} /> 나와의 관계
                </p>
                {relationEdge ? (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {relationEdge.kinds.map((k) => (
                      <Badge
                        key={k}
                        variant="secondary"
                        className="bg-blue-100 text-[10px] font-medium text-blue-800 dark:bg-blue-950/50 dark:text-blue-200"
                      >
                        {NETWORK_RELATION_LABELS[k]}
                      </Badge>
                    ))}
                    {relationEdge.weight != null && (
                      <span className="ml-1 text-[10px] text-blue-700/80 dark:text-blue-300/80">
                        연결 강도 {relationEdge.weight}
                      </span>
                    )}
                  </div>
                ) : (
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    직접 연결된 관계는 없습니다 (1촌이 아님).
                  </p>
                )}
              </div>
            )}

            {node.researchInterests && node.researchInterests.length > 0 && (
              <div className="mt-2">
                <p className="text-[11px] font-semibold text-muted-foreground">
                  관심 연구 키워드
                </p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {node.researchInterests.slice(0, 6).map((kw) => (
                    <Badge key={kw} variant="secondary" className="text-[10px]">
                      {kw}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-4 flex justify-end">
              <Link href={`/profile/${node.id}`} onClick={onClose}>
                <Button size="sm" variant="outline">
                  <ExternalLink size={12} className="mr-1.5" />
                  프로필 페이지 열기
                </Button>
              </Link>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
