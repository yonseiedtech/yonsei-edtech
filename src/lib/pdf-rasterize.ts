// PDF → 페이지별 PNG File[] 래스터화 (pdfjs-dist, 브라우저 전용).
// 라이브 콘솔 장표 파이프라인: 업로드 시점에 발표자 브라우저에서 각 페이지를 PNG 로 굽고
// Storage 에 올린다 → 라이브 열람은 img 교체(초경량, worker/CSP 이슈 없음).

export interface RasterizedPage {
  file: File;
  width: number;
  height: number;
}

/** 페이지 PNG 최대 폭(px) — 프로젝터/모바일 균형. 초과 시 축소 렌더. */
const MAX_WIDTH = 1600;

let workerConfigured = false;

/**
 * PDF 파일을 페이지별 PNG File 배열로 변환한다.
 * @param pdfFile 원본 PDF File
 * @param onProgress (완료 페이지 수, 전체 페이지 수) 콜백
 */
export async function rasterizePdf(
  pdfFile: File,
  onProgress?: (done: number, total: number) => void,
): Promise<RasterizedPage[]> {
  const pdfjs = await import("pdfjs-dist");

  if (!workerConfigured) {
    // worker 는 public/pdfjs/ 에 벤더링(scripts/copy-pdf-worker 없이 커밋) — 절대 경로 참조로
    // 번들러의 import.meta.url 해석(Next 빌드 module-not-found) 을 우회한다.
    // pdfjs-dist 버전 업데이트 시 public/pdfjs/pdf.worker.min.mjs 재복사 필요(현재 4.10.x).
    pdfjs.GlobalWorkerOptions.workerSrc = "/pdfjs/pdf.worker.min.mjs";
    workerConfigured = true;
  }

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
