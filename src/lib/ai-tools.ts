import { tool } from "ai";
import { z } from "zod";
import { generateText } from "ai";
import { models } from "./ai";
import { getAdminDb } from "./firebase-admin";
import { computeMemberMetrics } from "@/features/insights/computeMemberMetrics";
import type { User } from "@/types";

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
      category: z.enum(["notice", "seminar", "free", "promotion"]).optional().describe("게시판 카테고리"),
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
      role: z.enum(["sysadmin", "admin", "president", "staff", "advisor", "alumni", "member"]).optional().describe("역할 필터"),
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
      const col = db.collection("inquiries");
      const [pendingSnap, repliedSnap] = await Promise.all([
        col.where("status", "!=", "replied").count().get(),
        col.where("status", "==", "replied").count().get(),
      ]);
      const pending = pendingSnap.data().count;
      const replied = repliedSnap.data().count;
      return { total: pending + replied, pending, replied };
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
    description: "문의에 대한 답변 초안을 확인용으로 반환합니다. 실제 저장은 운영진이 직접 수행합니다.",
    inputSchema: z.object({
      inquiryId: z.string().describe("문의 문서 ID"),
      reply: z.string().describe("답변 내용"),
    }),
    execute: async ({ inquiryId, reply }) => {
      // DB에 직접 저장하지 않고, 초안만 반환하여 운영진이 확인 후 저장하도록 함
      return {
        inquiryId,
        draft: reply,
        message: "답변 초안이 생성되었습니다. 운영진 확인 후 저장해주세요.",
        requiresConfirmation: true,
      };
    },
  }),

  analyze_member_loyalty: tool({
    description:
      "회원 로얄티(충성도) 점수를 분석합니다. 참여(세미나 출석·활동)·콘텐츠(게시물·댓글·인터뷰)·연구(타이머·논문·계획서)·운영진·후기 기록을 종합해 0-100 점수와 세그먼트(champion/active/at_risk/dormant/new)를 산출하고, 로얄티 높은 순으로 반환합니다. 운영 콘솔 회원 보고서(/console/insights)와 동일한 산출식을 사용합니다. '로얄티 높은 회원', '회원 활동성 분석', '챔피언 회원' 등의 요청에 사용하세요.",
    inputSchema: z.object({
      limit: z
        .number()
        .min(1)
        .max(30)
        .optional()
        .describe("반환할 상위 회원 수 (기본 10, 최대 30)"),
    }),
    execute: async ({ limit = 10 }) => {
      const db = getAdminDb();
      // 1. 승인 회원
      const membersSnap = await db
        .collection("users")
        .where("approved", "==", true)
        .get();
      const members = membersSnap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Record<string, unknown>),
      }));
      if (members.length === 0) {
        return { error: "분석할 승인 회원이 없습니다." };
      }

      // 2. 콘솔 회원 보고서와 동일한 11개 활동 컬렉션 병렬 조회
      const [
        attSnap, partSnap, gradSnap,
        postSnap, commentSnap, interviewSnap,
        studySnap, writingSnap, proposalSnap,
        seminarReviewSnap, courseReviewSnap,
      ] = await Promise.all([
        db.collection("seminar_attendees").where("checkedIn", "==", true).get(),
        db.collection("activity_participations").get(),
        db.collection("grad_life_positions").get(),
        db.collection("posts").get(),
        db.collection("comments").get(),
        db.collection("interview_responses").get(),
        db.collection("study_sessions").get(),
        db.collection("writing_papers").get(),
        db.collection("research_proposals").get(),
        db.collection("seminar_reviews").get(),
        db.collection("course_reviews").get(),
      ]);

      const inc = (map: Map<string, number>, key: unknown, by = 1) => {
        if (typeof key !== "string" || !key) return;
        map.set(key, (map.get(key) ?? 0) + by);
      };

      const attMap = new Map<string, number>();
      for (const doc of attSnap.docs) {
        const d = doc.data();
        if (d.isGuest) continue;
        inc(attMap, d.userId);
      }
      const partMap = new Map<string, number>();
      for (const doc of partSnap.docs) inc(partMap, doc.data().userId);

      const gradMap = new Map<string, number>();
      for (const doc of gradSnap.docs) {
        const d = doc.data();
        // 진행 중(endYear·endSemester 없음) 직책만
        if (!d.endYear || !d.endSemester) inc(gradMap, d.userId);
      }

      const postMap = new Map<string, number>();
      for (const doc of postSnap.docs) {
        const d = doc.data();
        if (d.deletedAt) continue; // 삭제된 글 제외
        inc(postMap, d.authorId);
      }
      const commentMap = new Map<string, number>();
      for (const doc of commentSnap.docs) inc(commentMap, doc.data().authorId);

      const interviewMap = new Map<string, number>();
      for (const doc of interviewSnap.docs) {
        const d = doc.data();
        if (d.status === "submitted") inc(interviewMap, d.respondentId);
      }

      const studyMinutesMap = new Map<string, number>();
      for (const doc of studySnap.docs) {
        const d = doc.data();
        const mins = typeof d.durationMinutes === "number" ? d.durationMinutes : 0;
        inc(studyMinutesMap, d.userId, mins);
      }

      const writingMap = new Map<string, number>();
      for (const doc of writingSnap.docs) {
        const d = doc.data();
        const chapters = (d.chapters ?? {}) as Record<string, unknown>;
        const chars = Object.values(chapters).reduce<number>(
          (sum, v) => sum + (typeof v === "string" ? v.length : 0),
          0,
        );
        inc(writingMap, d.userId, chars);
      }

      const proposalSet = new Set<string>();
      for (const doc of proposalSnap.docs) {
        const uid = doc.data().userId;
        if (typeof uid === "string" && uid) proposalSet.add(uid);
      }

      const seminarReviewMap = new Map<string, number>();
      for (const doc of seminarReviewSnap.docs) inc(seminarReviewMap, doc.data().authorId);
      const courseReviewMap = new Map<string, number>();
      for (const doc of courseReviewSnap.docs) inc(courseReviewMap, doc.data().authorId);

      // 3. 로얄티 점수 계산 (콘솔과 동일한 5개 카테고리 산출식)
      const now = Date.now();
      const rows = members.map((m) =>
        computeMemberMetrics({
          member: m as unknown as User,
          attendanceCount: attMap.get(m.id) ?? 0,
          activityCount: partMap.get(m.id) ?? 0,
          gradLifeOngoingCount: gradMap.get(m.id) ?? 0,
          postCount: postMap.get(m.id) ?? 0,
          commentCount: commentMap.get(m.id) ?? 0,
          interviewResponseCount: interviewMap.get(m.id) ?? 0,
          studyMinutes: studyMinutesMap.get(m.id) ?? 0,
          writingChars: writingMap.get(m.id) ?? 0,
          hasResearchProposal: proposalSet.has(m.id),
          seminarReviewCount: seminarReviewMap.get(m.id) ?? 0,
          courseReviewCount: courseReviewMap.get(m.id) ?? 0,
          nowMs: now,
        }),
      );

      // 4. 로얄티 높은 순 정렬 + 상위 N
      rows.sort((a, b) => b.loyaltyScore - a.loyaltyScore);
      const top = rows.slice(0, limit).map((r) => ({
        name: r.name,
        role: r.role,
        generation: r.generation,
        loyaltyScore: r.loyaltyScore,
        segment: r.segment,
        attendanceCount: r.attendanceCount,
        activityCount: r.activityCount,
        postCount: r.postCount,
        commentCount: r.commentCount,
        studyHours: r.studyHours,
        gradLifeOngoingCount: r.gradLifeOngoingCount,
      }));

      // 세그먼트 분포 요약
      const segmentCounts: Record<string, number> = {};
      for (const r of rows) {
        segmentCounts[r.segment] = (segmentCounts[r.segment] ?? 0) + 1;
      }

      return {
        totalMembers: rows.length,
        segmentDistribution: segmentCounts,
        topByLoyalty: top,
        note: "로얄티 점수(0-100) = 참여(30) + 콘텐츠(25) + 연구(25) + 운영진(10) + 후기(10). 운영 콘솔 회원 보고서(/console/insights)와 동일한 산출식·데이터 소스를 사용합니다.",
      };
    },
  }),
};

/** 역할에 따라 사용 가능한 도구 세트 반환 */
export function getToolsForRole(role: string) {
  const STAFF_ROLES = ["sysadmin", "admin", "staff", "president"];
  if (STAFF_ROLES.includes(role)) {
    return { ...publicTools, ...staffTools };
  }
  return publicTools;
}
