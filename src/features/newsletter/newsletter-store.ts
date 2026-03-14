import { create } from "zustand";

export interface NewsletterSection {
  id: string;
  postId: string;
  title: string;
  content: string;
  authorName: string;
  /** 섹션 유형 */
  type: "feature" | "interview" | "review" | "column" | "news";
  order: number;
}

export interface NewsletterIssue {
  id: string;
  /** 호수 (예: 12) */
  issueNumber: number;
  title: string;
  subtitle: string;
  /** 표지 색상 테마 */
  coverColor: string;
  publishDate: string;
  editorName: string;
  sections: NewsletterSection[];
  status: "draft" | "published";
  createdAt: string;
}

const SECTION_TYPE_LABELS: Record<NewsletterSection["type"], string> = {
  feature: "특집",
  interview: "인터뷰",
  review: "리뷰",
  column: "칼럼",
  news: "소식",
};

export { SECTION_TYPE_LABELS };

// 데모 학회보 데이터 (기존 게시글 연동)
const MOCK_ISSUES: NewsletterIssue[] = [
  {
    id: "nl-1",
    issueNumber: 12,
    title: "연세교육공학회보 제12호",
    subtitle: "생성형 AI와 교수설계의 만남",
    coverColor: "from-violet-600 to-indigo-700",
    publishDate: "2026-03-01",
    editorName: "이운영",
    status: "published",
    createdAt: "2026-03-01T00:00:00Z",
    sections: [
      { id: "s1", postId: "8", title: "생성형 AI와 교수설계의 만남", content: "생성형 AI 기술이 교수설계 분야에 가져온 변화와 새로운 가능성을 탐구합니다. ADDIE 모형에서 AI가 어떤 역할을 할 수 있는지, 프롬프트 엔지니어링이 교수설계자의 새로운 역량이 될 수 있는지 논의합니다.", authorName: "이운영", type: "feature", order: 1 },
      { id: "s2", postId: "8", title: "VR 기반 역사 교육 프로그램", content: "3기 임준서 회원의 VR/AR 교육 콘텐츠 연구를 소개합니다. 실감형 기술을 활용한 역사 교육의 효과성 연구 결과와 향후 발전 방향을 다룹니다.", authorName: "임준서", type: "review", order: 2 },
      { id: "s3", postId: "8", title: "에듀테크 스타트업 창업기", content: "연세교육공학회 2기 출신으로 에듀테크 스타트업을 창업한 졸업생의 이야기. 학회 활동이 창업에 어떤 영향을 미쳤는지, 교육공학 전공의 강점은 무엇인지 들어봅니다.", authorName: "최현우", type: "interview", order: 3 },
      { id: "s4", postId: "8", title: "2025 가을학기 활동 리뷰", content: "지난 학기 진행된 6회의 정기 세미나, 2개의 프로젝트 팀 활동, 그리고 타 학회와의 교류 세미나 내용을 정리합니다.", authorName: "이운영", type: "news", order: 4 },
    ],
  },
  {
    id: "nl-2",
    issueNumber: 11,
    title: "연세교육공학회보 제11호",
    subtitle: "마이크로크레덴셜의 현재와 미래",
    coverColor: "from-emerald-600 to-teal-700",
    publishDate: "2025-12-15",
    editorName: "이운영",
    status: "published",
    createdAt: "2025-12-15T00:00:00Z",
    sections: [
      { id: "s5", postId: "9", title: "마이크로크레덴셜의 현재와 미래", content: "전통적인 학위 체계를 보완하는 마이크로크레덴셜의 부상. 국내외 대학과 기업의 도입 사례, 그리고 교육공학적 관점에서의 설계 원칙을 분석합니다.", authorName: "이운영", type: "feature", order: 1 },
      { id: "s6", postId: "9", title: "2025 가을학기 발제 모음", content: "한 학기 동안 진행된 세미나 발제 내용을 요약 정리합니다. AI 교육, 학습분석, 게이미피케이션 등 다양한 주제가 다뤄졌습니다.", authorName: "이운영", type: "review", order: 2 },
      { id: "s7", postId: "9", title: "대기업 HRD 담당자가 된 선배", content: "교육공학 전공 후 대기업 인재개발(HRD) 부서에서 활약하는 선배의 커리어 스토리를 인터뷰했습니다.", authorName: "한소영", type: "interview", order: 3 },
    ],
  },
  {
    id: "nl-3",
    issueNumber: 10,
    title: "연세교육공학회보 제10호",
    subtitle: "창간 10주년 특별호",
    coverColor: "from-amber-500 to-orange-600",
    publishDate: "2025-09-01",
    editorName: "김회장",
    status: "published",
    createdAt: "2025-09-01T00:00:00Z",
    sections: [
      { id: "s8", postId: "10", title: "10년의 발자취", content: "연세교육공학회가 걸어온 10년의 여정을 돌아봅니다. 창립부터 현재까지, 주요 활동과 성과를 연도별로 정리합니다.", authorName: "김회장", type: "feature", order: 1 },
      { id: "s9", postId: "10", title: "역대 회장 인터뷰", content: "1기부터 현재까지 역대 회장들의 회고와 학회에 대한 생각을 모았습니다.", authorName: "김회장", type: "interview", order: 2 },
      { id: "s10", postId: "10", title: "회원 설문조사 결과", content: "전체 회원 대상 설문조사 결과를 공개합니다. 학회 만족도, 개선 희망 사항, 향후 활동 제안 등을 분석합니다.", authorName: "김회장", type: "review", order: 3 },
      { id: "s11", postId: "10", title: "다음 10년을 향해", content: "교육공학의 미래 트렌드를 전망하고, 연세교육공학회의 비전과 목표를 제시합니다.", authorName: "김회장", type: "column", order: 4 },
    ],
  },
];

interface NewsletterState {
  issues: NewsletterIssue[];
  addIssue: (issue: Omit<NewsletterIssue, "id" | "createdAt">) => void;
  updateIssue: (id: string, data: Partial<NewsletterIssue>) => void;
  addSection: (issueId: string, section: Omit<NewsletterSection, "id">) => void;
  updateSection: (issueId: string, sectionId: string, data: Partial<NewsletterSection>) => void;
  removeSection: (issueId: string, sectionId: string) => void;
  reorderSections: (issueId: string, sections: NewsletterSection[]) => void;
}

export const useNewsletterStore = create<NewsletterState>((set) => ({
  issues: MOCK_ISSUES,

  addIssue: (data) =>
    set((state) => ({
      issues: [
        { ...data, id: `nl-${Date.now()}`, createdAt: new Date().toISOString() },
        ...state.issues,
      ],
    })),

  updateIssue: (id, data) =>
    set((state) => ({
      issues: state.issues.map((i) => (i.id === id ? { ...i, ...data } : i)),
    })),

  addSection: (issueId, section) =>
    set((state) => ({
      issues: state.issues.map((i) =>
        i.id === issueId
          ? { ...i, sections: [...i.sections, { ...section, id: `s${Date.now()}` }] }
          : i
      ),
    })),

  updateSection: (issueId, sectionId, data) =>
    set((state) => ({
      issues: state.issues.map((i) =>
        i.id === issueId
          ? {
              ...i,
              sections: i.sections.map((s) =>
                s.id === sectionId ? { ...s, ...data } : s
              ),
            }
          : i
      ),
    })),

  removeSection: (issueId, sectionId) =>
    set((state) => ({
      issues: state.issues.map((i) =>
        i.id === issueId
          ? { ...i, sections: i.sections.filter((s) => s.id !== sectionId) }
          : i
      ),
    })),

  reorderSections: (issueId, sections) =>
    set((state) => ({
      issues: state.issues.map((i) =>
        i.id === issueId ? { ...i, sections } : i
      ),
    })),
}));
