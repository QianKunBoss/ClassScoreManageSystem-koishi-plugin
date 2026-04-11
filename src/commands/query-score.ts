import { Context, h } from 'koishi'
import { ServerConfigService } from '../services/server'
import { QqBindingService } from '../services/binding'
import { Formatter, ERROR_MESSAGES, CONSTANTS } from '../utils'
import { generateImage, getBaseStyles, sendImageOrText } from '../utils/image'

export function registerQueryScoreCommand(
  ctx: Context,
  serverService: ServerConfigService,
  bindingService: QqBindingService
) {
  ctx.command('查询积分 [用户名:string]')
    .alias('query-score')
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
            return `${ERROR_MESSAGES.USER_NOT_BOUND}。请先使用 /绑定QQ <用户名> 命令绑定您的账号`
          }

          targetUsername = binding.username
        }

        const response = await api.getUserByUsername(targetUsername)
        if (response.error || !response.data || response.data.length === 0) {
          return ERROR_MESSAGES.USER_NOT_FOUND
        }

        const user = response.data[0]

        const rankingResponse = await api.getRanking(CONSTANTS.RANKING_MAX_LIMIT, 0)
        let ranking = 0
        if (!rankingResponse.error && rankingResponse.data) {
          const index = rankingResponse.data.findIndex((u) => u.id === user.id)
          ranking = index >= 0 ? index + 1 : 0
        }

        const textResult = Formatter.formatScoreInfo(user, ranking)

        // 生成图片
        const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    ${getBaseStyles()}
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-top: 16px;
    }
    .info-item {
      background: rgba(52, 152, 219, 0.1);
      border-radius: 12px;
      padding: 16px;
      text-align: center;
    }
    .info-label {
      color: #7f8c8d;
      font-size: 12px;
      margin-bottom: 8px;
    }
    .info-value {
      color: #2c3e50;
      font-size: 24px;
      font-weight: bold;
    }
    .info-value.score {
      color: #3498db;
    }
    .info-value.rank {
      color: #9b59b6;
    }
    .username {
      text-align: center;
      font-size: 20px;
      font-weight: bold;
      color: #2c3e50;
      margin-bottom: 4px;
    }
    .subtitle {
      text-align: center;
      color: #95a5a6;
      font-size: 12px;
      margin-bottom: 20px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="title">📊 积分查询结果</div>
    <div class="username">${user.username}</div>
    <div class="subtitle">用户ID: ${user.id}</div>
    <div class="info-grid">
      <div class="info-item">
        <div class="info-label">当前积分</div>
        <div class="info-value score">${user.total_score}</div>
      </div>
      <div class="info-item">
        <div class="info-label">排行榜</div>
        <div class="info-value rank">#${ranking}</div>
      </div>
    </div>
    <div class="footer">班级操行分管理系统 v1.0</div>
  </div>
</body>
</html>`

        await sendImageOrText(ctx, session, html, textResult, { height: 600 })

        return ''
      } catch (error: any) {
        ctx.logger.error('查询积分失败:', error)
        return ERROR_MESSAGES.API_REQUEST_FAILED
      }
    })
}
