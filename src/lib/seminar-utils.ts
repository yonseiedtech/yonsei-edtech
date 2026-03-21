import type { Seminar, SeminarStatus } from "@/types";

/**
 * ISO 문자열을 KST(UTC+9) 기준 "MM/DD HH:mm" 형식으로 변환
 */
export function formatKST(isoString: string): string {
  const d = new Date(isoString);
  const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  const mm = String(kst.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(kst.getUTCDate()).padStart(2, "0");
  const hh = String(kst.getUTCHours()).padStart(2, "0");
  const min = String(kst.getUTCMinutes()).padStart(2, "0");
  return `${mm}/${dd} ${hh}:${min}`;
}

/**
 * 세미나의 실시간 상태를 날짜+시간 기반으로 계산.
 * Firestore에 저장된 status가 "cancelled"이면 그대로 유지.
 * 그 외에는 현재 시각 기준으로 upcoming/ongoing/completed 자동 판단.
 *
 * @param seminar - 세미나 객체 (date: "YYYY-MM-DD", time: "HH:mm")
 * @param now - 현재 시각 (테스트용 주입 가능)
 */
export function getComputedStatus(
  seminar: Pick<Seminar, "status" | "date" | "time">,
  now: Date = new Date(),
): SeminarStatus {
  // 수동 취소는 그대로 유지
  if (seminar.status === "cancelled") return "cancelled";

  // 세미나 시작 시간 파싱 (KST 기준)
  const [hours, minutes] = (seminar.time || "00:00").split(":").map(Number);
  const startDate = new Date(`${seminar.date}T00:00:00+09:00`);
  startDate.setHours(startDate.getHours() + hours);
  startDate.setMinutes(startDate.getMinutes() + minutes);

  // 기본 세미나 길이: 2시간
  const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000);

  if (now < startDate) return "upcoming";
  if (now < endDate) return "ongoing";
  return "completed";
}
