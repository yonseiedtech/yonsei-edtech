import { NextRequest } from "next/server";
import { streamText } from "ai";
import { models } from "@/lib/ai";
import { requireAuth } from "@/lib/api-auth";

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  const authResult = await requireAuth(req, "staff");
  if (authResult instanceof Response) return authResult;

  const { inquiryName, inquiryEmail, inquiryMessage } = await req.json();

  if (!inquiryMessage) {
    return Response.json({ error: "문의 내용이 필요합니다." }, { status: 400 });
  }

  const result = streamText({
    model: models.fast,
    system: `당신은 연세교육공학회(Yonsei Educational Technology Association)의 운영진 답변 도우미입니다.
문의에 대해 친절하고 전문적인 답변 초안을 작성해주세요.

규칙:
- 정중한 존칭(~습니다, ~드립니다) 사용
- 학회 관련 정보는 정확히 안내 (모르면 "확인 후 안내드리겠습니다"로 대응)
- 답변 길이: 3~5문장
- 인사말로 시작하고 마무리 인사로 끝내기
- 문의자 이름이 있으면 "OOO님" 호칭 사용`,
    prompt: `다음 문의에 대한 답변 초안을 작성해주세요.

문의자: ${inquiryName || "익명"}
이메일: ${inquiryEmail || "없음"}
문의 내용:
${inquiryMessage}`,
  });

  return result.toTextStreamResponse();
}
