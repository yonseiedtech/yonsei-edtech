import os
import secrets
from dotenv import load_dotenv

load_dotenv()

GOOGLE_API_KEY = os.getenv("GOOGLE_GENERATIVE_AI_API_KEY", "")
FIREBASE_SA_KEY = os.getenv("FIREBASE_SERVICE_ACCOUNT_KEY", "")
PORT = int(os.getenv("PORT", "8400"))
HOST = os.getenv("HOST", "127.0.0.1")

# 인증 토큰: 환경변수에 없으면 자동 생성
AUTH_TOKEN = os.getenv("AUTH_TOKEN") or secrets.token_urlsafe(32)

MODEL_FAST = "gemini-2.0-flash"
MODEL_QUALITY = "gemini-2.0-flash"
MAX_TOOL_ROUNDS = 5
