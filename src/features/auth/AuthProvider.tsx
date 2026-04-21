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
          // 임퍼소네이션 여부 확인 (관리자 → 회원 전환 중인 세션은 lastLoginAt/guest linker 스킵)
          let isImpersonating = false;
          try {
            const tokenResult = await firebaseUser.getIdTokenResult();
            isImpersonating = !!tokenResult.claims.impersonatedBy;
          } catch {
            // ignore — 기본값 false
          }

          let profile: Record<string, unknown> | undefined;
          try {
            // 1차: Firebase uid 로 직접 조회 — 회원가입 시 doc id 가 uid 로 고정되므로
            //  임퍼소네이션·이메일 중복 케이스에서 잘못된 프로필을 잡지 않도록 우선.
            try {
              const direct = (await profilesApi.get(firebaseUser.uid)) as unknown;
              if (direct && typeof direct === "object") {
                profile = direct as Record<string, unknown>;
              }
            } catch {
              // 404 등 — 폴백으로 진행
            }
            // 2차: uid 매칭 실패 시 이메일로 폴백 (CSV 임포트 등 레거시 데이터)
            if (!profile && firebaseUser.email) {
              const res = await profilesApi.getByEmail(firebaseUser.email);
              profile = res.data[0];
            }
          } catch {
            // 프로필 조회 실패 시 인증 정보만으로 진행
          }
          const merged = mergeToUser(firebaseUser, profile);
          setUser(merged);
          // 백그라운드: 마지막 접속 시각 갱신 (임퍼소네이션 세션은 제외)
          if (merged?.id && !isImpersonating) {
            profilesApi.update(merged.id, { lastLoginAt: new Date().toISOString() }).catch(() => {});
          }
          // 백그라운드: 게스트 레코드 자동 연결 (임퍼소네이션 세션은 제외)
          if (merged?.id && !isImpersonating) {
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
