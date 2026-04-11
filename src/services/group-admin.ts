import { Context } from 'koishi'
import { GroupAdmin } from '../models/database'

export class GroupAdminService {
  private ctx: Context

  constructor(ctx: Context) {
    this.ctx = ctx
  }

  /**
   * 添加已验证的管理员（verify = 1，用于绑定服务器时自动升级）
   */
  async addAdmin(guildId: string, openId: string, remark: string): Promise<GroupAdmin> {
    const existing = await this.ctx.database.get('group_admins', { guildId, openId })
    if (existing.length > 0) {
      // 已存在则更新为已验证
      await this.ctx.database.set('group_admins', { guildId, openId }, { remark, verify: 1 })
      return { ...existing[0], remark, verify: 1 }
    }

    return this.ctx.database.create('group_admins', {
      guildId,
      openId,
      remark,
      verify: 1,
      createdAt: new Date(),
    })
  }

  /**
   * 创建待确认的群管记录（Verify = 0）
   */
  async createPendingAdmin(guildId: string, openId: string, remark: string): Promise<GroupAdmin> {
    // 检查是否已存在（按 openId 查）
    const existing = await this.ctx.database.get('group_admins', { guildId, openId })
    if (existing.length > 0) {
      return existing[0]
    }

    return this.ctx.database.create('group_admins', {
      guildId,
      openId,
      remark,
      verify: 0,
      createdAt: new Date(),
    })
  }

  /**
   * 确认群管（将 Verify 改为 1）
   */
  async confirmAdmin(guildId: string, openId: string): Promise<boolean> {
    await this.ctx.database.set('group_admins', { guildId, openId }, { verify: 1 })
    return true
  }

  /**
   * 移除群管（按备注 查找并删除）
   */
  async removeAdminByRemark(guildId: string, remark: string): Promise<boolean> {
    await this.ctx.database.remove('group_admins', { guildId, remark })
    return true
  }

  /**
   * 检查是否为已确认的群管（OpenID + Verify = 1）
   */
  async isAdmin(guildId: string, openId: string): Promise<boolean> {
    const admins = await this.ctx.database.get('group_admins', { guildId, openId })
    return admins.length > 0 && admins[0].verify === 1
  }

  /**
   * 获取所有群管
   */
  async getAllAdmins(guildId: string): Promise<GroupAdmin[]> {
    return this.ctx.database.get('group_admins', { guildId })
  }

  /**
   * 检查用户是否有管理权限（按 OpenID + Verify = 1）
   */
  async hasAdminPermission(session: any): Promise<boolean> {
    const openId = session.userId?.toString()
    if (!openId || !session.guildId) return false
    return await this.isAdmin(session.guildId, openId)
  }
}
