import type { SeminarAttendee } from "@/types";

export function exportAttendeesCSV(seminarTitle: string, attendees: SeminarAttendee[]) {
  const header = "이름,기수,체크인 여부,체크인 시각";
  const rows = attendees.map((a) =>
    [
      a.userName,
      `${a.userGeneration}기`,
      a.checkedIn ? "O" : "X",
      a.checkedInAt ?? "",
    ].join(","),
  );

  const bom = "\uFEFF";
  const csv = bom + [header, ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `참석자_${seminarTitle.replace(/[^가-힣a-zA-Z0-9]/g, "_")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
