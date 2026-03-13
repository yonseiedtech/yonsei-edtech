import Image from "next/image";
import Link from "next/link";
import { Instagram } from "lucide-react";

export default function Footer() {
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
              <Link
                href="/about"
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                학회 소개
              </Link>
              <Link
                href="/activities"
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                활동 소개
              </Link>
              <Link
                href="/members"
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                멤버
              </Link>
              <Link
                href="/contact"
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                문의
              </Link>
            </nav>
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
          &copy; {new Date().getFullYear()} 연세교육공학회 (Yonsei EdTech). All
          rights reserved.
        </div>
      </div>
    </footer>
  );
}
