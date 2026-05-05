"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { profilesApi } from "@/lib/bkend";
import { useAuthStore } from "@/features/auth/auth-store";
import { Button } from "@/components/ui/button";
import ProfileVisibilitySettings from "./ProfileVisibilitySettings";
import { Settings2, ChevronDown, ChevronUp, Save } from "lucide-react";
import { toast } from "sonner";
import type { User, SectionKey, SectionVisibility } from "@/types";

interface Props {
  owner: User;
}

export default function OwnerVisibilitySection({ owner }: Props) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState<Partial<Record<SectionKey, SectionVisibility>>>(
    owner.sectionVisibility ?? {},
  );
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await profilesApi.update(owner.id, { sectionVisibility: value });
      const merged = { ...owner, sectionVisibility: value };
      useAuthStore.getState().setUser(merged);
      queryClient.invalidateQueries({ queryKey: ["profile-owner", owner.id] });
      toast.success("공개 범위가 저장되었습니다.");
      setDirty(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "저장 실패");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-2xl border bg-card">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-5 py-3 text-left"
      >
        <span className="flex items-center gap-2 text-sm font-semibold">
          <Settings2 size={14} className="text-primary" />내 페이지 공개 범위 설정
        </span>
        {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>
      {open && (
        <div className="border-t px-5 pb-5 pt-3 space-y-3">
          <ProfileVisibilitySettings
            value={value}
            onChange={(next) => {
              setValue(next);
              setDirty(true);
            }}
            disabled={saving}
          />
          <div className="flex justify-end">
            <Button size="sm" onClick={save} disabled={!dirty || saving}>
              <Save size={14} className="mr-1" />
              {saving ? "저장 중..." : "공개 범위 저장"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
