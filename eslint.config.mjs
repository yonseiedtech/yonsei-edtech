import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

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
    // seed·유틸 스크립트는 Node(CJS) 실행용 — require() 정당. 브라우저 앱 규칙 적용 제외.
    files: ["scripts/**/*.{js,cjs,mjs,ts}"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
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
