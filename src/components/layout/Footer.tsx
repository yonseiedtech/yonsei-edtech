"use client";

import Image from "next/image";
import Link from "next/link";
import { Instagram, Award, CreditCard, CalendarCheck, UserCog } from "lucide-react";
import { useAuthStore } from "@/features/auth/auth-store";

const MEMBER_SHORTCUTS = [
  { href: "/mypage?tab=certificates", label: "수료증 확인", icon: Award },
  { href: "/admin/fees", label: "회비 납부", icon: CreditCard },
  { href: "/mypage?tab=seminars", label: "내 활동", icon: CalendarCheck },
  { href: "/mypage", label: "프로필 관리", icon: UserCog },
];

export default function Footer() {
  const { user } = useAuthStore();

  return (
    <footer className="border-t bg-muted/30">
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="grid gap-8 md:grid-cols-3">
          {/* Logo & Description */}
          <div>
            <div className="flex items-center gap-2">
              <Image
                src="/yonsei-emblem.svg"
                alt="연세대학교 엠블럼"
                width={32}
                height={32}
                className="h-8 w-8"
              />
              <span className="text-lg font-bold">연세교육공학회</span>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              교육의 미래를 함께 설계하는
              <br />
              연세대학교 교육공학 학술 커뮤니티
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="mb-3 text-sm font-semibold">바로가기</h3>
            <nav className="flex flex-col gap-2">
              <Link href="/about" className="text-sm text-muted-foreground hover:text-foreground">학회 소개</Link>
              <Link href="/seminars" className="text-sm text-muted-foreground hover:text-foreground">세미나</Link>
              <Link href="/notices" className="text-sm text-muted-foreground hover:text-foreground">공지사항</Link>
              <Link href="/contact" className="text-sm text-muted-foreground hover:text-foreground">문의</Link>
            </nav>

            {user && (
              <div className="mt-5">
                <h3 className="mb-2 text-xs font-semibold text-muted-foreground">회원 전용</h3>
                <nav className="flex flex-col gap-2">
                  {MEMBER_SHORTCUTS.map((s) => (
                    <Link
                      key={s.href}
                      href={s.href}
                      className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
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
            <h3 className="mb-3 text-sm font-semibold">연락처</h3>
            <div className="flex flex-col gap-2 text-sm text-muted-foreground">
              <p>yonsei.edtech@gmail.com</p>
              <p>서울시 서대문구 연세로 50</p>
              <p>연세대학교 교육과학관</p>
              <a
                href="https://www.instagram.com/edtech_yonsei/"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
              >
                <Instagram size={16} />
                @edtech_yonsei
              </a>
            </div>
          </div>
        </div>

        <div className="mt-8 border-t pt-6 text-center text-xs text-muted-foreground">
          &copy; 2025 연세교육공학회 (Yonsei EdTech). All rights reserved.
        </div>
      </div>
    </footer>
  );
}
