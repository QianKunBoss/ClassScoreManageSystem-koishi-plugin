import { Context, h } from 'koishi'
import { ServerConfigService } from '../services/server'
import { Formatter, ERROR_MESSAGES, CONSTANTS } from '../utils'
import { getBaseStyles, sendImageOrText } from '../utils/image'

const PAGE_SIZE = 10

export function registerRankingCommand(ctx: Context, serverService: ServerConfigService) {
  ctx.command('排行榜 [页码:number]')
    .alias('ranking')
    .action(async ({ session }, page = 1) => {
      if (!session.guildId) {
        return '此命令只能在群聊中使用'
      }

      const api = await serverService.createApiService(session.guildId)
      if (!api) {
        return ERROR_MESSAGES.NO_SERVER_CONFIG
      }

      try {
        // 先获取总数
        const allResponse = await api.getRanking(10000, 0)
        if (allResponse.error || !allResponse.data) {
          return ERROR_MESSAGES.API_REQUEST_FAILED
        }

        const totalUsers = allResponse.data.length
        const totalPages = Math.ceil(totalUsers / PAGE_SIZE)

        // 验证页码
        if (page < 1) page = 1
        if (page > totalPages && totalPages > 0) page = totalPages

        // 计算偏移量
        const offset = (page - 1) * PAGE_SIZE
        const response = await api.getRanking(PAGE_SIZE, offset)
        if (response.error || !response.data) {
          return ERROR_MESSAGES.API_REQUEST_FAILED
        }

        if (response.data.length === 0) {
          return `暂无排行数据`
        }

        // 格式化数据，包含实际排名
        const startRank = offset + 1
        const message = Formatter.formatRankingWithRank(response.data, startRank)

        // 生成分页信息
        const pageInfo = totalPages > 1
          ? `第 ${page}/${totalPages} 页，共 ${totalUsers} 人`
          : `共 ${totalUsers} 人`

        // 生成图片 HTML
        const rankItems = response.data.map((user, index) => {
          const rank = startRank + index
          const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `${rank}.`
          const scoreColor = user.total_score >= 0 ? '#27ae60' : '#e74c3c'
          return `
          <div class="rank-item">
            <span class="rank-num">${medal}</span>
            <span class="rank-name">${user.username}</span>
            <span class="rank-score" style="color: ${scoreColor}">${user.total_score >= 0 ? '+' : ''}${user.total_score}</span>
          </div>`
        }).join('')

        const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    ${getBaseStyles()}
    .rank-list {
      max-height: 550px;
      overflow-y: auto;
    }
    .rank-item {
      display: flex;
      align-items: center;
      padding: 10px 12px;
      margin-bottom: 8px;
      background: rgba(52, 152, 219, 0.08);
      border-radius: 10px;
    }
    .rank-num {
      width: 40px;
      font-size: 16px;
      font-weight: bold;
      color: #3498db;
    }
    .rank-name {
      flex: 1;
      color: #2c3e50;
      font-size: 14px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .rank-score {
      font-size: 14px;
      font-weight: bold;
      margin-left: 12px;
    }
    .page-info {
      text-align: center;
      color: #95a5a6;
      font-size: 12px;
      margin-top: 16px;
      padding-top: 12px;
      border-top: 1px dashed #eee;
    }
    .title-icon {
      font-size: 28px;
      display: block;
      margin-bottom: 8px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="title"><span class="title-icon">🏆</span>积分排行榜</div>
    <div class="rank-list">
      ${rankItems}
    </div>
    <div class="page-info">${pageInfo}</div>
    <div class="footer">班级操行分管理系统 v1.0</div>
  </div>
</body>
</html>`

        const textResult = message + (totalPages > 1 ? `\n\n📄 ${pageInfo}` : '')
        await sendImageOrText(ctx, session, html, textResult, { height: 820 })

        return ''
      } catch (error: any) {
        ctx.logger.error('获取排行榜失败:', error)
        return ERROR_MESSAGES.API_REQUEST_FAILED
      }
    })
}
