"use client";

import { Megaphone, FolderKanban, LayoutDashboard } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import StaffNoticesTab from "@/features/staff/StaffNoticesTab";
import StaffProjectsTab from "@/features/staff/StaffProjectsTab";
import StaffConsoleTab from "@/features/staff/StaffConsoleTab";

export default function StaffPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">운영진 페이지</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          운영진 전용 협업·공지·프로젝트 관리 공간입니다.
        </p>
      </div>

      <Tabs defaultValue="notices">
        <TabsList className="mb-6 w-full">
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
        </TabsList>

        <TabsContent value="notices" className="pt-2">
          <StaffNoticesTab />
        </TabsContent>

        <TabsContent value="projects" className="pt-2">
          <StaffProjectsTab />
        </TabsContent>

        <TabsContent value="console" className="pt-2">
          <StaffConsoleTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
