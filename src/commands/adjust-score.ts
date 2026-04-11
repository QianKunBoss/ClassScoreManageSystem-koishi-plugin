import { Context } from 'koishi'
import { ServerConfigService } from '../services/server'
import { GroupAdminService } from '../services/group-admin'
import { Formatter, Validator, ERROR_MESSAGES, SUCCESS_MESSAGES, HELP_MESSAGES } from '../utils'

export function registerAdjustScoreCommand(ctx: Context, serverService: ServerConfigService, adminService: GroupAdminService) {
  ctx.command('调整积分 <用户名:string> <分数:number> <原因:text>')
    .alias('adjust-score')
    .action(async ({ session }, username, score, reason) => {
      if (!username || score === undefined || !reason) {
        return HELP_MESSAGES.ADJUST_SCORE
      }

      if (!session.guildId) {
        return '此命令只能在群聊中使用'
      }

      // 权限检查：群主、管理员或自定义群管
      const hasPermission = await adminService.hasAdminPermission(session)
      if (!hasPermission) {
        return ERROR_MESSAGES.INSUFFICIENT_PERMISSION
      }

      const usernameError = Validator.validateUsernameWithMessage(username)
      if (usernameError) {
        return usernameError
      }

      const scoreError = Validator.validateScoreWithMessage(score)
      if (scoreError) {
        return scoreError
      }

      const descriptionError = Validator.validateDescriptionWithMessage(reason)
      if (descriptionError) {
        return descriptionError
      }

      const api = await serverService.createApiService(session.guildId)
      if (!api) {
        return ERROR_MESSAGES.NO_SERVER_CONFIG
      }

      try {
        const data = {
          users: [
            {
              username,
              score_change: score,
            },
          ],
          description: reason,
        }

        ctx.logger.info(`调整积分请求: 用户=${username}, 分数=${score}, 原因=${reason}`)
        
        const result = await api.batchAddScore(data)
        ctx.logger.info(`调整积分结果:`, JSON.stringify(result))
        
        const message = Formatter.formatAddScoreResult(result)
        return Formatter.splitMessage(message)
      } catch (error: any) {
        ctx.logger.error('调整积分失败:', error)
        return ERROR_MESSAGES.API_REQUEST_FAILED
      }
    })

}
