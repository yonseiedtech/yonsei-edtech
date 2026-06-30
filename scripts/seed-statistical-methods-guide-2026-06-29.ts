// 통계방법 교육자료(연구자입문, 2026-06-29 외부 세션 전달본) → 기존 archive_statistical_methods 보강
//  · 배경: 아카이브에 이미 14개 통계방법 문서가 큐레이트·게시되어 있음(중복 생성 금지).
//    전달 교육자료의 비중복 가치 = "검증된 APA7 출처 5종"인데, 기존 문서의 references 가 전부 비어 있음.
//  · 작업: 각 방법 문서의 빈 references[] 를 출처로 채우고, '중심극한정리와 정규성' 문서에
//    Kline(2015)·Curran et al.(1996) 왜도·첨도 기준(파일2 verbatim 근거)을 references + interpretationKeys 로 보강.
//  · 안전: 문서 ID + name 이중 확인. references 는 author+year 중복 없는 것만 추가(append).
//    interpretationKeys 는 동일 문장 없을 때만 추가. 그 외 큐레이트 필드는 일절 건드리지 않음(merge).
// 실행: npx tsx scripts/seed-statistical-methods-guide-2026-06-29.ts          (드라이런)
//       npx tsx scripts/seed-statistical-methods-guide-2026-06-29.ts --apply  (적용)
//  ※ WSL gRPC 행(hang) 회피 위해 preferRest 강제. 그래도 tsx 가 멈추면 Windows 노드에서 실행 권장.
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { randomUUID } from "node:crypto";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const APPLY = process.argv.includes("--apply");
const UPDATED_BY = "system:stats-guide-2026-06-29";
const COLLECTION = "archive_statistical_methods";

const sa = JSON.parse(
  Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_KEY!, "base64").toString("utf8"),
);
if (!getApps().length) initializeApp({ credential: cert(sa) });
const db = getFirestore();
db.settings({ preferRest: true });
const now = () => new Date().toISOString();

interface Ref {
  title: string;
  author: string;
  year: number;
  url?: string;
}

// ── 검증된 출처 5종(+ SEM 적합도 절단값 출처 Hu & Bentler) ──
const SRC: Record<string, Ref> = {
  tf: {
    title: "Using multivariate statistics (6th ed.). Pearson.",
    author: "Tabachnick, B. G., & Fidell, L. S.",
    year: 2013,
  },
  field: {
    title: "Discovering statistics using SPSS (3rd ed.). Sage.",
    author: "Field, A.",
    year: 2009,
  },
  cohen: {
    title:
      "Statistical power analysis for the behavioral sciences (2nd ed.). Lawrence Erlbaum Associates.",
    author: "Cohen, J.",
    year: 1988,
  },
  kline: {
    title: "Principles and practice of structural equation modeling (4th ed.). Guilford Press.",
    author: "Kline, R. B.",
    year: 2015,
  },
  curran: {
    title:
      "The robustness of test statistics to nonnormality and specification error in confirmatory factor analysis. Psychological Methods, 1(1), 16–29.",
    author: "Curran, P. J., West, S. G., & Finch, J. F.",
    year: 1996,
    url: "https://doi.org/10.1037/1082-989X.1.1.16",
  },
  hubentler: {
    title:
      "Cutoff criteria for fit indexes in covariance structure analysis. Structural Equation Modeling, 6(1), 1–55.",
    author: "Hu, L., & Bentler, P. M.",
    year: 1999,
    url: "https://doi.org/10.1080/10705519909540118",
  },
};

interface Target {
  id: string;
  expectName: string;
  refs: Ref[];
  appendKeys?: string[];
}

// ID·name 은 2026-06-29 운영 DB 덤프 기준(8개 대상 문서).
const TARGETS: Target[] = [
  { id: "0ou2QLLxB29kVJxX7uoE", expectName: "ANCOVA (공분산분석)", refs: [SRC.tf, SRC.field, SRC.cohen] },
  { id: "AN0J5MCTXrnYnecZFpCG", expectName: "t-test (독립/대응표본)", refs: [SRC.field, SRC.cohen] },
  { id: "a7WasP6qJ3ttmnNRyIXF", expectName: "MANOVA (다변량분산분석)", refs: [SRC.tf, SRC.field] },
  { id: "RHga7zSozKjib0jZUJsR", expectName: "MANCOVA (다변량공분산분석)", refs: [SRC.tf, SRC.field] },
  { id: "fFMTfoMqj1TORoIYx4WW", expectName: "ANOVA (일원분산분석)", refs: [SRC.field, SRC.cohen] },
  { id: "lEue6VnjF9SOyyU8O7f6", expectName: "확인적 요인분석(CFA)", refs: [SRC.kline, SRC.tf] },
  { id: "w9VrCWUh81bsX1tsbqEJ", expectName: "구조방정식모형(SEM)", refs: [SRC.kline, SRC.hubentler] },
  {
    id: "nCE3ggYzVXBngN2uytVT",
    expectName: "중심극한정리와 정규성",
    refs: [SRC.kline, SRC.curran, SRC.field],
    appendKeys: [
      "왜도·첨도 기준 — Kline(2015): |왜도|>3·|첨도|>10이면 비정규 우려(>20 더 심각). 단 |왜도|≤3·|첨도|≤10이라 해서 '정규'라 단정하지 않고 '심각하게 비정규적이지는 않다'까지만 말한다(Kline, 2015, p.77).",
      "대안 기준 — Curran et al.(1996): 왜도 2·첨도 7을 '중간 비정규', 3·21을 '심각 비정규'로 정의(고정 컷오프가 아니라 시뮬레이션 조건).",
    ],
  },
];

const refKey = (r: { author?: string; year?: number }) =>
  `${(r.author || "").toLowerCase()}|${r.year || ""}`;

async function main() {
  let touched = 0;
  let unchanged = 0;
  let skipped = 0;

  for (const t of TARGETS) {
    const ref = db.collection(COLLECTION).doc(t.id);
    const snap = await ref.get();
    if (!snap.exists) {
      console.log(`⚠ 건너뜀(문서 없음): ${t.expectName}  id=${t.id}`);
      skipped++;
      continue;
    }
    const data = snap.data() as {
      name?: string;
      references?: Array<{ author?: string; year?: number }>;
      interpretationKeys?: string[];
    };
    if (data.name !== t.expectName) {
      console.log(
        `⚠ 건너뜀(이름 불일치): id=${t.id} 기대="${t.expectName}" 실제="${data.name}" — 수동 확인`,
      );
      skipped++;
      continue;
    }

    // references: author+year 중복 없는 것만 append
    const existingRefs = Array.isArray(data.references) ? data.references : [];
    const have = new Set(existingRefs.map(refKey));
    const addRefs = t.refs.filter((r) => !have.has(refKey(r)));
    const mergedRefs = [
      ...existingRefs,
      ...addRefs.map((r) => ({ id: randomUUID(), ...r })),
    ];

    // interpretationKeys: 동일 문장 없을 때만 append
    const existingKeys = Array.isArray(data.interpretationKeys) ? data.interpretationKeys : [];
    const haveKeys = new Set(existingKeys);
    const addKeys = (t.appendKeys || []).filter((k) => !haveKeys.has(k));
    const mergedKeys = [...existingKeys, ...addKeys];

    if (addRefs.length === 0 && addKeys.length === 0) {
      console.log(`· 변경 없음: ${t.expectName} (refs/keys 이미 보유)`);
      unchanged++;
      continue;
    }

    const parts: string[] = [];
    if (addRefs.length) parts.push(`+출처 ${addRefs.length}건 [${addRefs.map((r) => `${r.author.split(",")[0]} ${r.year}`).join(", ")}]`);
    if (addKeys.length) parts.push(`+해석키 ${addKeys.length}건`);
    console.log(`~ 보강: ${t.expectName}  ${parts.join(" / ")}`);
    touched++;

    if (APPLY) {
      const patch: Record<string, unknown> = {
        references: mergedRefs,
        updatedAt: now(),
        updatedBy: UPDATED_BY,
      };
      if (addKeys.length) patch.interpretationKeys = mergedKeys;
      await ref.set(patch, { merge: true });
    }
  }

  console.log(
    `\n보강 ${touched} · 변경없음 ${unchanged} · 건너뜀 ${skipped}  ${
      APPLY ? "=== 적용 완료 ===" : "=== 드라이런 — --apply 로 저장 ==="
    }`,
  );
  console.log("※ references 외 큐레이트 필드(summary·description·assumptions·procedure 등)는 미변경.");
}

main().then(() => process.exit(0));
