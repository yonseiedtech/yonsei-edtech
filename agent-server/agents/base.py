import json
from typing import AsyncGenerator, Callable, Optional
from google import genai
from google.genai import types
from config import GOOGLE_API_KEY, MODEL_FAST, MODEL_QUALITY, MAX_TOOL_ROUNDS
from models import Agent, AgentTask
from tools.registry import get_tools_for_agent

_client = None


def _get_client():
    global _client
    if _client is None:
        _client = genai.Client(api_key=GOOGLE_API_KEY)
    return _client


def _get_model(model_type: str) -> str:
    return MODEL_QUALITY if model_type == "quality" else MODEL_FAST


async def run_agent(
    agent: Agent,
    task: AgentTask,
    on_event: Callable,
) -> str:
    """에이전트 실행: Gemini API + tool calling 루프"""
    client = _get_client()
    model = _get_model(agent.model)
    tool_declarations, tool_functions = get_tools_for_agent(agent.tools)

    await on_event("status", {"message": f"{agent.name} 작업 시작..."})

    # 도구 설정
    tools = None
    if tool_declarations:
        tools = [types.Tool(function_declarations=[
            types.FunctionDeclaration(
                name=td["name"],
                description=td["description"],
                parameters=td["parameters"],
            )
            for td in tool_declarations
        ])]

    # 초기 메시지
    user_prompt = task.description
    if task.input_data:
        user_prompt += f"\n\n추가 입력 데이터:\n{json.dumps(task.input_data, ensure_ascii=False)}"

    contents = [types.Content(role="user", parts=[types.Part(text=user_prompt)])]

    # Tool calling 루프
    for round_num in range(MAX_TOOL_ROUNDS):
        response = client.models.generate_content(
            model=model,
            contents=contents,
            config=types.GenerateContentConfig(
                system_instruction=agent.system_prompt,
                tools=tools,
            ),
        )

        # 텍스트 응답이면 완료
        if not response.candidates:
            break

        candidate = response.candidates[0]
        parts = candidate.content.parts

        # function call 확인
        function_calls = [p for p in parts if p.function_call]
        if not function_calls:
            # 텍스트 응답
            text = "".join(p.text for p in parts if p.text)
            await on_event("delta", {"text": text})
            return text

        # function call 실행
        contents.append(candidate.content)
        fn_response_parts = []

        for part in function_calls:
            fc = part.function_call
            tool_name = fc.name
            tool_args = dict(fc.args) if fc.args else {}

            await on_event("tool_call", {"tool": tool_name, "args": tool_args})

            if tool_name in tool_functions:
                try:
                    result = await tool_functions[tool_name](**tool_args)
                except Exception as e:
                    result = {"error": str(e)}
            else:
                result = {"error": f"알 수 없는 도구: {tool_name}"}

            await on_event("tool_result", {"tool": tool_name, "result": result})

            fn_response_parts.append(
                types.Part(function_response=types.FunctionResponse(
                    name=tool_name,
                    response=result,
                ))
            )

        contents.append(types.Content(role="user", parts=fn_response_parts))

    # 루프 종료 후 최종 텍스트 응답 요청
    response = client.models.generate_content(
        model=model,
        contents=contents,
        config=types.GenerateContentConfig(system_instruction=agent.system_prompt),
    )
    text = response.text if response.text else ""
    await on_event("delta", {"text": text})
    return text
