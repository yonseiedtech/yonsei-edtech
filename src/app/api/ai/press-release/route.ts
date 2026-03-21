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

  const formatPrompts: Record<string, string> = {
    press: `보도자료 형식으로 작성해주세요.
- 제목: 연세교육공학회, 「{세미나제목}」 세미나 개최
- 배포 일시, 연락처 헤더 포함
- 본문: 행사 개요(일시/장소/발표자), 세미나 소개(2~3 문단), 학회 소개(1 문단)
- 문의처로 마무리`,
    sns: `인스타그램/SNS 포스팅용 텍스트를 작성해주세요.
- 이모지 적극 활용
- 핵심 정보(일시/장소/발표자) 강조
- 해시태그 5~8개 (#교육공학 #연세대 #세미나 등)
- 참석 유도 문구 포함
- 줄바꿈으로 가독성 확보`,
    email: `세미나 초대 이메일을 작성해주세요.
- 제목줄 제안으로 시작
- 인사말 → 세미나 안내 → 참석 방법 → 마무리 인사 구조
- 정중하지만 따뜻한 톤
- 세미나 핵심 정보를 깔끔하게 정리`,
    kakao: `카카오톡 단체 메시지용 캡션을 작성해주세요.
- 200자 이내로 간결하게
- 핵심 정보(일시/장소/주제)만 포함
- 이모지 1~2개만 사용
- 신청 링크 안내 문구 포함
- 줄바꿈 최소화 (카톡 미리보기에 맞게)`,
    hashtag: `이 세미나에 적합한 해시태그를 추천해주세요.
- 10~15개 해시태그
- 한국어 + 영어 혼합
- 교육공학, 에듀테크, 연세대 관련 필수 포함
- 세미나 주제 관련 키워드 포함
- 한 줄에 해시태그만 나열 (설명 없이)`,
  };

  const speakerInfo = [
    seminar.speaker,
    seminar.speakerPosition ? `(${seminar.speakerPosition})` : "",
    seminar.speakerAffiliation || "",
  ]
    .filter(Boolean)
    .join(" ");

  try {
    const result = streamText({
      model: models.quality,
      system: `당신은 연세교육공학회의 홍보 콘텐츠 작성 전문가입니다.
학술적이면서도 접근성 있는 톤으로 작성합니다.
한국어로 작성하세요.`,
      prompt: `다음 세미나 정보를 기반으로 콘텐츠를 생성해주세요.

${formatPrompts[format] || formatPrompts.press}

세미나 정보:
- 제목: ${seminar.title}
- 일시: ${seminar.date} ${seminar.time}
- 장소: ${seminar.location}
- 발표자: ${speakerInfo}
- 발표자 소개: ${seminar.speakerBio || "없음"}
- 세미나 설명: ${seminar.description}
- 참석 현황: ${seminar.attendeeIds?.length ?? 0}명 신청`,
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
