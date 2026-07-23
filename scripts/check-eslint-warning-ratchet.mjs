/**
 * ESLint warnings 래칫(ratchet) 게이트.
 *
 * ESLint warning 건수가 CEILING 을 초과하면 exit 1 로 배포를 막는다.
 * (감소·동일 → 통과, 증가 → exit 1 차단)
 *
 * 동작 원리:
 *   - ESLint 를 JSON 포맷으로 실행해 warning 건수를 집계한다.
 *   - 현재 건수가 CEILING 을 초과하면 exit 1 — warning 부채가 조용히 늘어나는 경로를 봉쇄.
 *   - ESLint error(severity 2) 가 1건이라도 있으면 별도 exit 1 로 차단 (기존 동작 보존).
 *
 * CEILING 낮추는 법:
 *   1. warning 해소 배치 완료 후 이 스크립트를 실행.
 *   2. "CEILING 을 N 으로 낮출 수 있습니다" 메시지 출력 시 CEILING 상수를 N 으로 수정.
 *   3. 수정 후 커밋.
 *
 * 실행: node scripts/check-eslint-warning-ratchet.mjs
 * 체인: package.json prebuild 에서 check-rawcolor-ratchet 다음에 체인.
 *       (eslint 를 이 스크립트가 직접 실행하므로 prebuild 에서 별도 eslint 호출 불필요)
 */

import { execSync } from "node:child_process";

// ─────────────────────────────────────────────────────────────
// 래칫 상한 (ratchet ceiling) — 이 값을 초과하면 exit 1.
// warning 해소 후 이 수치를 낮춰 회귀 차단 수위를 높일 것.
// 2026-07-21 초기 설정: ESLint 400건
//   (react-hooks 5종 추정 · no-unescaped-entities 잔여)
// 2026-07-21 no-unescaped-entities 13파일 수정 후: 392 → 360
// 2026-07-23 hang 에이전트 정리(M7 되돌림)·러닝 가이드 경고 해소 후: 273 → 270
// ─────────────────────────────────────────────────────────────
const CEILING = 270;

// ── 1. ESLint 실행 (JSON 포맷) ───────────────────────────────
// execSync 사용 — ESLint 가 error 시 exit 1 을 던지므로 catch 로 stdout 수집.
let lintOutput = "";
try {
  lintOutput = execSync("npx eslint src --format json", {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
} catch (err) {
  // ESLint 가 warning/error 를 발견하면 exit 1 → catch 진입. stdout 에 JSON 있음.
  lintOutput = (err.stdout || "");
  if (!lintOutput.trim()) {
    console.error(
      "[eslint-ratchet] ERROR: ESLint 실행 실패 또는 출력 없음.\n" +
        (err.message || "")
    );
    process.exit(1);
  }
}

if (!lintOutput.trim()) {
  console.error("[eslint-ratchet] ERROR: ESLint 출력이 비어 있습니다.");
  process.exit(1);
}

// ── 2. JSON 파싱 ─────────────────────────────────────────────
let results;
try {
  results = JSON.parse(lintOutput);
} catch {
  console.error(
    "[eslint-ratchet] ERROR: ESLint JSON 출력 파싱 실패.\n" +
      "  출력 앞부분(200자):\n" +
      lintOutput.slice(0, 200)
  );
  process.exit(1);
}

// ── 3. errors / warnings 집계 ────────────────────────────────
let errors = 0;
let warnings = 0;
for (const file of results) {
  for (const msg of file.messages) {
    if (msg.severity === 2) errors++;
    else if (msg.severity === 1) warnings++;
  }
}

// ── 4. error 차단 ────────────────────────────────────────────
if (errors > 0) {
  console.error(
    `[eslint-ratchet] FAIL: ESLint error ${errors}건 발견 — 배포 차단.\n` +
      `  error 를 모두 수정한 뒤 다시 실행하세요.`
  );
  process.exit(1);
}

// ── 5. warning 래칫 비교 ─────────────────────────────────────
if (warnings > CEILING) {
  console.error(
    `[eslint-ratchet] FAIL: ESLint warning 회귀 감지 (${warnings}건 > 상한 ${CEILING}건, +${warnings - CEILING}건)\n` +
      `\n` +
      `  새로운 ESLint warning 이 추가됐습니다.\n` +
      `  조치 방법:\n` +
      `    A) 새 warning 을 해소(수정)한 뒤 재실행.\n` +
      `    B) 의도적 경우 해당 줄에 eslint-disable-next-line 주석 추가.`
  );
  process.exit(1);
} else if (warnings < CEILING) {
  console.log(
    `[eslint-ratchet] PASS (${warnings}건 / 상한 ${CEILING}건 — ${CEILING - warnings}건 감소)\n` +
      `\n` +
      `  ESLint warning ${CEILING - warnings}건 해소. 상한을 낮춰 회귀 차단 수위를 높이세요:\n` +
      `    scripts/check-eslint-warning-ratchet.mjs 의 CEILING 을 ${warnings} 로 수정 후 커밋.`
  );
} else {
  console.log(
    `[eslint-ratchet] PASS (${warnings}건 / 상한 ${CEILING}건 — 변동 없음)`
  );
}
