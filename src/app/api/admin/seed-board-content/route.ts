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
 * 권한: staff 이상
 * 응답: { created, skipped, total, items }
 */

interface SeedPost {
  title: string;
  content: string;
  category: "free" | "promotion" | "resources" | "notice";
}

const SEED_POSTS: SeedPost[] = [
  {
    title: "교육공학 신입생을 위한 첫 학기 추천 도서 5선",
    category: "resources",
    content: `연세교육공학과에 새로 합류하신 신입생 여러분께 첫 학기 동안 손에 닿는 곳에 두고 자주 펼쳐보시면 좋은 책 5권을 추천드립니다.

## 1) 『교수설계 ABCD』 — 박성익 외
교육공학 한국어 교재의 표준. ADDIE 모형, ASSURE 모형, ARCS 동기 모형 등 학위 과정 내내 인용되는 기본 개념이 정리되어 있습니다.

## 2) "How People Learn II" — National Academies Press
학습과학 분야 최신 통합 보고서. 무료 PDF 공개되어 있어 접근성도 좋습니다.

## 3) "Design-Based Research" — Barab & Squire (2004)
교육공학 학위논문에서 매우 자주 등장하는 연구방법. 짧은 논문이지만 핵심 개념을 명확히 잡아줍니다.

## 4) 『학교에서 가르치는 디지털 리터러시』 — 박형준 외
한국 K-12 맥락의 디지털 시민성·미디어 리터러시 연구를 시작할 때 좋은 진입점.

## 5) "Engaging Adult Learners" — Sandra Kerka (ERIC)
평생학습·HRD 분야로 진로를 잡는 분들에게 ERIC 데이터베이스의 시작점.

---

추천하고 싶은 책이 있다면 댓글로 알려주세요. [디딤판 재학생 가이드](/steppingstone/current-student)도 함께 확인해보세요.`,
  },
  {
    title: "처음 학술대회 포스터를 만든다면 — 5가지 핵심 원칙",
    category: "resources",
    content: `학술대회 포스터 발표는 학위 과정 중 가장 가성비 좋은 학습 경험 중 하나입니다.

## 원칙 1. 3미터 거리에서 제목이 읽혀야 한다
- 제목 글꼴 ≥ 90pt, 본문 ≥ 24pt
- PowerPoint 기본 폰트(18pt) → 청자 0명

## 원칙 2. 포스터 ≠ 논문 축약본
30초 안에 본인 연구가 무엇인지 전달하기 위한 시각 자료.
- 제목 / 연구 질문 1줄 / 그림 1개 / 핵심 결론 2~3줄

## 원칙 3. 시각 요소를 본문 위에
이미지 > 차트 > 짧은 문장 > 긴 문장.

## 원칙 4. 이야기 흐름이 좌→우, 위→아래
좌상단(연구질문) → 우상단(방법) → 좌하단(결과) → 우하단(시사점).

## 원칙 5. 20초·1분·5분 세 가지 발표문 준비
- 20초: 제목 + 연구 질문 + 결론 1줄
- 1분: 위 + 방법 + 시사점
- 5분: 위 + 그래프 해석 + 한계점

---

[디딤판 학술대회 대비](/steppingstone/conference)도 함께 참고하세요.`,
  },
  {
    title: "인지디딤판을 100배 활용하는 5가지 방법",
    category: "free",
    content: `이번 학기 새로 출시된 **인지디딤판**을 그냥 둘러보고만 가시는 분들이 많은 것 같습니다.

## 1) 매 학기 시작 첫 주에 본인 학기 카드 다시 읽기
[인지디딤판 메인](/steppingstone)에 들어가시면 본인 학기에 해당하는 카드가 자동으로 강조됩니다.

## 2) 후배 멘토링에 트랙별 가이드 직접 활용하기
디딤판의 4개 트랙은 멘토링 시 그대로 활용 가능한 체크리스트입니다.

## 3) 학술대회 발표 전 [학술대회 대비](/steppingstone/conference) 페이지 5단계 따라하기
학술대회 발표 신청 시점이 다가오면 5단계 발표 단계를 인쇄해 책상에 두고 하나씩 체크하시기 바랍니다.

## 4) 본인 연구 진로의 디딤판 트랙을 운영진에게 제안하기
박사과정 / 기업 교육 / K-12 교사 / 해외 학회 등 회원 진로 다양화.

## 5) 디딤판 콘텐츠 → 본인 분석 노트로 변환
가장 핵심적인 활용법. 디딤판은 일반론, **본인 분석 노트는 본인만의 디딤판**.

---

잘못된 정보·추가 제안은 [문의 게시판](/contact)으로 알려주세요.`,
  },
  {
    title: "ADDIE 모델, 이론에서 실전으로 — 우리가 놓치고 있는 5가지",
    category: "free",
    content: `교육공학 전공자라면 누구나 ADDIE (Analysis · Design · Development · Implementation · Evaluation) 모델을 배웁니다. 본인이 5년 경험에서 발견한 "이론과 실전의 5가지 간극"을 공유합니다.

## 1. Analysis 단계가 가장 짧게 끝나버린다
**해결**: 최소 3가지 필수 질문 강제 — 사전지식 / 수행 목표 / 수행 맥락.

## 2. Design 과 Development 가 동일시된다
**해결**: Design 1쪽 요약 문서 — 학습 목표(ABCD) / 평가 기준 / 핵심 교수 전략 / 시간 배분.

## 3. Implementation 단계의 정의가 모호하다
**해결**: 3단계 세분화 — Pilot / Full delivery / Follow-up.

## 4. Evaluation 이 "만족도 설문 1장" 으로 끝난다
**해결**: 2단계 평가 — Level 1 즉시 반응 + Level 2 학습 검증 (1주 후 quiz 3문항).

## 5. ADDIE 가 "선형적"이라는 오해
**해결**: 본인 작품을 버전 1.0 부터 시작 — ADDIE 는 사다리가 아닌 나선형(Spiral).

---

ADDIE 는 단순 체크리스트가 아닌 사고의 도구입니다. 본인 다음 콘텐츠 설계 시 위 5가지 함정을 점검해보세요.`,
  },
  {
    title: "AI 시대, 교육공학자는 어디로 가는가 — 5가지 새로운 역할",
    category: "free",
    content: `ChatGPT 출시 후 3년, AI 가 교육 현장에 깊숙이 들어왔습니다. 교육공학자의 5가지 새로운 역할을 정리합니다.

## 1. AI 시스템 큐레이터 (Curator)
어떤 AI 도구가 어떤 학습 목적에 적합한지 결정. **학습 이론적 적합성** 평가가 핵심.

## 2. AI 콘텐츠 평가자 (Evaluator)
AI 생성 학습 자료의 학습 효과성·정확성·hallucination 평가. 연세교육공학회 [AI 포럼](/ai-forum)의 APA 7 검증 시스템이 그 예시.

## 3. 학습 윤리·정책 자문가 (Policy Advisor)
"학생이 ChatGPT 로 작성한 과제는 부정행위인가?" 같은 질문에 대한 기관별 자문.

## 4. 학습 데이터 분석가 (Learning Analyst)
학습 분석 + AI 도구 사용 패턴 분석. **학습 이론에 근거한 해석** 필수.

## 5. 메타 학습 설계자 (Meta-Learning Designer)
AI 와 함께 학습하는 방법 자체를 가르치는 학습 설계 — 가장 핵심적이고 고유한 영역.

---

"AI 가 교사를 대체한다"는 종종 들리지만, 교육공학자의 역할은 **AI 와 학습자 사이의 매개자** 로서 확장되고 있습니다.`,
  },
  {
    title: "교육공학자가 매주 읽어야 할 5가지 — 정보 다이어트 가이드",
    category: "resources",
    content: `모든 것을 읽으려 하면 결국 어떤 것도 깊이 이해하지 못합니다. "주간 5가지 정보 다이어트" 를 공유합니다.

## 매주 1번 — 학술 논문 1편 (깊이)
본인 관심 분야 학술 논문 1편을 90~120분 정독. BJET, Computers & Education, ETR&D 같은 핵심 저널 신간.

## 매주 1번 — 메타 분석·리뷰 논문 1편 (지도)
본인 분야의 **현재 지도**. 30분 훑어보기.

## 매주 1번 — 현장 사례 1건 (실용)
한국·해외 학교·기업의 실제 교육 도입 사례 1건. 15분.

## 매주 1번 — 트렌드 미디어 1편 (지평)
본인 분야 바깥의 교육 + 기술 트렌드 콘텐츠. 15분.

## 매주 1번 — 교육공학 외 분야 1건 (확장)
인지심리학·디자인·경영·인문 중 1편. 30분~1시간.

## 안 읽어도 되는 것
- 매일 뉴스 헤드라인
- 베스트셀러 비교육 도서
- 유명인 강연 영상
- 모든 학술 컨퍼런스 발표 자료

**무엇을 읽지 않을지 결정하는 것이 더 중요합니다.** 매주 3시간 만 지속하면 1년 후 진짜 전문가.`,
  },
  {
    title: "신입생이 첫 세미나 발표를 준비할 때 — 5단계 체크리스트",
    category: "resources",
    content: `연세교육공학회 신입생이 처음 세미나에서 발표를 맡으면 막막함이 가장 큽니다. 5단계 체크리스트를 정리합니다.

## Step 1 (D-21 ~ D-14) — 주제 좁히기
큰 주제 → 한 분야 → 한 문제. 30분 발표 = 1~2개 핵심 메시지가 한계.

## Step 2 (D-14 ~ D-7) — 자료 수집 + 핵심 논점 정리
한국 학술논문 (RISS, DBpia) + 영문 학술논문 (Google Scholar) + 1차 자료 + 본인 경험. 출처별 본인 한 줄 평 필수.

## Step 3 (D-7 ~ D-4) — 슬라이드 초안 작성
**올바른 순서**: 종이 흐름 → 슬라이드 메시지 1개 원칙 → 마지막에 PPT/Keynote.
- 빈 공간 70%, 글꼴 24pt 이상, 2색 + 무채색

## Step 4 (D-4 ~ D-1) — 리허설 (5회 이상 권장)
1) 혼자 + 시간 측정, 2) 거울/녹화, 3) 동기 앞에서, 4) 시간 빡빡, 5) 예상 질문 답안.
[디펜스 연습 도구](/defense-practice) 활용 가능.

## Step 5 (D-Day) — 현장 + 사후
발표 후 24시간 내 청자 피드백 + 분석 노트 1쪽 회고 — 가장 중요한 시간.

---

첫 발표는 누구나 떨립니다. [학술대회 대비 가이드](/steppingstone/conference)도 참고하세요.`,
  },
];

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
