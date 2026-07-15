// PDF → 페이지별 PNG File[] 래스터화 (pdfjs, 브라우저 전용).
// 라이브 콘솔 장표 파이프라인: 업로드 시점에 발표자 브라우저에서 각 페이지를 PNG 로 굽고
// Storage 에 올린다 → 라이브 열람은 img 교체(초경량, worker/CSP 이슈 없음).
//
// 번들링 이슈 회피: pdfjs-dist 메인 엔트리는 내부적으로 worker 를 import.meta.url 로 참조해
// Next 빌드(webpack/turbopack)에서 module-not-found 로 실패한다. 그래서 라이브러리·worker 를
// public/pdfjs/ 에 벤더링하고, 번들러가 무시하는 런타임 동적 import 로 로드한다.
// pdfjs-dist 버전 업데이트 시 public/pdfjs/pdf.min.mjs 와 pdf.worker.min.mjs 재복사 필요(현재 4.10.x).

export interface RasterizedPage {
  file: File;
  width: number;
  height: number;
}

/** 페이지 PNG 최대 폭(px) — 프로젝터/모바일 균형. 초과 시 축소 렌더. */
const MAX_WIDTH = 1600;

interface PdfViewport {
  width: number;
  height: number;
}
interface PdfPage {
  getViewport(opts: { scale: number }): PdfViewport;
  render(opts: { canvasContext: CanvasRenderingContext2D; viewport: PdfViewport }): { promise: Promise<void> };
  cleanup(): void;
}
interface PdfDocument {
  numPages: number;
  getPage(n: number): Promise<PdfPage>;
  destroy(): Promise<void>;
}
interface PdfjsModule {
  GlobalWorkerOptions: { workerSrc: string };
  getDocument(src: { data: ArrayBuffer }): { promise: Promise<PdfDocument> };
}

let cached: PdfjsModule | null = null;

async function loadPdfjs(): Promise<PdfjsModule> {
  if (cached) return cached;
  // 번들러가 이 import 를 처리하지 않도록 무시 지시(webpack/turbopack) — public 정적 자산을 런타임 로드.
  // 런타임 전용 절대 경로라 TS 정적 모듈 해석 대상이 아님(빌드 시 번들 제외).
  // @ts-expect-error 런타임 전용 public 자산 — 정적 모듈 해석 없음
  const mod = (await import(/* webpackIgnore: true */ /* turbopackIgnore: true */ "/pdfjs/pdf.min.mjs")) as unknown as PdfjsModule;
  mod.GlobalWorkerOptions.workerSrc = "/pdfjs/pdf.worker.min.mjs";
  cached = mod;
  return mod;
}

/**
 * PDF 파일을 페이지별 PNG File 배열로 변환한다.
 * @param pdfFile 원본 PDF File
 * @param onProgress (완료 페이지 수, 전체 페이지 수) 콜백
 */
export async function rasterizePdf(
  pdfFile: File,
  onProgress?: (done: number, total: number) => void,
): Promise<RasterizedPage[]> {
  const pdfjs = await loadPdfjs();

  const buf = await pdfFile.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: buf }).promise;
  const total = pdf.numPages;
  const pages: RasterizedPage[] = [];

  try {
    for (let i = 1; i <= total; i++) {
      const page = await pdf.getPage(i);
      const base = page.getViewport({ scale: 1 });
      const scale = Math.min(MAX_WIDTH / base.width, 2); // 과대 렌더 방지(최대 2x)
      const viewport = page.getViewport({ scale });

      const canvas = window.document.createElement("canvas");
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas 2D 컨텍스트를 사용할 수 없습니다.");

      await page.render({ canvasContext: ctx, viewport }).promise;

      const blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error("PNG 변환 실패"))),
          "image/png",
        ),
      );
      const file = new File([blob], `page-${String(i).padStart(3, "0")}.png`, {
        type: "image/png",
      });
      pages.push({ file, width: canvas.width, height: canvas.height });
      onProgress?.(i, total);
      page.cleanup();
    }
  } finally {
    await pdf.destroy();
  }

  return pages;
}
