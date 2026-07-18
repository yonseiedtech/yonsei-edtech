/**
 * raw Tailwind 팔레트(bg-red-500 등) 사용 파일 baseline 생성기.
 *
 * eslint.config.mjs 의 "raw 팔레트 신규 유입 차단" 규칙은 이 baseline 에 없는
 * 파일에만 error 로 적용된다(기존 부채 414+파일은 점진 상환). 색상 마이그레이션
 * 라운드에서 파일을 정리한 뒤 본 스크립트를 다시 실행하면 baseline 이 줄어든다.
 *
 * 실행: node scripts/gen-rawcolor-baseline.mjs
 * 산출: eslint-rawcolor-baseline.mjs (repo 루트)
 */
import { execSync } from "node:child_process";
import { writeFileSync } from "node:fs";

const PATTERN =
  "(bg|text|border)-(red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|slate|gray|zinc|neutral|stone)-[0-9]";

const out = execSync(
  `git grep -lE "${PATTERN}" -- "src/**/*.ts" "src/**/*.tsx"`,
  { encoding: "utf8", cwd: new URL("..", import.meta.url) },
);
const files = out
  .split(/\r?\n/)
  .map((s) => s.trim())
  .filter(Boolean)
  // eslint flat config 의 ignores 는 glob — 동적 라우트 경로의 [type]·[id] 대괄호가
  // 문자클래스로 해석되지 않도록 이스케이프한다.
  .map((p) => p.replace(/\[/g, "\\[").replace(/\]/g, "\\]"))
  .sort();

const banner = `/**
 * AUTO-GENERATED — node scripts/gen-rawcolor-baseline.mjs 로 재생성.
 * raw Tailwind 팔레트를 이미 쓰는 기존 파일 목록(부채 baseline).
 * 이 목록에 있는 파일은 차단 규칙에서 제외되고, 새 파일은 error 로 차단된다.
 * 색상 정리 라운드 후 재생성해 목록을 줄일 것. (생성 시점 ${files.length}개)
 */
export default ${JSON.stringify(files, null, 2)};
`;

writeFileSync(new URL("../eslint-rawcolor-baseline.mjs", import.meta.url), banner);
console.log(`baseline ${files.length}개 파일 기록 완료`);
