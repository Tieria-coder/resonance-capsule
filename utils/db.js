/**
 * 数据库操作封装 - ES5 兼容版
 */
var DB = {
  db: null,

  init: function () {
    if (!this.db) {
      this.db = wx.cloud.database()
    }
    return this.db
  },

  getUser: function (openid) {
    var self = this
    return self.init().collection('users').where({ openid: openid }).get().then(function (res) {
      return res.data[0] || null
    })
  },

  upsertUser: function (userData) {
    var self = this
    return self.getUser(userData.openid).then(function (existing) {
      if (existing) {
        return self.init().collection('users').doc(existing._id).update({
          data: {
            openid: userData.openid,
            updated_at: new Date(),
          }
        }).then(function () {
          return existing._id
        })
      } else {
        return self.init().collection('users').add({
          data: {
            openid: userData.openid,
            created_at: new Date(),
            updated_at: new Date(),
            stats: {
              streak: 0,
              max_streak: 0,
              total_records: 0,
            }
          }
        }).then(function (result) {
          return result._id
        })
      }
    })
  },

  addRecord: function (recordData) {
    var self = this
    // 完整保存 recordData 的所有字段
    var data = {}
    for (var key in recordData) {
      if (recordData.hasOwnProperty(key)) {
        data[key] = recordData[key]
      }
    }
    data.created_at = new Date()
    // 确保 emotions 字段存在
    if (!data.emotions && data.emotion) {
      data.emotions = [data.emotion]
    }
    return self.init().collection('emotion_records').add({
      data: data
    }).then(function (result) {
      return self.updateUserStats(data.user_id || data.userId).then(function () {
        return result._id
      })
    })
  },

  getRecords: function (userId, options) {
    var self = this
    var opts = options || {}
    var limit = opts.limit || 30
    var skip = opts.skip || 0
    var db = self.init()
    var whereCondition = { user_id: userId }

    if (opts.startDate && opts.endDate) {
      whereCondition.record_time = db.command.gte(opts.startDate).and(db.command.lte(opts.endDate))
    }

    return db.collection('emotion_records')
      .where(whereCondition)
      .orderBy('record_time', 'desc')
      .skip(skip)
      .limit(limit)
      .get().then(function (res) {
        return res.data
      })
  },

  getTodayRecords: function (userId) {
    var self = this
    var today = new Date()
    var util = require('./util')
    var start = util.getDayStart(today)
    var end = util.getDayEnd(today)
    var db = self.init()

    return db.collection('emotion_records')
      .where({
        user_id: userId,
        record_time: db.command.gte(start).and(db.command.lte(end))
      })
      .orderBy('record_time', 'desc')
      .get().then(function (res) {
        return res.data
      })
  },

  getRecordsByDate: function (userId, date) {
    var self = this
    var util = require('./util')
    var start = util.getDayStart(date)
    var end = util.getDayEnd(date)
    var db = self.init()

    return db.collection('emotion_records')
      .where({
        user_id: userId,
        record_time: db.command.gte(start).and(db.command.lte(end))
      })
      .orderBy('record_time', 'desc')
      .get().then(function (res) {
        return res.data
      })
  },

  getCalendarData: function (userId, year, month) {
    var self = this
    var util = require('./util')
    var startDate = new Date(year, month - 1, 1)
    var endDate = new Date(year, month, 0, 23, 59, 59)
    var db = self.init()

    return db.collection('emotion_records')
      .where({
        user_id: userId,
        record_time: db.command.gte(startDate).and(db.command.lte(endDate))
      })
      .orderBy('record_time', 'desc')
      .get().then(function (res) {
        var records = res.data
        var calendarData = {}
        records.forEach(function (record) {
          var dateStr = util.formatDate(record.record_time, 'YYYY-MM-DD')
          if (!calendarData[dateStr]) {
            calendarData[dateStr] = record
          }
        })
        return calendarData
      })
  },

  deleteRecord: function (recordId) {
    var self = this
    return self.init().collection('emotion_records').doc(recordId).get().then(function (record) {
      if (record.data) {
        return self.init().collection('emotion_records').doc(recordId).remove().then(function () {
          return self.updateUserStats(record.data.user_id)
        })
      }
    })
  },

  updateUserStats: function (userId) {
    var self = this
    var util = require('./util')
    return self.init().collection('emotion_records')
      .where({ user_id: userId })
      .orderBy('record_time', 'desc')
      .get().then(function (allRecords) {
        var records = allRecords.data
        var totalRecords = records.length
        var streak = util.calcStreak(records)
        return self.init().collection('users').doc(userId).get().then(function (user) {
          var maxStreak = Math.max(user.data && user.data.stats && user.data.stats.max_streak || 0, streak)
          return self.init().collection('users').doc(userId).update({
            data: {
              'stats.streak': streak,
              'stats.max_streak': maxStreak,
              'stats.total_records': totalRecords,
              updated_at: new Date(),
            }
          })
        })
      })
  },

  getWeeklyReport: function (userId, weekStart) {
    var self = this
    var weekEnd = new Date(weekStart)
    weekEnd.setDate(weekEnd.getDate() + 7)
    var db = self.init()

    return db.collection('emotion_records')
      .where({
        user_id: userId,
        record_time: db.command.gte(weekStart).and(db.command.lt(weekEnd))
      })
      .orderBy('record_time', 'asc')
      .get().then(function (res) {
        return res.data
      })
  },

  clearUserData: function (userId) {
    var self = this
    return self.init().collection('emotion_records')
      .where({ user_id: userId })
      .get().then(function (recordsRes) {
        var promises = []
        recordsRes.data.forEach(function (record) {
          promises.push(self.init().collection('emotion_records').doc(record._id).remove())
        })
        return Promise.all(promises).then(function () {
          return self.init().collection('users').doc(userId).update({
            data: {
              'stats.streak': 0,
              'stats.max_streak': 0,
              'stats.total_records': 0,
              updated_at: new Date(),
            }
          })
        })
      })
  },

  // ════════════════════════════════════════
  // 计划模板（后台发布）
  // ════════════════════════════════════════
  getActivePlanTemplates: function () {
    var self = this
    var now = new Date()
    return self.init().collection('plan_templates')
      .where({
        status: 'active',
        start_date: self.db.command.lte(now),
        end_date: self.db.command.gte(now),
      })
      .orderBy('start_date', 'desc')
      .get().then(function (res) {
        return res.data
      })
  },

  getPlanTemplateById: function (templateId) {
    var self = this
    return self.init().collection('plan_templates').doc(templateId).get().then(function (res) {
      return res.data || null
    })
  },

  // ════════════════════════════════════════
  // 用户加入的计划（emotion_plans）
  // ════════════════════════════════════════
  getUserPlans: function (openid) {
    var self = this
    return self.init().collection('emotion_plans')
      .where({ openid: openid, status: 'active' })
      .orderBy('start_date', 'desc')
      .get().then(function (res) {
        return res.data
      })
  },

  joinPlan: function (data) {
    var self = this
    return self.init().collection('emotion_plans').add({
      data: {
        openid: data.openid,
        user_id: data.user_id,
        template_id: data.template_id,
        plan_name: data.plan_name,
        theme: data.theme || '',
        cycle_days: data.cycle_days || 7,
        daily_target: data.daily_target || 1,
        reminders: data.reminders || ['evening'],
        completed_days: 0,
        flowers: 0,
        start_date: new Date(),
        status: 'active',
        created_at: new Date(),
        updated_at: new Date(),
      }
    }).then(function (result) {
      return result._id
    })
  },

  updateEmotionPlan: function (planId, updateData) {
    var self = this
    var data = {}
    for (var k in updateData) {
      if (updateData.hasOwnProperty(k)) data[k] = updateData[k]
    }
    data.updated_at = new Date()
    return self.init().collection('emotion_plans').doc(planId).update({ data: data })
  },

  leavePlan: function (planId) {
    var self = this
    return self.updateEmotionPlan(planId, { status: 'left' })
  },

  // 检查用户今天是否已为某计划打卡
  checkTodayPlanCheckin: function (planId, userId) {
    var self = this
    var util = require('./util')
    var today = util.getDayStart(new Date())
    var end = util.getDayEnd(new Date())
    return self.init().collection('emotion_records')
      .where({
        user_id: userId,
        record_time: self.db.command.gte(today).and(self.db.command.lte(end)),
      })
      .count().then(function (res) {
        return res.total > 0
      })
  },

  // 旧版 plans 兼容（保留不删）
  getPlans: function (userId) {
    var self = this
    return self.init().collection('plans')
      .where({ user_id: userId })
      .orderBy('created_at', 'desc')
      .get().then(function (res) {
        return res.data
      })
  },

  addPlan: function (userId, planData) {
    var self = this
    return self.init().collection('plans').add({
      data: {
        user_id: userId,
        title: planData.title,
        description: planData.description,
        emotion_goal: planData.emotion_goal,
        actions: planData.actions,
        created_at: new Date(),
        updated_at: new Date(),
      }
    }).then(function (result) {
      return result._id
    })
  },

  updatePlan: function (planId, planData) {
    var self = this
    return self.init().collection('plans').doc(planId).update({
      data: {
        title: planData.title,
        description: planData.description,
        emotion_goal: planData.emotion_goal,
        actions: planData.actions,
        updated_at: new Date(),
      }
    })
  },

  deletePlan: function (planId) {
    var self = this
    return self.init().collection('plans').doc(planId).remove()
  },

  // 报告相关
  getUnreadReports: function (userId) {
    var self = this
    return self.init().collection('emotion_reports')
      .where({
        user_id: userId,
        is_read: false,
      })
      .orderBy('created_at', 'desc')
      .get().then(function (res) {
        return res.data
      })
  },

  markReportsAsRead: function (userId) {
    var self = this
    return self.getUnreadReports(userId).then(function (reports) {
      var promises = []
      reports.forEach(function (report) {
        promises.push(self.init().collection('emotion_reports').doc(report._id).update({
          data: { is_read: true }
        }))
      })
      return Promise.all(promises)
    })
  },

  // 保存 AI 报告到数据库
  saveReport: function (userId, reportContent, rangeLabel) {
    var self = this
    return self.init().collection('emotion_reports').add({
      data: {
        user_id: userId,
        report_content: reportContent,
        range_label: rangeLabel || '',
        is_read: false,
        created_at: new Date(),
      }
    }).then(function (res) {
      return res._id
    })
  },

  // 读取最新一份 AI 报告（按 rangeLabel 匹配）
  getLatestReport: function (userId, rangeLabel) {
    var self = this
    var query = self.init().collection('emotion_reports')
      .where({ user_id: userId })
      .orderBy('created_at', 'desc')
      .limit(1)
    if (rangeLabel) {
      query = query.where({ range_label: rangeLabel })
    }
    return query.get().then(function (res) {
      return res.data.length > 0 ? res.data[0] : null
    })
  },

  // 更新聊天轮次（index.js 需要）
  updateUserChatRounds: function (openid, recordId, round) {
    var self = this
    return self.getUser(openid).then(function (user) {
      if (!user) return
      var chatRounds = user.chat_rounds || {}
      chatRounds[recordId] = round
      return self.init().collection('users').doc(user._id).update({
        data: { chat_rounds: chatRounds }
      })
    })
  },
}

module.exports = DB