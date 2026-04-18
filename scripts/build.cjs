const { execSync } = require('child_process')
const path = require('path')

// 使用 footer 直接导出，避免 __toCommonJS 包装层在 koishi loader 下导致 Class extends 错误
execSync(
  'npx esbuild src/index.ts ' +
    '--bundle ' +
    '--outfile=lib/index.js ' +
    '--platform=node ' +
    '--target=node18 ' +
    '--format=cjs ' +
    '--external:koishi ' +
    '--sourcemap ' +
    '--footer:js=module.exports={Config,apply,inject,name};',
  { cwd: __dirname + '/..', stdio: 'inherit' }
)
