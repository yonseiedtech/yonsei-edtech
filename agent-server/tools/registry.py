from typing import Any, Callable

TOOL_FUNCTIONS: dict[str, Callable] = {}
TOOL_DECLARATIONS: list[dict] = []


def register_tool(name: str, description: str, parameters: dict):
    """도구 등록 데코레이터 팩토리"""
    def decorator(fn: Callable):
        TOOL_FUNCTIONS[name] = fn
        TOOL_DECLARATIONS.append({
            "name": name,
            "description": description,
            "parameters": {
                "type": "object",
                "properties": parameters,
            },
        })
        return fn
    return decorator


def get_tools_for_agent(tool_names: list[str]) -> tuple[list[dict], dict[str, Callable]]:
    """에이전트에 할당된 도구 선언 + 함수 매핑 반환"""
    declarations = [d for d in TOOL_DECLARATIONS if d["name"] in tool_names]
    functions = {n: TOOL_FUNCTIONS[n] for n in tool_names if n in TOOL_FUNCTIONS}
    return declarations, functions


def get_all_tool_names() -> list[str]:
    return list(TOOL_FUNCTIONS.keys())
