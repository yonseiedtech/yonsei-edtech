"use client";

import { use } from "react";
import SeminarLMS from "@/features/seminar/SeminarLMS";

export default function SeminarLMSPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <SeminarLMS seminarId={id} />;
}
