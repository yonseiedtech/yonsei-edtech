import { CARD_W, CARD_H } from "./CardArt";

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

/**
 * Exports the celebration card element as a PNG.
 * Captures at 2× scale (1080 × 2052 px) via html2canvas-pro —
 * the same library used by card-news/download.ts.
 */
export async function exportCelebrationCardToPng(
  el: HTMLElement,
  filename: string,
) {
  await document.fonts.ready;

  const clone = el.cloneNode(true) as HTMLElement;
  clone.style.transform = "none";
  clone.style.width = `${CARD_W}px`;
  clone.style.height = `${CARD_H}px`;

  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.left = "-99999px";
  container.style.top = "0";
  container.style.width = `${CARD_W}px`;
  container.style.height = `${CARD_H}px`;
  container.style.pointerEvents = "none";
  container.style.zIndex = "-1";
  container.appendChild(clone);
  document.body.appendChild(container);

  try {
    await waitForImages(clone);
    const html2canvas = (await import("html2canvas-pro")).default;
    const canvas = await html2canvas(clone, {
      backgroundColor: "#ffffff",
      scale: 2, // → 1080 × 2052 output
      useCORS: true,
      logging: false,
      width: CARD_W,
      height: CARD_H,
      windowWidth: CARD_W,
      windowHeight: CARD_H,
    });

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("toBlob returned null"))),
        "image/png",
      );
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } finally {
    document.body.removeChild(container);
  }
}
