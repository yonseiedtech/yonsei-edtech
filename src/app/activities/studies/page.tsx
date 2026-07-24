/**
 * 스터디 목록 — 서버 래퍼 (ISR + 클라 폴백)
 *
 * WebChannel이 낀 브라우저 환경에서 무한 스켈레톤이 되는 F2 문제를 해결.
 * archive/[type]/page.tsx 와 동일한 내성 패턴:
 *   - firebase-admin 으로 초기 목록 프리패치 (revalidate 300 ISR)
 *   - 프리패치 성공 시 첫 화면 즉시 렌더 (isLoading=false, 스켈레톤 없음)
 *   - 프리패치 실패 시 undefined 전달 → 기존 클라이언트 로드 경로로 폴백 (회귀 없음)
 */

import { Users } from "lucide-react";
import { Timestamp } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase-admin";
import ActivityPage from "@/features/activities/ActivityPage";
import DemandSurveySection from "@/features/demand/DemandSurveySection";
import type { Activity } from "@/types";

export const runtime = "nodejs";
export const revalidate = 300;

function serializeActivity(id: string, data: Record<string, unknown>): Activity {
  const result: Record<string, unknown> = { id };
  for (const [key, value] of Object.entries(data)) {
    result[key] = value instanceof Timestamp ? value.toDate().toISOString() : value;
  }
  return result as unknown as Activity;
}

export default async function StudiesPage() {
  let initialActivities: Activity[] | undefined;
  try {
    const db = getAdminDb();
    const snap = await db.collection("activities").where("type", "==", "study").get();
    const items = snap.docs.map((d) => serializeActivity(d.id, d.data()));
    // API 와 동일한 정렬: createdAt 내림차순
    items.sort((a, b) =>
      ((b.createdAt as string) ?? "").localeCompare((a.createdAt as string) ?? ""),
    );
    initialActivities = items;
  } catch (err) {
    console.error("[activities/studies] server prefetch failed", err);
    // undefined → 클라이언트 폴백 (기존 동작 유지)
  }

  return (
    <ActivityPage
      type="study"
      icon={<Users size={24} />}
      title="스터디"
      subtitle="AI 교육, UX 리서치, 교수설계 등 관심 주제별 소그룹 스터디를 운영합니다."
      color="bg-accent/10 text-accent"
      initialActivities={initialActivities}
      demandSection={<DemandSurveySection kind="study" />}
    />
  );
}
