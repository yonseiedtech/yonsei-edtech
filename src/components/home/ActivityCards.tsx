"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { seminarsApi, postsApi } from "@/lib/bkend";

interface Activity {
  category: string;
  title: string;
  desc: string;
  date: string;
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function ActivityCards() {
  const { data: activities = [], isLoading } = useQuery({
    queryKey: ["home", "recent-activities"],
    queryFn: async (): Promise<Activity[]> => {
      const results: Activity[] = [];

      try {
        const seminars = await seminarsApi.list({ limit: 2 });
        for (const s of seminars.data) {
          results.push({
            category: "세미나",
            title: (s.title as string) || "",
            desc: (s.description as string)?.slice(0, 80) || "",
            date: formatDate(s.date as string),
          });
        }
      } catch { /* Firestore 미연결 시 무시 */ }

      try {
        const posts = await postsApi.list({ limit: 2 });
        for (const p of posts.data) {
          results.push({
            category: "게시글",
            title: (p.title as string) || "",
            desc: (p.content as string)?.replace(/<[^>]*>/g, "").slice(0, 80) || "",
            date: formatDate(p.createdAt as string),
          });
        }
      } catch { /* Firestore 미연결 시 무시 */ }

      return results.slice(0, 3);
    },
    staleTime: 60_000,
  });

  if (!isLoading && activities.length === 0) return null;

  return (
    <section className="py-12 sm:py-16 md:py-24">
      <div className="mx-auto max-w-6xl px-4">
        <div className="flex items-end justify-between gap-3">
          <h2 className="text-2xl font-bold tracking-tight md:text-3xl lg:text-4xl">최근 활동</h2>
          <Link
            href="/activities"
            className="group inline-flex items-center gap-1 text-sm font-semibold text-primary transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm"
          >
            전체 보기
            <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>

        <div className="mt-8 divide-y border-y">
          {activities.map((a, i) => (
            <motion.div
              key={`${a.category}-${a.title}`}
              initial={{ opacity: 0, y: 4 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
              className="grid gap-2 py-6 md:grid-cols-12 md:items-center md:gap-4"
            >
              <div className="md:col-span-2">
                <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                  {a.category}
                </span>
                <span className="ml-2 text-xs text-muted-foreground md:ml-0 md:mt-1.5 md:block">
                  {a.date}
                </span>
              </div>
              <h3 className="font-bold tracking-tight md:col-span-4">{a.title}</h3>
              <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground md:col-span-6">
                {a.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
