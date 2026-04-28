export async function exportCardToPng(el: HTMLElement, filename: string) {
  await document.fonts.ready;
  const html2canvas = (await import("html2canvas-pro")).default;
  const canvas = await html2canvas(el, {
    backgroundColor: null,
    scale: 1,
    useCORS: true,
    logging: false,
  });
  const dataUrl = canvas.toDataURL("image/png");
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  a.click();
}
