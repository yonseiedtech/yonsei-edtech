import { NextRequest } from "next/server";
import { streamText } from "ai";
import { models } from "@/lib/ai";
import { requireAuth } from "@/lib/api-auth";
import { getAdminDb } from "@/lib/firebase-admin";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const authResult = await requireAuth(req, "staff");
  if (authResult instanceof Response) return authResult;

  let year: number, half: number;
  try {
    const body = await req.json();
    year = body.year;
    half = body.half; // 1=1학기, 2=2학기
  } catch {
    return Response.json({ error: "잘못된 요청" }, { status: 400 });
  }

  const db = getAdminDb();

  // 학기 기간 계산
  const startMonth = half === 1 ? "03" : "09";
  const endMonth = half === 1 ? "08" : "02";
  const endYear = half === 2 ? year + 1 : year;
  const startDate = `${year}-${startMonth}-01`;
  const endDate = `${endYear}-${endMonth}-28`;

  // 데이터 수집
  const [seminarsSnap, activitiesSnap, reviewsSnap, attendeesSnap] = await Promise.all([
    db.collection("seminars").get(),
    db.collection("activities").get(),
    db.collection("seminar_reviews").get(),
    db.collection("seminar_attendees").get(),
  ]);

  const seminars = seminarsSnap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((s: Record<string, unknown>) => {
      const date = s.date as string;
      return date >= startDate && date <= endDate && s.status !== "cancelled";
    });

  const activities = activitiesSnap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((a: Record<string, unknown>) => {
      const date = a.date as string;
      return date >= startDate && date <= endDate;
    });

  const seminarIds = new Set(seminars.map((s: Record<string, unknown>) => s.id));

  const reviews = reviewsSnap.docs
    .map((d) => d.data())
    .filter((r) => seminarIds.has(r.seminarId));

  const attendees = attendeesSnap.docs
    .map((d) => d.data())
    .filter((a) => seminarIds.has(a.seminarId));

  // 통계 계산
  const totalSeminars = seminars.length;
  const totalAttendees = new Set(attendees.map((a) => a.userId)).size;
  const totalCheckins = attendees.filter((a) => a.checkedIn).length;
  const avgAttendance = totalSeminars > 0 ? Math.round(totalCheckins / totalSeminars) : 0;
  const avgRating = reviews.filter((r) => r.rating).length > 0
    ? (reviews.filter((r) => r.rating).reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.filter((r) => r.rating).length).toFixed(1)
    : "N/A";

  const projects = activities.filter((a: Record<string, unknown>) => a.type === "project");
  const studies = activities.filter((a: Record<string, unknown>) => a.type === "study");
  const externals = activities.filter((a: Record<string, unknown>) => a.type === "external");

  const seminarList = seminars.map((s: Record<string, unknown>) => `- ${s.date} | ${s.title} | 연사: ${s.speaker} | 참석자: ${(s.attendeeIds as string[])?.length ?? 0}명`).join("\n");
  const activityList = activities.map((a: Record<string, unknown>) => `- [${a.type}] ${a.title} (${a.date})`).join("\n");

  const prompt = `당신은 연세교육공학회의 학기 활동 보고서를 작성하는 전문 작성자입니다.

아래 데이터를 바탕으로 ${year}년 ${half}학기 학술활동 보고서를 작성해주세요.

## 데이터

### 세미나 실적
- 총 ${totalSeminars}회 개최
- 총 참석자 수 (중복 제거): ${totalAttendees}명
- 평균 참석 인원: ${avgAttendance}명/회
- 평균 만족도: ${avgRating}/5.0
- 후기 수: ${reviews.length}건

세미나 목록:
${seminarList || "(없음)"}

### 학술활동 실적
- 프로젝트: ${projects.length}건
- 스터디: ${studies.length}건
- 대외 학술대회: ${externals.length}건

활동 목록:
${activityList || "(없음)"}

## 보고서 형식

다음 구조로 작성해주세요:

# ${year}년 ${half}학기 연세교육공학회 학술활동 보고서

## 1. 개요
(학기 전체 활동 요약 2~3문장)

## 2. 세미나 실적
(세미나 통계 및 주요 세미나 하이라이트)

## 3. 학술활동 실적
(스터디, 프로젝트, 대외활동 요약)

## 4. 주요 성과
(핵심 성과 3~5개 불릿)

## 5. 개선 제안
(다음 학기를 위한 제안 2~3개)

## 6. 종합 평가
(1~2문장으로 학기 총평)

마크다운 형식으로 작성하되, 간결하고 데이터 기반으로 작성해주세요.`;

  try {
    const result = streamText({
      model: models.fast,
      prompt,
    });

    const textStream = result.textStream;
    const encoder = new TextEncoder();
    let fullText = "";
    const dataStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of textStream) {
            fullText += chunk;
            controller.enqueue(encoder.encode(`0:${JSON.stringify(chunk)}\n`));
          }
          controller.enqueue(encoder.encode(`e:{"finishReason":"stop","usage":{"promptTokens":0,"completionTokens":0},"isContinued":false}\n`));
          controller.enqueue(encoder.encode(`d:{"finishReason":"stop","usage":{"promptTokens":0,"completionTokens":0}}\n`));
          controller.close();
        } catch {
          controller.close();
        }
      },
    });

    return new Response(dataStream, {
      headers: { "Content-Type": "text/plain; charset=utf-8", "X-Vercel-AI-Data-Stream": "v1" },
    });
  } catch (err) {
    console.error("[ai/semester-report]", err);
    return Response.json({ error: "보고서 생성 실패" }, { status: 500 });
  }
}
