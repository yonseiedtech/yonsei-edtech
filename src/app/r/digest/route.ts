import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

/**
 * 다이제스트 CTA 클릭 카운터 리다이렉트 (M7, 2026-07-20)
 *
 * GET /r/digest?to=<인코딩된 내부 경로>&c=<캠페인 키(주차)>
 *
 * 보안
 * - `to`는 내부 경로만 허용: `/`로 시작, `//`·`http` 거부 (오픈 리다이렉트 방지).
 *   조건 불충족 시 `/`로 대체.
 * - `c`는 그대로 집계 키로 사용 (최대 100자 truncate).
 *
 * 적재
 * - digest_link_clicks/{c}_{slug(to)} — count increment · lastAt (Admin SDK).
 * - 적재 실패해도 리다이렉트는 항상 수행 (추적보다 UX 우선).
 */

const BASE = "https://yonsei-edtech.vercel.app";

/** 내부 경로 → Firestore 문서 ID용 slug (최대 80자) */
function slugifyPath(path: string): string {
  return (
    path
      .replace(/^\//, "")
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .slice(0, 80) || "root"
  );
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const rawTo = searchParams.get("to") ?? "";
  const c = (searchParams.get("c") ?? "unknown").slice(0, 100);

  // 오픈 리다이렉트 방지: 반드시 /로 시작, //나 http 불허
  const isInternal =
    rawTo.startsWith("/") &&
    !rawTo.startsWith("//") &&
    !/^\/[a-z]+:/i.test(rawTo);
  const to = isInternal ? rawTo : "/";

  // Admin SDK count increment — 실패해도 리다이렉트는 수행
  try {
    const db = getAdminDb();
    const docId = `${c}_${slugifyPath(to)}`;
    await db
      .collection("digest_link_clicks")
      .doc(docId)
      .set(
        {
          campaign: c,
          path: to,
          count: FieldValue.increment(1),
          lastAt: new Date().toISOString(),
        },
        { merge: true },
      );
  } catch (e) {
    console.error("[r/digest] click increment failed:", e);
  }

  return NextResponse.redirect(`${BASE}${to}`, { status: 302 });
}
