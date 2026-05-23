"use client";
/**
 * /mypage/dashboard-settings — 대시보드 위젯 표시 설정.
 *
 * 14개 위젯의 노출 여부를 체크박스로 개별 토글.
 * 변경 즉시 localStorage 에 저장 (saveLayout).
 * 로그인 필수 (AuthGuard).
 */

import { LayoutDashboard, RefreshCw, CheckSquare } from "lucide-react";
import AuthGuard from "@/features/auth/AuthGuard";
import { useAuthStore } from "@/features/auth/auth-store";
import PageHeader from "@/components/ui/page-header";
import PageContainer from "@/components/layout/PageContainer";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  DASHBOARD_WIDGET_KEYS,
  DASHBOARD_WIDGET_META,
  type DashboardLayout,
  type DashboardWidgetKey,
} from "@/types/dashboard-layout";
import { saveLayout, useDashboardLayout } from "@/lib/dashboard-layout";

// ── 상수 ─────────────────────────────────────────────────────────────────────

const LS_KEY_PREFIX = "yedu_dashboard_layout";

// ── 내부 헬퍼 ────────────────────────────────────────────────────────────────

function buildLayout(
  visibilityMap: Record<DashboardWidgetKey, boolean>,
): DashboardLayout {
  return {
    schemaVersion: 1,
    updatedAt: new Date().toISOString(),
    widgets: DASHBOARD_WIDGET_KEYS.map((key) => ({
      key,
      visible: visibilityMap[key] ?? true,
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

// ── 설정 뷰 (로그인 후) ──────────────────────────────────────────────────────

function DashboardSettingsContent() {
  const { user } = useAuthStore();
  const layout = useDashboardLayout(user?.id);

  if (!user) return null;

  const visibility = getCurrentVisibility(layout);

  async function handleToggle(key: DashboardWidgetKey, checked: boolean) {
    const next = { ...visibility, [key]: checked };
    saveLayout(user!.id, buildLayout(next));
    const { toast } = await import("sonner");
    toast.success("저장됨");
  }

  async function handleEnableAll() {
    const all = Object.fromEntries(
      DASHBOARD_WIDGET_KEYS.map((k) => [k, true]),
    ) as Record<DashboardWidgetKey, boolean>;
    saveLayout(user!.id, buildLayout(all));
    const { toast } = await import("sonner");
    toast.success("모든 위젯을 켰습니다.");
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

  return (
    <PageContainer variant="default" py="md">
      <PageHeader
        icon={LayoutDashboard}
        title="대시보드 설정"
        description="대시보드에 표시할 위젯을 선택합니다."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleEnableAll}>
              <CheckSquare size={15} className="mr-1.5" />
              모두 켜기
            </Button>
            <Button variant="outline" size="sm" onClick={handleReset}>
              <RefreshCw size={15} className="mr-1.5" />
              기본값으로 복원
            </Button>
          </div>
        }
      />

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {DASHBOARD_WIDGET_KEYS.map((key) => {
          const meta = DASHBOARD_WIDGET_META[key];
          const isVisible = visibility[key];
          return (
            <label
              key={key}
              className="flex cursor-pointer items-start gap-3 rounded-xl border bg-card p-4 transition-colors hover:bg-accent/50"
            >
              <Checkbox
                checked={isVisible}
                onCheckedChange={(checked) =>
                  handleToggle(key, checked === true)
                }
                className="mt-0.5 shrink-0"
              />
              <div className="min-w-0">
                <p className="text-sm font-medium leading-snug">{meta.label}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {meta.description}
                </p>
              </div>
            </label>
          );
        })}
      </div>
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
