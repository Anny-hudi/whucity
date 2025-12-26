/**
 * AI 预警 API 服务
 */
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

/**
 * 获取城市预警和建议
 * @param {Object} statsData - 城市统计数据
 * @returns {Promise<Object>} 预警和建议数据
 */
export async function getCityWarning(statsData) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/warning`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        carbon: statsData.carbon || 0,
        biodiversity: statsData.biodiversity || 0,
        culture: statsData.culture || 0,
        totalScore: statsData.totalScore || null,
      }),
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error('获取预警失败:', error)
    throw error
  }
}

/**
 * 获取城市 AI 分析（包含余额等更多数据）
 * @param {Object} data - 城市数据（包括余额等）
 * @returns {Promise<Object>} 分析结果
 */
export async function getCityAnalysis(data) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/analysis`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        carbon: data.carbon || 0,
        biodiversity: data.biodiversity || 0,
        culture: data.culture || 0,
        totalScore: data.totalScore || null,
        balance: data.balance || 0, // 玩家余额
      }),
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const result = await response.json()
    return result
  } catch (error) {
    console.error('获取 AI 分析失败:', error)
    throw error
  }
}

/**
 * 健康检查
 */
export async function checkApiHealth() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/health`)
    return response.ok
  } catch (error) {
    return false
  }
}

