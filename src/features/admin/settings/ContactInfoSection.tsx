"use client";

import { useState, useEffect } from "react";
import { useContactInfo, useUpdateContactInfo, type ContactInfoData } from "@/features/site-settings/useSiteContent";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Section from "./SectionWrapper";
import { toast } from "sonner";
import ConsolePageHeader from "@/components/admin/ConsolePageHeader";
import { Phone } from "lucide-react";

export default function ContactInfoSection() {
  const { value, recordId, isLoading } = useContactInfo();
  const updateMutation = useUpdateContactInfo();
  const [form, setForm] = useState<ContactInfoData>(value);

  useEffect(() => { if (!isLoading) setForm(value); }, [isLoading, value]);

  function handleSave() {
    updateMutation.mutate({ recordId, value: form }, {
      onSuccess: () => toast.success("연락처 정보가 저장되었습니다."),
      onError: () => toast.error("저장 실패"),
    });
  }

  if (isLoading) return <div className="py-4 text-sm text-muted-foreground">불러오는 중...</div>;

  return (
    <div className="space-y-6">
      <ConsolePageHeader icon={Phone} title="문의 연락처" description="학회 이메일, 정기 모임 일정, 주소 정보를 관리합니다." />
    <Section title="문의 연락처">
      <div className="grid gap-4 md:grid-cols-3">
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">이메일</label>
          <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">정기 모임</label>
          <Input value={form.meetingSchedule} onChange={(e) => setForm({ ...form, meetingSchedule: e.target.value })} />
        </div>
        <div className="md:col-span-3">
          <label className="mb-1 block text-xs text-muted-foreground">주소</label>
          <textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} rows={2} className="w-full rounded-lg border bg-muted/50 px-3 py-2 text-sm" />
        </div>
      </div>
      <Button className="mt-4" onClick={handleSave} disabled={updateMutation.isPending}>
        {updateMutation.isPending ? "저장 중..." : "저장"}
      </Button>
    </Section>
    </div>
  );
}
