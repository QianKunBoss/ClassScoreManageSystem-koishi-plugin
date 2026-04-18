import { Context } from 'koishi'
import { ServerConfigService } from '../services/server'
import { GroupAdminService } from '../services/group-admin'
import { Validator, HELP_MESSAGES } from '../utils'

export function registerBindServerCommand(ctx: Context, serverService: ServerConfigService, adminService: GroupAdminService) {
  ctx.command('绑定服务器 <地址:string> <用户名:string> <token:string>')
    .alias('bind-server')
    .action(async ({ session }, address, username, token) => {
      if (!address || !username || !token) {
        return HELP_MESSAGES.BIND_SERVER
      }

      if (!session.guildId) {
        return '此命令只能在群聊中使用'
      }

      const openId = session.userId?.toString()
      if (!openId) {
        return '无法获取您的用户ID'
      }

      // 检查是否已有服务器配置
      const existingConfig = await serverService.getConfigByGuild(session.guildId)
      if (existingConfig) {
        return '❌ 该群聊已绑定服务器，如需更换请先使用 /服务器解绑'
      }

      const tokenError = Validator.validateTokenWithMessage(token)
      if (tokenError) {
        ctx.logger.info(`Token 格式验证失败: ${tokenError}`)
        return `Token 格式验证失败`
      }

      try {
        ctx.logger.info(`正在验证服务器配置...`)
        
        const result = await serverService.validateConfig(address, username, token)
        if (!result.valid) {
          const errorMsg = result.error || '服务器配置验证失败'
          ctx.logger.info(`服务器配置验证失败: ${errorMsg}`)
          return `验证失败: ${errorMsg}`
        }

        const actualUsername = result.actualUsername || username
        const newToken = result.newToken || token
        const config = await serverService.saveConfig(session.guildId, 'CSMS服务器', address, actualUsername, newToken)
        
        // 将绑定者自动添加为管理员
        await adminService.addAdmin(session.guildId, openId, '管理员')
        ctx.logger.info(`群聊 ${session.guildId} 的首个绑定者 ${openId} 被自动添加为管理员`)
        
        const domain = config.address.replace(/^https?:\/\//, '').split('/')[0]
        ctx.logger.info(`服务器配置成功，domain=${domain}，username=${actualUsername}`)
        
        return `✅ 服务器配置成功，新token已生成，旧token已失效`
      } catch (error: any) {
        ctx.logger.error('保存服务器配置失败:', error)
        return `配置保存失败: ${error.message}`
      }
    })

  // 解除服务器绑定
  ctx.command('服务器解绑')
    .alias('unbind-server')
    .action(async ({ session }) => {
      if (!session.guildId) {
        return '此命令只能在群聊中使用'
      }

      // 权限检查：必须有管理员权限
      const hasPermission = await adminService.hasAdminPermission(session)
      if (!hasPermission) {
        return '❌ 此命令仅限管理员使用'
      }

      const config = await serverService.getConfigByGuild(session.guildId)
      if (!config) {
        return '❌ 该群聊尚未绑定任何服务器'
      }

      // 二次确认
      await session.send('⚠️ 确定要解除服务器绑定吗？解绑后其他人可重新绑定。请在 30 秒内输入「确认」来完成操作')
      const reply = await session.prompt(30000)
      if (reply?.trim() !== '确认') {
        return '✅ 已取消解绑操作'
      }

      await serverService.deleteConfig(session.guildId)
      ctx.logger.info(`群聊 ${session.guildId} 解除了服务器绑定`)
      return `✅ 已解除服务器绑定`
    })
}
