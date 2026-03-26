/**
 * Firebase 관리자 비밀번호 리셋 + Firestore 프로필 확인/생성
 * Usage: node scripts/reset-admin.mjs
 */
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, updatePassword } from "firebase/auth";
import { getFirestore, doc, getDoc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";

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

const EMAIL = "admin@yonsei.ac.kr";
const NEW_PASSWORD = "58222359";

// 이전에 사용했을 가능성 있는 비밀번호들
const OLD_PASSWORDS = ["admin123", "admin123!", "test123", "password", "12345678", "58222359"];

async function resetAdmin() {
  console.log(`계정 확인: ${EMAIL}`);

  for (const oldPw of OLD_PASSWORDS) {
    try {
      const cred = await signInWithEmailAndPassword(auth, EMAIL, oldPw);
      console.log(`✅ 기존 비밀번호 확인: "${oldPw}"`);

      if (oldPw !== NEW_PASSWORD) {
        await updatePassword(cred.user, NEW_PASSWORD);
        console.log(`✅ 비밀번호 변경 완료 → ${NEW_PASSWORD}`);
      } else {
        console.log(`✅ 비밀번호가 이미 동일합니다.`);
      }

      // Firestore 프로필 확인/업데이트
      const userDoc = await getDoc(doc(db, "users", cred.user.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        console.log(`✅ Firestore 프로필 존재 — role: ${data.role}, approved: ${data.approved}`);
        if (data.role !== "admin" || !data.approved) {
          await updateDoc(doc(db, "users", cred.user.uid), {
            role: "admin",
            approved: true,
            updatedAt: serverTimestamp(),
          });
          console.log(`✅ 역할을 admin, approved: true로 업데이트 완료`);
        }
      } else {
        await setDoc(doc(db, "users", cred.user.uid), {
          email: EMAIL,
          name: "관리자",
          username: "admin",
          role: "admin",
          generation: 0,
          field: "관리",
          approved: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        console.log(`✅ Firestore 프로필 새로 생성 (admin, approved: true)`);
      }

      console.log(`\n로그인 정보:`);
      console.log(`  아이디: admin`);
      console.log(`  비밀번호: ${NEW_PASSWORD}`);
      process.exit(0);
    } catch (err) {
      if (err.code === "auth/invalid-credential" || err.code === "auth/wrong-password") {
        continue; // 다음 비밀번호 시도
      }
      console.error(`❌ 오류 (비밀번호 "${oldPw}"):`, err.message);
    }
  }

  console.log("❌ 기존 비밀번호를 찾을 수 없습니다.");
  console.log("   Firebase Console에서 직접 비밀번호를 리셋해야 합니다:");
  console.log("   https://console.firebase.google.com/project/yonsei-edtech/authentication/users");
  process.exit(1);
}

resetAdmin();
