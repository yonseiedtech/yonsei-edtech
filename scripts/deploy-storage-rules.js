/**
 * storage.rules 프로덕션 배포 — Firebase Rules REST API + 서비스 계정 토큰.
 *
 * 실행 (WSL, 리포 루트에서):
 *   node scripts/deploy-storage-rules.js
 *
 * deploy-firestore-rules.js 와 동일 방식, release 대상만 firebase.storage/<bucket>.
 */
const fs = require("fs");
const path = require("path");
const { JWT } = require("google-auth-library");

const ROOT = path.resolve(__dirname, "..");
const BUCKET = "yonsei-edtech.firebasestorage.app";

(async () => {
  const line = fs
    .readFileSync(path.join(ROOT, ".env.local"), "utf8")
    .split("\n")
    .find((l) => l.startsWith("FIREBASE_SERVICE_ACCOUNT_KEY="));
  if (!line) throw new Error(".env.local 에 FIREBASE_SERVICE_ACCOUNT_KEY 가 없습니다.");
  const key = JSON.parse(Buffer.from(line.split("=")[1].trim(), "base64").toString());
  const project = key.project_id;

  const client = new JWT({
    email: key.client_email,
    key: key.private_key,
    scopes: [
      "https://www.googleapis.com/auth/firebase",
      "https://www.googleapis.com/auth/cloud-platform",
    ],
  });
  const { token } = await client.getAccessToken();
  const H = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  const base = `https://firebaserules.googleapis.com/v1/projects/${project}`;

  const content = fs.readFileSync(path.join(ROOT, "storage.rules"), "utf8");

  let res = await fetch(`${base}/rulesets`, {
    method: "POST",
    headers: H,
    body: JSON.stringify({ source: { files: [{ name: "storage.rules", content }] } }),
  });
  const ruleset = await res.json();
  if (!res.ok) {
    console.error("ruleset 생성 실패:", JSON.stringify(ruleset).slice(0, 1000));
    process.exit(1);
  }
  console.log("ruleset 생성:", ruleset.name);

  const releaseName = `projects/${project}/releases/firebase.storage/${BUCKET}`;
  res = await fetch(`${base}/releases/firebase.storage/${BUCKET}`, {
    method: "PATCH",
    headers: H,
    body: JSON.stringify({ release: { name: releaseName, rulesetName: ruleset.name } }),
  });
  const release = await res.json();
  if (!res.ok) {
    console.error("release 갱신 실패:", JSON.stringify(release).slice(0, 1000));
    process.exit(1);
  }
  console.log("✅ Storage rules 배포 완료 →", release.rulesetName);
})();
