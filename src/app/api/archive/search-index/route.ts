import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import type {
  ArchiveSearchIndexItem,
  ArchiveSearchIndexResponse,
  ArchiveSearchIndexType,
} from "@/lib/archive-search-index";

/**
 * GET /api/archive/search-index (v5-M8, 2026-07-18)
 *
 * 랜딩 통합 검색용 경량 인덱스. admin SDK로 7개 아카이브 컬렉션에서
 * 검색 매칭에 필요한 최소 필드(name·altNames·tags·aectTerm)만 추출해 반환한다.
 * CDN 15분 캐시로 방문자당 Firestore 읽기를 제거한다(개인화 없음 — 전원 공유 응답).
 *
 * 공개 게이트: 4개 컬렉션(연구/통계/기초용어/글쓰기)은 published=true 만 포함
 * (concept·variable·measurement 은 상시 공개 정책).
 */
export const maxDuration = 30;

/** 문자열 배열 후보들을 평탄화·중복 제거해 반환(비면 undefined). */
function collectStrings(...vals: unknown[]): string[] | undefined {
  const out: string[] = [];
  for (const v of vals) {
    if (typeof v === "string" && v.trim()) out.push(v);
    else if (Array.isArray(v)) {
      for (const x of v) if (typeof x === "string" && x.trim()) out.push(x);
    }
  }
  return out.length ? Array.from(new Set(out)) : undefined;
}

function asString(v: unknown): string | undefined {
  return typeof v === "string" && v.trim() ? v : undefined;
}

/** 최소 필드로 인덱스 항목을 만든다. name 이 없으면 제외(null). */
function makeItem(
  type: ArchiveSearchIndexType,
  id: string,
  name: string | undefined,
  altNames?: string[],
  tags?: string[],
  aectTerm?: string,
): ArchiveSearchIndexItem | null {
  if (!name) return null;
  const item: ArchiveSearchIndexItem = { type, id, name };
  if (altNames && altNames.length) item.altNames = altNames;
  if (tags && tags.length) item.tags = tags;
  if (aectTerm) item.aectTerm = aectTerm;
  return item;
}

/** published=true(불리언) 인 문서만 통과. 하위호환으로 문자열 "true" 도 허용. */
function isPublished(d: Record<string, unknown>): boolean {
  return d.published === true || d.published === "true";
}

export async function GET() {
  try {
    const db = getAdminDb();
    const [
      concepts,
      variables,
      measurements,
      research,
      statistical,
      foundation,
      writing,
    ] = await Promise.all([
      db.collection("archive_concepts").limit(500).get(),
      db.collection("archive_variables").limit(500).get(),
      db.collection("archive_measurements").limit(500).get(),
      db.collection("archive_research_methods").limit(300).get(),
      db.collection("archive_statistical_methods").limit(300).get(),
      db.collection("archive_foundation_terms").limit(300).get(),
      db.collection("archive_writing_tips").limit(300).get(),
    ]);

    const items: ArchiveSearchIndexItem[] = [];
    const push = (it: ArchiveSearchIndexItem | null) => {
      if (it) items.push(it);
    };

    // 상시 공개 3종 (concept·variable·measurement)
    for (const doc of concepts.docs) {
      const d = doc.data();
      push(
        makeItem(
          "concept",
          doc.id,
          asString(d.name),
          collectStrings(d.altNames, d.purifiedName),
          collectStrings(d.tags),
          asString(d.aectTerm),
        ),
      );
    }
    for (const doc of variables.docs) {
      const d = doc.data();
      push(
        makeItem(
          "variable",
          doc.id,
          asString(d.name),
          collectStrings(d.altNames),
          collectStrings(d.tags),
        ),
      );
    }
    for (const doc of measurements.docs) {
      const d = doc.data();
      push(
        makeItem(
          "measurement",
          doc.id,
          asString(d.name),
          collectStrings(d.originalName, d.author),
          collectStrings(d.tags),
        ),
      );
    }

    // published 게이트 4종
    for (const doc of research.docs) {
      const d = doc.data();
      if (!isPublished(d)) continue;
      push(
        makeItem(
          "research-methods",
          doc.id,
          asString(d.name),
          collectStrings(d.altNames, d.purifiedName),
          collectStrings(d.tags),
          asString(d.aectTerm),
        ),
      );
    }
    for (const doc of statistical.docs) {
      const d = doc.data();
      if (!isPublished(d)) continue;
      push(
        makeItem(
          "statistical-methods",
          doc.id,
          asString(d.name),
          collectStrings(d.altNames, d.purifiedName),
          collectStrings(d.tags),
          asString(d.aectTerm),
        ),
      );
    }
    for (const doc of foundation.docs) {
      const d = doc.data();
      if (!isPublished(d)) continue;
      push(
        makeItem(
          "foundation-terms",
          doc.id,
          // 기초용어의 표시·주 이름은 term 필드.
          asString(d.term),
          collectStrings(d.englishName, d.abbreviation, d.purifiedName),
          collectStrings(d.tags),
          asString(d.aectTerm),
        ),
      );
    }
    for (const doc of writing.docs) {
      const d = doc.data();
      if (!isPublished(d)) continue;
      push(
        makeItem(
          "writing-tips",
          doc.id,
          asString(d.title),
          undefined,
          collectStrings(d.tags),
        ),
      );
    }

    const body: ArchiveSearchIndexResponse = {
      items,
      count: items.length,
      generatedAt: new Date().toISOString(),
    };

    return NextResponse.json(body, {
      // 개인화 없는 공유 응답 — CDN 15분 캐시 + 1시간 stale-while-revalidate.
      headers: {
        "Cache-Control": "public, s-maxage=900, stale-while-revalidate=3600",
      },
    });
  } catch (err) {
    console.error("[api/archive/search-index]", err);
    return NextResponse.json(
      { error: "검색 인덱스 생성에 실패했습니다." },
      { status: 500 },
    );
  }
}
