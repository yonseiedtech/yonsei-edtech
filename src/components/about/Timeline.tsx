"use client";

import { motion } from "framer-motion";

const HISTORY = [
  { year: "2024", title: "학회 창립", desc: "연세대학교 교육공학 전공 학생들이 모여 학회를 설립" },
  { year: "2024", title: "첫 세미나 시리즈", desc: "AI와 교육 주제의 첫 정기 세미나 개최" },
  { year: "2025", title: "프로젝트 런칭", desc: "에듀테크 프로토타입 팀 프로젝트 시작" },
  { year: "2025", title: "회원 확대", desc: "타과 학생 참여로 학제간 교류 활성화" },
  { year: "2026", title: "홈페이지 오픈", desc: "공식 웹사이트를 통한 지식 아카이빙 시작" },
];

export default function Timeline() {
  return (
    <div className="relative mt-10">
      {/* Center line */}
      <div className="absolute left-4 top-0 h-full w-0.5 bg-border md:left-1/2 md:-translate-x-0.5" />

      <div className="space-y-8">
        {HISTORY.map((item, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: i % 2 === 0 ? -30 : 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: i * 0.1 }}
            className={`relative flex items-start gap-6 pl-12 md:pl-0 ${
              i % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"
            }`}
          >
            {/* Dot */}
            <div className="absolute left-3 top-1.5 h-3 w-3 rounded-full border-2 border-primary bg-white md:left-1/2 md:-translate-x-1.5" />

            {/* Content */}
            <div
              className={`md:w-1/2 ${
                i % 2 === 0 ? "md:pr-12 md:text-right" : "md:pl-12"
              }`}
            >
              <span className="text-sm font-bold text-primary">
                {item.year}
              </span>
              <h3 className="font-semibold">{item.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{item.desc}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
