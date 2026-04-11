import { Context, h } from 'koishi'
import { GroupAdminService } from '../services/group-admin'
import { getBaseStyles, sendImageOrText } from '../utils/image'

// 待确认的加管请求队列：key = 确认码, value = { guildId, remark, createdAt }
const pendingRequests = new Map<string, {
  guildId: string
  remark: string
  createdAt: number
}>()

// 生成随机确认码
function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // 排除易混淆字符
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

// 清理过期的请求（120秒超时）
function cleanupExpiredRequests() {
  const now = Date.now()
  for (const [code, req] of pendingRequests) {
    if (now - req.createdAt > 120000) {
      pendingRequests.delete(code)
    }
  }
}

setInterval(cleanupExpiredRequests, 30000)

export function registerGroupAdminCommand(ctx: Context, adminService: GroupAdminService) {
  // 获取 @ 元素的 ID
  function getAtId(session: any): string {
    if (session.elements) {
      const atElements = h.select(session.elements, 'at')
      if (atElements.length > 0) {
        return String(atElements[0].attrs?.id || '')
      }
    }
    return ''
  }

  // 添加群管（第一步：生成确认码）
  ctx.command('加管 [备注:string]')
    .alias('add-admin')
    .action(async ({ session }, remark?: string) => {
      if (!session.guildId) {
        return '此命令只能在群聊中使用'
      }

      const hasPermission = await adminService.hasAdminPermission(session)
      if (!hasPermission) {
        return '❌ 此命令仅限管理员使用'
      }

      // 获取 @ 的用户
      const targetId = getAtId(session)
      if (!targetId) {
        return '请用 @ 指定要添加为群管的用户：/加管 @某人'
      }

      // 清理过期请求
      cleanupExpiredRequests()

      // 检查是否已有该目标用户的待确认请求
      for (const [, req] of pendingRequests) {
        if (req.guildId === session.guildId) {
          // 检查该用户是否已存在待确认记录（通过 OpenID 查）
          const admins = await adminService.getAllAdmins(session.guildId)
          const existing = admins.find(a => a.verify === 0)
          if (existing) {
            return `❌ 该用户已有正在等待确认的加管请求`
          }
        }
      }

      // 使用备注（管理员指定）
      const adminRemark = remark || '未命名'

      // 生成确认码并存储
      const code = generateCode()
      pendingRequests.set(code, {
        guildId: session.guildId,
        remark: adminRemark,
        createdAt: Date.now()
      })

      // @被加管用户并显示确认码
      await session.send(
        `✅ 已发起加管请求\n` +
        h.at(targetId) + ` 请发送 /确认 ${code} 同意加管\n` +
        `备注：${adminRemark}\n` +
        `（120秒内有效）`
      )
      return ''
    })

  // 确认加管（第二步：被加管用户同意，获取 OpenID）
  ctx.command('确认 [确认码:string]')
    .alias('confirm')
    .action(async ({ session }, code?: string) => {
      if (!session.guildId) {
        return '此命令只能在群聊中使用'
      }

      const openId = session.userId?.toString()
      if (!openId) {
        return '无法获取您的用户ID'
      }

      if (!code) {
        return '请提供确认码：/确认 [确认码]'
      }

      // 清理过期请求
      cleanupExpiredRequests()

      // 查找确认码对应的请求
      const req = pendingRequests.get(code)
      if (!req) {
        return '❌ 无效的确认码或已过期'
      }

      // 检查是否在同一群
      if (req.guildId !== session.guildId) {
        return '❌ 请在发起加管请求的群聊中确认'
      }

      // 保存备注
      const remark = req.remark

      // 删除请求
      pendingRequests.delete(code)

      // 创建待确认记录，Verify = 0（使用管理员指定的备注）
      await adminService.createPendingAdmin(session.guildId, openId, remark)
      ctx.logger.info(`群聊 ${session.guildId} 用户同意加管: OpenID=${openId}, 备注=${remark}, Verify=0`)

      await session.send(
        `✅ 您已同意加管\n` +
        `您的 OpenID：${openId}\n` +
        `备注：${remark}\n` +
        `等待管理员执行 /加管确认 完成加管\n` +
        `（120秒内有效）`
      )
      return ''
    })

  // 最终确认加管（第三步：管理员最终确认，将 Verify 改为 1）
  ctx.command('加管确认 [确认码:string]')
    .alias('confirm-add-admin')
    .action(async ({ session }, code?: string) => {
      if (!session.guildId) {
        return '此命令只能在群聊中使用'
      }

      const hasPermission = await adminService.hasAdminPermission(session)
      if (!hasPermission) {
        return '❌ 此命令仅限管理员使用'
      }

      if (!code) {
        return '请提供确认码：/加管确认 [确认码]'
      }

      // 获取所有管理员，找到 Verify = 0 的那个
      const admins = await adminService.getAllAdmins(session.guildId)
      const pendingAdmin = admins.find(a => a.verify === 0)

      if (!pendingAdmin) {
        return '❌ 没有待确认的加管请求'
      }

      // 确认该管理员（将 Verify 改为 1）
      await adminService.confirmAdmin(session.guildId, pendingAdmin.openId)
      ctx.logger.info(`群聊 ${session.guildId} 添加群管完成: OpenID=${pendingAdmin.openId}, 备注=${pendingAdmin.remark}, Verify=1`)

      return `✅ 加管成功\n备注：${pendingAdmin.remark}\nOpenID：${pendingAdmin.openId}`
    })

  // 移除群管（按备注）
  ctx.command('减管 [备注:string]')
    .alias('remove-admin')
    .action(async ({ session }, remark?: string) => {
      if (!session.guildId) {
        return '此命令只能在群聊中使用'
      }

      const hasPermission = await adminService.hasAdminPermission(session)
      if (!hasPermission) {
        return '❌ 此命令仅限管理员使用'
      }

      if (!remark) {
        return '请提供要移除的群管备注：/减管 [备注]'
      }

      // 用备注移除群管
      await adminService.removeAdminByRemark(session.guildId, remark)
      ctx.logger.info(`群聊 ${session.guildId} 移除群管: 备注=${remark}`)
      return `✅ 已移除群管\n备注：${remark}`
    })

  // 查看群管列表
  ctx.command('群管列表')
    .alias('admin-list')
    .action(async ({ session }) => {
      if (!session.guildId) {
        return '此命令只能在群聊中使用'
      }

      const admins = await adminService.getAllAdmins(session.guildId)

      if (admins.length === 0) {
        return '当前群聊没有管理员'
      }

      const list = admins.map((admin, index) =>
        `${index + 1}. [${admin.remark}] ${admin.openId} ${admin.verify === 1 ? '✅' : '⏳'}`
      ).join('\n')

      // 生成图片 HTML
      const adminItems = admins.map((admin, index) => {
        const status = admin.verify === 1 ? '✅ 已验证' : '⏳ 待确认'
        const statusColor = admin.verify === 1 ? '#27ae60' : '#f39c12'
        return `
        <div class="admin-item">
          <div class="admin-left">
            <span class="admin-num">${index + 1}</span>
            <span class="admin-remark">${admin.remark}</span>
          </div>
          <div class="admin-right">
            <span class="admin-status" style="color: ${statusColor}">${status}</span>
          </div>
        </div>
        <div class="admin-id">${admin.openId}</div>`
      }).join('')

      const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    ${getBaseStyles()}
    .admin-list {
      max-height: 500px;
      overflow-y: auto;
    }
    .admin-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 14px;
      background: rgba(52, 152, 219, 0.08);
      border-radius: 10px;
      margin-bottom: 8px;
    }
    .admin-left {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .admin-num {
      width: 24px;
      height: 24px;
      background: #3498db;
      color: white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: bold;
    }
    .admin-remark {
      color: #2c3e50;
      font-size: 14px;
      font-weight: 500;
    }
    .admin-status {
      font-size: 12px;
      font-weight: bold;
    }
    .admin-id {
      font-size: 10px;
      color: #bdc3c7;
      margin-top: -4px;
      margin-bottom: 8px;
      padding-left: 48px;
      word-break: break-all;
    }
    .count-badge {
      text-align: center;
      background: rgba(155, 89, 182, 0.1);
      border-radius: 20px;
      padding: 8px;
      margin-bottom: 16px;
      color: #9b59b6;
      font-size: 13px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="title">👥 群管列表</div>
    <div class="count-badge">共 ${admins.length} 位管理员</div>
    <div class="admin-list">
      ${adminItems}
    </div>
    <div class="footer">班级操行分管理系统 v1.0</div>
  </div>
</body>
</html>`

      await sendImageOrText(ctx, session, html, `当前群聊的管理员：\n${list}`, { height: 600 })

      return ''
    })

  // 查看自己的 OpenID
  ctx.command('我的ID')
    .alias('my-id')
    .action(async ({ session }) => {
      if (!session.guildId) {
        return '此命令只能在群聊中使用'
      }

      const openId = session.userId?.toString()
      if (!openId) {
        return '无法获取您的用户ID'
      }

      return `您的 OpenID：\n${openId}`
    })

}
