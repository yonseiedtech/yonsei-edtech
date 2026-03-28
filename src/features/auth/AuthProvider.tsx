"use client";

import { useEffect, useRef } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuthStore } from "./auth-store";
import { profilesApi } from "@/lib/bkend";
import { mergeToUser } from "./merge-user";

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
          setUser(mergeToUser(firebaseUser, profile));
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
