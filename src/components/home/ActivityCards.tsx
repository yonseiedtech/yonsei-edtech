"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

const recentActivities = [
  {
    category: "세미나",
    title: "ChatGPT를 활용한 적응형 학습 설계",
    desc: "LLM 기반 학습 피드백 시스템의 가능성과 한계를 사례 중심으로 분석했습니다.",
    date: "2026.03",
  },
  {
    category: "프로젝트",
    title: "학습 대시보드 프로토타입 v2",
    desc: "학습 분석 데이터를 시각화하고 학습자 맞춤 피드백을 제공하는 대시보드를 개발했습니다.",
    date: "2025.09",
  },
  {
    category: "스터디",
    title: "UX 리서치 기초 스터디",
    desc: "교육 서비스 대상 사용자 인터뷰, 설문 설계, 프로토타입 테스트 방법론을 학습했습니다.",
    date: "2026.03",
  },
];

export default function ActivityCards() {
  return (
    <section className="py-16 md:py-24">
      <div className="mx-auto max-w-6xl px-4">
        <div className="flex items-end justify-between">
          <h2 className="text-2xl font-bold md:text-3xl">최근 활동</h2>
          <Link
            href="/activities"
            className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            전체 보기 <ArrowRight size={14} />
          </Link>
        </div>

        <div className="mt-8 divide-y border-y">
          {recentActivities.map((a, i) => (
            <motion.div
              key={a.title}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
              className="grid gap-2 py-6 md:grid-cols-12 md:items-center md:gap-4"
            >
              <div className="md:col-span-2">
                <span className="text-xs font-medium text-primary">
                  {a.category}
                </span>
                <span className="ml-2 text-xs text-muted-foreground md:ml-0 md:block">
                  {a.date}
                </span>
              </div>
              <h3 className="font-semibold md:col-span-4">{a.title}</h3>
              <p className="text-sm text-muted-foreground md:col-span-6">
                {a.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
