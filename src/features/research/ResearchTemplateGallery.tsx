"use client";

/**
 * 연구 산출물 템플릿 갤러리 (벤치마크-M4)
 *
 * "빈 페이지 공포"를 없애는 복제형 시작 틀. 트리거 버튼 → 다이얼로그에 4종 카드.
 * "이 템플릿으로 시작"을 누르면 해당 틀을 개인 메모(user_notes, category="research")로
 * 복제한 뒤 노트 편집기로 이동한다 — 계획서·집필 에디터 코어를 건드리지 않는 최저비용 1경로.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  LayoutTemplate,
  ClipboardList,
  ListChecks,
  ShieldCheck,
  Presentation,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { userNotesApi } from "@/lib/bkend";
import {
  RESEARCH_TEMPLATES,
  type ResearchTemplate,
  type ResearchTemplateIcon,
} from "@/lib/research-templates";

const ICONS: Record<ResearchTemplateIcon, typeof ClipboardList> = {
  proposal: ClipboardList,
  survey: ListChecks,
  ethics: ShieldCheck,
  presentation: Presentation,
};

interface Props {
  userId: string;
}

export default function ResearchTemplateGallery({ userId }: Props) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function handleStart(tpl: ResearchTemplate) {
    if (busyId) return;
    setBusyId(tpl.id);
    try {
      const note = await userNotesApi.create({
        userId,
        category: "research",
        title: tpl.noteTitle,
        body: tpl.body,
        tags: tpl.tags,
      });
      await queryClient.invalidateQueries({ queryKey: ["user-notes", userId] });
      toast.success("템플릿으로 새 메모를 만들었어요. 이어서 작성하세요.");
      setOpen(false);
      router.push(`/mypage/notes/${note.id}`);
    } catch {
      toast.error("템플릿 생성에 실패했습니다.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm">
            <LayoutTemplate size={15} className="mr-1.5" />
            템플릿으로 시작
          </Button>
        }
      />
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>연구 산출물 템플릿</DialogTitle>
          <DialogDescription>
            표준 구조가 미리 채워진 틀을 복제해 바로 시작하세요. 선택하면 개인 메모(연구)로
            생성되어 자유롭게 편집할 수 있습니다.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-2">
          {RESEARCH_TEMPLATES.map((tpl) => {
            const Icon = ICONS[tpl.icon];
            const busy = busyId === tpl.id;
            return (
              <div
                key={tpl.id}
                className="flex flex-col rounded-xl border bg-card p-4 transition-colors hover:border-primary/40"
              >
                <div className="mb-2 flex items-center gap-2">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon size={18} />
                  </span>
                  <h4 className="text-sm font-semibold text-foreground">
                    {tpl.title}
                  </h4>
                </div>
                <p className="mb-2 text-xs text-muted-foreground">
                  {tpl.description}
                </p>
                <Badge variant="secondary" className="mb-3 w-fit text-[10px] font-normal">
                  {tpl.meta}
                </Badge>
                <Button
                  size="sm"
                  className="mt-auto w-full"
                  onClick={() => handleStart(tpl)}
                  disabled={!!busyId}
                >
                  {busy ? (
                    <>
                      <Loader2 size={14} className="mr-1.5 animate-spin" />
                      생성 중…
                    </>
                  ) : (
                    <>
                      이 템플릿으로 시작
                      <ArrowRight size={14} className="ml-1.5" />
                    </>
                  )}
                </Button>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
