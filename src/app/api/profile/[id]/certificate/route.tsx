import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { verifyAuth } from "@/lib/api-auth";
import { todayYmdKst } from "@/lib/dday";
import { pdf } from "@react-pdf/renderer";
import {
  ProfileCertificatePdfDocument,
  type PortfolioBundle,
} from "@/features/profile/ProfileCertificatePdfDocument";
import {
  summarizeResearchProgress,
  summarizeDiagnosisReadiness,
  summarizeStreak,
  STREAK_POINTS,
  type StreakDaySource,
} from "@/features/profile/portfolio-aggregate";
import type {
  ActivityParticipation,
  Award,
  Certificate,
  ContentCreation,
  DiagnosticResult,
  ExternalActivity,
  RecentPaper,
  ResearchProposal,
  StreakEvent,
  User,
  UserActivityLog,
  WritingPaper,
  WritingPaperHistory,
} from "@/types";
import type { PaperReadingLog } from "@/types/paper-reading";

/** ISO datetime → KST(UTC+9) YYYY-MM-DD. 잔디 일별 버킷 키 — 클라이언트 isoToYmdLocal 의 서버판. */
function isoToYmdKst(iso: string | undefined | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10);
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STAFF_ROLES = new Set(["sysadmin", "admin", "president", "staff"]);

function snapToDocs<T>(snap: FirebaseFirestore.QuerySnapshot): T[] {
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as unknown as T);
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const url = new URL(req.url);
  const wantsPublic = url.searchParams.get("public") === "true";

  try {
    const db = getAdminDb();
    const userSnap = await db.collection("users").doc(id).get();
    if (!userSnap.exists) {
      return NextResponse.json({ error: "회원을 찾을 수 없습니다." }, { status: 404 });
    }
    let user = { id: userSnap.id, ...userSnap.data() } as unknown as User;

    // 본인판(미검증 포함)은 본인 또는 운영진만 다운로드 가능
    const publicOnly = wantsPublic;
    if (publicOnly) {
      // 공개판(비로그인 허용)은 렌더 전에 화이트리스트 투영 (v5-M7 감사 A).
      // 전체 user 문서를 PDF 컴포넌트에 넘기면 "템플릿이 안 그리니 괜찮다"는 암묵
      // 의존이 생기고, 실제로 studentId(학번)가 조건 없이 렌더돼 익명 노출됐다.
      // 공개 PDF에 필요한 표시 필드만 명시적으로 담는다 (studentId·연락처·secret 제외).
      const raw = user as unknown as Record<string, unknown>;
      user = {
        id: userSnap.id,
        name: raw.name,
        role: raw.role,
        position: raw.position,
        department: raw.department,
        affiliation: raw.affiliation,
        generation: raw.generation,
        enrollmentYear: raw.enrollmentYear,
        enrollmentHalf: raw.enrollmentHalf,
        university: raw.university,
        graduateSchool: raw.graduateSchool,
        graduateMajor: raw.graduateMajor,
        recentPapers: raw.recentPapers,
      } as unknown as User;
    } else {
      const auth = await verifyAuth(req);
      const isOwner = auth?.id === id;
      const isStaff = !!auth && STAFF_ROLES.has(auth.role);
      if (!isOwner && !isStaff) {
        return NextResponse.json(
          { error: "본인 또는 운영진만 본인판 증명서를 다운로드할 수 있습니다. ?public=true 옵션을 사용하세요." },
          { status: 403 },
        );
      }
    }

    const [partsSnap, awardsSnap, externalsSnap, contentsSnap] = await Promise.all([
      db.collection("activity_participations").where("userId", "==", id).get(),
      db.collection("awards").where("userId", "==", id).get(),
      db.collection("external_activities").where("userId", "==", id).get(),
      db.collection("content_creations").where("userId", "==", id).get(),
    ]);

    const bundle: PortfolioBundle = {
      user,
      participations: snapToDocs<ActivityParticipation>(partsSnap),
      awards: snapToDocs<Award>(awardsSnap),
      externals: snapToDocs<ExternalActivity>(externalsSnap),
      contents: snapToDocs<ContentCreation>(contentsSnap),
      papers: (user.recentPapers ?? []) as RecentPaper[],
    };

    // ── G3: 연구·활동 자동 집계 (본인판 전용 — 개인 성취 지표는 공개판에서 제외) ──
    // 공개판(?public=true)은 익명 다운로드라 개인 성취 지표를 노출하지 않으므로 집계 자체를 건너뛴다.
    if (!publicOnly) {
      const [
        papersSnap,
        proposalsSnap,
        diagnosticsSnap,
        certsSnap,
        readingSnap,
        activityLogsSnap,
        writingHistorySnap,
        reflectionsSnap,
        streakEventsSnap,
      ] = await Promise.all([
        db.collection("writing_papers").where("userId", "==", id).get(),
        db.collection("research_proposals").where("userId", "==", id).get(),
        db.collection("diagnostic_results").where("userId", "==", id).get(),
        db.collection("certificates").where("recipientUserId", "==", id).get(),
        db.collection("paper_reading_logs").where("userId", "==", id).get(),
        db.collection("user_activity_logs").where("userId", "==", id).get(),
        db.collection("writing_paper_history").where("userId", "==", id).get(),
        db.collection("study_session_reflections").where("userId", "==", id).get(),
        db.collection("streak_events").where("userId", "==", id).get(),
      ]);

      // 연구 진행도 요약 (writing_papers + research_proposals)
      const writingPapers = snapToDocs<WritingPaper>(papersSnap);
      const proposals = snapToDocs<ResearchProposal>(proposalsSnap);
      bundle.research = summarizeResearchProgress(
        writingPapers[0] ?? null,
        proposals[0] ?? null,
      );

      // 진단 준비도 요약 (diagnostic_results 다회차 → 최신)
      const diagnostics = snapToDocs<DiagnosticResult>(diagnosticsSnap);
      bundle.diagnosis = summarizeDiagnosisReadiness(diagnostics);

      // 수료증 요약 (certificates by recipientUserId)
      const certs = snapToDocs<Certificate>(certsSnap);
      const certByType: Record<string, number> = {};
      for (const c of certs) {
        const t = c.type ?? "other";
        certByType[t] = (certByType[t] ?? 0) + 1;
      }
      bundle.certificates = { count: certs.length, byType: certByType };

      // 학습 잔디 요약 (핵심 일별 소스 day-bucketed 합산)
      const streakSources: StreakDaySource[] = [];
      const dayKindSeen = new Set<string>(); // `${ymd}__${label}` — 일별 1회 가산
      const pushDay = (ymd: string | null, label: string, points: number) => {
        if (!ymd) return;
        const key = `${ymd}__${label}`;
        if (dayKindSeen.has(key)) return;
        dayKindSeen.add(key);
        streakSources.push({ ymd, label, points });
      };
      for (const r of snapToDocs<PaperReadingLog>(readingSnap)) {
        if (r.readAt) pushDay(r.readAt, "논문 읽기", STREAK_POINTS.paperReading);
      }
      for (const l of snapToDocs<UserActivityLog>(activityLogsSnap)) {
        if (l.pathGroup !== "archive" && l.pathGroup !== "research") continue;
        pushDay(isoToYmdKst(l.createdAt), "논문·아카이브 열람", STREAK_POINTS.paperReading);
      }
      for (const h of snapToDocs<WritingPaperHistory>(writingHistorySnap)) {
        pushDay(isoToYmdKst(h.createdAt), "논문 작성", STREAK_POINTS.paperWriting);
      }
      for (const r of diagnostics) {
        pushDay(isoToYmdKst(r.createdAt), "진단평가", STREAK_POINTS.diagnosticComplete);
      }
      for (const r of snapToDocs<{ createdAt?: string }>(reflectionsSnap)) {
        pushDay(isoToYmdKst(r.createdAt), "회고 작성", STREAK_POINTS.reflection);
      }
      for (const ev of snapToDocs<StreakEvent>(streakEventsSnap)) {
        if (ev.type !== "flashcard-study") continue;
        pushDay(ev.ymd, "암기카드 학습", STREAK_POINTS.flashcardStudy);
      }
      bundle.streak = summarizeStreak(streakSources);
    }

    const issuedAt = todayYmdKst();
    const certNumber = `YEDT-${id.slice(0, 6).toUpperCase()}-${issuedAt.replace(/-/g, "")}`;
    const verifyUrl = `https://yonsei-edtech.vercel.app/profile/${id}`;

    const stream = await pdf(
      <ProfileCertificatePdfDocument
        bundle={bundle}
        publicOnly={publicOnly}
        certNumber={certNumber}
        issuedAt={issuedAt}
        verifyUrl={verifyUrl}
      />,
    ).toBuffer();

    const chunks: Buffer[] = [];
    for await (const chunk of stream as AsyncIterable<Buffer | Uint8Array>) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    const buffer = Buffer.concat(chunks);
    const arrayBuffer = buffer.buffer.slice(
      buffer.byteOffset,
      buffer.byteOffset + buffer.byteLength,
    ) as ArrayBuffer;

    const suffix = publicOnly ? "public" : "full";
    const filename = `yonsei-edtech-portfolio-${user.name ?? id}-${suffix}.pdf`;

    return new Response(arrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "PDF 생성 실패";
    console.error("[profile certificate]", msg, err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
