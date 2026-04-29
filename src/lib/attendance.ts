import type { ClassSession, ClassSessionMode, CourseEnrollment } from "@/types";

export type AttendanceKey = { kind: "user" | "enrollment"; key: string };

export function getEnrollmentAttendanceKey(e: CourseEnrollment): AttendanceKey {
  if (e.userId && e.userId.trim().length > 0) {
    return { kind: "user", key: e.userId };
  }
  return { kind: "enrollment", key: e.id };
}

export function isAttended(session: ClassSession | undefined, key: AttendanceKey): boolean {
  if (!session) return false;
  if (key.kind === "user") return (session.attendedUserIds ?? []).includes(key.key);
  return (session.attendedStudentIds ?? []).includes(key.key);
}

export function isAttendanceEnabled(mode: ClassSessionMode | undefined): boolean {
  if (!mode) return true;
  return mode !== "cancelled" && mode !== "zoom" && mode !== "assignment";
}

export function summarizeAttendance(
  session: ClassSession | undefined,
  enrollments: CourseEnrollment[],
): { attended: number; absent: number; unmarked: number; total: number } {
  const total = enrollments.length;
  if (!session || (session.attendedUserIds === undefined && session.attendedStudentIds === undefined)) {
    return { attended: 0, absent: 0, unmarked: total, total };
  }
  let attended = 0;
  let absent = 0;
  for (const e of enrollments) {
    const key = getEnrollmentAttendanceKey(e);
    if (isAttended(session, key)) attended += 1;
    else absent += 1;
  }
  return { attended, absent, unmarked: 0, total };
}

export function buildAttendancePayload(
  enrollments: CourseEnrollment[],
  attendedKeys: Set<string>,
  absenceNotes: Record<string, string>,
  actorUserId: string,
): {
  attendedUserIds: string[];
  attendedStudentIds: string[];
  absenceNotes: Record<string, string>;
  attendanceUpdatedBy: string;
} {
  const attendedUserIds: string[] = [];
  const attendedStudentIds: string[] = [];
  const cleanedNotes: Record<string, string> = {};
  for (const e of enrollments) {
    const key = getEnrollmentAttendanceKey(e);
    const composite = `${key.kind}:${key.key}`;
    if (attendedKeys.has(composite)) {
      if (key.kind === "user") attendedUserIds.push(key.key);
      else attendedStudentIds.push(key.key);
    } else {
      const note = absenceNotes[composite];
      if (note && note.trim().length > 0) cleanedNotes[composite] = note.trim();
    }
  }
  return {
    attendedUserIds,
    attendedStudentIds,
    absenceNotes: cleanedNotes,
    attendanceUpdatedBy: actorUserId,
  };
}

export function getCompositeKey(e: CourseEnrollment): string {
  const k = getEnrollmentAttendanceKey(e);
  return `${k.kind}:${k.key}`;
}
