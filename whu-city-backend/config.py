import os
from dotenv import load_dotenv

load_dotenv()

# 阿里百炼 API 配置
DASHSCOPE_API_KEY = os.getenv("DASHSCOPE_API_KEY", "sk-d9b091b847c443488990dc8b9e874763")
DASHSCOPE_BASE_URL = "https://dashscope.aliyuncs.com/compatible-mode/v1"

# 服务器配置
HOST = os.getenv("HOST", "0.0.0.0")
PORT = int(os.getenv("PORT", 8000))
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:5174,http://localhost:5175").split(",")

# AI 模型配置
AI_MODEL = "qwen-turbo"  # 或 "qwen-plus", "qwen-max" 等
AI_TEMPERATURE = 0.7
AI_MAX_TOKENS = 2000

