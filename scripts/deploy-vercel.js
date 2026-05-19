#!/usr/bin/env node
/**
 * Vercel 배포 스크립트 — 다중 계정 환경에서 토큰 기반 명시 배포.
 *
 * 사용법:
 *   npm run deploy:vercel
 *
 * 사전 설정 (1회):
 *   1) https://vercel.com/account/tokens 에서 kimdaekyoungs 계정으로 Personal Access Token 발급
 *   2) 사용자 환경변수 등록:
 *      Windows (PowerShell):
 *        [Environment]::SetEnvironmentVariable("VERCEL_TOKEN_YONSEI", "<token>", "User")
 *      macOS/Linux (~/.zshrc 또는 ~/.bashrc):
 *        export VERCEL_TOKEN_YONSEI="<token>"
 *
 * 다른 Vercel 계정에 로그인되어 있어도 본 스크립트는 항상 토큰을 명시해
 * kimdaekyoungs-projects 의 yonsei-edtech 프로젝트로 배포된다.
 */

const { execSync } = require("node:child_process");

const TOKEN = process.env.VERCEL_TOKEN_YONSEI;

if (!TOKEN) {
  console.error("\n❌ VERCEL_TOKEN_YONSEI 환경변수가 설정되지 않았습니다.");
  console.error("");
  console.error("발급: https://vercel.com/account/tokens (kimdaekyoungs 계정으로 로그인)");
  console.error("");
  console.error("Windows PowerShell:");
  console.error('  [Environment]::SetEnvironmentVariable("VERCEL_TOKEN_YONSEI", "<token>", "User")');
  console.error("  ※ 새 PowerShell 세션을 열어야 적용됩니다.");
  console.error("");
  console.error("macOS/Linux (~/.zshrc):");
  console.error('  export VERCEL_TOKEN_YONSEI="<token>"');
  console.error("");
  process.exit(1);
}

console.log("▲ yonsei-edtech 배포 시작 (token 기반 명시 배포)");
console.log(`   계정 분리: 다른 Vercel 로그인 무시, VERCEL_TOKEN_YONSEI 사용`);
console.log("");

try {
  execSync(`npx vercel --prod --token=${TOKEN}`, {
    stdio: "inherit",
    env: {
      ...process.env,
      // 혹시 다른 토큰이 있어도 우선순위 명시
      VERCEL_TOKEN: TOKEN,
    },
  });
  console.log("\n✓ 배포 완료. https://yonsei-edtech.vercel.app 확인");
} catch (err) {
  console.error("\n✗ 배포 실패:", err.message);
  process.exit(1);
}
