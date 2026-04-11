import { CsmsUser, CsmsScoreLog } from '../services/api'

export class Formatter {
  // QQ 消息单条最大长度限制（留有余量）
  private static readonly MAX_MESSAGE_LENGTH = 1800

  static formatScoreInfo(user: CsmsUser, ranking?: number): string {
    return [
      `用户: ${user.username}`,
      `排名: ${ranking || '未知'}`,
      `总积分: ${user.total_score}`,
      `累计加分: ${user.add_score}`,
      `累计扣分: ${user.deduct_score}`,
      `记录数: ${user.score_count}`,
    ].join('\n')
  }

  static formatRanking(users: CsmsUser[]): string {
    if (users.length === 0) {
      return '暂无排名数据'
    }

    const lines = ['【积分排行榜】']
    const displayUsers = users.slice(0, 20) // 最多显示20个

    displayUsers.forEach((user, index) => {
      const medal = index < 3 ? ['🥇', '🥈', '🥉'][index] : `${index + 1}.`
      lines.push(`${medal} ${user.username}: ${user.total_score}分`)
    })

    if (users.length > 20) {
      lines.push(`... 共 ${users.length} 人，显示前20名`)
    }

    return lines.join('\n')
  }

  /**
   * 格式化排行榜（带实际排名，用于分页）
   */
  static formatRankingWithRank(users: CsmsUser[], startRank: number): string {
    if (users.length === 0) {
      return '暂无排名数据'
    }

    const lines = ['【积分排行榜】']

    users.forEach((user, index) => {
      const rank = startRank + index
      const medal = rank <= 3 ? ['🥇', '🥈', '🥉'][rank - 1] : `${rank}.`
      lines.push(`${medal} ${user.username}: ${user.total_score}分`)
    })

    return lines.join('\n')
  }

  static getMedal(index: number): string {
    const medals = ['🥇', '🥈', '🥉']
    return medals[index] || `${index + 1}.`
  }

  static formatScoreLogs(logs: CsmsScoreLog[]): string {
    if (logs.length === 0) {
      return '暂无积分记录'
    }

    const lines = ['【积分记录】']
    const displayLogs = logs.slice(0, 10)

    displayLogs.forEach((log) => {
      const change = log.score_change > 0 ? `+${log.score_change}` : log.score_change
      lines.push(`${change}分 - ${log.description}`)
    })

    if (logs.length > 10) {
      lines.push(`... 共 ${logs.length} 条记录`)
    }

    return lines.join('\n')
  }

  static formatStatistics(user: CsmsUser, logs: CsmsScoreLog[]): string {
    const lines = [
      `【${user.username} 的统计信息】`,
      `总积分: ${user.total_score}`,
      `累计加分: ${user.add_score}`,
      `累计扣分: ${user.deduct_score}`,
      `记录数: ${user.score_count}`,
      '最近积分记录:',
    ]

    const recentLogs = logs.slice(0, 5)
    if (recentLogs.length > 0) {
      recentLogs.forEach((log) => {
        const change = log.score_change > 0 ? `+${log.score_change}` : log.score_change
        lines.push(`${change}分 - ${log.description}`)
      })
    } else {
      lines.push('暂无记录')
    }

    return lines.join('\n')
  }

  static formatAddScoreResult(result: any): string {
    const status = result.success ? '积分调整成功' : '积分调整失败'
    const summary = `成功: ${result.summary.success_count} 条，失败: ${result.summary.failed_count} 条`

    const lines = [status, summary]

    // 失败时显示错误原因
    if (!result.success && result.message) {
      lines.push(`原因: ${result.message}`)
    }

    if (result.details && result.details.length > 0) {
      lines.push('详情:')
      result.details.forEach((detail: any) => {
        if (detail.success) {
          const change = detail.score_change > 0 ? '+' : ''
          lines.push(`[OK] ${detail.username}: ${change}${detail.score_change}分`)
        } else {
          lines.push(`[FAIL] ${detail.username}: ${detail.error || '失败'}`)
        }
      })
    }

    return lines.join('\n')
  }

  static formatDate(dateString: string): string {
    const date = new Date(dateString)
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  /**
   * 安全发送消息，自动分割过长的消息
   * 返回消息片段数组，由调用者处理发送
   */
  static splitMessage(message: string): string[] {
    if (message.length <= this.MAX_MESSAGE_LENGTH) {
      return [message]
    }

    const parts = message.split('\n')
    const result: string[] = []
    let currentPart = ''

    for (const line of parts) {
      if ((currentPart + '\n' + line).length > this.MAX_MESSAGE_LENGTH) {
        if (currentPart) {
          result.push(currentPart)
        }
        currentPart = line
      } else {
        currentPart = currentPart ? currentPart + '\n' + line : line
      }
    }

    if (currentPart) {
      result.push(currentPart)
    }

    return result
  }
}
