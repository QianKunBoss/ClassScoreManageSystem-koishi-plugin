import { Context, Schema } from 'koishi'
import { extendDatabase } from './models/database'
import { ServerConfigService } from './services/server'
import { QqBindingService } from './services/binding'
import { GroupAdminService } from './services/group-admin'
import { registerBindServerCommand } from './commands/bind-server'
import { registerQueryScoreCommand } from './commands/query-score'
import { registerBindQqCommand } from './commands/bind-qq'
import { registerAdjustScoreCommand } from './commands/adjust-score'
import { registerRankingCommand } from './commands/ranking'
import { registerStatisticsCommand } from './commands/statistics'
import { registerGroupAdminCommand } from './commands/admin-manager'
import { registerMenuCommand } from './commands/menu'
import { setImageConfig } from './utils/image'

export const name = 'class-score-system'
export const inject = ['database', 'puppeteer']

export interface Config {
  /** 卡片背景图片 URL */
  backgroundImage?: string
  /** 卡片背景透明度 (0-1) */
  cardOpacity?: number
}

export const Config: Schema<Config> = Schema.object({
  backgroundImage: Schema.string().description('卡片背景图片 URL').default('https://api.yppp.net/pe.php'),
  cardOpacity: Schema.number().description('卡片背景透明度 (0-1)').default(0.5),
})

export function apply(ctx: Context, config: Config) {
  ctx.logger.info('班级操行分管理系统插件正在加载...')

  // 设置图片配置
  setImageConfig({
    backgroundImage: config.backgroundImage,
    cardOpacity: config.cardOpacity,
  })

  extendDatabase(ctx)

  const serverService = new ServerConfigService(ctx)
  const bindingService = new QqBindingService(ctx)
  const adminService = new GroupAdminService(ctx)

  registerGroupAdminCommand(ctx, adminService)
  registerBindServerCommand(ctx, serverService, adminService)
  registerQueryScoreCommand(ctx, serverService, bindingService)
  registerBindQqCommand(ctx, serverService, bindingService)
  registerAdjustScoreCommand(ctx, serverService, adminService)
  registerRankingCommand(ctx, serverService)
  registerStatisticsCommand(ctx, serverService, bindingService)
  registerMenuCommand(ctx)

  ctx.logger.info('班级操行分管理系统插件加载完成')
}