from google import genai
from config import GOOGLE_API_KEY, MODEL_FAST
from tools.registry import register_tool

_client = None


def _get_client():
    global _client
    if _client is None:
        _client = genai.Client(api_key=GOOGLE_API_KEY)
    return _client


@register_tool(
    name="generate_text",
    description="추가 LLM 호출로 텍스트를 생성합니다. 보도자료, SNS, 이메일, 리포트 등.",
    parameters={
        "prompt": {"type": "string", "description": "생성 요청 프롬프트"},
        "format": {"type": "string", "description": "형식: press, sns, email, report, free"},
    },
)
async def generate_text(prompt: str, format: str = "free", **kwargs) -> dict:
    format_instructions = {
        "press": "보도자료 형식으로 작성. 제목/배포일시/본문(3문단)/문의처.",
        "sns": "인스타그램 포스팅 형식. 이모지, 해시태그 5~8개, 줄바꿈.",
        "email": "초대 이메일. 제목줄/인사말/본문/마무리.",
        "report": "분석 리포트. 요약/상세/표/개선제안.",
        "free": "자유 형식.",
    }
    system = f"한국어로 작성. {format_instructions.get(format, format_instructions['free'])}"

    client = _get_client()
    response = client.models.generate_content(
        model=MODEL_FAST,
        contents=prompt,
        config=genai.types.GenerateContentConfig(system_instruction=system),
    )
    return {"text": response.text}
