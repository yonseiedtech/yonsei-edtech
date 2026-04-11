import { auditLogsApi } from "./bkend";
import type { AuditLog } from "@/types";

/**
 * 감사 로그 기록 유틸리티
 * 관리자 작업 시 호출하여 변경 이력을 추적한다.
 */
export async function logAudit(
  params: Omit<AuditLog, "id" | "createdAt">,
) {
  try {
    await auditLogsApi.create(params as unknown as Record<string, unknown>);
  } catch {
    // 감사 로그 실패는 본 작업에 영향을 주지 않도록 조용히 무시
    console.warn("[audit] Failed to write audit log:", params.action);
  }
}
