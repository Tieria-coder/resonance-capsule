// utils/database.js - 数据库操作封装（适配层）
const DB = require('./db')

// 适配：页面代码用 database.getRecords(query, options)
// 实际 db.js 用 DB.getRecords(userId, options)
const database = {
  // command 占位
  command: {
    gte: (val) => ({ $gte: val }),
    lte: (val) => ({ $lte: val }),
    lt: (val) => ({ $lt: val }),
    gt: (val) => ({ $gt: val }),
    and: (cond) => cond,
    in: (val) => ({ $in: val })
  },

  // 获取用户
  async getUser(openid) {
    return DB.getUser(openid)
  },

  // 创建或更新用户
  async upsertUser(userData) {
    return DB.upsertUser(userData)
  },

  // 添加记录 - 适配两种调用方式
  async addRecord(recordData) {
    return DB.addRecord(recordData)
  },

  // 获取记录 - 适配 { user_id, record_time } 查询方式
  async getRecords(query, options = {}) {
    const userId = query.user_id
    if (!userId) return []
    
    let records = await DB.getRecords(userId, {
      limit: options.limit || 100,
      skip: options.skip || 0
    })

    // 如果有 record_time 条件，在内存中过滤（简化处理）
    if (query.record_time && typeof query.record_time === 'object') {
      const timeCond = query.record_time
      if (timeCond.$gte && timeCond.$lte) {
        records = records.filter(r => {
          const t = new Date(r.record_time)
          return t >= new Date(timeCond.$gte) && t <= new Date(timeCond.$lte)
        })
      } else if (timeCond.$gte) {
        records = records.filter(r => new Date(r.record_time) >= new Date(timeCond.$gte))
      }
    }

    // 排序
    if (options.sort && options.sort.record_time === 1) {
      records.reverse()
    }

    return records
  },

  // 删除记录
  async deleteRecord(recordId) {
    return DB.deleteRecord(recordId)
  }
}

module.exports = database
