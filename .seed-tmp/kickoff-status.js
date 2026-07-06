const { initializeApp, cert, getApps } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const sa = JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_KEY, "base64").toString("utf8"));
if (!getApps().length) initializeApp({ credential: cert(sa) });
const db = getFirestore();
db.settings({ preferRest: true });
(async () => {
  // 1) 2학기 세미나 선등록 여부 (2026-08-20 이후 일정)
  const sems = await db.collection("seminars").get();
  const upcoming = sems.docs.map(d => d.data()).filter(s => (s.date ?? "") >= "2026-08-20" && s.status !== "cancelled");
  console.log("SEMINARS_FALL:", upcoming.length, upcoming.map(s => `${s.date} ${s.title}`).slice(0,5).join(" | "));
  // 2) 학사일정 2026-2 입력 여부
  const cal = await db.collection("academic_calendar").get();
  const fall = cal.docs.map(d => d.data()).filter(c => JSON.stringify(c).includes("2026-09") || JSON.stringify(c).includes("2026-2"));
  console.log("CALENDAR_DOCS:", cal.size, "| 2026-2 관련:", fall.length);
  // 3) 개강 팝업
  const pop = await db.collection("site_popups").doc("kickoff-2026-fall").get();
  console.log("POPUP:", pop.exists ? `active=${pop.data().active}, ${pop.data().startsAt}~${pop.data().endsAt}` : "없음");
  // 4) 스터디/활동 (2학기 개설)
  const acts = await db.collection("activities").get();
  const recent = acts.docs.map(d => d.data()).filter(a => (a.createdAt ?? "") >= "2026-07-01" || (a.startDate ?? "") >= "2026-08-01");
  console.log("ACTIVITIES_FALL:", recent.length);
  // 5) 온보딩 체크리스트 config 항목 수
  const onb = await db.collection("onboarding_checklist_items").get().catch(() => null);
  console.log("ONBOARDING_ITEMS:", onb ? onb.size : "컬렉션 확인 필요");
  process.exit(0);
})().catch(e => { console.error(e.message); process.exit(1); });
