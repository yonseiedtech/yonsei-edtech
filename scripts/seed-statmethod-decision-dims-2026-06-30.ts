// Phase 0 — 통계방법 추천 마법사용 결정 차원 + 안정 seedKey 주입 (2026-06-30)
//  · 배경: 추천 마법사(/archive/method-finder)가 분기할 comparisonProfile 결정 차원
//    (groupCount·dependentVariableCount·independentVariableCount·designType)이 14개 문서 모두 비어 있음.
//    또 finder 코드가 방법을 안정적으로 참조할 seedKey 도 없음.
//  · 작업: ① seedKey("statistical-method:{slug}") 부여(없을 때만) ② comparisonProfile 결정 차원 병합.
//    기존 comparisonProfile 서술 필드(focus·strengthOneliner 등)와 그 외 모든 필드는 보존(merge).
//  · 멱등: 이미 동일 값이면 변경 없음. 재실행 안전.
// 실행: npx tsx scripts/seed-statmethod-decision-dims-2026-06-30.ts          (드라이런)
//       npx tsx scripts/seed-statmethod-decision-dims-2026-06-30.ts --apply  (적용)
//  ※ WSL: tsx 가 멈추면 CJS 컴파일 후 node 실행. preferRest 강제.
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const APPLY = process.argv.includes("--apply");
const UPDATED_BY = "system:method-finder-2026-06-30";
const COLLECTION = "archive_statistical_methods";

const sa = JSON.parse(
  Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_KEY!, "base64").toString("utf8"),
);
if (!getApps().length) initializeApp({ credential: cert(sa) });
const db = getFirestore();
db.settings({ preferRest: true });
const now = () => new Date().toISOString();

type Dims = {
  groupCount?: "single" | "two" | "three_or_more" | "varies";
  dependentVariableCount?: "one" | "two_or_more" | "varies";
  independentVariableCount?: "one" | "two_or_more" | "varies";
  designType?:
    | "between_subjects"
    | "within_subjects"
    | "mixed"
    | "single_sample"
    | "varies";
};

interface Plan {
  id: string;
  expectName: string;
  slug: string;
  dims?: Dims; // 없으면 seedKey 만 부여(개념/측정 항목)
}

// ID·name 은 2026-06-30 운영 DB 덤프 기준.
const PLANS: Plan[] = [
  {
    id: "AN0J5MCTXrnYnecZFpCG",
    expectName: "t-test (독립/대응표본)",
    slug: "t-test",
    dims: { groupCount: "two", dependentVariableCount: "one", independentVariableCount: "one", designType: "varies" },
  },
  {
    id: "fFMTfoMqj1TORoIYx4WW",
    expectName: "ANOVA (일원분산분석)",
    slug: "anova-oneway",
    dims: { groupCount: "three_or_more", dependentVariableCount: "one", independentVariableCount: "one", designType: "between_subjects" },
  },
  {
    id: "0ou2QLLxB29kVJxX7uoE",
    expectName: "ANCOVA (공분산분석)",
    slug: "ancova",
    dims: { groupCount: "varies", dependentVariableCount: "one", independentVariableCount: "varies", designType: "between_subjects" },
  },
  {
    id: "a7WasP6qJ3ttmnNRyIXF",
    expectName: "MANOVA (다변량분산분석)",
    slug: "manova",
    dims: { groupCount: "varies", dependentVariableCount: "two_or_more", independentVariableCount: "varies", designType: "between_subjects" },
  },
  {
    id: "RHga7zSozKjib0jZUJsR",
    expectName: "MANCOVA (다변량공분산분석)",
    slug: "mancova",
    dims: { groupCount: "varies", dependentVariableCount: "two_or_more", independentVariableCount: "varies", designType: "between_subjects" },
  },
  {
    id: "298GRmwUdn82lIruBfvz",
    expectName: "카이제곱 검정 (χ²)",
    slug: "chi-square",
    dims: { groupCount: "varies", dependentVariableCount: "one", independentVariableCount: "one", designType: "varies" },
  },
  {
    id: "L0VZKbiGtGzWfoxpo4U0",
    expectName: "상관분석",
    slug: "correlation",
    dims: { groupCount: "varies", dependentVariableCount: "varies", independentVariableCount: "varies", designType: "varies" },
  },
  {
    id: "NfpC7q3OXVQyaudBwAzu",
    expectName: "다중회귀분석",
    slug: "multiple-regression",
    dims: { groupCount: "varies", dependentVariableCount: "one", independentVariableCount: "two_or_more", designType: "varies" },
  },
  {
    id: "MOLbiZR2JQpR2r8NIDw6",
    expectName: "로지스틱회귀분석",
    slug: "logistic-regression",
    dims: { groupCount: "varies", dependentVariableCount: "one", independentVariableCount: "two_or_more", designType: "varies" },
  },
  {
    id: "IUuQ9O8OZ5MQLc8Um47s",
    expectName: "탐색적 요인분석(EFA)",
    slug: "efa",
    dims: { groupCount: "single", dependentVariableCount: "two_or_more", independentVariableCount: "one", designType: "varies" },
  },
  {
    id: "lEue6VnjF9SOyyU8O7f6",
    expectName: "확인적 요인분석(CFA)",
    slug: "cfa",
    dims: { groupCount: "single", dependentVariableCount: "two_or_more", independentVariableCount: "one", designType: "varies" },
  },
  {
    id: "w9VrCWUh81bsX1tsbqEJ",
    expectName: "구조방정식모형(SEM)",
    slug: "sem",
    dims: { groupCount: "varies", dependentVariableCount: "two_or_more", independentVariableCount: "two_or_more", designType: "varies" },
  },
  // 개념·측정 항목 — 결정 차원 부적합, seedKey 만 부여(finder 분류용)
  { id: "nCE3ggYzVXBngN2uytVT", expectName: "중심극한정리와 정규성", slug: "clt-normality" },
  { id: "xzmQZAs3dst8PfyaFLg8", expectName: "내용타당도지수(CVI)", slug: "cvi" },
];

function dimsEqual(a: Dims, b: Dims): boolean {
  const keys: (keyof Dims)[] = [
    "groupCount",
    "dependentVariableCount",
    "independentVariableCount",
    "designType",
  ];
  return keys.every((k) => a[k] === b[k]);
}

async function main() {
  let touched = 0;
  let unchanged = 0;
  let skipped = 0;

  for (const p of PLANS) {
    const ref = db.collection(COLLECTION).doc(p.id);
    const snap = await ref.get();
    if (!snap.exists) {
      console.log(`⚠ 건너뜀(없음): ${p.expectName} id=${p.id}`);
      skipped++;
      continue;
    }
    const data = snap.data() as {
      name?: string;
      seedKey?: string;
      comparisonProfile?: Record<string, unknown>;
    };
    if (data.name !== p.expectName) {
      console.log(`⚠ 건너뜀(이름 불일치): id=${p.id} 기대="${p.expectName}" 실제="${data.name}"`);
      skipped++;
      continue;
    }

    const seedKey = `statistical-method:${p.slug}`;
    const patch: Record<string, unknown> = {};
    const changes: string[] = [];

    if (!data.seedKey) {
      patch.seedKey = seedKey;
      changes.push(`+seedKey=${p.slug}`);
    }

    if (p.dims) {
      const existingCp = (data.comparisonProfile || {}) as Dims & Record<string, unknown>;
      const haveDims: Dims = {
        groupCount: existingCp.groupCount,
        dependentVariableCount: existingCp.dependentVariableCount,
        independentVariableCount: existingCp.independentVariableCount,
        designType: existingCp.designType,
      };
      if (!dimsEqual(haveDims, p.dims)) {
        patch.comparisonProfile = { ...existingCp, ...p.dims };
        changes.push(
          `+dims=${p.dims.groupCount}/${p.dims.dependentVariableCount}/${p.dims.independentVariableCount}/${p.dims.designType}`,
        );
      }
    }

    if (changes.length === 0) {
      console.log(`· 변경 없음: ${p.expectName}`);
      unchanged++;
      continue;
    }
    console.log(`~ 보강: ${p.expectName}  ${changes.join(" ")}`);
    touched++;
    if (APPLY) {
      patch.updatedAt = now();
      patch.updatedBy = UPDATED_BY;
      await ref.set(patch, { merge: true });
    }
  }

  console.log(
    `\n보강 ${touched} · 변경없음 ${unchanged} · 건너뜀 ${skipped}  ${
      APPLY ? "=== 적용 완료 ===" : "=== 드라이런 — --apply 로 저장 ==="
    }`,
  );
  console.log("※ comparisonProfile 서술 필드·기타 필드는 보존(merge).");
}

main().then(() => process.exit(0));
