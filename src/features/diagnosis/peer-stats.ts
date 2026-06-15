/**
 * 진단 피어 비교 — 익명 동료 분포 집계 (M4).
 *
 * 회원이 자신의 진단 결과를 "동료 대비 어디쯤"인지 비교할 수 있도록, 전체 응시자의
 * 영역별 정답률·준비도 분포를 익명 집계한다.
 *
 * ⚠️ 개인정보 보호: 이 모듈은 집계 통계(표본 수·평균·중앙값·정렬된 분포)만 산출하며,
 *    userId·이름 등 개별 식별 정보는 출력에 포함하지 않는다. 표본이 최소치 미만이면
 *    해당 분포를 보류한다(개인 추정·노이즈 방지).
 *
 * 입력: diagnostic_results 전체(여러 회차 포함). 회원당 "최신 결과 1건"만 분포에 기여한다
 *    (한 회원의 반복 응시가 분포를 왜곡하지 않도록).
 *
 * firestore.rules 가 일반 회원의 전체 read 를 막으므로, 이 집계는 서버(Admin SDK)에서만
 *    수행하고 클라이언트에는 익명 수치만 전달한다.
 */

import {
  DIAGNOSTIC_AREA_ORDER,
  PEER_STATS_MIN_SAMPLE,
  areaScorePercent,
  avgMedian,
  type DiagnosticArea,
  type DiagnosticPeerStats,
  type DiagnosticResult,
  type PeerAreaStat,
  type PeerReadinessStat,
} from "@/types/diagnostic";

/** 영역별 분포 + 내 백분위 표시를 위해 정렬된 원시 값 배열도 함께 보관(내부 전용). */
export interface PeerStatsWithRaw extends DiagnosticPeerStats {
  /** 영역별 정답률 오름차순 정렬값 — 클라이언트 백분위 계산용(익명·무라벨). */
  areaValuesAsc: Partial<Record<DiagnosticArea, number[]>>;
  /** 준비도 오름차순 정렬값 — 백분위 계산용. */
  paperValuesAsc?: number[];
  analysisValuesAsc?: number[];
}

/**
 * 진단 결과 전체 → 익명 피어 분포.
 * @param allResults diagnostic_results 전체(정렬 무관 — 내부에서 회원별 최신 선별).
 */
export function computePeerStats(allResults: DiagnosticResult[]): PeerStatsWithRaw {
  // 회원당 최신 결과 1건 선별 (createdAt 최신 우선).
  const latestByUser = new Map<string, DiagnosticResult>();
  for (const r of allResults) {
    if (!r.userId) continue;
    const prev = latestByUser.get(r.userId);
    if (!prev) {
      latestByUser.set(r.userId, r);
      continue;
    }
    const a = Date.parse(r.createdAt ?? "") || 0;
    const b = Date.parse(prev.createdAt ?? "") || 0;
    if (a >= b) latestByUser.set(r.userId, r);
  }
  const latest = [...latestByUser.values()];

  // 영역별 정답률 수집 — 그 영역을 실제로 응시한(total>0) 회원만.
  const areaValuesAsc: Partial<Record<DiagnosticArea, number[]>> = {};
  const areas: Partial<Record<DiagnosticArea, PeerAreaStat>> = {};
  for (const area of DIAGNOSTIC_AREA_ORDER) {
    const values: number[] = [];
    for (const r of latest) {
      const s = r.areaScores?.[area];
      if (!s || s.total === 0) continue;
      values.push(areaScorePercent(s));
    }
    if (values.length < PEER_STATS_MIN_SAMPLE) continue; // 표본 부족 → 보류
    values.sort((x, y) => x - y);
    areaValuesAsc[area] = values;
    const { avg, median } = avgMedian(values);
    areas[area] = { sample: values.length, avg, median };
  }

  // 준비도 분포 — 저장 시점 값(paperReadiness/analysisReadiness) 사용.
  const paperVals = latest
    .map((r) => r.paperReadiness)
    .filter((v): v is number => typeof v === "number")
    .sort((a, b) => a - b);
  const analysisVals = latest
    .map((r) => r.analysisReadiness)
    .filter((v): v is number => typeof v === "number")
    .sort((a, b) => a - b);

  const buildReadiness = (vals: number[]): PeerReadinessStat | undefined => {
    if (vals.length < PEER_STATS_MIN_SAMPLE) return undefined;
    const { avg, median } = avgMedian(vals);
    return { sample: vals.length, avg, median };
  };

  return {
    totalMembers: latest.length,
    areas,
    paperReadiness: buildReadiness(paperVals),
    analysisReadiness: buildReadiness(analysisVals),
    areaValuesAsc,
    paperValuesAsc: paperVals.length >= PEER_STATS_MIN_SAMPLE ? paperVals : undefined,
    analysisValuesAsc:
      analysisVals.length >= PEER_STATS_MIN_SAMPLE ? analysisVals : undefined,
  };
}
