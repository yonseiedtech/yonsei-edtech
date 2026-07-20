/**
 * H6 성능 계측 기준선 — web-vitals LCP/CLS/INP 경량 수집
 * - 10% 샘플링 (SAMPLE_RATE)
 * - 익명 (userId 없음)
 * - requestIdleCallback / setTimeout fallback 으로 UX 영향 없음
 * - Firestore web_vitals 컬렉션 적재 (admin read, 클라 create)
 */
import { onLCP, onCLS, onINP, type Metric } from "web-vitals";
import { addDoc, collection } from "firebase/firestore";
import { db } from "./firebase";
import { pathGroup } from "./visit-tracker";

const SAMPLE_RATE = 0.1; // 10% 샘플링

// 세션 내 중복 초기화 방지 (SPA 라우트 변경 시 재호출 방지)
const WV_INIT_KEY = "wv-init";

interface VitalRecord {
  metric: "LCP" | "CLS" | "INP";
  /** LCP·INP: ms, CLS: score (float) */
  value: number;
  rating: "good" | "needs-improvement" | "poor";
  route: string;
  timestamp: string;
}

function scheduleWrite(record: VitalRecord): void {
  const send = () => void addDoc(collection(db, "web_vitals"), record).catch(() => {/* silent */});
  if (typeof window !== "undefined" && "requestIdleCallback" in window) {
    (window as Window & typeof globalThis & { requestIdleCallback: (cb: () => void) => void })
      .requestIdleCallback(send);
  } else {
    setTimeout(send, 0);
  }
}

/**
 * 페이지 로드 당 1회 호출 (WebVitalsTracker 컴포넌트 mount effect 에서 호출).
 * 10% 확률로 LCP·CLS·INP 옵저버를 등록하고, 각 메트릭 확정 시 Firestore 에 적재.
 */
export function initWebVitals(pathname: string): void {
  if (typeof window === "undefined") return;

  // 이미 초기화된 경우 건너뜀 (SPA soft-nav 재호출 방지)
  try {
    if (sessionStorage.getItem(WV_INIT_KEY)) return;
    sessionStorage.setItem(WV_INIT_KEY, "1");
  } catch {
    return;
  }

  // 10% 샘플링
  if (Math.random() >= SAMPLE_RATE) return;

  const route = pathGroup(pathname);

  const handler = (metric: Metric) => {
    scheduleWrite({
      metric: metric.name as VitalRecord["metric"],
      value: metric.value,
      rating: metric.rating as VitalRecord["rating"],
      route,
      timestamp: new Date().toISOString(),
    });
  };

  onLCP(handler);
  onCLS(handler);
  onINP(handler);
}
