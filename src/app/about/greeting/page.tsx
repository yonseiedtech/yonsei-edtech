"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { useGreeting, type GreetingPerson } from "@/features/greeting/useGreeting";
import LoadingSpinner from "@/components/ui/loading-spinner";

function GreetingCard({ person, accent }: { person: GreetingPerson; accent: "advisor" | "president" }) {
  if (!person.name && !person.content) return null;
  const initial = person.name?.[0] ?? (accent === "advisor" ? "교" : "회");
  const accentClass =
    accent === "advisor"
      ? "bg-violet-50/50 text-violet-400/60"
      : "bg-primary/5 text-primary/30";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="flex flex-col items-center gap-6 rounded-2xl border bg-white p-5 shadow-sm sm:gap-10 sm:p-8 md:flex-row md:items-start md:p-12"
    >
      {person.photo ? (
        <div className="relative h-56 w-44 shrink-0 overflow-hidden rounded-xl bg-muted md:h-64 md:w-52">
          <Image src={person.photo} alt={`${person.name}`} fill className="object-cover" />
        </div>
      ) : (
        <div className={`flex h-56 w-44 shrink-0 items-center justify-center rounded-xl text-4xl font-bold md:h-64 md:w-52 ${accentClass}`}>
          {initial}
        </div>
      )}

      <div className="flex-1">
        <p className="whitespace-pre-line text-base leading-relaxed text-muted-foreground">
          {person.content}
        </p>

        <div className="mt-8 border-t pt-6">
          <p className="text-lg font-bold">{person.name || (accent === "advisor" ? "주임교수" : "회장")}</p>
          <p className="text-sm text-muted-foreground">{person.title}</p>
        </div>
      </div>
    </motion.div>
  );
}

export default function GreetingPage() {
  const { advisor, president, isLoading } = useGreeting();

  if (isLoading) {
    return <LoadingSpinner className="min-h-[40vh] items-center" />;
  }

  const showAdvisor = !!(advisor.name || advisor.content);

  return (
    <div className="py-16">
      <section className="mx-auto max-w-6xl px-4 text-center">
        <h1 className="text-3xl font-bold md:text-4xl">인사말</h1>
        <p className="mt-4 text-muted-foreground">
          {showAdvisor
            ? "연세교육공학회 주임교수와 학회장의 인사말입니다."
            : "연세교육공학회 학회장의 인사말입니다."}
        </p>
      </section>

      <section className="mx-auto mt-12 max-w-6xl space-y-8 px-4">
        {showAdvisor && <GreetingCard person={advisor} accent="advisor" />}
        <GreetingCard person={president} accent="president" />
      </section>
    </div>
  );
}
