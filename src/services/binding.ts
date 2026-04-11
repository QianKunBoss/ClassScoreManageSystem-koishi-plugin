import { Context } from 'koishi'
import { QqBinding } from '../models/database'

export class QqBindingService {
  private ctx: Context

  constructor(ctx: Context) {
    this.ctx = ctx
  }

  /**
   * openId 即 session.userId（QQ OpenID，非传统QQ号）
   */
  async bindQq(guildId: string, userId: number, username: string, openId: string, serverId: number): Promise<QqBinding> {
    const now = new Date()
    
    const bindings = await this.ctx.database.get('qq_bindings', { openId, guildId })
    if (bindings.length > 0) {
      await this.ctx.database.set('qq_bindings', { openId, guildId }, {
        userId,
        username,
        serverId,
        updatedAt: now,
      })
      return { ...bindings[0], userId, username, serverId, updatedAt: now }
    }
    
    const binding = await this.ctx.database.create('qq_bindings', {
      guildId,
      userId,
      username,
      openId,
      serverId,
      createdAt: now,
      updatedAt: now,
    })
    
    return binding
  }

  async unbindQq(guildId: string, openId: string): Promise<boolean> {
    await this.ctx.database.remove('qq_bindings', { openId, guildId })
    return true
  }

  async unbindByUserId(guildId: string, userId: number): Promise<boolean> {
    await this.ctx.database.remove('qq_bindings', { userId, guildId })
    return true
  }

  async getUserByOpenId(guildId: string, openId: string): Promise<QqBinding | null> {
    const bindings = await this.ctx.database.get('qq_bindings', { openId, guildId })
    return bindings[0] || null
  }

  async getQqByUserId(guildId: string, userId: number): Promise<QqBinding | null> {
    const bindings = await this.ctx.database.get('qq_bindings', { userId, guildId })
    return bindings[0] || null
  }

  async getAllBindings(guildId: string): Promise<QqBinding[]> {
    return this.ctx.database.get('qq_bindings', { guildId })
  }

  async getBindingsByServer(guildId: string, serverId: number): Promise<QqBinding[]> {
    return this.ctx.database.get('qq_bindings', { serverId, guildId })
  }

  async getBindingsByUsername(guildId: string, username: string): Promise<QqBinding[]> {
    return this.ctx.database.get('qq_bindings', { username, guildId })
  }
}
