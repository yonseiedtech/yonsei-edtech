"use client";

import { Suspense } from "react";
import GradLifePositionsList from "@/features/grad-life/GradLifePositionsList";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <GradLifePositionsList />
    </Suspense>
  );
}
