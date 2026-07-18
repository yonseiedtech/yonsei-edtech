import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { requireAuth } from "@/lib/api-auth";
import { FieldValue } from "firebase-admin/firestore";

export const maxDuration = 60;

/**
 * POST /api/admin/archive-crosslink-backfill
 *
 * 연구방법 ↔ 통계방법 양방향 크로스링크의 기존 데이터 백필.
 *
 * 배경(v5-H3): 과거 편집 Form 은 forward 링크만 저장해 상대 문서의 역참조 필드가
 * 비어 있는 경우가 많다. write-time 동기화는 앞으로의 저장만 보정하므로,
 * 기존 데이터는 이 백필로 양쪽 필드를 정합화한다.
 *
 * 정합화 규칙(비파괴 · union 기반):
 *  - 한쪽이라도 상대를 참조하면 링크가 존재하는 것으로 본다(무방향 union).
 *  - 각 문서에 "있어야 하는데 없는" id 만 arrayUnion 으로 추가한다.
 *  - 기존 id 는 절대 제거하지 않는다(오탐/데이터 손실 방지).
 *
 * 모드:
 *  - 기본(dry-run): 변경 예정 문서·id 건수만 보고. 쓰기 없음.
 *  - `?apply=true`: 실제 arrayUnion 반영(admin batch, 400건 단위 청킹).
 *
 * 권한: admin.
 */
export async function POST(req: NextRequest) {
  const authResult = await requireAuth(req, "admin");
  if (authResult instanceof NextResponse) return authResult;

  const apply = req.nextUrl.searchParams.get("apply") === "true";

  const RESEARCH = "archive_research_methods";
  const STAT = "archive_statistical_methods";

  try {
    const db = getAdminDb();
    const [researchSnap, statSnap] = await Promise.all([
      db.collection(RESEARCH).get(),
      db.collection(STAT).get(),
    ]);

    const researchIds = new Set(researchSnap.docs.map((d) => d.id));
    const statIds = new Set(statSnap.docs.map((d) => d.id));

    // 무방향 링크 집합 구성.
    //  research → stat 방향: research.statisticalMethodIds
    //  stat → research 방향: stat.relatedResearchMethodIds
    // 존재하지 않는 상대 문서를 가리키는 dangling id 는 무시(정합화 대상 아님).
    const statForResearch = new Map<string, Set<string>>(); // researchId → {statId}
    const researchForStat = new Map<string, Set<string>>(); // statId → {researchId}

    const addLink = (rId: string, sId: string) => {
      if (!researchIds.has(rId) || !statIds.has(sId)) return;
      if (!statForResearch.has(rId)) statForResearch.set(rId, new Set());
      statForResearch.get(rId)!.add(sId);
      if (!researchForStat.has(sId)) researchForStat.set(sId, new Set());
      researchForStat.get(sId)!.add(rId);
    };

    for (const d of researchSnap.docs) {
      const ids = (d.data().statisticalMethodIds as string[] | undefined) ?? [];
      for (const sId of ids) addLink(d.id, sId);
    }
    for (const d of statSnap.docs) {
      const ids = (d.data().relatedResearchMethodIds as string[] | undefined) ?? [];
      for (const rId of ids) addLink(rId, d.id);
    }

    // 각 문서에 추가할 누락 id 계산.
    type Pending = { collection: string; id: string; field: string; add: string[] };
    const pending: Pending[] = [];

    for (const d of researchSnap.docs) {
      const desired = statForResearch.get(d.id);
      if (!desired || desired.size === 0) continue;
      const actual = new Set((d.data().statisticalMethodIds as string[] | undefined) ?? []);
      const missing = [...desired].filter((id) => !actual.has(id));
      if (missing.length > 0) {
        pending.push({ collection: RESEARCH, id: d.id, field: "statisticalMethodIds", add: missing });
      }
    }
    for (const d of statSnap.docs) {
      const desired = researchForStat.get(d.id);
      if (!desired || desired.size === 0) continue;
      const actual = new Set((d.data().relatedResearchMethodIds as string[] | undefined) ?? []);
      const missing = [...desired].filter((id) => !actual.has(id));
      if (missing.length > 0) {
        pending.push({ collection: STAT, id: d.id, field: "relatedResearchMethodIds", add: missing });
      }
    }

    const docsToUpdate = pending.length;
    const idsToAdd = pending.reduce((sum, p) => sum + p.add.length, 0);

    if (!apply) {
      return NextResponse.json({
        mode: "dry-run",
        researchDocs: researchSnap.size,
        statDocs: statSnap.size,
        docsToUpdate,
        idsToAdd,
        sample: pending.slice(0, 20).map((p) => ({
          collection: p.collection,
          id: p.id,
          field: p.field,
          addCount: p.add.length,
        })),
      });
    }

    // apply — admin batch (500 상한 → 400건 단위 청킹)
    const nowIso = new Date().toISOString();
    let updated = 0;
    for (let i = 0; i < pending.length; i += 400) {
      const chunk = pending.slice(i, i + 400);
      const batch = db.batch();
      for (const p of chunk) {
        batch.update(db.collection(p.collection).doc(p.id), {
          [p.field]: FieldValue.arrayUnion(...p.add),
          updatedAt: nowIso,
        });
      }
      await batch.commit();
      updated += chunk.length;
    }

    return NextResponse.json({ mode: "apply", docsUpdated: updated, idsAdded: idsToAdd });
  } catch (err) {
    console.error("[/api/admin/archive-crosslink-backfill]", err);
    return NextResponse.json(
      { error: "크로스링크 백필에 실패했습니다." },
      { status: 500 },
    );
  }
}
