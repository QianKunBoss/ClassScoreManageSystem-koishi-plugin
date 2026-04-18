import { Context } from 'koishi'
import { ServerConfig } from '../models/database'
import { CsmsApiService } from './api'

export class ServerConfigService {
  private ctx: Context

  constructor(ctx: Context) {
    this.ctx = ctx
  }

  async saveConfig(guildId: string, name: string, address: string, username: string, token: string): Promise<ServerConfig> {
    const now = new Date()
    
    // 检查该群聊是否已有配置
    const existingConfigs = await this.ctx.database.get('server_configs', { guildId })
    
    // 自动移除 /api/global_api.php 后缀
    const baseUrl = address.replace(/\/api\/global_api\.php$/, '').replace(/\/$/, '')
    
    if (existingConfigs.length > 0) {
      // 更新现有配置
      await this.ctx.database.set('server_configs', { guildId }, {
        name,
        address: baseUrl,
        username,
        token,
        updatedAt: now,
      })
      return { ...existingConfigs[0], name, address: baseUrl, username, token, updatedAt: now }
    }
    
    // 创建新配置
    const config = await this.ctx.database.create('server_configs', {
      guildId,
      name,
      address: baseUrl,
      username,
      token,
      createdAt: now,
      updatedAt: now,
    })
    
    return config
  }

  async getConfigByGuild(guildId: string): Promise<ServerConfig | null> {
    const configs = await this.ctx.database.get('server_configs', { guildId })
    return configs[0] || null
  }

  async getAllConfigs(): Promise<ServerConfig[]> {
    return this.ctx.database.get('server_configs', {})
  }

  async deleteConfig(guildId: string): Promise<boolean> {
    await this.ctx.database.remove('server_configs', { guildId })
    return true
  }

  async createApiService(guildId: string): Promise<CsmsApiService | null> {
    const config = await this.getConfigByGuild(guildId)
    if (!config) return null
    
    return new CsmsApiService(this.ctx, config.address, config.token)
  }

  async validateConfig(address: string, username: string, token: string): Promise<{ valid: boolean; error?: string; actualUsername?: string; newToken?: string }> {
    try {
      // 自动移除 /api/global_api.php 后缀
      const baseUrl = address.replace(/\/api\/global_api\.php$/, '').replace(/\/$/, '')
      const api = new CsmsApiService(this.ctx, baseUrl, token)
      const result = await api.validateToken()

      if (result.valid) {
        // 如果提供的用户名与实际登录的管理员用户名不同，给出提示
        if (result.username && result.username !== username) {
          return {
            valid: true,
            actualUsername: result.username,
            newToken: result.newToken,
            error: `警告：提供的用户名 "${username}" 与实际登录的管理员 "${result.username}" 不一致`
          }
        }
        return { valid: true, actualUsername: result.username, newToken: result.newToken }
      }

      return { valid: false, error: 'Token 验证失败，请检查 Token 是否正确' }
    } catch (error: any) {
      this.ctx.logger.error('验证服务器配置失败:', error)
      return { valid: false, error: error.message }
    }
  }
}