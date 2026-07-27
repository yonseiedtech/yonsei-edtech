/**
 * v16 연결고리(Weave) 측정 — 러닝 가이드 진행/완독 서버 집계 (v17-H2).
 *
 * 원칙(adoption-metrics 준용):
 *  - 개인 식별 목록은 만들지 않는다(카운트만).
 *  - firestore.rules 가 회원의 전체 read 를 막으므로 서버(Admin SDK)에서만 수행한다.
 *  - 완독 판정: 한 회원의 가이드 진행 문서(learning_guide_progress)의 읽은 페이지 수가
 *    해당 가이드의 전체 페이지 수(guide_pages) 이상이면 완독으로 본다(진행률 100%).
 *  - 신규 cron 없이 컬렉션 직접 읽어 집계(읽기 전용). DB/rules 무변경.
 */

export interface WeaveGuideMetrics {
  /** 진행(1페이지 이상 읽음) 문서 수 */
  started: number;
  /** 완독(전체 페이지 읽음) 문서 수 */
  completed: number;
  /** 완독률 = completed / started (0~100). started=0 이면 null(데이터 부족) */
  completionRate: number | null;
  /** 페이지가 등록된 가이드 수 — 분모 신뢰도 참고값 */
  guidesWithPages: number;
}

/**
 * 러닝 가이드 진행/완독 집계. 서버(Admin SDK) 전용.
 */
export async function computeWeaveGuides(
  db: FirebaseFirestore.Firestore,
): Promise<WeaveGuideMetrics> {
  // 1) guide_pages → guideId 별 페이지 수 (완독 판정의 분모)
  const pagesByGuide = new Map<string, number>();
  const pagesSnap = await db.collection("guide_pages").limit(5000).get();
  for (const d of pagesSnap.docs) {
    const gid = (d.data() as { guideId?: string }).guideId;
    if (!gid) continue;
    pagesByGuide.set(gid, (pagesByGuide.get(gid) ?? 0) + 1);
  }

  // 2) learning_guide_progress → 시작/완독 카운트
  let started = 0;
  let completed = 0;
  const progSnap = await db.collection("learning_guide_progress").limit(5000).get();
  for (const d of progSnap.docs) {
    const raw = d.data() as { guideId?: string; readPageIds?: unknown };
    const readCount = Array.isArray(raw.readPageIds) ? raw.readPageIds.length : 0;
    if (readCount <= 0) continue;
    started++;
    const total = raw.guideId ? (pagesByGuide.get(raw.guideId) ?? 0) : 0;
    if (total > 0 && readCount >= total) completed++;
  }

  const completionRate =
    started > 0 ? Math.round((completed / started) * 100) : null;

  return { started, completed, completionRate, guidesWithPages: pagesByGuide.size };
}
