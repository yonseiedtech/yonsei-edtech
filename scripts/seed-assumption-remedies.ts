// 사이클 61 — 통계 가이드 "가정이 깨졌을 때 대처(ifViolated)" 주입 (사용자 요청)
//  · (a) string[] 가정 4종(카이제곱·상관·CLT·CVI)을 표준 객체 구조로 마이그레이션 (렌더 불일치 해소)
//  · (b) 전체 가이드의 각 가정에 ifViolated 추가 — 가정 이름 키워드 매칭 사전
//    내용은 통계학 표준 대처(Welch 보정·비모수 대체·Pillai's trace·Johnson-Neyman·VIF·
//    Fisher 정확검정·PAF·parceling 등) 재서술
//  · 멱등: 이미 ifViolated 있는 가정은 보존. 실행: npx tsx scripts/seed-assumption-remedies.ts [--apply]
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { randomUUID } from "node:crypto";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const APPLY = process.argv.includes("--apply");
const sa = JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_KEY!, "base64").toString("utf8"));
if (!getApps().length) initializeApp({ credential: cert(sa) });
const db = getFirestore();

interface Assumption {
  id: string;
  name: string;
  description: string;
  howToCheck?: string;
  threshold?: string;
  ifViolated?: string;
}

// ── (a) string[] → 객체 변환 테이블 (가이드명 → 원문 포함 변환) ──
const STRING_MIGRATIONS: Record<string, Assumption[]> = {
  "카이제곱 검정 (χ²)": [
    {
      id: randomUUID(),
      name: "기대빈도 충족",
      description: "기대빈도 5 미만 셀이 전체의 20% 이하여야 한다.",
      howToCheck: "교차표 출력에서 각 셀의 기대빈도 확인",
      ifViolated: "기대빈도 미달 셀이 많으면 인접 범주를 병합하거나 Fisher의 정확검정으로 전환한다.",
    },
    {
      id: randomUUID(),
      name: "관측치 독립성",
      description: "한 응답자는 한 셀에만 속해야 한다 (반복 응답 불가).",
      ifViolated: "동일 대상의 사전·사후 범주 변화라면 독립성이 깨진 것 — McNemar 검정으로 전환한다.",
    },
    {
      id: randomUUID(),
      name: "2×2 소표본 보정",
      description: "2×2 표는 연속성 수정 또는 Fisher 정확검정 검토가 필요하다.",
      ifViolated: "2×2 소표본에서는 Yates 연속성 수정값 또는 Fisher 정확검정 p값을 기본으로 보고한다.",
    },
  ],
  "상관분석": [
    {
      id: randomUUID(),
      name: "정규성 (Pearson)",
      description: "두 변인이 정규분포에 근사해야 Pearson r 해석이 안전하다.",
      howToCheck: "Shapiro-Wilk, 히스토그램·Q-Q 도표",
      ifViolated: "정규성 위반이나 서열 자료면 Spearman(또는 Kendall) 순위상관으로 전환해 보고한다.",
    },
    {
      id: randomUUID(),
      name: "선형 관계",
      description: "관계가 직선적이어야 한다 — 산점도로 먼저 확인.",
      howToCheck: "산점도 시각 확인",
      ifViolated: "곡선 관계면 Pearson r 이 관계를 과소추정한다 — 변수 변환이나 비선형 모형을 검토한다.",
    },
    {
      id: randomUUID(),
      name: "이상치 점검",
      description: "극단치 한두 개가 상관계수를 크게 왜곡할 수 있다.",
      howToCheck: "산점도·표준화 점수(|z|>3) 확인",
      ifViolated: "이상치 처리 기준(±3SD·IQR)을 정해 보고하고, Spearman 또는 robust 상관을 병행 보고해 결과의 안정성을 보인다.",
    },
  ],
  "중심극한정리와 정규성": [
    {
      id: randomUUID(),
      name: "표본 크기 (관례 n ≥ 30)",
      description: "집단별 표본이 30 이상이면 평균의 표집분포가 정규에 근사한다 (관례적 기준).",
      ifViolated: "n < 30이면 Shapiro-Wilk 등으로 정규성을 직접 확인하고, 위반 시 비모수 검정 또는 부트스트랩을 사용한다.",
    },
    {
      id: randomUUID(),
      name: "극단 이상치 부재",
      description: "극단적 이상치는 평균 기반 추론을 왜곡한다.",
      ifViolated: "이상치 판정 기준을 사전에 정해 보고하고, 포함/제외 두 분석의 민감도 비교를 제시한다.",
    },
  ],
  "내용타당도지수(CVI)": [
    {
      id: randomUUID(),
      name: "전문가 패널 전문성",
      description: "패널이 해당 내용 영역의 실질적 전문성을 갖춰야 한다 (통상 3~10인).",
      ifViolated: "전문성이 불충분한 평정은 사후 보정이 불가능하다 — 패널을 재구성해 재평정하는 것이 유일한 대처다.",
    },
    {
      id: randomUUID(),
      name: "평정 기준 동일 안내",
      description: "평정 척도와 '관련성' 정의를 전문가 모두에게 동일하게 안내해야 한다.",
      ifViolated: "안내가 상이했다면 표준화된 안내문으로 라운드를 재실시한다.",
    },
    {
      id: randomUUID(),
      name: "내용 영역 표집",
      description: "문항이 측정 구인의 내용 영역을 빠짐없이 표집하도록 사전 설계해야 한다.",
      ifViolated: "누락 영역이 발견되면 문항을 추가하고 해당 문항만 추가 평정을 받는다.",
    },
  ],
};

// ── (b) 가정 이름 키워드 → ifViolated 사전 (순서 = 우선순위, 구체적 키워드 먼저) ──
const REMEDY_RULES: { match: (name: string) => boolean; remedy: string }[] = [
  {
    match: (n) => n.includes("다변량 정규성") && n.includes("권장"),
    remedy: "최대우도(ML) 추출 대신 정규성에 덜 민감한 주축요인법(PAF)으로 추출 방법을 바꾼다.",
  },
  {
    match: (n) => n.includes("다변량 정규성"),
    remedy: "robust 추정(MLR)·부트스트랩을 사용하고, MANOVA 계열에서는 위반에 가장 견고한 Pillai's trace 를 기준 통계량으로 보고한다.",
  },
  {
    match: (n) => n.includes("회귀의 동질성"),
    remedy: "처치×공변인 상호작용이 유의하면 ANCOVA 부적합 — 상호작용을 포함한 모형으로 전환하고 Johnson-Neyman 기법으로 처치 효과가 유의한 공변인 구간을 보고한다.",
  },
  {
    match: (n) => n.includes("공분산행렬"),
    remedy: "Box's M 이 유의(위반)하면 Wilks' Λ 대신 Pillai's trace 로 판정하고, 가능하면 집단 크기를 비슷하게 설계한다.",
  },
  {
    match: (n) => n.includes("등분산"),
    remedy: "Welch 보정을 사용한다 — t-test 는 Welch's t, ANOVA 는 Welch ANOVA (jamovi·SPSS 기본 제공). 사후검정은 Games-Howell 을 쓴다.",
  },
  {
    match: (n) => n.includes("로짓"),
    remedy: "Box-Tidwell 검정으로 확인하고, 위반 시 연속 예측변인을 이론적 절단점으로 범주화하거나 스플라인을 적용한다.",
  },
  {
    match: (n) => n.includes("다중공선성"),
    remedy: "VIF 10 초과(보수적으로 5) 변수는 제거하거나 합성(요인 점수화)하고, 상호작용항은 평균중심화한다. 심하면 릿지 회귀를 검토한다.",
  },
  {
    match: (n) => n.includes("선형성"),
    remedy: "잔차도·산점도로 형태를 확인한 뒤 다항항 추가, 변수 변환, 스플라인 중 이론적으로 정당한 방법을 적용한다.",
  },
  {
    match: (n) => n.includes("정규성"),
    remedy: "① 집단당 n≥30이면 중심극한정리로 비교적 견고 ② 로그·제곱근 변환 ③ 비모수 대체(독립 2집단 Mann-Whitney U / 대응 Wilcoxon / 3집단+ Kruskal-Wallis) ④ 부트스트랩 신뢰구간 보고 중에서 선택한다.",
  },
  {
    match: (n) => n.includes("독립성"),
    remedy: "같은 학급 소속·반복 측정 등 관찰 간 의존은 사후 보정이 제한적이다 — 다층모형(MLM)이나 군집 robust 표준오차로 전환하고, 근본적으로는 표집 설계 단계에서 예방한다.",
  },
  {
    match: (n) => n.includes("표본 적절성"),
    remedy: "KMO < .60이면 표본을 확대하거나 상관이 낮은 문항을 정리한 뒤 재분석한다.",
  },
  {
    match: (n) => n.includes("변수 간 상관"),
    remedy: "Bartlett 구형성 검정이 비유의하면 요인분석 자체가 부적합하다 — 문항 구성을 재검토한다.",
  },
  {
    match: (n) => n.includes("충분한 표본"),
    remedy: "문항 묶기(parceling)로 추정 모수를 줄이거나 모형을 단순화하고, 소표본이면 베이지안 추정을 검토한다.",
  },
  {
    match: (n) => n.includes("모형 식별"),
    remedy: "요인당 관측지표를 3개 이상 확보하고 필요한 제약을 추가한다. 수정지수에 의한 사후 수정은 이론적으로 정당화될 때만 적용한다.",
  },
];

function findRemedy(name: string): string | null {
  for (const r of REMEDY_RULES) if (r.match(name)) return r.remedy;
  return null;
}

async function main() {
  const sm = await db.collection("archive_statistical_methods").get();
  let migrated = 0;
  let injected = 0;
  const unmatched: string[] = [];

  for (const d of sm.docs) {
    const x = d.data() as { name?: string; assumptions?: unknown[] };
    const gname = x.name ?? "";
    let assumptions: Assumption[];
    let changed = false;

    if (Array.isArray(x.assumptions) && x.assumptions.length > 0 && typeof x.assumptions[0] === "string") {
      const table = STRING_MIGRATIONS[gname];
      if (!table) {
        console.log(`⚠ string 가정인데 변환 테이블 없음: ${gname}`);
        continue;
      }
      assumptions = table;
      migrated += 1;
      changed = true;
      console.log(`~ 마이그레이션: ${gname} (${table.length}건 객체화)`);
    } else {
      assumptions = ((x.assumptions ?? []) as Assumption[]).map((a) => ({ ...a }));
    }

    for (const a of assumptions) {
      if (a.ifViolated?.trim()) continue;
      const remedy = findRemedy(a.name ?? "");
      if (remedy) {
        a.ifViolated = remedy;
        injected += 1;
        changed = true;
      } else if (a.name) {
        unmatched.push(`${gname} :: ${a.name}`);
      }
    }

    if (changed && APPLY) {
      await db.collection("archive_statistical_methods").doc(d.id).update({
        assumptions: assumptions as unknown as Record<string, unknown>[],
        updatedAt: new Date().toISOString(),
      });
    }
  }

  console.log(`\n마이그레이션 ${migrated}종 · ifViolated 주입 ${injected}건`);
  if (unmatched.length) console.log("미매칭 가정:", unmatched.join(" / "));
  console.log(APPLY ? "=== 적용 완료 ===" : "=== 드라이런 — --apply 로 저장 ===");
}
void main();
