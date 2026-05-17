import { NextRequest } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { verifyCronAuth } from "@/lib/cron-auth";
import {
  SEED_CONCEPTS,
  SEED_VARIABLES,
  SEED_MEASUREMENTS,
} from "@/lib/archive-seed";

/**
 * 교육공학 아카이브 시드 자동 적용 cron — Seed-Cron
 *
 * 매일 09:00 KST 실행. archive-seed.ts 의 SEED_CONCEPTS/VARIABLES/MEASUREMENTS 와
 * 현재 DB 컬렉션을 비교해 이름이 일치하지 않는 항목만 자동 create (중복 가드).
 *
 * 운영자가 /console/archive 의 "기본 시드 불러오기" 버튼을 누르지 않아도
 * 새 시드 추가 시 다음 cron tick 에서 자동 반영된다.
 */

const NOW_ISO = () => new Date().toISOString();

async function syncCollection<T extends { name: string }>(
  db: FirebaseFirestore.Firestore,
  collectionName: string,
  seedItems: T[],
  buildPayload: (item: T) => Record<string, unknown>,
): Promise<{ existing: number; created: number; createdNames: string[] }> {
  const snap = await db.collection(collectionName).get();
  const existingNames = new Set<string>();
  for (const doc of snap.docs) {
    const data = doc.data() as { name?: string };
    if (data?.name) existingNames.add(data.name);
  }
  const toCreate = seedItems.filter((s) => !existingNames.has(s.name));
  const createdNames: string[] = [];
  for (const item of toCreate) {
    const now = NOW_ISO();
    await db.collection(collectionName).add({
      ...buildPayload(item),
      createdAt: now,
      updatedAt: now,
      createdBy: "system:cron-seed-sync",
    });
    createdNames.push(item.name);
  }
  return {
    existing: existingNames.size,
    created: createdNames.length,
    createdNames,
  };
}

export async function GET(req: NextRequest) {
  if (!verifyCronAuth(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = getAdminDb();

    const concepts = await syncCollection(db, "archive_concepts", SEED_CONCEPTS, (s) => ({
      name: s.name,
      description: s.description,
      altNames: s.altNames ?? [],
      tags: s.tags ?? [],
      references: s.references ?? [],
    }));

    const variables = await syncCollection(db, "archive_variables", SEED_VARIABLES, (s) => ({
      name: s.name,
      description: s.description,
      type: s.type,
      altNames: s.altNames ?? [],
      tags: s.tags ?? [],
      references: s.references ?? [],
    }));

    const measurements = await syncCollection(db, "archive_measurements", SEED_MEASUREMENTS, (s) => ({
      name: s.name,
      description: s.description,
      originalName: s.originalName,
      author: s.author,
      itemCount: s.itemCount,
      sampleItems: s.sampleItems ?? [],
      scaleType: s.scaleType,
      reliability: s.reliability,
      validity: s.validity,
      resourceUrl: s.resourceUrl,
      altNames: s.altNames ?? [],
      tags: s.tags ?? [],
      references: s.references ?? [],
    }));

    return Response.json({
      ok: true,
      concepts,
      variables,
      measurements,
      summary: {
        totalCreated: concepts.created + variables.created + measurements.created,
      },
    });
  } catch (err) {
    console.error("[cron/archive-seed-sync]", err);
    return Response.json({ error: "Internal error", detail: (err as Error).message }, { status: 500 });
  }
}
