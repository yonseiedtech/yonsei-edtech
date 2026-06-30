// 번역투 교육자료(2026-06-30 외부 세션 전달본) → archive_writing_tips 보강 (Tier 1: 데이터만)
//  · 배경: 사이트에 이미 22개 글쓰기 팁이 있음(번역투 7종 포함). 누락 패턴만 추가(중복 금지).
//    카테고리 enum 은 고정 5종 → 신규 5섹션(문장흐름·이론배경·AI탐지·인용오귀인 일부·voice)은
//    코드 변경+배포가 필요해 별도(Tier 2)로 보류. 본 스크립트는 기존 카테고리에 들어가는 카드만 시드.
//  · 출처: 군이러닝 논문 실전 검증 + 국립국어원·번역학계 웹 검증(전달 카드 데이터).
//  · 게이트: published=false (초안). 운영진 검수 후 콘솔에서 게시.
//  · 멱등: 같은 title 이 이미 있으면 건너뜀 + seedKey("writing-tip:{slug}") 로도 보호. 재실행 안전.
// 실행: npx tsx scripts/seed-writing-tips-translationese-2026-06-30.ts          (드라이런)
//       npx tsx scripts/seed-writing-tips-translationese-2026-06-30.ts --apply  (적용)
//  ※ WSL gRPC 행 회피 위해 preferRest 강제. tsx 가 멈추면 Windows 노드 또는 CJS 컴파일 실행.
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { randomUUID } from "node:crypto";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const APPLY = process.argv.includes("--apply");
const PUBLISHED = false; // 초안. true 로 바꾸면 즉시 공개.
const CREATED_BY = "system:translationese-guide-2026-06-30";
const COLLECTION = "archive_writing_tips";

const sa = JSON.parse(
  Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_KEY!, "base64").toString("utf8"),
);
if (!getApps().length) initializeApp({ credential: cert(sa) });
const db = getFirestore();
db.settings({ preferRest: true });
const now = () => new Date().toISOString();
const norm = (s: string) => s.replace(/\s+/g, "").toLowerCase();

interface Entry {
  slug: string;
  title: string;
  category: "translationese" | "tense-voice" | "academic-convention";
  wrongExample: string;
  correctExample: string;
  explanation: string;
  accessibleSummary?: string;
  tags?: string[];
  additionalExamples?: string[];
}

const ENTRIES: Entry[] = [
  // ── 번역투 (translationese) — 기존 7종 외 누락 패턴 ──
  {
    slug: "by-passive-to-active",
    title: "'~에 의해' 피동을 능동으로 (by)",
    category: "translationese",
    wrongExample: "특성에 의해 영향을 받는다. / 보물이 그 탐험가에 의해 발견됐다.",
    correctExample: "특성이 영향을 준다. / 그 탐험가가 보물을 발견했다.",
    explanation:
      "'~에 의해 + 피동'은 영어 'by + 수동태'의 직역인 경우가 많습니다. 행위 주체를 주어로 올리고 목적어·서술어를 재배치하면 능동으로 자연스러워집니다.",
    accessibleSummary: "'~에 의해' 문장은 대개 피동입니다. 누가 했는지를 주어로 올려 보세요.",
    tags: ["피동", "by", "능동전환"],
    additionalExamples: ["❌ 정책에 의해 결정되었다 → ✅ 정부가 정책으로 결정했다"],
  },
  {
    slug: "progressive-ing",
    title: "진행형 '~고 있다' 줄이기 (-ing)",
    category: "translationese",
    wrongExample: "요구가 커지고 있다. / 제도를 운영하고 있다.",
    correctExample: "요구가 커진다(커졌다). / 제도를 운영한다.",
    explanation:
      "영어 진행형(-ing)의 영향으로 '~고 있다'를 습관적으로 붙이는 경우가 많습니다. 실제 진행 중인 상태가 아니면 단순시제가 자연스럽습니다.",
    accessibleSummary: "정말 '지금 진행 중'일 때만 '~고 있다'. 아니면 '~한다/했다'.",
    tags: ["진행형", "-ing", "시제"],
    additionalExamples: ["❌ 증가하고 있는 추세이다 → ✅ 증가하는 추세이다"],
  },
  {
    slug: "there-is-exist",
    title: "'존재한다' 대신 '있다' (there is)",
    category: "translationese",
    wrongExample: "차이가 존재한다. / 가능성이 존재한다.",
    correctExample: "차이가 있다. / 가능성이 있다.",
    explanation:
      "'존재한다'는 영어 'there is/exist'의 번역투로 흔히 지적됩니다. 대부분 '있다'로 충분합니다.",
    accessibleSummary: "'존재한다'는 거의 '있다'로 바꿀 수 있습니다.",
    tags: ["there is", "존재한다", "간결"],
  },
  {
    slug: "one-of-the-most",
    title: "'~중 하나' 남용 줄이기 (one of the most)",
    category: "translationese",
    wrongExample: "대표적인 사례 중 하나이다. / 가장 중요한 요인 중 하나이다.",
    correctExample: "대표적인 사례이다. / 핵심 요인이다.",
    explanation:
      "'one of the most ~'의 직역입니다. 복수성을 굳이 강조할 필요가 없으면 단순하게 단정하는 편이 자연스럽습니다.",
    accessibleSummary: "꼭 '여럿 중 하나'를 강조할 게 아니면 '~이다'로 단정.",
    tags: ["one of", "중 하나", "간결"],
  },
  {
    slug: "can-overuse",
    title: "'~ㄹ 수 있다' 과용 (can)",
    category: "translationese",
    wrongExample: "(한 문단에 '확인할 수 있다 / 볼 수 있다'가 반복)",
    correctExample: "사실·결과는 단정한다('나타났다 / ~이다'). 단 능력·가능 용법은 정당하므로 유지.",
    explanation:
      "영어 'can'의 영향으로 '~ㄹ 수 있다'를 반복하면 글이 흐릿해집니다. 능력·가능을 뜻하는 정당한 용법은 그대로 두고, 사실·결과 진술의 습관적 반복만 단정형으로 바꿉니다.",
    accessibleSummary: "반복되는 '~할 수 있다'만 손보고, 진짜 '가능/능력'은 그대로.",
    tags: ["can", "가능", "과교정주의"],
  },
  {
    slug: "inanimate-subject",
    title: "무생물 주어를 사람·연구자 주어로",
    category: "translationese",
    wrongExample: "본 연구는 ~을 보여준다. / 이 결과는 ~을 시사한다.",
    correctExample: "본 연구에서는 ~을 밝혔다. / 이 결과를 통해 ~임을 알 수 있다.",
    explanation:
      "무생물(연구·결과)을 행위 주어로 세우는 것은 영어식입니다. 우리말은 사람·연구자를 주어로 두거나 무생물을 부사적으로 내리는 편이 자연스럽습니다. 결론·논의에서 특히 빈번합니다.",
    accessibleSummary: "'연구가 보여준다'보다 '연구에서 밝혔다'가 우리말답습니다.",
    tags: ["무생물주어", "결론", "재배치"],
    additionalExamples: ["❌ 이 표는 ~을 나타낸다 → ✅ 이 표에서 ~을 확인할 수 있다"],
  },
  {
    slug: "about-regarding",
    title: "'~에 대하여/~에 대한' 줄이고 목적격으로 (about)",
    category: "translationese",
    wrongExample: "다이어트 열풍에 대해 비판한다. / ~에 대한 고찰",
    correctExample: "다이어트 열풍을 비판한다. / ~를 고찰",
    explanation:
      "'about/regarding'의 직역 '~에 대하여/~에 대한'을 남용하면 군더더기가 됩니다. 목적격 조사('을/를')로 바로 받으면 간결해집니다.",
    accessibleSummary: "'~에 대해 비판'보다 '~을 비판'.",
    tags: ["about", "에 대한", "간결"],
  },
  {
    slug: "noun-ending-ham-im",
    title: "명사형 종결 '~함/~임' 피하기",
    category: "translationese",
    wrongExample: "본 논문의 목적은 ~을 분석하는 것임.",
    correctExample: "본 논문의 목적은 ~을 분석하는 것이다.",
    explanation:
      "개조식 명사형 종결('~함/~임')은 보고서 메모투입니다. 학술 본문에서는 서술형 '~이다/~한다'로 맺습니다.",
    accessibleSummary: "본문은 '~임' 말고 '~이다'로.",
    tags: ["명사형종결", "개조식", "문체"],
  },
  {
    slug: "due-to",
    title: "'~로 인한/인하여' 줄이기 (due to)",
    category: "translationese",
    wrongExample: "제약으로 인하여 발생한다. / ~로 인한 문제",
    correctExample: "제약으로 발생한다. / ~ 때문에 / ~로 발생하는 문제",
    explanation:
      "'due to/caused by'의 직역입니다. '~로', '~ 때문에' 등으로 바꾸면 간결합니다.",
    accessibleSummary: "'~로 인하여'는 대개 '~로/때문에'로 충분.",
    tags: ["due to", "로 인한", "간결"],
  },
  {
    slug: "the-fact-that",
    title: "'~라는 사실은' 군더더기 제거 (the fact that)",
    category: "translationese",
    wrongExample: "~라는 사실은 ~을 의미한다.",
    correctExample: "~는 ~을 의미한다.",
    explanation:
      "'the fact that'의 직역 '~라는 사실'은 대개 군더더기입니다. 빼도 뜻이 그대로입니다.",
    accessibleSummary: "'~라는 사실' 빼도 문장이 멀쩡합니다.",
    tags: ["the fact that", "라는 사실", "군더더기"],
  },
  {
    slug: "empty-verb-provide-conduct",
    title: "빈 동사 '제공한다/수행한다' 대신 직접 동사 (provide/conduct)",
    category: "translationese",
    wrongExample: "~에 대한 논의를 제공한다. / 연구를 수행하였다.",
    correctExample: "~를 논의한다. / ~를 연구하였다.",
    explanation:
      "'provide/conduct + 명사'의 직역은 동사를 명사로 비우는 표현입니다. 동사로 직접 서술하면 간결하고 또렷합니다.",
    accessibleSummary: "'논의를 제공한다'보다 '논의한다'.",
    tags: ["provide", "conduct", "동사화"],
  },
  {
    slug: "sikida-causative",
    title: "'~시키다' 남용 (make/cause)",
    category: "translationese",
    wrongExample: "향상시키다 / 증가시키다 (불필요할 때)",
    correctExample: "향상하다(높이다) / 증가하다 — 단 자연스러운 사동은 유지",
    explanation:
      "'make/cause'의 영향으로 '~시키다'를 남발하면 어색합니다. 직접 동사로 바꾸되, '입학시키다'처럼 자연스러운 사동은 그대로 둡니다.",
    accessibleSummary: "굳이 '시키다'가 아니어도 되면 직접 동사로. 단 과교정 주의.",
    tags: ["사동", "시키다", "과교정주의"],
  },
  {
    slug: "ja-no-baai",
    title: "'~의 경우' 남용 줄이기 (일본어투)",
    category: "translationese",
    wrongExample: "학습자의 경우 동기가 중요하다.",
    correctExample: "학습자는 동기가 중요하다. / 학습자에게 동기는 중요하다.",
    explanation:
      "일본어투 '~の場合'의 영향으로 '~의 경우'를 습관적으로 붙이는 경우가 많습니다. 빼거나 조사로 바꾸면 간결합니다.",
    accessibleSummary: "'~의 경우'는 빼도 되는 자리가 많습니다.",
    tags: ["일본어투", "의 경우", "남용"],
  },
  {
    slug: "ja-jeok-hwa",
    title: "'~적(的)/~화(化)' 절제 (일본어투)",
    category: "translationese",
    wrongExample: "교육적 효과를 극대화 (과도한 '~적/~화' 연쇄)",
    correctExample: "교육 효과를 크게 높임 — 꼭 필요할 때만 '~적/~화'",
    explanation:
      "'~적/~화'는 일본어식 조어의 영향으로 남용되기 쉽습니다. 꼭 필요한 곳만 남기고 풀어 쓰면 또렷해집니다.",
    accessibleSummary: "'~적/~화'가 줄줄이면 한두 개는 풀어 쓰기.",
    tags: ["일본어투", "적", "화"],
  },
  {
    slug: "restructure-principle",
    title: "번역투 교정의 핵심 — 단어가 아니라 문장을 재배치",
    category: "translationese",
    wrongExample: "피동·무생물주어·'~를 통해'를 조사 하나만 바꿔 억지로 고치기",
    correctExample: "주어·목적어·서술어를 재배치 (무생물 주어를 부사로 내리고 사람·기관을 주어로)",
    explanation:
      "피동, 무생물 주어, '~를 통해' 같은 번역투는 단어·조사 하나로는 안 풀릴 때가 많습니다. 문장의 주어·목적어·서술어 구조를 다시 짜야 자연스러워집니다.",
    accessibleSummary: "번역투는 '단어 교체'가 아니라 '문장 재배치'로 풉니다.",
    tags: ["재구성", "심화", "원칙"],
  },
  {
    slug: "overcorrection-caution",
    title: "과교정 주의 — 번역투처럼 보여도 그대로 두는 표현",
    category: "translationese",
    wrongExample: "패턴이라고 '~것으로 나타났다 / ~하였을 때 / ~ㄹ 수 있다(능력)'까지 전부 고치기",
    correctExample:
      "결과보고 '~것으로 나타났다', 시간 '~하였을 때', 능력 '~ㄹ 수 있다'는 정당 → 유지. 반복·발표체·직역만 손대기",
    explanation:
      "패턴 적출은 '재료'일 뿐 전부 오류가 아닙니다. 표준 결과보고나 정당한 가능·시간 표현까지 '0으로 만들기'는 오히려 부자연스럽고 AI 티가 납니다. 밀도·반복·발표체만 실제 문제로 봅니다.",
    accessibleSummary: "다 바꾸면 오히려 어색·AI 티. 반복·발표체·직역만 고칩니다.",
    tags: ["과교정주의", "정당용법", "AI탐지"],
  },
  // ── 시제·태 (tense-voice) ──
  {
    slug: "presentation-hedge",
    title: "발표체 헤지 줄이기 — 사실은 단정",
    category: "tense-voice",
    wrongExample: "~로도 설명할 수 있다 / ~로 볼 수 있다 / 확인할 수 있다 (발표문 같은 친절체)",
    correctExample: "사실·정의·결과는 단정한다 ('~이다 / ~을 보여준다 / ~로 나타났다')",
    explanation:
      "구어 발표체의 헤지('~로 볼 수 있다')를 학술 본문에 반복하면 주장이 흐려집니다. 사실·정의·결과는 단정하고, 추정·무효과 등 불확실한 진술만 보수적으로 헤지합니다.",
    accessibleSummary: "확실한 건 단정, 불확실한 것만 '~로 보인다'.",
    tags: ["발표체", "헤지", "시제태"],
  },
  // ── 학술 관례 (academic-convention) ──
  {
    slug: "citation-misattribution",
    title: "인용 오귀인 방지 — 원문이 측정한 구인 그대로 인용",
    category: "academic-convention",
    wrongExample: "'효능감 연구'라며 실제로는 학습지속의도를 측정한 논문을 인용",
    correctExample: "원문이 측정한 변인·대상·연도를 확인하고, 그 구인 그대로 귀속해 인용",
    explanation:
      "원저가 실제 측정한 구인과 다르게 인용하면 오귀인이 됩니다. 인용 전에 원문의 측정 변인·대상·연도를 대조해 정확히 귀속합니다.",
    accessibleSummary: "그 논문이 '진짜 무엇을 쟀는지' 확인하고 인용.",
    tags: ["인용", "오귀인", "연구윤리"],
  },
  {
    slug: "intext-reflist-consistency",
    title: "본문 내주 ↔ 참고문헌 목록 정합 (그리고 원문 보유)",
    category: "academic-convention",
    wrongExample: "내주만 있고 목록에 없음(dangling) / 목록만 있고 본문 미인용 / 미확보 문헌 인용",
    correctExample: "내주↔목록 1:1 일치(누락·미인용 0), 인용 문헌은 원문 확보 후 인용",
    explanation:
      "본문 내주와 참고문헌 목록은 1:1로 맞아야 합니다(매달린 인용·미인용 0). AI 의심 시대에는 근거 제시가 요구되므로, 확보하지 못한 문헌의 인용은 환각 위험이 있어 피합니다.",
    accessibleSummary: "내주와 목록을 1:1로 맞추고, 안 본 문헌은 인용하지 않기.",
    tags: ["인용", "참고문헌", "정합성"],
  },
  {
    slug: "avoid-textbook-listing",
    title: "정의 나열(텍스트북) 대신 인과·흐름 — 인용은 해석으로 닫기",
    category: "academic-convention",
    wrongExample: "A는 ~다. B는 ~다. C는 ~다. (백과사전식 정의 나열) / 인용을 나열로 끝내기",
    correctExample: "정의를 인과·흐름으로 엮고, 인용 뒤에 해석 한 문장으로 닫기('이는 ~을 보여준다')",
    explanation:
      "정의만 옮겨 적는 백과사전식 서술은 텍스트북투입니다. 개념을 인과·흐름으로 엮고, 인용은 나열로 끝내지 말고 본인 해석으로 닫아야 논증이 됩니다.",
    accessibleSummary: "정의 나열 금지. 인용 뒤엔 '그래서 무엇'을 한 문장 붙이기.",
    tags: ["텍스트북회피", "논증", "인용"],
  },
];

async function main() {
  const snap = await db.collection(COLLECTION).get();
  const titles = new Set<string>();
  const seedKeys = new Set<string>();
  for (const d of snap.docs) {
    const x = d.data() as { title?: string; seedKey?: string };
    if (x.title) titles.add(norm(x.title));
    if (x.seedKey) seedKeys.add(x.seedKey);
  }

  let created = 0;
  let skipped = 0;
  const byCat: Record<string, number> = {};

  for (const e of ENTRIES) {
    const seedKey = `writing-tip:${e.slug}`;
    if (titles.has(norm(e.title)) || seedKeys.has(seedKey)) {
      console.log(`· 건너뜀(이미 존재): [${e.category}] ${e.title}`);
      skipped++;
      continue;
    }
    console.log(`+ 신규: [${e.category}] ${e.title}`);
    byCat[e.category] = (byCat[e.category] || 0) + 1;
    created++;

    if (APPLY) {
      const { slug, additionalExamples, ...rest } = e;
      void slug;
      await db.collection(COLLECTION).add({
        ...rest,
        additionalExamples: (additionalExamples || []).map((text) => ({
          id: randomUUID(),
          text,
        })),
        published: PUBLISHED,
        seedKey,
        createdBy: CREATED_BY,
        createdAt: now(),
        updatedAt: now(),
      });
    }
  }

  const catStr = Object.entries(byCat)
    .map(([c, n]) => `${c} ${n}`)
    .join(" · ");
  console.log(
    `\n신규 ${created} (${catStr}) · 건너뜀 ${skipped}  published=${PUBLISHED}  ${
      APPLY ? "=== 적용 완료 ===" : "=== 드라이런 — --apply 로 저장 ==="
    }`,
  );
}

main().then(() => process.exit(0));
