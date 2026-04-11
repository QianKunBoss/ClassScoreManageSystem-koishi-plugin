import { Context } from 'koishi'

export interface CsmsUser {
  id: number
  username: string
  qq_number: string | null
  total_score: number
  add_score: number
  deduct_score: number
  score_count: number
  group_index?: number
  row_index?: number
  col_index?: number
  created_at: string
}

export interface CsmsScoreLog {
  id: number
  user_id: number
  score_change: number
  description: string
  created_at: string
}

export interface AddScoreUser {
  username: string
  score_change: number
}

export interface AddScoreBatchData {
  users: AddScoreUser[]
  description: string
}

export interface AddScoreResult {
  success: boolean
  message: string
  summary: {
    success_count: number
    failed_count: number
    total_count: number
  }
  details: Array<{
    username: string
    user_id?: number
    score_change: number
    success: boolean
    error?: string
  }>
}

export interface ApiResponse<T = any> {
  data?: T
  error?: string
  success?: boolean
  message?: string
  total?: number
  limit?: number
  offset?: number
}

export class CsmsApiService {
  private baseUrl: string
  private token: string
  private ctx: Context

  constructor(ctx: Context, baseUrl: string, token: string) {
    this.ctx = ctx
    this.baseUrl = baseUrl.replace(/\/api\/global_api\.php$/, '').replace(/\/$/, '')
    this.token = token
  }

  /**
   * 发送 API 请求
   * 按照 global_api.md 文档规范实现
   */
  private async request<T>(params: Record<string, string | number | undefined>): Promise<ApiResponse<T>> {
    try {
      const url = `${this.baseUrl}/api/global_api.php`
      // 过滤掉 undefined 值
      const cleanParams: Record<string, string> = {}
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null) {
          cleanParams[key] = String(value)
        }
      }
      
      this.ctx.logger.debug(`API请求: ${url}`, cleanParams)
      
      const response = await this.ctx.http.get<ApiResponse<T>>(url, { 
        params: cleanParams,
        headers: {
          'Authorization': this.token,
        }
      })
      
      this.ctx.logger.debug(`API响应:`, response)
      return response
    } catch (error: any) {
      this.ctx.logger.error('CSMS API 请求失败:', error)
      return { error: error.message || 'API请求失败' }
    }
  }

  /**
   * 验证 Token - 使用自定义的 add_score 接口测试
   * 注意: 文档未提供专门的 validate_token 接口，用此方法间接验证
   */
  async validateToken(): Promise<{ valid: boolean; username?: string }> {
    try {
      // 尝试调用 add_score 接口（需要有效token），传入无效数据来检测token是否有效
      const url = `${this.baseUrl}/api/global_api.php`
      const params = {
        action: 'add_score',
        data: JSON.stringify({
          username: '__validate__',
          score_change: 0,
          description: '__token_validation__'
        }),
        token: this.token,
      }
      
      this.ctx.logger.info(`验证Token中...`)
      const response = await this.ctx.http.get<ApiResponse>(url, { params })
      
      // 如果返回 error: "用户不存在" 或类似，说明 token 有效
      // 如果返回 error: "未授权" 或 "Token无效"，说明 token 无效
      if (response.error) {
        const errorLower = response.error.toLowerCase()
        if (errorLower.includes('未授权') || errorLower.includes('token') || errorLower.includes('无效')) {
          this.ctx.logger.warn(`Token验证失败: ${response.error}`)
          return { valid: false }
        }
        // 其他错误（如用户不存在）说明token有效
        this.ctx.logger.info(`Token验证成功`)
        return { valid: true }
      }
      
      return { valid: true }
    } catch (error: any) {
      this.ctx.logger.error(`Token验证异常:`, error)
      return { valid: false }
    }
  }

  /**
   * 查询用户列表
   * GET /api/global_api.php?users&order_by=xxx&order=DESC&limit=20&offset=0
   */
  async getUsers(options?: {
    where?: Record<string, any>
    order_by?: string
    order?: 'ASC' | 'DESC'
    limit?: number
    offset?: number
    search?: string
  }): Promise<ApiResponse<CsmsUser[]>> {
    const params: Record<string, string> = { users: '' }
    
    if (options?.where) {
      params.where = JSON.stringify(options.where)
    }
    if (options?.order_by) {
      params.order_by = options.order_by
    }
    if (options?.order) {
      params.order = options.order
    }
    if (options?.limit !== undefined) {
      params.limit = options.limit.toString()
    }
    if (options?.offset !== undefined) {
      params.offset = options.offset.toString()
    }
    if (options?.search) {
      params.search = options.search
    }
    
    return this.request<CsmsUser[]>(params)
  }

  /**
   * 查询单个用户
   * GET /api/global_api.php?users&id=xxx
   */
  async getUserById(id: number): Promise<ApiResponse<CsmsUser[]>> {
    return this.request<CsmsUser[]>({ users: '', id: id.toString() })
  }

  /**
   * 按用户名查询用户
   * GET /api/global_api.php?users&where={"username":"xxx"}
   */
  async getUserByUsername(username: string): Promise<ApiResponse<CsmsUser[]>> {
    return this.request<CsmsUser[]>({ 
      users: '', 
      where: JSON.stringify({ username }) 
    })
  }

  /**
   * 按QQ号查询用户
   * GET /api/global_api.php?users&where={"qq_number":"xxx"}
   */
  async getUserByQq(qqNumber: string): Promise<ApiResponse<CsmsUser[]>> {
    return this.request<CsmsUser[]>({ 
      users: '', 
      where: JSON.stringify({ qq_number: qqNumber }) 
    })
  }

  /**
   * 获取排行榜（按 total_score 降序）
   * GET /api/global_api.php?users&order_by=total_score&order=DESC&limit=20
   */
  async getRanking(limit: number = 20, offset: number = 0): Promise<ApiResponse<CsmsUser[]>> {
    return this.request<CsmsUser[]>({
      users: '',
      order_by: 'total_score',
      order: 'DESC',
      limit: limit.toString(),
      offset: offset.toString(),
    })
  }

  /**
   * 查询积分记录
   * GET /api/global_api.php?score_logs&where={"user_id":xxx}&order_by=created_at&order=DESC&limit=50
   */
  async getScoreLogs(userId: number, limit: number = 50): Promise<ApiResponse<CsmsScoreLog[]>> {
    return this.request<CsmsScoreLog[]>({
      score_logs: '',
      where: JSON.stringify({ user_id: userId }),
      order_by: 'created_at',
      order: 'DESC',
      limit: limit.toString(),
    })
  }

  /**
   * 创建新用户
   * GET /api/global_api.php?users&action=create&data={"username":"xxx"}&token=xxx
   */
  async createUser(username: string): Promise<ApiResponse<CsmsUser>> {
    return this.request<CsmsUser>({
      users: '',
      action: 'create',
      data: JSON.stringify({ username }),
    })
  }

  /**
   * 更新用户信息（如绑定QQ号）
   * GET /api/global_api.php?users&action=update&id=xxx&data={"qq_number":"xxx"}&token=xxx
   */
  async updateUser(userId: number, data: Record<string, any>): Promise<ApiResponse<CsmsUser>> {
    return this.request<CsmsUser>({
      users: '',
      action: 'update',
      id: userId.toString(),
      data: JSON.stringify(data),
    })
  }

  /**
   * 绑定用户QQ号
   */
  async bindQq(userId: number, qqNumber: string): Promise<ApiResponse<CsmsUser>> {
    return this.updateUser(userId, { qq_number: qqNumber })
  }

  /**
   * 批量加减分
   * GET /api/global_api.php?action=add_score&data={"users":[...],"description":"xxx"}&token=xxx
   */
  async batchAddScore(data: AddScoreBatchData): Promise<AddScoreResult> {
    this.ctx.logger.info(`batchAddScore 请求数据:`, JSON.stringify(data))
    
    const response = await this.request<AddScoreResult>({
      action: 'add_score',
      data: JSON.stringify(data),
    })
    
    this.ctx.logger.info(`batchAddScore API 响应:`, JSON.stringify(response))
    
    // 检查错误
    if (response.error) {
      return {
        success: false,
        message: response.error,
        summary: { success_count: 0, failed_count: 0, total_count: 0 },
        details: [],
      }
    }
    
    // CSMS API 直接返回 AddScoreResult 对象，不在 data 字段中
    // 检查 response 是否就是 AddScoreResult
    if (response.data && typeof response.data === 'object' && 'summary' in response.data) {
      return response.data as AddScoreResult
    }
    
    // 兼容：检查 response 本身是否就是 AddScoreResult 格式
    if (response && typeof response === 'object' && 'summary' in response) {
      return response as AddScoreResult
    }
    
    // 检查 response.data 是否为数组形式（兼容某些情况）
    if (Array.isArray(response.data)) {
      return {
        success: true,
        message: '操作完成',
        summary: { success_count: response.data.length, failed_count: 0, total_count: response.data.length },
        details: response.data,
      }
    }
    
    this.ctx.logger.error(`batchAddScore 返回数据格式异常，原始响应:`, response)
    return {
      success: false,
      message: 'API 返回数据格式异常',
      summary: { success_count: 0, failed_count: 0, total_count: 0 },
      details: [],
    }
  }

  /**
   * 单用户加减分
   */
  async addScore(username: string, scoreChange: number, description: string): Promise<AddScoreResult> {
    return this.batchAddScore({
      users: [{ username, score_change: scoreChange }],
      description,
    })
  }
}
