import type { Metadata } from "next";
import MemberCard from "@/components/members/MemberCard";
import GenerationTabs from "@/components/members/GenerationTabs";

export const metadata: Metadata = {
  title: "멤버 소개",
  description: "연세교육공학회 멤버를 소개합니다.",
};

export interface MemberData {
  name: string;
  generation: number;
  field: string;
  role?: string;
  bio: string;
}

const MEMBERS: MemberData[] = [
  { name: "김민수", generation: 1, field: "AI 교육", role: "회장", bio: "교육공학 석사과정. AI 기반 적응형 학습 연구." },
  { name: "이서연", generation: 1, field: "교수설계", bio: "교육학과 4학년. 체계적 교수설계에 관심." },
  { name: "박지호", generation: 1, field: "학습분석", bio: "데이터사이언스 전공. 학습 데이터 시각화 연구." },
  { name: "정다은", generation: 1, field: "UX 리서치", bio: "HCI 전공. 교육 서비스 UX 개선에 관심." },
  { name: "최현우", generation: 2, field: "에듀테크", role: "회장", bio: "컴퓨터과학 전공. 에듀테크 스타트업 경험." },
  { name: "한소영", generation: 2, field: "LMS", bio: "교육공학 전공. 학습관리시스템 설계 연구." },
  { name: "윤재민", generation: 2, field: "게이미피케이션", bio: "게임디자인 전공. 교육 게이미피케이션 설계." },
  { name: "오수빈", generation: 2, field: "콘텐츠 개발", bio: "교육학과 3학년. 교육 영상 콘텐츠 제작." },
  { name: "강태희", generation: 3, field: "생성형 AI", role: "회장", bio: "교육공학 석사과정. LLM 활용 교육 도구 개발." },
  { name: "임준서", generation: 3, field: "VR/AR 교육", bio: "미디어학과 4학년. 실감형 교육 콘텐츠 연구." },
  { name: "신예린", generation: 3, field: "교수설계", bio: "교육학과 3학년. ADDIE 모형 기반 수업 설계." },
  { name: "조민기", generation: 3, field: "데이터 분석", bio: "통계학과 4학년. 교육 데이터 마이닝에 관심." },
];

export default function MembersPage() {
  return (
    <div className="py-16">
      <section className="mx-auto max-w-6xl px-4 text-center">
        <h1 className="text-3xl font-bold md:text-4xl">멤버 소개</h1>
        <p className="mt-4 text-muted-foreground">
          교육의 미래를 함께 만들어가는 멤버들을 소개합니다.
        </p>
      </section>

      <section className="mx-auto mt-12 max-w-6xl px-4">
        <GenerationTabs members={MEMBERS} />
      </section>
    </div>
  );
}
