import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) {
    return Response.json({ error: "url 파라미터 필요" }, { status: 400 });
  }

  // 구글 도메인만 허용
  if (!url.includes("docs.google.com")) {
    return Response.json({ error: "구글 스프레드시트 URL만 지원" }, { status: 400 });
  }

  try {
    const res = await fetch(url);
    if (!res.ok) {
      return Response.json(
        { error: "스프레드시트를 불러올 수 없습니다. 공개 설정을 확인하세요." },
        { status: 400 },
      );
    }
    const text = await res.text();
    return new Response(text, {
      headers: { "Content-Type": "text/csv; charset=utf-8" },
    });
  } catch {
    return Response.json({ error: "스프레드시트 연결 실패" }, { status: 500 });
  }
}
