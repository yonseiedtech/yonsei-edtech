import type { AlumniThesis } from "@/types";
import { yearFrom, type EraBucket } from "./shared";

/**
 * multi-axis — 연구분석 다축 엔진 (사이클 121 리브랜딩)
 * 졸업생 학위논문을 연구방법·변인·측정도구·대상 등 여러 축으로
 * (1) 시대별 트렌드, (2) 항목별 모아보기(drill-down) 한다.
 * 변인·측정도구는 ID 배열이므로 화면단에서 id→name 맵으로 라벨링한다.
 */

export type AxisKey = "method" | "variable" | "measurement" | "subject" | "keyword";

/** 논문에서 해당 축의 값(문자열/ID 배열)을 뽑는다 */
export const AXIS_ACCESSORS: Record<AxisKey, (t: AlumniThesis) => string[]> = {
  method: (t) => t.analysis?.researchMethods ?? [],
  variable: (t) => t.variableIds ?? [],
  measurement: (t) => t.measurementIds ?? [],
  subject: (t) => t.analysis?.subjects ?? [],
  keyword: (t) => t.keywords ?? [],
};

export const AXIS_LABELS: Record<AxisKey, string> = {
  method: "연구방법",
  variable: "변인",
  measurement: "측정도구",
  subject: "연구대상",
  keyword: "키워드",
};

/** 항목별 전체 빈도 (내림차순). limit 지정 시 상위 N개. */
export function topItems(
  theses: AlumniThesis[],
  accessor: (t: AlumniThesis) => string[],
  limit?: number,
): { item: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const t of theses) {
    const seen = new Set<string>();
    for (const raw of accessor(t)) {
      const v = raw.trim();
      if (!v || seen.has(v)) continue; // 논문당 1회
      seen.add(v);
      counts.set(v, (counts.get(v) ?? 0) + 1);
    }
  }
  const arr = [...counts.entries()]
    .map(([item, count]) => ({ item, count }))
    .sort((a, b) => b.count - a.count);
  return limit ? arr.slice(0, limit) : arr;
}

/**
 * 시대 버킷 × 항목 빈도 — 스택/스트림 트렌드용.
 * items(상위 항목 목록)에 한정해 era별 카운트 행렬을 만든다.
 */
export function axisTrendByEra(
  theses: AlumniThesis[],
  accessor: (t: AlumniThesis) => string[],
  eras: EraBucket[],
  items: string[],
): { era: EraBucket; total: number; counts: Record<string, number> }[] {
  const itemSet = new Set(items);
  return eras.map((era) => {
    const counts: Record<string, number> = {};
    for (const it of items) counts[it] = 0;
    let total = 0;
    for (const t of theses) {
      const y = yearFrom(t);
      if (y == null || y < era.from || y > era.to) continue;
      const seen = new Set<string>();
      for (const raw of accessor(t)) {
        const v = raw.trim();
        if (!v || !itemSet.has(v) || seen.has(v)) continue;
        seen.add(v);
        counts[v] += 1;
        total += 1;
      }
    }
    return { era, total, counts };
  });
}

/** 특정 항목(방법/변인ID/측정도구ID 등)을 포함하는 논문 모음 — drill-down */
export function collectByItem(
  theses: AlumniThesis[],
  accessor: (t: AlumniThesis) => string[],
  item: string,
): AlumniThesis[] {
  return theses
    .filter((t) => accessor(t).map((x) => x.trim()).includes(item))
    .sort((a, b) => (yearFrom(b) ?? 0) - (yearFrom(a) ?? 0));
}

/** 특정 연도 논문 모음 — drill-down */
export function collectByYear(theses: AlumniThesis[], year: number): AlumniThesis[] {
  return theses
    .filter((t) => yearFrom(t) === year)
    .sort((a, b) => (a.title ?? "").localeCompare(b.title ?? ""));
}

/** 연도별 논문 수 (타임라인용) */
export function countByYear(theses: AlumniThesis[]): { year: number; count: number }[] {
  const counts = new Map<number, number>();
  for (const t of theses) {
    const y = yearFrom(t);
    if (y == null) continue;
    counts.set(y, (counts.get(y) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([year, count]) => ({ year, count }))
    .sort((a, b) => a.year - b.year);
}

/** 통합 검색 — 제목·키워드·변인명·방법·대상에서 부분일치. variableNames는 id→name 변환 결과를 넘긴다. */
export function searchTheses(
  theses: AlumniThesis[],
  query: string,
  opts?: { variableNameOf?: (id: string) => string; measurementNameOf?: (id: string) => string },
): AlumniThesis[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return theses.filter((t) => {
    const hay: string[] = [
      t.title ?? "",
      ...(t.keywords ?? []),
      ...(t.analysis?.researchMethods ?? []),
      ...(t.analysis?.subjects ?? []),
      ...(t.variableIds ?? []).map((id) => opts?.variableNameOf?.(id) ?? ""),
      ...(t.measurementIds ?? []).map((id) => opts?.measurementNameOf?.(id) ?? ""),
    ];
    return hay.some((s) => s.toLowerCase().includes(q));
  });
}
