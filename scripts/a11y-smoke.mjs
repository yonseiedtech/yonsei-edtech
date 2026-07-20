/**
 * a11y-smoke.mjs — M4-v9 접근성 스모크 게이트 (수동 실행)
 *
 * 대상: LIVE URL (https://yonsei-edtech.vercel.app) 핵심 5페이지
 * 도구: puppeteer-core + axe-core
 * 실행: node scripts/a11y-smoke.mjs
 *
 * 요건: 시스템에 Google Chrome 또는 MS Edge 설치 필요.
 * axe critical / serious 위반만 보고 (정보성 위반 제외).
 */

import puppeteer from "puppeteer-core";
import { readFileSync, existsSync } from "fs";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const axePath = require.resolve("axe-core");
const AXE_SOURCE = readFileSync(axePath, "utf-8");

const LIVE_BASE = "https://yonsei-edtech.vercel.app";
const PAGES = ["/", "/archive", "/research", "/seminars", "/mypage"];

// Windows 시스템 Chrome/Edge 경로 탐색
const CHROME_CANDIDATES = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  // macOS
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
  // Linux
  "/usr/bin/google-chrome",
  "/usr/bin/chromium-browser",
  "/usr/bin/chromium",
];

function findBrowser() {
  for (const p of CHROME_CANDIDATES) {
    if (existsSync(p)) return p;
  }
  return null;
}

async function runAxeOnPage(browser, url) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  try {
    await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });
  } catch {
    // networkidle2 timeout 무시하고 계속
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 });
  }

  // axe-core 주입
  await page.evaluate(AXE_SOURCE);

  const results = await page.evaluate(async () => {
    return await window.axe.run(document, {
      runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa", "best-practice"] },
      reporter: "v2",
    });
  });

  await page.close();
  return results;
}

function summarizeViolations(violations, path) {
  const critical = violations.filter((v) => v.impact === "critical");
  const serious = violations.filter((v) => v.impact === "serious");
  return { path, critical, serious, total: violations.length };
}

async function main() {
  const executablePath = findBrowser();
  if (!executablePath) {
    console.error("Chrome/Edge 실행 파일을 찾을 수 없습니다.");
    console.error("탐색 경로:", CHROME_CANDIDATES.join(", "));
    process.exit(1);
  }

  console.log(`브라우저: ${executablePath}`);
  console.log(`대상 URL: ${LIVE_BASE}`);
  console.log("─".repeat(60));

  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });

  const allSummaries = [];

  for (const pagePath of PAGES) {
    const url = LIVE_BASE + pagePath;
    console.log(`\n검사 중: ${url}`);
    try {
      const results = await runAxeOnPage(browser, url);
      const summary = summarizeViolations(results.violations, pagePath);
      allSummaries.push(summary);

      console.log(
        `  전체 위반: ${summary.total}건  |  critical: ${summary.critical.length}  |  serious: ${summary.serious.length}`
      );

      const highImpact = [...summary.critical, ...summary.serious];
      for (const v of highImpact) {
        console.log(`  [${v.impact.toUpperCase()}] ${v.id}: ${v.description}`);
        console.log(`    영향 노드 수: ${v.nodes.length}`);
        if (v.nodes[0]) {
          console.log(`    예시 노드: ${v.nodes[0].html.slice(0, 120)}`);
        }
      }
    } catch (err) {
      console.error(`  오류: ${err.message}`);
      allSummaries.push({ path: pagePath, critical: [], serious: [], total: -1, error: err.message });
    }
  }

  await browser.close();

  console.log("\n" + "═".repeat(60));
  console.log("집계 요약");
  console.log("─".repeat(60));

  let totalCritical = 0;
  let totalSerious = 0;
  for (const s of allSummaries) {
    const c = s.critical?.length ?? 0;
    const sr = s.serious?.length ?? 0;
    totalCritical += c;
    totalSerious += sr;
    console.log(`  ${s.path.padEnd(15)} critical=${c}  serious=${sr}${s.error ? " ERROR" : ""}`);
  }
  console.log("─".repeat(60));
  console.log(`  합계: critical=${totalCritical}  serious=${totalSerious}`);
  console.log("═".repeat(60));

  // 종료 코드: critical > 0 이면 1 (게이트 실패 신호)
  if (totalCritical > 0) {
    console.log("\ncritical 위반이 있습니다. 상위 항목을 확인하세요.");
    process.exit(1);
  } else {
    console.log("\ncritical 위반 없음 — 게이트 통과.");
    process.exit(0);
  }
}

main().catch((err) => {
  console.error("스크립트 오류:", err);
  process.exit(1);
});
