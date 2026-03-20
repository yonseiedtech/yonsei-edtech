import type { Post, Comment } from "@/types";

// 데모용 목업 데이터 — bkend.ai 연동 시 제거
export const MOCK_POSTS: Post[] = [
  {
    id: "1",
    title: "2026 봄학기 정기 세미나 일정 안내",
    content:
      "안녕하세요, 연세교육공학회입니다.\n\n2026년 봄학기 정기 세미나 일정을 안내드립니다.\n\n- 일시: 매주 수요일 오후 7시\n- 장소: 교육과학관 203호\n- 주제: AI와 교육의 미래\n\n많은 참여 부탁드립니다.",
    category: "notice",
    authorId: "1",
    authorName: "관리자",
    viewCount: 42,
    createdAt: "2026-03-10T10:00:00Z",
    updatedAt: "2026-03-10T10:00:00Z",
  },
  {
    id: "2",
    title: "[발제] ChatGPT를 활용한 적응형 학습 설계",
    content:
      "이번 주 세미나 발제 자료를 공유합니다.\n\n주제: ChatGPT를 활용한 적응형 학습 설계\n\n1. 적응형 학습의 정의와 역사\n2. LLM 기반 학습 피드백 시스템\n3. 프롬프트 엔지니어링과 교수설계\n4. 사례 분석: Khanmigo, Duolingo Max\n\n발제 후 토론 내용도 추후 정리하여 올리겠습니다.",
    category: "seminar",
    authorId: "2",
    authorName: "김민수",
    viewCount: 28,
    createdAt: "2026-03-08T14:00:00Z",
    updatedAt: "2026-03-08T14:00:00Z",
  },
  {
    id: "3",
    title: "에듀테크 트렌드 리포트 2026 공유",
    content:
      "2026년 에듀테크 트렌드 리포트 주요 내용을 정리했습니다.\n\n- 생성형 AI의 교육 활용 확대\n- 실감형 콘텐츠 (VR/AR) 고도화\n- 마이크로크레덴셜의 확산\n- 학습 분석 기술 발전\n\n전문은 첨부 파일을 참고해주세요.",
    category: "seminar",
    authorId: "3",
    authorName: "이서연",
    viewCount: 35,
    createdAt: "2026-03-05T09:00:00Z",
    updatedAt: "2026-03-05T09:00:00Z",
  },
  {
    id: "4",
    title: "스터디 모집: UX 리서치 기초",
    content:
      "UX 리서치 기초 스터디원을 모집합니다.\n\n- 주제: 교육 서비스 UX 리서치 방법론\n- 기간: 4주 (매주 월요일)\n- 인원: 4~6명\n- 교재: The UX Research Playbook\n\n관심 있으신 분은 댓글로 신청해주세요!",
    category: "free",
    authorId: "4",
    authorName: "정다은",
    viewCount: 15,
    createdAt: "2026-03-03T16:00:00Z",
    updatedAt: "2026-03-03T16:00:00Z",
  },
  // ── 홍보게시판 ──
  {
    id: "5",
    title: "[모집] 2026 봄학기 신입 학회원 모집",
    content:
      "연세교육공학회에서 2026 봄학기 신입 학회원을 모집합니다.\n\n- 대상: 연세대학교 교육학과 대학원생\n- 모집 기간: 3/1 ~ 3/20\n- 지원 방법: 구글폼 작성\n\n교육공학에 관심 있는 분들의 많은 지원 바랍니다!",
    category: "promotion",
    authorId: "3",
    authorName: "이운영",
    viewCount: 67,
    createdAt: "2026-03-01T09:00:00Z",
    updatedAt: "2026-03-01T09:00:00Z",
  },
  {
    id: "6",
    title: "[안내] 교육공학 커리어 워크숍 개최",
    content:
      "교육공학 전공자를 위한 커리어 워크숍을 개최합니다.\n\n- 일시: 3/25(화) 14:00~17:00\n- 장소: 교육과학관 B1 세미나실\n- 내용: 에듀테크 기업 취업 전략, 포트폴리오 리뷰\n- 연사: OO에듀 김OO 대표",
    category: "promotion",
    authorId: "3",
    authorName: "이운영",
    viewCount: 45,
    createdAt: "2026-03-07T10:00:00Z",
    updatedAt: "2026-03-07T10:00:00Z",
  },
  {
    id: "7",
    title: "[협력] 에듀테크 학회 간 공동 세미나 안내",
    content:
      "연세교육공학회와 고려대 교육기술학회가 공동 세미나를 개최합니다.\n\n- 주제: AI 시대의 교수설계 재정의\n- 일시: 4/5(토) 10:00~16:00\n- 장소: 연세대 백양관 대강당\n\n두 학회 회원 모두 참석 가능합니다.",
    category: "promotion",
    authorId: "2",
    authorName: "김회장",
    viewCount: 38,
    createdAt: "2026-03-12T08:00:00Z",
    updatedAt: "2026-03-12T08:00:00Z",
  },
];

export const MOCK_COMMENTS: Comment[] = [
  {
    id: "c1",
    postId: "4",
    content: "저도 참여하고 싶습니다! UX 리서치에 관심이 많아요.",
    authorId: "5",
    authorName: "최현우",
    createdAt: "2026-03-03T17:00:00Z",
  },
  {
    id: "c2",
    postId: "4",
    content: "저도 신청합니다! 언제 시작하나요?",
    authorId: "6",
    authorName: "한소영",
    createdAt: "2026-03-03T18:30:00Z",
  },
  {
    id: "c3",
    postId: "2",
    content: "좋은 발제 감사합니다. Khanmigo 사례가 특히 인상적이었습니다.",
    authorId: "3",
    authorName: "이서연",
    createdAt: "2026-03-08T15:00:00Z",
  },
];
