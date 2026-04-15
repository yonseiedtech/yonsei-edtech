"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onIdTokenChanged, signInWithCustomToken } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { AlertTriangle, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const STORAGE_KEY = "impersonatorUid";

export default function ImpersonationBanner() {
  const [impersonatorUid, setImpersonatorUid] = useState<string | null>(null);
  const [targetName, setTargetName] = useState<string>("");
  const [reverting, setReverting] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const unsub = onIdTokenChanged(auth, async (user) => {
      if (!user) {
        setImpersonatorUid(null);
        try { sessionStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
        return;
      }
      try {
        const tokenResult = await user.getIdTokenResult();
        const claim = tokenResult.claims.impersonatedBy as string | undefined;
        let uid: string | null = claim ?? null;
        if (!uid) {
          try { uid = sessionStorage.getItem(STORAGE_KEY); } catch { uid = null; }
        }
        setImpersonatorUid(uid);
        setTargetName(user.displayName || user.email || user.uid);
      } catch {
        setImpersonatorUid(null);
      }
    });
    return () => unsub();
  }, []);

  async function handleRevert() {
    setReverting(true);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) throw new Error("no token");
      const res = await fetch("/api/admin/impersonate/revert", {
        method: "POST",
        headers: { Authorization: `Bearer ${idToken}` },
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "복귀 실패");
      }
      const data = await res.json();
      await signInWithCustomToken(auth, data.customToken);
      try { sessionStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
      toast.success("관리자 계정으로 복귀했습니다.");
      router.push("/admin/members");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "복귀에 실패했습니다.");
    } finally {
      setReverting(false);
    }
  }

  if (!impersonatorUid) return null;

  return (
    <div className="sticky top-0 z-50 flex items-center justify-between gap-3 border-b border-amber-300 bg-amber-100 px-4 py-2 text-sm text-amber-900">
      <div className="flex items-center gap-2">
        <AlertTriangle size={16} />
        <span>
          <strong>관리자 {impersonatorUid.slice(0, 6)}</strong> → <strong>{targetName}</strong> 계정으로 전환 중
        </span>
      </div>
      <Button size="sm" variant="outline" onClick={handleRevert} disabled={reverting}>
        <LogOut size={14} className="mr-1" />
        {reverting ? "복귀 중..." : "관리자로 복귀"}
      </Button>
    </div>
  );
}
