"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { buildFreshConsents, needsReConsent } from "@/lib/legal";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function ConsentGate() {
  const { user, setUser } = useAuthStore();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [agreeCollection, setAgreeCollection] = useState(false);
  const [agreeMarketing, setAgreeMarketing] = useState(false);

  useEffect(() => {
    if (!user) { setOpen(false); return; }
    if (needsReConsent(user.consents)) {
      // 기존 마케팅 동의 상태는 유지
      setAgreeMarketing(!!user.consents?.marketing?.agreed);
      setOpen(true);
    } else {
      setOpen(false);
    }
  }, [user]);

  const allRequired = agreeTerms && agreePrivacy && agreeCollection;

  async function handleSubmit() {
    if (!user?.id) return;
    if (!allRequired) {
      toast.error("필수 약관에 모두 동의해주세요.");
      return;
    }
    setSaving(true);
    try {
      const consents = buildFreshConsents({
        terms: agreeTerms,
        privacy: agreePrivacy,
        collection: agreeCollection,
        marketing: agreeMarketing,
      });
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
    try { await signOut(auth); } catch { /* ignore */ }
    setOpen(false);
  }

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v && open) return; setOpen(v); }}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>약관 재동의 요청</DialogTitle>
          <DialogDescription>
            개정된 약관 및 개인정보처리방침에 대한 동의가 필요합니다.
            서비스 계속 이용을 위해 아래 항목을 확인하고 동의해주세요.
          </DialogDescription>
        </DialogHeader>

        <div className="my-4 space-y-3 rounded-lg border bg-muted/20 p-4 text-sm">
          <p className="text-xs text-muted-foreground">
            필수 항목에 동의하지 않으실 경우 서비스 이용이 제한되며 로그아웃됩니다.
          </p>

          {[
            { key: "terms", label: "서비스 이용약관", href: "/terms", required: true, checked: agreeTerms, set: setAgreeTerms },
            { key: "privacy", label: "개인정보처리방침", href: "/privacy", required: true, checked: agreePrivacy, set: setAgreePrivacy },
            { key: "collection", label: "개인정보 수집·이용", href: "/consent", required: true, checked: agreeCollection, set: setAgreeCollection },
            { key: "marketing", label: "마케팅·이벤트 정보 수신", href: "/consent", required: false, checked: agreeMarketing, set: setAgreeMarketing },
          ].map((item) => (
            <label key={item.key} className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={item.checked}
                onChange={(e) => item.set(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              <span>
                <span className={item.required ? "font-medium" : "text-muted-foreground"}>
                  [{item.required ? "필수" : "선택"}] {item.label}
                </span>
              </span>
              <Link
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-auto text-xs text-primary hover:underline"
              >
                보기
              </Link>
            </label>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleLogout} disabled={saving}>
            로그아웃
          </Button>
          <Button onClick={handleSubmit} disabled={saving || !allRequired}>
            {saving ? <Loader2 size={14} className="mr-1 animate-spin" /> : null}
            동의 후 계속
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
