/**
 * 데드코드 회귀 차단 래칫(ratchet) 게이트.
 *
 * knip(v6) 으로 현재 미사용 export·파일·타입 수를 산출하고
 * scripts/deadcode-baseline.json 의 ceiling 과 비교한다:
 *   - 증가 → exit 1 (신규 데드코드 유입 차단)
 *   - 감소·동일 → exit 0 PASS (+ 감소 시 baseline 낮추기 안내)
 *
 * 동작 원리:
 *   - gen-deadcode-baseline.mjs 로 현 시점을 baseline 으로 고정한다.
 *   - 이후 새 미사용 export 가 추가되면 이 스크립트가 FAIL 로 차단한다.
 *   - 기존 데드코드(baseline 내 항목)는 점진 정리 후 gen 재실행으로 ceiling 을 낮춘다.
 *
 * 실행 시간: ~20~30초 (knip 분석) — prebuild 에는 포함하지 않음.
 * prebuild 편입 기준: 5초 이내 (현재 미충족 — 독립 스크립트로만 운용).
 *
 * 실행: node scripts/check-deadcode-ratchet.mjs
 * 또는: npm run lint:deadcode
 *
 * knip 허용 목록(자동 적용):
 *   - Next.js 예약 export: default(page/layout), generateMetadata,
 *     generateStaticParams, GET/POST/PUT/DELETE/PATCH/HEAD/OPTIONS
 *   - ignoreExportsUsedInFile: true (knip.json)
 */

import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, "..");
const baselinePath = join(__dirname, "deadcode-baseline.json");

// ── 1. baseline 읽기 ───────────────────────────────────────────
let baseline;
try {
  baseline = JSON.parse(readFileSync(baselinePath, "utf8"));
} catch {
  console.error(
    "[deadcode-ratchet] ERROR: scripts/deadcode-baseline.json 를 찾을 수 없습니다.\n" +
      "         node scripts/gen-deadcode-baseline.mjs 를 먼저 실행하세요."
  );
  process.exit(1);
}

const CEILING = baseline.ceiling;

// ── 2. knip 실행 ───────────────────────────────────────────────
console.log(`[deadcode-ratchet] knip 실행 중 (ceiling: ${CEILING}개)...`);
const start = Date.now();

let raw = "";
try {
  raw = execSync("node node_modules/knip/bin/knip.js --reporter json", {
    encoding: "utf8",
    cwd: rootDir,
    timeout: 180000,
    stdio: ["pipe", "pipe", "pipe"],
  });
} catch (e) {
  raw = e.stdout || "";
  if (!raw.trim()) {
    console.error("[deadcode-ratchet] ERROR: knip 실행 실패 또는 출력 없음.");
    console.error(e.stderr?.slice(0, 500) || "(stderr 없음)");
    process.exit(1);
  }
}

const elapsed = Date.now() - start;

// ── 3. JSON 파싱 ───────────────────────────────────────────────
let report;
try {
  report = JSON.parse(raw);
} catch {
  console.error("[deadcode-ratchet] ERROR: knip JSON 파싱 실패.");
  console.error(raw.slice(0, 300));
  process.exit(1);
}

// ── 4. 이슈 집계 ──────────────────────────────────────────────
const issues = report.issues || [];
let unusedExports = 0;
let unusedFiles = 0;
let unusedTypes = 0;
const newItems = [];

for (const iss of issues) {
  for (const e of iss.exports || []) {
    unusedExports++;
    newItems.push({ file: iss.file, name: e.name, kind: "export" });
  }
  for (const f of iss.files || []) {
    unusedFiles++;
    newItems.push({ file: f.name, name: null, kind: "unusedFile" });
  }
  for (const t of iss.types || []) {
    unusedTypes++;
    newItems.push({ file: iss.file, name: t.name, kind: "type" });
  }
}

const current = unusedExports + unusedFiles + unusedTypes;

// ── 5. 래칫 비교 ──────────────────────────────────────────────
if (current > CEILING) {
  // 신규 항목 찾기 (baseline 에 없는 것)
  const baselineSet = new Set(
    (baseline.items || []).map((i) => `${i.file}::${i.name ?? ""}::${i.kind}`)
  );
  const novel = newItems.filter(
    (i) => !baselineSet.has(`${i.file}::${i.name ?? ""}::${i.kind}`)
  );

  console.error(
    `[deadcode-ratchet] FAIL: 데드코드 회귀 감지 (${current}개 > 상한 ${CEILING}개, +${current - CEILING}개)\n` +
      `\n` +
      `  미사용 export/파일/타입이 상한보다 늘었습니다.\n`
  );

  if (novel.length > 0) {
    console.error(`  신규 유입으로 추정되는 항목 (최대 20개):`);
    for (const item of novel.slice(0, 20)) {
      const loc = item.name ? `${item.file} — ${item.name}` : item.file;
      console.error(`    [${item.kind}] ${loc}`);
    }
    console.error("");
  }

  console.error(
    `  조치 방법:\n` +
      `    A) 신규 미사용 export 제거 또는 실제로 사용.\n` +
      `    B) 불가피한 경우(외부 SDK · 동적 import) knip.json 의 ignore 목록 추가.\n` +
      `    C) 데드코드 정리 완료 후 node scripts/gen-deadcode-baseline.mjs 재실행해 ceiling 갱신.\n` +
      `\n` +
      `  현재: export ${unusedExports} + file ${unusedFiles} + type ${unusedTypes} = ${current}개\n` +
      `  상한: ${CEILING}개 (scripts/deadcode-baseline.json ceiling)`
  );
  process.exit(1);
} else if (current < CEILING) {
  console.log(
    `[deadcode-ratchet] PASS (${current}개 / 상한 ${CEILING}개 — ${CEILING - current}개 감소)\n` +
      `\n` +
      `  데드코드 ${CEILING - current}개가 줄었습니다. ceiling 을 낮춰 회귀 차단 수위를 높이세요:\n` +
      `    node scripts/gen-deadcode-baseline.mjs   # ceiling 자동 갱신`
  );
} else {
  console.log(
    `[deadcode-ratchet] PASS (${current}개 / 상한 ${CEILING}개 — 변동 없음)`
  );
}

console.log(
  `\n  분석 완료: export ${unusedExports} + file ${unusedFiles} + type ${unusedTypes} = ${current}개 (${elapsed}ms)`
);
