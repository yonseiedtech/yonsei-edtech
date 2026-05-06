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
  ]),
  {
    rules: {
      // 디버그용 console.log 는 경고. console.warn/error 는 허용 (운영 로깅용).
      "no-console": ["warn", { allow: ["warn", "error"] }],
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
