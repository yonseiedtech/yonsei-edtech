"use client";

import { useEffect, useMemo, useState } from "react";
import { Home, Megaphone, FolderKanban, LayoutDashboard, CalendarClock } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import StaffHomeTab from "@/features/staff/StaffHomeTab";
import StaffNoticesTab from "@/features/staff/StaffNoticesTab";
import StaffProjectsTab from "@/features/staff/StaffProjectsTab";
import StaffConsoleTab from "@/features/staff/StaffConsoleTab";
import StaffMeetingPollTab from "@/features/staff/StaffMeetingPollTab";
import { useStaffUiStore, ALL_SEMESTERS } from "@/features/staff/staff-store";
import { useEffectiveSemesterKey } from "@/features/site-settings/useCurrentSemester";
import { listSemesterKeys, semesterLabelFromKey } from "@/lib/semester";

export default function StaffPage() {
  const [tab, setTab] = useState("home");
  const { selectedSemester, chooseSemester, semesterTouched, setSelectedSemester } =
    useStaffUiStore();
  const effectiveKey = useEffectiveSemesterKey();
  // 현재 학기 기준 앞뒤 학기 옵션(최신이 앞). 렌더 순수성 위해 마운트 시 1회 계산.
  const semesterKeys = useMemo(() => listSemesterKeys(4, 1), []);

  // override(effectiveKey) 반영 — 사용자가 아직 학기를 직접 고르지 않았을 때만 최초 1회 동기화.
  // 가드: !semesterTouched && effectiveKey !== selectedSemester → 수렴 후 재실행 없음.
  useEffect(() => {
    if (!semesterTouched && effectiveKey && effectiveKey !== selectedSemester) {
      setSelectedSemester(effectiveKey);
    }
  }, [semesterTouched, effectiveKey, selectedSemester, setSelectedSemester]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">운영진 페이지</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            운영진 전용 협업·공지·프로젝트 관리 공간입니다.
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">학기</span>
          <select
            value={selectedSemester}
            onChange={(e) => chooseSemester(e.target.value)}
            className="rounded-lg border bg-background px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring"
            aria-label="학기 선택"
          >
            <option value={ALL_SEMESTERS}>전체 학기</option>
            {semesterKeys.map((k) => (
              <option key={k} value={k}>
                {semesterLabelFromKey(k)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-6 w-full">
          <TabsTrigger value="home" className="flex items-center gap-1.5">
            <Home size={15} />
            홈
          </TabsTrigger>
          <TabsTrigger value="notices" className="flex items-center gap-1.5">
            <Megaphone size={15} />
            운영진 공지
          </TabsTrigger>
          <TabsTrigger value="projects" className="flex items-center gap-1.5">
            <FolderKanban size={15} />
            프로젝트 운영
          </TabsTrigger>
          <TabsTrigger value="console" className="flex items-center gap-1.5">
            <LayoutDashboard size={15} />
            콘솔 바로가기
          </TabsTrigger>
          <TabsTrigger value="meeting-poll" className="flex items-center gap-1.5">
            <CalendarClock size={15} />
            모임 일정
          </TabsTrigger>
        </TabsList>

        <TabsContent value="home" className="pt-2">
          <StaffHomeTab onGoTab={setTab} />
        </TabsContent>

        <TabsContent value="notices" className="pt-2">
          <StaffNoticesTab />
        </TabsContent>

        <TabsContent value="projects" className="pt-2">
          <StaffProjectsTab />
        </TabsContent>

        <TabsContent value="console" className="pt-2">
          <StaffConsoleTab />
        </TabsContent>

        <TabsContent value="meeting-poll" className="pt-2">
          <StaffMeetingPollTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
