"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

export default function AboutPreview() {
  return (
    <section className="border-b py-16 md:py-24">
      <div className="mx-auto max-w-6xl px-4">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="grid gap-10 md:grid-cols-2"
        >
          {/* Left: Statement */}
          <div>
            <h2 className="text-2xl font-bold leading-snug md:text-3xl">
              이론과 실천 사이에서
              <br />
              배움을 설계합니다
            </h2>
            <p className="mt-4 leading-relaxed text-muted-foreground">
              연세교육공학회는 교육공학의 학술적 탐구와 에듀테크의 실질적 적용을
              동시에 추구합니다. 학회원들은 매주 세미나에서 최신 연구를 토론하고,
              학기 프로젝트를 통해 교육 현장의 문제를 직접 해결합니다.
            </p>
            <Link
              href="/about"
              className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              자세히 보기 <ArrowRight size={14} />
            </Link>
          </div>

          {/* Right: What we do */}
          <div className="space-y-6">
            {[
              {
                title: "주간 세미나",
                desc: "교육공학 논문 리뷰, 에듀테크 트렌드 발제 및 토론",
              },
              {
                title: "프로젝트",
                desc: "교육 문제 해결을 위한 프로토타입 기획·개발·테스트",
              },
              {
                title: "주제별 스터디",
                desc: "AI 교육, UX 리서치, 교수설계 등 소그룹 심화 학습",
              },
            ].map((item, i) => (
              <div key={item.title} className="flex gap-4">
                <span className="mt-0.5 text-sm font-bold text-primary/40">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div>
                  <h3 className="font-semibold">{item.title}</h3>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
