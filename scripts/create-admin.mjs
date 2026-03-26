/**
 * Firebase 관리자 계정 생성 스크립트
 * Usage: node scripts/create-admin.mjs
 */
import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { getFirestore, doc, setDoc, serverTimestamp } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyA2Vuo9mN2DVCtBqmVQZaUGabG07RCHoUs",
  authDomain: "yonsei-edtech.firebaseapp.com",
  projectId: "yonsei-edtech",
  storageBucket: "yonsei-edtech.firebasestorage.app",
  messagingSenderId: "442267096511",
  appId: "1:442267096511:web:2cf9787d3994a8dce3fd0a",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const ADMIN_EMAIL = "admin@yonsei.ac.kr";
const ADMIN_PASSWORD = "58222359";
const ADMIN_NAME = "관리자";

async function createAdmin() {
  try {
    console.log(`계정 생성 중: ${ADMIN_EMAIL}`);
    const cred = await createUserWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASSWORD);
    await updateProfile(cred.user, { displayName: ADMIN_NAME });

    // Firestore users 컬렉션에 관리자 프로필 생성
    await setDoc(doc(db, "users", cred.user.uid), {
      email: ADMIN_EMAIL,
      name: ADMIN_NAME,
      username: "admin",
      role: "admin",
      generation: 0,
      field: "관리",
      approved: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    console.log("✅ 관리자 계정 생성 완료!");
    console.log(`   UID: ${cred.user.uid}`);
    console.log(`   이메일: ${ADMIN_EMAIL}`);
    console.log(`   로그인 ID: admin`);
    console.log(`   비밀번호: ${ADMIN_PASSWORD}`);
    console.log(`   역할: admin`);
    console.log(`   승인: true`);
    process.exit(0);
  } catch (err) {
    if (err.code === "auth/email-already-in-use") {
      console.log("⚠️  이미 존재하는 계정입니다. 기존 계정으로 로그인하세요.");
    } else if (err.code === "auth/weak-password") {
      console.log("❌ 비밀번호가 너무 약합니다. 6자 이상 필요합니다.");
    } else {
      console.error("❌ 오류:", err.message);
    }
    process.exit(1);
  }
}

createAdmin();
