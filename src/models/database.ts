import { Context, Schema, Tables } from 'koishi'

export interface ServerConfig {
  id: number
  guildId: string
  name: string
  address: string
  username: string
  token: string
  createdAt: Date
  updatedAt: Date
}

export interface QqBinding {
  id: number
  guildId: string
  userId: number
  username: string
  openId: string   // Koishi session.userId（QQ OpenID，非传统QQ号）
  serverId: number
  createdAt: Date
  updatedAt: Date
}

export interface GroupAdmin {
  id: number
  guildId: string
  openId: string     // OpenID（用户确认时获取）
  remark: string     // 备注（用于减管）
  verify: number     // 验证状态：0=待确认, 1=已确认
  createdAt: Date
}

declare module 'koishi' {
  interface Tables {
    server_configs: ServerConfig
    qq_bindings: QqBinding
    group_admins: GroupAdmin
  }
}

export function extendDatabase(ctx: Context) {
  ctx.model.extend('server_configs', {
    id: 'integer',
    guildId: 'string',
    name: 'string',
    address: 'string',
    username: 'string',
    token: 'string',
    createdAt: 'timestamp',
    updatedAt: 'timestamp',
  }, {
    primary: 'id',
    autoInc: true,
  })

  ctx.model.extend('qq_bindings', {
    id: 'integer',
    guildId: 'string',
    userId: 'integer',
    username: 'string',
    openId: 'string',
    serverId: 'integer',
    createdAt: 'timestamp',
    updatedAt: 'timestamp',
  }, {
    primary: 'id',
    autoInc: true,
    unique: ['openId', 'guildId'],
  })

  ctx.model.extend('group_admins', {
    id: 'integer',
    guildId: 'string',
    openId: 'string',
    remark: 'string',
    verify: 'integer',
    createdAt: 'timestamp',
  }, {
    primary: 'id',
    autoInc: true,
    unique: ['openId', 'guildId'],
  })
}