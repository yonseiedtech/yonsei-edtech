import { NextRequest } from "next/server";
import { verifyAuth } from "@/lib/api-auth";
import { getAdminDb } from "@/lib/firebase-admin";

export const maxDuration = 30;

/**
 * 게시판 콘텐츠 시드 1-click 등록 API (Sprint 67-AR)
 *
 * `docs/board-content/*.md` 에 작성한 운영진 콘텐츠 초안을
 * Firestore `posts` 컬렉션에 1회 클릭으로 일괄 등록.
 * Idempotent — 동일 제목 post 가 이미 존재하면 skip.
 *
 * 콘텐츠 작성 규약:
 * - 마크다운 ** 강조 사용 금지 (AI 생성 느낌 제거)
 * - 본문 끝에 AI 작성 명시 푸터 자동 추가
 *
 * 권한: staff 이상
 */

interface SeedPost {
  title: string;
  content: string;
  category: "free" | "promotion" | "resources" | "notice";
}

/** 모든 시드 콘텐츠 끝에 자동 추가되는 AI 명시 푸터 */
const AI_FOOTER = `

---

본 게시물은 AI 에이전트에 의해 작성된 게시물입니다. 운영진의 검토를 거쳐 게시되며, 잘못된 정보를 발견하시면 [문의 게시판](/contact)으로 알려주세요.`;

const RAW_POSTS: SeedPost[] = [
  {
    title: "교육공학 신입생을 위한 첫 학기 추천 도서 5선",
    category: "resources",
    content: `연세교육공학과에 새로 합류하신 신입생 여러분께 첫 학기 동안 손에 닿는 곳에 두고 자주 펼쳐보시면 좋은 책 5권을 추천드립니다.

## 1) 『교수설계 ABCD』 — 박성익 외
교육공학 한국어 교재의 표준입니다. ADDIE 모형, ASSURE 모형, ARCS 동기 모형 등 학위 과정 내내 인용되는 기본 개념이 정리되어 있습니다.

## 2) How People Learn II — National Academies Press
학습과학 분야 최신 통합 보고서로, 무료 PDF가 공개되어 있어 접근성이 좋습니다.

## 3) Design-Based Research — Barab & Squire (2004)
교육공학 학위논문에서 매우 자주 등장하는 연구방법입니다. 짧은 논문이지만 핵심 개념을 명확히 잡아줍니다.

## 4) 『학교에서 가르치는 디지털 리터러시』 — 박형준 외
한국 K-12 맥락의 디지털 시민성·미디어 리터러시 연구를 시작할 때 좋은 진입점이 됩니다.

## 5) Engaging Adult Learners — Sandra Kerka (ERIC)
평생학습·HRD 분야로 진로를 잡는 분들에게 ERIC 데이터베이스의 시작점이 됩니다.

---

추천하고 싶은 책이 있다면 댓글로 알려주세요. [디딤판 재학생 가이드](/steppingstone/current-student)도 함께 확인해보세요.`,
  },
  {
    title: "처음 학술대회 포스터를 만든다면 — 5가지 핵심 원칙",
    category: "resources",
    content: `학술대회 포스터 발표는 학위 과정 중 가장 가성비 좋은 학습 경험 중 하나입니다. 처음 만드실 때 빠지기 쉬운 함정 5가지를 정리합니다.

## 원칙 1. 3미터 거리에서 제목이 읽혀야 한다
제목 글꼴은 90pt 이상, 본문은 24pt 이상을 권장합니다. PowerPoint 기본 폰트(18pt)를 그대로 사용하면 현장에서 청자가 멈추지 않습니다.

## 원칙 2. 포스터는 논문 축약본이 아니다
포스터는 30초 안에 본인 연구가 무엇인지 전달하기 위한 시각 자료입니다. 구성은 제목 / 연구 질문 1줄 / 그림 1개 / 핵심 결론 2~3줄이면 충분합니다.

## 원칙 3. 시각 요소를 본문 위에 둔다
청자의 시선 위계는 이미지 → 차트 → 짧은 문장 → 긴 문장 순서입니다. 그래프 1개를 시각적 중심에 배치하세요.

## 원칙 4. 좌→우, 위→아래 흐름을 따른다
좌상단(연구질문) → 우상단(방법) → 좌하단(결과) → 우하단(시사점) 흐름이 다국가 학회에서도 통용됩니다.

## 원칙 5. 20초·1분·5분 세 가지 발표문을 준비한다
청자에 따라 머무는 시간이 다릅니다. 20초(제목+결론), 1분(+방법+시사점), 5분(+그래프 해석+한계점) 세 버전을 미리 연습해두세요.

---

[디딤판 학술대회 대비 가이드](/steppingstone/conference)도 함께 참고하시면 발표 신청부터 사후 후기 작성까지 한 흐름으로 준비할 수 있습니다.`,
  },
  {
    title: "인지디딤판을 100배 활용하는 5가지 방법",
    category: "free",
    content: `이번 학기 새로 출시된 인지디딤판을 그냥 둘러보고만 가시는 분들이 많습니다. 다섯 가지 활용법을 정리합니다.

## 1) 매 학기 시작 첫 주에 본인 학기 카드 다시 읽기
[인지디딤판 메인](/steppingstone)에 들어가시면 본인 학기에 해당하는 카드가 자동으로 강조됩니다. 학기 시작 첫 주에 다시 읽으면 이번 학기 우선순위가 명확해집니다.

## 2) 후배 멘토링에 트랙별 가이드 직접 활용하기
디딤판의 4개 트랙(온보딩·재학생·학술대회·졸업)은 멘토링 시 그대로 활용 가능한 체크리스트입니다. 후배에게 "한 번 훑어보고 다음 주에 헷갈리는 항목 표시해서 와" 라고 사전 과제를 주면 멘토링 1시간이 5시간 효과를 냅니다.

## 3) 학술대회 발표 전 디딤판 학술대회 대비 페이지 5단계 따라하기
발표 신청 시점이 다가오면 [학술대회 대비](/steppingstone/conference)의 5단계 발표 과정을 인쇄해 책상에 두고 하나씩 체크하세요.

## 4) 본인 연구 진로의 디딤판 트랙을 운영진에게 제안하기
현재 디딤판은 4개 트랙이지만, 박사과정 / 기업 교육 / K-12 교사 / 해외 학회 등 회원 진로 다양화 트랙이 더 추가될 수 있습니다. 본인 경로를 [문의 게시판](/contact)으로 제안해주시면 학회 자산이 됩니다.

## 5) 디딤판 콘텐츠를 본인 분석 노트로 변환하기
가장 핵심적인 활용법입니다. 디딤판은 일반론이며, 본인 분석 노트가 본인만의 디딤판이 되어야 합니다. 디딤판 항목을 읽고 본인 경험과 비교 → 본인 학기 흐름·연구 관행을 분석 노트에 정리하시면 졸업 후에도 자산으로 남습니다.

---

함께 만들어가는 학회입니다.`,
  },
  {
    title: "ADDIE 모델, 이론에서 실전으로 — 우리가 놓치고 있는 5가지",
    category: "free",
    content: `교육공학 전공자라면 누구나 ADDIE(Analysis · Design · Development · Implementation · Evaluation) 모델을 배웁니다. 이론으로는 명료하지만 실제 적용 시 자주 놓치게 되는 다섯 가지 간극을 정리합니다.

## 1. Analysis 단계가 가장 짧게 끝나버린다
마감 압박 때문에 "대상은 신입생, 주제는 OO" 한 줄로 끝나기 쉽습니다. 최소 3가지 필수 질문을 강제하세요. 학습자가 이미 무엇을 알고 있는가, 학습 후 무엇을 할 수 있어야 하는가, 어디서·언제·어떻게 학습할 것인가.

## 2. Design 과 Development 가 동일시된다
PPT 만들면서 설계도 같이 짜면 두 단계가 섞이고 결국 Design 이 부실해집니다. Development 시작 전에 학습 목표·평가 기준·핵심 교수 전략·시간 배분을 1쪽으로 요약해두세요.

## 3. Implementation 단계의 정의가 모호하다
세미나 진행 = Implementation 완료로 끝나면 학습 전이가 일어나지 않습니다. Pilot(소규모 사전 실행) → Full delivery → Follow-up(사후 지원) 3단계로 세분화하세요.

## 4. Evaluation 이 만족도 설문 1장으로 끝난다
Kirkpatrick 4단계를 모두 적용하기 어렵다면 최소 2단계만이라도 운영하세요. Level 1(즉시 반응) + Level 2(1주 후 quiz 3문항). 이 30분 추가가 본인 콘텐츠 효과성을 측정할 유일한 데이터입니다.

## 5. ADDIE 가 선형적이라는 오해
교과서에는 5단계가 순서대로 그려져 있지만 ADDIE 는 본질적으로 반복적·순환적입니다. 본인 작품을 버전 1.0 부터 시작하세요. ADDIE 는 사다리가 아닌 나선형(Spiral)입니다.

---

ADDIE 는 단순 체크리스트가 아닌 사고의 도구입니다. 본인 다음 콘텐츠 설계 시 다섯 가지 함정에 빠지지 않는지 점검해보세요.`,
  },
  {
    title: "AI 시대, 교육공학자는 어디로 가는가 — 5가지 새로운 역할",
    category: "free",
    content: `ChatGPT 출시 후 3년이 지났고, AI 가 교육 현장에 깊숙이 들어왔습니다. 교사·교수 역할 변화에 대한 글은 많지만 교육공학자의 역할 변화는 상대적으로 적게 다뤄집니다. 다섯 가지 새로운 역할을 정리합니다.

## 1. AI 시스템 큐레이터(Curator)
어떤 AI 도구가 어떤 학습 목적에 적합한지를 결정하는 큐레이터 역할이 부상합니다. 단순 가격·기능 비교가 아닌 학습 이론적 적합성 평가가 핵심입니다. 교수설계 이론 + AI 도구 사용 경험 + 학습자 분석이 결합되어야만 가능한 일입니다.

## 2. AI 콘텐츠 평가자(Evaluator)
AI 가 만드는 학습 자료가 폭증합니다. 어떤 것이 실제로 학습에 도움이 되는지, 어떤 것이 hallucination 인지를 평가할 사람이 필요합니다. [AI 포럼](/ai-forum)에 도입한 APA 7 학술 인용 검증 시스템이 그 한 예시입니다.

## 3. 학습 윤리·정책 자문가(Policy Advisor)
"학생이 ChatGPT 로 작성한 과제는 부정행위인가" 같은 질문에 답할 수 있는 자문가가 필요합니다. 답은 단일하지 않으며 기관의 학습 목표·학습자 특성·기존 정책에 따라 달라집니다. 교육공학자가 가장 적임자입니다.

## 4. 학습 데이터 분석가(Learning Analyst)
AI 도구가 학습자에게 어떤 영향을 주는지 데이터 기반으로 파악하는 역할입니다. 단순 통계가 아니라 학습 이론에 근거한 해석이 필수입니다.

## 5. 메타 학습 설계자(Meta-Learning Designer)
AI 와 함께 학습하는 방법 자체를 가르치는 학습 설계가 새 영역입니다. AI 도구를 비판적으로 사용하는 능력, AI 출력을 검증하는 능력, AI 와 협업하는 능력, AI 가 못하는 영역을 강화하는 능력 — 이 모든 메타 학습을 어떻게 설계할지가 교육공학자의 가장 핵심적이고 고유한 영역입니다.

---

"AI 가 교사를 대체한다" 라는 말이 자주 들리지만, 교육공학자의 역할은 AI 와 학습자 사이의 매개자로서 오히려 확장되고 있습니다. 회원 여러분도 본인 진로에서 다섯 가지 중 하나 이상을 본인 강점으로 만들어가시길 권합니다.`,
  },
  {
    title: "교육공학자가 매주 읽어야 할 5가지 — 정보 다이어트 가이드",
    category: "resources",
    content: `교육공학 분야 정보는 폭발적으로 늘어나고 있습니다. 모든 것을 읽으려 하면 결국 어떤 것도 깊이 이해하지 못합니다. 시행착오 끝에 정착한 주간 5가지 정보 다이어트를 공유합니다.

## 매주 1번 — 학술 논문 1편(깊이)
본인 관심 분야의 새 학술 논문 1편을 매주 정독하세요. 90분에서 2시간을 한 자리에서 끝내는 것이 중요합니다. BJET, Computers & Education, ETR&D 같은 핵심 저널의 신간을 우선합니다. 본인 분석 노트에 1쪽 요약(연구 질문 / 방법 / 결과 / 시사점)을 남기면 1년이면 50편의 깊은 이해가 누적됩니다.

## 매주 1번 — 메타 분석·리뷰 논문 1편(지도)
30분 정도 abstract와 findings, figures, limitations 만 훑어보세요. 메타분석은 한 분야의 현재 지도가 됩니다. 어떤 효과가 강하고 어떤 영역이 미해결인지 빠르게 파악할 수 있습니다.

## 매주 1번 — 현장 사례 1건(실용)
한국·해외 학교·기업의 실제 교육 도입 사례 1건을 15분 정도 흡수하세요. 교사 블로그, 뉴스레터, 컨퍼런스 후기, 학회 [세미나 자료](/seminars)·[에듀테크 카드뉴스](/card-news) 등을 활용합니다.

## 매주 1번 — 트렌드 미디어 1편(지평)
본인 분야 바깥의 교육 + 기술 트렌드 콘텐츠 1편을 15분 봅니다. The Chronicle of Higher Education, EdSurge, Inside Higher Ed, 요즘IT, EdTech 스타트업 블로그 등이 좋은 후보입니다.

## 매주 1번 — 교육공학 외 분야 1건(확장)
교육공학과 무관한 분야의 글이나 책 1편을 30분에서 1시간 정도 읽으세요. 인지심리학·뇌과학, 디자인, 경영·조직, 철학·인문 등이 좋습니다. 본인 분야에 매몰되면 지평이 좁아집니다.

---

무엇을 읽지 않을지 결정하는 것이 무엇을 읽을지 결정하는 것보다 더 중요합니다. 매주 5가지 약 3시간만 지속하면 1년 후 분야의 진짜 전문가가 됩니다.`,
  },
  {
    title: "신입생이 첫 세미나 발표를 준비할 때 — 5단계 체크리스트",
    category: "resources",
    content: `연세교육공학회 신입생이 처음 세미나에서 발표를 맡으면 막막함이 가장 큽니다. 시행착오를 줄이는 5단계 체크리스트입니다.

## Step 1 (D-21 ~ D-14) — 주제 좁히기
가장 흔한 실수가 주제를 너무 크게 잡는 것입니다. "교육공학 동향" 같은 주제는 1시간 발표로 다룰 수 없습니다. 큰 주제 → 한 분야 → 한 문제 순서로 좁혀 30분 발표 = 핵심 메시지 1~2개가 한계라고 생각하세요.

## Step 2 (D-14 ~ D-7) — 자료 수집과 핵심 논점 정리
좁힌 주제에 대해 한국 학술논문(RISS, DBpia), 영문 학술논문(Google Scholar), 1차 자료(정책 보고서, 기업 백서), 본인 경험·관찰을 모아 5~10개 출처를 만드세요. 각 출처에 본인의 한 줄 평을 남기면 발표 후에도 본인 자산이 됩니다.

## Step 3 (D-7 ~ D-4) — 슬라이드 초안 작성
슬라이드부터 만들지 마세요. 종이나 노트앱에 도입 → 본론 → 결론 흐름을 1쪽으로 그린 뒤, 슬라이드는 한 장에 메시지 한 개 원칙으로 작성합니다. 빈 공간 70%, 본문 24pt 이상, 강조 색은 1개만, 숫자는 본문보다 2배 크게.

## Step 4 (D-4 ~ D-1) — 리허설 5회 이상
1회 혼자 + 시간 측정, 2회 거울 또는 자기 녹화, 3회 동기 1명 앞에서, 4회 시간 빡빡하게 Q&A 확보, 5회 예상 질문 3가지에 대한 답안 준비 순서로 진행합니다. [디펜스 연습 도구](/defense-practice)의 음성 채점·따라 읽기 기능도 활용할 수 있습니다.

## Step 5 (D-Day) — 현장과 사후
발표 직전 호흡 정돈(4초 들이마시고 6초 내쉬기 5회), 발표 중 청자와 눈 마주치기, 모르는 질문은 솔직히 인정. 발표 후 24시간 내 청자 1~2명에게 직접 피드백을 받고, 발표 자료를 [에듀테크 아카이브](/edutech-archive)에 등록한 뒤, 본인 분석 노트에 잘된 점 3개 + 개선점 3개 회고를 남기세요. 이 24시간이 발표 능력을 가장 빠르게 키우는 시간입니다.

---

첫 발표는 누구나 떨립니다. 그러나 발표 능력은 모든 학업·진로에 누적 자산이 됩니다. 좋은 발표 응원합니다.`,
  },
];

/** AI 푸터를 자동 부착하고 ** 가 남아있다면 안전하게 제거 */
const SEED_POSTS: SeedPost[] = RAW_POSTS.map((p) => ({
  ...p,
  content: p.content.replace(/\*\*/g, "") + AI_FOOTER,
}));

async function findExistingPost(
  db: FirebaseFirestore.Firestore,
  title: string,
): Promise<boolean> {
  const snap = await db
    .collection("posts")
    .where("title", "==", title)
    .limit(1)
    .get();
  return !snap.empty;
}

export async function POST(req: NextRequest) {
  const authUser = await verifyAuth(req).catch(() => null);
  if (!authUser) {
    return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }
  const allowedRoles = ["staff", "president", "admin", "sysadmin"];
  if (!allowedRoles.includes(authUser.role ?? "")) {
    return Response.json(
      { error: "운영진(staff 이상)만 사용 가능합니다." },
      { status: 403 },
    );
  }

  try {
    const db = getAdminDb();
    let created = 0;
    let skipped = 0;
    const items: { title: string; status: "created" | "skipped" }[] = [];

    const now = new Date().toISOString();
    for (const seed of SEED_POSTS) {
      const exists = await findExistingPost(db, seed.title);
      if (exists) {
        skipped++;
        items.push({ title: seed.title, status: "skipped" });
        continue;
      }
      const postRef = db.collection("posts").doc();
      await postRef.set({
        title: seed.title,
        content: seed.content,
        category: seed.category,
        authorId: authUser.id ?? "system:seed",
        authorName: authUser.name ?? "운영진",
        viewCount: 0,
        commentCount: 0,
        reactionCount: 0,
        createdAt: now,
        updatedAt: now,
      });
      created++;
      items.push({ title: seed.title, status: "created" });
    }

    return Response.json({
      ok: true,
      created,
      skipped,
      total: SEED_POSTS.length,
      items,
      message:
        created > 0
          ? `${created}개 게시글 신규 등록, ${skipped}개 기존 유지`
          : "모든 콘텐츠가 이미 등록되어 있습니다",
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown error";
    return Response.json({ error: msg }, { status: 500 });
  }
}
