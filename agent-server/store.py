import json
import os
from typing import Optional
from models import Agent, AgentTask

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")


def _ensure_dir():
    os.makedirs(DATA_DIR, exist_ok=True)


def _read_json(filename: str) -> list[dict]:
    path = os.path.join(DATA_DIR, filename)
    if not os.path.exists(path):
        return []
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def _write_json(filename: str, data: list[dict]):
    _ensure_dir()
    path = os.path.join(DATA_DIR, filename)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


# ── Agents ──

def get_agents() -> list[Agent]:
    return [Agent(**d) for d in _read_json("agents.json")]


def get_agent(agent_id: str) -> Optional[Agent]:
    for d in _read_json("agents.json"):
        if d["id"] == agent_id:
            return Agent(**d)
    return None


def save_agent(agent: Agent):
    agents = _read_json("agents.json")
    agents = [a for a in agents if a["id"] != agent.id]
    agents.append(agent.model_dump())
    _write_json("agents.json", agents)


def delete_agent(agent_id: str) -> bool:
    agents = _read_json("agents.json")
    filtered = [a for a in agents if a["id"] != agent_id]
    if len(filtered) == len(agents):
        return False
    _write_json("agents.json", filtered)
    return True


def update_agent_status(agent_id: str, status: str):
    agents = _read_json("agents.json")
    for a in agents:
        if a["id"] == agent_id:
            a["status"] = status
            break
    _write_json("agents.json", agents)


# ── Tasks ──

def get_tasks(
    agent_id: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = 20,
) -> list[AgentTask]:
    tasks = _read_json("tasks.json")
    if agent_id:
        tasks = [t for t in tasks if t["agent_id"] == agent_id]
    if status:
        tasks = [t for t in tasks if t["status"] == status]
    tasks.sort(key=lambda t: t.get("created_at", ""), reverse=True)
    return [AgentTask(**t) for t in tasks[:limit]]


def get_task(task_id: str) -> Optional[AgentTask]:
    for d in _read_json("tasks.json"):
        if d["id"] == task_id:
            return AgentTask(**d)
    return None


def save_task(task: AgentTask):
    tasks = _read_json("tasks.json")
    tasks = [t for t in tasks if t["id"] != task.id]
    tasks.append(task.model_dump())
    _write_json("tasks.json", tasks)
