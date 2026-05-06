"use client";

/**
 * WidgetCard — 대시보드 위젯 표준 래퍼 (dashboard-quickwins Sprint 67)
 *
 * 목적:
 *  - 11개 대시보드 위젯에 흩어진 `rounded-2xl border bg-card p-6` + `<Icon><h2>` 패턴을 단일 컴포넌트로 수렴.
 *  - 시맨틱 토큰(SEMANTIC) 연동으로 라이트/다크 모드 일괄 처리.
 *  - 위젯 내부 본문(children)에는 영향 없이 외형만 통일.
 *
 * 분석 근거: docs/03-analysis/dashboard-uiux-synthesis.md §1 C1, §3 통합 매트릭스 ★G
 */

import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  SEMANTIC,
  WIDGET_PADDING,
  SECTION_ICON_SIZE,
  type SemanticTone,
} from "@/lib/design-tokens";

/**
 * 위젯 시각 위계 (dashboard-persona-redesign Sprint 2 / F2):
 *  - primary: 핵심 위젯 (NextActionBanner·AcademicCalendar·MyTodos) — shadow + 강한 헤더
 *  - secondary: 일반 위젯 (기본값)
 *  - tertiary: 보조 위젯 — 약한 톤 + 압축 padding
 */
export type WidgetPriority = "primary" | "secondary" | "tertiary";

interface WidgetCardProps {
  /** 섹션 헤더 텍스트. 미지정 시 헤더 영역 자체를 그리지 않음. ReactNode 허용 (예: 동적 라벨 + 칩) */
  title?: React.ReactNode;
  /** 섹션 헤더 좌측 아이콘 */
  icon?: LucideIcon;
  /** 헤더 우측 슬롯 (전체 보기 링크, 액션 버튼 등) */
  actions?: React.ReactNode;
  /** 시맨틱 색상 — default(중성) / info / warning / danger / success */
  semantic?: SemanticTone;
  /** 시각 위계 — primary(핵심) / secondary(일반) / tertiary(보조) */
  priority?: WidgetPriority;
  /** 카드 내부 컨텐츠 */
  children: React.ReactNode;
  /** 추가 클래스명 (외부 padding/gap 보정 용) */
  className?: string;
  /** 헤더 아이콘 사이즈 — 기본 18 */
  iconSize?: number;
}

const PRIORITY_STYLES: Record<WidgetPriority, { card: string; title: string }> = {
  primary: {
    card: "shadow-sm",
    title: "text-lg sm:text-xl",
  },
  secondary: {
    card: "",
    title: "",
  },
  tertiary: {
    card: "",
    title: "text-sm",
  },
};

const PRIORITY_PADDING: Record<WidgetPriority, string> = {
  primary: WIDGET_PADDING,
  secondary: WIDGET_PADDING,
  tertiary: "p-4 sm:p-5",
};

export default function WidgetCard({
  title,
  icon: Icon,
  actions,
  semantic = "default",
  priority = "secondary",
  children,
  className,
  iconSize = SECTION_ICON_SIZE,
}: WidgetCardProps) {
  const tone = SEMANTIC[semantic];
  const isDefault = semantic === "default";
  const priorityStyle = PRIORITY_STYLES[priority];

  return (
    <div
      className={cn(
        "rounded-2xl border",
        PRIORITY_PADDING[priority],
        tone.bg,
        tone.border,
        priorityStyle.card,
        className,
      )}
    >
      {(title || actions) && (
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {Icon && (
              <Icon
                size={iconSize}
                className={cn("shrink-0", isDefault ? "text-primary" : tone.accent)}
                aria-hidden="true"
              />
            )}
            {title && (
              <h2
                className={cn(
                  "font-bold truncate",
                  isDefault ? "text-foreground" : tone.text,
                  priorityStyle.title,
                )}
              >
                {title}
              </h2>
            )}
          </div>
          {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
        </div>
      )}
      {children}
    </div>
  );
}
