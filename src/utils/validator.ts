import { CONSTANTS, ERROR_MESSAGES } from './constants'

export class Validator {
  static validateToken(token: string): boolean {
    return CONSTANTS.TOKEN_PATTERN.test(token)
  }

  static validateQq(qqNumber: string): boolean {
    // 更宽松的验证：只要是数字或者包含数字的字符串即可
    // 支持沙盒环境的用户ID格式
    return qqNumber && qqNumber.length > 0 && /^\d+$/.test(qqNumber)
  }

  static validateScore(score: number): boolean {
    return score >= CONSTANTS.SCORE_MIN && score <= CONSTANTS.SCORE_MAX
  }

  static validateUsername(username: string): boolean {
    return username.length > 0 && username.length <= CONSTANTS.USERNAME_MAX_LENGTH
  }

  static validateDescription(description: string): boolean {
    return description.length <= CONSTANTS.DESCRIPTION_MAX_LENGTH
  }

  static validateLimit(limit: number, max: number = CONSTANTS.RANKING_MAX_LIMIT): boolean {
    return limit > 0 && limit <= max
  }

  static validateScoreWithMessage(score: number): string | null {
    if (!this.validateScore(score)) {
      return ERROR_MESSAGES.INVALID_SCORE
    }
    return null
  }

  static validateQqWithMessage(qqNumber: string): string | null {
    if (!this.validateQq(qqNumber)) {
      return ERROR_MESSAGES.INVALID_QQ
    }
    return null
  }

  static validateTokenWithMessage(token: string): string | null {
    if (!this.validateToken(token)) {
      return ERROR_MESSAGES.INVALID_TOKEN
    }
    return null
  }

  static validateUsernameWithMessage(username: string): string | null {
    if (!this.validateUsername(username)) {
      return ERROR_MESSAGES.INVALID_USERNAME
    }
    return null
  }

  static validateDescriptionWithMessage(description: string): string | null {
    if (!this.validateDescription(description)) {
      return ERROR_MESSAGES.INVALID_DESCRIPTION
    }
    return null
  }

  static validateLimitWithMessage(limit: number, max: number = CONSTANTS.RANKING_MAX_LIMIT): string | null {
    if (!this.validateLimit(limit, max)) {
      return `数量必须在 1 到 ${max} 之间`
    }
    return null
  }
}