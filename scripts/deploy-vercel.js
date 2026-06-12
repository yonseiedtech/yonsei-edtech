#!/usr/bin/env node
/**
 * Vercel 배포 스크립트 — 다중 계정 환경에서 토큰 기반 명시 배포.
 *
 * 사용법:
 *   npm run deploy:vercel
 *
 * 토큰 소스 (우선순위 순):
 *   1) process.env.VERCEL_TOKEN_YONSEI — 사용자 환경변수
 *   2) <repo>/.vercel/.env 파일의 VERCEL_TOKEN_YONSEI=xxx 라인 (gitignore 됨)
 *
 * 사전 설정 (1회):
 *   1) https://vercel.com/account/tokens 에서 kimdaekyoungs 계정으로 Personal Access Token 발급
 *   2) 두 방법 중 하나:
 *      방법 A — 사용자 환경변수 (시스템 전역):
 *        Windows (PowerShell):
 *          [Environment]::SetEnvironmentVariable("VERCEL_TOKEN_YONSEI", "<token>", "User")
 *        macOS/Linux (~/.zshrc 또는 ~/.bashrc):
 *          export VERCEL_TOKEN_YONSEI="<token>"
 *      방법 B — .vercel/.env 파일 (프로젝트 로컬, .vercel/ 디렉토리는 gitignore 됨):
 *        파일 경로: <repo>/.vercel/.env
 *        파일 내용: VERCEL_TOKEN_YONSEI=<token>
 *
 * 다른 Vercel 계정에 로그인되어 있어도 본 스크립트는 항상 토큰을 명시해
 * kimdaekyoungs-projects 의 yonsei-edtech 프로젝트로 배포된다.
 */

const { execSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

function loadTokenFromEnvFile() {
  const envPath = path.join(__dirname, "..", ".vercel", ".env");
  if (!fs.existsSync(envPath)) return null;
  try {
    const content = fs.readFileSync(envPath, "utf8");
    for (const rawLine of content.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;
      const eq = line.indexOf("=");
      if (eq === -1) continue;
      const key = line.slice(0, eq).trim();
      let value = line.slice(eq + 1).trim();
      // 양 끝 따옴표 제거
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (key === "VERCEL_TOKEN_YONSEI" && value) return value;
    }
  } catch (err) {
    console.warn("⚠️ .vercel/.env 읽기 실패:", err.message);
  }
  return null;
}

const TOKEN = process.env.VERCEL_TOKEN_YONSEI || loadTokenFromEnvFile();
const TOKEN_SOURCE = process.env.VERCEL_TOKEN_YONSEI
  ? "환경변수"
  : TOKEN
    ? ".vercel/.env 파일"
    : null;

if (!TOKEN) {
  console.error("\n❌ VERCEL_TOKEN_YONSEI 가 설정되지 않았습니다.");
  console.error("");
  console.error("발급: https://vercel.com/account/tokens (kimdaekyoungs 계정으로 로그인)");
  console.error("");
  console.error("방법 A — 사용자 환경변수 (Windows PowerShell):");
  console.error('  [Environment]::SetEnvironmentVariable("VERCEL_TOKEN_YONSEI", "<token>", "User")');
  console.error("  ※ 새 PowerShell/Claude 세션을 열어야 적용됩니다.");
  console.error("");
  console.error("방법 B — .vercel/.env 파일 (즉시 적용, gitignore 됨):");
  console.error("  파일: <repo>/.vercel/.env");
  console.error("  내용: VERCEL_TOKEN_YONSEI=<token>");
  console.error("");
  process.exit(1);
}

console.log(`▲ yonsei-edtech 배포 시작 (token source: ${TOKEN_SOURCE})`);
console.log(`   계정 분리: 다른 Vercel 로그인 무시, VERCEL_TOKEN_YONSEI 사용`);
console.log("");

// 글로벌 vercel CLI 우선 — npm 11.6.x 의 npx 캐시 lock 버그(ECOMPROMISED → 반설치 캐시 잔존)를
// 회피한다. 글로벌 미설치 환경에서만 npx 로 폴백. (사전 설치: npm i -g vercel)
function vercelCommand() {
  try {
    execSync("vercel --version", { stdio: "ignore" });
    return "vercel";
  } catch {
    return "npx vercel";
  }
}

try {
  execSync(`${vercelCommand()} --prod --token=${TOKEN}`, {
    stdio: "inherit",
    env: {
      ...process.env,
      VERCEL_TOKEN: TOKEN,
    },
  });
  console.log("\n✓ 배포 완료. https://yonsei-edtech.vercel.app 확인");
} catch (err) {
  console.error("\n✗ 배포 실패:", err.message);
  process.exit(1);
}
