import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import rawColorBaseline from "./eslint-rawcolor-baseline.mjs";

/** raw Tailwind 팔레트 클래스 감지 정규식 (esquery용, scripts/gen-rawcolor-baseline.mjs 와 동일 계열) */
const RAW_COLOR_RE =
  "(bg|text|border)-(red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|slate|gray|zinc|neutral|stone)-[0-9]";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // 정적 자산·벤더링 번들은 린트 대상 아님 (public/pdfjs 의 미니파이 pdfjs 포함).
    "public/**",
    // 컴파일된 임시 seed 스크립트 산출물 — 소스 아님.
    ".seed-tmp/**",
  ]),
  {
    rules: {
      // 디버그용 console.log 는 경고. console.warn/error 는 허용 (운영 로깅용).
      "no-console": ["warn", { allow: ["warn", "error"] }],

      // ── React Compiler 대비 react-hooks v6 규칙 완화 (2026-07-16) ──
      // eslint-config-next 16 이 새로 error 로 켠 규칙들. 이 프로젝트는 React Compiler 를
      // 쓰지 않으며, effect 내 setState 동기화·수동 메모이제이션 등 정당한 패턴까지 error 로
      // 잡아 대량 오탐(109건)이 발생. 가시성은 유지하되 배포를 막지 않도록 warn 으로 완화한다.
      // ※ 실제 런타임 크래시(#310)를 유발하는 react-hooks/rules-of-hooks 는 기본값(error) 유지.
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/preserve-manual-memoization": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/immutability": "warn",
      // JSX 텍스트의 따옴표/아포스트로피 미이스케이프 — 렌더에는 무해한 코스메틱. warn 으로.
      "react/no-unescaped-entities": "warn",
    },
  },
  {
    // seed·유틸 스크립트는 Node(CJS) CLI 실행용 — require()·console.log 정당(진행 출력). 앱 규칙 제외.
    files: ["scripts/**/*.{js,cjs,mjs,ts}"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
      "no-console": "off",
    },
  },
  {
    // ── raw 팔레트 신규 유입 차단 (2026-07-17, v4-G⑥ 후속) ──
    // 색상 부채가 상환(마이그레이션)보다 빠르게 재생산되는 문제의 구조적 차단.
    // 기존 부채 파일(baseline, scripts/gen-rawcolor-baseline.mjs 로 재생성)은 제외하고,
    // "새 파일"에서 raw 팔레트(bg-red-500 등)를 쓰면 error → prebuild 게이트에서 배포 차단.
    // 새 파일은 시맨틱 색상 토큰(muted/primary/destructive 등 + dark: 대응)을 사용할 것.
    // 의도적 예외는 해당 줄에 eslint-disable-next-line no-restricted-syntax 주석으로 명시.
    files: ["src/**/*.{ts,tsx}"],
    ignores: rawColorBaseline,
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: `Literal[value=/${RAW_COLOR_RE}/]`,
          message:
            "raw Tailwind 팔레트 대신 시맨틱 색상 토큰을 사용하세요 (기존 부채 파일 목록은 eslint-rawcolor-baseline.mjs).",
        },
        {
          selector: `TemplateElement[value.raw=/${RAW_COLOR_RE}/]`,
          message:
            "raw Tailwind 팔레트 대신 시맨틱 색상 토큰을 사용하세요 (템플릿 문자열 포함).",
        },
      ],
    },
  },
  {
    // types-domain-split 회귀 방지:
    // 분리된 도메인 sub 파일끼리는 직접 경로(./<domain>)로 cross-import 해야 한다.
    // index.ts 또는 @/types 진입점을 우회하면 ESM circular re-export 위험이 생긴다.
    files: ["src/types/*.ts"],
    ignores: ["src/types/index.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "./index",
              message:
                "도메인 sub 파일에서는 ./index 우회 금지 — 필요한 타입을 가진 sub 파일을 직접 import 하세요.",
            },
            {
              name: "@/types",
              message:
                "도메인 sub 파일은 @/types 진입점 대신 ./<domain> 직접 경로를 사용하세요.",
            },
          ],
          patterns: [
            {
              group: ["@/types", "@/types/*"],
              message:
                "도메인 sub 파일은 @/types 또는 @/types/* 우회 대신 ./<domain> 직접 경로를 사용하세요.",
            },
          ],
        },
      ],
    },
  },
]);

export default eslintConfig;
