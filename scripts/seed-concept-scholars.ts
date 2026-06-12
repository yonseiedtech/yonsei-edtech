// 사이클 47 — 이론 개념에 대표 학자(keyScholars) + 원전(seminalWorks) 부여
//  · 모든 URL/DOI는 사전 검증 완료 (Crossref API 제목 일치 19건 + OA URL HTTP 200 3건, 2026-06-13)
//  · 검증 실패분(Athabasca PDF 404, EDUCAUSE 403, openu 403)은 제외 — 비OA는 doi.org 링크
//  · 책 원전은 url=null (서지 표기만)
// 실행: npx tsx scripts/seed-concept-scholars.ts          (드라이런)
//       npx tsx scripts/seed-concept-scholars.ts --apply  (적용)
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const APPLY = process.argv.includes("--apply");
const sa = JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_KEY!, "base64").toString("utf8"));
if (!getApps().length) initializeApp({ credential: cert(sa) });
const db = getFirestore();

interface SeminalWork {
  citation: string;
  url: string | null;
  openAccess: boolean;
}

const doi = (d: string) => `https://doi.org/${d}`;

/** 개념 이름(한국어, 현재 DB 기준) → 학자·원전 */
const SCHOLAR_MAP: Record<string, { keyScholars: string[]; seminalWorks: SeminalWork[] }> = {
  "인지부하": {
    keyScholars: ["John Sweller"],
    seminalWorks: [
      {
        citation: "Sweller, J. (1988). Cognitive load during problem solving: Effects on learning. Cognitive Science, 12(2), 257–285.",
        url: doi("10.1207/s15516709cog1202_4"),
        openAccess: false,
      },
    ],
  },
  "멀티미디어 학습 인지이론": {
    keyScholars: ["Richard E. Mayer"],
    seminalWorks: [
      {
        citation: "Mayer, R. E., & Moreno, R. (2003). Nine ways to reduce cognitive load in multimedia learning. Educational Psychologist, 38(1), 43–52.",
        url: doi("10.1207/S15326985EP3801_6"),
        openAccess: false,
      },
    ],
  },
  "자기효능감": {
    keyScholars: ["Albert Bandura"],
    seminalWorks: [
      {
        citation: "Bandura, A. (1977). Self-efficacy: Toward a unifying theory of behavioral change. Psychological Review, 84(2), 191–215.",
        url: doi("10.1037/0033-295X.84.2.191"),
        openAccess: false,
      },
    ],
  },
  "자기조절학습": {
    keyScholars: ["Barry J. Zimmerman"],
    seminalWorks: [
      {
        citation: "Zimmerman, B. J. (2002). Becoming a self-regulated learner: An overview. Theory Into Practice, 41(2), 64–70.",
        url: doi("10.1207/s15430421tip4102_2"),
        openAccess: false,
      },
    ],
  },
  "자기주도학습": {
    keyScholars: ["Malcolm S. Knowles"],
    seminalWorks: [
      {
        citation: "Knowles, M. S. (1975). Self-Directed Learning: A Guide for Learners and Teachers. Association Press. (단행본)",
        url: null,
        openAccess: false,
      },
    ],
  },
  "메타인지": {
    keyScholars: ["John H. Flavell"],
    seminalWorks: [
      {
        citation: "Flavell, J. H. (1979). Metacognition and cognitive monitoring: A new area of cognitive–developmental inquiry. American Psychologist, 34(10), 906–911.",
        url: doi("10.1037/0003-066X.34.10.906"),
        openAccess: false,
      },
    ],
  },
  "학습동기": {
    keyScholars: ["John M. Keller"],
    seminalWorks: [
      {
        citation: "Keller, J. M. (1987). Development and use of the ARCS model of instructional design. Journal of Instructional Development, 10(3), 2–10.",
        url: doi("10.1007/BF02905780"),
        openAccess: false,
      },
    ],
  },
  "학습몰입": {
    keyScholars: ["Mihaly Csikszentmihalyi"],
    seminalWorks: [
      {
        citation: "Csikszentmihalyi, M. (1990). Flow: The Psychology of Optimal Experience. Harper & Row. (단행본)",
        url: null,
        openAccess: false,
      },
    ],
  },
  "테크놀로지 수용": {
    keyScholars: ["Fred D. Davis"],
    seminalWorks: [
      {
        citation: "Davis, F. D. (1989). Perceived usefulness, perceived ease of use, and user acceptance of information technology. MIS Quarterly, 13(3), 319–340.",
        url: doi("10.2307/249008"),
        openAccess: false,
      },
    ],
  },
  "TPACK": {
    keyScholars: ["Punya Mishra", "Matthew J. Koehler"],
    seminalWorks: [
      {
        citation: "Mishra, P., & Koehler, M. J. (2006). Technological pedagogical content knowledge: A framework for teacher knowledge. Teachers College Record, 108(6), 1017–1054.",
        url: doi("10.1111/j.1467-9620.2006.00684.x"),
        openAccess: false,
      },
      {
        citation: "위 논문 저자 공개본 PDF (punyamishra.com)",
        url: "https://www.punyamishra.com/wp-content/uploads/2008/01/mishra-koehler-tcr2006.pdf",
        openAccess: true,
      },
    ],
  },
  "SAMR 모델": {
    keyScholars: ["Ruben R. Puentedura"],
    seminalWorks: [
      {
        citation: "Puentedura, R. R. (2006). Transformation, Technology, and Education. (발표 자료 — SAMR은 동료심사 원논문 없이 강연·블로그로 확산된 모델)",
        url: "http://hippasus.com/resources/tte/",
        openAccess: true,
      },
    ],
  },
  "사회적 실재감": {
    keyScholars: ["John Short", "D. Randy Garrison"],
    seminalWorks: [
      {
        citation: "Short, J., Williams, E., & Christie, B. (1976). The Social Psychology of Telecommunications. Wiley. (단행본 — 개념 원전)",
        url: null,
        openAccess: false,
      },
      {
        citation: "Garrison, D. R., Anderson, T., & Archer, W. (2000). Critical inquiry in a text-based environment: Computer conferencing in higher education. The Internet and Higher Education, 2(2–3), 87–105. (교육 맥락 확장 — CoI 모형)",
        url: doi("10.1016/S1096-7516(00)00016-6"),
        openAccess: false,
      },
    ],
  },
  "원격교육 상호작용": {
    keyScholars: ["Michael G. Moore"],
    seminalWorks: [
      {
        citation: "Moore, M. G. (1989). Editorial: Three types of interaction. American Journal of Distance Education, 3(2), 1–7.",
        url: doi("10.1080/08923648909526659"),
        openAccess: false,
      },
    ],
  },
  "학습공동체": {
    keyScholars: ["Jean Lave", "Etienne Wenger"],
    seminalWorks: [
      {
        citation: "Lave, J., & Wenger, E. (1991). Situated Learning: Legitimate Peripheral Participation. Cambridge University Press. (단행본)",
        url: null,
        openAccess: false,
      },
    ],
  },
  "협력학습": {
    keyScholars: ["David W. Johnson", "Roger T. Johnson"],
    seminalWorks: [
      {
        citation: "Johnson, D. W., & Johnson, R. T. (2009). An educational psychology success story: Social interdependence theory and cooperative learning. Educational Researcher, 38(5), 365–379.",
        url: doi("10.3102/0013189X09339057"),
        openAccess: false,
      },
    ],
  },
  "문제기반학습": {
    keyScholars: ["Howard S. Barrows"],
    seminalWorks: [
      {
        citation: "Barrows, H. S. (1986). A taxonomy of problem-based learning methods. Medical Education, 20(6), 481–486.",
        url: doi("10.1111/j.1365-2923.1986.tb01386.x"),
        openAccess: false,
      },
    ],
  },
  "ADDIE 모델": {
    keyScholars: ["Michael Molenda"],
    seminalWorks: [
      {
        citation: "Molenda, M. (2003). In search of the elusive ADDIE model. Performance Improvement, 42(5), 34–36. (ADDIE는 특정 창시자 없이 관행으로 정착 — 그 기원을 규명한 논문)",
        url: doi("10.1002/pfi.4930420508"),
        openAccess: false,
      },
    ],
  },
  "교수설계": {
    keyScholars: ["Robert M. Gagné", "Charles M. Reigeluth"],
    seminalWorks: [
      {
        citation: "Gagné, R. M. (1965). The Conditions of Learning. Holt, Rinehart & Winston. (단행본)",
        url: null,
        openAccess: false,
      },
    ],
  },
  "게이미피케이션": {
    keyScholars: ["Sebastian Deterding"],
    seminalWorks: [
      {
        citation: "Deterding, S., Dixon, D., Khaled, R., & Nacke, L. (2011). From game design elements to gamefulness: Defining \"gamification\". Proceedings of MindTrek 2011, 9–15.",
        url: doi("10.1145/2181037.2181040"),
        openAccess: false,
      },
    ],
  },
  "플립러닝": {
    keyScholars: ["Jonathan Bergmann", "Aaron Sams", "Maureen J. Lage"],
    seminalWorks: [
      {
        citation: "Lage, M. J., Platt, G. J., & Treglia, M. (2000). Inverting the classroom: A gateway to creating an inclusive learning environment. The Journal of Economic Education, 31(1), 30–43. (학술 원전)",
        url: doi("10.1080/00220480009596759"),
        openAccess: false,
      },
    ],
  },
  "학습분석": {
    keyScholars: ["George Siemens"],
    seminalWorks: [
      {
        citation: "Siemens, G. (2013). Learning analytics: The emergence of a discipline. American Behavioral Scientist, 57(10), 1380–1400.",
        url: doi("10.1177/0002764213498851"),
        openAccess: false,
      },
    ],
  },
  "디지털 리터러시": {
    keyScholars: ["Paul Gilster"],
    seminalWorks: [
      {
        citation: "Gilster, P. (1997). Digital Literacy. Wiley. (단행본)",
        url: null,
        openAccess: false,
      },
    ],
  },
  "컴퓨팅 사고력": {
    keyScholars: ["Jeannette M. Wing"],
    seminalWorks: [
      {
        citation: "Wing, J. M. (2006). Computational thinking. Communications of the ACM, 49(3), 33–35.",
        url: doi("10.1145/1118178.1118215"),
        openAccess: false,
      },
      {
        citation: "위 논문 저자 공개본 PDF (CMU)",
        url: "https://www.cs.cmu.edu/~15110-s13/Wing06-ct.pdf",
        openAccess: true,
      },
    ],
  },
  "적응학습": {
    keyScholars: ["Peter Brusilovsky"],
    seminalWorks: [
      {
        citation: "Brusilovsky, P. (2001). Adaptive hypermedia. User Modeling and User-Adapted Interaction, 11(1–2), 87–110.",
        url: doi("10.1023/A:1011143116306"),
        openAccess: false,
      },
    ],
  },
  "교육공학": {
    keyScholars: ["Alan Januszewski", "Michael Molenda"],
    seminalWorks: [
      {
        citation: "Januszewski, A., & Molenda, M. (Eds.). (2008). Educational Technology: A Definition with Commentary. Routledge. (단행본 — AECT 2008 정의)",
        url: null,
        openAccess: false,
      },
    ],
  },
  "마이크로러닝": {
    keyScholars: ["Theo Hug"],
    seminalWorks: [
      {
        citation: "Hug, T. (2005). Micro learning and narration. Proceedings of Media in Transition 4, MIT. (학술대회 발표)",
        url: null,
        openAccess: false,
      },
    ],
  },
};

async function main() {
  const snap = await db.collection("archive_concepts").get();
  let matched = 0;
  let skipped = 0;
  const unmatchedNames: string[] = [];

  for (const d of snap.docs) {
    const x = d.data() as { name?: string; keyScholars?: string[] };
    const name = x.name ?? "";
    const entry = SCHOLAR_MAP[name];
    if (!entry) {
      unmatchedNames.push(name);
      continue;
    }
    if (Array.isArray(x.keyScholars) && x.keyScholars.length > 0) {
      skipped += 1; // 멱등: 이미 부여된 개념은 보존 (수동 보정 존중)
      continue;
    }
    matched += 1;
    console.log(`■ ${name} ← ${entry.keyScholars.join(", ")} · 원전 ${entry.seminalWorks.length}건 (OA ${entry.seminalWorks.filter((w) => w.openAccess).length})`);
    if (APPLY) {
      await db.collection("archive_concepts").doc(d.id).update({
        keyScholars: entry.keyScholars,
        seminalWorks: entry.seminalWorks,
        updatedAt: new Date().toISOString(),
      });
    }
  }

  console.log(`\n매핑 ${matched} · 기존 보존 ${skipped} · 매핑 제외 ${unmatchedNames.length} (${unmatchedNames.join(", ")})`);
  console.log(APPLY ? "=== 적용 완료 ===" : "=== 드라이런 — --apply 로 저장 ===");
}

void main();
