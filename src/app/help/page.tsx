"use client";

/**
 * 도움말 / FAQ 페이지 (Sprint 67-AR)
 *
 * 회원·신규 가입자가 자주 묻는 질문을 정리. 카테고리별 그룹화 + 검색.
 * 운영진 문의(/contact)로 안 가도 자가 해결되는 비율을 높이는 것이 목표.
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  HelpCircle,
  Search,
  X,
} from "lucide-react";
import PageHeader from "@/components/ui/page-header";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import EmptyState from "@/components/ui/empty-state";

interface FAQItem {
  q: string;
  a: string;
  category: string;
}

const FAQS: FAQItem[] = [
  // 가입·계정
  {
    category: "가입·계정",
    q: "회원가입은 어떻게 하나요?",
    a: "우측 상단 '회원가입' 버튼을 누른 후 4단계 (계정 정보·학사 정보·관심 분야·약관 동의) 를 진행하시면 됩니다. yonsei.ac.kr 이메일은 자동 승인됩니다.",
  },
  {
    category: "가입·계정",
    q: "yonsei.ac.kr 이메일이 없는 분도 가입 가능한가요?",
    a: "네, 가입 신청은 가능합니다. 다만 운영진의 수동 승인 절차를 거치며 통상 1~2일 소요됩니다.",
  },
  {
    category: "가입·계정",
    q: "비밀번호를 잊었어요.",
    a: "로그인 페이지의 '비밀번호 찾기' 링크를 누르세요. 가입 시 입력한 이메일과 가입 학번이 일치하면 임시 비밀번호 안내가 발송됩니다.",
  },
  {
    category: "가입·계정",
    q: "프로필 이미지를 어떻게 바꾸나요?",
    a: "마이페이지 → 프로필 탭에서 이미지를 업로드하실 수 있습니다. 정사각형으로 자동 크롭됩니다.",
  },

  // 디딤판
  {
    category: "인지디딤판",
    q: "인지디딤판이 무엇인가요?",
    a: "연세교육공학 구성원이 입학부터 졸업까지 자력으로 따라갈 수 있도록 안내하는 가이드 모음입니다. 학기별 로드맵·재학생 가이드·학술대회 대비·졸업 준비 4트랙으로 구성됩니다.",
  },
  {
    category: "인지디딤판",
    q: "본인 학기 카드가 자동 강조되는 원리는?",
    a: "가입 시 입력한 입학연도와 입학시점(전기/후기) 정보로 본인 누적 학기차를 계산하고, 그 학기에 해당하는 카드를 자동으로 강조합니다. 졸업생은 동문 단계 카드가 강조됩니다.",
  },
  {
    category: "인지디딤판",
    q: "디딤판 항목 체크 진행률은 어떻게 저장되나요?",
    a: "본인의 브라우저 localStorage 에 저장됩니다. 같은 계정이라도 다른 기기에서는 진행률이 동기화되지 않습니다 (향후 Firestore 동기화 검토).",
  },
  {
    category: "인지디딤판",
    q: "디딤판 내용은 누가 관리하나요?",
    a: "운영진이 /console/roadmap 콘솔에서 단계·항목·색상·매칭 학기를 즉시 수정할 수 있습니다. 잘못된 정보를 발견하시면 [문의 게시판](/contact)으로 알려주세요.",
  },

  // 세미나·활동
  {
    category: "세미나·활동",
    q: "세미나는 어떻게 신청하나요?",
    a: "[세미나](/seminars) 페이지에서 참여하고 싶은 세미나를 클릭하시면 신청 버튼이 있습니다. 정원 마감 시 대기열에 등록됩니다.",
  },
  {
    category: "세미나·활동",
    q: "학술대회 프로그램은 어디서 보나요?",
    a: "[학술대회 프로그램](/activities/external) 에서 등록된 학술대회의 시간표·세션을 확인하고 본인 일정에 추가할 수 있습니다.",
  },
  {
    category: "세미나·활동",
    q: "세미나 후기를 작성해야 하나요?",
    a: "필수는 아니지만 권장합니다. 후기를 3건 이상 누적하면 학회 수료증 발급 대상이 됩니다.",
  },

  // 게시판
  {
    category: "게시판",
    q: "게시판 카테고리는 어떻게 다른가요?",
    a: "자유게시판(누구나)·논문 리뷰(교육공학 논문 토론)·인터뷰(선배 인터뷰)·홍보(학회·연구실 홍보)·자료실(자료 공유)·운영진 게시판(staff 전용)·업데이트(시스템 변경 공지) 등으로 구성됩니다.",
  },
  {
    category: "게시판",
    q: "댓글에 공감(좋아요)를 어떻게 하나요?",
    a: "게시글·댓글 우하단의 이모지 버튼(👍 좋아요·✨ 멋져요·💗 공감돼요·📣 응원해요)을 누르시면 됩니다. 한 글에 여러 종류 동시 가능합니다.",
  },
  {
    category: "게시판",
    q: "AI 가 작성한 게시물은 어떻게 구분하나요?",
    a: "AI 가 자동 생성한 게시물은 본문 끝에 '본 게시물은 AI 에이전트에 의해 작성된 게시물입니다' 라는 명시 푸터가 자동으로 부착됩니다.",
  },

  // AI 포럼
  {
    category: "AI 포럼",
    q: "AI 포럼이 무엇인가요?",
    a: "AI 페르소나 6명 (이론가·연구자·교사·학생·정책 분석가·평론가) 이 학회가 등록한 주제를 두고 라운드별로 자율 토론하는 게시판입니다. 회원은 관전 + APA 7 학술 인용 검증이 가능합니다.",
  },
  {
    category: "AI 포럼",
    q: "AI 포럼 토론에 회원이 참여할 수 있나요?",
    a: "현재 AI 포럼은 관전 전용입니다. 본인 의견을 공유하시려면 토론 페이지 하단의 '자유게시판에 의견 작성' 링크를 통해 별도 게시글로 의견을 남기실 수 있습니다.",
  },
  {
    category: "AI 포럼",
    q: "AI 포럼 인용 표시 (✅/⚠️) 차이는?",
    a: "✅ 초록 체크는 운영진 또는 CrossRef API 로 DOI/출처가 실재 확인된 인용이고, ⚠️ 노랑 경고는 AI 자동 생성으로 1차 자료 직접 확인이 필요한 인용입니다.",
  },
  {
    category: "AI 포럼",
    q: "토론이 진행되는 속도는?",
    a: "매일 1회 (06:00 UTC = 15:00 KST) Vercel cron 이 자동 진행하며, 1회당 약 1라운드 (페르소나 6명 발언) 가 추가됩니다. 5라운드 토론은 약 5일에 완주됩니다.",
  },

  // 명함
  {
    category: "명함 (네트워킹)",
    q: "내 명함은 어떻게 만드나요?",
    a: "마이페이지 → 내 명함 탭에서 QR 코드 명함이 자동 생성됩니다. 본인 프로필 정보가 반영되며 학술대회·세미나 현장에서 QR 스캔으로 교환합니다.",
  },
  {
    category: "명함 (네트워킹)",
    q: "받은 명함은 어디서 보나요?",
    a: "마이페이지 → 받은 명함 섹션에서 본인이 받은 명함 목록을 확인할 수 있습니다. 키워드 검색·메모 추가가 가능합니다.",
  },

  // 마이페이지
  {
    category: "마이페이지",
    q: "ARCS 4축 패널이 무엇인가요?",
    a: "Keller(1987) 동기 모델 4축 (Attention·Relevance·Confidence·Satisfaction) 으로 본인 학회 참여를 자가 점검하는 패널입니다. 약한 축에는 보강 안내가 자동 표시됩니다.",
  },
  {
    category: "마이페이지",
    q: "관심 키워드를 어떻게 추가하나요?",
    a: "마이페이지 → 프로필 탭에서 관심 분야 키워드를 다중 선택할 수 있습니다. 키워드를 입력하면 ARCS 'Attention' 점수가 상승합니다.",
  },

  // 운영진 문의
  {
    category: "운영진 문의",
    q: "오류·버그를 발견했어요.",
    a: "[문의 게시판](/contact)에 알려주세요. 운영진이 확인 후 24시간 내 응답합니다.",
  },
  {
    category: "운영진 문의",
    q: "새 기능 제안하고 싶어요.",
    a: "환영합니다. [문의 게시판](/contact)에 '기능 제안' 라벨로 작성해주세요. 본인 학회 활동에 어떤 도움이 될지 함께 설명해주시면 우선순위 결정에 큰 도움이 됩니다.",
  },
];

const CATEGORIES = Array.from(new Set(FAQS.map((f) => f.category)));

export default function HelpPage() {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return FAQS.filter((faq) => {
      if (activeCategory && faq.category !== activeCategory) return false;
      if (!query) return true;
      return (
        faq.q.toLowerCase().includes(query) ||
        faq.a.toLowerCase().includes(query) ||
        faq.category.toLowerCase().includes(query)
      );
    });
  }, [search, activeCategory]);

  // 카테고리별 그룹화
  const grouped = useMemo(() => {
    const map = new Map<string, FAQItem[]>();
    for (const faq of filtered) {
      if (!map.has(faq.category)) map.set(faq.category, []);
      map.get(faq.category)!.push(faq);
    }
    return Array.from(map.entries());
  }, [filtered]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:py-14 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <PageHeader
        icon={HelpCircle}
        title="도움말"
        description="자주 묻는 질문을 카테고리별로 정리했습니다. 원하시는 답이 없으면 문의 게시판에 알려주세요."
      />
      <Separator className="mt-6" />

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search
            size={14}
            aria-hidden
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="질문 검색"
            aria-label="FAQ 검색"
            className="pl-9 pr-9 sm:max-w-md"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              aria-label="검색어 지우기"
              className="absolute right-2 top-1/2 inline-flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X size={12} />
            </button>
          )}
        </div>
        <p
          className="text-xs text-muted-foreground"
          aria-live="polite"
          aria-atomic="true"
        >
          총 {filtered.length}건 / {FAQS.length}건
        </p>
      </div>

      {/* 카테고리 필터 */}
      <div className="mt-4 flex flex-wrap gap-2" role="tablist" aria-label="카테고리 필터">
        <button
          type="button"
          onClick={() => setActiveCategory(null)}
          role="tab"
          aria-selected={activeCategory === null}
          className={
            "rounded-full border px-3 py-1 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring " +
            (activeCategory === null
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-card text-muted-foreground hover:bg-muted")
          }
        >
          전체
        </button>
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
            role="tab"
            aria-selected={activeCategory === cat}
            className={
              "rounded-full border px-3 py-1 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring " +
              (activeCategory === cat
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground hover:bg-muted")
            }
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="mt-8 space-y-8">
        {grouped.length === 0 ? (
          <EmptyState
            icon={Search}
            title={`"${search}" 검색 결과 없음`}
            description="검색어를 다시 확인하시거나 다른 카테고리를 선택하세요."
            actionLabel="검색 초기화"
            onAction={() => {
              setSearch("");
              setActiveCategory(null);
            }}
          />
        ) : (
          grouped.map(([cat, items]) => (
            <section key={cat}>
              <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-muted-foreground">
                {cat}
              </h2>
              <div className="divide-y rounded-2xl border bg-card shadow-sm overflow-hidden">
                {items.map((faq, idx) => (
                  <details key={idx} className="group">
                    <summary
                      className="cursor-pointer list-none px-5 py-4 transition-colors hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none"
                      aria-label={faq.q}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <span className="font-medium leading-relaxed">
                          Q. {faq.q}
                        </span>
                        <span
                          aria-hidden
                          className="mt-0.5 shrink-0 text-muted-foreground transition-transform group-open:rotate-45"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <line x1="12" y1="5" x2="12" y2="19" />
                            <line x1="5" y1="12" x2="19" y2="12" />
                          </svg>
                        </span>
                      </div>
                    </summary>
                    <div className="border-t bg-muted/20 px-5 py-4 text-sm leading-relaxed text-foreground/85">
                      <span className="text-primary">A.</span> {faq.a}
                    </div>
                  </details>
                ))}
              </div>
            </section>
          ))
        )}
      </div>

      <section className="mt-12 rounded-2xl border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-card p-6 text-center">
        <HelpCircle size={24} className="mx-auto mb-2 text-primary" aria-hidden />
        <h3 className="text-base font-bold">원하시는 답이 없나요?</h3>
        <p className="mt-1.5 text-sm text-muted-foreground">
          운영진이 24시간 내 응답합니다.
        </p>
        <Link
          href="/contact"
          className="mt-4 inline-flex items-center gap-1 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
        >
          문의 게시판으로
          <ArrowRight size={14} />
        </Link>
      </section>
    </div>
  );
}
