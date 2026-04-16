import type { PostCategory, UserRole } from "@/types";

type WriteRole = Exclude<UserRole, "guest">;

interface CategoryRule {
  /** "public" = 비로그인 포함 모두 조회 가능 */
  read: WriteRole[] | "public";
  write: WriteRole[];
}

export const POST_CATEGORY_RULES: Record<PostCategory, CategoryRule> = {
  notice:    { read: "public", write: ["staff", "admin", "president"] },
  seminar:   { read: "public", write: ["staff", "admin", "president"] },
  free:      { read: "public", write: ["member", "staff", "admin", "president", "alumni", "advisor"] },
  promotion: { read: "public", write: ["staff", "admin", "president"] },
  resources: { read: ["member", "staff", "admin", "president", "alumni", "advisor"], write: ["staff", "admin", "president"] },
  staff:     { read: ["staff", "admin", "president"], write: ["staff", "admin", "president"] },
  press:     { read: "public", write: ["staff", "admin", "president"] }, // legacy
  interview: { read: "public", write: ["staff", "admin", "president"] },
};

export function canWritePost(category: PostCategory, role: UserRole | null | undefined): boolean {
  if (!role || role === "guest") return false;
  const rule = POST_CATEGORY_RULES[category];
  if (!rule) return false;
  return (rule.write as readonly string[]).includes(role);
}

export function canReadPost(category: PostCategory, role: UserRole | null | undefined): boolean {
  const rule = POST_CATEGORY_RULES[category];
  if (!rule) return false;
  if (rule.read === "public") return true;
  if (!role || role === "guest") return false;
  return (rule.read as readonly string[]).includes(role);
}

/** 자료실은 첨부파일 최소 1개 필요 */
export function requiresAttachment(category: PostCategory): boolean {
  return category === "resources";
}

export const RESOURCES_FILE_POLICY = {
  maxBytes: 20 * 1024 * 1024, // 20MB
  allowedMime: [
    "application/pdf",
    "application/x-hwp",
    "application/haansofthwp",
    "application/vnd.hancom.hwpx",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation", // pptx
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",   // docx
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",         // xlsx
    "application/zip",
    "image/jpeg",
    "image/png",
  ] as string[],
  allowedExtensions: ["pdf", "hwp", "hwpx", "pptx", "docx", "xlsx", "zip", "jpg", "jpeg", "png"] as string[],
};

export function validateAttachment(file: { size: number; type?: string; name: string }): { ok: true } | { ok: false; reason: string } {
  if (file.size > RESOURCES_FILE_POLICY.maxBytes) {
    return { ok: false, reason: `파일 크기는 ${RESOURCES_FILE_POLICY.maxBytes / (1024 * 1024)}MB 이하여야 합니다.` };
  }
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!RESOURCES_FILE_POLICY.allowedExtensions.includes(ext)) {
    return { ok: false, reason: `허용되지 않는 파일 형식입니다 (.${ext}). 허용: ${RESOURCES_FILE_POLICY.allowedExtensions.join(", ")}` };
  }
  return { ok: true };
}
