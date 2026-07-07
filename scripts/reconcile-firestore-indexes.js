// QA-v3 C5 (2026-07-05): Firestore 복합 인덱스 드리프트 해소.
//  1) 운영 DB의 실제 인덱스 목록을 REST 로 조회
//  2) 코드가 요구하는데 없는 인덱스를 생성 (public.ics 500 등 원인)
//  3) firestore.indexes.json 을 "운영 ∪ 필요" 합집합으로 재작성 → 파일이 정본이 되도록
// 실행: set -a; source .env.local; set +a
//       node scripts/reconcile-firestore-indexes.js          (드라이런)
//       node scripts/reconcile-firestore-indexes.js --apply  (생성+파일 갱신)
const fs = require("fs");
const path = require("path");
const { GoogleAuth } = require("google-auth-library");

const APPLY = process.argv.includes("--apply");
const sa = JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_KEY, "base64").toString("utf8"));
const BASE = `https://firestore.googleapis.com/v1/projects/${sa.project_id}/databases/(default)`;

// 코드 감사(QA v3)에서 확인된 필수 복합 인덱스
const REQUIRED = [
  // /api/calendar/me.ics — attendeeIds array-contains + status in + orderBy date desc
  { collectionGroup: "seminars", fields: [
    { fieldPath: "attendeeIds", arrayConfig: "CONTAINS" },
    { fieldPath: "status", order: "ASCENDING" },
    { fieldPath: "date", order: "DESCENDING" },
  ]},
  // /api/calendar/public.ics — status in + orderBy date desc (현재 운영 500)
  { collectionGroup: "seminars", fields: [
    { fieldPath: "status", order: "ASCENDING" },
    { fieldPath: "date", order: "DESCENDING" },
  ]},
  // /api/me/export + 알림벨(bkend notificationsApi.listByUser)
  { collectionGroup: "notifications", fields: [
    { fieldPath: "userId", order: "ASCENDING" },
    { fieldPath: "createdAt", order: "DESCENDING" },
  ]},
  // 알림 정리 크론 — 읽음 30일 초과 분리 쿼리 (QA-v3 기아 해소)
  { collectionGroup: "notifications", fields: [
    { fieldPath: "read", order: "ASCENDING" },
    { fieldPath: "createdAt", order: "ASCENDING" },
  ]},
  // 쪽지함 (받은/보낸)
  { collectionGroup: "direct_messages", fields: [
    { fieldPath: "toId", order: "ASCENDING" },
    { fieldPath: "createdAt", order: "DESCENDING" },
  ]},
  { collectionGroup: "direct_messages", fields: [
    { fieldPath: "fromId", order: "ASCENDING" },
    { fieldPath: "createdAt", order: "DESCENDING" },
  ]},
  // 진단 이력 (아카이브 약점 추천의 조용한 실패 원인)
  { collectionGroup: "diagnostic_results", fields: [
    { fieldPath: "userId", order: "ASCENDING" },
    { fieldPath: "createdAt", order: "DESCENDING" },
  ]},
  // 사이트 팝업 listActive
  { collectionGroup: "site_popups", fields: [
    { fieldPath: "active", order: "ASCENDING" },
    { fieldPath: "priority", order: "DESCENDING" },
  ]},
  // 콘솔 활동 로그 경로 필터
  { collectionGroup: "user_activity_logs", fields: [
    { fieldPath: "pathGroup", order: "ASCENDING" },
    { fieldPath: "createdAt", order: "DESCENDING" },
  ]},
  // 호스트 회고
  { collectionGroup: "host_retrospectives", fields: [
    { fieldPath: "activityType", order: "ASCENDING" },
    { fieldPath: "activityId", order: "ASCENDING" },
    { fieldPath: "createdAt", order: "DESCENDING" },
  ]},
  // ── codex 교차분석(2026-07-07): where+orderBy(다른필드) 복합 인덱스 누락 ──
  // 온보딩 위젯 — enabled=true + order asc (신규 항목이 위젯에 안 뜨던 원인)
  { collectionGroup: "onboarding_checklist", fields: [
    { fieldPath: "enabled", order: "ASCENDING" },
    { fieldPath: "order", order: "ASCENDING" },
  ]},
  // 학기 로드맵 — published + order asc
  { collectionGroup: "roadmap_stages", fields: [
    { fieldPath: "published", order: "ASCENDING" },
    { fieldPath: "order", order: "ASCENDING" },
  ]},
  // 강의 후기 — 과목별 / 작성자별 최신순
  { collectionGroup: "course_reviews", fields: [
    { fieldPath: "courseOfferingId", order: "ASCENDING" },
    { fieldPath: "createdAt", order: "DESCENDING" },
  ]},
  { collectionGroup: "course_reviews", fields: [
    { fieldPath: "authorId", order: "ASCENDING" },
    { fieldPath: "createdAt", order: "DESCENDING" },
  ]},
  // 세미나 대기열 — 순번 asc (자동 승격)
  { collectionGroup: "seminar_waitlist", fields: [
    { fieldPath: "seminarId", order: "ASCENDING" },
    { fieldPath: "position", order: "ASCENDING" },
  ]},
  // 세미나 홍보물 이력 — 세미나별 최신순
  { collectionGroup: "promotion_contents", fields: [
    { fieldPath: "seminarId", order: "ASCENDING" },
    { fieldPath: "createdAt", order: "DESCENDING" },
  ]},
  // 인터뷰 응답 댓글 — 응답별 오래된순
  { collectionGroup: "interview_response_comments", fields: [
    { fieldPath: "responseId", order: "ASCENDING" },
    { fieldPath: "createdAt", order: "ASCENDING" },
  ]},
  // 명함 교환 — 받은/준 목록 최신순
  { collectionGroup: "business_card_exchanges", fields: [
    { fieldPath: "receiverId", order: "ASCENDING" },
    { fieldPath: "createdAt", order: "DESCENDING" },
  ]},
  { collectionGroup: "business_card_exchanges", fields: [
    { fieldPath: "ownerId", order: "ASCENDING" },
    { fieldPath: "createdAt", order: "DESCENDING" },
  ]},
  // 에이전트 워크플로우 실행 이력 — 본인 최신순
  { collectionGroup: "agent_workflow_runs", fields: [
    { fieldPath: "userId", order: "ASCENDING" },
    { fieldPath: "createdAt", order: "DESCENDING" },
  ]},
];

function fieldKey(f) {
  return `${f.fieldPath}:${f.order || f.arrayConfig}`;
}
function indexKey(cg, fields) {
  // __name__ 자동 필드 제외
  return `${cg}|${fields.filter((f) => f.fieldPath !== "__name__").map(fieldKey).join(",")}`;
}

async function main() {
  const auth = new GoogleAuth({ credentials: sa, scopes: ["https://www.googleapis.com/auth/cloud-platform"] });
  const client = await auth.getClient();
  const { token } = await client.getAccessToken();
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  // 1) 운영 인덱스 전체 조회 (페이지네이션)
  const live = [];
  let pageToken = "";
  do {
    const url = `${BASE}/collectionGroups/-/indexes${pageToken ? `?pageToken=${pageToken}` : ""}`;
    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error(`list failed: ${res.status} ${await res.text()}`);
    const body = await res.json();
    live.push(...(body.indexes || []));
    pageToken = body.nextPageToken || "";
  } while (pageToken);

  const composite = live.filter((ix) => ix.queryScope === "COLLECTION");
  const liveKeys = new Set(
    composite.map((ix) => indexKey(ix.name.split("/collectionGroups/")[1].split("/")[0], ix.fields)),
  );
  console.log(`운영 복합 인덱스: ${composite.length}개`);

  // 2) 누락분 생성
  const missing = REQUIRED.filter((r) => !liveKeys.has(indexKey(r.collectionGroup, r.fields)));
  console.log(`필수 ${REQUIRED.length}개 중 누락 ${missing.length}개`);
  for (const m of missing) {
    console.log(`${APPLY ? "CREATE" : "would create"}: ${indexKey(m.collectionGroup, m.fields)}`);
    if (!APPLY) continue;
    const res = await fetch(`${BASE}/collectionGroups/${m.collectionGroup}/indexes`, {
      method: "POST",
      headers,
      body: JSON.stringify({ queryScope: "COLLECTION", fields: m.fields }),
    });
    if (!res.ok) {
      const txt = await res.text();
      if (res.status === 409) console.log("  → 이미 존재 (409)");
      else if (res.status === 403) console.log("  → SA 권한 없음 (403) — firebase CLI 로 배포 필요");
      else throw new Error(`create failed: ${res.status} ${txt}`);
    } else {
      console.log("  → 생성 요청됨 (빌드 수 분 소요)");
    }
  }

  // 3) firestore.indexes.json 재작성 = 운영(생성 요청 포함) ∪ 필수
  if (APPLY) {
    const filePath = path.join(__dirname, "..", "firestore.indexes.json");
    const existing = JSON.parse(fs.readFileSync(filePath, "utf8"));
    const seen = new Set();
    const merged = [];
    const push = (cg, fields) => {
      const key = indexKey(cg, fields);
      if (seen.has(key)) return;
      seen.add(key);
      merged.push({
        collectionGroup: cg,
        queryScope: "COLLECTION",
        fields: fields
          .filter((f) => f.fieldPath !== "__name__")
          .map((f) => (f.arrayConfig ? { fieldPath: f.fieldPath, arrayConfig: f.arrayConfig } : { fieldPath: f.fieldPath, order: f.order })),
      });
    };
    for (const ix of composite) push(ix.name.split("/collectionGroups/")[1].split("/")[0], ix.fields);
    for (const r of REQUIRED) push(r.collectionGroup, r.fields);
    merged.sort((a, b) => a.collectionGroup.localeCompare(b.collectionGroup) || JSON.stringify(a.fields).localeCompare(JSON.stringify(b.fields)));
    fs.writeFileSync(filePath, JSON.stringify({ indexes: merged, fieldOverrides: existing.fieldOverrides ?? [] }, null, 2) + "\n");
    console.log(`firestore.indexes.json 재작성: 총 ${merged.length}개 (기존 파일 ${existing.indexes.length}개)`);
  }
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
