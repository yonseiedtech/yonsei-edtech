"use client";
/**
 * /mypage/dashboard-settings — 대시보드 위젯 표시 설정 (D-1 가시성 + D-2 순서 변경 + D-3 알림 끄기 + D-4 프리셋).
 *
 * - 14개 위젯의 노출 여부를 체크박스로 개별 토글 (D-1).
 * - 드래그 핸들(⋮⋮) 또는 ↑↓ 화살표 버튼으로 순서 변경 (D-2).
 * - 알림 가능한 위젯에 Bell/BellOff 토글로 알림 끄기 (D-3).
 * - 프리셋 5종 빠른 전환 (D-4).
 * - 변경 즉시 localStorage 에 저장 (saveLayout).
 * - 로그인 필수 (AuthGuard).
 *
 * 옵션 B 채택: 설정 페이지 순서 UI 구현 완료.
 * dashboard/page.tsx 실제 렌더 순서 반영은 D-2b 에서 수행.
 */

import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  RefreshCw,
  CheckSquare,
  GripVertical,
  ChevronUp,
  ChevronDown,
  Bell,
  BellOff,
} from "lucide-react";
import AuthGuard from "@/features/auth/AuthGuard";
import { useAuthStore } from "@/features/auth/auth-store";
import PageHeader from "@/components/ui/page-header";
import PageContainer from "@/components/ui/page-container";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogTrigger,
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
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  DASHBOARD_WIDGET_KEYS,
  DASHBOARD_WIDGET_META,
  DEFAULT_DASHBOARD_LAYOUT,
  isNotifiableWidget,
  type DashboardLayout,
  type DashboardWidgetConfig,
  type DashboardWidgetKey,
} from "@/types/dashboard-layout";
import {
  saveLayout,
  saveLayoutWithSync,
  syncLayoutFromFirestore,
  useDashboardLayout,
  getSortedWidgets,
  reorderWidget,
  isWidgetMuted,
  setWidgetMuted,
} from "@/lib/dashboard-layout";

// ── 상수 ─────────────────────────────────────────────────────────────────────

const LS_KEY_PREFIX = "yedu_dashboard_layout";

// ── D-4 프리셋 선택 카드 ──────────────────────────────────────────────────────

const PRESET_ORDER: DashboardPresetId[] = [
  "default",
  "student",
  "staff",
  "research",
  "minimal",
];

interface PresetCardProps {
  id: DashboardPresetId;
  onConfirm: (id: DashboardPresetId) => void;
}

function PresetCard({ id, onConfirm }: PresetCardProps) {
  const [open, setOpen] = useState(false);
  const meta = DASHBOARD_PRESETS_META[id];

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger
        className="flex flex-col items-center gap-1.5 rounded-xl border bg-card p-4 text-center transition-colors hover:bg-accent/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={`${meta.label} 프리셋 적용`}
      >
        <span className="text-2xl leading-none" aria-hidden>
          {meta.icon}
        </span>
        <span className="text-sm font-medium">{meta.label}</span>
        <span className="text-xs text-muted-foreground">{meta.description}</span>
      </AlertDialogTrigger>

      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogTitle>프리셋 적용</AlertDialogTitle>
          <AlertDialogDescription>
            현재 설정을{" "}
            <span className="font-medium text-foreground">
              {meta.icon} {meta.label}
            </span>
            으로 덮어쓸까요?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>취소</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              setOpen(false);
              onConfirm(id);
            }}
          >
            적용
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ── 내부 헬퍼 ────────────────────────────────────────────────────────────────

function buildLayoutFromSortedConfigs(
  sorted: DashboardWidgetConfig[],
  visibilityMap: Record<DashboardWidgetKey, boolean>,
): DashboardLayout {
  return {
    schemaVersion: 1,
    updatedAt: new Date().toISOString(),
    widgets: sorted.map((cfg, idx) => ({
      key: cfg.key,
      visible: visibilityMap[cfg.key] ?? true,
      order: idx,
      mutedNotifications: cfg.mutedNotifications,
    })),
  };
}

function buildLayoutFromVisibility(
  visibilityMap: Record<DashboardWidgetKey, boolean>,
  sorted: DashboardWidgetConfig[],
): DashboardLayout {
  return {
    schemaVersion: 1,
    updatedAt: new Date().toISOString(),
    widgets: sorted.map((cfg, idx) => ({
      key: cfg.key,
      visible: visibilityMap[cfg.key] ?? true,
      order: idx,
      mutedNotifications: cfg.mutedNotifications,
    })),
  };
}

function getCurrentVisibility(
  layout: DashboardLayout | null,
): Record<DashboardWidgetKey, boolean> {
  const defaults = Object.fromEntries(
    DASHBOARD_WIDGET_KEYS.map((k) => [k, true]),
  ) as Record<DashboardWidgetKey, boolean>;
  if (!layout) return defaults;
  for (const cfg of layout.widgets) {
    defaults[cfg.key] = cfg.visible;
  }
  return defaults;
}

// ── 정렬 가능한 위젯 카드 ────────────────────────────────────────────────────

interface SortableWidgetCardProps {
  cfg: DashboardWidgetConfig;
  isFirst: boolean;
  isLast: boolean;
  isVisible: boolean;
  isMuted: boolean;
  onToggle: (key: DashboardWidgetKey, checked: boolean) => void;
  onMove: (key: DashboardWidgetKey, direction: "up" | "down") => void;
  onMuteToggle: (key: DashboardWidgetKey, muted: boolean) => void;
}

function SortableWidgetCard({
  cfg,
  isFirst,
  isLast,
  isVisible,
  isMuted,
  onToggle,
  onMove,
  onMuteToggle,
}: SortableWidgetCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: cfg.key });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  const meta = DASHBOARD_WIDGET_META[cfg.key];
  const notifiable = isNotifiableWidget(cfg.key);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-start gap-2 rounded-xl border bg-card p-4 transition-colors hover:bg-accent/50"
    >
      {/* 드래그 핸들 */}
      <button
        type="button"
        className="mt-0.5 shrink-0 cursor-grab touch-none text-muted-foreground hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing"
        aria-label={`${meta.label} 드래그하여 순서 변경`}
        {...attributes}
        {...listeners}
      >
        <GripVertical size={16} />
      </button>

      {/* 체크박스 + 텍스트 */}
      <label className="flex flex-1 cursor-pointer items-start gap-3">
        <Checkbox
          checked={isVisible}
          onCheckedChange={(checked) => onToggle(cfg.key, checked === true)}
          className="mt-0.5 shrink-0"
        />
        <div className="min-w-0">
          <p className="text-sm font-medium leading-snug">{meta.label}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {meta.description}
          </p>
        </div>
      </label>

      {/* 알림 끄기 토글 (notifiable 위젯만) */}
      {notifiable && (
        <button
          type="button"
          onClick={() => onMuteToggle(cfg.key, !isMuted)}
          className="mt-0.5 shrink-0 rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={isMuted ? `${meta.label} 알림 켜기` : `${meta.label} 알림 끄기`}
          title={isMuted ? "알림 켜기" : "알림 끄기"}
        >
          {isMuted ? <BellOff size={15} /> : <Bell size={15} />}
        </button>
      )}

      {/* 화살표 버튼 (모바일 친화 / 키보드 접근성) */}
      <div className="flex shrink-0 flex-col gap-0.5">
        <button
          type="button"
          disabled={isFirst}
          onClick={() => onMove(cfg.key, "up")}
          className="rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={`${meta.label} 위로 이동`}
        >
          <ChevronUp size={15} />
        </button>
        <button
          type="button"
          disabled={isLast}
          onClick={() => onMove(cfg.key, "down")}
          className="rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={`${meta.label} 아래로 이동`}
        >
          <ChevronDown size={15} />
        </button>
      </div>
    </div>
  );
}

// ── 설정 뷰 (로그인 후) ──────────────────────────────────────────────────────

function DashboardSettingsContent() {
  const { user } = useAuthStore();
  const layout = useDashboardLayout(user?.id);

  // D-5: 마운트 시 Firestore → localStorage 동기화 (최신 우선)
  useEffect(() => {
    if (user?.id) {
      syncLayoutFromFirestore(user.id).catch(() => {
        // silent — sync 실패가 UI 를 막지 않음
      });
    }
  }, [user?.id]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  if (!user) return null;

  const visibility = getCurrentVisibility(layout);
  const sorted = getSortedWidgets(layout);

  async function handleToggle(key: DashboardWidgetKey, checked: boolean) {
    const next = { ...visibility, [key]: checked };
    await saveLayoutWithSync(user!.id, buildLayoutFromVisibility(next, sorted));
    const { toast } = await import("sonner");
    toast.success("저장됨");
  }

  async function handleMove(key: DashboardWidgetKey, direction: "up" | "down") {
    const next = reorderWidget(layout, key, direction);
    await saveLayoutWithSync(user!.id, next);
    const { toast } = await import("sonner");
    toast.success(direction === "up" ? "위로 이동" : "아래로 이동");
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIdx = sorted.findIndex((w) => w.key === active.id);
    const newIdx = sorted.findIndex((w) => w.key === over.id);
    if (oldIdx === -1 || newIdx === -1) return;

    const reordered = arrayMove(sorted, oldIdx, newIdx);
    await saveLayoutWithSync(user!.id, buildLayoutFromSortedConfigs(reordered, visibility));
    const { toast } = await import("sonner");
    toast.success("순서가 변경됐습니다.");
  }

  async function handleMuteToggle(key: DashboardWidgetKey, muted: boolean) {
    const next = setWidgetMuted(layout, key, muted);
    await saveLayoutWithSync(user!.id, next);
    const { toast } = await import("sonner");
    toast.info(muted ? "알림 끔" : "알림 켬");
  }

  async function handleEnableAll() {
    const all = Object.fromEntries(
      DASHBOARD_WIDGET_KEYS.map((k) => [k, true]),
    ) as Record<DashboardWidgetKey, boolean>;
    await saveLayoutWithSync(user!.id, buildLayoutFromVisibility(all, sorted));
    const { toast } = await import("sonner");
    toast.success("모든 위젯을 켰습니다.");
  }

  async function handleApplyPreset(id: DashboardPresetId) {
    const presetLayout = buildPresetLayout(id);
    await saveLayoutWithSync(user!.id, presetLayout);
    const { toast } = await import("sonner");
    const meta = DASHBOARD_PRESETS_META[id];
    toast.success(`${meta.label} 프리셋 적용됨`);
  }

  async function handleReset() {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(`${LS_KEY_PREFIX}.${user!.id}`);
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: `${LS_KEY_PREFIX}.${user!.id}`,
        }),
      );
    }
    const { toast } = await import("sonner");
    toast.success("기본값으로 복원했습니다.");
  }

  async function handleResetOrder() {
    const next: DashboardLayout = {
      schemaVersion: 1,
      updatedAt: new Date().toISOString(),
      widgets: DEFAULT_DASHBOARD_LAYOUT.widgets.map((w) => ({
        ...w,
        visible: visibility[w.key] ?? true,
        mutedNotifications: layout?.widgets.find((lw) => lw.key === w.key)
          ?.mutedNotifications,
      })),
    };
    saveLayout(user!.id, next);
    const { toast } = await import("sonner");
    toast.success("순서를 기본값으로 복원했습니다.");
  }

  return (
    <PageContainer width="default">
      <PageHeader
        icon={LayoutDashboard}
        title="대시보드 설정"
        description="대시보드에 표시할 위젯을 선택하고 순서를 조정합니다."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={handleEnableAll}>
              <CheckSquare size={15} className="mr-1.5" />
              모두 켜기
            </Button>
            <Button variant="outline" size="sm" onClick={handleResetOrder}>
              <RefreshCw size={15} className="mr-1.5" />
              순서 초기화
            </Button>
            <Button variant="outline" size="sm" onClick={handleReset}>
              <RefreshCw size={15} className="mr-1.5" />
              기본값으로 복원
            </Button>
          </div>
        }
      />

      {/* D-4 프리셋 섹션 */}
      <section className="mt-6">
        <h2 className="mb-3 text-sm font-semibold">빠른 프리셋</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {PRESET_ORDER.map((id) => (
            <PresetCard key={id} id={id} onConfirm={handleApplyPreset} />
          ))}
        </div>
      </section>

      {/* D-2b 안내 배너 */}
      <p className="mt-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5 text-xs text-blue-700">
        위젯 순서 설정이 저장됩니다.{" "}
        <span className="font-medium">
          대시보드 화면 반영은 다음 업데이트(D-2b)에서 활성화 예정
        </span>
        입니다.
      </p>

      {/* D-3 알림 끄기 안내 배너 */}
      <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-700">
        <Bell size={12} className="mr-1 inline-block" />
        <span className="font-medium">알림 끄기</span> 옵션은 알림을 가진 위젯에만 표시됩니다.
        실제 위젯 내부 적용은 다음 업데이트(D-3b)에서 점진 적용됩니다.
      </p>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={sorted.map((w) => w.key)}
          strategy={verticalListSortingStrategy}
        >
          <div className="mt-6 flex flex-col gap-3">
            {sorted.map((cfg, idx) => (
              <SortableWidgetCard
                key={cfg.key}
                cfg={cfg}
                isFirst={idx === 0}
                isLast={idx === sorted.length - 1}
                isVisible={visibility[cfg.key]}
                isMuted={isWidgetMuted(layout, cfg.key)}
                onToggle={handleToggle}
                onMove={handleMove}
                onMuteToggle={handleMuteToggle}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </PageContainer>
  );
}

// ── 페이지 ────────────────────────────────────────────────────────────────────

export default function DashboardSettingsPage() {
  return (
    <AuthGuard>
      <DashboardSettingsContent />
    </AuthGuard>
  );
}
