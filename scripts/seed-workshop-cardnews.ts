// C-3 워크숍 안내 카드뉴스 — 스튜디오 브랜드 템플릿으로 생성 (2026-07-06)
//  · 소유자: 운영 계정(education@yonsei.ac.kr) — /studio 목록에서 열어 편집·PNG 내보내기
//  · 실행: npx tsc scripts/seed-workshop-cardnews.ts --module commonjs --outDir .seed-tmp --esModuleInterop --skipLibCheck
//         node .seed-tmp/scripts/seed-workshop-cardnews.js [--apply]
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { buildTemplatePages } from "../src/features/studio/templates";
import type { DesignPage, TextElement } from "../src/features/studio/studio-types";

const APPLY = process.argv.includes("--apply");
const sa = JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_KEY!, "base64").toString("utf8"));
if (!getApps().length) initializeApp({ credential: cert(sa) });
const db = getFirestore();
// 템플릿 요소의 옵션 필드(undefined)는 클라이언트 dataApi 가 strip 하던 것 — admin 에선 설정으로 무시
db.settings({ preferRest: true, ignoreUndefinedProperties: true });

const TITLE = "논문 도구 워크숍 안내";

function replaceText(pages: DesignPage[], from: string, to: string): void {
  for (const p of pages) {
    for (const el of p.elements) {
      if (el.type === "text" && (el as TextElement).text === from) {
        (el as TextElement).text = to;
      }
    }
  }
}

async function main() {
  // 소유자: 운영(관리자) 계정 — email 필드가 없는 문서 대비 role 기준 조회
  let users = await db.collection("users").where("email", "==", "education@yonsei.ac.kr").limit(1).get();
  if (users.empty) {
    users = await db.collection("users").where("role", "in", ["sysadmin", "admin", "president"]).limit(1).get();
  }
  if (users.empty) throw new Error("운영 계정을 찾을 수 없습니다");
  const owner = users.docs[0];
  const ownerName = (owner.data() as { name?: string }).name ?? "운영진";

  // 멱등: 같은 제목의 문서가 이미 있으면 건너뜀
  const dup = await db.collection("design_documents")
    .where("userId", "==", owner.id).where("title", "==", TITLE).limit(1).get();
  if (!dup.empty) {
    console.log(`skip (이미 존재): design_documents/${dup.docs[0].id}`);
    return;
  }

  const pages = buildTemplatePages("cardnews", {
    title: "논문 도구\n워크숍",
    subtitle: "주제 탐색부터 계획서까지, 35분 완주",
    date: "9월 첫 세미나에서 (일정 추후 공지)",
    location: "세미나 현장 · 노트북 지참 권장",
    speaker: "시연 체인 — 주제 탐색 → 문헌 매트릭스 → 연구 모형 → 계획서 시딩",
    description:
      "방학 동안 논문 도구가 크게 업그레이드됐습니다. 7문항 인터뷰로 연구 주제 문장을 추천받고, DOI 하나로 서지를 자동으로 채우고, 변인을 이어 연구 모형을 그리고, 계획서가 논문 1~3장의 뼈대가 되는 과정을 실제 여정 순서 그대로 시연합니다.",
  });
  // CTA 페이지를 워크숍 문구로
  replaceText(pages, "지금 신청하세요", "9월 첫 세미나에서 만나요");
  replaceText(pages, "자세한 내용은 학회 홈페이지에서", "체크리스트 미션 3종을 준비해 오세요");

  const now = new Date().toISOString();
  const doc = {
    userId: owner.id,
    authorName: ownerName,
    docType: "cardnews",
    title: TITLE,
    pages,
    published: false,
    createdAt: now,
    updatedAt: now,
  };
  console.log(`${APPLY ? "CREATE" : "would create"}: ${TITLE} (${pages.length}페이지, owner=${ownerName})`);
  if (APPLY) {
    const ref = await db.collection("design_documents").add(doc);
    console.log(`생성 완료: /studio/${ref.id}`);
  }
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
