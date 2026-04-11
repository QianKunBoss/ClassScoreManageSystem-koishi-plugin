import { Context, h } from 'koishi'

const MENU_HTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
      background: url('https://api.yppp.net/pe.php') center/cover no-repeat;
      width: 450px;
      min-height: 800px;
      display: flex;
      justify-content: center;
      align-items: flex-start;
      padding: 40px 0;
    }
    .container {
      background: rgba(255, 255, 255, 0.5);
      border-radius: 24px;
      padding: 28px 24px;
      width: 380px;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
      margin: 0 auto;
    }
    .title {
      text-align: center;
      font-size: 22px;
      font-weight: bold;
      color: #2c3e50;
      margin-bottom: 20px;
      padding-bottom: 12px;
      border-bottom: 2px solid #3498db;
    }
    .section {
      margin-bottom: 16px;
    }
    .section-title {
      font-size: 14px;
      font-weight: bold;
      color: #3498db;
      margin-bottom: 10px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .section-title::before {
      content: '';
      display: inline-block;
      width: 3px;
      height: 16px;
      background: linear-gradient(180deg, #3498db, #9b59b6);
      border-radius: 2px;
    }
    .command-list {
      list-style: none;
      padding-left: 8px;
    }
    .command-item {
      padding: 6px 0;
      color: #555;
      font-size: 12px;
      border-bottom: 1px dashed #eee;
      display: flex;
      align-items: flex-start;
    }
    .command-item:last-child {
      border-bottom: none;
    }
    .command-item::before {
      content: '•';
      color: #9b59b6;
      font-weight: bold;
      margin-right: 6px;
      flex-shrink: 0;
    }
    .command-name {
      color: #2c3e50;
      font-weight: 600;
      background: #ecf0f1;
      padding: 1px 5px;
      border-radius: 3px;
      font-family: 'Consolas', 'Monaco', monospace;
      font-size: 11px;
      white-space: nowrap;
    }
    .command-desc {
      color: #7f8c8d;
      font-size: 11px;
      margin-left: 4px;
    }
    .footer {
      text-align: center;
      margin-top: 16px;
      padding-top: 12px;
      border-top: 1px solid #eee;
      color: #95a5a6;
      font-size: 10px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="title">📋 班级操行分管理系统菜单</div>
    
    <div class="section">
      <div class="section-title">🛠️ 基础指令</div>
      <ul class="command-list">
        <li class="command-item">
          <span class="command-name">/查询积分</span>
          <span class="command-desc">[用户名]</span>
        </li>
        <li class="command-item">
          <span class="command-name">/绑定QQ</span>
          <span class="command-desc">&lt;用户名&gt;</span>
        </li>
        <li class="command-item">
          <span class="command-name">/排行榜</span>
          <span class="command-desc">[数量]</span>
        </li>
        <li class="command-item">
          <span class="command-name">/统计</span>
          <span class="command-desc">[用户名]</span>
        </li>
      </ul>
    </div>
    
    <div class="section">
      <div class="section-title">⚙️ 管理员指令</div>
      <ul class="command-list">
        <li class="command-item">
          <span class="command-name">/绑定服务器</span>
          <span class="command-desc">&lt;地址&gt; &lt;用户&gt; &lt;token&gt;</span>
        </li>
        <li class="command-item">
          <span class="command-name">/服务器解绑</span>
        </li>
        <li class="command-item">
          <span class="command-name">/调整积分</span>
          <span class="command-desc">&lt;用户&gt; &lt;分数&gt; &lt;原因&gt;</span>
        </li>
      </ul>
    </div>
    
    <div class="section">
      <div class="section-title">👤 群管指令</div>
      <ul class="command-list">
        <li class="command-item">
          <span class="command-name">/加管</span>
          <span class="command-desc">@某人 &lt;备注&gt;</span>
        </li>
        <li class="command-item">
          <span class="command-name">/确认</span>
          <span class="command-desc">&lt;验证码&gt;</span>
        </li>
        <li class="command-item">
          <span class="command-name">/加管确认</span>
        </li>
        <li class="command-item">
          <span class="command-name">/减管</span>
          <span class="command-desc">&lt;备注&gt;</span>
        </li>
        <li class="command-item">
          <span class="command-name">/群管列表</span>
        </li>
      </ul>
    </div>
    
    <div class="footer">班级操行分管理系统 v1.0</div>
  </div>
</body>
</html>
`

export function registerMenuCommand(ctx: Context) {
  ctx.command('菜单')
    .alias('menu')
    .action(async ({ session }) => {
      if (!session.guildId) {
        return '此命令只能在群聊中使用'
      }

      try {
        // 使用 Koishi 的 puppeteer 服务
        const page = await (ctx as any).puppeteer.page()
        
        // 设置竖版视口
        await page.setViewport({
          width: 450,
          height: 800,
          deviceScaleFactor: 2,
        })
        
        await page.setContent(MENU_HTML, { waitUntil: 'networkidle0' })

        // 等待字体加载
        await page.evaluateHandle('document.fonts.ready')

        // 截图（固定视口大小）
        const screenshot = await page.screenshot({
          type: 'png',
          clip: { x: 0, y: 0, width: 450, height: 800 },
        })

        // 将图片发送给用户
        await session.send(h.image(screenshot as Buffer, 'image/png'))

        return '' // 图片已发送，不再发送文字
      } catch (error: any) {
        ctx.logger.error('生成菜单图片失败:', error)
        // 如果图片生成失败，回退到文字版本
        return `📋 **班级操行分管理系统菜单**

━━━━━━━━━━━━━━━━━━━━━━
🛠️ **基础指令**
━━━━━━━━━━━━━━━━━━━━━━
• /查询积分 [用户名] - 查询积分和排名
• /绑定QQ <用户名> - 绑定QQ号与系统账号
• /排行榜 [数量] - 显示积分排行榜
• /统计 [用户名] - 显示积分统计信息

━━━━━━━━━━━━━━━━━━━━━━
⚙️ **管理员指令**
━━━━━━━━━━━━━━━━━━━━━━
• /绑定服务器 <地址> <用户名> <token> - 绑定CSMS服务器
• /服务器解绑 - 解除服务器绑定
• /调整积分 <用户名> <分数> <原因> - 调整积分

━━━━━━━━━━━━━━━━━━━━━━
👤 **群管指令**
━━━━━━━━━━━━━━━━━━━━━━
• /加管 @某人 <备注> - 添加管理员
• /确认 <验证码> - 确认加管
• /加管确认 - 完成加管流程
• /减管 <备注> - 移除管理员
• /群管列表 - 显示管理员列表

━━━━━━━━━━━━━━━━━━━━━━`
      }
    })
}
