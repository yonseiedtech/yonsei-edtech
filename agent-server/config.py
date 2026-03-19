import os
import secrets
from dotenv import load_dotenv

load_dotenv()

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
GOOGLE_API_KEY = os.getenv("GOOGLE_GENERATIVE_AI_API_KEY", "")
FIREBASE_SA_KEY = os.getenv("FIREBASE_SERVICE_ACCOUNT_KEY", "")
PORT = int(os.getenv("PORT", "8400"))
HOST = os.getenv("HOST", "127.0.0.1")

AUTH_TOKEN = os.getenv("AUTH_TOKEN") or secrets.token_urlsafe(32)

# OpenAI 키가 있으면 OpenAI 사용, 없으면 Gemini
USE_OPENAI = bool(OPENAI_API_KEY)

MODEL_FAST = "gpt-4o-mini" if USE_OPENAI else "gemini-2.0-flash"
MODEL_QUALITY = "gpt-4o-mini" if USE_OPENAI else "gemini-2.0-flash"
MAX_TOOL_ROUNDS = 5
