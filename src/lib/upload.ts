/**
 * 이미지를 Base64 Data URL로 변환.
 * Firestore 문서에 직접 저장 (별도 Storage 불필요).
 * 제한: 이미지당 1MB (Firestore 문서 크기 한도 고려).
 */
export async function uploadImage(file: File): Promise<string> {
  const maxSize = 1 * 1024 * 1024; // 1MB
  if (file.size > maxSize) {
    throw new Error("이미지 크기가 1MB를 초과합니다. 더 작은 이미지를 사용하세요.");
  }

  const allowed = ["image/jpeg", "image/png", "image/gif", "image/webp"];
  if (!allowed.includes(file.type)) {
    throw new Error("지원하지 않는 이미지 형식입니다. (JPG, PNG, GIF, WebP)");
  }

  // 이미지 리사이즈 (최대 800px) + 압축
  const resized = await resizeImage(file, 800, 0.8);
  return resized;
}

function resizeImage(file: File, maxWidth: number, quality: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();

    reader.onload = (e) => {
      img.src = e.target?.result as string;
    };

    img.onload = () => {
      const canvas = document.createElement("canvas");
      let { width, height } = img;

      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("Canvas not supported")); return; }
      ctx.drawImage(img, 0, 0, width, height);

      const dataUrl = canvas.toDataURL(file.type === "image/png" ? "image/png" : "image/jpeg", quality);
      resolve(dataUrl);
    };

    img.onerror = () => reject(new Error("이미지 로딩 실패"));
    reader.onerror = () => reject(new Error("파일 읽기 실패"));
    reader.readAsDataURL(file);
  });
}
