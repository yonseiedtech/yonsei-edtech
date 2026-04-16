"use client";

import { motion } from "framer-motion";
import { useHistory } from "@/features/site-settings/useSiteContent";
import LoadingSpinner from "@/components/ui/loading-spinner";

export default function Timeline() {
  const { value: history, isLoading } = useHistory();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="relative mt-10">
      <div className="absolute left-4 top-0 h-full w-0.5 bg-border md:left-1/2 md:-translate-x-0.5" />

      <div className="space-y-8">
        {history.map((item, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: i % 2 === 0 ? -30 : 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: i * 0.1 }}
            className={`relative flex items-start gap-6 pl-12 md:pl-0 ${i % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"}`}
          >
            <div className="absolute left-3 top-1.5 h-3 w-3 rounded-full border-2 border-primary bg-white md:left-1/2 md:-translate-x-1.5" />
            <div className={`md:w-1/2 ${i % 2 === 0 ? "md:pr-12 md:text-right" : "md:pl-12"}`}>
              <span className="text-sm font-bold text-primary">{item.year}</span>
              <h3 className="font-semibold">{item.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{item.desc}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
