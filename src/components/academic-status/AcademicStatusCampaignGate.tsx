"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { GraduationCap, X } from "lucide-react";
import { useAuthStore } from "@/features/auth/auth-store";
import { Button } from "@/components/ui/button";
import { useAcademicStatusCampaign } from "@/features/site-settings/useAcademicStatusCampaign";
import {
  ACADEMIC_STATUS_COPY,
  ACADEMIC_STATUS_PATH,
  compareSemesterKeyDesc,
  getStatusForSemester,
  isCampaignLive,
} from "@/lib/academic-status";
import type { AcademicStatusEntry } from "@/types";
import {
  canShowNotification,
  publishActiveModal,
  releaseActiveModal,
  subscribeActiveModalChange,
} from "@/features/dashboard/notification-orchestrator";

const SKIP_PATHS = ["/login", "/signup", "/reset-password", "/change-password", "/consent"];
const DISMISS_PREFIX = "academic-status-campaign-dismissed-";

/**
 * 학사정보 최신화 캠페인 팝업 게이트.
 * - 캠페인 활성 기간 중 로그인 회원에게 1회 노출.
 * - 이미 대상 학기 상태를 갱신했거나(이력 존재) 세션 내 닫음 시 미노출.
 * - NotificationOrchestrator modal slot(priority 2) 을 점유해 다른 팝업과 동시 노출 방지.
 */
export default function AcademicStatusCampaignGate() {
  const user = useAuthStore((s) => s.user);
  const initialized = useAuthStore((s) => s.initialized);
  const { campaign } = useAcademicStatusCampaign();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // B-3: 개강 D-14~D+14 윈도는 수동 설정 없어도 자동 활성 폴백 (수동 설정이 있으면 수동 우선)
  const autoLive = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const candidates = [
      new Date(`${y}-03-01`),
      new Date(`${y}-09-01`),
      new Date(`${y + 1}-03-01`),
    ];
    return candidates.some((d) => {
      const diff = Math.round((d.getTime() - now.getTime()) / 86400000);
      return diff >= -14 && diff <= 14;
    });
  }, []);

  const live = isCampaignLive(campaign) || autoLive;
  const targetSemester = campaign.targetSemester;
  const dismissKey = DISMISS_PREFIX + targetSemester;

  const alreadyUpdated = useMemo(() => {
    const history = (user?.academicStatusHistory as AcademicStatusEntry[] | undefined) ?? undefined;
    return !!getStatusForSemester(history, targetSemester);
  }, [user, targetSemester]);

  // B-3: 졸업생·alumni 는 학사정보 최신화 팝업 영구 미노출
  const isGraduatedOrAlumni = useMemo(() => {
    if (!user) return false;
    const u = user as { role?: string; academicStatusHistory?: AcademicStatusEntry[] };
    if (u.role === "alumni") return true;
    const history = u.academicStatusHistory ?? [];
    if (history.length === 0) return false;
    const sorted = [...history].sort((a, b) => compareSemesterKeyDesc(a.semester, b.semester));
    return sorted[0]?.status === "graduated";
  }, [user]);

  // NotificationOrchestrator — 더 높은 우선순위 모달이 활성이면 보류
  const [modalSuppressed, setModalSuppressed] = useState(false);
  useEffect(() => {
    setModalSuppressed(!canShowNotification("academic-status"));
    return subscribeActiveModalChange(() => {
      setModalSuppressed(!canShowNotification("academic-status"));
    });
  }, []);

  useEffect(() => {
    if (!initialized || !user || !live || alreadyUpdated || isGraduatedOrAlumni) {
      setOpen(false);
      return;
    }
    if (pathname && SKIP_PATHS.some((p) => pathname.startsWith(p))) {
      setOpen(false);
      return;
    }
    if (typeof window !== "undefined" && sessionStorage.getItem(dismissKey) === "1") {
      setOpen(false);
      return;
    }
    setOpen(true);
  }, [initialized, user, live, alreadyUpdated, isGraduatedOrAlumni, pathname, dismissKey]);

  // modal slot 점유 발행 (open 시)
  useEffect(() => {
    if (open && !modalSuppressed) {
      publishActiveModal("academic-status");
      return () => releaseActiveModal("academic-status");
    }
    return undefined;
  }, [open, modalSuppressed]);

  function dismiss() {
    if (typeof window !== "undefined") {
      try {
        sessionStorage.setItem(dismissKey, "1");
      } catch {
        /* 무시 */
      }
    }
    setOpen(false);
  }

  function goUpdate() {
    dismiss();
    router.push(ACADEMIC_STATUS_PATH);
  }

  if (!open || modalSuppressed) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={ACADEMIC_STATUS_COPY.popupTitle}
    >
      <div className="w-full max-w-md rounded-2xl bg-card p-6 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <GraduationCap size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold">{ACADEMIC_STATUS_COPY.popupTitle}</h2>
              <p className="text-xs text-muted-foreground">매 학기 학사 상태 확인</p>
            </div>
          </div>
          <button
            type="button"
            onClick={dismiss}
            aria-label="닫기"
            className="rounded p-1 text-muted-foreground hover:bg-muted"
          >
            <X size={16} />
          </button>
        </div>
        <p className="mt-4 text-sm leading-relaxed text-foreground">
          {ACADEMIC_STATUS_COPY.popupBody(targetSemester)}
        </p>
        <p className="mt-2 text-xs text-muted-foreground">{ACADEMIC_STATUS_COPY.popupHint}</p>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" size="sm" onClick={dismiss}>
            {ACADEMIC_STATUS_COPY.laterLabel}
          </Button>
          <Button type="button" size="sm" onClick={goUpdate}>
            {ACADEMIC_STATUS_COPY.ctaLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
