// 주제 탐색 인터뷰 — 결정 로직 (UI 비의존, 순수 함수)
//  · 교육공학 논문에서 "연구 주제 찾기"가 가장 어렵다는 현장 피드백(2026-07-04)으로 신설.
//  · 연구자의 현장(근무유형)·관심분야·개입(실험) 가능 여부·문제의식에 답하면
//    주제 문장 프레임 + 접근(양적/질적/혼합/개발) + 선배 논문·아카이브 개념 매칭 재료를 돌려준다.
//  · 양적·질적·혼합·개발 연구 사용자 모두 지원 (전공 관례: 가설은 본문에 직접 기술하지 않음).
//  · ⚠ 참고용 탐색 도구 — 최종 주제·설계는 지도교수와 상의.

import type { AlumniThesis, OccupationType } from "@/types";

export type TEAnswers = Record<string, string>;

export interface TEOption {
  value: string;
  label: string;
  hint?: string;
}

export interface TEQuestion {
  id: string;
  when?: (a: TEAnswers) => boolean;
  title: string;
  help?: string;
  options: TEOption[];
}

/** 추천 주제 문장 프레임 1건 */
export interface TETopicFrame {
  /** 주제 문장 템플릿 (그대로 복사해 다듬어 쓰는 출발점) */
  sentence: string;
  /** 접근 라벨 — 양적/질적/혼합/개발·설계 */
  approach: "양적" | "질적" | "혼합" | "개발·설계";
  /** 왜 이 방향인지 */
  rationale: string;
  /** 연구방법 찾기 마법사(researchFinder) seedKey — 상세 가이드 연결 */
  methodSeedKeys: string[];
}

export interface TEResult {
  frames: TETopicFrame[];
  /** 답 조합의 제약을 짚어주는 주의 문구 (예: 효과 검증인데 대상 접근 불가) */
  caution?: string;
  /** 선배 논문 매칭용 — 연구대상 라벨 (thesis.analysis.subjects 와 대조) */
  subjectTerms: string[];
  /** 선배 논문·아카이브 개념 매칭용 — 관심분야 키워드 */
  interestTerms: string[];
}

// ── 질문 정의 ─────────────────────────────────────────────────────────────

export const TE_QUESTIONS: TEQuestion[] = [
  {
    id: "field",
    title: "지금 어떤 현장에 계신가요? (또는 가장 접근하기 쉬운 현장)",
    help: "연구 대상을 구할 수 있는 현장이 곧 연구의 출발점입니다. 프로필의 직업유형과 달라도 괜찮아요 — 실제로 자료를 모을 수 있는 곳을 고르세요.",
    options: [
      { value: "school_k12", label: "학교 (초·중·고)", hint: "학생·교사 대상 — 수업·학급 단위 연구가 쉬움" },
      { value: "university", label: "대학·대학원", hint: "대학(원)생 대상 — 강좌·비교과 프로그램" },
      { value: "corporate", label: "기업·HRD", hint: "임직원 대상 — 연수·직무교육·이러닝" },
      { value: "public", label: "공공기관·군·평생교육", hint: "공무원·장병·성인학습자 대상" },
      { value: "none", label: "특정 현장이 없어요", hint: "문서·공개 데이터·선행연구 기반 주제로 안내" },
    ],
  },
  // ── 현장 세부 (2026-07-05 사용자 요청: "학교라면 초·중·고 중 어디인지 등 구체화") ──
  {
    id: "fieldDetail",
    when: (a) => a.field === "school_k12",
    title: "학교급이 어떻게 되시나요?",
    help: "학교급에 따라 가능한 설계(수업 시수·평가 방식)와 선행연구 지형이 크게 다릅니다.",
    options: [
      { value: "elementary", label: "초등학교", hint: "담임 체제 — 교과 융합·장기 개입 설계가 상대적으로 쉬움" },
      { value: "middle", label: "중학교", hint: "자유학기제·교과 수업 단위 설계" },
      { value: "high", label: "고등학교", hint: "입시 맥락 — 짧은 개입·비교과 활용 설계가 현실적" },
      { value: "special", label: "특수학교·특수교육", hint: "특수교육 대상 학생 — 개별화(IEP)·보조공학 맥락" },
      { value: "k12_mixed", label: "여러 학교급 / 이동 예정", hint: "학교급 공통 주제로 안내" },
    ],
  },
  {
    id: "fieldDetail",
    when: (a) => a.field === "public",
    title: "구체적으로 어떤 현장인가요?",
    help: "같은 공공 영역이라도 군·공무원 교육·평생교육은 대상 특성과 선행연구가 전혀 다릅니다.",
    options: [
      { value: "military", label: "군 (장병·간부 교육)", hint: "군 이러닝·원격교육 — 통제된 환경, 집단 단위 설계" },
      { value: "public_org", label: "공공기관·공무원 교육", hint: "직무교육·연수원 — 성인 직무 학습" },
      { value: "lifelong", label: "평생교육기관", hint: "평생학습관·도서관·복지관 — 자발적 성인학습자" },
    ],
  },
  {
    id: "fieldDetail",
    when: (a) => a.field === "corporate",
    title: "기업에서 어떤 위치에 계신가요?",
    options: [
      { value: "corp_hrd", label: "사내 HRD·교육 부서", hint: "연수 기획·운영 — 개입 설계가 상대적으로 쉬움" },
      { value: "corp_edtech", label: "교육 서비스·에듀테크 기업", hint: "제품·콘텐츠 개발 — 사용자 데이터 활용 가능" },
      { value: "corp_public", label: "공기업·공공기관 산하 기업", hint: "체계적 연수 제도 — 집합·의무교육 맥락" },
      { value: "corp_startup", label: "스타트업·중소기업", hint: "소규모·빠른 변화 — 무형식학습·OJT 중심" },
      { value: "corp_field", label: "일반 직무 현장 (교육 담당 아님)", hint: "동료·본인 경험 기반 — 설문·면담 중심" },
    ],
  },
  {
    id: "fieldDetail",
    when: (a) => a.field === "university",
    title: "대학의 어떤 현장인가요?",
    options: [
      { value: "univ_undergrad", label: "학부 수업·비교과", hint: "강좌 단위 설계·튜터링" },
      { value: "univ_grad", label: "대학원·연구실", hint: "대학원생 학습·연구 역량" },
      { value: "univ_ctl", label: "교수학습센터·교직원", hint: "교수자 지원·교육 프로그램 운영" },
    ],
  },
  {
    id: "interest",
    title: "가장 마음이 가는 관심분야는 무엇인가요?",
    help: "주제는 결국 '내가 오래 파고들 수 있는 것'이어야 합니다. 요즘 수업·업무에서 자꾸 눈이 가는 쪽을 고르세요.",
    options: [
      { value: "ai_edtech", label: "AI·에듀테크 도구 활용", hint: "AI 챗봇, 이러닝, 메타버스, 디지털 도구" },
      { value: "instructional_design", label: "교수설계·프로그램 개발", hint: "수업 모형, 교육과정, 교수전략" },
      { value: "motivation", label: "학습동기·정서·자기조절", hint: "동기, 자기효능감, 몰입, 학습지속" },
      { value: "interaction", label: "협력학습·상호작용", hint: "토론, 팀 활동, 실재감, 학습공동체" },
      { value: "hrd", label: "역량·전이·수행 (기업교육)", hint: "직무역량, 학습전이, 리더십, 무형식학습" },
      { value: "media", label: "콘텐츠·미디어·UX", hint: "영상, 게이미피케이션, 사용성" },
      { value: "evaluation", label: "평가·측정·학습데이터", hint: "척도 개발, 피드백, 학습분석" },
    ],
  },
  // ── 관심분야 세부 (2026-07-05 사용자 요청) ──
  {
    id: "interestDetail",
    when: (a) => a.interest === "ai_edtech",
    title: "AI·에듀테크 중에서도 특히 끌리는 쪽은?",
    options: [
      { value: "gen_ai", label: "생성형 AI·챗봇", hint: "ChatGPT 활용 수업, AI 튜터, 프롬프트 활용" },
      { value: "immersive", label: "메타버스·VR/AR", hint: "몰입형 학습 환경" },
      { value: "platform", label: "이러닝·LMS 플랫폼", hint: "온라인·원격수업 설계와 운영" },
      { value: "ai_literacy", label: "디지털·AI 리터러시", hint: "AI 윤리, 디지털 역량 교육" },
      { value: "broad_ai", label: "아직 하나로 못 좁혔어요", hint: "AI·에듀테크 전반으로 추천" },
    ],
  },
  {
    id: "interestDetail",
    when: (a) => a.interest === "instructional_design",
    title: "교수설계 중에서도 특히 끌리는 쪽은?",
    options: [
      { value: "id_model", label: "수업 모형·교수전략", hint: "특정 모형 적용·개선" },
      { value: "id_curriculum", label: "교육과정·프로그램 설계", hint: "과정 개발과 편성" },
      { value: "id_flipped", label: "플립러닝·블렌디드", hint: "온·오프 결합 설계" },
      { value: "broad_id", label: "아직 하나로 못 좁혔어요", hint: "교수설계 전반으로 추천" },
    ],
  },
  {
    id: "interestDetail",
    when: (a) => a.interest === "motivation",
    title: "동기·정서 중에서도 특히 끌리는 쪽은?",
    options: [
      { value: "mo_motiv", label: "학습동기·흥미", hint: "동기 유발 전략, ARCS 등" },
      { value: "mo_selfreg", label: "자기조절·자기주도학습", hint: "학습 전략·습관" },
      { value: "mo_efficacy", label: "자기효능감·학업 정서", hint: "효능감, 불안, 그릿" },
      { value: "mo_engage", label: "몰입·학습지속", hint: "학습몰입, 중도탈락 방지" },
      { value: "broad_mo", label: "아직 하나로 못 좁혔어요", hint: "동기·정서 전반으로 추천" },
    ],
  },
  {
    id: "interestDetail",
    when: (a) => a.interest === "interaction",
    title: "협력·상호작용 중에서도 특히 끌리는 쪽은?",
    options: [
      { value: "in_collab", label: "협력학습·팀 활동", hint: "팀 프로젝트, 협동학습 구조" },
      { value: "in_presence", label: "실재감·온라인 상호작용", hint: "교수·사회적 실재감" },
      { value: "in_community", label: "학습공동체·커뮤니티", hint: "실천공동체, 또래 네트워크" },
      { value: "in_discussion", label: "토론·피드백", hint: "토론 설계, 동료 피드백" },
      { value: "broad_in", label: "아직 하나로 못 좁혔어요", hint: "상호작용 전반으로 추천" },
    ],
  },
  {
    id: "interestDetail",
    when: (a) => a.interest === "hrd",
    title: "HRD 중에서도 특히 끌리는 쪽은?",
    options: [
      { value: "hr_transfer", label: "학습전이·현업적용", hint: "교육 효과가 현장으로 이어지는가" },
      { value: "hr_competency", label: "역량 모델링·진단", hint: "직무역량 정의와 측정" },
      { value: "hr_leadership", label: "리더십·경력개발", hint: "리더 육성, 경력 전환" },
      { value: "hr_informal", label: "무형식학습·조직학습", hint: "일터학습, 지식공유" },
      { value: "broad_hr", label: "아직 하나로 못 좁혔어요", hint: "HRD 전반으로 추천" },
    ],
  },
  {
    id: "interestDetail",
    when: (a) => a.interest === "media",
    title: "콘텐츠·미디어 중에서도 특히 끌리는 쪽은?",
    options: [
      { value: "me_content", label: "영상·콘텐츠 설계", hint: "마이크로러닝, 영상 강의 설계" },
      { value: "me_game", label: "게이미피케이션·게임기반학습", hint: "게임 요소·기능성 게임" },
      { value: "me_ux", label: "학습 UX·사용성", hint: "인터페이스, 학습자 경험" },
      { value: "broad_me", label: "아직 하나로 못 좁혔어요", hint: "미디어 전반으로 추천" },
    ],
  },
  {
    id: "interestDetail",
    when: (a) => a.interest === "evaluation",
    title: "평가·데이터 중에서도 특히 끌리는 쪽은?",
    options: [
      { value: "ev_assess", label: "평가 설계·루브릭", hint: "과정중심평가, 수행평가" },
      { value: "ev_scale", label: "척도·측정도구 개발", hint: "검사 개발과 타당화" },
      { value: "ev_analytics", label: "학습분석·데이터", hint: "LMS 로그, 대시보드" },
      { value: "ev_feedback", label: "피드백", hint: "피드백 설계와 효과" },
      { value: "broad_ev", label: "아직 하나로 못 좁혔어요", hint: "평가 전반으로 추천" },
    ],
  },
  {
    id: "intervention",
    when: (a) => a.field !== "none",
    title: "연구 대상에게 직접 '개입'(수업·프로그램 운영)할 수 있나요?",
    help: "실험(효과 검증) 연구가 가능한지를 가르는 가장 중요한 질문입니다. 내가 수업이나 연수를 직접 운영할 수 있으면 개입 가능입니다.",
    options: [
      { value: "can_intervene", label: "네 — 내가 수업·프로그램을 직접 운영할 수 있어요", hint: "실험·준실험, 프로그램 개발 연구 가능" },
      { value: "survey_only", label: "만나거나 설문은 가능하지만, 개입은 어려워요", hint: "설문조사·면담(질적) 연구 가능" },
      { value: "no_access", label: "대상을 직접 만나기 어려워요", hint: "문서·공개 데이터·선행연구 종합" },
    ],
  },
  {
    id: "problem",
    title: "지금 품고 있는 문제의식에 가장 가까운 것은?",
    help: "좋은 주제는 '궁금함'에서 나옵니다. 평소 현장에서 느끼는 답답함·궁금함이 어느 쪽인지 고르세요.",
    options: [
      { value: "effect", label: "이 방법(도구)이 정말 효과가 있는지 확인하고 싶다", hint: "효과 검증형 — 양적 연구로 이어짐" },
      { value: "understand", label: "왜 이런 일이 벌어지는지 깊이 이해하고 싶다", hint: "현상 이해형 — 질적 연구로 이어짐" },
      { value: "build", label: "더 나은 프로그램·도구를 직접 만들고 싶다", hint: "개발형 — 개발·설계 연구로 이어짐" },
      { value: "status", label: "현황·인식·요구를 파악해 시사점을 내고 싶다", hint: "실태 파악형 — 조사 연구로 이어짐" },
    ],
  },
  {
    id: "scale",
    when: (a) => a.field !== "none" && a.intervention !== "no_access" && a.problem !== "understand",
    title: "자료를 모은다면 어느 정도 인원이 가능할까요?",
    help: "통계 분석(집단 비교·상관)은 보통 집단당 20~30명 이상이 안정적입니다. 인원이 적으면 심층 면담 중심 설계가 유리합니다.",
    options: [
      { value: "large", label: "30명 이상 모을 수 있어요", hint: "양적 분석에 무리 없음" },
      { value: "small", label: "10명 안팎의 소수만 가능해요", hint: "질적·혼합 설계가 유리" },
      { value: "unsure", label: "아직 잘 모르겠어요", hint: "두 방향 모두 열어두고 안내" },
    ],
  },
];

export function teNextQuestion(a: TEAnswers): TEQuestion | null {
  for (const q of TE_QUESTIONS) {
    if (q.when && !q.when(a)) continue;
    if (a[q.id] == null) return q;
  }
  return null;
}

export function teActiveQuestions(a: TEAnswers): TEQuestion[] {
  return TE_QUESTIONS.filter((q) => !q.when || q.when(a));
}

// ── 매칭 사전 ─────────────────────────────────────────────────────────────

/** 현장 → 선배 논문 연구대상 라벨 (extract-thesis-analysis SUBJECT_RULES 와 동일 어휘) */
export const TE_FIELD_SUBJECTS: Record<string, string[]> = {
  school_k12: ["초등학생", "중학생", "고등학생", "교사", "유아", "학부모"],
  university: ["대학생", "대학원생"],
  corporate: ["기업 구성원", "성인학습자"],
  public: ["군인", "성인학습자", "교사"],
  none: [],
};

/** 현장 → 주제 문장에 들어갈 대표 대상 표현 */
const TE_FIELD_TARGET: Record<string, string> = {
  school_k12: "초·중·고 학생(또는 교사)",
  university: "대학(원)생",
  corporate: "기업 구성원",
  public: "공공기관·군 학습자",
  none: "국내 선행연구",
};

/** 관심분야 → 키워드 (선배 논문 제목·키워드, 아카이브 개념명 매칭) */
export const TE_INTEREST_TERMS: Record<string, string[]> = {
  ai_edtech: ["AI", "인공지능", "챗봇", "이러닝", "e-러닝", "온라인", "원격", "에듀테크", "디지털", "메타버스", "스마트", "모바일", "플립", "블렌디드"],
  instructional_design: ["교수설계", "수업설계", "프로그램 개발", "교육과정", "수업 모형", "교수전략", "설계원리", "교수체제"],
  motivation: ["동기", "자기조절", "자기효능", "몰입", "정서", "흥미", "그릿", "학습지속", "자기주도"],
  interaction: ["협력", "상호작용", "커뮤니티", "토론", "팀", "실재감", "소셜", "협동학습", "학습공동체"],
  hrd: ["역량", "전이", "직무", "수행", "경력", "리더십", "HRD", "기업교육", "직업훈련", "무형식학습", "조직"],
  media: ["콘텐츠", "미디어", "영상", "UX", "사용성", "인터페이스", "게이미피케이션", "게임", "가상현실", "증강현실"],
  evaluation: ["평가", "측정", "척도", "진단", "피드백", "학습분석", "데이터", "루브릭"],
};

/** 관심분야 → 주제 문장에 들어갈 소재 표현 */
const TE_INTEREST_TOPIC: Record<string, string> = {
  ai_edtech: "AI·에듀테크 도구 활용",
  instructional_design: "교수설계 전략(수업 모형)",
  motivation: "학습동기·자기조절 지원 전략",
  interaction: "협력학습·상호작용 설계",
  hrd: "역량 개발·학습전이 지원",
  media: "학습 콘텐츠·미디어 설계",
  evaluation: "평가·피드백 설계",
};

/** 현장 세부 → 연구대상 라벨·주제 문장 대상 표현 (QA 2026-07-05 구체화) */
const TE_FIELD_DETAIL_META: Record<string, { subjects: string[]; target: string }> = {
  elementary: { subjects: ["초등학생", "교사"], target: "초등학생" },
  middle: { subjects: ["중학생", "교사"], target: "중학생" },
  high: { subjects: ["고등학생", "교사"], target: "고등학생" },
  special: { subjects: ["장애 학습자", "교사"], target: "특수교육 대상 학생" },
  k12_mixed: { subjects: ["초등학생", "중학생", "고등학생", "교사"], target: "초·중·고 학생" },
  military: { subjects: ["군인"], target: "군 장병" },
  public_org: { subjects: ["성인학습자"], target: "공공기관 구성원(공무원)" },
  lifelong: { subjects: ["성인학습자", "학부모"], target: "평생교육 성인학습자" },
  corp_hrd: { subjects: ["기업 구성원", "성인학습자"], target: "기업 구성원(사내 교육 대상자)" },
  corp_edtech: { subjects: ["기업 구성원", "성인학습자"], target: "교육 서비스 사용자(학습자)" },
  corp_public: { subjects: ["기업 구성원", "성인학습자"], target: "공기업 구성원" },
  corp_startup: { subjects: ["기업 구성원", "성인학습자"], target: "스타트업(중소기업) 구성원" },
  corp_field: { subjects: ["기업 구성원", "성인학습자"], target: "동료 직무 종사자" },
  univ_undergrad: { subjects: ["대학생"], target: "대학생(학부생)" },
  univ_grad: { subjects: ["대학원생"], target: "대학원생" },
  univ_ctl: { subjects: ["대학생", "대학원생", "교사"], target: "대학 교수자·학습자" },
};

/** 관심 세부 → 주제 소재 표현·정밀 키워드 (broad_* 는 상위 분야 그대로) */
const TE_INTEREST_DETAIL_META: Record<string, { topic: string; terms: string[] }> = {
  gen_ai: { topic: "생성형 AI(챗봇) 활용", terms: ["생성형", "챗봇", "ChatGPT", "GPT", "AI 튜터", "프롬프트"] },
  immersive: { topic: "메타버스·VR/AR 기반 학습", terms: ["메타버스", "VR", "AR", "가상현실", "증강현실", "몰입형"] },
  platform: { topic: "이러닝(LMS) 기반 수업", terms: ["이러닝", "LMS", "온라인", "원격", "e-러닝", "플랫폼"] },
  ai_literacy: { topic: "디지털·AI 리터러시 교육", terms: ["리터러시", "AI 윤리", "디지털 역량", "정보활용"] },
  id_model: { topic: "수업 모형·교수전략 적용", terms: ["수업 모형", "교수전략", "교수설계", "설계원리"] },
  id_curriculum: { topic: "교육과정·프로그램 설계", terms: ["교육과정", "프로그램 개발", "과정 설계"] },
  id_flipped: { topic: "플립러닝(블렌디드) 수업", terms: ["플립", "거꾸로", "블렌디드", "혼합수업"] },
  mo_motiv: { topic: "학습동기 지원 전략", terms: ["동기", "흥미", "ARCS"] },
  mo_selfreg: { topic: "자기조절학습 지원 전략", terms: ["자기조절", "자기주도", "학습전략"] },
  mo_efficacy: { topic: "자기효능감·학업 정서 지원", terms: ["자기효능", "효능감", "정서", "불안", "그릿"] },
  mo_engage: { topic: "학습몰입·지속 지원 전략", terms: ["몰입", "학습지속", "중도탈락", "참여"] },
  in_collab: { topic: "협력학습 설계", terms: ["협력", "협동학습", "팀", "팀 기반"] },
  in_presence: { topic: "실재감 기반 온라인 상호작용 설계", terms: ["실재감", "상호작용", "교수실재감", "사회적 실재감"] },
  in_community: { topic: "학습공동체 운영", terms: ["학습공동체", "커뮤니티", "실천공동체"] },
  in_discussion: { topic: "토론·동료 피드백 설계", terms: ["토론", "피드백", "동료평가"] },
  hr_transfer: { topic: "학습전이 촉진 전략", terms: ["전이", "현업적용", "학습전이"] },
  hr_competency: { topic: "직무역량 진단·개발", terms: ["역량", "역량모델", "직무"] },
  hr_leadership: { topic: "리더십 개발 프로그램", terms: ["리더십", "경력", "리더"] },
  hr_informal: { topic: "무형식학습 지원", terms: ["무형식학습", "일터학습", "조직학습", "지식공유"] },
  me_content: { topic: "학습 영상·콘텐츠 설계", terms: ["콘텐츠", "영상", "마이크로러닝"] },
  me_game: { topic: "게이미피케이션 설계", terms: ["게이미피케이션", "게임", "기능성 게임"] },
  me_ux: { topic: "학습 UX·사용성 개선", terms: ["UX", "사용성", "인터페이스", "학습자 경험"] },
  ev_assess: { topic: "과정중심 평가 설계", terms: ["평가", "루브릭", "수행평가", "과정중심"] },
  ev_scale: { topic: "측정도구(척도) 개발", terms: ["척도", "측정", "검사", "타당화"] },
  ev_analytics: { topic: "학습분석 기반 지원", terms: ["학습분석", "데이터", "대시보드", "로그"] },
  ev_feedback: { topic: "피드백 설계", terms: ["피드백"] },
};

/** 답변 요약 라벨 (저장·비교 화면용) — "현장 · 관심 · 개입 · 문제의식" */
export function teAnswersSummary(a: TEAnswers): string {
  const parts: string[] = [];
  for (const q of TE_QUESTIONS) {
    if (q.when && !q.when(a)) continue;
    const v = a[q.id];
    if (!v) continue;
    const opt = q.options.find((o) => o.value === v);
    if (opt) parts.push(opt.label);
  }
  return parts.join(" · ");
}

/** 프로필 직업유형 → 추천 현장 프리셀렉트 힌트 */
export function teFieldFromOccupation(occ?: OccupationType): string | null {
  if (!occ) return null;
  switch (occ) {
    case "teacher": return "school_k12";
    case "corporate": return "corporate";
    case "public": return "public";
    case "researcher": return "university";
    default: return null;
  }
}

// ── 추천 로직 ─────────────────────────────────────────────────────────────

export function teRecommend(a: TEAnswers): TEResult | null {
  if (teNextQuestion(a) != null) return null;

  // QA 2026-07-05: 세부 답변이 있으면 대상·소재·매칭 키워드를 한 단계 구체화
  const fieldDetail = a.fieldDetail ? TE_FIELD_DETAIL_META[a.fieldDetail] : undefined;
  const interestDetail = a.interestDetail ? TE_INTEREST_DETAIL_META[a.interestDetail] : undefined;
  const target = fieldDetail?.target ?? TE_FIELD_TARGET[a.field] ?? "연구 대상";
  const topic = interestDetail?.topic ?? TE_INTEREST_TOPIC[a.interest] ?? "관심 주제";
  const subjectTerms = fieldDetail?.subjects ?? TE_FIELD_SUBJECTS[a.field] ?? [];
  const interestTerms = [
    ...(interestDetail?.terms ?? []),
    ...(TE_INTEREST_TERMS[a.interest] ?? []),
  ];
  const smallSample = a.scale === "small";
  const noField = a.field === "none";
  const intervention = noField ? "no_access" : a.intervention;

  const frames: TETopicFrame[] = [];
  let caution: string | undefined;

  const RM = (slug: string) => `research-method:${slug}`;

  if (a.problem === "effect") {
    if (intervention === "can_intervene") {
      frames.push({
        sentence: `${topic}이(가) ${target}의 학습성과(학업성취·만족도 등)에 미치는 효과`,
        approach: "양적",
        rationale: "직접 수업·프로그램을 운영할 수 있으므로 실험·준실험 설계로 효과를 검증할 수 있습니다. 기존 학급(집단)을 쓰면 준실험 + 사전점수 보정(ANCOVA)이 우리 전공에서 가장 흔한 형태입니다.",
        methodSeedKeys: [RM("quasi-experimental"), RM("experimental")],
      });
      frames.push({
        sentence: `${topic} 수업에서 ${target}이 겪는 변화 과정 — 효과 검증과 경험 분석을 결합한 혼합연구`,
        approach: "혼합",
        rationale: "수치로 효과를 확인한 뒤 면담으로 '왜 그런 결과가 나왔는지'를 설명하면(설명적 순차) 논의가 한층 두터워집니다.",
        methodSeedKeys: [RM("explanatory-sequential")],
      });
      if (smallSample) {
        caution = "인원이 10명 안팎이면 집단 비교 통계가 불안정합니다. 단일집단 사전-사후 + 심층 면담(혼합)으로 좁히거나, 인원 확보 방안을 먼저 지도교수와 상의하세요.";
      }
    } else if (intervention === "survey_only") {
      frames.push({
        sentence: `${target}의 ${topic} 수준과 학습성과(참여·만족·성취)의 관계`,
        approach: "양적",
        rationale: "개입은 어렵지만 설문이 가능하므로, 변수 간 관계·예측을 보는 조사연구(상관·회귀)가 현실적입니다. '효과'라는 단어 대신 '관계·영향 요인'으로 문제를 다듬으면 설계와 맞아떨어집니다.",
        methodSeedKeys: [RM("survey")],
      });
      caution = "직접 개입 없이 '효과'를 단정하기는 어렵습니다. 인과가 아닌 '관계·예측'으로 연구문제를 표현하는 것이 심사에서 안전합니다.";
    } else {
      frames.push({
        sentence: `${topic}의 효과에 대한 국내 연구 동향 분석(또는 메타분석)`,
        approach: "양적",
        rationale: "대상 접근이 어려우면 이미 발표된 연구들을 종합하는 것이 대안입니다. 축적된 효과 연구가 충분한 주제라면 메타분석, 아니라면 체계적 동향 분석이 적합합니다.",
        methodSeedKeys: [RM("meta-analysis")],
      });
      caution = "메타분석은 수집 가능한 선행연구 편수(보통 20편 이상)가 관건입니다. 주제를 정하기 전에 선행연구 검색부터 해보세요 — 문헌 매트릭스가 이 단계의 도구입니다.";
    }
  }

  if (a.problem === "understand") {
    frames.push({
      sentence: `${target}의 ${topic} 경험과 그 의미에 대한 질적 사례연구`,
      approach: "질적",
      rationale: "'왜'와 '어떻게'를 파고드는 문제의식은 소수 참여자를 깊이 만나는 질적 연구와 맞습니다. 경계가 뚜렷한 수업·프로그램이 있으면 사례연구, 체험의 본질이 초점이면 현상학적 연구입니다.",
      methodSeedKeys: [RM("case-study"), RM("phenomenology")],
    });
    if (intervention !== "no_access") {
      frames.push({
        sentence: `${target}의 ${topic} 인식 조사와 심층 면담을 결합한 혼합연구`,
        approach: "혼합",
        rationale: "설문으로 전반적 경향을 그리고 면담으로 깊이를 더하면, 탐색과 확인을 한 연구에서 해낼 수 있습니다.",
        methodSeedKeys: [RM("convergent-parallel")],
      });
    } else {
      frames.push({
        sentence: `${topic} 관련 문서·담론(교육과정·정책 문서, 온라인 커뮤니티 게시글 등)에 대한 질적 내용분석`,
        approach: "질적",
        rationale: "대상을 직접 만나기 어려워도 공개된 문서·게시글은 훌륭한 질적 자료입니다.",
        methodSeedKeys: [RM("qualitative-content-analysis")],
      });
    }
  }

  if (a.problem === "build") {
    if (intervention === "can_intervene") {
      frames.push({
        sentence: `${target}을 위한 ${topic} 기반 교육 프로그램 개발 (개발 → 현장 적용 → 개선)`,
        approach: "개발·설계",
        rationale: "직접 운영 가능한 현장이 있으므로, 개발한 프로그램을 실제로 적용하며 반복 개선하는 설계기반연구(DBR)나 프로그램 개발·타당화가 적합합니다.",
        methodSeedKeys: [RM("design-based-research"), RM("program-development")],
      });
      frames.push({
        sentence: `${topic} 기반 프로그램의 개발과 효과 검증을 결합한 연구`,
        approach: "혼합",
        rationale: "개발 연구에 효과 검증(사전-사후)을 더하면 '만들었다'에서 '효과도 확인했다'로 기여가 커집니다. 다만 분량이 커지므로 범위는 지도교수와 조율하세요.",
        methodSeedKeys: [RM("program-development"), RM("quasi-experimental")],
      });
    } else {
      frames.push({
        sentence: `${topic}을 위한 설계원리(또는 척도) 개발 — 문헌 고찰과 전문가 검토(델파이) 기반`,
        approach: "개발·설계",
        rationale: "현장 적용이 어려우면, 선행연구에서 설계원리를 도출하고 전문가 델파이로 타당화하는 경로가 현실적입니다. 측정이 관심이면 척도 개발도 같은 구조입니다.",
        methodSeedKeys: [RM("delphi"), RM("scale-development")],
      });
    }
  }

  if (a.problem === "status") {
    if (intervention === "no_access") {
      frames.push({
        sentence: `${topic} 관련 국내 연구 동향 분석 (연도·대상·방법·변인 중심)`,
        approach: "양적",
        rationale: "대상 접근이 어려우면 발표된 연구 자체를 자료로 삼는 동향 분석이 적합합니다. 우리 전공 선배들도 많이 택한 안전한 구조입니다.",
        methodSeedKeys: [RM("meta-analysis")],
      });
    } else {
      frames.push({
        sentence: `${target}의 ${topic}에 대한 인식과 요구 분석`,
        approach: "양적",
        rationale: "현황·요구 파악은 설문조사연구의 정석입니다. 요구분석(중요도-실행도 분석 등)을 붙이면 시사점이 구체적으로 나옵니다.",
        methodSeedKeys: [RM("survey")],
      });
      frames.push({
        sentence: `${target}의 ${topic} 실태 조사와 개선 방향 도출을 위한 혼합연구`,
        approach: "혼합",
        rationale: "설문으로 실태를 그린 뒤 소수 면담으로 개선 방향을 구체화하면, 실태 '파악'을 넘어 '제언'까지 근거가 생깁니다.",
        methodSeedKeys: [RM("explanatory-sequential")],
      });
    }
    if (smallSample && intervention !== "no_access") {
      caution = "인원이 적으면 실태 일반화가 어렵습니다. '요구 분석'에 초점을 두고 면담 비중을 키우는 편이 안전합니다.";
    }
  }

  return { frames, caution, subjectTerms, interestTerms };
}

// ── 선배 논문·아카이브 개념 매칭 ──────────────────────────────────────────

export interface TEThesisMatch {
  thesis: AlumniThesis;
  score: number;
  /** 매칭 근거 (예: "대상: 초등학생", "키워드: 자기효능감") */
  reasons: string[];
}

/** 관심 키워드·연구대상으로 선배 논문 점수화 — 상위 매칭 반환 */
export function teMatchTheses(
  theses: AlumniThesis[],
  result: TEResult,
  limit = 6,
): TEThesisMatch[] {
  const matches: TEThesisMatch[] = [];
  for (const t of theses) {
    let score = 0;
    const reasons: string[] = [];
    const title = t.title ?? "";
    const keywords = t.keywords ?? [];
    const subjects = t.analysis?.subjects ?? [];

    for (const term of result.interestTerms) {
      const lower = term.toLowerCase();
      if (keywords.some((k) => k.toLowerCase().includes(lower))) {
        score += 3;
        reasons.push(`키워드: ${term}`);
      } else if (title.toLowerCase().includes(lower)) {
        score += 2;
        reasons.push(`제목: ${term}`);
      }
    }
    for (const s of result.subjectTerms) {
      if (subjects.includes(s)) {
        score += 2;
        reasons.push(`대상: ${s}`);
      }
    }
    if (score > 0) matches.push({ thesis: t, score, reasons: reasons.slice(0, 3) });
  }
  return matches
    .sort(
      (a, b) =>
        b.score - a.score ||
        (b.thesis.awardedYearMonth || "").localeCompare(a.thesis.awardedYearMonth || ""),
    )
    .slice(0, limit);
}

export interface TEConceptLike {
  id: string;
  name: string;
  altNames?: string[];
  tags?: string[];
}

/** 관심 키워드로 아카이브 개념 매칭 */
export function teMatchConcepts<T extends TEConceptLike>(
  concepts: T[],
  result: TEResult,
  limit = 8,
): T[] {
  const scored: { c: T; score: number }[] = [];
  for (const c of concepts) {
    const hay = [c.name, ...(c.altNames ?? []), ...(c.tags ?? [])].join(" ").toLowerCase();
    let score = 0;
    for (const term of result.interestTerms) {
      if (hay.includes(term.toLowerCase())) score += 1;
    }
    if (score > 0) scored.push({ c, score });
  }
  return scored
    .sort((a, b) => b.score - a.score || a.c.name.length - b.c.name.length)
    .slice(0, limit)
    .map((s) => s.c);
}
