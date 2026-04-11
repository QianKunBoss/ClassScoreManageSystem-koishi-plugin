import { Context, h } from 'koishi'
import { ServerConfigService } from '../services/server'
import { QqBindingService } from '../services/binding'
import { ERROR_MESSAGES } from '../utils'
import { getBaseStyles, sendImageOrText } from '../utils/image'

export function registerStatisticsCommand(
  ctx: Context,
  serverService: ServerConfigService,
  bindingService: QqBindingService
) {
  ctx.command('统计 [用户名:string]')
    .alias('statistics')
    .action(async ({ session }, username) => {
      if (!session.guildId) {
        return '此命令只能在群聊中使用'
      }

      const api = await serverService.createApiService(session.guildId)
      if (!api) {
        return ERROR_MESSAGES.NO_SERVER_CONFIG
      }

      try {
        let targetUsername = username

        if (!username) {
          const openId = session.userId?.toString()
          if (!openId) {
            return '无法获取您的用户ID'
          }

          const binding = await bindingService.getUserByOpenId(session.guildId, openId)
          if (!binding) {
            return `${ERROR_MESSAGES.USER_NOT_BOUND}\n\n请先使用 /绑定QQ <用户名> 命令绑定您的账号`
          }

          targetUsername = binding.username
        }

        const userResponse = await api.getUserByUsername(targetUsername)
        if (userResponse.error || !userResponse.data || userResponse.data.length === 0) {
          return ERROR_MESSAGES.USER_NOT_FOUND
        }

        const user = userResponse.data[0]

        // 直接使用用户信息中的统计字段
        const totalScore = Number(user.total_score) || 0
        const addScore = Number(user.add_score) || 0
        const deductScore = Math.abs(Number(user.deduct_score)) || 0
        const scoreCount = Number(user.score_count) || 0

        // 生成图片 HTML
        const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    ${getBaseStyles()}
    .user-info {
      text-align: center;
      margin-bottom: 20px;
    }
    .username {
      font-size: 20px;
      font-weight: bold;
      color: #2c3e50;
    }
    .user-id {
      color: #95a5a6;
      font-size: 11px;
      margin-top: 4px;
    }
    .stats-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-top: 16px;
    }
    .stat-card {
      background: rgba(52, 152, 219, 0.1);
      border-radius: 12px;
      padding: 14px;
      text-align: center;
    }
    .stat-card.positive {
      background: rgba(39, 174, 96, 0.1);
    }
    .stat-card.negative {
      background: rgba(231, 76, 60, 0.1);
    }
    .stat-card.total {
      background: rgba(155, 89, 182, 0.1);
    }
    .stat-label {
      color: #7f8c8d;
      font-size: 11px;
      margin-bottom: 6px;
    }
    .stat-value {
      font-size: 20px;
      font-weight: bold;
      color: #2c3e50;
    }
    .stat-value.positive { color: #27ae60; }
    .stat-value.negative { color: #e74c3c; }
    .stat-value.total { color: #9b59b6; }
  </style>
</head>
<body>
  <div class="container">
    <div class="title">📊 积分统计</div>
    <div class="user-info">
      <div class="username">${user.username}</div>
      <div class="user-id">用户ID: ${user.id} | 当前积分: ${user.total_score}</div>
    </div>
    <div class="stats-grid">
      <div class="stat-card positive">
        <div class="stat-label">累计加分</div>
        <div class="stat-value positive">+${addScore}</div>
      </div>
      <div class="stat-card negative">
        <div class="stat-label">累计扣分</div>
        <div class="stat-value negative">-${deductScore}</div>
      </div>
      <div class="stat-card total">
        <div class="stat-label">总积分</div>
        <div class="stat-value total">${totalScore}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">操作次数</div>
        <div class="stat-value">${scoreCount}</div>
      </div>
    </div>
    <div class="footer">班级操行分管理系统 v1.0</div>
  </div>
</body>
</html>`

        const textResult = [
          `【${user.username} 的统计信息】`,
          `总积分: ${user.total_score}`,
          `累计加分: +${addScore}`,
          `累计扣分: -${deductScore}`,
          `操作次数: ${scoreCount}`,
        ].join('\n')

        await sendImageOrText(ctx, session, html, textResult, { height: 550 })

        return ''
      } catch (error: any) {
        ctx.logger.error('获取统计信息失败:', error)
        return ERROR_MESSAGES.API_REQUEST_FAILED
      }
    })
}
