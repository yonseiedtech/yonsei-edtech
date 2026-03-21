import { NextRequest } from "next/server";
import { streamText } from "ai";
import { models } from "@/lib/ai";
import { requireAuth } from "@/lib/api-auth";

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  const authResult = await requireAuth(req, "staff");
  if (authResult instanceof Response) return authResult;

  const { seminar, format } = await req.json();

  if (!seminar?.title) {
    return Response.json({ error: "세미나 정보가 필요합니다." }, { status: 400 });
  }

  const dateStr = seminar.date
    ? new Date(seminar.date).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" })
    : seminar.date;
  const dayOfWeek = seminar.date
    ? new Date(seminar.date).toLocaleDateString("ko-KR", { weekday: "long" })
    : "";

  const speakerInfo = [
    seminar.speaker,
    seminar.speakerPosition ? `(${seminar.speakerPosition})` : "",
    seminar.speakerAffiliation || "",
  ]
    .filter(Boolean)
    .join(" ");

  const seminarUrl = seminar.registrationUrl || "https://yonsei-edtech.vercel.app/seminars";

  const formatPrompts: Record<string, string> = {
    press: `아래 형식 그대로 보도자료를 작성해주세요. 빈칸 없이 완성본으로 작성하세요.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
보  도  자  료
배포 일시: ${new Date().toLocaleDateString("ko-KR")}
연 락 처: yonsei.edtech@gmail.com
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

연세교육공학회, 「${seminar.title}」 세미나 개최

■ 일시: ${dateStr} (${dayOfWeek}) ${seminar.time}
■ 장소: ${seminar.location}
■ 발표자: ${speakerInfo}
■ 대상: 연세대학교 교육학과 대학원생 및 관심 있는 분 누구나
■ 참석 신청: ${seminarUrl}

(여기에 세미나 소개 2~3문단 작성)

(여기에 연세교육공학회 소개 1문단 작성)

문의: yonsei.edtech@gmail.com
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

위 형식을 그대로 유지하되 괄호 안의 지시를 실제 내용으로 채워주세요.`,

    sns: `인스타그램 포스팅용 텍스트를 작성해주세요. 복사해서 바로 올릴 수 있도록 완성본으로 작성하세요.

📢 [세미나 안내]

「${seminar.title}」

🗓 ${dateStr} (${dayOfWeek}) ${seminar.time}
📍 ${seminar.location}
🎤 ${speakerInfo}

(세미나 내용을 2~3줄로 매력적으로 소개)

✅ 참석 신청: 프로필 링크 참조
💬 많은 관심과 참여 부탁드립니다!

(관련 해시태그 8~10개)

위 형식을 유지하되 괄호 안의 지시를 실제 내용으로 채워주세요. 이모지를 적극 활용하세요.`,

    email: `초대 이메일을 작성해주세요. 복사해서 바로 발송할 수 있도록 완성본으로 작성하세요.

제목: [연세교육공학회] 「${seminar.title}」 세미나 안내

안녕하세요,
연세교육공학회입니다.

(정중하고 따뜻한 톤으로 세미나 초대 인사 1문단)

■ 세미나 안내
• 주제: ${seminar.title}
• 일시: ${dateStr} (${dayOfWeek}) ${seminar.time}
• 장소: ${seminar.location}
• 발표자: ${speakerInfo}

(세미나 내용 소개 1~2문단)

■ 참석 방법
아래 링크에서 참석 신청해주세요.
${seminarUrl}

(마무리 인사)

연세교육공학회 드림
yonsei.edtech@gmail.com

위 형식을 유지하되 괄호 안의 지시를 실제 내용으로 채워주세요.`,

    kakao: `카카오톡 단체 메시지용 캡션을 작성해주세요. 복사해서 바로 전송할 수 있도록 완성본으로 작성하세요.

📢 연세교육공학회 세미나
「${seminar.title}」
🗓 ${dateStr} ${seminar.time}
📍 ${seminar.location}
🎤 ${speakerInfo}
✅ 신청: ${seminarUrl}

위 내용을 기반으로 150자 이내의 카카오톡 메시지를 작성해주세요. 이모지는 1~2개만 사용하고, 핵심 정보만 간결하게 전달하세요. 줄바꿈 최소화하세요.`,

    hashtag: `이 세미나에 적합한 해시태그를 추천해주세요.
복사해서 바로 붙여넣을 수 있도록 해시태그만 나열하세요. 설명 없이 해시태그만 작성하세요.
12~15개, 한국어 + 영어 혼합.
반드시 포함: #연세교육공학회 #교육공학 #연세대 #에듀테크 #세미나
세미나 주제 관련 키워드도 포함하세요.`,
  };

  try {
    const result = streamText({
      model: models.quality,
      system: `당신은 연세교육공학회의 홍보 콘텐츠 작성 전문가입니다.
학술적이면서도 접근성 있는 톤으로 작성합니다.
한국어로 작성하세요.
중요: 결과물은 복사해서 바로 사용할 수 있는 완성본이어야 합니다. 설명이나 주석을 넣지 마세요.`,
      prompt: `다음 세미나 정보를 기반으로 콘텐츠를 생성해주세요.

${formatPrompts[format] || formatPrompts.press}

세미나 정보:
- 제목: ${seminar.title}
- 일시: ${dateStr} (${dayOfWeek}) ${seminar.time}
- 장소: ${seminar.location}
- 발표자: ${speakerInfo}
- 발표자 소개: ${seminar.speakerBio || "없음"}
- 세미나 설명: ${seminar.description}
- 참석 현황: ${seminar.attendeeIds?.length ?? 0}명 신청
- 신청 링크: ${seminarUrl}`,
    });

    return result.toTextStreamResponse();
  } catch (err) {
    console.error("[press-release] AI error:", err);
    const msg = err instanceof Error ? err.message : "AI 생성 실패";
    if (msg.includes("quota") || msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED")) {
      return Response.json({ error: "AI API 할당량이 초과되었습니다. 잠시 후 다시 시도해주세요." }, { status: 429 });
    }
    return Response.json({ error: msg }, { status: 500 });
  }
}
