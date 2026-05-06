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
import { ROLE_LABELS, OCCUPATION_LABELS, type NetworkNode } from "@/types";
import { ExternalLink } from "lucide-react";

interface MemberMiniDialogProps {
  node: NetworkNode | null;
  onClose: () => void;
}

export default function MemberMiniDialog({ node, onClose }: MemberMiniDialogProps) {
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
