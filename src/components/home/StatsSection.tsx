"use client";

import { motion } from "framer-motion";

const stats = [
  { value: "29+", label: "기수" },
  { value: "80+", label: "멤버" },
  { value: "50+", label: "세미나" },
  { value: "20+", label: "프로젝트" },
];

export default function StatsSection() {
  return (
    <section className="bg-gradient-to-r from-primary to-primary/80 py-16">
      <div className="mx-auto max-w-6xl px-4">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              className="text-center"
            >
              <div className="text-3xl font-bold text-white md:text-4xl">
                {stat.value}
              </div>
              <div className="mt-1 text-sm text-white/70">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
