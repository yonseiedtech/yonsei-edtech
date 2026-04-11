"use client";

import { useEffect, useRef } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuthStore } from "./auth-store";
import { profilesApi, attendeesApi } from "@/lib/bkend";
import { mergeToUser } from "./merge-user";

/** 게스트 참석자 중 로그인한 회원과 매칭되는 레코드를 자동 연결 */
async function linkGuestAttendees(userId: string, userName: string, studentId?: string, email?: string) {
  try {
    const linkedIds = new Set<string>();
    // 학번 기반 매칭
    if (studentId) {
      const res = await attendeesApi.findGuestsByStudentId(studentId);
      const guests = (res.data ?? []) as unknown as { id: string }[];
      for (const g of guests) {
        await attendeesApi.update(g.id, { userId, userName, isGuest: false });
        linkedIds.add(g.id);
      }
    }
    // 이메일 기반 매칭 (학번으로 못 찾은 것만)
    if (email) {
      const res = await attendeesApi.findGuestsByEmail(email);
      const guests = (res.data ?? []) as unknown as { id: string }[];
      for (const g of guests) {
        if (!linkedIds.has(g.id)) {
          await attendeesApi.update(g.id, { userId, userName, isGuest: false });
        }
      }
    }
  } catch {
    // 게스트 연결 실패는 로그인에 영향 없음
    console.warn("[auth] guest linking failed");
  }
}

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
          // 백그라운드: 게스트 참석자 자동 연결
          if (merged?.id) {
            linkGuestAttendees(
              merged.id,
              merged.name,
              (profile?.studentId as string) || undefined,
              merged.email || undefined,
            );
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
