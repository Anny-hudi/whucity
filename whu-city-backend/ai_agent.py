"""
AI 预警 Agent
基于阿里百炼 API 实现城市数据分析和预警建议
"""
import json
import dashscope
from dashscope import Generation
from typing import Dict, List, Optional
from config import DASHSCOPE_API_KEY, AI_MODEL, AI_TEMPERATURE, AI_MAX_TOKENS

# 初始化阿里百炼 SDK
dashscope.api_key = DASHSCOPE_API_KEY


class CityWarningAgent:
    """城市预警 AI Agent"""
    
    def __init__(self):
        self.model = AI_MODEL
        self.temperature = AI_TEMPERATURE
        self.max_tokens = AI_MAX_TOKENS
    
    def analyze_city_data(self, stats_data: Dict, include_balance: bool = False) -> Dict:
        """
        分析城市数据并生成预警和建议
        
        Args:
            stats_data: 包含城市统计数据的字典
                - carbon: 碳积分
                - biodiversity: 生物多样性
                - culture: 人文值
                - totalScore: 总评分
                - (可选) population: 人口
                - (可选) pollution: 污染值
                - (可选) economy: 经济值
        
        Returns:
            包含预警和建议的字典
        """
        # 构建提示词
        prompt = self._build_prompt(stats_data, include_balance)
        
        # 重试机制
        max_retries = 3
        retry_delay = 2  # 秒
        
        for attempt in range(max_retries):
            try:
                print(f"🔄 尝试调用阿里百炼 API (第 {attempt + 1}/{max_retries} 次)...")
                print(f"📝 模型: {self.model}, 提示词长度: {len(prompt)}")
                print(f"🔑 API Key: {DASHSCOPE_API_KEY[:10]}...")
                
                # 调用阿里百炼 API（添加超时设置）
                import dashscope
                # 设置请求超时（秒）
                dashscope.default_timeout = 60
                
                response = Generation.call(
                    model=self.model,
                    prompt=prompt,
                    temperature=self.temperature,
                    max_tokens=self.max_tokens,
                    result_format='message',
                    timeout=(10, 60)  # (连接超时, 读取超时)
                )
                
                print(f"📡 API 响应状态码: {response.status_code}")
                
                if response.status_code == 200:
                    # 检查响应格式
                    if not hasattr(response, 'output') or response.output is None:
                        raise Exception("API 响应中没有 output 字段")
                    
                    if not hasattr(response.output, 'choices') or not response.output.choices:
                        raise Exception("API 响应中没有 choices 字段")
                    
                    if len(response.output.choices) == 0:
                        raise Exception("API 响应中 choices 为空")
                    
                    # 解析 AI 返回的内容
                    choice = response.output.choices[0]
                    if not hasattr(choice, 'message') or not hasattr(choice.message, 'content'):
                        raise Exception("API 响应格式错误：缺少 message.content")
                    
                    ai_content = choice.message.content
                    print(f"✅ AI 响应成功，内容长度: {len(ai_content)}")
                    print(f"📄 AI 响应内容预览: {ai_content[:200]}...")
                    return self._parse_ai_response(ai_content, stats_data)
                else:
                    error_msg = f"API 返回错误状态码: {response.status_code}"
                    if hasattr(response, 'message'):
                        error_msg += f", 消息: {response.message}"
                    print(f"❌ {error_msg}")
                    
                    # 如果不是最后一次尝试，继续重试
                    if attempt < max_retries - 1:
                        print(f"⏳ 等待 {retry_delay} 秒后重试...")
                        import time
                        time.sleep(retry_delay)
                        continue
                    else:
                        # 最后一次尝试失败，抛出异常而不是降级
                        raise Exception(f"API 调用失败: {error_msg}")
                
            except (ConnectionError, ConnectionResetError, OSError) as e:
                error_type = type(e).__name__
                error_detail = f"连接错误 (尝试 {attempt + 1}/{max_retries}): {error_type}: {str(e)}"
                print(f"🔌 {error_detail}")
                
                # 检查是否是连接重置错误
                if 'Connection reset' in str(e) or 'Connection aborted' in str(e):
                    print(f"⚠️ 检测到连接重置错误，可能是网络不稳定或服务器端断开连接")
                    print(f"💡 建议：检查网络连接，或稍后重试")
                
                if attempt < max_retries - 1:
                    # 连接错误时增加等待时间
                    wait_time = retry_delay * (attempt + 1)  # 递增等待时间
                    print(f"⏳ 等待 {wait_time} 秒后重试...")
                    import time
                    time.sleep(wait_time)
                    continue
                else:
                    # 最后一次尝试失败，抛出异常
                    raise Exception(f"连接失败，已重试 {max_retries} 次: {error_detail}")
                    
            except Exception as e:
                error_type = type(e).__name__
                error_msg = str(e)
                error_detail = f"{error_type}: {error_msg}"
                print(f"❌ AI Agent 错误 (尝试 {attempt + 1}/{max_retries}): {error_detail}")
                
                # 检查是否是连接相关错误
                connection_errors = ['Connection', 'timeout', 'reset', 'aborted', 'refused']
                is_connection_error = any(err in error_msg for err in connection_errors)
                
                if is_connection_error:
                    print(f"⚠️ 检测到连接相关错误")
                    if attempt < max_retries - 1:
                        wait_time = retry_delay * (attempt + 1)
                        print(f"⏳ 等待 {wait_time} 秒后重试...")
                        import time
                        time.sleep(wait_time)
                        continue
                
                # 打印完整的错误堆栈
                import traceback
                print("📋 完整错误堆栈:")
                traceback.print_exc()
                
                if attempt < max_retries - 1 and not is_connection_error:
                    print(f"⏳ 等待 {retry_delay} 秒后重试...")
                    import time
                    time.sleep(retry_delay)
                    continue
                else:
                    # 最后一次尝试失败，抛出异常而不是降级
                    raise Exception(f"AI Agent 调用失败，已重试 {max_retries} 次: {error_detail}")
        
        # 理论上不会到达这里，但为了安全
        raise Exception("AI Agent 调用失败，未知错误")
    
    def _build_prompt(self, stats_data: Dict, include_balance: bool = False) -> str:
        """构建 AI 提示词"""
        carbon = stats_data.get('carbon', 0)
        biodiversity = stats_data.get('biodiversity', 0)
        culture = stats_data.get('culture', 0)
        total_score = stats_data.get('totalScore', 0)
        balance = stats_data.get('balance', 0)
        
        balance_info = ""
        if include_balance and balance is not None:
            balance_info = f"\n- 玩家余额：{balance}（这是玩家可用于建设的资源，建议需要考虑成本）"
        
        prompt = f"""你是一个专业的城市规划和生态管理 AI 助手。请分析以下城市数据，并提供预警和建设建议。

城市数据：
- 碳积分：{carbon}
- 生物多样性：{biodiversity}
- 人文值：{culture}
- 总评分：{total_score}{balance_info}

请按照以下 JSON 格式返回分析结果：
{{
    "warnings": [
        {{
            "level": "low|medium|high|critical",
            "type": "ecology|humanistic|economy|pollution|other",
            "title": "预警标题",
            "message": "详细预警信息",
            "metric": "carbon|biodiversity|culture|totalScore"
        }}
    ],
    "suggestions": [
        {{
            "priority": "high|medium|low",
            "category": "ecology|humanistic|economy|infrastructure",
            "title": "建议标题",
            "description": "详细建议内容",
            "action": "具体可执行的建设建议"
        }}
    ],
    "summary": "整体城市状况总结（100字以内）",
    "trend": "improving|stable|declining",
    "nextSteps": ["下一步行动1", "下一步行动2"]
}}

要求：
1. 根据数据值判断预警级别（critical: 严重问题, high: 需要关注, medium: 一般问题, low: 轻微提醒）
2. 提供3-5条具体的建设建议
3. 建议要具体可执行
4. 重点关注生态平衡和可持续发展
5. 如果某个指标过低，给出针对性的提升建议
{f"6. 如果提供了玩家余额，请在建议中考虑成本，优先推荐性价比高的建设方案，避免超出预算的建议" if include_balance and balance else ""}

请直接返回 JSON 格式，不要包含其他文字说明。"""

        return prompt
    
    def _parse_ai_response(self, ai_content: str, stats_data: Dict) -> Dict:
        """解析 AI 返回的内容"""
        try:
            # 尝试提取 JSON（AI 可能返回带 markdown 代码块的内容）
            content = ai_content.strip()
            
            # 移除可能的 markdown 代码块标记
            if content.startswith("```json"):
                content = content[7:]
            if content.startswith("```"):
                content = content[3:]
            if content.endswith("```"):
                content = content[:-3]
            
            content = content.strip()
            
            # 解析 JSON
            result = json.loads(content)
            
            # 添加时间戳和元数据
            result['timestamp'] = self._get_timestamp()
            result['dataSnapshot'] = stats_data
            
            return result
            
        except json.JSONDecodeError as e:
            print(f"JSON 解析错误: {e}")
            print(f"AI 返回内容: {ai_content}")
            # 如果解析失败，使用基础预警
            return self._generate_fallback_warning(stats_data)
    
    def _generate_fallback_warning(self, stats_data: Dict) -> Dict:
        """生成基础预警（当 AI 调用失败时）"""
        warnings = []
        suggestions = []
        
        carbon = stats_data.get('carbon', 0)
        biodiversity = stats_data.get('biodiversity', 0)
        culture = stats_data.get('culture', 0)
        total_score = stats_data.get('totalScore', 0)
        
        # 基于规则的基础预警
        if carbon < 500:
            warnings.append({
                "level": "high",
                "type": "ecology",
                "title": "碳积分不足",
                "message": f"当前碳积分为 {carbon}，建议增加绿化建设以提升生态值",
                "metric": "carbon"
            })
            suggestions.append({
                "priority": "high",
                "category": "ecology",
                "title": "增加绿化建设",
                "description": "通过种植树木、建设公园等方式提升碳积分",
                "action": "在空地上建设更多绿化设施"
            })
        
        if biodiversity < 50:
            warnings.append({
                "level": "medium",
                "type": "ecology",
                "title": "生物多样性偏低",
                "message": f"当前生物多样性为 {biodiversity}，建议增加生态多样性",
                "metric": "biodiversity"
            })
            suggestions.append({
                "priority": "medium",
                "category": "ecology",
                "title": "提升生物多样性",
                "description": "建设更多生态设施，吸引更多生物",
                "action": "建设生态公园、湿地等生态设施"
            })
        
        if culture < 50:
            warnings.append({
                "level": "medium",
                "type": "humanistic",
                "title": "人文值偏低",
                "message": f"当前人文值为 {culture}，建议增加文化设施建设",
                "metric": "culture"
            })
            suggestions.append({
                "priority": "medium",
                "category": "humanistic",
                "title": "增加文化设施",
                "description": "建设图书馆、博物馆等文化设施提升人文值",
                "action": "在城市中建设更多文化建筑"
            })
        
        if total_score < 50:
            warnings.append({
                "level": "critical",
                "type": "other",
                "title": "城市综合评分偏低",
                "message": f"当前总评分为 {total_score}，需要全面提升各项指标",
                "metric": "totalScore"
            })
        
        return {
            "warnings": warnings,
            "suggestions": suggestions,
            "summary": f"城市当前状态：碳积分 {carbon}，生物多样性 {biodiversity}，人文值 {culture}，总评分 {total_score}。需要关注生态和人文建设。",
            "trend": "stable",
            "nextSteps": ["提升碳积分", "增加生物多样性", "建设文化设施"],
            "timestamp": self._get_timestamp(),
            "dataSnapshot": stats_data,
            "fallback": True  # 标记这是备用方案
        }
    
    def _get_timestamp(self) -> str:
        """获取当前时间戳"""
        from datetime import datetime
        return datetime.now().isoformat()


# 创建全局 agent 实例
agent = CityWarningAgent()

