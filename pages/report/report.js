// pages/report/report.js
const app = getApp()
const util = require('../../utils/util')
const db = require('../../utils/db')

Page({
  data: {
    // 时间范围
    rangeStart: '',
    rangeEnd: '',
    rangeLabel: '近3天',
    rangeDays: 3,

    // 数据
    hasData: false,
    emotionStats: [],
    subStats: [],
    dailyTrends: [],
    heatmapData: [],
    mostCommon: {},
    stabilityScore: 0,
    recordDays: 0,
    chartType: 'ring',
    userId: '',

    // AI 报告
    aiReport: '',
    aiReportLoading: false,
    canUseAI: false,
    records: [],
  },

  onLoad() {
    this.initRange()
    this._initUser()
  },

  _initUser: function () {
    var that = this
    app.getOpenid().then(function (openid) {
      return db.getUser(openid)
    }).then(function (user) {
      if (!user) return
      that.setData({ userId: user._id }, function () {
        that.loadReportData()
      })
    }).catch(function (err) {
      console.error('获取用户信息失败:', err)
    })
  },

  onShow() {
    if (this.data.userId) this.loadReportData()
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setActive(2)
    }
  },

  // 初始化时间范围
  initRange() {
    this._applyRange(this.data.rangeDays)
  },

  _applyRange(days) {
    const end = new Date()
    const start = new Date()
    start.setDate(start.getDate() - (days - 1))
    var labels = { 1: '今日', 7: '近7天', 30: '近30天' }
    this.setData({
      rangeDays: days,
      rangeLabel: labels[days] || ('近' + days + '天'),
      rangeStart: util.formatDate(start, 'MM月DD日'),
      rangeEnd: util.formatDate(end, 'MM月DD日'),
    })
  },

  switchRange(e) {
    var days = Number(e.currentTarget.dataset.days)
    if (days === this.data.rangeDays) return
    this._applyRange(days)
    this.setData({ aiReport: '', aiReportLoading: false })
    if (this.data.userId) this.loadReportData()
  },

  // 加载报告数据
  async loadReportData() {
    try {
      var that = this
      var userId = that.data.userId
      if (!userId) return

      var end = new Date()
      var start = new Date()
      start.setDate(start.getDate() - (that.data.rangeDays - 1))
      start.setHours(0, 0, 0, 0)
      end.setHours(23, 59, 59, 999)

      var records = await db.getRecords(userId, { startDate: start, endDate: end, limit: 100 })

      if (records.length === 0) {
        that.setData({ hasData: false })
        return
      }

      // 情绪主分类统计
      var emotionCounts = {}
      // 子情绪（细分情绪）统计
      var subEmotionCounts = {}
      var dailyData = {}

      records.forEach(function (record) {
        var info = util.getEmotionByKey(record.emotion)
        var catKey = info.categoryKey || 'neutral'
        emotionCounts[catKey] = (emotionCounts[catKey] || 0) + 1
        subEmotionCounts[record.emotion] = (subEmotionCounts[record.emotion] || 0) + 1

        var dateStr = util.formatDate(record.record_time, 'MM/DD')
        var dayName = util.formatDate(record.record_time, 'DD') + '日'
        if (!dailyData[dateStr]) {
          dailyData[dateStr] = {
            date: dateStr,
            day: dayName,
            emotions: {},
            count: 0,
          }
        }
        dailyData[dateStr].emotions[catKey] = (dailyData[dateStr].emotions[catKey] || 0) + 1
        dailyData[dateStr].count++
      })

      var total = records.length
      var BASE_COLORS = ['#4CAF50', '#FF5722', '#2196F3', '#FFC107', '#9C27B0', '#00BCD4', '#E91E63', '#607D8B']

      var emotionStats = Object.entries(emotionCounts).map(function (entry) {
        var key = entry[0]
        var count = entry[1]
        var cat = util.EMOTION_CATEGORIES.find(function (c) { return c.key === key }) || {}
        return {
          key: key,
          label: cat.label || key,
          icon: cat.icon || '\uD83D\uDDF8',
          count: count,
          percent: total === 0 ? 0 : Math.round((count / total) * 100),
        }
      }).sort(function (a, b) { return b.count - a.count }).map(function (item, idx) {
        item.color = BASE_COLORS[idx % BASE_COLORS.length]
        return item
      })

      var subStats = Object.entries(subEmotionCounts).map(function (entry) {
        var key = entry[0]
        var count = entry[1]
        var emotionInfo = util.getEmotionByKey(key)
        return {
          key: key,
          label: emotionInfo.label || key,
          icon: emotionInfo.icon || '\uD83D\uDDF8',
          desc: emotionInfo.desc || '',
          count: count,
          percent: total === 0 ? 0 : Math.round((count / total) * 100),
        }
      }).sort(function (a, b) { return b.count - a.count }).map(function (item, idx) {
        item.color = BASE_COLORS[idx % BASE_COLORS.length]
        return item
      })

      var mostCommon = emotionStats[0] || {}

      var dailyTrends = Object.values(dailyData).map(function (item) {
        var sortedEmotions = Object.entries(item.emotions).sort(function (a, b) { return b[1] - a[1] })
        var topEmotionKey = sortedEmotions[0] ? sortedEmotions[0][0] : 'neutral'
        var cat = util.EMOTION_CATEGORIES.find(function (c) { return c.key === topEmotionKey }) || {}
        var result = {}
        Object.keys(item).forEach(function (k) { result[k] = item[k] })
        result.topEmotionKey = topEmotionKey
        result.topEmotionIcon = cat.icon || '\uD83D\uDDF8'
        result.topEmotionLabel = cat.label || '\u5E73\u6DE1'
        return result
      })

      var heatmapData = []
      var i, d, dateStr, dayRecords, hourCounts
      for (i = 0; i < that.data.rangeDays; i++) {
        d = new Date(start)
        d.setDate(d.getDate() + i)
        dateStr = util.formatDate(d, 'MM/DD')
        dayRecords = records.filter(function (r) {
          return util.formatDate(new Date(r.record_time), 'YYYY-MM-DD') === util.formatDate(d, 'YYYY-MM-DD')
        })
        hourCounts = new Array(24).fill(0)
        dayRecords.forEach(function (r) {
          var hour = new Date(r.record_time).getHours()
          hourCounts[hour]++
        })
        heatmapData.push({
          date: util.formatDate(d, 'MM/DD'),
          day: util.formatDate(d, 'DD') + '\u65E5',
          hourCounts: hourCounts,
          total: dayRecords.length,
        })
      }

      var scores = records.map(function (r) {
        var info = util.getEmotionByKey(r.emotion)
        var desc = info.desc || ''
        if (desc.indexOf('\u559C\u6085') > -1 || desc.indexOf('\u8F7B\u677E') > -1 || desc.indexOf('\u5E73\u548C') > -1) return 1
        if (desc.indexOf('\u524A\u523B') > -1 || desc.indexOf('\u5B64\u72EC') > -1 || desc.indexOf('\u59D4\u5C41') > -1) return -1
        return 0
      })

      var avgScore = scores.reduce(function (a, b) { return a + b }, 0) / scores.length
      var variance = scores.reduce(function (sum, s) { return sum + Math.pow(s - avgScore, 2) }, 0) / scores.length
      var stabilityScore = Math.max(0, Math.round(100 - Math.sqrt(variance) * 30))
      var recordDays = Object.keys(dailyData).length

      that.setData({
        hasData: true,
        emotionStats: emotionStats,
        subStats: subStats,
        dailyTrends: dailyTrends,
        heatmapData: heatmapData,
        mostCommon: mostCommon,
        stabilityScore: stabilityScore,
        recordDays: recordDays,
        canUseAI: recordDays >= 2,
      }, function () {
        that.setData({ records: records })
        if (recordDays >= 2) {
          that.loadSavedReport(records)
        }
      })
    } catch (err) {
      console.error('\u52A0\u8F7D\u62A5\u544A\u5931\u8D25:', err)
    }
  },

  // 生成 AI 报告
  generateAIReport: function (records) {
    var that = this
    that.setData({ aiReportLoading: true })

    var recordsForAI = records.map(function (r) {
      var info = util.getEmotionByKey(r.emotion)
      return {
        emotion: r.emotion,
        emotion_label: info.categoryIcon + ' ' + info.categoryLabel + '\u00B7' + info.icon + info.label,
        text: r.text || '',
        record_time: r.record_time,
      }
    })

    wx.cloud.callFunction({
      name: 'ai',
      data: {
        action: 'report',
        records: recordsForAI,
        rangeLabel: that.data.rangeLabel,
      }
    }).then(function (res) {
      var report = (res.result && res.result.report) || ''
      that.setData({
        aiReport: report,
        aiReportLoading: false,
      })
      // 存到数据库
      var userId = that.data.userId
      if (userId && report) {
        db.saveReport(userId, report, that.data.rangeLabel).catch(function (e) {
          console.error('\u4FDD\u5B58\u62A5\u544A\u5931\u8D25:', e)
        })
      }
    }).catch(function (err) {
      console.error('AI\u62A5\u544A\u751F\u6210\u5931\u8D25:', err)
      that.setData({ aiReportLoading: false })
    })
  },

  // ─── 从数据库加载已有报告 ───
  loadSavedReport: function (records) {
    var that = this
    var userId = that.data.userId
    if (!userId) return
    that.setData({ aiReportLoading: true })
    db.getLatestReport(userId, that.data.rangeLabel).then(function (reportDoc) {
      if (reportDoc && reportDoc.report_content) {
        // 数据库有报告，直接显示
        that.setData({
          aiReport: reportDoc.report_content,
          aiReportLoading: false,
        })
      } else {
        // 没有历史报告，生成新报告
        that.generateAIReport(records)
      }
    }).catch(function (err) {
      console.error('\u8BFB\u53D6\u5386\u53F2\u62A5\u544A\u5931\u8D25:', err)
      that.generateAIReport(records)
    })
  },

  // ─── 重新生成报告 ───
  regenerateReport: function () {
    var that = this
    that.setData({ aiReport: '', aiReportLoading: true })
    var userId = that.data.userId
    if (userId) {
      db.getLatestReport(userId, that.data.rangeLabel).then(function (doc) {
        if (doc && doc._id) {
          db.init().collection('emotion_reports').doc(doc._id).remove().catch(function () {})
        }
      }).catch(function () {})
    }
    that.loadReportData()
  },

  // ─── 基于报告寻求建议 ───
  onAISuggestion: function () {
    var aiReport = this.data.aiReport
    var records = this.data.records
    if (!aiReport) return
    wx.setStorageSync('report_chat_mode', 'suggestion')
    wx.setStorageSync('report_chat_context', {
      aiReport: aiReport,
      records: records || [],
    })
    wx.navigateTo({ url: '/pages/index/index?chat=1' })
  },

  // ─── 基于报告继续聊天 ───
  onAIChat: function () {
    var aiReport = this.data.aiReport
    var records = this.data.records
    if (!aiReport) return
    wx.setStorageSync('report_chat_mode', 'chat')
    wx.setStorageSync('report_chat_context', {
      aiReport: aiReport,
      records: records || [],
    })
    wx.navigateTo({ url: '/pages/index/index?chat=1' })
  },
})
