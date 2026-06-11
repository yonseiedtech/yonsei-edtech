"use client";

/**
 * 발표 Q&A 보드 (실험실, 2026-06-11) — Padlet 스타일 수업용 질의응답 월
 *
 * 수업 시간에 발표자마다 보드를 열고, 공유 링크(또는 발표 화면 QR)로 참여자를
 * 모아 실시간 질의응답을 주고받는다.
 *  - 보드 생성: 운영진(staff 이상) 전용 — 게스트(비로그인)·익명 참여가 기본 ON
 *  - 공유: 링크 복사 → 수업 채팅방에 붙여넣기. 비로그인 사용자도 바로 질문/답변 가능
 *  - 발표 화면: /boards/[id]/present — 전체화면 + QR + 5초 자동 갱신
 *
 * 기반: 소통 보드(comm_boards) 재사용 — contextType "class", contextId "qa-wall".
 */

import { useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  MessageCircleQuestion,
  Plus,
  Lock,
  Link as LinkIcon,
  Monitor,
  Loader2,
  Presentation,
  QrCode,
  UserCheck,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import PageHeader from "@/components/ui/page-header";
import PageContainer from "@/components/ui/page-container";
import EmptyState from "@/components/ui/empty-state";
import { useAuthStore } from "@/features/auth/auth-store";
import { isAtLeast } from "@/lib/permissions";
import { commBoardsApi } from "@/lib/bkend";
import type { CommBoard } from "@/types";

const CONTEXT_TYPE = "class" as const;
const CONTEXT_ID = "qa-wall";

export default function QaWallPage() {
  const { user } = useAuthStore();
  const isStaff = isAtLeast(user, "staff");
  const queryClient = useQueryClient();
  const queryKey = ["comm-boards", CONTEXT_TYPE, CONTEXT_ID, ""];

  const { data: boards = [], isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const res = await commBoardsApi.listByContext(CONTEXT_TYPE, CONTEXT_ID);
      return (res.data as CommBoard[]).sort((a, b) =>
        (b.createdAt ?? "").localeCompare(a.createdAt ?? ""),
      );
    },
  });

  // 생성 폼 (운영진)
  const [formOpen, setFormOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [presentersText, setPresentersText] = useState("");
  const [creating, setCreating] = useState(false);

  async function handleCreate() {
    if (!user || !isStaff) return;
    if (!title.trim()) {
      toast.error("보드 제목을 입력하세요.");
      return;
    }
    setCreating(true);
    try {
      // 발표자: 줄바꿈 또는 쉼표 구분 → 질문이 발표자별로 그룹핑됨
      const presenters = presentersText
        .split(/[\n,]/)
        .map((p) => p.trim())
        .filter(Boolean);
      const created = (await commBoardsApi.create({
        contextType: CONTEXT_TYPE,
        contextId: CONTEXT_ID,
        title: title.trim(),
        description: description.trim() || undefined,
        presenters: presenters.length > 0 ? presenters : undefined,
        ownerId: user.id,
        ownerName: user.name,
        // 수업용 기본값: 비로그인·익명 참여 허용
        allowGuest: true,
        allowAnonymous: true,
        status: "open",
        defaultSort: "recent",
      })) as CommBoard;
      setTitle("");
      setDescription("");
      setPresentersText("");
      setFormOpen(false);
      await queryClient.invalidateQueries({ queryKey });
      // 생성 직후 공유 링크 자동 복사
      const url = `${window.location.origin}/boards/${created.id}/wall`;
      try {
        await navigator.clipboard.writeText(url);
        toast.success("보드가 생성되고 공유 링크가 복사되었습니다. 수업 채팅방에 붙여넣으세요!");
      } catch {
        toast.success("보드가 생성되었습니다. 카드의 '링크 복사'로 공유하세요.");
      }
    } catch {
      toast.error("보드 생성에 실패했습니다.");
    } finally {
      setCreating(false);
    }
  }

  function copyLink(b: CommBoard) {
    const url = `${window.location.origin}/boards/${b.id}/wall`;
    void navigator.clipboard
      .writeText(url)
      .then(() => toast.success("공유 링크가 복사되었습니다."))
      .catch(() => toast.error("복사에 실패했습니다."));
  }

  return (
    <PageContainer width="default">
      <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 py-8 sm:py-14">
        <PageHeader
          icon={Presentation}
          title="발표 Q&A 보드"
          description="수업 발표마다 보드를 열고, 링크 하나로 질의응답을 모으세요. 로그인 없이도 참여할 수 있습니다."
        />

        <Separator className="mt-6" />

        {/* ── 사용법 안내 ── */}
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {[
            { icon: Plus, title: "1. 보드 열기", desc: "운영진이 발표(발표자)별로 보드를 만듭니다." },
            { icon: LinkIcon, title: "2. 링크 공유", desc: "복사된 링크를 수업 채팅방에 붙여넣거나, 발표 화면의 QR을 띄웁니다." },
            { icon: UserCheck, title: "3. 자유 참여", desc: "수강생은 로그인 없이 질문·답변·좋아요로 참여합니다." },
          ].map((s) => (
            <div key={s.title} className="rounded-2xl border bg-card p-4">
              <s.icon size={16} className="text-primary" />
              <p className="mt-1.5 text-sm font-semibold">{s.title}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{s.desc}</p>
            </div>
          ))}
        </div>

        {/* ── 보드 생성 (운영진) ── */}
        {isStaff && (
          <div className="mt-6">
            {!formOpen ? (
              <Button onClick={() => setFormOpen(true)} className="gap-1.5">
                <Plus size={15} />
                발표 보드 만들기
              </Button>
            ) : (
              <div className="rounded-2xl border-2 border-primary/20 bg-card p-4">
                <p className="text-sm font-bold">새 발표 보드</p>
                <div className="mt-3 space-y-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">
                      보드 제목
                    </label>
                    <Input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder='예: "교육공학 세미나 3주차 — 김연세 발표: AI 튜터링"'
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">
                      안내 문구 (선택)
                    </label>
                    <Textarea
                      rows={2}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="예: 발표 들으며 궁금한 점을 자유롭게 남겨주세요. 익명 가능!"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">
                      발표자 (선택 — 한 줄에 한 명 또는 쉼표 구분)
                    </label>
                    <Textarea
                      rows={3}
                      value={presentersText}
                      onChange={(e) => setPresentersText(e.target.value)}
                      placeholder={"김연세\n이공학\n박교육"}
                    />
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      발표자를 등록하면 보드가 발표자별 섹션으로 그룹핑되고, 질문 작성 시 발표자를 선택할 수 있습니다.
                    </p>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    수업용 기본 설정: 게스트(비로그인) 참여 허용 · 익명 작성 허용 — 생성 후 보드에서 변경할 수 있습니다.
                  </p>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => setFormOpen(false)}>
                      취소
                    </Button>
                    <Button size="sm" onClick={handleCreate} disabled={creating}>
                      {creating && <Loader2 size={13} className="mr-1 animate-spin" />}
                      만들고 링크 복사
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── 보드 목록 ── */}
        <div className="mt-6">
          <h2 className="flex items-center gap-1.5 text-sm font-bold">
            <MessageCircleQuestion size={15} className="text-primary" />
            발표 보드 ({boards.length})
          </h2>
          {isLoading ? (
            <div className="mt-3 space-y-2">
              <Skeleton className="h-20 w-full rounded-2xl" />
              <Skeleton className="h-20 w-full rounded-2xl" />
            </div>
          ) : boards.length === 0 ? (
            <div className="mt-3">
              <EmptyState
                icon={Presentation}
                title="아직 열린 발표 보드가 없습니다"
                description={
                  isStaff
                    ? "'발표 보드 만들기'로 첫 보드를 열고 링크를 공유해보세요."
                    : "수업 중 공유받은 링크로 입장하면 로그인 없이 참여할 수 있습니다."
                }
              />
            </div>
          ) : (
            <ul className="mt-3 space-y-2">
              {boards.map((b) => (
                <li
                  key={b.id}
                  className={cn(
                    "rounded-2xl border bg-card p-4 transition-shadow hover:shadow-sm",
                    b.status === "closed" && "opacity-70",
                  )}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-1.5 text-sm font-semibold">
                        {b.status === "closed" && (
                          <Lock size={13} className="shrink-0 text-muted-foreground" />
                        )}
                        <span className="truncate">{b.title}</span>
                      </p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        {b.ownerName}
                        {b.description ? ` · ${b.description}` : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 gap-1 text-xs"
                        onClick={() => copyLink(b)}
                      >
                        <LinkIcon size={12} />
                        링크 복사
                      </Button>
                      <Link href={`/boards/${b.id}/present`}>
                        <Button variant="outline" size="sm" className="h-8 gap-1 text-xs">
                          <QrCode size={12} />
                          발표 화면
                        </Button>
                      </Link>
                      <Link href={`/boards/${b.id}/wall`}>
                        <Button size="sm" className="h-8 gap-1 text-xs">
                          <Monitor size={12} />
                          입장
                        </Button>
                      </Link>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </PageContainer>
  );
}
