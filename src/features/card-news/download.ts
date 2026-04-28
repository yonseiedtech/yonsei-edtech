async function waitForImages(root: HTMLElement) {
  const imgs = Array.from(root.querySelectorAll("img"));
  await Promise.all(
    imgs.map((img) =>
      img.complete && img.naturalWidth > 0
        ? Promise.resolve()
        : new Promise<void>((resolve) => {
            img.addEventListener("load", () => resolve(), { once: true });
            img.addEventListener("error", () => resolve(), { once: true });
          }),
    ),
  );
}

async function renderCardCanvas(el: HTMLElement): Promise<HTMLCanvasElement> {
  const clone = el.cloneNode(true) as HTMLElement;
  clone.style.transform = "none";
  clone.style.width = "1080px";
  clone.style.height = "1080px";

  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.left = "-99999px";
  container.style.top = "0";
  container.style.width = "1080px";
  container.style.height = "1080px";
  container.style.pointerEvents = "none";
  container.style.zIndex = "-1";
  container.appendChild(clone);
  document.body.appendChild(container);

  try {
    await waitForImages(clone);
    const html2canvas = (await import("html2canvas-pro")).default;
    return await html2canvas(clone, {
      backgroundColor: null,
      scale: 1,
      useCORS: true,
      logging: false,
      width: 1080,
      height: 1080,
      windowWidth: 1080,
      windowHeight: 1080,
    });
  } finally {
    document.body.removeChild(container);
  }
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Canvas toBlob returned null"));
    }, "image/png");
  });
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function exportCardToPng(el: HTMLElement, filename: string) {
  await document.fonts.ready;
  const canvas = await renderCardCanvas(el);
  const blob = await canvasToBlob(canvas);
  triggerDownload(blob, filename);
}

export interface ZipEntry {
  el: HTMLElement;
  filename: string;
}

export async function exportCardsToZip(entries: ZipEntry[], zipFilename: string) {
  await document.fonts.ready;
  const JSZipModule = await import("jszip");
  const JSZip = JSZipModule.default;
  const zip = new JSZip();

  for (const entry of entries) {
    const canvas = await renderCardCanvas(entry.el);
    const blob = await canvasToBlob(canvas);
    zip.file(entry.filename, blob);
  }

  const zipBlob = await zip.generateAsync({ type: "blob" });
  triggerDownload(zipBlob, zipFilename);
}
