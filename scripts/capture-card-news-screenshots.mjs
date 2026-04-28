// 카드뉴스 스크린샷 캡처 스크립트
// 사용법: node scripts/capture-card-news-screenshots.mjs
import puppeteer from "puppeteer-core";
import { mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";

const CHROME =
  process.env.CHROME_PATH ||
  "C:/Program Files/Google/Chrome/Application/chrome.exe";
const BASE = process.env.BASE_URL || "https://yonsei-edtech.vercel.app";
const OUT = "public/card-news/screenshots";

const PAGES = [
  { slug: "home", path: "/", waitMs: 2500 },
  { slug: "seminars", path: "/seminars", waitMs: 2500 },
  { slug: "activities", path: "/activities", waitMs: 2500 },
  { slug: "alumni", path: "/alumni", waitMs: 3000 },
  { slug: "research", path: "/research", waitMs: 3500 },
  { slug: "courses", path: "/courses", waitMs: 2500 },
  { slug: "newsletter", path: "/newsletter", waitMs: 2500 },
  { slug: "thesis-defense", path: "/steppingstone/thesis-defense", waitMs: 2500 },
];

async function main() {
  if (!existsSync(OUT)) await mkdir(OUT, { recursive: true });

  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: "new",
    defaultViewport: { width: 1440, height: 900, deviceScaleFactor: 2 },
  });

  for (const p of PAGES) {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
    const url = `${BASE}${p.path}`;
    process.stdout.write(`▶ ${url} ... `);
    try {
      await page.goto(url, { waitUntil: "networkidle2", timeout: 45000 });
      await new Promise((r) => setTimeout(r, p.waitMs));
      const out = `${OUT}/${p.slug}.png`;
      await page.screenshot({ path: out, type: "png", fullPage: false });
      console.log(`✓ ${out}`);
    } catch (e) {
      console.log(`✗ ${e.message}`);
    } finally {
      await page.close();
    }
  }
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
