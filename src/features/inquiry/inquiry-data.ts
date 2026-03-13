import type { Inquiry } from "@/types";

export const MOCK_INQUIRIES: Inquiry[] = [
  {
    id: "inq1",
    name: "이지훈",
    email: "jihoon@example.com",
    message: "학회 가입 절차가 궁금합니다. 교육학과 석사 신입생인데 바로 가입 가능한가요?",
    status: "replied",
    reply: "안녕하세요! 네, 교육학과 대학원생이시면 홈페이지에서 회원가입 후 승인 절차를 거치면 됩니다.",
    repliedAt: "2026-03-02T14:00:00Z",
    createdAt: "2026-03-01T10:00:00Z",
  },
  {
    id: "inq2",
    name: "박수진",
    email: "sujin@example.com",
    message: "졸업생인데 세미나에 참석할 수 있나요? 졸업생 계정은 어떻게 발급받나요?",
    status: "replied",
    reply: "졸업생 분들도 세미나 참석 가능합니다. 관리자에게 연락주시면 졸업생 계정을 발급해 드립니다.",
    repliedAt: "2026-03-06T11:00:00Z",
    createdAt: "2026-03-05T09:30:00Z",
  },
  {
    id: "inq3",
    name: "김태현",
    email: "taehyun@example.com",
    message: "에듀테크 해커톤에 외부인도 참가할 수 있는지 문의드립니다.",
    status: "pending",
    createdAt: "2026-03-10T15:00:00Z",
  },
  {
    id: "inq4",
    name: "정하나",
    email: "hana@example.com",
    message: "학회 홍보 협력 관련으로 연락드립니다. 담당자 이메일을 알 수 있을까요?",
    status: "pending",
    createdAt: "2026-03-12T08:00:00Z",
  },
];
