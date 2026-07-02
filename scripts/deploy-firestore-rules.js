/**
 * firestore.rules 프로덕션 배포 — Firebase Rules REST API + 서비스 계정 토큰.
 *
 * 실행 (WSL, 리포 루트에서):
 *   node scripts/deploy-firestore-rules.js
 *
 * .env.local 의 FIREBASE_SERVICE_ACCOUNT_KEY(base64)를 사용한다.
 * firebase CLI 로그인 없이 rules 만 배포할 때 사용 (2026-07-02 Phase 2-D).
 */
const fs = require("fs");
const path = require("path");
const { JWT } = require("google-auth-library");

const ROOT = path.resolve(__dirname, "..");

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

  const content = fs.readFileSync(path.join(ROOT, "firestore.rules"), "utf8");

  // 1) ruleset 생성 (컴파일 오류 시 여기서 에러 반환)
  let res = await fetch(`${base}/rulesets`, {
    method: "POST",
    headers: H,
    body: JSON.stringify({ source: { files: [{ name: "firestore.rules", content }] } }),
  });
  const ruleset = await res.json();
  if (!res.ok) {
    console.error("ruleset 생성 실패:", JSON.stringify(ruleset).slice(0, 1000));
    process.exit(1);
  }
  console.log("ruleset 생성:", ruleset.name);

  // 2) cloud.firestore release 를 새 ruleset 으로 갱신
  res = await fetch(`${base}/releases/cloud.firestore`, {
    method: "PATCH",
    headers: H,
    body: JSON.stringify({
      release: {
        name: `projects/${project}/releases/cloud.firestore`,
        rulesetName: ruleset.name,
      },
    }),
  });
  const release = await res.json();
  if (!res.ok) {
    console.error("release 갱신 실패:", JSON.stringify(release).slice(0, 1000));
    process.exit(1);
  }
  console.log("✅ Firestore rules 배포 완료 →", release.rulesetName);
})();
