from pydantic import BaseModel
from typing import Optional
from enum import Enum


class ModelType(str, Enum):
    fast = "fast"
    quality = "quality"


class AgentStatus(str, Enum):
    idle = "idle"
    running = "running"
    error = "error"


class TaskStatus(str, Enum):
    pending = "pending"
    running = "running"
    completed = "completed"
    failed = "failed"


class TaskType(str, Enum):
    content = "content"
    analysis = "analysis"
    automation = "automation"
    document = "document"


class Agent(BaseModel):
    id: str
    name: str
    role: str
    avatar: str
    system_prompt: str
    tools: list[str] = []
    model: ModelType = ModelType.fast
    status: AgentStatus = AgentStatus.idle
    is_preset: bool = False
    created_at: str = ""
    updated_at: str = ""


class AgentTask(BaseModel):
    id: str
    agent_id: str
    title: str
    description: str
    type: TaskType = TaskType.content
    status: TaskStatus = TaskStatus.pending
    input_data: dict = {}
    output: Optional[str] = None
    error: Optional[str] = None
    started_at: Optional[str] = None
    completed_at: Optional[str] = None
    created_at: str = ""


# --- Request / Response ---

class AgentCreate(BaseModel):
    name: str
    role: str
    avatar: str = "🤖"
    system_prompt: str
    tools: list[str] = []
    model: ModelType = ModelType.fast


class AgentUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    avatar: Optional[str] = None
    system_prompt: Optional[str] = None
    tools: Optional[list[str]] = None
    model: Optional[ModelType] = None


class TaskCreate(BaseModel):
    agent_id: str
    title: str
    description: str
    type: TaskType = TaskType.content
    input_data: dict = {}
