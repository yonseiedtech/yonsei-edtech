import { initializeApp, getApps, cert, type App, type ServiceAccount } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getMessaging, type Messaging } from "firebase-admin/messaging";

let _app: App | null = null;

function getAdminApp(): App {
  if (_app) return _app;
  if (getApps().length > 0) {
    _app = getApps()[0];
    return _app;
  }

  const encoded = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!encoded) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY 환경변수가 설정되지 않았습니다.");
  }
  const serviceAccount = JSON.parse(
    Buffer.from(encoded, "base64").toString("utf-8"),
  ) as ServiceAccount;

  _app = initializeApp({ credential: cert(serviceAccount) });
  return _app;
}

/** Lazy-initialized Firebase Admin Auth */
export function getAdminAuth(): Auth {
  return getAuth(getAdminApp());
}

/** Lazy-initialized Firebase Admin Firestore */
export function getAdminDb(): Firestore {
  return getFirestore(getAdminApp());
}

/** Lazy-initialized Firebase Admin Messaging (FCM) — Sprint 53 */
export function getAdminMessaging(): Messaging {
  return getMessaging(getAdminApp());
}
