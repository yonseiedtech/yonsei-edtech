import { initializeApp } from "firebase/app";
import { getFirestore, collection, getCountFromServer, query, where } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyA2Vuo9mN2DVCtBqmVQZaUGabG07RCHoUs",
  authDomain: "yonsei-edtech.firebaseapp.com",
  projectId: "yonsei-edtech",
  storageBucket: "yonsei-edtech.firebasestorage.app",
  messagingSenderId: "442267096511",
  appId: "1:442267096511:web:2cf9787d3994a8dce3fd0a",
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const all = await getCountFromServer(collection(db, "alumni_theses"));
const seeded = await getCountFromServer(query(collection(db, "alumni_theses"), where("source", "==", "csv_seed_2026_04")));
console.log("alumni_theses total:", all.data().count);
console.log("csv_seed_2026_04:", seeded.data().count);
process.exit(0);
