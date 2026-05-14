"use client";

/**
 * 운영 콘솔 — 2026 춘계학술대회 시간표 일괄 등록 (one-time admin tool)
 *
 * 활동 ID: 4WMIvSwobAIrqT4Nm5Ks (대외학술대회: 2026 한국교육공학회 춘계학술대회)
 * 일자: 2026-05-09 (이화여자대학교 학관)
 * 모든 트랙별 세부 세션 + 포스터 세션 A (23개) hardcode.
 * 사용자가 직접 이미지를 분석해서 등록한 데이터.
 */

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Calendar, Check } from "lucide-react";
import AuthGuard from "@/features/auth/AuthGuard";
import { activitiesApi, conferenceProgramsApi } from "@/lib/bkend";
import { Button } from "@/components/ui/button";
import EmptyState from "@/components/ui/empty-state";
import ConsolePageHeader from "@/components/admin/ConsolePageHeader";
import type { ConferenceDay, ConferenceProgram, ConferenceSession } from "@/types";

const ACTIVITY_ID = "4WMIvSwobAIrqT4Nm5Ks";
const DATE = "2026-05-09";
const VENUE = "이화여자대학교 학관";

interface SessionSeed {
  startTime: string;
  endTime: string;
  category: ConferenceSession["category"];
  track?: string;
  title: string;
  speakers?: string[];
  affiliation?: string;
  location?: string;
  abstract?: string;
}

function uid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

// ───────────────────────────────────────────────────────────────────
// 시간표 데이터 (이미지 기반 hardcode)
// ───────────────────────────────────────────────────────────────────

const TRACK_INFO: Record<string, { room: string; theme: string }> = {
  A: { room: "409호", theme: "맞춤형학습" },
  B: { room: "410호", theme: "교수설계" },
  C: { room: "412호", theme: "AI학습분석" },
  D: { room: "413호", theme: "AI디지털교육" },
  E: { room: "551호", theme: "AI기반교육" },
  F: { room: "553호", theme: "기관" },
  G: { room: "514호", theme: "AI융합교육" },
};

function trackLabel(t: string) {
  const info = TRACK_INFO[t];
  return info ? `${t} 트랙 ${info.room} (${info.theme})` : t;
}

// 4개 SESSION × 7 트랙 — 각 트랙당 1~3개 발표 (이미지 기반)
type SubSession = { title: string; speakers: string[]; affiliation?: string };
type TrackBlock = {
  track: "A" | "B" | "C" | "D" | "E" | "F" | "G";
  chair: string;
  papers: SubSession[];
};

// SESSION 01 (10:00–11:00)
const S1: TrackBlock[] = [
  {
    track: "A",
    chair: "김혜준(이화여대)",
    papers: [
      {
        title: "SW비전공 대학생의 생성형 AI활용 수업 효과 검증: 대응표본 분석을 통한 AI역량변화와 군집분석을 통한 학습자의 유형 탐색",
        speakers: ["신지원"],
        affiliation: "국민대",
      },
      {
        title: "AI 기반 영어학습 도구의 운영 현황과 교육적 효과 및 활용 실태 탐색: EBSe AI 펭톡 사례 연구",
        speakers: ["정한호", "정재흥", "안나현", "안성식", "장민성", "이나리", "기유진"],
        affiliation: "총신대 / 경기도교육연구원 / 서울위례초 / EBS",
      },
      {
        title: "AI 기반 적응형 수학 학습 시스템의 교수설계 구조 분석: AI-CATS 사례 연구",
        speakers: ["지경선", "이휘재"],
        affiliation: "차의과학대 / 연세대",
      },
    ],
  },
  {
    track: "B",
    chair: "한송이(서울대)",
    papers: [
      {
        title: "생성형 AI 활용 수업에서 학습자 의사결정 역량 강화를 위한 과제 설계 프레임워크 개발",
        speakers: ["정예일", "정경옥"],
        affiliation: "Indiana University Bloomington / 서울대",
      },
      {
        title: "AI 전환기에서의 엔지니어 잡크래프팅: 학과 교수설계에 대한 시사점",
        speakers: ["장경원", "전동진", "박상언"],
        affiliation: "경기대",
      },
      {
        title: "교수설계 원리 기반 교수자료 생성을 위한 AI 시스템 설계 및 개발: 한의학 교육 사례",
        speakers: ["임철일", "고준보", "라희택", "변규리", "권혜성"],
        affiliation: "서울대",
      },
    ],
  },
  {
    track: "C",
    chair: "윤미현(중앙대)",
    papers: [
      {
        title: "컴퓨터 지원 협력학습에서 AI 기반 학습분석 연구의 동향 분석: BERT 토픽모델링을 중심으로",
        speakers: ["이주원", "전효정", "김주람", "임규연"],
        affiliation: "이화여대",
      },
      {
        title: "라이프로깅 데이터 해석에서 인간과 AI의 차이 분석: 포토보이스 기반 비교 연구",
        speakers: ["소현섭", "김도윤", "윤미현"],
        affiliation: "중앙대",
      },
    ],
  },
  {
    track: "D",
    chair: "조연직(전남대)",
    papers: [
      {
        title: "교육 프로그램 및 테크놀로지의 통합 설계를 위한 교수체제설계 모형 개선 연구",
        speakers: ["김준서", "조애영", "이규민", "임철일", "한도희"],
        affiliation: "서울대",
      },
      {
        title: "보건의료 교육에서 협력형 확장현실(XR) 시뮬레이션의 효과성 메타분석",
        speakers: ["조연직", "이현우", "최하람", "류지헌"],
        affiliation: "전남대",
      },
      {
        title: "초등 예비교원을 위한 디지털 교육 수업 모형 개발",
        speakers: ["고보경", "정경옥"],
        affiliation: "서울대",
      },
    ],
  },
  {
    track: "E",
    chair: "임지영(부산교대)",
    papers: [
      {
        title: "인간-AI 협업에서 대학생의 관계적 감수성 개발 및 타당화",
        speakers: ["임지영", "한승연"],
        affiliation: "부산교대 / 한양사이버대",
      },
      {
        title: "AI는 맥락을 강화하고, 인간은 맥락을 해체한다: 설계와 발생 사이에서 교육공학을 다시 묻다",
        speakers: ["홍영일"],
        affiliation: "서울대",
      },
      {
        title: "ChatGPT 활용 사례기반 문제해결에서 대학생의 인지적 참여 탐색",
        speakers: ["흥나연", "조일현"],
        affiliation: "이화여대",
      },
    ],
  },
  {
    track: "F",
    chair: "조규복(KERIS)",
    papers: [
      {
        title: "Reducing Analytics Capacity Gaps via Transfer Learning: Portability of Graduation Risk Models From Selective to Non-Selective Universities",
        speakers: ["Takeshi Yanagiura"],
        affiliation: "University of Tsukuba",
      },
      {
        title: "Transforming Music Education through ICT in Japan: Toward Sustainable and Inclusive Creative Learning",
        speakers: ["Lisa Tokie", "Noriko Tokie"],
        affiliation: "Odawara Junior College / Joetsu University of Education",
      },
      {
        title: "Developing AI Literacy Through Hands-On Machine Learning: A Classroom Practice with University Students",
        speakers: ["Hiroko Kanoh"],
        affiliation: "Yamagata University",
      },
    ],
  },
  {
    track: "G",
    chair: "김동심(한신대)",
    papers: [
      {
        title: "진로 기반 AI 융합 교육이 초등학생의 진로 인식에 미치는 영향: 그림 및 텍스트 통합 분석을 중심으로",
        speakers: ["임창윤", "김동심"],
        affiliation: "한신대",
      },
      {
        title: "AI 융합 교사 학습 공동체 운영이 교사의 AI 융합 역량 및 학습자의 직업기초역량에 미치는 효과",
        speakers: ["박성경", "김대선", "김가형", "임철일"],
        affiliation: "서울대",
      },
      {
        title: "중등교육에서 인공지능-도덕 융합 수업 설계 모형 개발 연구",
        speakers: ["박가은", "곽현동", "한예준", "이은서", "홍수민", "한도희"],
        affiliation: "서울대",
      },
    ],
  },
];

// SESSION 02 (13:30–14:30)
const S2: TrackBlock[] = [
  {
    track: "A",
    chair: "윤가영(서울대)",
    papers: [
      {
        title: "예비교사의 전문적 시각 향상을 위한 동영상 사례기반학습 스캐폴딩 비교 연구: 질문 프롬프트와 AI 챗봇",
        speakers: ["김승호", "홍민경", "신서경"],
        affiliation: "한양대",
      },
      {
        title: "생성형 AI 기반 맞춤형 소크라테스 질문이 AI 편향에 대한 비판적 사고에 미치는 영향",
        speakers: ["이현웅", "조영환"],
        affiliation: "서울대",
      },
      {
        title: "과학 모델링 평가를 위한 신뢰도 인식(Confidence-Aware) 기반 자동 채점 프레임워크",
        speakers: ["박종찬"],
        affiliation: "University of Georgia",
      },
    ],
  },
  {
    track: "B",
    chair: "이가영(백석대)",
    papers: [
      {
        title: "A Human-Centered AI Recommendation Framework for Enhancing Student Agency in Education",
        speakers: ["금선영", "하정은", "이가영"],
        affiliation: "한국교육과정평가원 / 백석대",
      },
      {
        title: "프로젝트 기반 학습에서 학습 어려움 완화를 위한 마이크로러닝 적용: 대학 수업 사례를 중심으로",
        speakers: ["박지원", "이지은"],
        affiliation: "조선대",
      },
      {
        title: "인간중심 AI시대의 창의적 문제해결 함양을 위한 사회문제 기반 게임 제작 수업모형 개발 및 검증",
        speakers: ["이유림", "임철일"],
        affiliation: "서울대",
      },
    ],
  },
  {
    track: "C",
    chair: "정겨운(이화여대)",
    papers: [
      {
        title: "AI 기반 학습 환경에서 학습자 프로파일에 따른 학습 경험의 차이: AI 활용 및 의존 양상을 중심으로",
        speakers: ["김도윤", "소현섭", "윤미현"],
        affiliation: "중앙대",
      },
      {
        title: "시뮬라리움, 구상에서 설계로: 학습분석시스템의 뇌신경계적 역할을 중심으로",
        speakers: ["조일현"],
        affiliation: "이화여대",
      },
      {
        title: "디지털신기술분야 프로젝트 기반 학습에서 학습동기 잠재프로파일 유형 분류와 영향요인 및 학습몰입 학습전이 차이 검증",
        speakers: ["박재상", "송해덕"],
        affiliation: "중앙대",
      },
    ],
  },
  {
    track: "D",
    chair: "홍효정(한국해양대)",
    papers: [
      {
        title: "AI·디지털 교육자료 기반 영어 수업의 학습격차 해소 가능성 탐색",
        speakers: ["김현영", "김신화", "윤하나", "김현진"],
        affiliation: "한국교원대 / 김해신명초 / KERIS",
      },
      {
        title: "농산촌 교육격차 해소를 위한 실천적 대안으로서 AI·디지털 교육자료 활용 초등 수학 수업에서 나타난 학습 경험과 교수 변화 탐색: 한 교실, 다른 학습 여정",
        speakers: ["이봉규", "배종천", "김현진", "윤하나"],
        affiliation: "과산오성중 / 성베드로학교 / 한국교원대 / KERIS",
      },
      {
        title: "학교수업에서 저성취학생을 위한 AI·디지털 교육자료의 활용 효과 - 새로운 페르소나인가?",
        speakers: ["김현진", "김현영", "이광호", "이상기", "이재진", "차현진", "손태권", "이봉규", "김유리"],
        affiliation: "한국교원대 / 순천향대 / 전주대",
      },
    ],
  },
  {
    track: "E",
    chair: "이동국(경북대)",
    papers: [
      {
        title: "서술형 과제 평가를 위한 AI 에이전트 개발 연구",
        speakers: ["유미나", "고재영"],
        affiliation: "춘천교대 / 유니에스아이엔씨",
      },
      {
        title: "Agentic AI 기반 보건교육 교육과정 재구조화",
        speakers: ["윤주연", "흥후조"],
        affiliation: "숭실대 / 고려대",
      },
      {
        title: "협력적 수업설계를 위한 AI 에이전트 개발 연구",
        speakers: ["이동국", "이은상", "서경혜", "박보경", "이효녕"],
        affiliation: "경북대 / 서울특별시교육청 / 서울과학기술대",
      },
    ],
  },
  {
    track: "F",
    chair: "Yuki Mori (Prefectural Univ. of Kumamoto)",
    papers: [
      {
        title: "The Effects of Gamified Prompt Design in Generative AI on Intrinsic Motivation in Second Language Learning",
        speakers: ["Jiejin Luo"],
        affiliation: "Independent Researcher",
      },
      {
        title: "Design of an Inquiry Bot that Estimates Inquiry Depth from Learner-AI Dialogue Logs and Provides Adaptive Support",
        speakers: ["Kento Sasano"],
        affiliation: "Okayama University",
      },
    ],
  },
];

// SESSION 03 (14:40–15:40)
const S3: TrackBlock[] = [
  {
    track: "A",
    chair: "허선영(서울신학대)",
    papers: [
      {
        title: "소규모 대학에서 AI 기반 맞춤형 학사지원 시스템 구축에 대한 요구분석",
        speakers: ["이가영", "함윤희", "이은미", "임선호", "허선영"],
        affiliation: "백석대 / 서울신학대",
      },
      {
        title: "프롬프트를 통해 학습자의 인지적 참여는 가시화되는가?: AI 바이브코딩 기반 분석",
        speakers: ["조희윤", "김동심"],
        affiliation: "시화나래초 / 한신대",
      },
      {
        title: "저성취 학습자의 AI 맞춤형 영어 수업 참여 양상 탐구",
        speakers: ["이종승", "김송희", "황지윤", "이재진"],
        affiliation: "한국교원대",
      },
    ],
  },
  {
    track: "B",
    chair: "김민지(을지대)",
    papers: [
      {
        title: "학습분석 기반의 정서적 지원을 위한 에듀테크 활용 온라인 수업설계 모형 개발",
        speakers: ["김민지"],
        affiliation: "을지대",
      },
      {
        title: "에듀테크 정서지원이 정서역량 및 공감능력에 미치는 효과",
        speakers: ["성은모", "강수미", "곽다윤"],
        affiliation: "국립경국대",
      },
      {
        title: "학습자의 러닝플로우에 따른 AI 임베디드 학습환경 설계 및 적용 사례",
        speakers: ["이은미", "최명숙"],
        affiliation: "계명대",
      },
    ],
  },
  {
    track: "C",
    chair: "흥유나(재능대)",
    papers: [
      {
        title: "교육학과 데이터사이언스의 경계 넘기: 학습공학 교육과정 설계를 위한 시사점",
        speakers: ["김혜은", "추영선"],
        affiliation: "서울대",
      },
      {
        title: "다중에이전트 기반 교실 오디오 분석 프레임워크: 과학 탐구 논증 과정의 불확실성 탐지를 중심으로",
        speakers: ["박종찬"],
        affiliation: "University of Georgia",
      },
      {
        title: "AI 기반 초개인화 학습환경에서 가이던스 시퀀스에 따른 학습행동 변화와 학습이탈 분석",
        speakers: ["소현섭", "김도윤", "윤미현"],
        affiliation: "중앙대",
      },
    ],
  },
  {
    track: "D",
    chair: "금선영(한국교육과정평가원)",
    papers: [
      {
        title: "생성형 AI를 활용한 디지털 글쓰기 프로젝트 수업이 고등학생의 디지털 글쓰기 태도에 미치는 영향",
        speakers: ["이대형"],
        affiliation: "미림마이스터고",
      },
      {
        title: "해외 교육부의 디지털 및 AI 기반 서술형 평가 정책 현황과 시사점 - 핀란드, 싱가포르, 일본을 중심으로",
        speakers: ["조규복"],
        affiliation: "KERIS",
      },
      {
        title: "교육용 로봇을 위한 교육학적 정렬(Pedagogical Alignment) 프레임워크: 과학교육에서 실험 시연을 중심으로",
        speakers: ["이용기"],
        affiliation: "고려대",
      },
    ],
  },
  {
    track: "E",
    chair: "흥현미(제주대)",
    papers: [
      {
        title: "의과대학 신임 교수자의 인공지능 활용 수업에 대한 인식 분석",
        speakers: ["흥현미", "지현경"],
        affiliation: "제주대 / 서울대",
      },
      {
        title: "AI 기반 학습에서 인지적의존과 사고력저하 과정 실증연구들 분석",
        speakers: ["이미자"],
        affiliation: "광주교대",
      },
      {
        title: "AI 활용 자기조절학습의 이해: 국내외 동향에 대한 비교 문헌고찰",
        speakers: ["Lotfi Sin Sahar", "황수민", "김수현", "Putri Prima Nur Hidayati", "Ongeri Celestine Gesare", "성은모"],
        affiliation: "국립경국대",
      },
    ],
  },
  {
    track: "F",
    chair: "흥아정(중앙대)",
    papers: [
      {
        title: "대학생 생성형 AI 리터러시의 구성요인 탐색: ABCE 프레임워크 기반 체계적 문헌고찰",
        speakers: ["강준수", "송해덕"],
        affiliation: "중앙대",
      },
      {
        title: "초등교원의 디지털 수업몰입 예측요인 조합 탐색: 퍼지셋질적비교분석(fsQCA) 및 필요조건분석(NCA)",
        speakers: ["이회원", "송해덕"],
        affiliation: "중앙대",
      },
      {
        title: "가상 임상 시뮬레이션을 경험한 간호대학생의 디지털 실습몰입 잠재프로파일 분석",
        speakers: ["장승경", "송해덕"],
        affiliation: "중앙대",
      },
    ],
  },
];

// SESSION 04 (15:50–16:50)
const S4: TrackBlock[] = [
  {
    track: "A",
    chair: "안해연(경희대)",
    papers: [
      {
        title: "초·중등 교사의 AI 기반 논·서술형 평가 지원 시스템 수용 요인 분석",
        speakers: ["안해연"],
        affiliation: "경희대",
      },
      {
        title: "컴퓨팅 사고력의 산출물 기반 형성평가: AI 자동화 채점 가능성 탐색",
        speakers: ["이주영", "신윤희"],
        affiliation: "한양대",
      },
    ],
  },
  {
    track: "B",
    chair: "임유진(서강대)",
    papers: [
      {
        title: "대학 융합교과목 설계역량 함양을 위한 시나리오 개발: 협력적 교수설계과정의 갈등과 의사결정을 중심으로",
        speakers: ["김유경", "이지은"],
        affiliation: "조선대",
      },
      {
        title: "대학생의 일상 속 무형식학습 경험 탐색: 일상과 학습의 연결 경험을 중심으로",
        speakers: ["김도윤", "임지영", "김동심"],
        affiliation: "중앙대 / 부산교대 / 한신대",
      },
    ],
  },
  {
    track: "C",
    chair: "유미나(춘천교대)",
    papers: [
      {
        title: "AIDT 기반 학습분석 데이터 프레임워크 개발 연구",
        speakers: ["유미나", "진성희", "여승현", "김민지"],
        affiliation: "춘천교대 / 한밭대 / 대구교대 / 을지대",
      },
      {
        title: "Reexamining Human-Generative AI Interaction Research Through Conversation Analysis",
        speakers: ["진성희", "Ann Choe"],
        affiliation: "국립한밭대 / University of Hawaii at Manoa",
      },
      {
        title: "대학생의 AI 기술수용모형(TAM)에 따른 잠재계층분석",
        speakers: ["성은모", "한슬기", "이주아", "김호준"],
        affiliation: "국립경국대",
      },
    ],
  },
  {
    track: "D",
    chair: "진명화(이화여대)",
    papers: [
      {
        title: "디지털 수업 환경에서 교사의 리터러시, 몰입, 스트레스의 비선형적 결합이 수업 혁신행동에 미치는 영향: 반응표면분석의 적용",
        speakers: ["이동건", "송해덕", "주혜원"],
        affiliation: "중앙대",
      },
      {
        title: "현직 교사의 AI 디지털교과서(AIDT) 수용의 방해요인, 윤리적 쟁점, 정책적 지원 요구 분석",
        speakers: ["고보경", "김유민", "정재현", "이채린", "곽현동"],
        affiliation: "서울대",
      },
      {
        title: "디지털 교육 플랫폼 분석을 위한 확장된 사회기술적 워크쓰루 방법론의 제안과 적용",
        speakers: ["김송희", "이재진"],
        affiliation: "한국삼육고 / 한국교원대",
      },
    ],
  },
  {
    track: "E",
    chair: "김동호(서울대)",
    papers: [
      {
        title: "생성형 AI 기반 대학생 진로지원 시스템 Starlight Journey의 상담 구조 설계와 사용성 평가",
        speakers: ["정윤혁", "권소은", "김병규", "송우정", "김동호"],
        affiliation: "서울대",
      },
      {
        title: "AI 기반 학습 환경을 위한 과학 탐구 활동 설계 프레임워크",
        speakers: ["박종찬"],
        affiliation: "University of Georgia",
      },
      {
        title: "고등교육에서 생성형 AI 활용을 위한 수업설계 프레임워크 개발",
        speakers: ["임철일", "김준서", "권혜성"],
        affiliation: "서울대",
      },
    ],
  },
  {
    track: "F",
    chair: "박인우(고려대)",
    papers: [
      {
        title: "수업분석 도구를 활용한 과목설계 사례 및 교육공학적 함의",
        speakers: ["이미자"],
        affiliation: "광주교대",
      },
      {
        title: "대학 수업에서의 생성형 AI 의존 측정도구",
        speakers: ["박인우", "김민준"],
        affiliation: "고려대",
      },
    ],
  },
];

// G-2: 13:30–15:00 KERIS 패널 (단일 세션)
const G2_PANEL: TrackBlock = {
  track: "G",
  chair: "박선아(KERIS)",
  papers: [
    {
      title: "발표·패널토론: AX시대, AI·디지털 기반 교수·학습·분석 활용 생태계 구축과 교원의 역량 강화",
      speakers: ["변태준(좌장)", "진성회", "최용규", "옥지현"],
      affiliation: "KERIS / 국립한밭대",
    },
  ],
};

// G-3: 15:10–16:50 학습과학 패널 (단일 세션)
const G3_PANEL: TrackBlock = {
  track: "G",
  chair: "정수정(한양대)",
  papers: [
    {
      title: "학습과학 패널토의: 인공지능 시대 학습과학의 비전과 역할",
      speakers: ["조일현", "정혜선", "조영환", "서경원"],
      affiliation: "이화여대 / 한림대 / 서울대 / 서울과기대",
    },
  ],
};

// 포스터 세션 A (13:00–14:15) — 23개
const POSTERS_A: { title: string; speakers: string[]; affiliation?: string }[] = [
  { title: "[1] 교생 실습생을 위한 자폐 아동 감정·상호작용 AI 지원 시스템", speakers: ["이소희", "문선우", "박상준", "이강현"], affiliation: "백석대" },
  { title: "[2] 교과 연계 AAC(보완 대체 의사소통) 어휘 추천 시스템", speakers: ["김예나", "박신영", "박연우", "전찬빈"], affiliation: "백석대" },
  { title: "[3] Toulmin-Socratic Questioning 모델 기반 AI 읽기 튜터의 설계 및 적용: 비판적 읽기와 비판적 사고를 중심으로", speakers: ["강연수", "이정민"], affiliation: "이화여대" },
  { title: "[4] 생성형 AI 시대 교수설계 전략은 어떻게 변화하는가?: 2020-2025 국내외 학술연구의 체계적 문헌분석", speakers: ["김경미", "SARI ASTARI PUSPITA", "박다솜", "이주아", "성은모"], affiliation: "국립경국대" },
  { title: "[5] 초등 고학년의 자기인식 기반 생성형 AI 진로설계 수업 사례", speakers: ["박태호", "정대곤", "손성건", "김애영", "백상현"], affiliation: "청룡초 / 당정초 / 한얼초 / 한신대" },
  { title: "[6] 웹 기반 학습 플래너를 활용한 초등 3학년의 자기조절학습 역량 강화 연구", speakers: ["허성철", "백상현", "김애영"], affiliation: "대양초 / 한신대" },
  { title: "[7] 바이브 코딩 기반 인터랙티브 수학 학습 콘텐츠 개발 및 적용 효과 분석: 초등학교 4학년 「사각형」 단원을 중심으로", speakers: ["김민우", "정호영", "백상현", "김애영"], affiliation: "한신대" },
  { title: "[8] 사물 인식 AI와 게이미피케이션을 활용한 실감형 분리배출 학습 웹앱 수업 설계", speakers: ["위대영", "정호영", "백상현", "김애영"], affiliation: "한신대" },
  { title: "[9] 평생 건강 관리 중요성 인식을 위한 디지털 보건 교육 설계", speakers: ["김강현"], affiliation: "울산대" },
  { title: "[10] 청소년의 도박 중독 예방을 위한 AI 피드백 기반 XR 시뮬레이션 학습 프로그램 설계", speakers: ["최도은", "류지헌"], affiliation: "전남대" },
  { title: "[11] 바이브 코딩 기반 게임형 역사 학습 콘텐츠 개발 및 교육 효과 분석: 초등학교 5학년 「미스터리 한국사: 시간의 협곡」 사례", speakers: ["김미나", "백상현", "김애영"], affiliation: "한신대" },
  { title: "[12] 바이브코딩 앱을 활용한 초등 분수 학습 사례 연구", speakers: ["김윤수", "김광섭", "백상현", "김애영"], affiliation: "한신대" },
  { title: "[13] 바이브 코딩을 활용한 예술 오마주 창작 수업 효과", speakers: ["이선근", "이혜원", "정도원", "김애영", "백상현"], affiliation: "솔빛초 / 세미초 / 한신대" },
  { title: "[14] 구성-통합 모델 기반 초등 문해력 학습 콘텐츠 설계 원리 개발 및 적용", speakers: ["송해덕", "이희원", "이동건", "주혜원", "이보영", "김연경"], affiliation: "중앙대" },
  { title: "[15] Generative AI in Special Needs Education: A Pilot Study on Teachers' Usage, Perceived Benefits, and Adoption Intentions in Japan", speakers: ["Asuka Yamaguchi", "Junko Kambe"], affiliation: "Takamatsu University" },
  { title: "[16] Sustainable Special Needs Education DX in the AI Transition Era: Challenges and Prospects of an Industry-Academia Collaborative Scheme through Humanoid Robot Material Development", speakers: ["Junko Kambe", "Asuka Yamaguchi"], affiliation: "Takamatsu University" },
  { title: "[17] Towards the Future of Higher Education in Japan: Implementation and Challenges of a Major-Minor System through the Case of Niigata University's NICE Program", speakers: ["Yosuke Uehata"], affiliation: "Niigata University" },
  { title: "[18] Tracing Early Warning Signs of Absenteeism: Sequential Changes in Students' Physical and Psychological Conditions", speakers: ["Shun Ito", "Ryo Konishi", "Eita Suzuki", "Daiki Nagaoka", "Tomoya Tajiri", "Masahito Nangaku", "Shunichi Sato", "Takanori Shigi", "Shiho Ito", "Hiromi Kotani"], affiliation: "Kyoto University of Education / Children and Families Agency / Tokyo Metropolitan Institute of Medical Science / The University of Tokyo / Uchida Yoko Co., Ltd." },
  { title: "[19] How Does Human-Machine Teaming Shape AI Utilization in Project-Based Learning?", speakers: ["Masayuki Inoue", "Naoko Kato"], affiliation: "Tokyo Online University" },
  { title: "[20] A Study on the Process of Professional Appearance Norm Formation in Nursing Education Using AI", speakers: ["Mariko Isohama", "Masashi Toda"], affiliation: "Shunan University / Kumamoto University" },
  { title: "[21] Why Analog Tools Matter for Generating Inquiry Questions in the AI Era", speakers: ["Miyuki Yoshikawa", "Takashi Miura"], affiliation: "Okayama University / Lesson Design Research Institute" },
  { title: "[22] Customizing a University-Developed AI Tool for English Education: Results from a Student Needs Analysis", speakers: ["Satomi Shinohe", "Eunju Kim", "Simon Thollar"], affiliation: "Hokkaido Information University" },
  { title: "[23] Transparency Rules and Assessment Fairness in a Conditional Generative AI Integration Model: A Case Study of a Cross-Departmental Crowdfunding Assignment", speakers: ["HongSeok Choi", "Hitoshi Sasaki"], affiliation: "Takushoku University" },
];

function buildSeeds(): SessionSeed[] {
  const out: SessionSeed[] = [];

  // 09:30 사전·현장등록
  out.push({
    startTime: "09:30",
    endTime: "10:00",
    category: "other",
    title: "사전 / 현장등록",
    location: "이화여자대학교 학관 1층 후문 출입구",
  });

  // SESSION 01 (10:00–11:00)
  for (const tb of S1) {
    for (const p of tb.papers) {
      out.push({
        startTime: "10:00",
        endTime: "11:00",
        category: "paper",
        track: trackLabel(tb.track),
        title: `[${tb.track}-1] ${p.title}`,
        speakers: p.speakers,
        affiliation: p.affiliation,
        location: `${VENUE} ${TRACK_INFO[tb.track].room}`,
        abstract: `사회: ${tb.chair}`,
      });
    }
  }

  // 11:00–11:10 개회식장 이동
  out.push({
    startTime: "11:00",
    endTime: "11:10",
    category: "break",
    title: "개회식장 이동",
  });

  // 개회식 11:10–12:00
  out.push({
    startTime: "11:10",
    endTime: "12:00",
    category: "ceremony",
    title: "개회식",
    location: `${VENUE} 109호`,
    abstract:
      "축사: 이향숙(이화여대 총장), 정제영(KERIS 원장) | 사회: 임규연(한국교육공학회 부회장) | 기조강연: Curtis J. Bonk (Indiana University) — Can You Believe It?: AI-Enhanced Self Directed Lifelong Learning is Here! | 한일 회장단 좌담: 송해덕(중앙대), Yamauchi Yuhei(The University of Tokyo)",
  });

  // 점심 12:00–13:30
  out.push({
    startTime: "12:00",
    endTime: "13:30",
    category: "break",
    title: "중식",
  });

  // 포스터 세션 A 13:00–14:15 (23개)
  for (const p of POSTERS_A) {
    out.push({
      startTime: "13:00",
      endTime: "14:15",
      category: "poster",
      track: "포스터 세션 A",
      title: p.title,
      speakers: p.speakers,
      affiliation: p.affiliation,
      location: `${VENUE} 5층 로비`,
    });
  }

  // SESSION 02 (13:30–14:30) — F-2 포함, G-2는 별도 (13:30–15:00)
  for (const tb of S2) {
    for (const p of tb.papers) {
      out.push({
        startTime: "13:30",
        endTime: "14:30",
        category: tb.track === "F" ? "paper" : "paper",
        track: trackLabel(tb.track),
        title: `[${tb.track}-2] ${p.title}`,
        speakers: p.speakers,
        affiliation: p.affiliation,
        location: `${VENUE} ${TRACK_INFO[tb.track].room}`,
        abstract: `사회: ${tb.chair}`,
      });
    }
  }

  // G-2 패널 (13:30–15:00)
  for (const p of G2_PANEL.papers) {
    out.push({
      startTime: "13:30",
      endTime: "15:00",
      category: "panel",
      track: trackLabel("G"),
      title: `[G-2] ${p.title}`,
      speakers: p.speakers,
      affiliation: p.affiliation,
      location: `${VENUE} ${TRACK_INFO.G.room}`,
      abstract: `사회: ${G2_PANEL.chair}`,
    });
  }

  // 14:30–14:40 휴식
  out.push({
    startTime: "14:30",
    endTime: "14:40",
    category: "break",
    title: "휴식",
  });

  // SESSION 03 (14:40–15:40)
  for (const tb of S3) {
    for (const p of tb.papers) {
      out.push({
        startTime: "14:40",
        endTime: "15:40",
        category: "paper",
        track: trackLabel(tb.track),
        title: `[${tb.track}-3] ${p.title}`,
        speakers: p.speakers,
        affiliation: p.affiliation,
        location: `${VENUE} ${TRACK_INFO[tb.track].room}`,
        abstract: `사회: ${tb.chair}`,
      });
    }
  }

  // G-3 패널 (15:10–16:50)
  for (const p of G3_PANEL.papers) {
    out.push({
      startTime: "15:10",
      endTime: "16:50",
      category: "panel",
      track: trackLabel("G"),
      title: `[G-3] ${p.title}`,
      speakers: p.speakers,
      affiliation: p.affiliation,
      location: `${VENUE} ${TRACK_INFO.G.room}`,
      abstract: `사회: ${G3_PANEL.chair}`,
    });
  }

  // 15:40–15:50 휴식
  out.push({
    startTime: "15:40",
    endTime: "15:50",
    category: "break",
    title: "휴식",
  });

  // SESSION 04 (15:50–16:50)
  for (const tb of S4) {
    for (const p of tb.papers) {
      out.push({
        startTime: "15:50",
        endTime: "16:50",
        category: "paper",
        track: trackLabel(tb.track),
        title: `[${tb.track}-4] ${p.title}`,
        speakers: p.speakers,
        affiliation: p.affiliation,
        location: `${VENUE} ${TRACK_INFO[tb.track].room}`,
        abstract: `사회: ${tb.chair}`,
      });
    }
  }

  // 16:50–17:00 휴식
  out.push({
    startTime: "16:50",
    endTime: "17:00",
    category: "break",
    title: "휴식",
  });

  // 폐회식 17:00–17:30
  out.push({
    startTime: "17:00",
    endTime: "17:30",
    category: "ceremony",
    title: "폐회식 (시상식·경품추첨)",
    location: `${VENUE} 109호`,
    abstract:
      "학술상 및 포스터전 시상식 (사회: 이윤수, 춘계학술대회 조직위원장) | 경품추첨 (학술대회 조직위원회) | 폐회사: 송해덕 (한국교육공학회 회장)",
  });

  return out;
}

function MigratePageContent() {
  const qc = useQueryClient();
  const seeds = buildSeeds();

  const { data: actRes, isLoading: actLoading } = useQuery({
    queryKey: ["console-inject-act", ACTIVITY_ID],
    queryFn: () => activitiesApi.get(ACTIVITY_ID),
    staleTime: 60_000,
  });
  const { data: progsRes, isLoading: progsLoading } = useQuery({
    queryKey: ["console-inject-prog", ACTIVITY_ID],
    queryFn: () => conferenceProgramsApi.listByActivity(ACTIVITY_ID),
    staleTime: 60_000,
  });

  const activity = actRes;
  const existingProgram = (progsRes?.data?.[0] ?? null) as ConferenceProgram | null;
  const existingDay = existingProgram?.days.find((d) => d.date === DATE);

  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);

  async function runInject() {
    if (existingDay && existingDay.sessions.length > 0) {
      if (
        !confirm(
          `${DATE} 일자에 이미 ${existingDay.sessions.length}개 세션이 있습니다. 추가 등록(append) 하시겠습니까? (덮어쓰기 없음, 중복 발생 시 편집기에서 수동 정리 필요)`,
        )
      ) {
        return;
      }
    }

    setRunning(true);
    try {
      const newSessions: ConferenceSession[] = seeds.map((s) => ({
        id: uid("ses"),
        startTime: s.startTime,
        endTime: s.endTime,
        category: s.category,
        track: s.track,
        title: s.title,
        speakers: s.speakers,
        affiliation: s.affiliation,
        abstract: s.abstract,
        location: s.location,
      }));

      if (existingProgram) {
        const days = [...existingProgram.days];
        const idx = days.findIndex((d) => d.date === DATE);
        if (idx >= 0) {
          days[idx] = {
            ...days[idx],
            sessions: [...days[idx].sessions, ...newSessions].sort((a, b) =>
              a.startTime.localeCompare(b.startTime),
            ),
          };
        } else {
          const newDay: ConferenceDay = {
            date: DATE,
            dayLabel: "1일차",
            sessions: newSessions,
          };
          days.push(newDay);
        }
        await conferenceProgramsApi.update(existingProgram.id, { days });
      } else {
        const newDay: ConferenceDay = {
          date: DATE,
          dayLabel: "1일차",
          sessions: newSessions,
        };
        await conferenceProgramsApi.create({
          activityId: ACTIVITY_ID,
          title:
            (activity as { title?: string } | undefined)?.title ??
            "2026 한국교육공학회 춘계학술대회",
          days: [newDay],
          createdBy: "system",
        });
      }

      setDone(true);
      toast.success(`${seeds.length}개 세션 일괄 등록 완료.`);
      await qc.invalidateQueries({ queryKey: ["console-inject-prog"] });
    } catch (e) {
      toast.error(`등록 실패: ${(e as Error).message}`);
    } finally {
      setRunning(false);
    }
  }

  function downloadCsv() {
    const header = [
      "date",
      "startTime",
      "endTime",
      "track",
      "category",
      "title",
      "speakers",
      "affiliation",
      "location",
      "abstract",
    ];
    const escape = (v: string | undefined) => {
      const s = (v ?? "").replace(/\r?\n/g, " ");
      if (s.includes(",") || s.includes('"') || s.includes("\n")) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    };
    const rows = seeds.map((s) =>
      [
        DATE,
        s.startTime,
        s.endTime,
        s.track ?? "",
        s.category,
        s.title,
        (s.speakers ?? []).join("; "),
        s.affiliation ?? "",
        s.location ?? "",
        s.abstract ?? "",
      ]
        .map(escape)
        .join(","),
    );
    const csv = "﻿" + [header.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `2026-spring-conference-${DATE}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (actLoading || progsLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 활동·프로그램 정보 불러오는 중…
      </div>
    );
  }

  if (!activity) {
    return (
      <EmptyState
        icon={Calendar}
        title="활동을 찾을 수 없습니다"
        description={`activity ID = ${ACTIVITY_ID}`}
      />
    );
  }

  return (
    <div className="space-y-6">
      <ConsolePageHeader
        icon={Calendar}
        title="2026 춘계학술대회 시간표 일괄 등록"
        description={`활동: ${(activity as { title?: string }).title ?? ACTIVITY_ID} · 일자 ${DATE} · 총 ${seeds.length}개 세션`}
      />

      <div className="rounded-md border bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
        <p className="font-semibold">사전 안내</p>
        <ul className="mt-1 list-disc space-y-0.5 pl-4 text-xs">
          <li>이미지 분석 기반 hardcoded 데이터: SESSION 01-04 × 7 트랙(A~G) + 포스터 세션 A (23개) + 개·폐회식 + 휴식</li>
          <li>세션 제목·발표자·소속·트랙(룸)·사회자 모두 포함</li>
          <li>이미 {DATE} 일자에 세션이 있으면 append(덧붙이기) 모드 (덮어쓰기 없음 — 중복 발생 시 편집기에서 수동 정리)</li>
          <li>장소: {VENUE} (트랙별 룸 포함)</li>
          <li>CSV 다운로드 가능 — 다른 학술대회에 재활용 가능</li>
        </ul>
      </div>

      <div className="rounded-md border bg-card p-4">
        <p className="text-sm">
          현재 {DATE} 일자 등록 세션:{" "}
          <b>{existingDay?.sessions.length ?? 0}개</b>
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            onClick={runInject}
            disabled={running || done}
          >
            {running ? (
              <>
                <Loader2 className="mr-1 h-3 w-3 animate-spin" /> 등록 중…
              </>
            ) : done ? (
              <>
                <Check className="mr-1 h-3 w-3" /> 완료됨
              </>
            ) : (
              `${seeds.length}개 세션 일괄 등록 실행`
            )}
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={downloadCsv}>
            CSV 다운로드 ({seeds.length}행)
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-md border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs">
            <tr>
              <th className="px-3 py-2 text-left">시간</th>
              <th className="px-3 py-2 text-left">카테고리</th>
              <th className="px-3 py-2 text-left">트랙</th>
              <th className="px-3 py-2 text-left">제목</th>
              <th className="px-3 py-2 text-left">발표자</th>
            </tr>
          </thead>
          <tbody>
            {seeds.map((s, i) => (
              <tr key={i} className="border-t align-top">
                <td className="px-3 py-2 font-mono text-xs whitespace-nowrap">
                  {s.startTime}~{s.endTime}
                </td>
                <td className="px-3 py-2 text-xs">{s.category}</td>
                <td className="px-3 py-2 text-xs">{s.track ?? "-"}</td>
                <td className="px-3 py-2 text-xs">{s.title}</td>
                <td className="px-3 py-2 text-xs text-muted-foreground">
                  {(s.speakers ?? []).join(", ")}
                  {s.affiliation ? ` (${s.affiliation})` : ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted-foreground">
        등록 후{" "}
        <a
          href={`/academic-admin/external/${ACTIVITY_ID}/program`}
          className="text-primary underline"
        >
          편집기로 이동
        </a>{" "}
        하여 세션별 누락 정보 보강 가능. 포스터 세션 B는 별도 이미지가 없어 제외됨 (필요 시 편집기에서 수동 추가).
      </p>
    </div>
  );
}

export default function InjectSchedulePage() {
  return (
    <AuthGuard allowedRoles={["admin", "sysadmin"]}>
      <MigratePageContent />
    </AuthGuard>
  );
}
