# WHU City Backend - AI 预警系统

基于阿里百炼 AI 的城市数据预警和建议系统。

## 功能

- 实时分析城市统计数据（碳积分、生物多样性、人文值等）
- AI 驱动的预警系统
- 智能建设建议生成
- RESTful API 接口

## 安装

```bash
# 创建虚拟环境（推荐使用 class 环境）
conda activate class

# 安装依赖
pip install -r requirements.txt
```

## 配置

复制 `.env.example` 为 `.env` 并配置：

```bash
cp .env.example .env
```

编辑 `.env` 文件，设置阿里百炼 API Key 和其他配置。

## 运行

```bash
# 启动服务器
python main.py

# 或使用 uvicorn
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

服务器将在 http://localhost:8000 启动。

## API 文档

启动后访问：
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## API 端点

### POST /api/warning

获取城市预警和建议。

**请求体：**
```json
{
  "carbon": 1000,
  "biodiversity": 50,
  "culture": 30,
  "totalScore": 65,
  "population": 1000,
  "pollution": 20
}
```

**响应：**
```json
{
  "warnings": [
    {
      "level": "medium",
      "type": "humanistic",
      "title": "人文值偏低",
      "message": "当前人文值为 30，建议增加文化设施建设",
      "metric": "culture"
    }
  ],
  "suggestions": [
    {
      "priority": "high",
      "category": "humanistic",
      "title": "增加文化设施",
      "description": "建设图书馆、博物馆等文化设施",
      "action": "在城市中建设更多文化建筑"
    }
  ],
  "summary": "城市当前状态总结...",
  "trend": "stable",
  "nextSteps": ["下一步行动1", "下一步行动2"],
  "timestamp": "2024-01-01T00:00:00",
  "dataSnapshot": {...}
}
```

## 技术栈

- FastAPI: Web 框架
- Dashscope: 阿里百炼 SDK
- Uvicorn: ASGI 服务器

