"use client";

import Image from "next/image";
import Link from "next/link";
import { Instagram, Award, CreditCard, CalendarCheck, UserCog } from "lucide-react";
import { useAuthStore } from "@/features/auth/auth-store";

const MEMBER_SHORTCUTS = [
  { href: "/mypage/activities?tab=certificates", label: "수료증 확인", icon: Award },
  { href: "/console/fees", label: "회비 납부", icon: CreditCard },
  { href: "/mypage/activities?tab=activities", label: "내 활동", icon: CalendarCheck },
  { href: "/mypage?tab=profile", label: "프로필 관리", icon: UserCog },
];

export default function Footer() {
  const { user } = useAuthStore();

  return (
    <footer className="border-t bg-gradient-to-b from-[hsl(212,80%,15%)] via-slate-900 to-[hsl(212,40%,8%)] text-slate-300">
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="grid gap-8 md:grid-cols-3">
          {/* Logo & Description */}
          <div>
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-card p-1 shadow-sm dark:bg-slate-100">
                <Image
                  src="/card-news/brand/shield.png"
                  alt="연세대학교 엠블럼"
                  width={36}
                  height={36}
                  className="h-9 w-9"
                />
              </div>
              <span className="text-lg font-bold text-white">연세교육공학회</span>
            </div>
            <p className="mt-3 text-sm text-slate-400">
              교육의 미래를 함께 설계하는
              <br />
              연세대학교 교육공학 학술 커뮤니티
            </p>
          </div>

          {/* Quick Links — Sprint 67-AL: 학회소개·문의를 1차 메뉴에서 옮긴 항목 강화 */}
          <div>
            <h3 className="mb-3 text-sm font-semibold text-white">학회소개</h3>
            <nav className="flex flex-col gap-2">
              <Link href="/about/greeting" className="text-sm text-slate-400 hover:text-white">인사말</Link>
              <Link href="/about" className="text-sm text-slate-400 hover:text-white">학회 소개</Link>
              <Link href="/about/fields" className="text-sm text-slate-400 hover:text-white">활동 분야</Link>
              <Link href="/about/history" className="text-sm text-slate-400 hover:text-white">연혁</Link>
              <Link href="/about/leadership?tab=professor" className="text-sm text-slate-400 hover:text-white">주임교수·운영진</Link>
              <Link href="/contact" className="text-sm text-slate-400 hover:text-white">문의하기</Link>
            </nav>

            {user && (
              <div className="mt-5">
                <h3 className="mb-2 text-xs font-semibold text-slate-500">회원 전용</h3>
                <nav className="flex flex-col gap-2">
                  {MEMBER_SHORTCUTS.map((s) => (
                    <Link
                      key={s.href}
                      href={s.href}
                      className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white"
                    >
                      <s.icon size={14} />
                      {s.label}
                    </Link>
                  ))}
                </nav>
              </div>
            )}
          </div>

          {/* Contact */}
          <div>
            <h3 className="mb-3 text-sm font-semibold text-white">연락처</h3>
            <div className="flex flex-col gap-2 text-sm text-slate-400">
              <p>yonsei.edtech@gmail.com</p>
              <p>서울시 서대문구 연세로 50</p>
              <p>연세대학교 교육과학관</p>
              <a
                href="https://www.instagram.com/edtech_yonsei/"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-sky-400 hover:text-sky-300"
              >
                <Instagram size={16} />
                @edtech_yonsei
              </a>
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 border-t border-slate-700 pt-6 text-xs text-slate-500 sm:flex-row sm:gap-4">
          <p>&copy; 2025 연세교육공학회 (Yonsei EdTech). All rights reserved.</p>
          <div className="flex items-center gap-3">
            <Link href="/terms" className="hover:text-slate-300">이용약관</Link>
            <span aria-hidden>·</span>
            <Link href="/privacy" className="hover:text-slate-300">개인정보처리방침</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
