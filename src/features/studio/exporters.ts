// 디자인 스튜디오 내보내기 — PNG(현재 페이지) / ZIP(전체 PNG) / PDF / PPTX.
// 편집기가 exporting 상태에서 숨김 풀사이즈 렌더(#studio-export-<pageId>)를 마운트하면
// 여기서 노드 등장·폰트·이미지 로드를 기다린 뒤 html-to-image 로 캡처한다.

import type { DesignDocument } from "./studio-types";
import { resolveCanvasSize } from "./studio-types";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitForNode(id: string, tries = 100): Promise<HTMLElement> {
  for (let i = 0; i < tries; i++) {
    const el = document.getElementById(id);
    if (el) return el;
    await new Promise((r) => requestAnimationFrame(r));
  }
  throw new Error(`export node not found: ${id}`);
}

async function waitImages(node: HTMLElement) {
  const imgs = Array.from(node.querySelectorAll("img"));
  await Promise.all(
    imgs.map((img) =>
      img.complete
        ? Promise.resolve()
        : new Promise<void>((res) => {
            img.onload = () => res();
            img.onerror = () => res();
          }),
    ),
  );
}

function download(dataUrl: string, filename: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  a.click();
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

function safeName(s: string): string {
  return (s || "design").replace(/[\\/:*?"<>|]/g, "_").slice(0, 60);
}

/** 페이지 1장을 PNG dataURL 로 캡처 */
export async function capturePagePng(pageId: string): Promise<string> {
  const node = await waitForNode(`studio-export-${pageId}`);
  if ("fonts" in document) {
    try {
      await (document as Document & { fonts: { ready: Promise<unknown> } }).fonts.ready;
    } catch { /* ignore */ }
  }
  await waitImages(node);
  await sleep(120);
  const { toPng } = await import("html-to-image");
  return toPng(node, { pixelRatio: 1, cacheBust: true });
}

export async function exportDesign(
  doc: DesignDocument,
  kind: "png" | "zip" | "pdf" | "pptx",
  currentPageIdx: number,
): Promise<void> {
  const size = resolveCanvasSize(doc);
  const base = safeName(doc.title);

  if (kind === "png") {
    const page = doc.pages[currentPageIdx];
    const png = await capturePagePng(page.id);
    download(png, `${base}_${currentPageIdx + 1}.png`);
    return;
  }

  // 전체 페이지 캡처 (순차 — 메모리 안정)
  const pngs: string[] = [];
  for (const p of doc.pages) {
    pngs.push(await capturePagePng(p.id));
  }

  if (kind === "zip") {
    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();
    pngs.forEach((png, i) => {
      zip.file(`${base}_${String(i + 1).padStart(2, "0")}.png`, png.split(",")[1], { base64: true });
    });
    const blob = await zip.generateAsync({ type: "blob" });
    downloadBlob(blob, `${base}.zip`);
    return;
  }

  if (kind === "pdf") {
    const { jsPDF } = await import("jspdf");
    const orientation = size.width >= size.height ? "landscape" : "portrait";
    const pdf = new jsPDF({ orientation, unit: "px", format: [size.width, size.height] });
    pngs.forEach((png, i) => {
      if (i > 0) pdf.addPage([size.width, size.height], orientation);
      pdf.addImage(png, "PNG", 0, 0, size.width, size.height);
    });
    pdf.save(`${base}.pdf`);
    return;
  }

  // PPTX — 각 페이지를 전면 이미지 슬라이드로 (레이아웃 = 문서 비율)
  const PptxGenJS = (await import("pptxgenjs")).default;
  const pptx = new PptxGenJS();
  const wIn = size.width / 96;
  const hIn = size.height / 96;
  pptx.defineLayout({ name: "STUDIO", width: wIn, height: hIn });
  pptx.layout = "STUDIO";
  for (const png of pngs) {
    const slide = pptx.addSlide();
    slide.addImage({ data: png, x: 0, y: 0, w: wIn, h: hIn });
  }
  await pptx.writeFile({ fileName: `${base}.pptx` });
}
