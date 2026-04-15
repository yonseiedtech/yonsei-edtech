import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { storage } from "./firebase";

export interface UploadedFile {
  url: string;
  name: string;
  size: number;
  type: string;
}

const MAX_SIZE_IMAGE = 10 * 1024 * 1024; // 10MB
const MAX_SIZE_FILE = 20 * 1024 * 1024; // 20MB

export async function uploadToStorage(
  file: File,
  folder: string,
  onProgress?: (pct: number) => void,
): Promise<UploadedFile> {
  const isImage = file.type.startsWith("image/");
  const limit = isImage ? MAX_SIZE_IMAGE : MAX_SIZE_FILE;
  if (file.size > limit) {
    throw new Error(`파일 크기가 ${Math.floor(limit / 1024 / 1024)}MB를 초과합니다.`);
  }
  const safeName = file.name.replace(/[^\w.\-]/g, "_");
  const path = `${folder}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}_${safeName}`;
  const r = ref(storage, path);
  const task = uploadBytesResumable(r, file, { contentType: file.type });

  return new Promise<UploadedFile>((resolve, reject) => {
    task.on(
      "state_changed",
      (snap) => {
        const pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
        onProgress?.(pct);
      },
      (err) => reject(err),
      async () => {
        try {
          const url = await getDownloadURL(task.snapshot.ref);
          resolve({ url, name: file.name, size: file.size, type: file.type });
        } catch (e) { reject(e); }
      },
    );
  });
}

/** 이미지 전용: 압축 후 Storage 업로드 (fallback: base64) */
export async function uploadImageSmart(file: File, folder = "images"): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("이미지 파일만 업로드 가능합니다.");
  // 800px 이하로 리사이즈 시도
  const resized = await resizeImage(file, 1600, 0.85);
  const blob = await (await fetch(resized)).blob();
  const resizedFile = new File([blob], file.name, { type: blob.type });
  const { url } = await uploadToStorage(resizedFile, folder);
  return url;
}

function resizeImage(file: File, maxWidth: number, quality: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();
    reader.onload = (e) => { img.src = e.target?.result as string; };
    img.onload = () => {
      const canvas = document.createElement("canvas");
      let { width, height } = img;
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }
      canvas.width = width; canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("Canvas not supported")); return; }
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL(file.type === "image/png" ? "image/png" : "image/jpeg", quality));
    };
    img.onerror = () => reject(new Error("이미지 로딩 실패"));
    reader.onerror = () => reject(new Error("파일 읽기 실패"));
    reader.readAsDataURL(file);
  });
}
