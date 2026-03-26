"""
Yonsei EdTech Agent Server — MCP 서버
기존 도구(firestore_read, firestore_write, generate_text)를 MCP 프로토콜로 노출합니다.

실행: python mcp_server.py
또는 Claude Code settings.json에 등록하여 자동 실행
"""
import asyncio
import json
from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import Tool, TextContent

# 도구 모듈 import (등록 트리거)
import tools.firestore_tools  # noqa: F401
import tools.content_tools    # noqa: F401
from tools.registry import TOOL_DECLARATIONS, TOOL_FUNCTIONS

server = Server("yonsei-edtech-agent")


@server.list_tools()
async def list_tools() -> list[Tool]:
    """등록된 모든 도구를 MCP Tool 형식으로 반환"""
    mcp_tools = []
    for td in TOOL_DECLARATIONS:
        mcp_tools.append(Tool(
            name=td["name"],
            description=td["description"],
            inputSchema=td["parameters"],
        ))
    return mcp_tools


@server.call_tool()
async def call_tool(name: str, arguments: dict) -> list[TextContent]:
    """도구 호출을 기존 tool_functions로 라우팅"""
    if name not in TOOL_FUNCTIONS:
        return [TextContent(type="text", text=json.dumps(
            {"error": f"알 수 없는 도구: {name}. 사용 가능: {list(TOOL_FUNCTIONS.keys())}"},
            ensure_ascii=False,
        ))]

    try:
        result = await TOOL_FUNCTIONS[name](**arguments)
        return [TextContent(type="text", text=json.dumps(result, ensure_ascii=False, default=str))]
    except Exception as e:
        return [TextContent(type="text", text=json.dumps(
            {"error": str(e)},
            ensure_ascii=False,
        ))]


async def main():
    async with stdio_server() as (read_stream, write_stream):
        await server.run(read_stream, write_stream, server.create_initialization_options())


if __name__ == "__main__":
    asyncio.run(main())
