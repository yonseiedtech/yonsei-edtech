import json
from typing import Callable
from config import OPENAI_API_KEY, GOOGLE_API_KEY, USE_OPENAI, MODEL_FAST, MODEL_QUALITY, MAX_TOOL_ROUNDS
from models import Agent, AgentTask
from tools.registry import get_tools_for_agent

# ── OpenAI client ──

_openai_client = None

def _get_openai_client():
    global _openai_client
    if _openai_client is None:
        from openai import OpenAI
        _openai_client = OpenAI(api_key=OPENAI_API_KEY)
    return _openai_client

# ── Gemini client ──

_gemini_client = None

def _get_gemini_client():
    global _gemini_client
    if _gemini_client is None:
        from google import genai
        _gemini_client = genai.Client(api_key=GOOGLE_API_KEY)
    return _gemini_client


def _get_model(model_type: str) -> str:
    return MODEL_QUALITY if model_type == "quality" else MODEL_FAST


async def run_agent(agent: Agent, task: AgentTask, on_event: Callable) -> str:
    if USE_OPENAI:
        return await _run_openai(agent, task, on_event)
    else:
        return await _run_gemini(agent, task, on_event)


async def _run_openai(agent: Agent, task: AgentTask, on_event: Callable) -> str:
    client = _get_openai_client()
    model = _get_model(agent.model)
    tool_declarations, tool_functions = get_tools_for_agent(agent.tools)

    await on_event("status", {"message": f"{agent.name} 작업 시작..."})

    # OpenAI tool 형식
    tools = []
    for td in tool_declarations:
        tools.append({
            "type": "function",
            "function": {
                "name": td["name"],
                "description": td["description"],
                "parameters": td["parameters"],
            },
        })

    user_prompt = task.description
    if task.input_data:
        user_prompt += f"\n\n추가 입력 데이터:\n{json.dumps(task.input_data, ensure_ascii=False)}"

    messages = [
        {"role": "system", "content": agent.system_prompt},
        {"role": "user", "content": user_prompt},
    ]

    for _ in range(MAX_TOOL_ROUNDS):
        response = client.chat.completions.create(
            model=model,
            messages=messages,
            tools=tools if tools else None,
        )

        choice = response.choices[0]

        if choice.finish_reason == "tool_calls" and choice.message.tool_calls:
            messages.append(choice.message)

            for tc in choice.message.tool_calls:
                tool_name = tc.function.name
                tool_args = json.loads(tc.function.arguments) if tc.function.arguments else {}

                await on_event("tool_call", {"tool": tool_name, "args": tool_args})

                if tool_name in tool_functions:
                    try:
                        result = await tool_functions[tool_name](**tool_args)
                    except Exception as e:
                        result = {"error": str(e)}
                else:
                    result = {"error": f"알 수 없는 도구: {tool_name}"}

                await on_event("tool_result", {"tool": tool_name, "result": result})

                messages.append({
                    "role": "tool",
                    "tool_call_id": tc.id,
                    "content": json.dumps(result, ensure_ascii=False),
                })
        else:
            text = choice.message.content or ""
            await on_event("delta", {"text": text})
            return text

    # max rounds 도달 시 최종 응답
    response = client.chat.completions.create(model=model, messages=messages)
    text = response.choices[0].message.content or ""
    await on_event("delta", {"text": text})
    return text


async def _run_gemini(agent: Agent, task: AgentTask, on_event: Callable) -> str:
    from google.genai import types

    client = _get_gemini_client()
    model = _get_model(agent.model)
    tool_declarations, tool_functions = get_tools_for_agent(agent.tools)

    await on_event("status", {"message": f"{agent.name} 작업 시작..."})

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

    user_prompt = task.description
    if task.input_data:
        user_prompt += f"\n\n추가 입력 데이터:\n{json.dumps(task.input_data, ensure_ascii=False)}"

    contents = [types.Content(role="user", parts=[types.Part(text=user_prompt)])]

    for _ in range(MAX_TOOL_ROUNDS):
        response = client.models.generate_content(
            model=model,
            contents=contents,
            config=types.GenerateContentConfig(system_instruction=agent.system_prompt, tools=tools),
        )

        if not response.candidates:
            break

        candidate = response.candidates[0]
        parts = candidate.content.parts
        function_calls = [p for p in parts if p.function_call]

        if not function_calls:
            text = "".join(p.text for p in parts if p.text)
            await on_event("delta", {"text": text})
            return text

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
            fn_response_parts.append(types.Part(function_response=types.FunctionResponse(name=tool_name, response=result)))

        contents.append(types.Content(role="user", parts=fn_response_parts))

    response = client.models.generate_content(
        model=model,
        contents=contents,
        config=types.GenerateContentConfig(system_instruction=agent.system_prompt),
    )
    text = response.text if response.text else ""
    await on_event("delta", {"text": text})
    return text
