var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var __export = (target, all) => {
  for (var name2 in all)
    __defProp(target, name2, { get: all[name2], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var src_exports = {};
__export(src_exports, {
  Config: () => Config,
  apply: () => apply,
  inject: () => inject,
  name: () => name
});
module.exports = __toCommonJS(src_exports);
var import_koishi4 = require("koishi");

// src/models/database.ts
function extendDatabase(ctx) {
  ctx.model.extend("server_configs", {
    id: "integer",
    guildId: "string",
    name: "string",
    address: "string",
    username: "string",
    token: "string",
    createdAt: "timestamp",
    updatedAt: "timestamp"
  }, {
    primary: "id",
    autoInc: true
  });
  ctx.model.extend("qq_bindings", {
    id: "integer",
    guildId: "string",
    userId: "integer",
    username: "string",
    openId: "string",
    serverId: "integer",
    createdAt: "timestamp",
    updatedAt: "timestamp"
  }, {
    primary: "id",
    autoInc: true,
    unique: ["openId", "guildId"]
  });
  ctx.model.extend("group_admins", {
    id: "integer",
    guildId: "string",
    openId: "string",
    remark: "string",
    verify: "integer",
    createdAt: "timestamp"
  }, {
    primary: "id",
    autoInc: true,
    unique: ["openId", "guildId"]
  });
}
__name(extendDatabase, "extendDatabase");

// src/services/api.ts
var CsmsApiService = class {
  static {
    __name(this, "CsmsApiService");
  }
  baseUrl;
  token;
  ctx;
  constructor(ctx, baseUrl, token) {
    this.ctx = ctx;
    this.baseUrl = baseUrl.replace(/\/api\/global_api\.php$/, "").replace(/\/$/, "");
    this.token = token;
  }
  /**
   * 发送 API 请求
   * 按照 global_api.md 文档规范实现
   */
  async request(params) {
    try {
      const url = `${this.baseUrl}/api/global_api.php`;
      const cleanParams = {};
      for (const [key, value] of Object.entries(params)) {
        if (value !== void 0 && value !== null) {
          cleanParams[key] = String(value);
        }
      }
      this.ctx.logger.debug(`API请求: ${url}`, cleanParams);
      const response = await this.ctx.http.get(url, {
        params: cleanParams,
        headers: {
          "Authorization": this.token
        }
      });
      this.ctx.logger.debug(`API响应:`, response);
      return response;
    } catch (error) {
      this.ctx.logger.error("CSMS API 请求失败:", error);
      return { error: error.message || "API请求失败" };
    }
  }
  /**
   * 验证 Token - 使用 verify_token 接口
   * GET /api/global_api.php?action=verify_token&token=xxx
   * 成功: {"success":true,"message":"token 有效","username":"admin","new_token":"..."}
   * 失败: {"error":"无效的token，token不存在或已失效"}
   */
  async validateToken() {
    try {
      const url = `${this.baseUrl}/api/global_api.php`;
      const params = {
        action: "verify_token",
        token: this.token
      };
      this.ctx.logger.info(`验证Token中...`);
      const response = await this.ctx.http.get(url, { params });
      if (response.error) {
        this.ctx.logger.warn(`Token验证失败: ${response.error}`);
        return { valid: false };
      }
      if (response.success) {
        this.ctx.logger.info(`Token验证成功，用户: ${response.username}`);
        return {
          valid: true,
          username: response.username,
          newToken: response.new_token
        };
      }
      return { valid: false };
    } catch (error) {
      this.ctx.logger.error(`Token验证异常:`, error);
      return { valid: false };
    }
  }
  /**
   * 查询用户列表
   * GET /api/global_api.php?users&order_by=xxx&order=DESC&limit=20&offset=0
   */
  async getUsers(options) {
    const params = { users: "" };
    if (options?.where) {
      params.where = JSON.stringify(options.where);
    }
    if (options?.order_by) {
      params.order_by = options.order_by;
    }
    if (options?.order) {
      params.order = options.order;
    }
    if (options?.limit !== void 0) {
      params.limit = options.limit.toString();
    }
    if (options?.offset !== void 0) {
      params.offset = options.offset.toString();
    }
    if (options?.search) {
      params.search = options.search;
    }
    return this.request(params);
  }
  /**
   * 查询单个用户
   * GET /api/global_api.php?users&id=xxx
   */
  async getUserById(id) {
    return this.request({ users: "", id: id.toString() });
  }
  /**
   * 按用户名查询用户
   * GET /api/global_api.php?users&where={"username":"xxx"}
   */
  async getUserByUsername(username) {
    return this.request({
      users: "",
      where: JSON.stringify({ username })
    });
  }
  /**
   * 按QQ号查询用户
   * GET /api/global_api.php?users&where={"qq_number":"xxx"}
   */
  async getUserByQq(qqNumber) {
    return this.request({
      users: "",
      where: JSON.stringify({ qq_number: qqNumber })
    });
  }
  /**
   * 获取排行榜（按 total_score 降序）
   * GET /api/global_api.php?users&order_by=total_score&order=DESC&limit=20
   */
  async getRanking(limit = 20, offset = 0) {
    return this.request({
      users: "",
      order_by: "total_score",
      order: "DESC",
      limit: limit.toString(),
      offset: offset.toString()
    });
  }
  /**
   * 查询积分记录
   * GET /api/global_api.php?score_logs&where={"user_id":xxx}&order_by=created_at&order=DESC&limit=50
   */
  async getScoreLogs(userId, limit = 50) {
    return this.request({
      score_logs: "",
      where: JSON.stringify({ user_id: userId }),
      order_by: "created_at",
      order: "DESC",
      limit: limit.toString()
    });
  }
  /**
   * 创建新用户
   * GET /api/global_api.php?users&action=create&data={"username":"xxx"}&token=xxx
   */
  async createUser(username) {
    return this.request({
      users: "",
      action: "create",
      data: JSON.stringify({ username })
    });
  }
  /**
   * 更新用户信息（如绑定QQ号）
   * GET /api/global_api.php?users&action=update&id=xxx&data={"qq_number":"xxx"}&token=xxx
   */
  async updateUser(userId, data) {
    return this.request({
      users: "",
      action: "update",
      id: userId.toString(),
      data: JSON.stringify(data)
    });
  }
  /**
   * 绑定用户QQ号
   */
  async bindQq(userId, qqNumber) {
    return this.updateUser(userId, { qq_number: qqNumber });
  }
  /**
   * 批量加减分
   * GET /api/global_api.php?action=add_score&data={"users":[...],"description":"xxx"}&token=xxx
   */
  async batchAddScore(data) {
    this.ctx.logger.info(`batchAddScore 请求数据:`, JSON.stringify(data));
    const response = await this.request({
      action: "add_score",
      data: JSON.stringify(data)
    });
    this.ctx.logger.info(`batchAddScore API 响应:`, JSON.stringify(response));
    if (response.error) {
      return {
        success: false,
        message: response.error,
        summary: { success_count: 0, failed_count: 0, total_count: 0 },
        details: []
      };
    }
    if (response.data && typeof response.data === "object" && "summary" in response.data) {
      return response.data;
    }
    if (response && typeof response === "object" && "summary" in response) {
      return response;
    }
    if (Array.isArray(response.data)) {
      return {
        success: true,
        message: "操作完成",
        summary: { success_count: response.data.length, failed_count: 0, total_count: response.data.length },
        details: response.data
      };
    }
    this.ctx.logger.error(`batchAddScore 返回数据格式异常，原始响应:`, response);
    return {
      success: false,
      message: "API 返回数据格式异常",
      summary: { success_count: 0, failed_count: 0, total_count: 0 },
      details: []
    };
  }
  /**
   * 单用户加减分
   */
  async addScore(username, scoreChange, description) {
    return this.batchAddScore({
      users: [{ username, score_change: scoreChange }],
      description
    });
  }
};

// src/services/server.ts
var ServerConfigService = class {
  static {
    __name(this, "ServerConfigService");
  }
  ctx;
  constructor(ctx) {
    this.ctx = ctx;
  }
  async saveConfig(guildId, name2, address, username, token) {
    const now = /* @__PURE__ */ new Date();
    const existingConfigs = await this.ctx.database.get("server_configs", { guildId });
    const baseUrl = address.replace(/\/api\/global_api\.php$/, "").replace(/\/$/, "");
    if (existingConfigs.length > 0) {
      await this.ctx.database.set("server_configs", { guildId }, {
        name: name2,
        address: baseUrl,
        username,
        token,
        updatedAt: now
      });
      return { ...existingConfigs[0], name: name2, address: baseUrl, username, token, updatedAt: now };
    }
    const config = await this.ctx.database.create("server_configs", {
      guildId,
      name: name2,
      address: baseUrl,
      username,
      token,
      createdAt: now,
      updatedAt: now
    });
    return config;
  }
  async getConfigByGuild(guildId) {
    const configs = await this.ctx.database.get("server_configs", { guildId });
    return configs[0] || null;
  }
  async getAllConfigs() {
    return this.ctx.database.get("server_configs", {});
  }
  async deleteConfig(guildId) {
    await this.ctx.database.remove("server_configs", { guildId });
    return true;
  }
  async createApiService(guildId) {
    const config = await this.getConfigByGuild(guildId);
    if (!config) return null;
    return new CsmsApiService(this.ctx, config.address, config.token);
  }
  async validateConfig(address, username, token) {
    try {
      const baseUrl = address.replace(/\/api\/global_api\.php$/, "").replace(/\/$/, "");
      const api = new CsmsApiService(this.ctx, baseUrl, token);
      const result = await api.validateToken();
      if (result.valid) {
        if (result.username && result.username !== username) {
          return {
            valid: true,
            actualUsername: result.username,
            newToken: result.newToken,
            error: `警告：提供的用户名 "${username}" 与实际登录的管理员 "${result.username}" 不一致`
          };
        }
        return { valid: true, actualUsername: result.username, newToken: result.newToken };
      }
      return { valid: false, error: "Token 验证失败，请检查 Token 是否正确" };
    } catch (error) {
      this.ctx.logger.error("验证服务器配置失败:", error);
      return { valid: false, error: error.message };
    }
  }
};

// src/services/binding.ts
var QqBindingService = class {
  static {
    __name(this, "QqBindingService");
  }
  ctx;
  constructor(ctx) {
    this.ctx = ctx;
  }
  /**
   * openId 即 session.userId（QQ OpenID，非传统QQ号）
   */
  async bindQq(guildId, userId, username, openId, serverId) {
    const now = /* @__PURE__ */ new Date();
    const bindings = await this.ctx.database.get("qq_bindings", { openId, guildId });
    if (bindings.length > 0) {
      await this.ctx.database.set("qq_bindings", { openId, guildId }, {
        userId,
        username,
        serverId,
        updatedAt: now
      });
      return { ...bindings[0], userId, username, serverId, updatedAt: now };
    }
    const binding = await this.ctx.database.create("qq_bindings", {
      guildId,
      userId,
      username,
      openId,
      serverId,
      createdAt: now,
      updatedAt: now
    });
    return binding;
  }
  async unbindQq(guildId, openId) {
    await this.ctx.database.remove("qq_bindings", { openId, guildId });
    return true;
  }
  async unbindByUserId(guildId, userId) {
    await this.ctx.database.remove("qq_bindings", { userId, guildId });
    return true;
  }
  async getUserByOpenId(guildId, openId) {
    const bindings = await this.ctx.database.get("qq_bindings", { openId, guildId });
    return bindings[0] || null;
  }
  async getQqByUserId(guildId, userId) {
    const bindings = await this.ctx.database.get("qq_bindings", { userId, guildId });
    return bindings[0] || null;
  }
  async getAllBindings(guildId) {
    return this.ctx.database.get("qq_bindings", { guildId });
  }
  async getBindingsByServer(guildId, serverId) {
    return this.ctx.database.get("qq_bindings", { serverId, guildId });
  }
  async getBindingsByUsername(guildId, username) {
    return this.ctx.database.get("qq_bindings", { username, guildId });
  }
};

// src/services/group-admin.ts
var GroupAdminService = class {
  static {
    __name(this, "GroupAdminService");
  }
  ctx;
  constructor(ctx) {
    this.ctx = ctx;
  }
  /**
   * 添加已验证的管理员（verify = 1，用于绑定服务器时自动升级）
   */
  async addAdmin(guildId, openId, remark) {
    const existing = await this.ctx.database.get("group_admins", { guildId, openId });
    if (existing.length > 0) {
      await this.ctx.database.set("group_admins", { guildId, openId }, { remark, verify: 1 });
      return { ...existing[0], remark, verify: 1 };
    }
    return this.ctx.database.create("group_admins", {
      guildId,
      openId,
      remark,
      verify: 1,
      createdAt: /* @__PURE__ */ new Date()
    });
  }
  /**
   * 创建待确认的群管记录（Verify = 0）
   */
  async createPendingAdmin(guildId, openId, remark) {
    const existing = await this.ctx.database.get("group_admins", { guildId, openId });
    if (existing.length > 0) {
      return existing[0];
    }
    return this.ctx.database.create("group_admins", {
      guildId,
      openId,
      remark,
      verify: 0,
      createdAt: /* @__PURE__ */ new Date()
    });
  }
  /**
   * 确认群管（将 Verify 改为 1）
   */
  async confirmAdmin(guildId, openId) {
    await this.ctx.database.set("group_admins", { guildId, openId }, { verify: 1 });
    return true;
  }
  /**
   * 移除群管（按备注 查找并删除）
   */
  async removeAdminByRemark(guildId, remark) {
    await this.ctx.database.remove("group_admins", { guildId, remark });
    return true;
  }
  /**
   * 检查是否为已确认的群管（OpenID + Verify = 1）
   */
  async isAdmin(guildId, openId) {
    const admins = await this.ctx.database.get("group_admins", { guildId, openId });
    return admins.length > 0 && admins[0].verify === 1;
  }
  /**
   * 获取所有群管
   */
  async getAllAdmins(guildId) {
    return this.ctx.database.get("group_admins", { guildId });
  }
  /**
   * 检查用户是否有管理权限（按 OpenID + Verify = 1）
   */
  async hasAdminPermission(session) {
    const openId = session.userId?.toString();
    if (!openId || !session.guildId) return false;
    return await this.isAdmin(session.guildId, openId);
  }
};

// src/utils/constants.ts
var CONSTANTS = {
  TOKEN_PATTERN: /^[A-Z0-9]+$/,
  QQ_PATTERN: /^\d{5,12}$/,
  SCORE_MIN: -1e3,
  SCORE_MAX: 1e3,
  RANKING_DEFAULT_LIMIT: 10,
  RANKING_MAX_LIMIT: 50,
  SCORE_LOGS_DEFAULT_LIMIT: 20,
  SCORE_LOGS_MAX_LIMIT: 100,
  USERNAME_MAX_LENGTH: 50,
  DESCRIPTION_MAX_LENGTH: 255
};
var ERROR_MESSAGES = {
  NO_SERVER_CONFIG: "未配置CSMS服务器，请先使用 /绑定服务器 命令配置",
  INVALID_TOKEN: "无效的Token格式，Token必须由数字和英文大写字母组成",
  INVALID_QQ: "无效的QQ号码格式",
  INVALID_SCORE: "分数必须在 -1000 到 1000 之间",
  INVALID_USERNAME: "用户名不能为空且长度不能超过50个字符",
  INVALID_DESCRIPTION: "描述信息长度不能超过255个字符",
  INVALID_LIMIT: "数量必须在 1 到 50 之间",
  SERVER_NOT_FOUND: "服务器未找到",
  USER_NOT_FOUND: "用户未找到",
  USER_ALREADY_BOUND: "该QQ号已绑定其他用户",
  USER_NOT_BOUND: "该QQ号未绑定任何用户",
  API_REQUEST_FAILED: "API请求失败",
  INSUFFICIENT_PERMISSION: "权限不足，仅管理员可执行此操作",
  BINDING_FAILED: "绑定失败",
  UNBINDING_FAILED: "解除绑定失败",
  CONFIGURATION_FAILED: "配置保存失败"
};
var HELP_MESSAGES = {
  BIND_SERVER: "绑定CSMS服务器\n用法：/绑定服务器 <服务器地址> <管理员用户名> <管理员Token>\n示例：/绑定服务器 https://example.com admin ABC123",
  QUERY_SCORE: "查询积分\n用法：/查询积分 [用户名]\n示例：/查询积分 张三",
  ADJUST_SCORE: "调整积分\n用法：/调整积分 <用户名> <分数> <原因>\n示例：/调整积分 张三 +5 表现优秀",
  BIND_QQ: "绑定QQ\n用法：/绑定QQ <用户名>\n示例：/绑定QQ 张三",
  VIEW_BINDING: "查看绑定\n用法：/查看绑定 [用户名]\n示例：/查看绑定 张三",
  UNBIND_QQ: "解除绑定\n用法：/解除绑定 <QQ号>\n示例：/解除绑定 123456789",
  RANKING: "排行榜\n用法：/排行榜 [数量]\n示例：/排行榜 10",
  STATISTICS: "统计\n用法：/统计 [用户名]\n示例：/统计 张三"
};

// src/utils/validator.ts
var Validator = class {
  static {
    __name(this, "Validator");
  }
  static validateToken(token) {
    return CONSTANTS.TOKEN_PATTERN.test(token);
  }
  static validateQq(qqNumber) {
    return qqNumber && qqNumber.length > 0 && /^\d+$/.test(qqNumber);
  }
  static validateScore(score) {
    return score >= CONSTANTS.SCORE_MIN && score <= CONSTANTS.SCORE_MAX;
  }
  static validateUsername(username) {
    return username.length > 0 && username.length <= CONSTANTS.USERNAME_MAX_LENGTH;
  }
  static validateDescription(description) {
    return description.length <= CONSTANTS.DESCRIPTION_MAX_LENGTH;
  }
  static validateLimit(limit, max = CONSTANTS.RANKING_MAX_LIMIT) {
    return limit > 0 && limit <= max;
  }
  static validateScoreWithMessage(score) {
    if (!this.validateScore(score)) {
      return ERROR_MESSAGES.INVALID_SCORE;
    }
    return null;
  }
  static validateQqWithMessage(qqNumber) {
    if (!this.validateQq(qqNumber)) {
      return ERROR_MESSAGES.INVALID_QQ;
    }
    return null;
  }
  static validateTokenWithMessage(token) {
    if (!this.validateToken(token)) {
      return ERROR_MESSAGES.INVALID_TOKEN;
    }
    return null;
  }
  static validateUsernameWithMessage(username) {
    if (!this.validateUsername(username)) {
      return ERROR_MESSAGES.INVALID_USERNAME;
    }
    return null;
  }
  static validateDescriptionWithMessage(description) {
    if (!this.validateDescription(description)) {
      return ERROR_MESSAGES.INVALID_DESCRIPTION;
    }
    return null;
  }
  static validateLimitWithMessage(limit, max = CONSTANTS.RANKING_MAX_LIMIT) {
    if (!this.validateLimit(limit, max)) {
      return `数量必须在 1 到 ${max} 之间`;
    }
    return null;
  }
};

// src/utils/formatter.ts
var Formatter = class {
  static {
    __name(this, "Formatter");
  }
  // QQ 消息单条最大长度限制（留有余量）
  static MAX_MESSAGE_LENGTH = 1800;
  static formatScoreInfo(user, ranking) {
    return [
      `用户: ${user.username}`,
      `排名: ${ranking || "未知"}`,
      `总积分: ${user.total_score}`,
      `累计加分: ${user.add_score}`,
      `累计扣分: ${user.deduct_score}`,
      `记录数: ${user.score_count}`
    ].join("\n");
  }
  static formatRanking(users) {
    if (users.length === 0) {
      return "暂无排名数据";
    }
    const lines = ["【积分排行榜】"];
    const displayUsers = users.slice(0, 20);
    displayUsers.forEach((user, index) => {
      const medal = index < 3 ? ["🥇", "🥈", "🥉"][index] : `${index + 1}.`;
      lines.push(`${medal} ${user.username}: ${user.total_score}分`);
    });
    if (users.length > 20) {
      lines.push(`... 共 ${users.length} 人，显示前20名`);
    }
    return lines.join("\n");
  }
  /**
   * 格式化排行榜（带实际排名，用于分页）
   */
  static formatRankingWithRank(users, startRank) {
    if (users.length === 0) {
      return "暂无排名数据";
    }
    const lines = ["【积分排行榜】"];
    users.forEach((user, index) => {
      const rank = startRank + index;
      const medal = rank <= 3 ? ["🥇", "🥈", "🥉"][rank - 1] : `${rank}.`;
      lines.push(`${medal} ${user.username}: ${user.total_score}分`);
    });
    return lines.join("\n");
  }
  static getMedal(index) {
    const medals = ["🥇", "🥈", "🥉"];
    return medals[index] || `${index + 1}.`;
  }
  static formatScoreLogs(logs) {
    if (logs.length === 0) {
      return "暂无积分记录";
    }
    const lines = ["【积分记录】"];
    const displayLogs = logs.slice(0, 10);
    displayLogs.forEach((log) => {
      const change = log.score_change > 0 ? `+${log.score_change}` : log.score_change;
      lines.push(`${change}分 - ${log.description}`);
    });
    if (logs.length > 10) {
      lines.push(`... 共 ${logs.length} 条记录`);
    }
    return lines.join("\n");
  }
  static formatStatistics(user, logs) {
    const lines = [
      `【${user.username} 的统计信息】`,
      `总积分: ${user.total_score}`,
      `累计加分: ${user.add_score}`,
      `累计扣分: ${user.deduct_score}`,
      `记录数: ${user.score_count}`,
      "最近积分记录:"
    ];
    const recentLogs = logs.slice(0, 5);
    if (recentLogs.length > 0) {
      recentLogs.forEach((log) => {
        const change = log.score_change > 0 ? `+${log.score_change}` : log.score_change;
        lines.push(`${change}分 - ${log.description}`);
      });
    } else {
      lines.push("暂无记录");
    }
    return lines.join("\n");
  }
  static formatAddScoreResult(result) {
    const status = result.success ? "积分调整成功" : "积分调整失败";
    const summary = `成功: ${result.summary.success_count} 条，失败: ${result.summary.failed_count} 条`;
    const lines = [status, summary];
    if (!result.success && result.message) {
      lines.push(`原因: ${result.message}`);
    }
    if (result.details && result.details.length > 0) {
      lines.push("详情:");
      result.details.forEach((detail) => {
        if (detail.success) {
          const change = detail.score_change > 0 ? "+" : "";
          lines.push(`[OK] ${detail.username}: ${change}${detail.score_change}分`);
        } else {
          lines.push(`[FAIL] ${detail.username}: ${detail.error || "失败"}`);
        }
      });
    }
    return lines.join("\n");
  }
  static formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    });
  }
  /**
   * 安全发送消息，自动分割过长的消息
   * 返回消息片段数组，由调用者处理发送
   */
  static splitMessage(message) {
    if (message.length <= this.MAX_MESSAGE_LENGTH) {
      return [message];
    }
    const parts = message.split("\n");
    const result = [];
    let currentPart = "";
    for (const line of parts) {
      if ((currentPart + "\n" + line).length > this.MAX_MESSAGE_LENGTH) {
        if (currentPart) {
          result.push(currentPart);
        }
        currentPart = line;
      } else {
        currentPart = currentPart ? currentPart + "\n" + line : line;
      }
    }
    if (currentPart) {
      result.push(currentPart);
    }
    return result;
  }
};

// src/commands/bind-server.ts
function registerBindServerCommand(ctx, serverService, adminService) {
  ctx.command("绑定服务器 <地址:string> <用户名:string> <token:string>").alias("bind-server").action(async ({ session }, address, username, token) => {
    if (!address || !username || !token) {
      return HELP_MESSAGES.BIND_SERVER;
    }
    if (!session.guildId) {
      return "此命令只能在群聊中使用";
    }
    const openId = session.userId?.toString();
    if (!openId) {
      return "无法获取您的用户ID";
    }
    const existingConfig = await serverService.getConfigByGuild(session.guildId);
    if (existingConfig) {
      return "❌ 该群聊已绑定服务器，如需更换请先使用 /服务器解绑";
    }
    const tokenError = Validator.validateTokenWithMessage(token);
    if (tokenError) {
      ctx.logger.info(`Token 格式验证失败: ${tokenError}`);
      return `Token 格式验证失败`;
    }
    try {
      ctx.logger.info(`正在验证服务器配置...`);
      const result = await serverService.validateConfig(address, username, token);
      if (!result.valid) {
        const errorMsg = result.error || "服务器配置验证失败";
        ctx.logger.info(`服务器配置验证失败: ${errorMsg}`);
        return `验证失败: ${errorMsg}`;
      }
      const actualUsername = result.actualUsername || username;
      const newToken = result.newToken || token;
      const config = await serverService.saveConfig(session.guildId, "CSMS服务器", address, actualUsername, newToken);
      await adminService.addAdmin(session.guildId, openId, "管理员");
      ctx.logger.info(`群聊 ${session.guildId} 的首个绑定者 ${openId} 被自动添加为管理员`);
      const domain = config.address.replace(/^https?:\/\//, "").split("/")[0];
      ctx.logger.info(`服务器配置成功，domain=${domain}，username=${actualUsername}`);
      return `✅ 服务器配置成功，新token已生成，旧token已失效`;
    } catch (error) {
      ctx.logger.error("保存服务器配置失败:", error);
      return `配置保存失败: ${error.message}`;
    }
  });
  ctx.command("服务器解绑").alias("unbind-server").action(async ({ session }) => {
    if (!session.guildId) {
      return "此命令只能在群聊中使用";
    }
    const hasPermission = await adminService.hasAdminPermission(session);
    if (!hasPermission) {
      return "❌ 此命令仅限管理员使用";
    }
    const config = await serverService.getConfigByGuild(session.guildId);
    if (!config) {
      return "❌ 该群聊尚未绑定任何服务器";
    }
    await session.send("⚠️ 确定要解除服务器绑定吗？解绑后其他人可重新绑定。请在 30 秒内输入「确认」来完成操作");
    const reply = await session.prompt(3e4);
    if (reply?.trim() !== "确认") {
      return "✅ 已取消解绑操作";
    }
    await serverService.deleteConfig(session.guildId);
    ctx.logger.info(`群聊 ${session.guildId} 解除了服务器绑定`);
    return `✅ 已解除服务器绑定`;
  });
}
__name(registerBindServerCommand, "registerBindServerCommand");

// src/utils/image.ts
var import_koishi = require("koishi");
var currentConfig = {
  backgroundImage: "https://api.yppp.net/pe.php",
  cardOpacity: 0.5
};
function setImageConfig(config) {
  currentConfig = { ...currentConfig, ...config };
}
__name(setImageConfig, "setImageConfig");
async function generateImage(ctx, html, options = {}) {
  const width = options.width || 450;
  const height = options.height || 800;
  try {
    const page = await ctx.puppeteer.page();
    await page.setViewport({
      width,
      height,
      deviceScaleFactor: 2
    });
    await page.setContent(html, { waitUntil: "networkidle0" });
    await page.evaluateHandle("document.fonts.ready");
    await page.evaluate(() => {
      return new Promise((resolve) => {
        const img = document.querySelector("body");
        if (img && img.style.backgroundImage) {
          const bgImg = new Image();
          bgImg.onload = () => resolve();
          bgImg.onerror = () => resolve();
          bgImg.src = img.style.backgroundImage.replace(/url\(['"]?(.+?)['"]?\)/, "$1");
        } else {
          resolve();
        }
      });
    });
    const screenshot = await page.screenshot({
      type: "png",
      clip: { x: 0, y: 0, width, height }
    });
    return screenshot;
  } catch (error) {
    ctx.logger.error("生成图片失败:", error);
    return null;
  }
}
__name(generateImage, "generateImage");
async function sendImageOrText(ctx, session, html, fallbackText, options = {}) {
  const image = await generateImage(ctx, html, options);
  if (image) {
    await session.send(import_koishi.h.image(image, "image/png"));
  } else {
    await session.send(fallbackText);
  }
}
__name(sendImageOrText, "sendImageOrText");
function getBaseStyles(config) {
  const bg = config?.backgroundImage || currentConfig.backgroundImage || "https://api.yppp.net/pe.php";
  const opacity = config?.cardOpacity ?? currentConfig.cardOpacity ?? 0.5;
  return `
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
      background: url('${bg}') center/cover no-repeat;
      width: 450px;
      min-height: 800px;
      display: flex;
      justify-content: center;
      align-items: flex-start;
      padding: 40px 0;
    }
    .container {
      background: rgba(255, 255, 255, ${opacity});
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
  `;
}
__name(getBaseStyles, "getBaseStyles");

// src/commands/query-score.ts
function registerQueryScoreCommand(ctx, serverService, bindingService) {
  ctx.command("查询积分 [用户名:string]").alias("query-score").action(async ({ session }, username) => {
    if (!session.guildId) {
      return "此命令只能在群聊中使用";
    }
    const api = await serverService.createApiService(session.guildId);
    if (!api) {
      return ERROR_MESSAGES.NO_SERVER_CONFIG;
    }
    try {
      let targetUsername = username;
      if (!username) {
        const openId = session.userId?.toString();
        if (!openId) {
          return "无法获取您的用户ID";
        }
        const binding = await bindingService.getUserByOpenId(session.guildId, openId);
        if (!binding) {
          return `${ERROR_MESSAGES.USER_NOT_BOUND}。请先使用 /绑定QQ <用户名> 命令绑定您的账号`;
        }
        targetUsername = binding.username;
      }
      const response = await api.getUserByUsername(targetUsername);
      if (response.error || !response.data || response.data.length === 0) {
        return ERROR_MESSAGES.USER_NOT_FOUND;
      }
      const user = response.data[0];
      const rankingResponse = await api.getRanking(CONSTANTS.RANKING_MAX_LIMIT, 0);
      let ranking = 0;
      if (!rankingResponse.error && rankingResponse.data) {
        const index = rankingResponse.data.findIndex((u) => u.id === user.id);
        ranking = index >= 0 ? index + 1 : 0;
      }
      const textResult = Formatter.formatScoreInfo(user, ranking);
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
</html>`;
      await sendImageOrText(ctx, session, html, textResult, { height: 600 });
      return "";
    } catch (error) {
      ctx.logger.error("查询积分失败:", error);
      return ERROR_MESSAGES.API_REQUEST_FAILED;
    }
  });
}
__name(registerQueryScoreCommand, "registerQueryScoreCommand");

// src/commands/bind-qq.ts
function registerBindQqCommand(ctx, serverService, bindingService) {
  ctx.command("绑定QQ <用户名:string>").alias("bind-qq").action(async ({ session }, username) => {
    if (!username) {
      return HELP_MESSAGES.BIND_QQ;
    }
    if (!session.guildId) {
      return "此命令只能在群聊中使用";
    }
    const usernameError = Validator.validateUsernameWithMessage(username);
    if (usernameError) {
      return usernameError;
    }
    const openId = session.userId?.toString();
    if (!openId) {
      return "无法获取您的用户ID";
    }
    ctx.logger.info(`获取到的用户 OpenID: ${openId}`);
    const config = await serverService.getConfigByGuild(session.guildId);
    if (!config) {
      return ERROR_MESSAGES.NO_SERVER_CONFIG;
    }
    try {
      const existingBinding = await bindingService.getUserByOpenId(session.guildId, openId);
      if (existingBinding) {
        return `❌ 您已绑定「${existingBinding.username}」，如需更换账号请先使用 /解除绑定 解绑后重新绑定`;
      }
      const existingBindings = await bindingService.getBindingsByUsername(session.guildId, username);
      if (existingBindings.length > 0) {
        return `❌ 用户名「${username}」已被其他QQ账号绑定，每个用户名只能绑定一个QQ`;
      }
      const api = await serverService.createApiService(session.guildId);
      if (!api) {
        return ERROR_MESSAGES.NO_SERVER_CONFIG;
      }
      const response = await api.getUserByUsername(username);
      if (response.error || !response.data || response.data.length === 0) {
        return ERROR_MESSAGES.USER_NOT_FOUND;
      }
      const user = response.data[0];
      await bindingService.bindQq(session.guildId, user.id, username, openId, config.id);
      return `✅ 绑定成功
用户名: ${username}`;
    } catch (error) {
      ctx.logger.error("绑定QQ失败:", error);
      return ERROR_MESSAGES.BINDING_FAILED;
    }
  });
  ctx.command("解除绑定").alias("unbind").action(async ({ session }, username) => {
    if (!session.guildId) {
      return "此命令只能在群聊中使用";
    }
    const openId = session.userId?.toString();
    if (!openId) {
      return "无法获取您的用户ID";
    }
    let binding = null;
    if (username) {
      const bindings = await bindingService.getBindingsByUsername(session.guildId, username);
      binding = bindings.find((b) => b.openId === openId);
    } else {
      binding = await bindingService.getUserByOpenId(session.guildId, openId);
    }
    if (!binding) {
      return `❌ 您尚未绑定任何账号${username ? `（用户：${username}）` : ""}`;
    }
    await session.send(`⚠️ 确定要解除「${binding.username}」的绑定吗？请在 30 秒内输入「确认」来完成操作`);
    const reply = await session.prompt(3e4);
    if (reply?.trim() !== "确认") {
      return "✅ 已取消解绑操作";
    }
    await bindingService.unbindQq(session.guildId, openId);
    ctx.logger.info(`用户 ${binding.username}（OpenID: ${openId}）解除了绑定`);
    return `✅ 已解除「${binding.username}」的绑定`;
  });
}
__name(registerBindQqCommand, "registerBindQqCommand");

// src/commands/adjust-score.ts
function registerAdjustScoreCommand(ctx, serverService, adminService) {
  ctx.command("调整积分 <用户名:string> <分数:number> <原因:text>").alias("adjust-score").action(async ({ session }, username, score, reason) => {
    if (!username || score === void 0 || !reason) {
      return HELP_MESSAGES.ADJUST_SCORE;
    }
    if (!session.guildId) {
      return "此命令只能在群聊中使用";
    }
    const hasPermission = await adminService.hasAdminPermission(session);
    if (!hasPermission) {
      return ERROR_MESSAGES.INSUFFICIENT_PERMISSION;
    }
    const usernameError = Validator.validateUsernameWithMessage(username);
    if (usernameError) {
      return usernameError;
    }
    const scoreError = Validator.validateScoreWithMessage(score);
    if (scoreError) {
      return scoreError;
    }
    const descriptionError = Validator.validateDescriptionWithMessage(reason);
    if (descriptionError) {
      return descriptionError;
    }
    const api = await serverService.createApiService(session.guildId);
    if (!api) {
      return ERROR_MESSAGES.NO_SERVER_CONFIG;
    }
    try {
      const data = {
        users: [
          {
            username,
            score_change: score
          }
        ],
        description: reason
      };
      ctx.logger.info(`调整积分请求: 用户=${username}, 分数=${score}, 原因=${reason}`);
      const result = await api.batchAddScore(data);
      ctx.logger.info(`调整积分结果:`, JSON.stringify(result));
      const message = Formatter.formatAddScoreResult(result);
      return Formatter.splitMessage(message);
    } catch (error) {
      ctx.logger.error("调整积分失败:", error);
      return ERROR_MESSAGES.API_REQUEST_FAILED;
    }
  });
}
__name(registerAdjustScoreCommand, "registerAdjustScoreCommand");

// src/commands/ranking.ts
var PAGE_SIZE = 10;
function registerRankingCommand(ctx, serverService) {
  ctx.command("排行榜 [页码:number]").alias("ranking").action(async ({ session }, page = 1) => {
    if (!session.guildId) {
      return "此命令只能在群聊中使用";
    }
    const api = await serverService.createApiService(session.guildId);
    if (!api) {
      return ERROR_MESSAGES.NO_SERVER_CONFIG;
    }
    try {
      const allResponse = await api.getRanking(1e4, 0);
      if (allResponse.error || !allResponse.data) {
        return ERROR_MESSAGES.API_REQUEST_FAILED;
      }
      const totalUsers = allResponse.data.length;
      const totalPages = Math.ceil(totalUsers / PAGE_SIZE);
      if (page < 1) page = 1;
      if (page > totalPages && totalPages > 0) page = totalPages;
      const offset = (page - 1) * PAGE_SIZE;
      const response = await api.getRanking(PAGE_SIZE, offset);
      if (response.error || !response.data) {
        return ERROR_MESSAGES.API_REQUEST_FAILED;
      }
      if (response.data.length === 0) {
        return `暂无排行数据`;
      }
      const startRank = offset + 1;
      const message = Formatter.formatRankingWithRank(response.data, startRank);
      const pageInfo = totalPages > 1 ? `第 ${page}/${totalPages} 页，共 ${totalUsers} 人` : `共 ${totalUsers} 人`;
      const rankItems = response.data.map((user, index) => {
        const rank = startRank + index;
        const medal = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : `${rank}.`;
        const scoreColor = user.total_score >= 0 ? "#27ae60" : "#e74c3c";
        return `
          <div class="rank-item">
            <span class="rank-num">${medal}</span>
            <span class="rank-name">${user.username}</span>
            <span class="rank-score" style="color: ${scoreColor}">${user.total_score >= 0 ? "+" : ""}${user.total_score}</span>
          </div>`;
      }).join("");
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
</html>`;
      const textResult = message + (totalPages > 1 ? `

📄 ${pageInfo}` : "");
      await sendImageOrText(ctx, session, html, textResult, { height: 820 });
      return "";
    } catch (error) {
      ctx.logger.error("获取排行榜失败:", error);
      return ERROR_MESSAGES.API_REQUEST_FAILED;
    }
  });
}
__name(registerRankingCommand, "registerRankingCommand");

// src/commands/statistics.ts
function registerStatisticsCommand(ctx, serverService, bindingService) {
  ctx.command("统计 [用户名:string]").alias("statistics").action(async ({ session }, username) => {
    if (!session.guildId) {
      return "此命令只能在群聊中使用";
    }
    const api = await serverService.createApiService(session.guildId);
    if (!api) {
      return ERROR_MESSAGES.NO_SERVER_CONFIG;
    }
    try {
      let targetUsername = username;
      if (!username) {
        const openId = session.userId?.toString();
        if (!openId) {
          return "无法获取您的用户ID";
        }
        const binding = await bindingService.getUserByOpenId(session.guildId, openId);
        if (!binding) {
          return `${ERROR_MESSAGES.USER_NOT_BOUND}

请先使用 /绑定QQ <用户名> 命令绑定您的账号`;
        }
        targetUsername = binding.username;
      }
      const userResponse = await api.getUserByUsername(targetUsername);
      if (userResponse.error || !userResponse.data || userResponse.data.length === 0) {
        return ERROR_MESSAGES.USER_NOT_FOUND;
      }
      const user = userResponse.data[0];
      const totalScore = Number(user.total_score) || 0;
      const addScore = Number(user.add_score) || 0;
      const deductScore = Math.abs(Number(user.deduct_score)) || 0;
      const scoreCount = Number(user.score_count) || 0;
      const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    ${getBaseStyles()}
    .user-info {
      text-align: center;
      margin-bottom: 20px;
    }
    .username {
      font-size: 20px;
      font-weight: bold;
      color: #2c3e50;
    }
    .user-id {
      color: #95a5a6;
      font-size: 11px;
      margin-top: 4px;
    }
    .stats-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-top: 16px;
    }
    .stat-card {
      background: rgba(52, 152, 219, 0.1);
      border-radius: 12px;
      padding: 14px;
      text-align: center;
    }
    .stat-card.positive {
      background: rgba(39, 174, 96, 0.1);
    }
    .stat-card.negative {
      background: rgba(231, 76, 60, 0.1);
    }
    .stat-card.total {
      background: rgba(155, 89, 182, 0.1);
    }
    .stat-label {
      color: #7f8c8d;
      font-size: 11px;
      margin-bottom: 6px;
    }
    .stat-value {
      font-size: 20px;
      font-weight: bold;
      color: #2c3e50;
    }
    .stat-value.positive { color: #27ae60; }
    .stat-value.negative { color: #e74c3c; }
    .stat-value.total { color: #9b59b6; }
  </style>
</head>
<body>
  <div class="container">
    <div class="title">📊 积分统计</div>
    <div class="user-info">
      <div class="username">${user.username}</div>
      <div class="user-id">用户ID: ${user.id} | 当前积分: ${user.total_score}</div>
    </div>
    <div class="stats-grid">
      <div class="stat-card positive">
        <div class="stat-label">累计加分</div>
        <div class="stat-value positive">+${addScore}</div>
      </div>
      <div class="stat-card negative">
        <div class="stat-label">累计扣分</div>
        <div class="stat-value negative">-${deductScore}</div>
      </div>
      <div class="stat-card total">
        <div class="stat-label">总积分</div>
        <div class="stat-value total">${totalScore}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">操作次数</div>
        <div class="stat-value">${scoreCount}</div>
      </div>
    </div>
    <div class="footer">班级操行分管理系统 v1.0</div>
  </div>
</body>
</html>`;
      const textResult = [
        `【${user.username} 的统计信息】`,
        `总积分: ${user.total_score}`,
        `累计加分: +${addScore}`,
        `累计扣分: -${deductScore}`,
        `操作次数: ${scoreCount}`
      ].join("\n");
      await sendImageOrText(ctx, session, html, textResult, { height: 550 });
      return "";
    } catch (error) {
      ctx.logger.error("获取统计信息失败:", error);
      return ERROR_MESSAGES.API_REQUEST_FAILED;
    }
  });
}
__name(registerStatisticsCommand, "registerStatisticsCommand");

// src/commands/admin-manager.ts
var import_koishi2 = require("koishi");
var pendingRequests = /* @__PURE__ */ new Map();
function generateCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}
__name(generateCode, "generateCode");
function cleanupExpiredRequests() {
  const now = Date.now();
  for (const [code, req] of pendingRequests) {
    if (now - req.createdAt > 12e4) {
      pendingRequests.delete(code);
    }
  }
}
__name(cleanupExpiredRequests, "cleanupExpiredRequests");
setInterval(cleanupExpiredRequests, 3e4);
function registerGroupAdminCommand(ctx, adminService) {
  function getAtId(session) {
    if (session.elements) {
      const atElements = import_koishi2.h.select(session.elements, "at");
      if (atElements.length > 0) {
        return String(atElements[0].attrs?.id || "");
      }
    }
    return "";
  }
  __name(getAtId, "getAtId");
  ctx.command("加管 [备注:string]").alias("add-admin").action(async ({ session }, remark) => {
    if (!session.guildId) {
      return "此命令只能在群聊中使用";
    }
    const hasPermission = await adminService.hasAdminPermission(session);
    if (!hasPermission) {
      return "❌ 此命令仅限管理员使用";
    }
    const targetId = getAtId(session);
    if (!targetId) {
      return "请用 @ 指定要添加为群管的用户：/加管 @某人";
    }
    cleanupExpiredRequests();
    for (const [, req] of pendingRequests) {
      if (req.guildId === session.guildId) {
        const admins = await adminService.getAllAdmins(session.guildId);
        const existing = admins.find((a) => a.verify === 0);
        if (existing) {
          return `❌ 该用户已有正在等待确认的加管请求`;
        }
      }
    }
    const adminRemark = remark || "未命名";
    const code = generateCode();
    pendingRequests.set(code, {
      guildId: session.guildId,
      remark: adminRemark,
      createdAt: Date.now()
    });
    await session.send(
      `✅ 已发起加管请求
` + import_koishi2.h.at(targetId) + ` 请发送 /确认 ${code} 同意加管
备注：${adminRemark}
（120秒内有效）`
    );
    return "";
  });
  ctx.command("确认 [确认码:string]").alias("confirm").action(async ({ session }, code) => {
    if (!session.guildId) {
      return "此命令只能在群聊中使用";
    }
    const openId = session.userId?.toString();
    if (!openId) {
      return "无法获取您的用户ID";
    }
    if (!code) {
      return "请提供确认码：/确认 [确认码]";
    }
    cleanupExpiredRequests();
    const req = pendingRequests.get(code);
    if (!req) {
      return "❌ 无效的确认码或已过期";
    }
    if (req.guildId !== session.guildId) {
      return "❌ 请在发起加管请求的群聊中确认";
    }
    const remark = req.remark;
    pendingRequests.delete(code);
    await adminService.createPendingAdmin(session.guildId, openId, remark);
    ctx.logger.info(`群聊 ${session.guildId} 用户同意加管: OpenID=${openId}, 备注=${remark}, Verify=0`);
    await session.send(
      `✅ 您已同意加管
您的 OpenID：${openId}
备注：${remark}
等待管理员执行 /加管确认 完成加管
（120秒内有效）`
    );
    return "";
  });
  ctx.command("加管确认 [确认码:string]").alias("confirm-add-admin").action(async ({ session }, code) => {
    if (!session.guildId) {
      return "此命令只能在群聊中使用";
    }
    const hasPermission = await adminService.hasAdminPermission(session);
    if (!hasPermission) {
      return "❌ 此命令仅限管理员使用";
    }
    if (!code) {
      return "请提供确认码：/加管确认 [确认码]";
    }
    const admins = await adminService.getAllAdmins(session.guildId);
    const pendingAdmin = admins.find((a) => a.verify === 0);
    if (!pendingAdmin) {
      return "❌ 没有待确认的加管请求";
    }
    await adminService.confirmAdmin(session.guildId, pendingAdmin.openId);
    ctx.logger.info(`群聊 ${session.guildId} 添加群管完成: OpenID=${pendingAdmin.openId}, 备注=${pendingAdmin.remark}, Verify=1`);
    return `✅ 加管成功
备注：${pendingAdmin.remark}
OpenID：${pendingAdmin.openId}`;
  });
  ctx.command("减管 [备注:string]").alias("remove-admin").action(async ({ session }, remark) => {
    if (!session.guildId) {
      return "此命令只能在群聊中使用";
    }
    const hasPermission = await adminService.hasAdminPermission(session);
    if (!hasPermission) {
      return "❌ 此命令仅限管理员使用";
    }
    if (!remark) {
      return "请提供要移除的群管备注：/减管 [备注]";
    }
    await adminService.removeAdminByRemark(session.guildId, remark);
    ctx.logger.info(`群聊 ${session.guildId} 移除群管: 备注=${remark}`);
    return `✅ 已移除群管
备注：${remark}`;
  });
  ctx.command("群管列表").alias("admin-list").action(async ({ session }) => {
    if (!session.guildId) {
      return "此命令只能在群聊中使用";
    }
    const admins = await adminService.getAllAdmins(session.guildId);
    if (admins.length === 0) {
      return "当前群聊没有管理员";
    }
    const list = admins.map(
      (admin, index) => `${index + 1}. [${admin.remark}] ${admin.openId} ${admin.verify === 1 ? "✅" : "⏳"}`
    ).join("\n");
    const adminItems = admins.map((admin, index) => {
      const status = admin.verify === 1 ? "✅ 已验证" : "⏳ 待确认";
      const statusColor = admin.verify === 1 ? "#27ae60" : "#f39c12";
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
        <div class="admin-id">${admin.openId}</div>`;
    }).join("");
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
</html>`;
    await sendImageOrText(ctx, session, html, `当前群聊的管理员：
${list}`, { height: 600 });
    return "";
  });
  ctx.command("我的ID").alias("my-id").action(async ({ session }) => {
    if (!session.guildId) {
      return "此命令只能在群聊中使用";
    }
    const openId = session.userId?.toString();
    if (!openId) {
      return "无法获取您的用户ID";
    }
    return `您的 OpenID：
${openId}`;
  });
}
__name(registerGroupAdminCommand, "registerGroupAdminCommand");

// src/commands/menu.ts
var import_koishi3 = require("koishi");
var MENU_HTML = `
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
`;
function registerMenuCommand(ctx) {
  ctx.command("菜单").alias("menu").action(async ({ session }) => {
    if (!session.guildId) {
      return "此命令只能在群聊中使用";
    }
    try {
      const page = await ctx.puppeteer.page();
      await page.setViewport({
        width: 450,
        height: 800,
        deviceScaleFactor: 2
      });
      await page.setContent(MENU_HTML, { waitUntil: "networkidle0" });
      await page.evaluateHandle("document.fonts.ready");
      const screenshot = await page.screenshot({
        type: "png",
        clip: { x: 0, y: 0, width: 450, height: 800 }
      });
      await session.send(import_koishi3.h.image(screenshot, "image/png"));
      return "";
    } catch (error) {
      ctx.logger.error("生成菜单图片失败:", error);
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

━━━━━━━━━━━━━━━━━━━━━━`;
    }
  });
}
__name(registerMenuCommand, "registerMenuCommand");

// src/index.ts
var name = "class-score-system";
var inject = ["database", "puppeteer"];
var Config = import_koishi4.Schema.object({
  backgroundImage: import_koishi4.Schema.string().description("卡片背景图片 URL").default("https://api.yppp.net/pe.php"),
  cardOpacity: import_koishi4.Schema.number().description("卡片背景透明度 (0-1)").default(0.5)
});
function apply(ctx, config) {
  ctx.logger.info("班级操行分管理系统插件正在加载...");
  setImageConfig({
    backgroundImage: config.backgroundImage,
    cardOpacity: config.cardOpacity
  });
  extendDatabase(ctx);
  const serverService = new ServerConfigService(ctx);
  const bindingService = new QqBindingService(ctx);
  const adminService = new GroupAdminService(ctx);
  registerGroupAdminCommand(ctx, adminService);
  registerBindServerCommand(ctx, serverService, adminService);
  registerQueryScoreCommand(ctx, serverService, bindingService);
  registerBindQqCommand(ctx, serverService, bindingService);
  registerAdjustScoreCommand(ctx, serverService, adminService);
  registerRankingCommand(ctx, serverService);
  registerStatisticsCommand(ctx, serverService, bindingService);
  registerMenuCommand(ctx);
  ctx.logger.info("班级操行分管理系统插件加载完成");
}
__name(apply, "apply");
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Config,
  apply,
  inject,
  name
});
