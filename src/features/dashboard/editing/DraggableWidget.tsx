"use client";
/**
 * DraggableWidget — 대시보드 인라인 편집 모드 전용 wrapper.
 *
 * 편집 모드 OFF: children 을 투명하게 그대로 렌더 (기존 동작 100% 보존).
 * 편집 모드 ON:
 *  - @dnd-kit/sortable 의 useSortable 로 드래그 가능.
 *  - 좌상단: GripVertical 핸들 + 위젯 라벨 (위젯 카드 위에 부유).
 *  - 우상단: visible 토글 (button[role=switch]).
 *  - dashed 외곽선으로 카드 강조 (children 의 mx-auto/max-w-6xl/px-4 spacing 보존).
 *  - visible=false 인 경우 children 을 흐리게(opacity-30 + pointer-events-none) 처리.
 *
 * children 은 자체적으로 `<section className="mx-auto mt-6 max-w-6xl px-4">` 래퍼를
 * 포함하므로 DraggableWidget 은 추가 spacing 을 더하지 않고 relative 컨테이너만 제공.
 *
 * 인라인 토글은 Switch 컴포넌트가 없으므로 button[role=switch] 로 구현
 * (라이브러리 추가 회피, 키보드/스크린리더 접근성 유지).
 */
import type { ReactNode } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import {
  DASHBOARD_WIDGET_META,
  type DashboardWidgetKey,
} from "@/types/dashboard-layout";
import { cn } from "@/lib/utils";

interface DraggableWidgetProps {
  widgetKey: DashboardWidgetKey;
  editMode: boolean;
  visible: boolean;
  onToggle: (visible: boolean) => void;
  children: ReactNode;
}

export default function DraggableWidget({
  widgetKey,
  editMode,
  visible,
  onToggle,
  children,
}: DraggableWidgetProps) {
  // useSortable 은 hook 이라 조건부로 호출할 수 없음 → editMode OFF 일 때도 호출하되
  // disabled=true 로 드래그 비활성화.
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: widgetKey, disabled: !editMode });

  // 편집 모드 OFF: children 그대로 (오버레이/wrapper 없음)
  if (!editMode) {
    return <>{children}</>;
  }

  const meta = DASHBOARD_WIDGET_META[widgetKey];
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 20 : undefined,
    // 드래그 중 scale 효과 (transform 에 추가)
    ...(isDragging && {
      transform: `${CSS.Transform.toString(transform) ?? ""} scale(1.02)`,
      boxShadow: "0 8px 32px 0 rgba(0,0,0,0.18)",
    }),
  };

  return (
    <div ref={setNodeRef} style={style} className="relative">
      {/* 외곽선 오버레이 — 편집 모드 명시적 강조 (solid primary/60).
       *   pointer-events-none 으로 본문 인터랙션 방해 안 함.
       */}
      <div
        className={cn(
          "pointer-events-none absolute inset-x-4 inset-y-2 z-[1] rounded-2xl border-2 transition-colors",
          isDragging
            ? "border-primary bg-primary/[0.04]"
            : "border-dashed border-primary/50 bg-primary/[0.02]",
        )}
      />

      {/* 좌상단: 드래그 핸들 + 라벨 */}
      <div className="absolute left-8 top-0 z-10 flex items-center gap-2">
        <div className="flex items-center gap-2 rounded-md border bg-card px-2 py-1 shadow-sm">
          {/* 모바일 터치 영역 확보: min-w/h 44px */}
          <button
            type="button"
            className="flex min-h-[44px] min-w-[44px] cursor-grab touch-none items-center justify-center text-muted-foreground hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing sm:min-h-0 sm:min-w-0"
            aria-label={`${meta.label} 드래그하여 순서 변경`}
            title="길게 눌러 드래그"
            {...attributes}
            {...listeners}
          >
            <GripVertical size={14} />
          </button>
          <span className="text-xs font-medium">{meta.label}</span>
        </div>
      </div>

      {/* 우상단: visible 토글 (Switch 역할) + 라벨 */}
      <div className="absolute right-8 top-0 z-10 flex items-center gap-1.5">
        <span className="text-[10px] font-medium text-muted-foreground">
          {visible ? "표시" : "숨김"}
        </span>
        {/* 모바일 터치 영역 확보: min-w/h 44px */}
        <button
          type="button"
          role="switch"
          aria-checked={visible}
          aria-label={`${meta.label} ${visible ? "숨기기" : "표시"}`}
          onClick={() => onToggle(!visible)}
          className={cn(
            "relative inline-flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:min-h-0 sm:min-w-0",
          )}
        >
          <span
            className={cn(
              "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border shadow-sm transition-colors",
              visible ? "bg-primary border-primary" : "bg-muted border-input",
            )}
          >
            <span
              className={cn(
                "inline-block h-3.5 w-3.5 transform rounded-full bg-card shadow transition-transform",
                visible ? "translate-x-[18px]" : "translate-x-[2px]",
              )}
            />
          </span>
        </button>
      </div>

      {/* 위젯 본문 — visible=false 면 흐리게 + 인터랙션 차단 */}
      <div className={cn("relative z-[2]", !visible && "pointer-events-none opacity-30")}>
        {children}
      </div>
    </div>
  );
}
