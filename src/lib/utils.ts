import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * ISO 문자열·Date·Firestore Timestamp 등 어떤 형태의 날짜 값에서도
 * 안전하게 YYYY-MM-DD(앞 10자)를 추출한다.
 *
 * 배경: `value.slice(0, 10)` 직접 호출은 value 가 string 이 아니면
 * "x.slice is not a function" 런타임 크래시를 일으킨다. 데이터 원천에서
 * 간헐적으로 Timestamp 객체·{seconds} 형태가 도달할 수 있어 이 헬퍼로 방어한다.
 */
export function safeYmd(v: unknown): string {
  if (typeof v === "string") return v.slice(0, 10);
  if (v instanceof Date) {
    return isNaN(v.getTime()) ? "" : v.toISOString().slice(0, 10);
  }
  if (v && typeof v === "object") {
    const obj = v as { toDate?: () => Date; seconds?: number };
    if (typeof obj.toDate === "function") {
      try {
        const d = obj.toDate();
        if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
      } catch { /* fallthrough */ }
    }
    if (typeof obj.seconds === "number") {
      try {
        const d = new Date(obj.seconds * 1000);
        if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
      } catch { /* fallthrough */ }
    }
  }
  return "";
}

export function formatDate(date: string | Date): string {
  const d = new Date(date);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

/** 기수 + 입학시점 문자열: "3기 (2024 전반기)" */
export function formatGeneration(
  generation: number,
  enrollmentYear?: number,
  enrollmentHalf?: number,
): string {
  const base = `${generation}기`;
  if (!enrollmentYear) return base;
  const half = enrollmentHalf === 2 ? "후반기" : "전반기";
  return `${base} (${enrollmentYear} ${half})`;
}

/** 입학시점 문자열: "2024 전반기" / "2024" / "" */
export function formatEnrollment(year?: number, half?: number): string {
  if (!year) return "";
  const label = half === 2 ? "후반기" : half === 1 ? "전반기" : "";
  return label ? `${year} ${label}` : `${year}`;
}

export function formatDistanceToNow(date: string | Date): string {
  const d = new Date(date);
  if (isNaN(d.getTime())) return "-";
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "방금";
  if (mins < 60) return `${mins}분 전`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  return `${days}일 전`;
}
