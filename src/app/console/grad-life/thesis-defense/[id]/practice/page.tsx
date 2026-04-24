"use client";
import { use } from "react";
import DefensePracticeRunner from "@/features/defense/DefensePracticeRunner";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <DefensePracticeRunner id={id} />;
}
