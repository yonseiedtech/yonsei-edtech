/**
 * a11y-smoke.mjs — M4-v9 접근성 스모크 게이트 + L2-v13 reduced-motion 위반 리포트
 *
 * 대상: LIVE URL (https://yonsei-edtech.vercel.app) 핵심 5페이지
 * 도구: puppeteer-core + axe-core
 * 실행: node scripts/a11y-smoke.mjs
 *
 * [L2-v13 추가] prefers-reduced-motion: reduce 에뮬레이션 체크 (리포트 전용 · 게이트 미편입):
 *   1) 전역 가드(globals.css @media reduce 블록) 작동 확인
 *      — 임시 요소(animation-duration:2s, iteration:infinite 명시)를 DOM에 주입한 뒤
 *        computed style의 animation-duration · animation-iteration-count 로 가드 억제 여부 판정
 *   2) 실제 DOM 요소 중 animation-name ≠ none 이면서 duration > 0.01ms 인 요소 수집
 *   3) animation-iteration-count: infinite 잔존 요소 수집
 *   대상 페이지: 공개 4페이지 (/, /archive, /research, /seminars)
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
// L2-v13: reduced-motion 체크는 인증 불필요한 공개 페이지만 대상
const REDUCED_MOTION_PAGES = ["/", "/archive", "/research", "/seminars"];

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

/**
 * L2-v13: prefers-reduced-motion: reduce 에뮬레이션 상태에서
 *   ① globals.css 전역 가드 작동 여부 (임시 요소 주입 방식 — 가장 신뢰도 높은 검사)
 *   ② animation-name ≠ none 이면서 duration > 0.01ms 인 요소(억제 실패) 목록
 *   ③ animation-iteration-count: infinite 잔존 요소 목록
 * 를 수집해 리포트 객체로 반환한다. 게이트 실패 기준에 편입하지 않는다.
 */
async function checkReducedMotion(browser, url) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  // prefers-reduced-motion: reduce 에뮬레이션
  await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);

  try {
    await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });
  } catch {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 });
  }

  // 초기 렌더 후 CSS 적용 안정화 대기
  await new Promise((r) => setTimeout(r, 800));

  const result = await page.evaluate(() => {
    const findings = {
      guardActive: false,
      guardDetail: { animationDuration: "", animationIterationCount: "" },
      unsuppressedAnimations: [],
      infiniteAnimations: [],
    };

    // ① 가드 작동 확인: 임시 요소에 animation-duration:2s + infinite 지정 후 computed 스타일 확인
    // globals.css의 가드가 작동하면 !important 로 0.01ms / 1 로 오버라이드된다.
    const probe = document.createElement("div");
    probe.style.cssText =
      "position:fixed;top:-9999px;left:-9999px;visibility:hidden;pointer-events:none;" +
      "animation-name:__rm_probe__;animation-duration:2s;animation-iteration-count:infinite;";
    document.body.appendChild(probe);
    const cs = getComputedStyle(probe);
    const probeDur = cs.animationDuration;
    const probeIter = cs.animationIterationCount;
    findings.guardDetail = { animationDuration: probeDur, animationIterationCount: probeIter };
    // 판정: duration ≤ 0.01ms AND iterationCount ≠ 'infinite'
    findings.guardActive = parseFloat(probeDur) <= 0.01 && probeIter !== "infinite";
    document.body.removeChild(probe);

    // ② 실제 DOM 요소 중 animation-name ≠ none 인 요소 샘플(최대 500개)
    const all = Array.from(document.querySelectorAll("*")).slice(0, 500);
    for (const el of all) {
      const s = getComputedStyle(el);
      const animName = s.animationName;
      if (!animName || animName === "none") continue;

      const animDur = s.animationDuration;
      const animIter = s.animationIterationCount;

      // 요소 식별자 (tag + id + 첫 3개 class)
      const tag =
        el.tagName.toLowerCase() +
        (el.id ? `#${el.id}` : "") +
        (el.className && typeof el.className === "string" && el.className.trim()
          ? "." + el.className.trim().split(/\s+/).slice(0, 3).join(".")
          : "");

      // 억제 실패: animation-name이 있는데 duration > 0.01ms
      if (parseFloat(animDur) > 0.01) {
        findings.unsuppressedAnimations.push({
          element: tag.slice(0, 120),
          animationName: animName,
          animationDuration: animDur,
        });
      }

      // infinite 잔존: 가드가 iteration-count:1 로 덮었어야 하는데 남아 있는 경우
      if (animIter === "infinite") {
        findings.infiniteAnimations.push({
          element: tag.slice(0, 120),
          animationName: animName,
          animationDuration: animDur,
        });
      }
    }

    return findings;
  });

  await page.close();
  return result;
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

  // ── axe 접근성 스모크 ──────────────────────────────────────
  const allSummaries = [];

  for (const pagePath of PAGES) {
    const url = LIVE_BASE + pagePath;
    console.log(`\n[axe] 검사 중: ${url}`);
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

  // ── axe 집계 ────────────────────────────────────────────────
  console.log("\n" + "═".repeat(60));
  console.log("axe 집계 요약");
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

  // ── L2-v13: reduced-motion 에뮬레이션 체크 ──────────────────
  console.log("\n" + "═".repeat(60));
  console.log("[L2-v13] prefers-reduced-motion: reduce 에뮬레이션 체크");
  console.log("  ※ 리포트 전용 — 게이트 실패 기준 미편입");
  console.log("─".repeat(60));

  const rmSummaries = [];

  for (const pagePath of REDUCED_MOTION_PAGES) {
    const url = LIVE_BASE + pagePath;
    console.log(`\n[rm] 검사 중: ${url}`);
    try {
      const rm = await checkReducedMotion(browser, url);
      rmSummaries.push({ path: pagePath, ...rm });

      // 가드 상태
      if (rm.guardActive) {
        console.log(
          `  [OK] 전역 가드 작동 — animation-duration: ${rm.guardDetail.animationDuration}, iteration-count: ${rm.guardDetail.animationIterationCount}`
        );
      } else {
        console.log(
          `  [NG] 전역 가드 미작동 — animation-duration: ${rm.guardDetail.animationDuration}, iteration-count: ${rm.guardDetail.animationIterationCount}`
        );
        console.log(`       globals.css @media(prefers-reduced-motion: reduce) 가드 확인 필요`);
      }

      // 억제 안 된 애니메이션
      if (rm.unsuppressedAnimations.length > 0) {
        console.log(`  [위반] 억제 안 된 animation-duration (>0.01ms) ${rm.unsuppressedAnimations.length}건:`);
        for (const a of rm.unsuppressedAnimations.slice(0, 5)) {
          console.log(`    - ${a.element} | name=${a.animationName} dur=${a.animationDuration}`);
        }
        if (rm.unsuppressedAnimations.length > 5) {
          console.log(`    ... 외 ${rm.unsuppressedAnimations.length - 5}건`);
        }
      } else {
        console.log(`  [OK] 억제 안 된 애니메이션 없음`);
      }

      // infinite 잔존
      if (rm.infiniteAnimations.length > 0) {
        console.log(`  [위반] animation-iteration-count: infinite 잔존 ${rm.infiniteAnimations.length}건:`);
        for (const a of rm.infiniteAnimations.slice(0, 5)) {
          console.log(`    - ${a.element} | name=${a.animationName} dur=${a.animationDuration}`);
        }
        if (rm.infiniteAnimations.length > 5) {
          console.log(`    ... 외 ${rm.infiniteAnimations.length - 5}건`);
        }
      } else {
        console.log(`  [OK] 무한 애니메이션 잔존 없음`);
      }
    } catch (err) {
      console.error(`  오류: ${err.message}`);
      rmSummaries.push({ path: pagePath, error: err.message });
    }
  }

  // reduced-motion 집계
  console.log("\n" + "─".repeat(60));
  console.log("[L2-v13] reduced-motion 집계");
  console.log("─".repeat(60));
  let rmGuardFail = 0;
  let rmInfiniteTotal = 0;
  let rmUnsuppTotal = 0;
  for (const s of rmSummaries) {
    if (s.error) {
      console.log(`  ${s.path.padEnd(12)} ERROR`);
      continue;
    }
    const guardStr = s.guardActive ? "가드OK " : "가드NG*";
    rmGuardFail += s.guardActive ? 0 : 1;
    const infCnt = s.infiniteAnimations?.length ?? 0;
    const unsuppCnt = s.unsuppressedAnimations?.length ?? 0;
    rmInfiniteTotal += infCnt;
    rmUnsuppTotal += unsuppCnt;
    console.log(`  ${s.path.padEnd(12)} ${guardStr}  infinite=${infCnt}  unsuppressed=${unsuppCnt}`);
  }
  console.log("─".repeat(60));
  console.log(
    `  합계: 가드NG=${rmGuardFail}페이지  infinite잔존=${rmInfiniteTotal}건  억제실패=${rmUnsuppTotal}건`
  );
  if (rmGuardFail > 0) {
    console.log(`  * 가드NG 페이지가 있습니다 — globals.css 전역 reduce 블록을 확인하세요.`);
  }
  if (rmInfiniteTotal > 0) {
    console.log(`  * infinite 잔존이 있습니다 — 가드의 animation-iteration-count:1 !important 적용 범위를 확인하세요.`);
  }
  console.log("═".repeat(60));

  await browser.close();

  // 종료 코드: axe critical > 0 이면 1 (게이트 실패) — reduced-motion 결과는 영향 없음
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
