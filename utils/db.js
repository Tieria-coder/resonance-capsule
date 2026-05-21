/**
 * 数据库操作封装
 */
const DB = {
  db: null,
  
  // 初始化数据库
  init() {
    if (!this.db) {
      this.db = wx.cloud.database()
    }
    return this.db
  },
  
  // 获取用户信息
  async getUser(openid) {
    const db = this.init()
    const users = await db.collection('users')
      .where({ openid })
      .get()
    
    return users.data[0] || null
  },
  
  // 创建或更新用户
  async upsertUser(userData) {
    const db = this.init()
    const { openid } = userData
    
    const existing = await this.getUser(openid)
    
    if (existing) {
      // 更新
      await db.collection('users').doc(existing._id).update({
        data: {
          ...userData,
          updated_at: new Date(),
        }
      })
      return existing._id
    } else {
      // 创建
      const result = await db.collection('users').add({
        data: {
          ...userData,
          created_at: new Date(),
          updated_at: new Date(),
          stats: {
            streak: 0,
            max_streak: 0,
            total_records: 0,
          }
        }
      })
      return result._id
    }
  },
  
  // 添加情绪记录
  async addRecord(recordData) {
    const db = this.init()
    const result = await db.collection('emotion_records').add({
      data: {
        ...recordData,
        created_at: new Date(),
      }
    })
    
    // 更新用户统计
    await this.updateUserStats(recordData.user_id)
    
    return result._id
  },
  
  // 获取用户的情绪记录
  async getRecords(userId, options = {}) {
    const db = this.init()
    const { limit = 30, skip = 0, startDate, endDate } = options
    
    let whereCondition = { user_id: userId }
    if (startDate && endDate) {
      whereCondition.record_time = db.command.gte(startDate).and(db.command.lte(endDate))
    }
    
    const result = await db.collection('emotion_records')
      .where(whereCondition)
      .orderBy('record_time', 'desc')
      .skip(skip)
      .limit(limit)
      .get()
    
    return result.data
  },
  
  // 获取今日记录
  async getTodayRecords(userId) {
    const db = this.init()
    const today = new Date()
    const start = util.getDayStart(today)
    const end = util.getDayEnd(today)
    
    const result = await db.collection('emotion_records')
      .where({
        user_id: userId,
        record_time: db.command.gte(start).and(db.command.lte(end))
      })
      .orderBy('record_time', 'desc')
      .get()
    
    return result.data
  },
  
  // 获取某天的记录
  async getRecordsByDate(userId, date) {
    const db = this.init()
    const start = util.getDayStart(date)
    const end = util.getDayEnd(date)
    
    const result = await db.collection('emotion_records')
      .where({
        user_id: userId,
        record_time: db.command.gte(start).and(db.command.lte(end))
      })
      .orderBy('record_time', 'desc')
      .get()
    
    return result.data
  },
  
  // 获取日历数据（某月每天的最后一条记录）
  async getCalendarData(userId, year, month) {
    const db = this.init()
    const startDate = new Date(year, month - 1, 1)
    const endDate = new Date(year, month, 0, 23, 59, 59)
    
    const result = await db.collection('emotion_records')
      .where({
        user_id: userId,
        record_time: db.command.gte(startDate).and(db.command.lte(endDate))
      })
      .orderBy('record_time', 'desc')
      .get()
    
    // 按日期分组，取每天第一条（最后记录的）
    const records = result.data
    const calendarData = {}
    
    records.forEach(record => {
      const dateStr = util.formatDate(record.record_time, 'YYYY-MM-DD')
      if (!calendarData[dateStr]) {
        calendarData[dateStr] = record
      }
    })
    
    return calendarData
  },
  
  // 删除记录
  async deleteRecord(recordId) {
    const db = this.init()
    const record = await db.collection('emotion_records').doc(recordId).get()
    
    if (record.data) {
      await db.collection('emotion_records').doc(recordId).remove()
      // 更新用户统计
      await this.updateUserStats(record.data.user_id)
    }
  },
  
  // 更新用户统计
  async updateUserStats(userId) {
    const db = this.init()
    const allRecords = await db.collection('emotion_records')
      .where({ user_id: userId })
      .orderBy('record_time', 'desc')
      .get()
    
    const records = allRecords.data
    const totalRecords = records.length
    
    // 计算连续打卡
    const streak = util.calculateStreak(records)
    
    // 获取最大连续
    const user = await db.collection('users').doc(userId).get()
    const maxStreak = Math.max(user.data.stats?.max_streak || 0, streak)
    
    await db.collection('users').doc(userId).update({
      data: {
        'stats.streak': streak,
        'stats.max_streak': maxStreak,
        'stats.total_records': totalRecords,
        updated_at: new Date(),
      }
    })
  },
  
  // 获取周报数据
  async getWeeklyReport(userId, weekStart) {
    const db = this.init()
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekEnd.getDate() + 7)
    
    const result = await db.collection('emotion_records')
      .where({
        user_id: userId,
        record_time: db.command.gte(weekStart).and(db.command.lt(weekEnd))
      })
      .orderBy('record_time', 'asc')
      .get()
    
    return result.data
  },
  
  // 清空用户所有数据
  async clearUserData(userId) {
    const db = this.init()
    
    // 删除所有记录
    const records = await db.collection('emotion_records')
      .where({ user_id: userId })
      .get()
    
    for (const record of records.data) {
      await db.collection('emotion_records').doc(record._id).remove()
    }
    
    // 重置用户统计
    await db.collection('users').doc(userId).update({
      data: {
        'stats.streak': 0,
        'stats.max_streak': 0,
        'stats.total_records': 0,
        updated_at: new Date(),
      }
    })
  },
}

const util = require('./util')

module.exports = DB