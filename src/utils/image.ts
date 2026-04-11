import { Context, h } from 'koishi'

// 通用竖版图片生成函数
export async function generateImage(
  ctx: Context,
  html: string,
  options: { width?: number; height?: number } = {}
): Promise<Buffer | null> {
  const width = options.width || 450
  const height = options.height || 800

  try {
    const page = await (ctx as any).puppeteer.page()

    await page.setViewport({
      width,
      height,
      deviceScaleFactor: 2,
    })

    await page.setContent(html, { waitUntil: 'networkidle0' })
    await page.evaluateHandle('document.fonts.ready')

    // 等待背景图片加载
    await page.evaluate(() => {
      return new Promise<void>((resolve) => {
        const img = document.querySelector('body') as HTMLElement
        if (img && img.style.backgroundImage) {
          const bgImg = new Image()
          bgImg.onload = () => resolve()
          bgImg.onerror = () => resolve()
          bgImg.src = img.style.backgroundImage.replace(/url\(['"]?(.+?)['"]?\)/, '$1')
        } else {
          resolve()
        }
      })
    })

    const screenshot = await page.screenshot({
      type: 'png',
      clip: { x: 0, y: 0, width, height },
    })

    return screenshot as Buffer
  } catch (error) {
    ctx.logger.error('生成图片失败:', error)
    return null
  }
}

// 发送图片（优先图片，失败回退文字）
export async function sendImageOrText(
  ctx: Context,
  session: any,
  html: string,
  fallbackText: string,
  options: { width?: number; height?: number } = {}
): Promise<void> {
  const image = await generateImage(ctx, html, options)
  if (image) {
    await session.send(h.image(image, 'image/png'))
  } else {
    await session.send(fallbackText)
  }
}

// 通用基础模板样式
export function getBaseStyles(): string {
  return `
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
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
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
    .content {
      color: #555;
      font-size: 14px;
      line-height: 1.8;
      white-space: pre-wrap;
      word-break: break-all;
    }
    .footer {
      text-align: center;
      margin-top: 16px;
      padding-top: 12px;
      border-top: 1px solid rgba(0,0,0,0.1);
      color: #95a5a6;
      font-size: 10px;
    }
  `
}
