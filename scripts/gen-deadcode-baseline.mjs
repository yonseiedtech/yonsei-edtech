/**
 * 데드코드(미사용 export) baseline 생성기.
 *
 * knip(v6) 으로 미사용 export·파일·타입을 스캔해 현재 상태를 baseline 으로 고정한다.
 * 이 스크립트는 "정리 강제" 가 아니라 "회귀 차단" 용도다:
 *   - 지금 상태를 baseline 으로 잠그고,
 *   - check-deadcode-ratchet.mjs 가 이후 증가분만 FAIL 로 차단한다.
 *
 * 실행: node scripts/gen-deadcode-baseline.mjs
 * 산출: scripts/deadcode-baseline.json
 *
 * 사용 시나리오:
 *   1) 데드코드 정리 후 → 재실행해 ceiling 을 낮춘다.
 *   2) 불가피한 미사용 export(동적 import·외부 SDK 콜백 등) →
 *      knip.json ignoreExportsUsedInFile 또는 @public 주석으로 제외.
 *
 * knip 허용 목록(자동 적용):
 *   - Next.js 예약 export: default(page/layout), generateMetadata,
 *     generateStaticParams, GET/POST/PUT/DELETE/PATCH/HEAD/OPTIONS(Route Handler)
 *   - ignoreExportsUsedInFile: true — 같은 파일 내 재사용은 미사용으로 집계 안 함
 */

import { execSync } from "node:child_process";
import { writeFileSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, "..");
const baselinePath = join(__dirname, "deadcode-baseline.json");

// ── 1. knip 실행 ───────────────────────────────────────────────
console.log("[deadcode-baseline] knip 실행 중 (약 20~30초)...");
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
  // knip 은 이슈 발견 시 exit 1 — stdout 에 JSON 결과는 있음
  raw = e.stdout || "";
  if (!raw.trim()) {
    console.error("[deadcode-baseline] ERROR: knip 실행 실패 또는 출력 없음.");
    console.error(e.stderr?.slice(0, 500) || "(stderr 없음)");
    process.exit(1);
  }
}

const elapsed = Date.now() - start;
console.log(`[deadcode-baseline] knip 완료 (${elapsed}ms)`);

// ── 2. JSON 파싱 ───────────────────────────────────────────────
let report;
try {
  report = JSON.parse(raw);
} catch {
  console.error("[deadcode-baseline] ERROR: knip JSON 파싱 실패.");
  console.error(raw.slice(0, 300));
  process.exit(1);
}

// ── 3. 이슈 집계 ──────────────────────────────────────────────
const issues = report.issues || [];
let unusedExports = 0;
let unusedFiles = 0;
let unusedTypes = 0;
const items = [];

for (const iss of issues) {
  for (const e of iss.exports || []) {
    unusedExports++;
    items.push({ file: iss.file, name: e.name, kind: "export", line: e.line });
  }
  for (const f of iss.files || []) {
    unusedFiles++;
    items.push({ file: f.name, name: null, kind: "unusedFile", line: null });
  }
  for (const t of iss.types || []) {
    unusedTypes++;
    items.push({ file: iss.file, name: t.name, kind: "type", line: t.line });
  }
}

items.sort(
  (a, b) =>
    a.file.localeCompare(b.file) || (a.name || "").localeCompare(b.name || "")
);

const ceiling = unusedExports + unusedFiles + unusedTypes;

// ── 4. 이전 ceiling 비교 안내 ─────────────────────────────────
let prevCeiling = null;
try {
  const prev = JSON.parse(readFileSync(baselinePath, "utf8"));
  prevCeiling = prev.ceiling;
} catch {
  // 최초 생성 시 무시
}

// ── 5. baseline 파일 저장 ─────────────────────────────────────
const baseline = {
  ceiling,
  generatedAt: new Date().toISOString().slice(0, 10),
  tool: "knip@6.27.0",
  note: "node scripts/gen-deadcode-baseline.mjs 로 재생성. ceiling보다 이슈 수가 늘면 check-deadcode-ratchet.mjs 가 exit 1.",
  unusedExports,
  unusedFiles,
  unusedTypes,
  items,
};

writeFileSync(baselinePath, JSON.stringify(baseline, null, 2) + "\n");

// ── 6. 결과 출력 ──────────────────────────────────────────────
console.log(
  `\n[deadcode-baseline] baseline 저장 완료 → scripts/deadcode-baseline.json`
);
console.log(
  `  총 이슈: ${ceiling}개 (미사용export ${unusedExports} + 미사용파일 ${unusedFiles} + 미사용type ${unusedTypes})`
);

if (prevCeiling !== null) {
  const diff = ceiling - prevCeiling;
  if (diff < 0) {
    console.log(
      `\n  ceiling ${prevCeiling} → ${ceiling} 으로 낮아졌습니다 (${Math.abs(diff)}개 감소). 회귀 차단 수위가 높아집니다.`
    );
  } else if (diff > 0) {
    console.log(
      `\n  WARNING: ceiling ${prevCeiling} → ${ceiling} 으로 높아졌습니다 (+${diff}개 증가).`
    );
    console.log(
      `           새 미사용 export 가 추가된 것입니다. 제거 후 재실행을 권장합니다.`
    );
  } else {
    console.log(`\n  ceiling 변동 없음 (${ceiling}개 유지).`);
  }
}

if (elapsed > 5000) {
  console.log(
    `\n  실행 시간 ${elapsed}ms — prebuild 편입 부적합 (5초 초과).`
  );
  console.log(`  npm run lint:deadcode 로 수동 실행하세요.`);
}
