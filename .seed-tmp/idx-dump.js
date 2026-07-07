const { GoogleAuth } = require("google-auth-library");
const sa = JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_KEY, "base64").toString("utf8"));
const BASE = `https://firestore.googleapis.com/v1/projects/${sa.project_id}/databases/(default)`;
(async () => {
  const auth = new GoogleAuth({ credentials: sa, scopes: ["https://www.googleapis.com/auth/cloud-platform"] });
  const client = await auth.getClient();
  const { token } = await client.getAccessToken();
  const res = await fetch(`${BASE}/collectionGroups/-/indexes`, { headers: { Authorization: `Bearer ${token}` } });
  const body = await res.json();
  const groups = new Set((body.indexes || []).filter(i => i.queryScope === "COLLECTION").map(i => i.name.split("/collectionGroups/")[1].split("/")[0]));
  const check = ["course_reviews","seminar_waitlist","onboarding_checklist","roadmap_stages","business_card_exchanges","promotion_contents","interview_response_comments","agent_workflow_runs","research_journal_issues","class_sessions"];
  for (const c of check) console.log(`${groups.has(c) ? "있음" : "없음"} — ${c}`);
  process.exit(0);
})().catch(e => { console.error(e.message); process.exit(1); });
