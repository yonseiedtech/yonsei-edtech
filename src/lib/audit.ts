import { auditLogsApi } from "./bkend";
import type { AuditLog } from "@/types";

type AuditParams = Omit<AuditLog, "id" | "createdAt">;

const QUEUE_KEY = "yet:audit:pending";
const MAX_QUEUE = 50;

function readQueue(): AuditParams[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(QUEUE_KEY);
    return raw ? (JSON.parse(raw) as AuditParams[]) : [];
  } catch {
    return [];
  }
}

function writeQueue(items: AuditParams[]) {
  if (typeof window === "undefined") return;
  try {
    if (items.length === 0) window.localStorage.removeItem(QUEUE_KEY);
    else window.localStorage.setItem(QUEUE_KEY, JSON.stringify(items.slice(-MAX_QUEUE)));
  } catch {
    // 저장 공간 초과 등은 무시 (본 작업에 영향 없음)
  }
}

async function createOnce(params: AuditParams): Promise<boolean> {
  try {
    await auditLogsApi.create(params as unknown as Record<string, unknown>);
    return true;
  } catch {
    return false;
  }
}

/** 이전에 실패해 대기 중인 감사 로그를 재전송한다. 큐가 비어 있으면 즉시 반환(네트워크 호출 없음). */
async function flushQueue() {
  const queue = readQueue();
  if (queue.length === 0) return;
  const remaining: AuditParams[] = [];
  for (const item of queue) {
    if (!(await createOnce(item))) remaining.push(item);
  }
  writeQueue(remaining);
}

/**
 * 감사 로그 기록 유틸리티
 * 관리자 작업 시 호출하여 변경 이력을 추적한다.
 * 실패 시 1회 재시도하고, 최종 실패하면 localStorage 대기열에 적재하여
 * 다음 로그 시도 때 재전송한다(본 작업 흐름은 절대 막지 않는다).
 */
export async function logAudit(params: AuditParams) {
  // 대기 중이던 실패 로그부터 재전송 시도
  await flushQueue();

  // 최초 시도 + 재시도 1회
  if (await createOnce(params)) return;
  if (await createOnce(params)) return;

  // 최종 실패: 구조화된 에러 로깅 후 대기열 적재
  console.error(
    "[audit] Failed to write audit log after retry:",
    JSON.stringify({ action: params.action, category: params.category, detail: params.detail }),
  );
  const queue = readQueue();
  queue.push(params);
  writeQueue(queue);
}
