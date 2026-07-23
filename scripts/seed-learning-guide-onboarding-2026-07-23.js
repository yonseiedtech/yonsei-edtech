// 러닝 가이드 시드 — 신입 운영진 온보딩 가이드 (2026-07-23)
//  · status: "draft" (비공개) — 콘솔에서 확인 후 published 전환
//  · 쓰기 rules 가 Admin 전용(write:false)이라 Admin SDK 로 시드
//  · 멱등: slug "staff-onboarding" 존재 시 건너뜀
//  · 실행: node scripts/seed-learning-guide-onboarding-2026-07-23.js [--apply]
require("dotenv").config({ path: ".env.local" });
const { initializeApp, cert, getApps } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

const APPLY = process.argv.includes("--apply");
const sa = JSON.parse(
  Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_KEY, "base64").toString("utf8"),
);
if (!getApps().length) initializeApp({ credential: cert(sa) });
const db = getFirestore();
db.settings({ preferRest: true });

const SLUG = "staff-onboarding";
const AUTHOR_ID = "seed-onboarding";
const AUTHOR_NAME = "연세교육공학회 운영팀";

const GUIDE = {
  title: "신입 운영진을 위한 학회 운영 가이드",
  slug: SLUG,
  subtitle: "처음 운영진이 된 당신을 위한 첫걸음",
  coverEmoji: "🧭",
  category: "운영",
  description:
    "연세교육공학회 운영진으로서 알아야 할 학회 소개, 플랫폼 기능, 운영 실무를 단계별로 안내합니다.",
  tags: ["온보딩", "운영", "가이드"],
  visibility: "staff",
  status: "draft",
};

// 챕터 → 페이지(native 마크다운)
const CHAPTERS = [
  {
    title: "학회와 운영진의 역할",
    pages: [
      {
        anchor: "about",
        title: "연세교육공학회는 어떤 곳인가",
        body: `## 연세교육공학회는 어떤 곳인가

연세교육공학회(Yonsei Educational Technology Association)는 연세대학교 교육공학 전공 대학원생·연구자·졸업생이 모여 **교수설계, 테크놀로지 활용, 학습분석** 등 교육공학의 이론과 실천을 함께 탐구하는 학술 공동체입니다.

이 플랫폼은 학회의 활동을 담는 디지털 거점입니다. 세미나·스터디 운영, 연구 아카이브, 졸업생 논문, 진단평가, 러닝 가이드 등 회원의 성장을 돕는 기능이 모여 있습니다.

**운영진의 미션은 회원이 "들어와서, 배우고, 남는" 경험을 설계하고 유지하는 것입니다.**`,
      },
      {
        anchor: "role",
        title: "운영진이 하는 일",
        body: `## 운영진이 하는 일

운영진의 역할은 크게 네 가지입니다.

- **콘텐츠 운영** — 세미나·스터디·행사 개설, 아카이브·자료 관리, 공지 발행
- **회원 관리** — 가입 승인, 역할 부여, 활동 독려(넛지·다이제스트)
- **행사 진행** — 세미나 라이브 진행, 참석자 관리, 후기·설문 수집
- **프로젝트 관리** — 운영진 페이지의 칸반으로 담당자 배정·진행 점검

모든 권한은 역할(role) 위계로 관리됩니다: **member < staff < admin**. 대부분의 운영 기능은 staff 이상에게 열립니다.`,
      },
    ],
  },
  {
    title: "플랫폼 주요 기능 둘러보기",
    pages: [
      {
        anchor: "surfaces",
        title: "회원이 만나는 핵심 표면",
        body: `## 회원이 만나는 핵심 표면

- **아카이브** — 교육공학 개념·이론·연구방법·측정도구·용어 사전. 상호 크로스링크로 탐색합니다.
- **세미나/스터디** — 개설·신청·수요조사·라이브 진행·후기.
- **진단평가** — 논문·연구 준비도 자가진단 → 약점 아카이브 연결 → 암기카드.
- **러닝 가이드** — 지금 보고 있는 이 전자책 기능. 주제별 단계 학습.
- **졸업생 논문/연구 여정** — 선배들의 학위논문과 연구 과정 아카이브.`,
      },
      {
        anchor: "community",
        title: "대학원 생활 & 커뮤니티",
        body: `## 대학원 생활 & 커뮤니티

- **모임** — 1회성 네트워킹과 함께, **다회성 모임**(독서·와인 모임 등)에서 그룹 가입·회차 일정을 관리합니다.
- **소통 보드** — 스터디·세미나 Q&A, 자유·홍보·자료 게시판.
- **잔디/타이머** — 논문 읽기·연구 활동 기록을 시각화합니다.`,
      },
    ],
  },
  {
    title: "운영 실무: 콘솔 사용법",
    pages: [
      {
        anchor: "console",
        title: "운영 콘솔 들어가기",
        body: `## 운영 콘솔 들어가기

상단 메뉴 **더보기 → 콘솔**로 진입합니다. staff 이상만 접근할 수 있으며, 좌측 내비에 콘텐츠·회원·운영 그룹이 정리돼 있습니다.

주요 메뉴

- **회원 관리** — 가입 승인, 역할 변경, 최근 접속 확인
- **콘텐츠** — 아카이브·러닝 가이드·랩·카드뉴스 편집
- **수요 대시보드** — 스터디·세미나 수요 통합 현황
- **운영진 페이지** — 운영진 공지 + 프로젝트 칸반(담당자 배정·진행 체크)`,
      },
      {
        anchor: "routines",
        title: "자주 하는 일",
        body: `## 자주 하는 일

1. **가입 승인** — 회원 관리에서 대기 중 신청을 확인·승인합니다.
2. **세미나/스터디 개설** — 개설 폼 작성 → 발행 → 수요조사/신청 오픈.
3. **공지 발행** — 운영진 공지(내부) 또는 회원 대상 공지.
4. **행사 후 정리** — 참석자 관리(복수 선택 팝업)·후기·설문 수집.`,
      },
      {
        anchor: "make-guide",
        title: "러닝 가이드 만들기",
        body: `## 러닝 가이드 만들기

콘솔 **러닝 가이드 → 새 가이드**에서 메타를 입력한 뒤, 에디터에서 챕터·페이지를 추가합니다.

페이지는 두 방식 중 하나를 택합니다.

- **네이티브** — 마크다운으로 본문 작성 (지금 이 페이지처럼)
- **임베드** — PDF·유튜브·외부 링크 삽입

저자 자격은 **운영진·스터디 모임장·세미나 연사**에게 열립니다.`,
      },
    ],
  },
  {
    title: "첫 2주 체크리스트",
    pages: [
      {
        anchor: "checklist",
        title: "온보딩 체크리스트",
        body: `## 온보딩 체크리스트

**1주차**

- 콘솔 접근 확인 및 좌측 메뉴 전체 둘러보기
- 운영진 페이지의 진행 중 프로젝트(칸반) 파악
- 담당 영역(콘텐츠/회원/행사/프로젝트) 배정받기
- 아카이브·러닝 가이드 등 회원 표면 직접 사용해보기

**2주차**

- 실제 운영 작업 1건 수행(공지 발행 또는 가입 승인 등)
- 세미나/스터디 개설 흐름 실습(초안까지)
- 수요 대시보드로 현재 회원 관심사 파악
- 궁금한 점을 소통 보드 또는 운영진 공지로 공유`,
      },
      {
        anchor: "help",
        title: "도움이 필요할 때",
        body: `## 도움이 필요할 때

- **기능 사용법** — 이 가이드와 각 페이지의 안내 문구
- **권한/오류** — 운영진 공지에 질문 남기기
- **콘텐츠 정합성** — 아카이브 크로스링크·용어 사전 참고

환영합니다. 여러분의 운영이 회원 한 명 한 명의 성장으로 이어집니다. 🌱`,
      },
    ],
  },
];

(async () => {
  const now = new Date().toISOString();

  // 멱등: slug 중복 확인
  const dup = await db
    .collection("learning_guides")
    .where("slug", "==", SLUG)
    .limit(1)
    .get();
  if (!dup.empty) {
    console.log(`skip (이미 존재): slug="${SLUG}" id=${dup.docs[0].id}`);
    process.exit(0);
  }

  const totalPages = CHAPTERS.reduce((n, c) => n + c.pages.length, 0);
  console.log(
    `${APPLY ? "APPLY" : "DRY-RUN"} — 가이드 1 / 챕터 ${CHAPTERS.length} / 페이지 ${totalPages}`,
  );
  console.log(`  제목: ${GUIDE.title} (status=${GUIDE.status}, visibility=${GUIDE.visibility})`);
  CHAPTERS.forEach((c, i) =>
    console.log(`  [챕터 ${i + 1}] ${c.title} — 페이지 ${c.pages.length}: ${c.pages.map((p) => p.title).join(", ")}`),
  );

  if (!APPLY) {
    console.log("\n(dry-run) 실제 발행하려면 --apply 를 붙여 실행하세요.");
    process.exit(0);
  }

  // 1) 가이드
  const guideRef = await db.collection("learning_guides").add({
    ...GUIDE,
    authorId: AUTHOR_ID,
    authorName: AUTHOR_NAME,
    chapterCount: CHAPTERS.length,
    createdAt: now,
    updatedAt: now,
  });
  console.log(`✅ 가이드 생성: ${guideRef.id}`);

  // 2) 챕터 + 페이지
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
})().catch((e) => {
  console.error("❌ 실패:", e);
  process.exit(1);
});
