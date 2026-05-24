"use client";
/**
 * EditModePresetBar — 대시보드 인라인 편집 모드 전용 sticky 바.
 *
 * 편집 모드 ON 시 헤더 아래 sticky 로 표시:
 *  - 좌측: 안내 텍스트 "드래그로 순서 변경 · 토글로 표시"
 *  - 중앙: 5개 프리셋 chip (클릭 → AlertDialog confirm → 적용)
 *  - 우측: "기본 순서" 리셋 버튼 + "완료" 버튼
 *
 * 모바일: 가로 스크롤 단일 행으로 표시.
 */
import { useState } from "react";
import { Check, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import {
  DASHBOARD_PRESETS_META,
  buildPresetLayout,
  type DashboardPresetId,
} from "@/lib/dashboard-presets";
import { saveLayoutWithSync } from "@/lib/dashboard-layout";
import { cn } from "@/lib/utils";

interface EditModePresetBarProps {
  userId: string;
  onComplete: () => void;
}

const PRESET_IDS: DashboardPresetId[] = [
  "default",
  "student",
  "staff",
  "research",
  "minimal",
];

export default function EditModePresetBar({
  userId,
  onComplete,
}: EditModePresetBarProps) {
  const [pendingPreset, setPendingPreset] = useState<DashboardPresetId | null>(
    null,
  );
  const [resetDialogOpen, setResetDialogOpen] = useState(false);

  async function applyPreset(id: DashboardPresetId) {
    const layout = buildPresetLayout(id);
    await saveLayoutWithSync(userId, layout);
    setPendingPreset(null);
    const { toast } = await import("sonner");
    const meta = DASHBOARD_PRESETS_META[id];
    toast.success(`"${meta.label}" 프리셋이 적용되었습니다.`);
  }

  async function applyReset() {
    await applyPreset("default");
    setResetDialogOpen(false);
  }

  async function handleComplete() {
    onComplete();
    const { toast } = await import("sonner");
    toast.success("변경이 저장되었습니다.");
  }

  return (
    <div className="sticky top-14 z-30 w-full border-b bg-background/95 backdrop-blur-sm">
      {/* 모바일: 세로 2줄 / 데스크톱: 단일 가로 행 */}
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-2 sm:flex-row sm:items-center sm:gap-3">
        {/* 안내 텍스트 */}
        <p className="shrink-0 text-xs text-muted-foreground">
          드래그로 순서 변경 · 토글로 표시
        </p>

        {/* 프리셋 chip 목록 — 모바일 가로 스크롤 */}
        <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto pb-0.5 sm:pb-0">
          {PRESET_IDS.map((id) => {
            const meta = DASHBOARD_PRESETS_META[id];
            return (
              <AlertDialog
                key={id}
                open={pendingPreset === id}
                onOpenChange={(open) => {
                  if (!open) setPendingPreset(null);
                }}
              >
                <button
                  type="button"
                  onClick={() => setPendingPreset(id)}
                  className={cn(
                    "inline-flex shrink-0 items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                    "hover:bg-primary/10 hover:border-primary/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    "bg-card border-border",
                  )}
                >
                  <span>{meta.icon}</span>
                  <span>{meta.label}</span>
                </button>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      {meta.icon} {meta.label} 프리셋 적용
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      {meta.description}
                      <br />
                      현재 위젯 순서와 표시 설정이 프리셋으로 교체됩니다.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>취소</AlertDialogCancel>
                    <AlertDialogAction onClick={() => void applyPreset(id)}>
                      적용
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            );
          })}
        </div>

        {/* 우측 액션 버튼 */}
        <div className="flex shrink-0 items-center gap-2">
          {/* 기본 순서 리셋 */}
          <AlertDialog
            open={resetDialogOpen}
            onOpenChange={setResetDialogOpen}
          >
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 text-xs"
              onClick={() => setResetDialogOpen(true)}
            >
              <RotateCcw size={13} />
              기본 순서
            </Button>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>기본 순서로 초기화</AlertDialogTitle>
                <AlertDialogDescription>
                  모든 위젯을 기본 순서와 표시 상태로 되돌립니다.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>취소</AlertDialogCancel>
                <AlertDialogAction onClick={() => void applyReset()}>
                  초기화
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* 완료 */}
          <Button
            type="button"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={() => void handleComplete()}
          >
            <Check size={13} />
            완료
          </Button>
        </div>
      </div>
    </div>
  );
}
