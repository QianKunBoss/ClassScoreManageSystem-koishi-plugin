export const CONSTANTS = {
  TOKEN_PATTERN: /^[A-Z0-9]+$/,
  QQ_PATTERN: /^\d{5,12}$/,
  SCORE_MIN: -1000,
  SCORE_MAX: 1000,
  RANKING_DEFAULT_LIMIT: 10,
  RANKING_MAX_LIMIT: 50,
  SCORE_LOGS_DEFAULT_LIMIT: 20,
  SCORE_LOGS_MAX_LIMIT: 100,
  USERNAME_MAX_LENGTH: 50,
  DESCRIPTION_MAX_LENGTH: 255,
}

export const ERROR_MESSAGES = {
  NO_SERVER_CONFIG: '未配置CSMS服务器，请先使用 /绑定服务器 命令配置',
  INVALID_TOKEN: '无效的Token格式，Token必须由数字和英文大写字母组成',
  INVALID_QQ: '无效的QQ号码格式',
  INVALID_SCORE: '分数必须在 -1000 到 1000 之间',
  INVALID_USERNAME: '用户名不能为空且长度不能超过50个字符',
  INVALID_DESCRIPTION: '描述信息长度不能超过255个字符',
  INVALID_LIMIT: '数量必须在 1 到 50 之间',
  SERVER_NOT_FOUND: '服务器未找到',
  USER_NOT_FOUND: '用户未找到',
  USER_ALREADY_BOUND: '该QQ号已绑定其他用户',
  USER_NOT_BOUND: '该QQ号未绑定任何用户',
  API_REQUEST_FAILED: 'API请求失败',
  INSUFFICIENT_PERMISSION: '权限不足，仅管理员可执行此操作',
  BINDING_FAILED: '绑定失败',
  UNBINDING_FAILED: '解除绑定失败',
  CONFIGURATION_FAILED: '配置保存失败',
} as const

export const SUCCESS_MESSAGES = {
  SERVER_CONFIGURED: '服务器配置成功',
  SERVER_VALIDATED: '服务器配置验证成功',
  QQ_BOUND: 'QQ绑定成功',
  QQ_UNBOUND: 'QQ解除绑定成功',
  SCORE_ADJUSTED: '积分调整成功',
  USER_CREATED: '用户创建成功',
} as const

export const HELP_MESSAGES = {
  BIND_SERVER: '绑定CSMS服务器\n用法：/绑定服务器 <服务器地址> <管理员用户名> <管理员Token>\n示例：/绑定服务器 https://example.com admin ABC123',
  QUERY_SCORE: '查询积分\n用法：/查询积分 [用户名]\n示例：/查询积分 张三',
  ADJUST_SCORE: '调整积分\n用法：/调整积分 <用户名> <分数> <原因>\n示例：/调整积分 张三 +5 表现优秀',
  BIND_QQ: '绑定QQ\n用法：/绑定QQ <用户名>\n示例：/绑定QQ 张三',
  VIEW_BINDING: '查看绑定\n用法：/查看绑定 [用户名]\n示例：/查看绑定 张三',
  UNBIND_QQ: '解除绑定\n用法：/解除绑定 <QQ号>\n示例：/解除绑定 123456789',
  RANKING: '排行榜\n用法：/排行榜 [数量]\n示例：/排行榜 10',
  STATISTICS: '统计\n用法：/统计 [用户名]\n示例：/统计 张三',
} as const