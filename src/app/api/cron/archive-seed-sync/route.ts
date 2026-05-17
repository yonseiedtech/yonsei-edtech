import { NextRequest } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { verifyCronAuth } from "@/lib/cron-auth";
import {
  SEED_CONCEPTS,
  SEED_VARIABLES,
  SEED_MEASUREMENTS,
  SEED_CONCEPT_VARIABLE_LINKS,
  SEED_VARIABLE_MEASUREMENT_LINKS,
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

    // ─── Linking — 이름→ID 매핑 후 양방향 연결 (멱등) ───
    const [cSnap, vSnap, mSnap] = await Promise.all([
      db.collection("archive_concepts").get(),
      db.collection("archive_variables").get(),
      db.collection("archive_measurements").get(),
    ]);
    const conceptByName = new Map<string, { id: string; variableIds?: string[] }>();
    cSnap.docs.forEach((d) => {
      const data = d.data() as { name?: string; variableIds?: string[] };
      if (data?.name) conceptByName.set(data.name, { id: d.id, variableIds: data.variableIds });
    });
    const variableByName = new Map<
      string,
      { id: string; conceptIds?: string[]; measurementIds?: string[] }
    >();
    vSnap.docs.forEach((d) => {
      const data = d.data() as {
        name?: string;
        conceptIds?: string[];
        measurementIds?: string[];
      };
      if (data?.name)
        variableByName.set(data.name, {
          id: d.id,
          conceptIds: data.conceptIds,
          measurementIds: data.measurementIds,
        });
    });
    const measurementByName = new Map<string, { id: string; variableIds?: string[] }>();
    mSnap.docs.forEach((d) => {
      const data = d.data() as { name?: string; variableIds?: string[] };
      if (data?.name)
        measurementByName.set(data.name, { id: d.id, variableIds: data.variableIds });
    });

    let conceptToVariableLinks = 0;
    let variableToMeasurementLinks = 0;
    const variableConceptAcc = new Map<string, Set<string>>();

    // 개념 → 변인
    for (const [conceptName, variableNames] of Object.entries(SEED_CONCEPT_VARIABLE_LINKS)) {
      const c = conceptByName.get(conceptName);
      if (!c) continue;
      const varIds = variableNames
        .map((n) => variableByName.get(n)?.id)
        .filter((id): id is string => !!id);
      if (varIds.length === 0) continue;
      const existing = new Set(c.variableIds ?? []);
      const before = existing.size;
      varIds.forEach((id) => existing.add(id));
      if (existing.size > before) {
        await db
          .collection("archive_concepts")
          .doc(c.id)
          .update({ variableIds: Array.from(existing), updatedAt: NOW_ISO() });
        conceptToVariableLinks += existing.size - before;
      }
      for (const vName of variableNames) {
        const v = variableByName.get(vName);
        if (!v) continue;
        let set = variableConceptAcc.get(v.id);
        if (!set) {
          set = new Set(v.conceptIds ?? []);
          variableConceptAcc.set(v.id, set);
        }
        set.add(c.id);
      }
    }
    for (const [vId, set] of variableConceptAcc) {
      await db
        .collection("archive_variables")
        .doc(vId)
        .update({ conceptIds: Array.from(set), updatedAt: NOW_ISO() });
    }

    // 변인 → 측정도구
    const measurementVariableAcc = new Map<string, Set<string>>();
    for (const [variableName, measurementNames] of Object.entries(
      SEED_VARIABLE_MEASUREMENT_LINKS,
    )) {
      const v = variableByName.get(variableName);
      if (!v) continue;
      const mIds = measurementNames
        .map((n) => measurementByName.get(n)?.id)
        .filter((id): id is string => !!id);
      if (mIds.length === 0) continue;
      const existing = new Set(v.measurementIds ?? []);
      const before = existing.size;
      mIds.forEach((id) => existing.add(id));
      if (existing.size > before) {
        await db
          .collection("archive_variables")
          .doc(v.id)
          .update({ measurementIds: Array.from(existing), updatedAt: NOW_ISO() });
        variableToMeasurementLinks += existing.size - before;
      }
      for (const mName of measurementNames) {
        const m = measurementByName.get(mName);
        if (!m) continue;
        let set = measurementVariableAcc.get(m.id);
        if (!set) {
          set = new Set(m.variableIds ?? []);
          measurementVariableAcc.set(m.id, set);
        }
        set.add(v.id);
      }
    }
    for (const [mId, set] of measurementVariableAcc) {
      await db
        .collection("archive_measurements")
        .doc(mId)
        .update({ variableIds: Array.from(set), updatedAt: NOW_ISO() });
    }

    return Response.json({
      ok: true,
      concepts,
      variables,
      measurements,
      links: { conceptToVariableLinks, variableToMeasurementLinks },
      summary: {
        totalCreated: concepts.created + variables.created + measurements.created,
        totalLinks: conceptToVariableLinks + variableToMeasurementLinks,
      },
    });
  } catch (err) {
    console.error("[cron/archive-seed-sync]", err);
    return Response.json({ error: "Internal error", detail: (err as Error).message }, { status: 500 });
  }
}
