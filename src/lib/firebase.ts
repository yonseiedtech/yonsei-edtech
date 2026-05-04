import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// 보안 가드: NEXT_PUBLIC_* 환경변수가 누락되면 잘못된 Firebase 프로젝트로 연결될 수 있음
// fallback은 빌드 안정성을 위해 유지하되, 누락 시 경고를 명시적으로 출력
const REQUIRED_FIREBASE_ENV = [
  "NEXT_PUBLIC_FIREBASE_API_KEY",
  "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
  "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
  "NEXT_PUBLIC_FIREBASE_APP_ID",
] as const;
for (const key of REQUIRED_FIREBASE_ENV) {
  if (!process.env[key]) {
    // eslint-disable-next-line no-console
    console.error(
      `[firebase] WARNING: ${key} 환경변수가 누락되어 fallback 값을 사용합니다. Vercel 환경변수 설정을 확인하세요.`
    );
  }
}

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyA2Vuo9mN2DVCtBqmVQZaUGabG07RCHoUs",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "yonsei-edtech.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "yonsei-edtech",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "yonsei-edtech.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "442267096511",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:442267096511:web:2cf9787d3994a8dce3fd0a",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
