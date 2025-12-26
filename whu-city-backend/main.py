"""
WHU City Backend - AI 预警系统 API
"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict
from ai_agent import agent
from config import CORS_ORIGINS, HOST, PORT
import uvicorn

app = FastAPI(title="WHU City AI Warning System", version="1.0.0")

# 配置 CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# 请求模型
class CityStatsRequest(BaseModel):
    """城市统计数据请求"""
    carbon: float
    biodiversity: float
    culture: float
    totalScore: Optional[float] = None
    population: Optional[float] = None
    pollution: Optional[float] = None
    economy: Optional[float] = None
    timestamp: Optional[str] = None


class CityAnalysisRequest(BaseModel):
    """城市 AI 分析请求（包含余额等更多数据）"""
    carbon: float
    biodiversity: float
    culture: float
    totalScore: Optional[float] = None
    balance: float = 0  # 玩家余额
    population: Optional[float] = None
    pollution: Optional[float] = None
    economy: Optional[float] = None


# 响应模型
class Warning(BaseModel):
    """预警信息"""
    level: str  # low, medium, high, critical
    type: str  # ecology, humanistic, economy, pollution, other
    title: str
    message: str
    metric: str


class Suggestion(BaseModel):
    """建设建议"""
    priority: str  # high, medium, low
    category: str  # ecology, humanistic, economy, infrastructure
    title: str
    description: str
    action: str


class WarningResponse(BaseModel):
    """预警响应"""
    warnings: List[Warning]
    suggestions: List[Suggestion]
    summary: str
    trend: str  # improving, stable, declining
    nextSteps: List[str]
    timestamp: str
    dataSnapshot: Dict


@app.get("/")
async def root():
    """根路径"""
    return {
        "message": "WHU City AI Warning System",
        "version": "1.0.0",
        "endpoints": {
            "POST /api/warning": "获取城市预警和建议",
            "GET /api/health": "健康检查"
        }
    }


@app.get("/api/health")
async def health_check():
    """健康检查"""
    return {"status": "healthy", "service": "whu-city-ai-warning"}


@app.post("/api/warning", response_model=WarningResponse)
async def get_warning(request: CityStatsRequest):
    """
    获取城市预警和建议
    
    根据城市统计数据（碳积分、生物多样性、人文值等）生成 AI 预警和建设建议
    """
    try:
        # 构建统计数据字典
        stats_data = {
            "carbon": request.carbon,
            "biodiversity": request.biodiversity,
            "culture": request.culture,
            "totalScore": request.totalScore or (request.carbon * 0.4 + request.biodiversity * 0.3 + request.culture * 0.3) / 10
        }
        
        # 添加可选字段
        if request.population is not None:
            stats_data["population"] = request.population
        if request.pollution is not None:
            stats_data["pollution"] = request.pollution
        if request.economy is not None:
            stats_data["economy"] = request.economy
        
        # 调用 AI Agent 分析
        result = agent.analyze_city_data(stats_data)
        
        # 转换为响应模型
        return WarningResponse(
            warnings=[Warning(**w) for w in result.get("warnings", [])],
            suggestions=[Suggestion(**s) for s in result.get("suggestions", [])],
            summary=result.get("summary", ""),
            trend=result.get("trend", "stable"),
            nextSteps=result.get("nextSteps", []),
            timestamp=result.get("timestamp", ""),
            dataSnapshot=result.get("dataSnapshot", {})
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"处理请求时出错: {str(e)}")


@app.post("/api/analysis", response_model=WarningResponse)
async def get_analysis(request: CityAnalysisRequest):
    """
    获取城市 AI 深度分析（包含余额等更多数据）
    
    根据城市统计数据（包括玩家余额）生成 AI 分析和建设建议
    考虑玩家的建设边界（余额限制）
    """
    try:
        print(f"📥 收到分析请求: carbon={request.carbon}, biodiversity={request.biodiversity}, culture={request.culture}, balance={request.balance}")
        
        # 构建统计数据字典
        stats_data = {
            "carbon": request.carbon,
            "biodiversity": request.biodiversity,
            "culture": request.culture,
            "totalScore": request.totalScore or (request.carbon * 0.4 + request.biodiversity * 0.3 + request.culture * 0.3) / 10,
            "balance": request.balance  # 玩家余额
        }
        
        # 添加可选字段
        if request.population is not None:
            stats_data["population"] = request.population
        if request.pollution is not None:
            stats_data["pollution"] = request.pollution
        if request.economy is not None:
            stats_data["economy"] = request.economy
        
        print(f"🔍 开始调用 AI Agent 分析...")
        
        # 调用 AI Agent 分析（传入余额信息）
        result = agent.analyze_city_data(stats_data, include_balance=True)
        
        print(f"✅ AI 分析完成，返回结果")
        
        # 转换为响应模型
        return WarningResponse(
            warnings=[Warning(**w) for w in result.get("warnings", [])],
            suggestions=[Suggestion(**s) for s in result.get("suggestions", [])],
            summary=result.get("summary", ""),
            trend=result.get("trend", "stable"),
            nextSteps=result.get("nextSteps", []),
            timestamp=result.get("timestamp", ""),
            dataSnapshot=result.get("dataSnapshot", {})
        )
        
    except Exception as e:
        error_type = type(e).__name__
        error_msg = str(e)
        print(f"❌ API 处理错误: {error_type}: {error_msg}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"AI 分析失败: {error_type}: {error_msg}")


if __name__ == "__main__":
    uvicorn.run(app, host=HOST, port=PORT, log_level="info")

