/**
 * 2026 한국교육공학회 춘계학술대회 — 포스터 세션B 시드 (24개)
 *
 * 대상 활동: /activities/external/4WMIvSwobAIrqT4Nm5Ks
 * 일자: 2026-05-09 (토) — 포스터 세션B 14:30~15:45 — 이화여자대학교 학관
 *
 * Usage:
 *   node --env-file=.env.local scripts/seed-edutech-2026-spring-poster-b.mjs [--dry-run]
 *
 * 동작:
 *   - 해당 활동의 ConferenceProgram 조회 → 없으면 신규 생성, 있으면 day(2026-05-09) 추가
 *   - 같은 날짜의 day가 이미 있으면 포스터 세션 24개를 sessions에 append
 *   - 동일 title 세션은 중복 방지(스킵)
 */
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const ACTIVITY_ID = "4WMIvSwobAIrqT4Nm5Ks";
const DAY_DATE = "2026-05-09";
const DAY_LABEL = "1일차";
const SESSION_START = "14:30";
const SESSION_END = "15:45";
const TRACK = "포스터 세션B";
const LOCATION = "이화여자대학교 학관";

const POSTERS = [
  { n: 1, title: "자기결정성이론 기반 생성형 AI 챗봇 활용활동이 예비교사의 AI 학습 동기와 학습참여에 미치는 영향", speakers: ["유난희", "이정민"], affiliation: "이화여대" },
  { n: 2, title: "초등 고학년 한자어 어휘력 향상을 위한 AI 융합 프로그램 설계 및 효과 검증", speakers: ["이정진", "최영원", "김애영", "백상현"], affiliation: "한신대" },
  { n: 3, title: "예비교사의 역사적 감정이입 함양을 위한 로블록스 기반 역사교육 프로그램 개발 연구", speakers: ["장서윤", "이정민"], affiliation: "이화여대" },
  { n: 4, title: "바이브 코딩 기반 디지털 도구 활용 기후변화 대응 생태전환 수업이 초등학교 6학년 학생의 환경소양과 환경태도에 미치는 효과", speakers: ["고태용", "김애영", "백상현"], affiliation: "한신대" },
  { n: 5, title: "국내외 교육에서 AI 의존에 관한 연구 동향 분석", speakers: ["신미성", "임다미"], affiliation: "국립공주대" },
  { n: 6, title: "초등학생을 위한 학생 주도형 어휘 학습 프로젝트 설계 및 적용", speakers: ["김광섭", "김윤수", "백상현"], affiliation: "한신대" },
  { n: 7, title: "사회과 예비 교원을 위한 탐구기반학습 설계 지원 플랫폼 제작", speakers: ["이윤서", "손윤서", "신은혜", "이수현", "장태진", "임규연"], affiliation: "이화여대" },
  { n: 8, title: "바이브 코딩을 활용한 참여형 교수학습을 통한 중학생의 인공지능 인식 변화", speakers: ["김유린", "백상현", "김애영"], affiliation: "한신대" },
  { n: 9, title: "교육 분야에서의 책임있는 AI(Responsible AI) 연구 동향: BERTopic 기반 토픽모델링 분석", speakers: ["김혜준", "김재현", "김혜민", "전효정", "임규연"], affiliation: "이화여대" },
  { n: 10, title: "AI 융합 수업 설계를 위한 교사-AI 에이전트 협력 지원 시스템 개발 연구", speakers: ["김동현", "손서빈", "홍수민", "문미래"], affiliation: "서울대" },
  { n: 11, title: "협력학습에서 공유된 메타인지 조절을 위한 AI 활용: 주제범위 문헌고찰", speakers: ["박효린", "임예린", "신윤희"], affiliation: "한양대" },
  { n: 12, title: "학생부 기반 역량 평가의 대학별 맥락 차이 분석과 비정형 텍스트 기반 종합평가 지원 AI 솔루션 설계 방향 탐색", speakers: ["정수현(베러러블)", "장정권(일릭서)", "이현희", "임정민(베어러블)"], affiliation: "베어러블·일릭서" },
  { n: 13, title: "디지털 유산 관련 사회적 공감대 활성화를 위한 정보 기반 참여형 플랫폼 제안", speakers: ["김유진", "노희주", "최서경", "이정민"], affiliation: "이화여대" },
  { n: 14, title: "ArguAgent: 다중에이전트 기반 과학적 논증을 위한 스캐폴딩 및 교사 대시보드", speakers: ["박종찬"], affiliation: "University of Georgia" },
  { n: 15, title: "The Impact of Student Assistant Experience on Students' Understanding of the Local Community – A Case Study of the Moyaist Program", speakers: ["Yuki Mori"], affiliation: "Prefectural University of Kumamoto" },
  { n: 16, title: "Reducing AI Dependency: Replacing Written Report Tasks with Voice Submissions", speakers: ["Simon Thollar", "Eunju Kim", "Satomi Shinohe"], affiliation: "Hokkaido Information University" },
  { n: 17, title: "From Participation to Sustained Engagement: Designing AI–Mediated Learning Interactions in Plurilingual Education", speakers: ["Eunju Kim", "Simon Thollar", "Satomi Shinohe"], affiliation: "Hokkaido Information University" },
  { n: 18, title: "Design of an Exercise Therapy Support Program for Rheumatoid Arthritis", speakers: ["Naoko Kamo", "Kenta Kamo"], affiliation: "Shunan University · Yamaguchi Red Cross Hospital" },
  { n: 19, title: "Inquiring Traditional Japanese Mathematics with generative AI – Designing interaction of dialogue –", speakers: ["Tetsuya Kobayashi", "Katsuhiko Shimizu"], affiliation: "Meiji University · Tokyo University of Science" },
  { n: 20, title: "A Preliminary Study on Feedback Design for an Interactive Agent Based on Relational Learning Assessment and Evaluation", speakers: ["Toshio Mochizuki", "Shotaro Otsuka", "Jumpei Nishikawa", "Hironori Egi", "Mamoru Miyazawa", "Yutaka Ishii", "Hiroshi Kato"], affiliation: "Waseda · Osaka · Okayama Prefectural · Univ. of Electro-Communications · The Open University of Japan" },
  { n: 21, title: "Development and Formative Evaluation of a Facilitator–Generative AI Collaborative FBA Training Program: A Single-Session Study", speakers: ["Kazuyuki Kuroda", "Sinzo Isawa"], affiliation: "Hyogo University of Teacher Education" },
  { n: 22, title: "Judgements about the Quality of Work in Inquiry-Based Learning among First-Year University Students with Prior Inquiry Experience in High School", speakers: ["Misaki Hirose", "Go Shoji", "Shigeto Ozawa"], affiliation: "Waseda University" },
  { n: 23, title: "High School Students' Perceptions of Using Generative AI for Academic Writing", speakers: ["Noboru Kawai"], affiliation: "Osaka Prefectural University Tennoji High School" },
  { n: 24, title: "Enhancing Creativity and Well-being through Interdisciplinary Music Learning: Leveraging ICT and STEAM Perspectives in Japanese K-12 Education", speakers: ["Noriko Tokie", "Lisa Tokie"], affiliation: "Joetsu University of Education · Odawara Junior College" },
];

const args = parseArgs(process.argv.slice(2));
const DRY = !!args["dry-run"];

const SVC = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
if (!DRY && !SVC) {
  console.error("✗ FIREBASE_SERVICE_ACCOUNT_KEY is missing in env.");
  process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

function uid(prefix = "s") {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function buildSessions() {
  return POSTERS.map((p) => ({
    id: uid("s"),
    startTime: SESSION_START,
    endTime: SESSION_END,
    track: TRACK,
    category: "poster",
    title: `[${p.n}] ${p.title}`,
    speakers: p.speakers,
    affiliation: p.affiliation,
    location: LOCATION,
  }));
}

async function main() {
  console.log(`▶ activityId: ${ACTIVITY_ID}`);
  console.log(`▶ day: ${DAY_DATE} (${DAY_LABEL}) — ${TRACK}`);
  console.log(`▶ posters: ${POSTERS.length}`);
  console.log(`▶ dry-run: ${DRY}`);

  if (DRY) {
    const sessions = buildSessions();
    console.log("─── sample first session ───");
    console.log(JSON.stringify(sessions[0], null, 2));
    console.log("─── sample last session ───");
    console.log(JSON.stringify(sessions[sessions.length - 1], null, 2));
    console.log("✔ dry-run done. (실제 등록 안 함)");
    return;
  }

  if (!getApps().length) {
    initializeApp({
      credential: cert(JSON.parse(Buffer.from(SVC, "base64").toString("utf8"))),
    });
  }
  const db = getFirestore();

  // 1) activity 존재 확인
  const actSnap = await db.collection("activities").doc(ACTIVITY_ID).get();
  if (!actSnap.exists) {
    console.error(`✗ activity ${ACTIVITY_ID} not found.`);
    process.exit(1);
  }
  const activityTitle = actSnap.get("title") ?? "";
  console.log(`✔ activity 확인: "${activityTitle}"`);

  // 2) 기존 ConferenceProgram 조회
  const progSnap = await db
    .collection("conference_programs")
    .where("activityId", "==", ACTIVITY_ID)
    .limit(1)
    .get();

  const newSessions = buildSessions();
  const nowIso = new Date().toISOString();

  if (progSnap.empty) {
    // 신규 생성
    const ref = db.collection("conference_programs").doc();
    const program = {
      activityId: ACTIVITY_ID,
      title: activityTitle || "2026 한국교육공학회 춘계학술대회",
      notes: "포스터 세션B (이화여자대학교 학관)",
      days: [
        {
          date: DAY_DATE,
          dayLabel: DAY_LABEL,
          sessions: newSessions,
        },
      ],
      createdBy: "seed:edutech-2026-spring",
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    await ref.set(program);
    console.log(`✔ 신규 ConferenceProgram 생성: ${ref.id} (sessions ${newSessions.length})`);
    return;
  }

  // 기존 program day 추가/머지
  const doc = progSnap.docs[0];
  const program = doc.data();
  const days = Array.isArray(program.days) ? program.days : [];
  const existingDayIdx = days.findIndex((d) => d.date === DAY_DATE);
  let added = 0;
  let skipped = 0;

  if (existingDayIdx >= 0) {
    const day = days[existingDayIdx];
    const existingTitles = new Set((day.sessions ?? []).map((s) => s.title));
    const fresh = newSessions.filter((s) => {
      if (existingTitles.has(s.title)) {
        skipped += 1;
        return false;
      }
      return true;
    });
    days[existingDayIdx] = { ...day, sessions: [...(day.sessions ?? []), ...fresh] };
    added = fresh.length;
  } else {
    days.push({ date: DAY_DATE, dayLabel: DAY_LABEL, sessions: newSessions });
    added = newSessions.length;
  }

  await doc.ref.update({ days, updatedAt: nowIso });
  console.log(`✔ 기존 ConferenceProgram 갱신: ${doc.id}`);
  console.log(`  · 추가 세션: ${added}`);
  if (skipped > 0) console.log(`  · 중복 스킵: ${skipped}`);
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith("--")) {
        out[key] = next;
        i += 1;
      } else {
        out[key] = true;
      }
    }
  }
  return out;
}
