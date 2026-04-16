"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { useGreeting } from "@/features/greeting/useGreeting";
import LoadingSpinner from "@/components/ui/loading-spinner";

export default function GreetingPage() {
  const { greeting, isLoading } = useGreeting();

  if (isLoading) {
    return <LoadingSpinner className="min-h-[40vh] items-center" />;
  }

  return (
    <div className="py-16">
      {/* Page Header */}
      <section className="mx-auto max-w-6xl px-4 text-center">
        <h1 className="text-3xl font-bold md:text-4xl">인사말</h1>
        <p className="mt-4 text-muted-foreground">
          연세교육공학회 회장 인사말입니다.
        </p>
      </section>

      {/* Content */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mx-auto mt-12 max-w-6xl px-4"
      >
        <div className="flex flex-col items-center gap-6 rounded-2xl border bg-white p-5 shadow-sm sm:gap-10 sm:p-8 md:flex-row md:items-start md:p-12">
          {/* Photo */}
          {greeting.presidentPhoto ? (
            <div className="relative h-56 w-44 shrink-0 overflow-hidden rounded-xl bg-muted md:h-64 md:w-52">
              <Image
                src={greeting.presidentPhoto}
                alt={`${greeting.presidentName} 회장`}
                fill
                className="object-cover"
              />
            </div>
          ) : (
            <div className="flex h-56 w-44 shrink-0 items-center justify-center rounded-xl bg-primary/5 text-4xl font-bold text-primary/30 md:h-64 md:w-52">
              {greeting.presidentName?.[0] ?? "회"}
            </div>
          )}

          {/* Text */}
          <div className="flex-1">
            <p className="whitespace-pre-line text-base leading-relaxed text-muted-foreground">
              {greeting.content}
            </p>

            <div className="mt-8 border-t pt-6">
              <p className="text-lg font-bold">{greeting.presidentName || "회장"}</p>
              <p className="text-sm text-muted-foreground">
                {greeting.presidentTitle || "연세교육공학회 회장"}
              </p>
            </div>
          </div>
        </div>
      </motion.section>
    </div>
  );
}
