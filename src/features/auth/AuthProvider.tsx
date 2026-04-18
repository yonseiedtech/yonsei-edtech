"use client";

import { useEffect, useRef } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuthStore } from "./auth-store";
import { profilesApi } from "@/lib/bkend";
import { mergeToUser } from "./merge-user";
import { runAllGuestLinkers } from "@/lib/guestLinker";

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setUser, setInitialized } = useAuthStore();
  const subscribedRef = useRef(false);

  useEffect(() => {
    if (subscribedRef.current) return;
    subscribedRef.current = true;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          let profile: Record<string, unknown> | undefined;
          try {
            if (firebaseUser.email) {
              const res = await profilesApi.getByEmail(firebaseUser.email);
              profile = res.data[0];
            }
          } catch {
            // 프로필 조회 실패 시 인증 정보만으로 진행
          }
          const merged = mergeToUser(firebaseUser, profile);
          setUser(merged);
          // 백그라운드: 마지막 접속 시각 갱신
          if (merged?.id) {
            profilesApi.update(merged.id, { lastLoginAt: new Date().toISOString() }).catch(() => {});
          }
          // 백그라운드: 게스트 레코드 자동 연결 (참석자·신청자·수료증)
          if (merged?.id) {
            runAllGuestLinkers({
              userId: merged.id,
              userName: merged.name,
              studentId: (profile?.studentId as string) || undefined,
              email: merged.email || undefined,
            });
          }
        } catch {
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setInitialized(true);
    });

    return () => { unsubscribe(); subscribedRef.current = false; };
  }, [setUser, setInitialized]);

  return <>{children}</>;
}
