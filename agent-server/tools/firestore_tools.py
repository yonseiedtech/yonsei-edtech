import base64
import json
from typing import Optional
import firebase_admin
from firebase_admin import credentials, firestore
from config import FIREBASE_SA_KEY
from tools.registry import register_tool

_app = None
_db = None


def _get_db():
    global _app, _db
    if _db is not None:
        return _db
    if not FIREBASE_SA_KEY:
        raise RuntimeError("FIREBASE_SERVICE_ACCOUNT_KEY 환경변수가 설정되지 않았습니다.")
    sa = json.loads(base64.b64decode(FIREBASE_SA_KEY).decode("utf-8"))
    if not firebase_admin._apps:
        _app = firebase_admin.initialize_app(credentials.Certificate(sa))
    _db = firestore.client()
    return _db


@register_tool(
    name="firestore_read",
    description="Firestore 컬렉션에서 문서를 조회합니다.",
    parameters={
        "collection": {"type": "string", "description": "컬렉션명 (seminars, posts, users, inquiries)"},
        "doc_id": {"type": "string", "description": "특정 문서 ID (없으면 목록 조회)"},
        "limit": {"type": "integer", "description": "조회 개수 (기본 10)"},
    },
)
async def firestore_read(
    collection: str,
    doc_id: Optional[str] = None,
    limit: int = 10,
    **kwargs,
) -> dict:
    db = _get_db()
    allowed = {"seminars", "posts", "users", "inquiries", "seminar_attendees"}
    if collection not in allowed:
        return {"error": f"허용되지 않은 컬렉션: {collection}. 허용: {allowed}"}

    if doc_id:
        doc = db.collection(collection).document(doc_id).get()
        if not doc.exists:
            return {"error": f"문서를 찾을 수 없습니다: {collection}/{doc_id}"}
        data = doc.to_dict()
        data["id"] = doc.id
        return {"document": _serialize(data)}

    docs = db.collection(collection).limit(limit).stream()
    results = []
    for doc in docs:
        d = doc.to_dict()
        d["id"] = doc.id
        results.append(_serialize(d))
    return {"documents": results, "count": len(results)}


@register_tool(
    name="firestore_write",
    description="Firestore 문서를 생성/수정합니다.",
    parameters={
        "collection": {"type": "string", "description": "컬렉션명"},
        "doc_id": {"type": "string", "description": "문서 ID (없으면 자동 생성)"},
        "data": {"type": "object", "description": "저장할 데이터"},
    },
)
async def firestore_write(
    collection: str,
    data: dict,
    doc_id: Optional[str] = None,
    **kwargs,
) -> dict:
    db = _get_db()
    allowed = {"posts", "inquiries"}
    if collection not in allowed:
        return {"error": f"쓰기 허용되지 않은 컬렉션: {collection}. 허용: {allowed}"}

    if doc_id:
        db.collection(collection).document(doc_id).set(data, merge=True)
        return {"success": True, "doc_id": doc_id}
    else:
        ref = db.collection(collection).add(data)
        return {"success": True, "doc_id": ref[1].id}


def _serialize(data: dict) -> dict:
    """Firestore 타입을 JSON 직렬화 가능 형태로 변환"""
    result = {}
    for k, v in data.items():
        if hasattr(v, "isoformat"):
            result[k] = v.isoformat()
        elif isinstance(v, list):
            result[k] = [_serialize(i) if isinstance(i, dict) else i for i in v]
        elif isinstance(v, dict):
            result[k] = _serialize(v)
        else:
            result[k] = v
    return result
