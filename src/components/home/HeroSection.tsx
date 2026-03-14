"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

export default function HeroSection() {
  return (
    <section className="border-b py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-4">
        <div className="grid items-center gap-12 md:grid-cols-5">
          {/* Left: Main copy */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="md:col-span-3"
          >
            <div className="flex items-center gap-2">
              <Image
                src="/yonsei-emblem.svg"
                alt="연세대학교 엠블럼"
                width={24}
                height={24}
                className="h-6 w-6"
              />
              <p className="text-sm font-medium tracking-wide text-primary">
                연세대학교 교육공학 학술 커뮤니티
              </p>
            </div>

            <h1 className="mt-4 text-3xl font-bold leading-snug text-foreground md:text-5xl md:leading-snug">
              교육의 미래를
              <br />
              함께 설계합니다
            </h1>

            <p className="mt-5 max-w-lg text-base leading-relaxed text-muted-foreground">
              에듀테크, 교수설계, 학습과학 분야의 최신 트렌드를 연구하고
              공유합니다. 매 학기 세미나와 팀 프로젝트를 중심으로 활동합니다.
            </p>

            <div className="mt-8 flex items-center gap-4">
              <Link
                href="/about"
                className="inline-flex items-center gap-2 bg-primary px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary/90"
              >
                학회 소개
                <ArrowRight size={15} />
              </Link>
              <Link
                href="/board"
                className="text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              >
                게시판 바로가기
              </Link>
            </div>
          </motion.div>

          {/* Right: Key numbers */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="md:col-span-2"
          >
            <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border bg-border">
              {[
                { value: "29+", label: "기수" },
                { value: "80+", label: "회원" },
                { value: "50+", label: "세미나" },
                { value: "20+", label: "프로젝트" },
              ].map((stat) => (
                <div key={stat.label} className="bg-white p-6 text-center">
                  <div className="text-2xl font-bold text-foreground">
                    {stat.value}
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
