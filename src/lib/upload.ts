import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "./firebase";

/**
 * Firebase Storage에 이미지를 업로드하고 다운로드 URL을 반환.
 * 경로: posts/{timestamp}_{filename}
 */
export async function uploadImage(file: File): Promise<string> {
  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSize) {
    throw new Error("이미지 크기가 5MB를 초과합니다.");
  }

  const allowed = ["image/jpeg", "image/png", "image/gif", "image/webp"];
  if (!allowed.includes(file.type)) {
    throw new Error("지원하지 않는 이미지 형식입니다. (JPG, PNG, GIF, WebP)");
  }

  const timestamp = Date.now();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storageRef = ref(storage, `posts/${timestamp}_${safeName}`);

  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
}
