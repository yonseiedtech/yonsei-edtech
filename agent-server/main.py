import asyncio
import uuid
from datetime import datetime, timezone
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from sse_starlette.sse import EventSourceResponse

from config import AUTH_TOKEN, HOST, PORT
from models import (
    Agent, AgentTask, AgentCreate, AgentUpdate, TaskCreate,
    AgentStatus, TaskStatus,
)
from store import (
    get_agents, get_agent, save_agent, delete_agent,
    get_tasks, get_task, save_task,
)
from agents.presets import init_presets
from agents.runner import execute_task, stream_task_events

# 도구 모듈 import (등록 트리거)
import tools.firestore_tools  # noqa: F401
import tools.content_tools    # noqa: F401


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_presets()
    print(f"\n{'='*50}")
    print(f"  에이전트 서버 시작")
    print(f"  URL:   http://{HOST}:{PORT}")
    print(f"  토큰:  {AUTH_TOKEN}")
    print(f"{'='*50}\n")
    yield


app = FastAPI(title="Yonsei EdTech Agent Server", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── 인증 ──

async def verify_token(authorization: str = Header(default="")):
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="인증 토큰이 필요합니다.")
    token = authorization[7:]
    if token != AUTH_TOKEN:
        raise HTTPException(status_code=401, detail="유효하지 않은 토큰입니다.")


# ── Health ──

@app.get("/health")
async def health():
    agents = get_agents()
    running = sum(1 for a in agents if a.status == AgentStatus.running)
    return {"status": "ok", "version": "1.0.0", "agents": len(agents), "running_tasks": running}


# ── Agents CRUD ──

@app.get("/agents", dependencies=[Depends(verify_token)])
async def list_agents():
    return [a.model_dump() for a in get_agents()]


@app.get("/agents/{agent_id}", dependencies=[Depends(verify_token)])
async def get_agent_detail(agent_id: str):
    agent = get_agent(agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="에이전트를 찾을 수 없습니다.")
    return agent.model_dump()


@app.post("/agents", status_code=201, dependencies=[Depends(verify_token)])
async def create_agent(body: AgentCreate):
    now = datetime.now(timezone.utc).isoformat()
    agent = Agent(
        id=str(uuid.uuid4())[:8],
        name=body.name,
        role=body.role,
        avatar=body.avatar,
        system_prompt=body.system_prompt,
        tools=body.tools,
        model=body.model,
        status=AgentStatus.idle,
        is_preset=False,
        created_at=now,
        updated_at=now,
    )
    save_agent(agent)
    return agent.model_dump()


@app.put("/agents/{agent_id}", dependencies=[Depends(verify_token)])
async def update_agent_endpoint(agent_id: str, body: AgentUpdate):
    agent = get_agent(agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="에이전트를 찾을 수 없습니다.")

    update_data = body.model_dump(exclude_none=True)
    if agent.is_preset:
        update_data.pop("name", None)

    for key, value in update_data.items():
        setattr(agent, key, value)
    agent.updated_at = datetime.now(timezone.utc).isoformat()
    save_agent(agent)
    return agent.model_dump()


@app.delete("/agents/{agent_id}", dependencies=[Depends(verify_token)])
async def delete_agent_endpoint(agent_id: str):
    agent = get_agent(agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="에이전트를 찾을 수 없습니다.")
    if agent.is_preset:
        raise HTTPException(status_code=403, detail="프리셋 에이전트는 삭제할 수 없습니다.")
    delete_agent(agent_id)
    return {"success": True}


# ── Tasks ──

@app.get("/tasks", dependencies=[Depends(verify_token)])
async def list_tasks(agent_id: str = None, status: str = None, limit: int = 20):
    return [t.model_dump() for t in get_tasks(agent_id=agent_id, status=status, limit=limit)]


@app.get("/tasks/{task_id}", dependencies=[Depends(verify_token)])
async def get_task_detail(task_id: str):
    task = get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="작업을 찾을 수 없습니다.")
    return task.model_dump()


@app.post("/tasks", status_code=201, dependencies=[Depends(verify_token)])
async def create_task(body: TaskCreate):
    agent = get_agent(body.agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="에이전트를 찾을 수 없습니다.")
    if agent.status == AgentStatus.running:
        raise HTTPException(status_code=409, detail="에이전트가 이미 작업 중입니다.")

    now = datetime.now(timezone.utc).isoformat()
    task = AgentTask(
        id=str(uuid.uuid4())[:8],
        agent_id=body.agent_id,
        title=body.title,
        description=body.description,
        type=body.type,
        status=TaskStatus.pending,
        input_data=body.input_data,
        created_at=now,
    )
    save_task(task)

    # 백그라운드 실행
    asyncio.create_task(execute_task(task))

    return task.model_dump()


@app.get("/tasks/{task_id}/stream", dependencies=[Depends(verify_token)])
async def stream_task(task_id: str):
    return EventSourceResponse(stream_task_events(task_id))


# ── Main ──

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host=HOST, port=PORT, reload=True)
