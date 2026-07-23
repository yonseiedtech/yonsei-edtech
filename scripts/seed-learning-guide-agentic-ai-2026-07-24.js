// 러닝 가이드 시드 — 연구자를 위한 에이전틱 AI 입문 (2026-07-24)
//  · 오리지널 집필 콘텐츠(외부 워크샵 자료 비복제) · status: "draft"
//  · 쓰기 rules Admin 전용 → Admin SDK 로 시드
//  · 멱등: slug "agentic-ai-for-researchers" 존재 시 건너뜀
//  · 실행: node scripts/seed-learning-guide-agentic-ai-2026-07-24.js [--apply]
require("dotenv").config({ path: ".env.local" });
const { initializeApp, cert, getApps } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

const APPLY = process.argv.includes("--apply");
const sa = JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_KEY, "base64").toString("utf8"));
if (!getApps().length) initializeApp({ credential: cert(sa) });
const db = getFirestore();
db.settings({ preferRest: true });

const SLUG = "agentic-ai-for-researchers";
const AUTHOR_ID = "seed-agentic-ai";
const AUTHOR_NAME = "연세교육공학회 운영팀";

const GUIDE = {
  title: "연구자를 위한 에이전틱 AI 입문",
  slug: SLUG,
  subtitle: "자율형 AI를 연구 워크플로우에 들이기",
  coverEmoji: "🤖",
  category: "연구도구",
  description:
    "에이전틱 AI의 개념부터 연구 활용, 도구 환경, 책임 있는 사용까지 — 연구자가 자율형 AI를 안전하고 효과적으로 활용하도록 돕는 입문 가이드입니다.",
  tags: ["AI", "에이전트", "연구방법", "도구"],
  visibility: "member",
  status: "draft",
};

const CHAPTERS = [
  {
    title: "에이전틱 AI란 무엇인가",
    pages: [
      {
        anchor: "chatbot-to-agent",
        title: "챗봇에서 에이전트로",
        body: `## 챗봇에서 에이전트로

우리가 익숙한 **생성형 챗봇**은 질문 하나에 답 하나를 돌려주는 방식입니다. 반면 **에이전틱 AI(AI 에이전트)** 는 목표를 받으면 스스로 **계획을 세우고 → 도구를 사용하고 → 결과를 점검하며 여러 단계를 반복**해 과제를 끝까지 밀고 나가는 시스템을 말합니다.

핵심 차이는 **자율성**입니다.

- **챗봇**: 사람이 매 단계 지시. 한 번의 입력 → 한 번의 출력.
- **에이전트**: 사람이 목표만 제시. 중간 단계(검색·계산·파일 수정 등)를 스스로 결정하고 실행.

자율성은 스위치가 아니라 **스펙트럼**입니다. "제안만 하는" 수준부터 "승인 없이 실행하는" 수준까지 단계가 있으며, 연구에서는 **어느 단계까지 위임할지**를 의식적으로 정하는 것이 중요합니다.`,
      },
      {
        anchor: "why-now",
        title: "왜 지금 주목하나",
        body: `## 왜 지금 주목하나

에이전트라는 개념은 오래됐지만, 최근 실용 단계로 들어선 데에는 세 가지 배경이 있습니다.

- **도구 사용(tool use)**: 모델이 검색·코드 실행·파일 편집 같은 외부 도구를 호출할 수 있게 되면서, 말만 하는 것을 넘어 **실제 작업**을 수행합니다.
- **긴 컨텍스트**: 한 번에 다룰 수 있는 정보량이 커져, 논문 여러 편이나 긴 코드베이스를 통째로 두고 작업할 수 있습니다.
- **계획 능력**: 복잡한 과제를 하위 단계로 쪼개고 스스로 순서를 잡는 능력이 향상됐습니다.

연구자 입장에서 이는 **반복적이고 시간이 많이 드는 작업**(자료 정리, 표 작성, 코드 초안 등)을 위임하고, 사람은 **판단과 해석**에 집중할 여지가 생겼음을 뜻합니다. 다만 뒤에서 다루듯, 위임에는 **검증 책임**이 따라옵니다.`,
      },
    ],
  },
  {
    title: "연구 워크플로우에 활용하기",
    pages: [
      {
        anchor: "use-cases",
        title: "어디에 쓰나",
        body: `## 어디에 쓰나

에이전틱 AI는 연구 과정의 여러 지점에서 **보조자**로 쓸 수 있습니다. 각 단계에서 "에이전트가 하는 일"과 "사람이 지키는 통제점"을 함께 봅니다.

- **문헌 탐색·요약** — 관련 연구를 찾아 정리. → 통제점: 실제 존재하는 문헌인지·인용이 정확한지 사람이 확인.
- **데이터 정리·전처리** — 형식 변환, 결측 처리 초안. → 통제점: 변환 규칙이 분석 가정에 맞는지 검토.
- **분석 코드 초안** — 통계·시각화 코드 뼈대 생성. → 통제점: 결과를 소규모로 재현·검증.
- **표·그림 초안** — 결과표·도식 초안. → 통제점: 수치·라벨 원자료 대조.
- **학술 글쓰기 보조** — 구조 잡기, 표현 다듬기. → 통제점: 주장·근거의 정확성과 저자 목소리 유지.
- **반복 작업 자동화** — 파일 정리, 형식 통일 등. → 통제점: 되돌릴 수 있는 환경에서 실행.

공통 원칙: **에이전트는 초안을 빠르게, 사람은 최종 판단을**.`,
      },
      {
        anchor: "prompting-review",
        title: "좋은 지시와 검수",
        body: `## 좋은 지시와 검수

에이전트의 결과 품질은 **지시를 얼마나 명확히 주고, 중간 산출물을 얼마나 잘 점검하느냐**에 크게 좌우됩니다.

**좋은 지시의 조건**

- 과제를 **작은 단계로 쪼개** 제시한다("논문을 요약해줘"보다 "이 논문의 연구문제·방법·주요 결과를 각 2문장으로").
- **근거와 출처를 요구**한다("주장마다 해당 페이지·인용을 함께").
- **형식과 제약을 명시**한다(길이·용어·금지사항).

**검수의 습관**

- 중간 산출물을 **단계마다 확인**하고, 틀린 방향이면 일찍 교정한다.
- 사실·수치·인용은 **원자료와 대조**한다.
- 최종 판단과 책임은 **사람**에게 있다 — 에이전트의 자신감 있는 어투를 정확성의 근거로 착각하지 않는다.

> 요약: **맡기되, 검증은 사람이.** 이 원칙 하나가 대부분의 위험을 줄여 줍니다.`,
      },
    ],
  },
  {
    title: "도구와 환경 이해하기",
    pages: [
      {
        anchor: "tool-anatomy",
        title: "에이전트형 도구의 구성",
        body: `## 에이전트형 도구의 구성

도구는 계속 바뀌므로, 특정 제품의 설치 절차보다 **공통 구성요소**를 이해하는 편이 오래갑니다.

- **대화형 도구 vs 에이전트형 도구** — 전자는 주로 답변을, 후자는 실제 파일·코드·작업 실행을 다룹니다.
- **실행 환경** — 로컬 컴퓨터에서 도는지, 클라우드에서 도는지. 데이터가 어디에 놓이는지와 직결됩니다.
- **모델 선택** — 같은 도구라도 속도·정확도·비용이 다른 모델을 고를 수 있습니다.
- **인증 키(API key)** — 도구가 모델에 접근하기 위한 열쇠. 개인 자격이므로 **공유·노출 금지**.
- **작업 폴더·컨텍스트** — 에이전트가 읽고 쓰는 범위. 범위를 좁게 두면 사고를 줄일 수 있습니다.

이 구성만 파악하면 새 도구가 나와도 "무엇을·어디서·어떤 권한으로" 돌리는지 빠르게 가늠할 수 있습니다.`,
      },
      {
        anchor: "getting-ready",
        title: "시작 전 준비",
        body: `## 시작 전 준비

본격적으로 쓰기 전에 다음을 점검하면 안전합니다.

- **비용 개념** — 대부분 **사용량 기반 과금**입니다. 소규모로 시작하고, 조직 계정이라면 **지출 한도**를 설정합니다.
- **데이터 흐름 확인** — 입력한 자료가 **어디로 전송·저장되는지** 확인합니다. 미공개 데이터·개인정보는 특히 주의(다음 장 참고).
- **안전한 실험 환경** — 되돌릴 수 있는 **테스트 폴더/사본**에서 먼저 시도합니다. 원본 데이터·문서에 바로 적용하지 않습니다.
- **작은 성공부터** — 익숙한 작은 과제로 도구의 습성을 익힌 뒤 범위를 넓힙니다.

> 준비의 핵심은 "**되돌릴 수 있는 상태에서, 데이터가 어디로 가는지 알고, 비용을 통제하며** 시작하기"입니다.`,
      },
    ],
  },
  {
    title: "책임 있는 사용",
    pages: [
      {
        anchor: "accuracy",
        title: "정확성과 재현성",
        body: `## 정확성과 재현성

에이전트는 그럴듯하지만 **틀린 내용(환각, hallucination)** 을 만들 수 있습니다. 연구에서는 이것이 치명적이므로 다음을 지킵니다.

- **출처 교차검증** — 인용·수치·사실은 항상 원자료로 확인합니다. 존재하지 않는 문헌을 만들어내는 경우가 있습니다.
- **재현 가능하게 기록** — 사용한 **프롬프트·모델·설정·버전·날짜**를 남깁니다. 같은 입력이 항상 같은 출력을 주지는 않으므로, 결과의 맥락을 기록해야 재현·검증이 가능합니다.
- **검증 의무** — AI가 생성한 코드·분석·문장을 논문에 쓰려면, 그 정확성에 대한 책임은 **연구자 본인**에게 있습니다.

정확성은 속도와 맞바꾸지 않습니다 — 빠른 초안 뒤에 **사람의 검증**이 반드시 따라와야 합니다.`,
      },
      {
        anchor: "ethics",
        title: "윤리·프라이버시·저작권",
        body: `## 윤리·프라이버시·저작권

도구를 쓰기 전에 **규범과 정책**을 확인하는 것이 연구자의 책임입니다.

- **데이터 프라이버시** — 미공개 연구 데이터, 개인정보, 기관 기밀은 외부 도구에 **함부로 입력하지 않습니다**. 필요 시 비식별화하거나 로컬 환경을 사용합니다.
- **기관·저널 정책** — 소속 기관과 투고 저널의 **AI 사용 정책**을 확인합니다. 많은 저널이 AI 사용 **고지**를 요구합니다.
- **저작권·표절** — 생성물을 그대로 자기 글로 제출하는 것은 위험합니다. **출처와 기여를 명시**하고, 타인의 저작물을 재가공해 출처를 지우는 일은 하지 않습니다.
- **투명한 고지** — 연구·강의·발표에서 AI를 어떻게 썼는지 **투명하게 밝히는** 태도가 신뢰를 만듭니다.

> 기술은 빠르게 바뀌지만, **정직·투명·검증**이라는 연구 규범은 그대로입니다. 도구는 그 규범 안에서 쓰일 때 가장 강력합니다.`,
      },
    ],
  },
];

(async () => {
  const now = new Date().toISOString();
  const dup = await db.collection("learning_guides").where("slug", "==", SLUG).limit(1).get();
  if (!dup.empty) {
    console.log(`skip (이미 존재): slug="${SLUG}" id=${dup.docs[0].id}`);
    process.exit(0);
  }

  const totalPages = CHAPTERS.reduce((n, c) => n + c.pages.length, 0);
  console.log(`${APPLY ? "APPLY" : "DRY-RUN"} — 가이드 1 / 챕터 ${CHAPTERS.length} / 페이지 ${totalPages}`);
  console.log(`  제목: ${GUIDE.title} (status=${GUIDE.status}, visibility=${GUIDE.visibility})`);
  CHAPTERS.forEach((c, i) =>
    console.log(`  [챕터 ${i + 1}] ${c.title} — 페이지 ${c.pages.map((p) => p.title).join(", ")}`),
  );

  if (!APPLY) {
    console.log("\n(dry-run) 실제 발행하려면 --apply 를 붙여 실행하세요.");
    process.exit(0);
  }

  const guideRef = await db.collection("learning_guides").add({
    ...GUIDE,
    authorId: AUTHOR_ID,
    authorName: AUTHOR_NAME,
    chapterCount: CHAPTERS.length,
    createdAt: now,
    updatedAt: now,
  });
  console.log(`✅ 가이드 생성: ${guideRef.id}`);

  for (let ci = 0; ci < CHAPTERS.length; ci++) {
    const ch = CHAPTERS[ci];
    const chRef = await db.collection("guide_chapters").add({
      guideId: guideRef.id,
      title: ch.title,
      order: ci,
      createdAt: now,
      updatedAt: now,
    });
    console.log(`  ✅ 챕터: ${ch.title} (${chRef.id})`);
    for (let pi = 0; pi < ch.pages.length; pi++) {
      const pg = ch.pages[pi];
      const pgRef = await db.collection("guide_pages").add({
        guideId: guideRef.id,
        chapterId: chRef.id,
        title: pg.title,
        order: pi,
        anchor: pg.anchor,
        pageType: "native",
        body: pg.body,
        createdAt: now,
        updatedAt: now,
      });
      console.log(`      ✅ 페이지: ${pg.title} (${pgRef.id})`);
    }
  }

  console.log(`\n🎉 시드 완료 — draft 상태. 콘솔(/console/learning-guides)에서 확인 후 published 전환하세요.`);
  process.exit(0);
})().catch((e) => { console.error("❌ 실패:", e); process.exit(1); });
