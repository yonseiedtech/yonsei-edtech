import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

const CHROMIUM_PACK_URL =
  "https://github.com/Sparticuz/chromium/releases/download/v131.0.1/chromium-v131.0.1-pack.tar";

async function getBrowser() {
  const isVercel = !!process.env.VERCEL;
  if (isVercel) {
    const chromium = (await import("@sparticuz/chromium-min")).default;
    const puppeteer = await import("puppeteer-core");
    return puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(CHROMIUM_PACK_URL),
      headless: true,
      defaultViewport: { width: 794, height: 1123, deviceScaleFactor: 2 },
    });
  }
  const puppeteer = await import("puppeteer-core");
  const candidates = [
    process.env.PUPPETEER_EXECUTABLE_PATH,
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium-browser",
  ].filter(Boolean) as string[];
  return puppeteer.launch({
    executablePath: candidates[0],
    headless: true,
    defaultViewport: { width: 794, height: 1123, deviceScaleFactor: 2 },
  });
}

function buildHtml(bodyHtml: string, extraStyles: string, fileTitle: string) {
  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8" />
<title>${fileTitle}</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@400;600;700;900&family=Hahmlet:wght@400;600;700;900&family=Gowun+Batang:wght@400;700&display=swap" rel="stylesheet" />
<style>
  * { -webkit-print-color-adjust: exact; print-color-adjust: exact; box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: #fff; }
  :root {
    --font-noto-serif-kr: "Noto Serif KR";
    --font-hahmlet: "Hahmlet";
    --font-gowun-batang: "Gowun Batang";
    --font-pretendard: "Pretendard", "Noto Serif KR";
  }
  body { font-family: "Noto Serif KR", "Hahmlet", "Gowun Batang", serif; }
  .cert-page { width: 210mm; min-height: 297mm; margin: 0 auto; background: #fff; }
  /* Tailwind utility subset used by CertificatePreview */
  .relative { position: relative; }
  .absolute { position: absolute; }
  .mx-auto { margin-left: auto; margin-right: auto; }
  .bg-white { background-color: #fff; }
  .flex { display: flex; }
  .flex-col { flex-direction: column; }
  .items-center { align-items: center; }
  .justify-center { justify-content: center; }
  @page { size: A4 portrait; margin: 0; }
  ${extraStyles}
</style>
</head>
<body>
<div class="cert-page">${bodyHtml}</div>
</body>
</html>`;
}

export async function POST(req: NextRequest) {
  let browser: Awaited<ReturnType<typeof getBrowser>> | null = null;
  try {
    const { html, styles = "", fileName = "certificate.pdf" } = await req.json();
    if (!html || typeof html !== "string") {
      return NextResponse.json({ error: "html 필드가 필요합니다." }, { status: 400 });
    }

    const fullHtml = buildHtml(html, styles, fileName);
    browser = await getBrowser();
    const page = await browser.newPage();
    await page.setContent(fullHtml, { waitUntil: ["load", "networkidle0"] });
    await page.evaluateHandle("document.fonts.ready");
    // 확실하게 한글 글리프 로드 대기
    await page.evaluate(async () => {
      const sample = "연세교육공학회 감사장 수료증 귀하 성명";
      const weights = [400, 600, 700, 900];
      const families = ["Noto Serif KR", "Hahmlet", "Gowun Batang"];
      await Promise.all(
        families.flatMap((f) =>
          weights.map((w) =>
            document.fonts.load(`${w} 16px "${f}"`, sample).catch(() => null),
          ),
        ),
      );
      await document.fonts.ready;
    });

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
    });

    await browser.close();
    browser = null;

    return new NextResponse(pdf as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(fileName)}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    if (browser) await browser.close().catch(() => null);
    console.error("[cert/pdf] error:", e);
    return NextResponse.json(
      { error: "PDF 생성 실패", detail: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
