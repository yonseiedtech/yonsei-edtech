/**
 * raw 색상 부채 회귀 차단 래칫(ratchet) 게이트.
 *
 * eslint-rawcolor-baseline.mjs 의 파일 수가 CEILING 을 초과하면 exit 1 로 배포를 막는다.
 * (감소·동일 → 통과, 증가 → exit 1 차단)
 *
 * 동작 원리:
 *   - 1차 방어: eslint.config.mjs no-restricted-syntax 가 baseline 에 없는 새 파일에서
 *               raw 팔레트(bg-red-500 등) 사용을 error 로 차단.
 *   - 2차 방어(이 스크립트): baseline 파일 목록 자체가 다시 늘어나는 것을 차단.
 *     즉, gen-rawcolor-baseline.mjs 재실행 후 파일 수가 CEILING 을 넘으면 prebuild 에서
 *     배포 차단 — 색상 부채가 조용히 누적되는 경로를 이중으로 봉쇄한다.
 *
 * CEILING 낮추는 법:
 *   1. 색상 마이그레이션 완료 후 node scripts/gen-rawcolor-baseline.mjs 재실행.
 *   2. 이 스크립트 실행 시 "CEILING 을 N 으로 낮출 수 있습니다" 메시지 출력.
 *   3. 아래 CEILING 상수를 출력된 N 으로 수정하고 커밋.
 *
 * 실행: node scripts/check-rawcolor-ratchet.mjs
 * 체인: package.json prebuild = "node scripts/check-rawcolor-ratchet.mjs && eslint"
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";

// ─────────────────────────────────────────────────────────────
// 래칫 상한 (ratchet ceiling) — 이 값을 초과하면 exit 1.
// 색상 부채 상환 후 이 수치를 낮춰 회귀 차단 수위를 높일 것.
// 최초 설정: 2026-07-20 기준 eslint-rawcolor-baseline.mjs 347 개.
// 2026-07-21 라운드7: 322 → 293 (board·mypage·networking·seminar·flashcard 정화)
// ─────────────────────────────────────────────────────────────
const CEILING = 293;

const __dirname = dirname(fileURLToPath(import.meta.url));
const baselinePath = join(__dirname, "..", "eslint-rawcolor-baseline.mjs");

// ── 1. baseline 파일 읽기 ──────────────────────────────────
let content;
try {
  content = readFileSync(baselinePath, "utf8");
} catch {
  console.error(
    "[ratchet] ERROR: eslint-rawcolor-baseline.mjs 를 찾을 수 없습니다.\n" +
      "         node scripts/gen-rawcolor-baseline.mjs 를 먼저 실행하세요."
  );
  process.exit(1);
}

// ── 2. export default [...]; 에서 배열 추출 ──────────────────
const marker = "export default ";
const markerIdx = content.indexOf(marker);
if (markerIdx === -1) {
  console.error(
    "[ratchet] ERROR: eslint-rawcolor-baseline.mjs 에서 'export default' 를 찾을 수 없습니다.\n" +
      "         gen-rawcolor-baseline.mjs 로 재생성 후 다시 실행하세요."
  );
  process.exit(1);
}

const arrayStr = content
  .slice(markerIdx + marker.length)
  .trim()
  .replace(/;\s*$/, "");

let files;
try {
  files = JSON.parse(arrayStr);
} catch {
  console.error(
    "[ratchet] ERROR: baseline 배열 파싱 실패. gen-rawcolor-baseline.mjs 로 재생성 후 다시 실행하세요."
  );
  process.exit(1);
}

// ── 3. 래칫 비교 ──────────────────────────────────────────
const current = files.length;

if (current > CEILING) {
  console.error(
    `[ratchet] FAIL: 색상 부채 회귀 감지 (${current}개 > 상한 ${CEILING}개, +${current - CEILING}개)\n` +
      `\n` +
      `  raw Tailwind 팔레트(bg-red-500 등)를 쓰는 파일이 상한보다 늘었습니다.\n` +
      `  조치 방법:\n` +
      `    A) 새 파일에서 raw 팔레트 제거 → 시맨틱 색상 토큰으로 대체 후 재생성.\n` +
      `    B) 불가피한 경우 해당 줄에 eslint-disable-next-line no-restricted-syntax 주석 추가\n` +
      `       (baseline 에 파일 자체를 추가하지 말 것 — 상한이 초과됩니다).\n` +
      `\n` +
      `  ※ gen-rawcolor-baseline.mjs 재실행으로 baseline 이 늘었다면,\n` +
      `     그 자체가 새 raw 색상 유입 신호입니다. 위 조치 후 재실행하세요.`
  );
  process.exit(1);
} else if (current < CEILING) {
  console.log(
    `[ratchet] PASS (${current}개 / 상한 ${CEILING}개 — ${CEILING - current}개 감소)\n` +
      `\n` +
      `  색상 부채 ${CEILING - current}개가 상환되었습니다. 상한을 낮춰 회귀 차단 수위를 높이세요:\n` +
      `    scripts/check-rawcolor-ratchet.mjs 의 CEILING 을 ${current} 로 수정 후 커밋.`
  );
} else {
  console.log(
    `[ratchet] PASS (${current}개 / 상한 ${CEILING}개 — 변동 없음)`
  );
}
