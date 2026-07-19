import { NextRequest } from "next/server";
import { withCronLog } from "@/lib/cron-observability";
import { getAdminDb } from "@/lib/firebase-admin";
import { verifyCronAuth } from "@/lib/cron-auth";
import {
  buildCardNewsDraft,
  buildNewsletterSectionsDraft,
  type DraftExtras,
} from "@/features/content-draft/draft-templates";
import { contentDraftId } from "@/features/content-draft/types";
import type { Seminar } from "@/types";
import type { CardNewsSeries } from "@/features/card-news/types";

/**
 * 콘텐츠 자동 초안 생성 Cron (매일 실행)
 *
 * 종료(completed)된 세미나 → 카드뉴스 + 학회보 섹션 초안을 결정적으로 생성해
 * content_drafts(검토 대기 큐)에 적재한다. AI 미사용(결정적) — cron 비용/실패 격리.
 *
 * 멱등: 문서 ID = `${seminarId}__${kind}` (대상 세미나 × kind 당 1회).
 *   이미 존재하면(운영진이 편집/보류했더라도) 재생성하지 않는다.
 * 비용 상한: 최근 DATE_WINDOW_DAYS 이내 종료 세미나만, 실행당 최대 MAX_PER_RUN건.
 * 자동 발행 없음 — staff 검토 후 편집기에서 발행.
 */

const DATE_WINDOW_DAYS = 21;
const MAX_PER_RUN = 8;
const MAX_QUOTES = 3;

function kstTodayStr(): string {
  return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().split("T")[0];
}

function cutoffDateStr(days: number): string {
  const d = new Date(Date.now() + 9 * 60 * 60 * 1000);
  d.setDate(d.getDate() - days);
  return d.toISOString().split("T")[0];
}

async function _handler(req: NextRequest) {
  if (!verifyCronAuth(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = getAdminDb();
    const today = kstTodayStr();
    const cutoff = cutoffDateStr(DATE_WINDOW_DAYS);

    // 종료된 세미나 (status == completed). 복합 인덱스 회피 위해 날짜는 JS에서 필터.
    const snap = await db.collection("seminars").where("status", "==", "completed").get();

    // 최근 종료(날짜 윈도우) 세미나만, 최신순
    const recent = snap.docs
      .map((d) => ({ id: d.id, data: d.data() as FirebaseFirestore.DocumentData }))
      .filter((s) => {
        const date = (s.data.date as string | undefined) ?? "";
        return date >= cutoff && date <= today;
      })
      .sort((a, b) => ((b.data.date as string) ?? "").localeCompare((a.data.date as string) ?? ""));

    let generated = 0;
    const generatedSeminars: string[] = [];

    for (const s of recent) {
      if (generated >= MAX_PER_RUN) break;

      const seminarId = s.id;
      const seminar = s.data as unknown as Seminar;

      // 멱등 가드: card-news 초안 문서가 이미 있으면 이 세미나는 건너뜀 (쌍으로 생성)
      const cardDocId = contentDraftId(seminarId, "card-news");
      const existing = await db.collection("content_drafts").doc(cardDocId).get();
      if (existing.exists) continue;

      const attendeeIds: string[] = Array.isArray(seminar.attendeeIds) ? seminar.attendeeIds : [];

      // 참석자 후기 조회 (인용·통계 재료)
      const reviewsSnap = await db
        .collection("seminar_reviews")
        .where("seminarId", "==", seminarId)
        .where("type", "==", "attendee")
        .get();
      const reviews = reviewsSnap.docs
        .map((d) => d.data())
        .filter((r) => r.status !== "hidden" && r.visibility !== "internal");

      // 트리거 요건: 참석자 또는 후기가 있어야 초안 생성 (무-신호 세미나 노이즈 차단)
      if (attendeeIds.length === 0 && reviews.length === 0) continue;

      const ratings = reviews
        .map((r) => (typeof r.rating === "number" ? r.rating : null))
        .filter((n): n is number => n != null && n > 0);
      const avgRating =
        ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : undefined;

      const reviewQuotes = reviews
        .map((r) => (typeof r.content === "string" ? r.content.trim() : ""))
        .filter(Boolean)
        .slice(0, MAX_QUOTES);

      const extras: DraftExtras = {
        stats: {
          attendeeCount: attendeeIds.length,
          reviewCount: reviews.length,
          ...(avgRating != null ? { avgRating } : {}),
        },
        reviewQuotes,
      };

      // ── 카드뉴스 초안 ──
      const cards = buildCardNewsDraft(seminar, extras);
      const cardSeries: CardNewsSeries = {
        id: `seminar-${seminarId}`.toLowerCase(),
        title: seminar.title,
        description: (seminar.description ?? "").slice(0, 200),
        publishedAt: today,
        category: "세미나",
        cards,
      };

      // ── 학회보 섹션 초안 ──
      const sections = buildNewsletterSectionsDraft(seminar, 1, extras);

      const statsForDoc = {
        attendeeCount: attendeeIds.length,
        reviewCount: reviews.length,
        ...(avgRating != null ? { avgRating: Math.round(avgRating * 10) / 10 } : {}),
      };
      const nowIso = new Date().toISOString();

      const base = {
        seminarId,
        seminarTitle: seminar.title,
        ...(seminar.date ? { seminarDate: seminar.date } : {}),
        status: "pending" as const,
        source: "cron" as const,
        stats: statsForDoc,
        ...(reviewQuotes.length > 0 ? { reviewQuotes } : {}),
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      await db
        .collection("content_drafts")
        .doc(cardDocId)
        .set({ ...base, kind: "card-news", payload: JSON.stringify(cardSeries) });
      await db
        .collection("content_drafts")
        .doc(contentDraftId(seminarId, "newsletter"))
        .set({ ...base, kind: "newsletter", payload: JSON.stringify(sections) });

      generated++;
      generatedSeminars.push(seminarId);

      // 운영진(staff+)에게 검토 알림 (세미나당 1회 — 멱등 생성이라 재발송 없음)
      try {
        const staffSnap = await db
          .collection("users")
          .where("role", "in", ["staff", "president", "admin", "sysadmin"])
          .where("approved", "==", true)
          .get();
        const batch = db.batch();
        for (const staffDoc of staffSnap.docs) {
          const ref = db.collection("notifications").doc();
          batch.set(ref, {
            userId: staffDoc.id,
            type: "content_draft",
            refId: seminarId,
            title: "콘텐츠 초안이 생성되었습니다",
            message: `"${seminar.title}" 세미나의 카드뉴스·학회보 초안이 준비되었습니다. 검토 후 발행하세요.`,
            link: "/console/content-drafts",
            read: false,
            createdAt: nowIso,
          });
        }
        await batch.commit();
      } catch (notifErr) {
        console.warn("[cron/content-draft-generator] staff notify failed:", seminarId, notifErr);
      }
    }

    return Response.json({ ok: true, generated, seminars: generatedSeminars });
  } catch (err) {
    console.error("[cron/content-draft-generator]", err);
    return Response.json({ error: "Internal error" }, { status: 500 });
  }
}

export const GET = withCronLog("content-draft-generator", _handler);
