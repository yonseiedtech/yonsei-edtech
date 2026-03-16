import asyncio
import json
from datetime import datetime, timezone
from typing import AsyncGenerator
from models import AgentTask, TaskStatus
from store import get_agent, save_task, update_agent_status
from agents.base import run_agent

# 실행 중인 태스크의 SSE 이벤트 큐
_task_queues: dict[str, asyncio.Queue] = {}


async def execute_task(task: AgentTask):
    """백그라운드에서 에이전트 작업 실행"""
    agent = get_agent(task.agent_id)
    if not agent:
        task.status = TaskStatus.failed
        task.error = f"에이전트를 찾을 수 없습니다: {task.agent_id}"
        save_task(task)
        return

    queue = asyncio.Queue()
    _task_queues[task.id] = queue

    try:
        # 상태 업데이트
        task.status = TaskStatus.running
        task.started_at = datetime.now(timezone.utc).isoformat()
        save_task(task)
        update_agent_status(agent.id, "running")

        async def on_event(event_type: str, data: dict):
            await queue.put({"type": event_type, "data": data})

        # 에이전트 실행
        result = await run_agent(agent, task, on_event)

        # 완료
        task.status = TaskStatus.completed
        task.output = result
        task.completed_at = datetime.now(timezone.utc).isoformat()
        save_task(task)

        await queue.put({"type": "complete", "data": {"output": result}})

    except Exception as e:
        task.status = TaskStatus.failed
        task.error = str(e)
        task.completed_at = datetime.now(timezone.utc).isoformat()
        save_task(task)
        await queue.put({"type": "error", "data": {"error": str(e)}})

    finally:
        update_agent_status(agent.id, "idle")
        await queue.put(None)  # 스트림 종료 시그널


async def stream_task_events(task_id: str) -> AsyncGenerator[str, None]:
    """SSE 이벤트 스트림 생성"""
    queue = _task_queues.get(task_id)
    if not queue:
        yield f"event: error\ndata: {json.dumps({'error': '스트림을 찾을 수 없습니다.'})}\n\n"
        return

    while True:
        event = await queue.get()
        if event is None:
            break
        yield f"event: {event['type']}\ndata: {json.dumps(event['data'], ensure_ascii=False)}\n\n"

    # 정리
    _task_queues.pop(task_id, None)
