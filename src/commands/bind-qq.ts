import { Context } from 'koishi'
import { ServerConfigService } from '../services/server'
import { QqBindingService } from '../services/binding'
import { Validator, ERROR_MESSAGES, SUCCESS_MESSAGES, HELP_MESSAGES } from '../utils'

export function registerBindQqCommand(
  ctx: Context,
  serverService: ServerConfigService,
  bindingService: QqBindingService
) {
  ctx.command('绑定QQ <用户名:string>')
    .alias('bind-qq')
    .action(async ({ session }, username) => {
      if (!username) {
              return HELP_MESSAGES.BIND_QQ
            }
      
            if (!session.guildId) {
              return '此命令只能在群聊中使用'
            }
      
            const usernameError = Validator.validateUsernameWithMessage(username)
            if (usernameError) {
              return usernameError
            }
      
      const openId = session.userId?.toString()
      if (!openId) {
        return '无法获取您的用户ID'
      }
      
      ctx.logger.info(`获取到的用户 OpenID: ${openId}`)

      const config = await serverService.getConfigByGuild(session.guildId)
      if (!config) {
        return ERROR_MESSAGES.NO_SERVER_CONFIG
      }

      try {
        // 检查是否已经绑定
        const existingBinding = await bindingService.getUserByOpenId(session.guildId, openId)
        if (existingBinding) {
          return `❌ 您已绑定「${existingBinding.username}」，如需更换账号请先使用 /解除绑定 解绑后重新绑定`
        }

        // 检查该用户名是否已被其他QQ绑定
        const existingBindings = await bindingService.getBindingsByUsername(session.guildId, username)
        if (existingBindings.length > 0) {
          return `❌ 用户名「${username}」已被其他QQ账号绑定，每个用户名只能绑定一个QQ`
        }

        const api = await serverService.createApiService(session.guildId)
        if (!api) {
          return ERROR_MESSAGES.NO_SERVER_CONFIG
        }

        const response = await api.getUserByUsername(username)
        if (response.error || !response.data || response.data.length === 0) {
          return ERROR_MESSAGES.USER_NOT_FOUND
        }

        const user = response.data[0]

        await bindingService.bindQq(session.guildId, user.id, username, openId, config.id)

        return `✅ 绑定成功\n用户名: ${username}`
      } catch (error: any) {
        ctx.logger.error('绑定QQ失败:', error)
        return ERROR_MESSAGES.BINDING_FAILED
      }
    })

  // 解除用户绑定
  ctx.command('解除绑定')
    .alias('unbind')
    .action(async ({ session }, username?: string) => {
      if (!session.guildId) {
        return '此命令只能在群聊中使用'
      }

      const openId = session.userId?.toString()
      if (!openId) {
        return '无法获取您的用户ID'
      }

      let binding = null

      // 如果指定了用户名，尝试解绑指定用户
      if (username) {
        const bindings = await bindingService.getBindingsByUsername(session.guildId, username)
        binding = bindings.find(b => b.openId === openId)
      } else {
        // 未指定用户名，解绑当前用户的绑定
        binding = await bindingService.getUserByOpenId(session.guildId, openId)
      }

      if (!binding) {
        return `❌ 您尚未绑定任何账号${username ? `（用户：${username}）` : ''}`
      }

      // 二次确认
      await session.send(`⚠️ 确定要解除「${binding.username}」的绑定吗？请在 30 秒内输入「确认」来完成操作`)
      const reply = await session.prompt(30000)
      if (reply?.trim() !== '确认') {
        return '✅ 已取消解绑操作'
      }

      await bindingService.unbindQq(session.guildId, openId)
      ctx.logger.info(`用户 ${binding.username}（OpenID: ${openId}）解除了绑定`)
      return `✅ 已解除「${binding.username}」的绑定`
    })
}