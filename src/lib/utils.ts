import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
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
