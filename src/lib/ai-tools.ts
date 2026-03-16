import { tool } from "ai";
import { z } from "zod";
import { generateText } from "ai";
import { models } from "./ai";
import { getAdminDb } from "./firebase-admin";

// ── 공개 도구 (모든 사용자) ──

export const publicTools = {
  list_seminars: tool({
    description: "세미나 목록을 조회합니다. 제목, 날짜, 장소, 발표자 요약을 반환합니다.",
    inputSchema: z.object({
      status: z.enum(["upcoming", "completed", "cancelled"]).optional().describe("세미나 상태 필터"),
      limit: z.number().min(1).max(10).optional().describe("조회 개수 (최대 10)"),
    }),
    execute: async ({ status, limit = 5 }) => {
      const db = getAdminDb();
      let query = db.collection("seminars").orderBy("date", "desc").limit(limit);
      if (status) query = query.where("status", "==", status);
      const snap = await query.get();
      return snap.docs.map((doc) => {
        const d = doc.data();
        return {
          id: doc.id,
          title: d.title,
          date: d.date,
          time: d.time,
          location: d.location,
          speaker: d.speaker,
          status: d.status,
        };
      });
    },
  }),

  get_seminar: tool({
    description: "특정 세미나의 상세 정보와 세션 목록을 조회합니다.",
    inputSchema: z.object({
      seminarId: z.string().describe("세미나 문서 ID"),
    }),
    execute: async ({ seminarId }) => {
      const db = getAdminDb();
      const doc = await db.collection("seminars").doc(seminarId).get();
      if (!doc.exists) return { error: "세미나를 찾을 수 없습니다." };
      const d = doc.data()!;
      return {
        id: doc.id,
        title: d.title,
        description: d.description,
        date: d.date,
        time: d.time,
        location: d.location,
        speaker: d.speaker,
        speakerBio: d.speakerBio,
        speakerAffiliation: d.speakerAffiliation,
        speakerPosition: d.speakerPosition,
        status: d.status,
        attendeeCount: d.attendeeIds?.length ?? 0,
        sessions: d.sessions ?? [],
      };
    },
  }),

  search_posts: tool({
    description: "게시글을 검색합니다. 카테고리 필터와 키워드 검색을 지원합니다.",
    inputSchema: z.object({
      category: z.enum(["notice", "seminar", "free", "promotion", "newsletter"]).optional().describe("게시판 카테고리"),
      keyword: z.string().optional().describe("검색 키워드 (제목에서 검색)"),
      limit: z.number().min(1).max(10).optional().describe("조회 개수 (최대 10)"),
    }),
    execute: async ({ category, keyword, limit = 5 }) => {
      const db = getAdminDb();
      let query = db.collection("posts").orderBy("createdAt", "desc").limit(limit);
      if (category) query = query.where("category", "==", category);
      const snap = await query.get();
      let results = snap.docs.map((doc) => {
        const d = doc.data();
        return {
          id: doc.id,
          title: d.title,
          category: d.category,
          authorName: d.authorName,
          createdAt: d.createdAt,
        };
      });
      if (keyword) {
        const kw = keyword.toLowerCase();
        results = results.filter((r) => r.title.toLowerCase().includes(kw));
      }
      return results;
    },
  }),

  get_society_info: tool({
    description: "연세교육공학회 소개 정보를 반환합니다.",
    inputSchema: z.object({}),
    execute: async () => ({
      name: "연세교육공학회",
      englishName: "Yonsei Educational Technology Association",
      university: "연세대학교",
      department: "교육학과 교육공학 전공",
      mission: "교육공학 분야의 학술 교류와 연구 역량 강화를 위한 전공 학술 커뮤니티",
      activities: [
        "정기 학술 세미나 개최",
        "교육공학 연구 프로젝트 수행",
        "학회보(뉴스레터) 발행",
        "학술 스터디 그룹 운영",
        "산학 네트워킹 행사",
      ],
      website: "https://yonsei-edtech.vercel.app",
    }),
  }),
};

// ── 운영진 전용 도구 (staff+) ──

export const staffTools = {
  list_members: tool({
    description: "회원 목록을 조회합니다. 민감 정보(이메일 등)는 제외됩니다.",
    inputSchema: z.object({
      role: z.enum(["admin", "president", "staff", "advisor", "alumni", "member"]).optional().describe("역할 필터"),
      generation: z.number().optional().describe("기수 필터"),
      limit: z.number().min(1).max(20).optional().describe("조회 개수 (최대 20)"),
    }),
    execute: async ({ role, generation, limit = 10 }) => {
      const db = getAdminDb();
      let query: FirebaseFirestore.Query = db.collection("users").where("approved", "==", true).limit(limit);
      if (role) query = query.where("role", "==", role);
      if (generation) query = query.where("generation", "==", generation);
      const snap = await query.get();
      return snap.docs.map((doc) => {
        const d = doc.data();
        return {
          id: doc.id,
          name: d.name,
          role: d.role,
          generation: d.generation,
          field: d.field,
          occupation: d.occupation,
          affiliation: d.affiliation,
        };
      });
    },
  }),

  get_inquiry_stats: tool({
    description: "문의 현황 통계를 조회합니다. 대기 중/답변 완료 건수를 반환합니다.",
    inputSchema: z.object({}),
    execute: async () => {
      const db = getAdminDb();
      const snap = await db.collection("inquiries").get();
      let pending = 0;
      let replied = 0;
      snap.docs.forEach((doc) => {
        if (doc.data().status === "replied") replied++;
        else pending++;
      });
      return { total: snap.size, pending, replied };
    },
  }),

  list_inquiries: tool({
    description: "문의 목록을 조회합니다.",
    inputSchema: z.object({
      status: z.enum(["pending", "replied"]).optional().describe("문의 상태 필터"),
      limit: z.number().min(1).max(10).optional().describe("조회 개수 (최대 10)"),
    }),
    execute: async ({ status, limit = 5 }) => {
      const db = getAdminDb();
      let query = db.collection("inquiries").orderBy("createdAt", "desc").limit(limit);
      if (status) query = query.where("status", "==", status);
      const snap = await query.get();
      return snap.docs.map((doc) => {
        const d = doc.data();
        return {
          id: doc.id,
          name: d.name,
          email: d.email,
          message: d.message?.slice(0, 100) + (d.message?.length > 100 ? "..." : ""),
          status: d.status,
          createdAt: d.createdAt,
        };
      });
    },
  }),

  generate_content: tool({
    description: "세미나 기반 홍보 콘텐츠(보도자료/SNS/이메일)를 생성합니다.",
    inputSchema: z.object({
      type: z.enum(["press", "sns", "email"]).describe("콘텐츠 유형"),
      seminarId: z.string().describe("세미나 문서 ID"),
    }),
    execute: async ({ type, seminarId }) => {
      const db = getAdminDb();
      const doc = await db.collection("seminars").doc(seminarId).get();
      if (!doc.exists) return { error: "세미나를 찾을 수 없습니다." };
      const s = doc.data()!;

      const formatPrompts: Record<string, string> = {
        press: `보도자료 형식으로 작성해주세요.
- 제목: 연세교육공학회, 「${s.title}」 세미나 개최
- 배포 일시, 연락처 헤더 포함
- 본문: 행사 개요(일시/장소/발표자), 세미나 소개(2~3 문단), 학회 소개(1 문단)`,
        sns: `인스타그램/SNS 포스팅용 텍스트를 작성해주세요.
- 이모지 적극 활용, 핵심 정보 강조
- 해시태그 5~8개, 참석 유도 문구 포함`,
        email: `세미나 초대 이메일을 작성해주세요.
- 제목줄 제안 → 인사말 → 세미나 안내 → 참석 방법 → 마무리 인사`,
      };

      const speakerInfo = [s.speaker, s.speakerPosition ? `(${s.speakerPosition})` : "", s.speakerAffiliation || ""].filter(Boolean).join(" ");

      const result = await generateText({
        model: models.quality,
        system: "당신은 연세교육공학회의 홍보 콘텐츠 작성 전문가입니다. 학술적이면서도 접근성 있는 톤으로 한국어로 작성합니다.",
        prompt: `${formatPrompts[type]}

세미나 정보:
- 제목: ${s.title}
- 일시: ${s.date} ${s.time}
- 장소: ${s.location}
- 발표자: ${speakerInfo}
- 설명: ${s.description}`,
      });
      return { content: result.text };
    },
  }),

  generate_inquiry_reply: tool({
    description: "문의에 대한 AI 답변 초안을 생성합니다.",
    inputSchema: z.object({
      inquiryId: z.string().describe("문의 문서 ID"),
    }),
    execute: async ({ inquiryId }) => {
      const db = getAdminDb();
      const doc = await db.collection("inquiries").doc(inquiryId).get();
      if (!doc.exists) return { error: "문의를 찾을 수 없습니다." };
      const d = doc.data()!;

      const result = await generateText({
        model: models.fast,
        system: `당신은 연세교육공학회의 운영진 답변 도우미입니다.
정중한 존칭 사용, 3~5문장, 인사말+마무리 포함.`,
        prompt: `문의자: ${d.name || "익명"}
이메일: ${d.email || "없음"}
문의 내용: ${d.message}`,
      });
      return { inquiryId, draft: result.text };
    },
  }),

  save_inquiry_reply: tool({
    description: "문의에 대한 답변을 Firestore에 저장합니다.",
    inputSchema: z.object({
      inquiryId: z.string().describe("문의 문서 ID"),
      reply: z.string().describe("답변 내용"),
    }),
    execute: async ({ inquiryId, reply }) => {
      const db = getAdminDb();
      const ref = db.collection("inquiries").doc(inquiryId);
      const doc = await ref.get();
      if (!doc.exists) return { error: "문의를 찾을 수 없습니다." };
      await ref.update({
        reply,
        status: "replied",
        repliedAt: new Date().toISOString(),
      });
      return { success: true, message: "답변이 저장되었습니다." };
    },
  }),
};

/** 역할에 따라 사용 가능한 도구 세트 반환 */
export function getToolsForRole(role: string) {
  const STAFF_ROLES = ["staff", "president", "admin"];
  if (STAFF_ROLES.includes(role)) {
    return { ...publicTools, ...staffTools };
  }
  return publicTools;
}
