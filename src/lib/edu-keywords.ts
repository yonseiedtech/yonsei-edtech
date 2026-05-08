/**
 * 교육공학 주요 키워드 사전 정의 (Sprint 67-E)
 *
 * 회원이 마이페이지 프로필에서 관심 분야 키워드를 선택할 때 추천되는 카탈로그.
 * 카테고리 별로 분류되어 있어 UI 그룹핑에 활용 가능.
 *
 * 사용자는 이 카탈로그에서 선택할 수 있고, 카탈로그에 없는 키워드도 추가 가능.
 */

export interface EduKeywordCategory {
  label: string;
  keywords: string[];
}

export const EDU_TECH_KEYWORD_CATEGORIES: EduKeywordCategory[] = [
  {
    label: "AI·지능정보 교육",
    keywords: [
      "AI 교육",
      "생성형 AI",
      "AI 리터러시",
      "AI 융합 교육",
      "ChatGPT 활용",
      "AI 에이전트",
      "AI 디지털 교과서",
    ],
  },
  {
    label: "학습분석·데이터",
    keywords: [
      "학습분석",
      "교육 데이터마이닝",
      "Learning Analytics",
      "예측 모델링",
      "학습자 프로파일링",
      "토픽 모델링",
    ],
  },
  {
    label: "교수설계·수업설계",
    keywords: [
      "교수설계",
      "수업 설계",
      "ADDIE",
      "마이크로러닝",
      "역량기반학습",
      "백워드 설계",
      "맞춤형 학습",
    ],
  },
  {
    label: "디지털 도구·플랫폼",
    keywords: [
      "에듀테크",
      "디지털 리터러시",
      "메타버스 교육",
      "VR/AR 교육",
      "XR 시뮬레이션",
      "LMS",
      "교육용 챗봇",
    ],
  },
  {
    label: "학습 이론·전략",
    keywords: [
      "자기조절학습",
      "협력학습",
      "문제기반학습(PBL)",
      "프로젝트기반학습",
      "탐구기반학습",
      "역할극·시뮬레이션",
      "자기주도 학습",
    ],
  },
  {
    label: "평가·측정",
    keywords: [
      "형성평가",
      "수행평가",
      "AI 자동채점",
      "서술형 평가",
      "역량 평가",
      "포트폴리오 평가",
    ],
  },
  {
    label: "특수·성인·원격교육",
    keywords: [
      "특수교육공학",
      "성인교육",
      "원격교육",
      "MOOC",
      "K-MOOC",
      "고등교육 혁신",
      "직업교육",
    ],
  },
  {
    label: "교사교육·전문성",
    keywords: [
      "교사 전문성",
      "예비교사 교육",
      "수업컨설팅",
      "교사 리터러시",
      "교사 학습공동체",
    ],
  },
  {
    label: "학습과학·인지",
    keywords: [
      "학습과학",
      "인지부하",
      "메타인지",
      "동기 이론",
      "자기효능감",
      "정서·사회적 학습(SEL)",
    ],
  },
  {
    label: "트렌드·이슈",
    keywords: [
      "유니버설 디자인",
      "포용교육",
      "디지털 시민성",
      "융합 교육",
      "STEAM",
      "윤리적 AI",
      "디지털 격차",
    ],
  },
];

/** 평탄화된 키워드 전체 (검색용) */
export const EDU_TECH_KEYWORDS: string[] = EDU_TECH_KEYWORD_CATEGORIES.flatMap(
  (c) => c.keywords,
);

/** 키워드 → 카테고리 라벨 역매핑 */
export const KEYWORD_TO_CATEGORY: Record<string, string> =
  EDU_TECH_KEYWORD_CATEGORIES.reduce(
    (acc, cat) => {
      for (const k of cat.keywords) acc[k] = cat.label;
      return acc;
    },
    {} as Record<string, string>,
  );
