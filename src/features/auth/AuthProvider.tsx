"use client";

import { useEffect, useRef } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuthStore } from "./auth-store";
import { profilesApi } from "@/lib/bkend";
import { mergeToUser } from "./merge-user";
import { runAllGuestLinkers } from "@/lib/guestLinker";
import { todayYmdKst } from "@/lib/dday";

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
          // 사이클 89: 하루 1회 throttle(매 새로고침 write 낭비 방지) + 실패 진단 로그.
          //   누락 원인 — 레거시 CSV 임포트 회원(doc id ≠ Firebase uid)은 firestore.rules
          //   isOwner 체크에서 거부됨. 기존 silent catch 였던 것을 console.warn 으로 노출해
          //   누락 빈도·대상을 파악할 수 있게 한다(근본 정합성 수정은 별도 마이그레이션).
          if (merged?.id && !isImpersonating) {
            try {
              const k = `last-login-ymd-${merged.id}`;
              // D2(2026-07-22): UTC 날짜 → KST 날짜 — KST 0~9시 재방문이 전날로 묶여 미반영되던 경계 해소
              const today = todayYmdKst();
              if (localStorage.getItem(k) !== today) {
                profilesApi
                  .update(merged.id, { lastLoginAt: new Date().toISOString() })
                  // D3: 성공 시에만 스로틀 마킹 — 실패·탭 조기 종료 시 당일 재시도 유지
                  .then(() => localStorage.setItem(k, today))
                  .catch((e) => {
                    console.warn(
                      "[auth] lastLoginAt 갱신 실패 (레거시 doc id≠uid 또는 권한 거부):",
                      merged.id,
                      e,
                    );
                    // D1 폴백: Admin SDK 경유 heartbeat — firestore.rules isOwner 거부 회피.
                    // 클라이언트 실패 시에만 호출하므로 저빈도 — 별도 스로틀 불필요.
                    firebaseUser
                      .getIdToken()
                      .then((idToken) =>
                        fetch("/api/auth/heartbeat", {
                          method: "POST",
                          headers: { Authorization: `Bearer ${idToken}` },
                        }),
                      )
                      .then((res) => {
                        // 폴백 성공 시에만 스로틀 키 마킹 (D3 원칙 유지)
                        if (res.ok) localStorage.setItem(k, today);
                      })
                      .catch(() => {
                        // 폴백도 실패 — 상위 warn 으로 충분
                      });
                  });
              }
            } catch {
              // localStorage 접근 불가(시크릿 모드 등) — throttle 없이 기존 동작 폴백
              profilesApi.update(merged.id, { lastLoginAt: new Date().toISOString() }).catch(() => {});
            }
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
