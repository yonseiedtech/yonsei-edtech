"use client";

import { useSeminarStore } from "./seminar-store";
import type { Seminar } from "@/types";

export function useSeminars(status?: Seminar["status"]) {
  const seminars = useSeminarStore((s) => s.seminars);
  if (!status) return seminars;
  return seminars.filter((s) => s.status === status);
}

export function useSeminar(id: string) {
  return useSeminarStore((s) => s.seminars.find((sem) => sem.id === id));
}

export function useCreateSeminar() {
  const addSeminar = useSeminarStore((s) => s.addSeminar);
  return { createSeminar: addSeminar };
}

export function useToggleAttendance() {
  const toggleAttendance = useSeminarStore((s) => s.toggleAttendance);
  return { toggleAttendance };
}
