"use client";

/**
 * Web Push (FCM) 클라이언트 헬퍼 — Sprint 53
 *
 * - 권한 요청 + FCM 토큰 발급
 * - /api/push/register 로 서버 저장
 * - /api/push/unregister 로 서버 삭제
 *
 * VAPID 공개키는 Firebase Console > 프로젝트 설정 > Cloud Messaging > Web 푸시 인증서에서 생성하여
 * NEXT_PUBLIC_FIREBASE_VAPID_KEY 환경변수에 입력해야 한다 (없으면 prompt 자체 미노출).
 */

import { getMessaging, getToken, deleteToken, isSupported, onMessage } from "firebase/messaging";
import { getApps, initializeApp } from "firebase/app";

const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
const SW_PATH = "/firebase-messaging-sw.js";
const PERMISSION_DECLINED_KEY = "push.permissionDeclined";

function ensureFirebaseApp() {
  if (getApps().length > 0) return getApps()[0];
  return initializeApp({
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyA2Vuo9mN2DVCtBqmVQZaUGabG07RCHoUs",
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "yonsei-edtech.firebaseapp.com",
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "yonsei-edtech",
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "yonsei-edtech.firebasestorage.app",
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "442267096511",
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:442267096511:web:2cf9787d3994a8dce3fd0a",
  });
}

/** 브라우저가 푸시·SW·Notification 모두 지원하면 true */
export async function isPushSupported(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (!("serviceWorker" in navigator)) return false;
  if (!("Notification" in window)) return false;
  if (!VAPID_KEY) return false;
  try {
    return await isSupported();
  } catch {
    return false;
  }
}

/** 사용자가 '나중에' 로 dismiss 했는지 */
export function isPermissionDeclined(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(PERMISSION_DECLINED_KEY) === "true";
}

export function markPermissionDeclined(): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PERMISSION_DECLINED_KEY, "true");
}

export function clearPermissionDeclined(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(PERMISSION_DECLINED_KEY);
}

/** 현재 권한 상태 */
export function getPermissionState(): NotificationPermission | "unsupported" {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return Notification.permission;
}

/**
 * 권한 요청 + 토큰 발급 + 서버 등록.
 * 호출자는 사용자 명시 액션(버튼 클릭) 콘텍스트에서 호출해야 함 (브라우저 정책).
 */
export async function enablePushForCurrentUser(): Promise<
  | { ok: true; token: string }
  | { ok: false; reason: "unsupported" | "denied" | "no-token" | "register-failed"; detail?: string }
> {
  if (!(await isPushSupported())) {
    return { ok: false, reason: "unsupported" };
  }
  if (!VAPID_KEY) {
    return { ok: false, reason: "unsupported", detail: "VAPID key 미설정" };
  }
  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      return { ok: false, reason: "denied" };
    }
  } catch (e) {
    return { ok: false, reason: "denied", detail: (e as Error).message };
  }

  try {
    const reg = await navigator.serviceWorker.register(SW_PATH);
    await navigator.serviceWorker.ready;
    const messaging = getMessaging(ensureFirebaseApp());
    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: reg,
    });
    if (!token) {
      return { ok: false, reason: "no-token" };
    }

    const res = await fetch("/api/push/register", {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        token,
        userAgent: navigator.userAgent,
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      return { ok: false, reason: "register-failed", detail: body };
    }

    clearPermissionDeclined();
    return { ok: true, token };
  } catch (e) {
    return { ok: false, reason: "register-failed", detail: (e as Error).message };
  }
}

/** 푸시 비활성화: 토큰 삭제 + 서버에 알림 */
export async function disablePushForCurrentUser(): Promise<boolean> {
  try {
    const messaging = getMessaging(ensureFirebaseApp());
    await deleteToken(messaging);
    await fetch("/api/push/unregister", {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });
    return true;
  } catch (e) {
    console.warn("[push] disable error:", e);
    return false;
  }
}

/** 포그라운드 메시지 수신 핸들러 등록 (toast 노출 등) */
export function onForegroundPush(handler: (payload: { title?: string; body?: string; link?: string }) => void): () => void {
  if (typeof window === "undefined") return () => {};
  let unsub: (() => void) | null = null;
  isPushSupported().then((ok) => {
    if (!ok) return;
    try {
      const messaging = getMessaging(ensureFirebaseApp());
      unsub = onMessage(messaging, (payload) => {
        handler({
          title: payload.notification?.title,
          body: payload.notification?.body,
          link: payload.data?.link,
        });
      });
    } catch (e) {
      console.warn("[push] onMessage error:", e);
    }
  });
  return () => {
    if (unsub) unsub();
  };
}
