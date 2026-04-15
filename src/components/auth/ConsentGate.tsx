"use client";

import { useEffect, useState } from "react";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuthStore } from "@/features/auth/auth-store";
import { profilesApi } from "@/lib/bkend";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { needsReConsent, type UserConsents } from "@/lib/legal";
import { toast } from "sonner";
import ConsentSteps from "./ConsentSteps";

export default function ConsentGate() {
  const { user, setUser } = useAuthStore();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) {
      setOpen(false);
      return;
    }
    // admin/president는 게이트 대상 아님
    if (user.role === "admin" || user.role === "president") {
      setOpen(false);
      return;
    }
    if (needsReConsent(user.consents)) {
      setOpen(true);
    } else {
      setOpen(false);
    }
  }, [user]);

  async function handleComplete(consents: UserConsents) {
    if (!user?.id) return;
    setSaving(true);
    try {
      await profilesApi.update(user.id, { consents });
      setUser({ ...user, consents });
      toast.success("동의가 저장되었습니다.");
      setOpen(false);
    } catch {
      toast.error("저장에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setSaving(false);
    }
  }

  async function handleLogout() {
    try {
      await signOut(auth);
    } catch {
      /* ignore */
    }
    setOpen(false);
  }

  if (!user) return null;
  if (user.role === "admin" || user.role === "president") return null;

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v && open) return;
        setOpen(v);
      }}
    >
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>약관 재동의 요청</DialogTitle>
          <DialogDescription>
            개정된 약관 및 개인정보처리방침에 대한 동의가 필요합니다. 아래 단계를 따라 확인해주세요.
          </DialogDescription>
        </DialogHeader>

        <ConsentSteps
          mode="regate"
          initialConsents={user.consents}
          onComplete={handleComplete}
          onCancel={handleLogout}
          cancelLabel="로그아웃"
          submitting={saving}
        />
      </DialogContent>
    </Dialog>
  );
}
