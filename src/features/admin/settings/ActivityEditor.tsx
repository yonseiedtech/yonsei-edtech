"use client";

import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { siteSettingsApi } from "@/lib/bkend";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";

interface ActivityData {
  title: string;
  subtitle: string;
  description: string;
  schedule: string;
  details: string; // 마크다운 또는 긴 텍스트
}

interface Props {
  settingsKey: string; // "activity_projects" | "activity_studies" | "activity_external"
  defaultTitle: string;
}

export default function ActivityEditor({ settingsKey, defaultTitle }: Props) {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<ActivityData>({
    title: defaultTitle,
    subtitle: "",
    description: "",
    schedule: "",
    details: "",
  });

  const { data: settings } = useQuery({
    queryKey: ["site_settings", settingsKey],
    queryFn: async () => {
      const res = await siteSettingsApi.getByKey(settingsKey);
      return res.data[0] as { id: string; value: ActivityData } | undefined;
    },
  });

  useEffect(() => {
    if (settings?.value) {
      setForm(settings.value);
    }
  }, [settings]);

  async function handleSave() {
    setSaving(true);
    try {
      if (settings?.id) {
        await siteSettingsApi.update(settings.id, { key: settingsKey, value: form });
      } else {
        await siteSettingsApi.create({ key: settingsKey, value: form });
      }
      queryClient.invalidateQueries({ queryKey: ["site_settings", settingsKey] });
      toast.success("저장되었습니다.");
    } catch {
      toast.error("저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-white p-6">
        <h2 className="text-lg font-bold">{defaultTitle} 관리</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          활동 페이지에 표시되는 내용을 편집합니다.
        </p>

        <div className="mt-6 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">활동 제목</label>
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="예: 프로젝트"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">부제목</label>
            <Input
              value={form.subtitle}
              onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
              placeholder="예: 실제 교육 현장의 문제를 기술로 해결합니다."
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">운영 일정</label>
            <Input
              value={form.schedule}
              onChange={(e) => setForm({ ...form, schedule: e.target.value })}
              placeholder="예: 학기 단위 운영"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">소개글</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={4}
              placeholder="활동에 대한 간단한 소개를 작성하세요."
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">상세 내용</label>
            <textarea
              value={form.details}
              onChange={(e) => setForm({ ...form, details: e.target.value })}
              rows={8}
              placeholder="활동 방법, 참여 방법, 성과 등 상세 내용을 작성하세요."
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </div>

          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 size={14} className="mr-1 animate-spin" /> : <Save size={14} className="mr-1" />}
            저장
          </Button>
        </div>
      </div>
    </div>
  );
}
